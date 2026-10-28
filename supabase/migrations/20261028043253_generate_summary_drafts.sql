begin;
set local lock_timeout='5s';
create table public.reinforcement_summaries (
  request_id uuid primary key references public.reinforcement_requests(id) on delete cascade,
  mode text not null check(mode in ('compact','brief')),
  version integer not null check(version>0),
  status text not null check(status in ('draft','processing','ready','error')),
  approval_status text not null default 'pending' check(approval_status='pending'),
  attempt_id uuid, analysis_attempt_id uuid, choice_version integer not null check(choice_version>0),
  content jsonb check(content is null or (jsonb_typeof(content)='object' and octet_length(content::text)<=32000)),
  model text check(model is null or char_length(model) between 1 and 100),
  error_code text check(error_code in ('provider_unavailable','provider_refused','invalid_summary','timeout')),
  started_at timestamptz, updated_at timestamptz not null default clock_timestamp(),
  lease_expires_at timestamptz, finished_at timestamptz,
  attempts integer not null default 0 check(attempts>=0),
  check (((status='draft' and attempt_id is null and analysis_attempt_id is null and attempts=0 and started_at is null and lease_expires_at is null
      and content is null and model is null and error_code is null and finished_at is null)
    or (status='processing' and attempt_id is not null and analysis_attempt_id is not null and attempts>0 and started_at is not null and lease_expires_at is not null
      and content is null and model is null and error_code is null and finished_at is null)
    or (status='ready' and attempt_id is not null and analysis_attempt_id is not null and attempts>0 and started_at is not null and lease_expires_at is not null
      and content is not null and model is not null and error_code is null and finished_at is not null)
    or (status='error' and attempt_id is not null and analysis_attempt_id is not null and attempts>0 and started_at is not null and lease_expires_at is not null
      and content is null and model is null and error_code is not null and finished_at is not null)) is true)
);
alter table public.reinforcement_summaries enable row level security;
revoke all on public.reinforcement_summaries from public,anon,authenticated;
grant select on public.reinforcement_summaries to authenticated;
create policy "Owners read generation drafts" on public.reinforcement_summaries for select to authenticated
  using(exists(select 1 from public.reinforcement_requests r where r.id=request_id and r.owner_id=(select auth.uid())));

create table public.reinforcement_summary_runs (
  attempt_id uuid primary key, request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp()
);
create index reinforcement_summary_runs_request_date_idx on public.reinforcement_summary_runs(request_id,started_at desc);
alter table public.reinforcement_summary_runs enable row level security;
revoke all on public.reinforcement_summary_runs from public,anon,authenticated;
grant select on public.reinforcement_summary_runs to authenticated;
create policy "Owners read generation runs" on public.reinforcement_summary_runs for select to authenticated
  using(exists(select 1 from public.reinforcement_requests r where r.id=request_id and r.owner_id=(select auth.uid())));

create function private.summary_term(p_text text) returns text language sql immutable set search_path='' as $$
 select btrim(regexp_replace(translate(lower(p_text),'áéíóúüñ','aeiouun'),'\s+',' ','g')); $$;
