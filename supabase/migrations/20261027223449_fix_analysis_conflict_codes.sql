begin;
set local lock_timeout = '5s';
-- SCRUM-182: deterministic analysis conflicts return HTTP 409 without transaction retries.
-- Preserve the function body, signature, grants, RLS and all state transitions.
create or replace function private.change_verified_reinforcement_analysis(p_payload text,p_signature text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := auth.uid();
  v_secret text; v_payload jsonb; v_exp bigint;
  v_request public.reinforcement_requests%rowtype;
  v_project public.projects%rowtype;
  v_analysis public.reinforcement_analyses%rowtype;
  v_request_id uuid; v_attempt uuid; v_action text; v_status text; v_error text; v_message text;
begin
  if v_user is null or not private.can_manage_own_documents() then
    raise exception using errcode='42501',message='Analysis access denied';
  end if;
  if p_payload is null or octet_length(p_payload)>300000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='42501',message='Invalid analysis proof';
  end if;
  select secret into v_secret from private.reinforcement_request_secrets where singleton;
  if v_secret is null or encode(extensions.hmac(p_payload,v_secret,'sha256'),'hex')<>p_signature then
    raise exception using errcode='42501',message='Invalid analysis proof';
  end if;
  v_payload := p_payload::jsonb; v_exp := (v_payload->>'expiresAt')::bigint;
  if v_payload->>'operation' is distinct from 'contextual-analysis' or (v_payload->>'userId')::uuid is distinct from v_user
    or v_exp is null or v_exp<extract(epoch from clock_timestamp()) or v_exp>extract(epoch from clock_timestamp())+120 then
    raise exception using errcode='42501',message='Expired or foreign analysis proof';
  end if;
  v_request_id := (v_payload->>'requestId')::uuid;
  v_attempt := (v_payload->>'attemptId')::uuid;
  v_action := v_payload->>'action';
  if v_attempt is null or v_action is null or v_action not in ('start','finish') then
    raise exception using errcode='23514',message='Invalid analysis operation';
  end if;
  -- Serialize claims per account before locking project/document/request. This
  -- bounds concurrent provider work even across different projects.
  perform pg_advisory_xact_lock(hashtextextended('contextual-analysis:'||v_user::text,0));
  select * into v_request from public.reinforcement_requests where id=v_request_id and owner_id=v_user;
  if not found then raise exception using errcode='42501',message='Request unavailable'; end if;
  select * into v_project from public.projects where id=v_request.project_id and owner_id=v_user for update;
  if not found or v_project.document_id is distinct from v_request.document_id or v_project.status='deleting'
    or (v_payload->>'documentId')::uuid is distinct from v_request.document_id then
    raise exception using errcode='PT409',message='Document version changed';
  end if;
  perform 1 from public.documents where id=v_request.document_id and owner_id=v_user for key share;
  if not found or not private.document_is_available(v_request.document_id) then
    raise exception using errcode='42501',message='Document unavailable';
  end if;
  select * into v_request from public.reinforcement_requests where id=v_request_id and owner_id=v_user for update;
  select * into v_analysis from public.reinforcement_analyses where request_id=v_request_id for update;

  if v_action='start' then
    if v_analysis.status in ('ready','insufficient') then
      return jsonb_build_object('disposition','cached','analysis',to_jsonb(v_analysis));
    end if;
    if v_analysis.status='processing' and v_analysis.lease_expires_at>clock_timestamp() then
      return jsonb_build_object('disposition','busy','analysis',to_jsonb(v_analysis));
    end if;
    if ((v_request.status='pending' and v_request.stage='queued' and v_analysis.request_id is null)
      or (v_request.status='error' and v_analysis.status='error')
      or (v_request.status='processing' and v_request.stage='analyzing' and v_analysis.status='processing'
        and v_analysis.lease_expires_at<=clock_timestamp())) is not true then
      raise exception using errcode='PT409',message='Request cannot be analyzed in this stage';
    end if;
    if (select count(*) from public.reinforcement_analyses a join public.reinforcement_requests r on r.id=a.request_id
      where r.owner_id=v_user and a.status='processing' and a.lease_expires_at>clock_timestamp())>=2
      or (select count(*) from public.reinforcement_request_events e join public.reinforcement_requests r on r.id=e.request_id
      where r.owner_id=v_user and e.status='processing' and e.stage='analyzing' and e.occurred_at>clock_timestamp()-interval '5 minutes')>=10 then
      raise exception using errcode='P0001',message='Analysis rate limit';
    end if;
    if v_request.status='processing' then
      update public.reinforcement_requests set status='error',stage='failed',error_message='El análisis anterior agotó su tiempo de espera.' where id=v_request_id;
    end if;
    insert into public.reinforcement_analyses(request_id,attempt_id,status,lease_expires_at)
    values(v_request_id,v_attempt,'processing',clock_timestamp()+interval '120 seconds')
    on conflict(request_id) do update set attempt_id=v_attempt,status='processing',context=null,diagnosis=null,model=null,error_code=null,
      started_at=clock_timestamp(),updated_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '120 seconds',finished_at=null,
      attempts=public.reinforcement_analyses.attempts+1
    returning * into v_analysis;
    update public.reinforcement_requests set status='processing',stage='analyzing',error_message=null where id=v_request_id;
    return jsonb_build_object('disposition','started','analysis',to_jsonb(v_analysis));
  end if;

  if v_analysis.request_id is null or v_analysis.attempt_id<>v_attempt then
    raise exception using errcode='PT409',message='Obsolete analysis attempt';
  end if;
  if v_analysis.status<>'processing' then
    return jsonb_build_object('disposition','cached','analysis',to_jsonb(v_analysis));
  end if;
  if v_analysis.lease_expires_at<=clock_timestamp() or v_request.status<>'processing' or v_request.stage<>'analyzing' then
    raise exception using errcode='PT409',message='Analysis lease expired';
  end if;
  v_status := v_payload->>'status'; v_error := v_payload->>'errorCode';
  if v_status is null or v_status not in ('ready','insufficient','error') then
    raise exception using errcode='23514',message='Invalid analysis result';
  end if;
  if nullif(v_payload->'context','null'::jsonb) is not null and (
    v_payload->'context'->>'selectedText' is distinct from v_request.selected_text or
    v_payload->'context'->>'need' is distinct from v_request.need or
    v_payload->'context'->>'category' is distinct from v_request.category or
    v_payload->'context'->>'textSource' is distinct from v_request.text_source or
    (v_payload->'context'->>'pageNumber')::integer is distinct from v_request.page_number or
    coalesce(v_payload->'context'->>'pdfSha256','') !~ '^[a-f0-9]{64}$') then
    raise exception using errcode='23514',message='Analysis context does not match request';
  end if;
  update public.reinforcement_analyses set status=v_status,context=nullif(v_payload->'context','null'::jsonb),
    diagnosis=nullif(v_payload->'diagnosis','null'::jsonb),model=v_payload->>'model',error_code=v_error,
    updated_at=clock_timestamp(),finished_at=clock_timestamp() where request_id=v_request_id returning * into v_analysis;
  if v_status='ready' then
    update public.reinforcement_requests set status='pending',stage='choosing',error_message=null where id=v_request_id;
  else
    v_message := case v_error when 'insufficient_context' then 'Falta contexto útil. Prepara una nueva solicitud con un fragmento o transcripción más amplios.'
      when 'pdf_unavailable' then 'No fue posible leer el contexto de la página.'
      when 'timeout' then 'El análisis tardó demasiado. Puedes reintentar.'
      when 'provider_refused' then 'No fue posible analizar este contenido. Revisa la selección.'
      when 'invalid_diagnosis' then 'La respuesta del análisis no pudo verificarse. Puedes reintentar.'
      else 'El servicio de análisis no está disponible. Inténtalo más tarde.' end;
    update public.reinforcement_requests set status='error',stage='failed',error_message=v_message where id=v_request_id;
  end if;
  return jsonb_build_object('disposition','saved','analysis',to_jsonb(v_analysis));
end;
$$;
notify pgrst, 'reload schema';
commit;
