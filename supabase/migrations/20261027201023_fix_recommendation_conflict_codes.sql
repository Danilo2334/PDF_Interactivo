begin;
set local lock_timeout='5s';
-- SCRUM-96: deterministic application conflicts must not use serialization_failure.
-- PostgREST can retry SQLSTATE 40001; PT409 returns an ordinary HTTP conflict.
-- Replace only these codes. CREATE OR REPLACE preserves existing ownership and grants.
create or replace function private.lock_current_recommendation_request(p_request_id uuid,p_document_id uuid)
returns public.reinforcement_requests language plpgsql security definer set search_path='' as $$
declare v_request public.reinforcement_requests%rowtype; v_project public.projects%rowtype; v_user uuid:=auth.uid();
begin
  if v_user is null or not private.can_manage_own_documents() then raise exception using errcode='42501',message='Recommendation access denied'; end if;
  select * into v_request from public.reinforcement_requests where id=p_request_id and owner_id=v_user;
  if not found then raise exception using errcode='42501',message='Request unavailable'; end if;
  select * into v_project from public.projects where id=v_request.project_id and owner_id=v_user for update;
  if not found or v_project.status='deleting' or v_project.document_id is distinct from v_request.document_id
    or p_document_id is distinct from v_request.document_id then raise exception using errcode='PT409',message='Document version changed'; end if;
  perform 1 from public.documents where id=v_request.document_id and owner_id=v_user for key share;
  if not found or not private.document_is_available(v_request.document_id) then raise exception using errcode='42501',message='Document unavailable'; end if;
  select * into v_request from public.reinforcement_requests where id=p_request_id and owner_id=v_user for update;
  return v_request;
end;
$$;