revoke all on function private.summary_term(text) from public,anon,authenticated;
create function private.clean_summary_concepts(p_concepts jsonb,p_context jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare v_item jsonb; v_name text; v_quote text; v_key text; v_seen text[]:='{}'; v_result jsonb:='[]';
begin
 if jsonb_typeof(p_concepts) is distinct from 'array' or jsonb_array_length(p_concepts)>12 then raise exception using errcode='23514',message='Invalid concepts'; end if;
 for v_item in select value from jsonb_array_elements(p_concepts) loop
  if jsonb_typeof(v_item) is distinct from 'object' or jsonb_typeof(v_item->'name') is distinct from 'string' or jsonb_typeof(v_item->'sourceQuote') is distinct from 'string' then raise exception using errcode='23514',message='Invalid concept'; end if;
  v_name:=btrim(v_item->>'name'); v_quote:=btrim(v_item->>'sourceQuote');
  if v_name='' then continue; end if;
  v_key:=private.summary_term(v_name);
  if (char_length(v_name) between 2 and 80 and char_length(v_quote) between 8 and 500
   and (position(v_quote in p_context->>'selectedText')>0 or position(v_quote in p_context->>'nearbyText')>0)
   and position(v_key in private.summary_term(v_quote))>0) is not true then raise exception using errcode='23514',message='Concept must be supported by its literal source'; end if;
  if not v_key=any(v_seen) then v_seen:=array_append(v_seen,v_key); v_result:=v_result||jsonb_build_array(jsonb_build_object('name',v_name,'sourceQuote',v_quote)); end if;
 end loop;
 if jsonb_array_length(v_result) not between 1 and 8 then raise exception using errcode='23514',message='One to eight concepts required'; end if;
 return v_result;
end; $$;
revoke all on function private.clean_summary_concepts(jsonb,jsonb) from public,anon,authenticated;
alter table public.reinforcement_review_versions add column summary_content jsonb
 check(summary_content is null or (jsonb_typeof(summary_content)='object' and octet_length(summary_content::text)<=16000));
create function private.change_verified_summary(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_secret text; v_payload jsonb; v_exp bigint; v_action text; v_attempt uuid; v_mode text; v_content jsonb;
  v_request public.reinforcement_requests%rowtype; v_analysis public.reinforcement_analyses%rowtype;
  v_recommendations public.reinforcement_recommendations%rowtype; v_current public.reinforcement_summaries%rowtype;
  v_min integer; v_max integer;
begin
  if v_user is null or not private.can_manage_own_documents() then raise exception using errcode='42501',message='Generation access denied'; end if;
  if p_payload is null or octet_length(p_payload)>50000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='42501',message='Invalid generation proof'; end if;
  select secret into v_secret from private.reinforcement_request_secrets where singleton;
  if v_secret is null or encode(extensions.hmac(p_payload,v_secret,'sha256'),'hex')<>p_signature then
    raise exception using errcode='42501',message='Invalid generation proof'; end if;
  v_payload:=p_payload::jsonb; v_exp:=(v_payload->>'expiresAt')::bigint; v_action:=v_payload->>'action'; v_attempt:=(v_payload->>'attemptId')::uuid;
  if v_payload->>'operation' is distinct from 'reinforcement-summary' or (v_payload->>'userId')::uuid is distinct from v_user
    or v_exp is null or v_exp<extract(epoch from clock_timestamp()) or v_exp>extract(epoch from clock_timestamp())+120 then
    raise exception using errcode='42501',message='Expired or foreign generation proof'; end if;
  if v_action is null or v_action not in ('configure','start','finish') then raise exception using errcode='23514',message='Invalid generation action'; end if;
  perform pg_advisory_xact_lock(hashtextextended('contextual-analysis:'||v_user::text,0));
  v_request:=private.lock_current_recommendation_request((v_payload->>'requestId')::uuid,(v_payload->>'documentId')::uuid);
  select * into v_analysis from public.reinforcement_analyses where request_id=v_request.id for update;
  select * into v_recommendations from public.reinforcement_recommendations where request_id=v_request.id for update;
  if v_analysis.status is distinct from 'ready' or v_analysis.context->>'enough' is distinct from 'true'
    or v_analysis.diagnosis->>'sufficient' is distinct from 'true'
    or (v_payload->>'analysisAttemptId')::uuid is distinct from v_analysis.attempt_id
    or v_request.recommended_type is distinct from 'summary'
    or (v_payload->>'choiceVersion')::integer is distinct from v_request.recommendation_choice_version
    or v_recommendations.status is distinct from 'ready'
    or v_recommendations.analysis_attempt_id is distinct from v_analysis.attempt_id
    or v_recommendations.attempt_id is distinct from v_request.recommendation_attempt_id then
    raise exception using errcode='PT409',message='Current sufficient diagnosis and explicit summary choice required'; end if;
  select * into v_current from public.reinforcement_summaries where request_id=v_request.id for update;
  if (v_payload->>'expectedVersion')::integer is distinct from coalesce(v_current.version,0) then
    raise exception using errcode='PT409',message='Detail level changed'; end if;

  if v_action='configure' then
    if not ((v_request.status='pending' and v_request.stage='choosing') or (v_request.status='error' and v_request.stage='failed'))
      or v_current.status in ('processing','ready') then raise exception using errcode='PT409',message='Generation already started'; end if;
    v_mode:=v_payload->>'mode';
    if v_mode is null or v_mode not in ('compact','brief') then raise exception using errcode='23514',message='Choose a supported detail level'; end if;
    if v_current.request_id is null then
      insert into public.reinforcement_summaries(request_id,mode,version,status,choice_version)
        values(v_request.id,v_mode,1,'draft',v_request.recommendation_choice_version) returning * into v_current;
    else
      update public.reinforcement_summaries set mode=v_mode,version=version+1,choice_version=v_request.recommendation_choice_version,updated_at=clock_timestamp()
        where request_id=v_request.id returning * into v_current;
    end if;
    return jsonb_build_object('disposition','configured','generation',to_jsonb(v_current));
  end if;
  if v_current.request_id is null or v_current.choice_version<>v_request.recommendation_choice_version or v_attempt is null then
    raise exception using errcode='PT409',message='Save current detail level before generating'; end if;
  if v_action='start' then
    if v_current.status='ready' then return jsonb_build_object('disposition','cached','generation',to_jsonb(v_current)); end if;
    if v_current.status='processing' and v_current.lease_expires_at>clock_timestamp() then
      return jsonb_build_object('disposition','busy','generation',to_jsonb(v_current)); end if;
    if not ((v_request.status='pending' and v_request.stage='choosing') or (v_request.status='error' and v_request.stage='failed')
      or (v_request.status='processing' and v_request.stage='generating' and v_current.status='processing')) then
      raise exception using errcode='PT409',message='Request cannot generate'; end if;
    if (select count(*) from public.reinforcement_summaries g join public.reinforcement_requests r on r.id=g.request_id
        where r.owner_id=v_user and g.status='processing' and g.lease_expires_at>clock_timestamp())>=2
      or (select count(*) from public.reinforcement_summary_runs t join public.reinforcement_requests r on r.id=t.request_id
        where r.owner_id=v_user and t.started_at>clock_timestamp()-interval '5 minutes')>=10 then
      raise exception using errcode='P0001',message='Generation rate limit'; end if;
    insert into public.reinforcement_summary_runs(attempt_id,request_id) values(v_attempt,v_request.id);
    update public.reinforcement_summaries set status='processing',attempt_id=v_attempt,analysis_attempt_id=v_analysis.attempt_id,
      content=null,model=null,error_code=null,started_at=clock_timestamp(),updated_at=clock_timestamp(),finished_at=null,
      lease_expires_at=clock_timestamp()+interval '120 seconds',attempts=attempts+1 where request_id=v_request.id returning * into v_current;
    update public.reinforcement_requests set status='processing',stage='generating',error_message=null where id=v_request.id;
    return jsonb_build_object('disposition','started','generation',to_jsonb(v_current));
  end if;
  if v_current.attempt_id is distinct from v_attempt or v_current.analysis_attempt_id is distinct from v_analysis.attempt_id then
    raise exception using errcode='PT409',message='Obsolete generation attempt'; end if;
  if v_current.status in ('ready','error') then return jsonb_build_object('disposition','cached','generation',to_jsonb(v_current)); end if;
  if v_current.status<>'processing' or v_current.lease_expires_at<=clock_timestamp() or v_request.status<>'processing' or v_request.stage<>'generating' then
    raise exception using errcode='PT409',message='Generation lease or stage changed'; end if;
  if v_payload->>'status'='ready' then
    v_content:=v_payload->'content';
    v_min:=80;
    v_max:=case v_current.mode when 'compact' then 350 else 700 end;
    v_content:=jsonb_set(v_content,'{concepts}',private.clean_summary_concepts(v_content->'concepts',v_analysis.context));
    if (jsonb_typeof(v_content)='object' and char_length(btrim(v_content->>'title')) between 3 and 160
      and char_length(btrim(v_content->>'text')) between v_min and v_max
      and char_length(v_content->>'sourceQuote') between 8 and 500
      and position(v_content->>'sourceQuote' in v_analysis.context->>'selectedText')>0
      and v_content->>'topicReference'=v_analysis.diagnosis->>'topic'
      and v_content->>'consistentWithSource'='true'
      and jsonb_array_length(v_content->'concepts') between 1 and 8) is not true then
      raise exception using errcode='23514',message='Summary must match source and level'; end if;
    update public.reinforcement_summaries set status='ready',content=v_content,model=v_payload->>'model',error_code=null,
      finished_at=clock_timestamp(),updated_at=clock_timestamp() where request_id=v_request.id returning * into v_current;
    update public.reinforcement_requests set status='generated',stage='review',error_message=null where id=v_request.id;
    insert into public.reinforcement_review_versions(request_id,version,origin,title,text,actor_id,summary_content)
      values(v_request.id,1,'ai',v_content->>'title',v_content->>'text',v_user,v_content);
    insert into public.reinforcement_review_heads(request_id,current_version) values(v_request.id,1);
  elsif v_payload->>'status'='error' then
    update public.reinforcement_summaries set status='error',content=null,model=null,error_code=v_payload->>'errorCode',
      finished_at=clock_timestamp(),updated_at=clock_timestamp() where request_id=v_request.id returning * into v_current;
    update public.reinforcement_requests set status='error',stage='failed',error_message='El resumen no pudo completarse. Revisa el detalle y reintenta.' where id=v_request.id;
  else raise exception using errcode='23514',message='Invalid generation result'; end if;
  return jsonb_build_object('disposition','saved','generation',to_jsonb(v_current));
end;
$$;
revoke all on function private.change_verified_summary(text,text) from public,anon;
grant execute on function private.change_verified_summary(text,text) to authenticated;
create function public.change_reinforcement_summary(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$ select private.change_verified_summary(p_payload,p_signature); $$;
revoke all on function public.change_reinforcement_summary(text,text) from public,anon;
grant execute on function public.change_reinforcement_summary(text,text) to authenticated;
create or replace function private.review_owned_summary(p_request_id uuid,p_document_id uuid,p_expected_version integer,p_action text,
  p_title text,p_text text,p_concepts jsonb,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_request public.reinforcement_requests%rowtype; v_head public.reinforcement_review_heads%rowtype;
  v_version public.reinforcement_review_versions%rowtype; v_event public.reinforcement_review_events%rowtype;
  v_hash text; v_receipt jsonb; v_now timestamptz:=clock_timestamp(); v_mode text; v_kind text; v_context jsonb; v_concepts jsonb; v_content jsonb; v_limit integer;
begin
  v_request:=private.lock_current_recommendation_request(p_request_id,p_document_id);
  if p_operation_id is null or p_action is null or p_action not in ('edit','approve','discard') or p_expected_version is null then
    raise exception using errcode='23514',message='Invalid review action'; end if;
  if p_action<>'edit' and (p_title is not null or p_text is not null or p_concepts is not null) then raise exception using errcode='23514',message='Review the saved version'; end if;
  v_hash:=encode(extensions.digest(jsonb_build_object('request',p_request_id,'document',p_document_id,'action',p_action,
    'version',p_expected_version,'title',p_title,'text',p_text,'concepts',p_concepts)::text,'sha256'),'hex');
  select * into v_event from public.reinforcement_review_events where operation_id=p_operation_id;
  if found then
    if v_event.request_id<>p_request_id or v_event.actor_id<>auth.uid() then raise exception using errcode='42501',message='Foreign operation'; end if;
    if v_event.input_hash<>v_hash then raise exception using errcode='PT409',message='Operation reused with different input'; end if;
    return v_event.receipt;
  end if;
  select * into v_head from public.reinforcement_review_heads where request_id=p_request_id for update;
  if not found or v_head.current_version<>p_expected_version or not exists(select 1 from public.reinforcement_summaries where request_id=p_request_id and status='ready') then
    raise exception using errcode='PT409',message='Current generated version required'; end if;
  select * into v_version from public.reinforcement_review_versions where request_id=p_request_id and version=v_head.current_version;
  if v_version.summary_content is null then raise exception using errcode='PT409',message='Current summary version required'; end if;
  select context into v_context from public.reinforcement_analyses where request_id=p_request_id;
  select case mode when 'compact' then 350 else 700 end into v_limit from public.reinforcement_summaries where request_id=p_request_id;
  perform set_config('pdf_interactivo.owner_review',p_request_id::text,true);
  if p_action='edit' then
    if v_head.decision='discarded' or v_request.status not in ('generated','approved') or v_request.stage not in ('review','approved') then
      raise exception using errcode='PT409',message='Draft no longer editable'; end if;
    if (char_length(btrim(p_title)) between 3 and 160 and char_length(btrim(p_text)) between 80 and v_limit) is not true then
      raise exception using errcode='23514',message='Review title and text'; end if;
    if v_head.current_version>=100 then raise exception using errcode='P0001',message='Review version limit'; end if;
    v_concepts:=private.clean_summary_concepts(p_concepts,v_context);
    if v_version.title=btrim(p_title) and v_version.text=btrim(p_text) and v_version.summary_content->'concepts'=v_concepts then return to_jsonb(v_head); end if;
    insert into public.reinforcement_review_versions(request_id,version,origin,title,text,actor_id,summary_content)
      values(p_request_id,v_head.current_version+1,'owner',btrim(p_title),btrim(p_text),auth.uid(),v_version.summary_content||jsonb_build_object('title',btrim(p_title),'text',btrim(p_text),'concepts',v_concepts)) returning * into v_version;
    update public.reinforcement_review_heads set current_version=v_version.version,decision='pending',updated_at=v_now
      where request_id=p_request_id returning * into v_head;
    perform set_config('pdf_interactivo.review_edit',p_request_id::text,true);
    update public.reinforcement_requests set status='generated',stage='review',approved_by=null,approved_at=null where id=p_request_id;
  elsif p_action='approve' then
    if v_head.decision='approved' then return to_jsonb(v_head); end if;
    if v_head.decision<>'pending' or v_request.status<>'generated' or v_request.stage<>'review' then raise exception using errcode='PT409',message='Only a pending version can be approved'; end if;
    perform set_config('pdf_interactivo.owner_approval',p_request_id::text,true);
    update public.reinforcement_requests set status='approved',stage='approved',approved_by=auth.uid(),approved_at=v_now where id=p_request_id;
    update public.reinforcement_review_heads set decision='approved',approved_version_id=v_version.id,approved_by=auth.uid(),approved_at=v_now,updated_at=v_now
      where request_id=p_request_id returning * into v_head;
    select mode into v_mode from public.reinforcement_summaries where request_id=p_request_id; v_kind:='summary';
    insert into public.reinforcements(document_id,page_number,title,content,source_request_id,approved_version_id)
      values(v_request.document_id,v_request.page_number,v_version.title,jsonb_build_object('type',v_kind,'mode',v_mode,'summary',v_version.summary_content,'text',v_version.text,
        'generatedByAI',true,'editedByOwner',v_version.origin='owner','approvedBy',auth.uid(),'approvedAt',v_now),p_request_id,v_version.id)
      on conflict(source_request_id) where source_request_id is not null do update set title=excluded.title,content=excluded.content,approved_version_id=excluded.approved_version_id;
  else
    if v_head.decision='discarded' then return to_jsonb(v_head); end if;
    if v_head.decision<>'pending' or v_request.status<>'generated' then raise exception using errcode='PT409',message='Only a pending draft can be discarded'; end if;
    update public.reinforcement_review_heads set decision='discarded',updated_at=v_now where request_id=p_request_id returning * into v_head;
    if v_head.approved_version_id is null then
      update public.reinforcement_requests set stage='discarded' where id=p_request_id;
    else
      perform set_config('pdf_interactivo.owner_approval',p_request_id::text,true);
      update public.reinforcement_requests set status='approved',stage='approved',approved_by=v_head.approved_by,approved_at=v_head.approved_at where id=p_request_id;
    end if;
  end if;
  v_receipt:=to_jsonb(v_head);
  insert into public.reinforcement_review_events(operation_id,request_id,version,action,actor_id,input_hash,receipt)
    values(p_operation_id,p_request_id,v_head.current_version,p_action,auth.uid(),v_hash,v_receipt);
  return v_receipt;
end;
$$;
revoke all on function private.review_owned_summary(uuid,uuid,integer,text,text,text,jsonb,uuid) from public,anon;
grant execute on function private.review_owned_summary(uuid,uuid,integer,text,text,text,jsonb,uuid) to authenticated;
create or replace function public.review_reinforcement_summary(p_request_id uuid,p_document_id uuid,p_expected_version integer,p_action text,
  p_title text,p_text text,p_concepts jsonb,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$
  select private.review_owned_summary(p_request_id,p_document_id,p_expected_version,p_action,p_title,p_text,p_concepts,p_operation_id);
$$;
revoke all on function public.review_reinforcement_summary(uuid,uuid,integer,text,text,text,jsonb,uuid) from public,anon;
grant execute on function public.review_reinforcement_summary(uuid,uuid,integer,text,text,text,jsonb,uuid) to authenticated;

create or replace function private.guard_reviewed_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare v_source uuid;
begin
  v_source:=case when tg_op='DELETE' then old.source_request_id else new.source_request_id end;
  if tg_op='DELETE' then
    if v_source is null or not exists(select 1 from public.reinforcement_requests where id=v_source)
      or not exists(select 1 from public.documents where id=old.document_id) then return old; end if;
    raise exception using errcode='42501',message='Approved version is preserved';
  end if;
  if tg_op='UPDATE' and old.source_request_id is not null and new.source_request_id is distinct from old.source_request_id then
    raise exception using errcode='42501',message='Published source is immutable'; end if;
  if v_source is null then return new; end if;
  if current_setting('pdf_interactivo.owner_approval',true) is distinct from v_source::text or not private.can_manage_own_documents()
    or not exists(select 1 from public.reinforcement_requests r join public.reinforcement_review_heads h on h.request_id=r.id
      join public.reinforcement_review_versions v on v.id=h.approved_version_id and v.request_id=r.id
      where r.id=v_source and r.owner_id=auth.uid() and r.document_id=new.document_id and r.page_number=new.page_number
      and r.status='approved' and r.approved_by=auth.uid() and h.decision='approved' and v.id=new.approved_version_id
      and v.title=new.title and v.text=new.content->>'text'
      and v.visual_content is not distinct from nullif(new.content->'visual','null'::jsonb)
      and v.summary_content is not distinct from nullif(new.content->'summary','null'::jsonb)) then
    raise exception using errcode='42501',message='Explicit approval of this version required'; end if;
  return new;
end;
$$;
revoke all on function private.guard_reviewed_publication() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