create or replace function private.change_verified_recommendations(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_secret text; v_payload jsonb; v_exp bigint; v_attempt uuid; v_action text;
  v_request public.reinforcement_requests%rowtype; v_analysis public.reinforcement_analyses%rowtype;
  v_current public.reinforcement_recommendations%rowtype; v_option jsonb; v_seen text[]:='{}';
begin
  if v_user is null or not private.can_manage_own_documents() then raise exception using errcode='42501',message='Recommendation access denied'; end if;
  if p_payload is null or octet_length(p_payload)>100000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='42501',message='Invalid recommendation proof'; end if;
  select secret into v_secret from private.reinforcement_request_secrets where singleton;
  if v_secret is null or encode(extensions.hmac(p_payload,v_secret,'sha256'),'hex')<>p_signature then
    raise exception using errcode='42501',message='Invalid recommendation proof'; end if;
  v_payload:=p_payload::jsonb; v_exp:=(v_payload->>'expiresAt')::bigint; v_attempt:=(v_payload->>'attemptId')::uuid; v_action:=v_payload->>'action';
  if v_payload->>'operation' is distinct from 'reinforcement-recommendations' or (v_payload->>'userId')::uuid is distinct from v_user
    or v_exp is null or v_exp<extract(epoch from clock_timestamp()) or v_exp>extract(epoch from clock_timestamp())+120 then
    raise exception using errcode='42501',message='Expired or foreign recommendation proof'; end if;
  if v_attempt is null or v_action is null or v_action not in ('start','finish') then raise exception using errcode='23514',message='Invalid recommendation operation'; end if;
  perform pg_advisory_xact_lock(hashtextextended('contextual-analysis:'||v_user::text,0));
  v_request:=private.lock_current_recommendation_request((v_payload->>'requestId')::uuid,(v_payload->>'documentId')::uuid);
  select * into v_analysis from public.reinforcement_analyses where request_id=v_request.id for update;
  if v_analysis.status is distinct from 'ready' or (v_payload->>'analysisAttemptId')::uuid is distinct from v_analysis.attempt_id
    or v_request.status<>'pending' or v_request.stage<>'choosing' then raise exception using errcode='PT409',message='Sufficient current diagnosis required'; end if;
  select * into v_current from public.reinforcement_recommendations where request_id=v_request.id for update;
  if v_current.request_id is not null and v_current.analysis_attempt_id is distinct from v_analysis.attempt_id then
    raise exception using errcode='PT409',message='Recommendations belong to another diagnosis'; end if;
  if v_action='start' then
    if v_current.status in ('ready','empty') then return jsonb_build_object('disposition','cached','recommendations',to_jsonb(v_current)); end if;
    if v_current.status='processing' and v_current.lease_expires_at>clock_timestamp() then return jsonb_build_object('disposition','busy','recommendations',to_jsonb(v_current)); end if;
    if v_request.recommended_type is not null then raise exception using errcode='PT409',message='Choice already saved'; end if;
    if (select count(*) from public.reinforcement_recommendations c join public.reinforcement_requests r on r.id=c.request_id
      where r.owner_id=v_user and c.status='processing' and c.lease_expires_at>clock_timestamp())>=2
      or (select count(*) from public.reinforcement_recommendation_runs t join public.reinforcement_requests r on r.id=t.request_id
        where r.owner_id=v_user and t.started_at>clock_timestamp()-interval '5 minutes')>=10 then
      raise exception using errcode='P0001',message='Recommendation rate limit'; end if;
    insert into public.reinforcement_recommendation_runs(attempt_id,request_id) values(v_attempt,v_request.id);
    insert into public.reinforcement_recommendations(request_id,analysis_attempt_id,attempt_id,status,lease_expires_at)
    values(v_request.id,v_analysis.attempt_id,v_attempt,'processing',clock_timestamp()+interval '120 seconds')
    on conflict(request_id) do update set analysis_attempt_id=v_analysis.attempt_id,attempt_id=v_attempt,status='processing',options='[]',empty_reason=null,
      error_code=null,model=null,started_at=clock_timestamp(),updated_at=clock_timestamp(),lease_expires_at=clock_timestamp()+interval '120 seconds',
      finished_at=null,attempts=public.reinforcement_recommendations.attempts+1 returning * into v_current;
    return jsonb_build_object('disposition','started','recommendations',to_jsonb(v_current));
  end if;
  if v_current.request_id is null or v_current.attempt_id is distinct from v_attempt or v_current.analysis_attempt_id is distinct from v_analysis.attempt_id then
    raise exception using errcode='PT409',message='Obsolete recommendation attempt'; end if;
  if v_current.status<>'processing' then return jsonb_build_object('disposition','cached','recommendations',to_jsonb(v_current)); end if;
  if v_current.lease_expires_at<=clock_timestamp() then raise exception using errcode='PT409',message='Recommendation lease expired'; end if;
  if v_payload->>'status' is null or v_payload->>'status' not in ('ready','empty','error') or jsonb_typeof(v_payload->'options') is distinct from 'array' then
    raise exception using errcode='23514',message='Invalid recommendation result'; end if;
  for v_option in select value from jsonb_array_elements(v_payload->'options') loop
    if (jsonb_typeof(v_option)='object' and v_option->>'type' in ('explanation','example','summary','image','interaction')
      and not(v_option->>'type'=any(v_seen)) and char_length(btrim(v_option->>'justification')) between 20 and 700
      and (v_option->>'topicFit')::integer between 2 and 3 and (v_option->>'needFit')::integer between 2 and 3
      and char_length(v_option->>'sourceQuote') between 8 and 500 and char_length(v_option->>'needQuote') between 8 and 500
      and char_length(v_option->>'topicReference') between 1 and 200) is not true then
      raise exception using errcode='23514',message='Invalid recommendation option'; end if;
    v_seen:=array_append(v_seen,v_option->>'type');
  end loop;
  update public.reinforcement_recommendations set status=v_payload->>'status',options=v_payload->'options',empty_reason=v_payload->>'emptyReason',
    error_code=v_payload->>'errorCode',model=v_payload->>'model',finished_at=clock_timestamp(),updated_at=clock_timestamp()
    where request_id=v_request.id returning * into v_current;
  return jsonb_build_object('disposition','saved','recommendations',to_jsonb(v_current));
end;
$$;

create or replace function private.choose_owned_reinforcement_option(p_request_id uuid,p_document_id uuid,p_attempt_id uuid,p_type text,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_request public.reinforcement_requests%rowtype; v_current public.reinforcement_recommendations%rowtype; v_option jsonb;
begin
  v_request:=private.lock_current_recommendation_request(p_request_id,p_document_id);
  select * into v_current from public.reinforcement_recommendations where request_id=p_request_id for update;
  if v_current.status is distinct from 'ready' or v_current.attempt_id is distinct from p_attempt_id then
    raise exception using errcode='PT409',message='Recommendation set changed'; end if;
  if not exists(select 1 from public.reinforcement_analyses a where a.request_id=p_request_id and a.attempt_id=v_current.analysis_attempt_id and a.status='ready') then
    raise exception using errcode='PT409',message='Diagnosis changed'; end if;
  select value into v_option from jsonb_array_elements(v_current.options) where value->>'type'=p_type;
  if v_option is null then raise exception using errcode='23514',message='Choose an offered option'; end if;
  -- Lost response: return the already saved choice without modifying anything,
  -- including when subsequent generation has started since the first request.
  if v_request.recommended_type is distinct from p_type or v_request.recommendation_attempt_id is distinct from p_attempt_id then
    if v_request.recommendation_choice_version is distinct from p_expected_version or v_request.status<>'pending' or v_request.stage<>'choosing' then
      raise exception using errcode='PT409',message='Choice changed or generation started'; end if;
    perform set_config('pdf_interactivo.recommendation_choice',p_request_id::text,true);
    update public.reinforcement_requests set recommended_type=p_type,recommendation_reason=v_option->>'justification',
      recommendation_attempt_id=p_attempt_id,recommendation_selected_at=clock_timestamp(),recommendation_selected_by=auth.uid(),
      recommendation_choice_version=recommendation_choice_version+1 where id=p_request_id returning * into v_request;
  end if;
  return jsonb_build_object('choiceVersion',v_request.recommendation_choice_version,'choice',jsonb_build_object('type',v_request.recommended_type,
    'justification',v_request.recommendation_reason,'attemptId',v_request.recommendation_attempt_id,'selectedAt',v_request.recommendation_selected_at));
end;
$$;
notify pgrst,'reload schema';
commit;
