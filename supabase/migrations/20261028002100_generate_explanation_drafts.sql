begin;
set local lock_timeout='5s';

-- Private-to-owner review drafts. Published reinforcements are a separate
-- resource: HU020 never inserts there or exposes an approval transaction.
create table public.reinforcement_generations (
  request_id uuid primary key references public.reinforcement_requests(id) on delete cascade,
  detail_level text not null check(detail_level in ('brief','intermediate','detailed')),
  version integer not null check(version>0),
  status text not null check(status in ('draft','processing','ready','error')),
  approval_status text not null default 'pending' check(approval_status='pending'),
  attempt_id uuid, analysis_attempt_id uuid, choice_version integer not null check(choice_version>0),
  content jsonb check(content is null or (jsonb_typeof(content)='object' and octet_length(content::text)<=32000)),
  model text check(model is null or char_length(model) between 1 and 100),
  error_code text check(error_code in ('provider_unavailable','provider_refused','invalid_explanation','timeout')),
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
alter table public.reinforcement_generations enable row level security;
revoke all on public.reinforcement_generations from public,anon,authenticated;
grant select on public.reinforcement_generations to authenticated;
create policy "Owners read generation drafts" on public.reinforcement_generations for select to authenticated
  using(exists(select 1 from public.reinforcement_requests r where r.id=request_id and r.owner_id=(select auth.uid())));

create table public.reinforcement_generation_runs (
  attempt_id uuid primary key, request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp()
);
create index reinforcement_generation_runs_request_date_idx on public.reinforcement_generation_runs(request_id,started_at desc);
alter table public.reinforcement_generation_runs enable row level security;
revoke all on public.reinforcement_generation_runs from public,anon,authenticated;
grant select on public.reinforcement_generation_runs to authenticated;
create policy "Owners read generation runs" on public.reinforcement_generation_runs for select to authenticated
  using(exists(select 1 from public.reinforcement_requests r where r.id=request_id and r.owner_id=(select auth.uid())));

create function private.change_verified_explanation(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_secret text; v_payload jsonb; v_exp bigint; v_action text; v_attempt uuid; v_level text; v_content jsonb;
  v_request public.reinforcement_requests%rowtype; v_analysis public.reinforcement_analyses%rowtype;
  v_recommendations public.reinforcement_recommendations%rowtype; v_current public.reinforcement_generations%rowtype;
  v_min integer; v_max integer;
begin
  if v_user is null or not private.can_manage_own_documents() then raise exception using errcode='42501',message='Generation access denied'; end if;
  if p_payload is null or octet_length(p_payload)>50000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='42501',message='Invalid generation proof'; end if;
  select secret into v_secret from private.reinforcement_request_secrets where singleton;
  if v_secret is null or encode(extensions.hmac(p_payload,v_secret,'sha256'),'hex')<>p_signature then
    raise exception using errcode='42501',message='Invalid generation proof'; end if;
  v_payload:=p_payload::jsonb; v_exp:=(v_payload->>'expiresAt')::bigint; v_action:=v_payload->>'action'; v_attempt:=(v_payload->>'attemptId')::uuid;
  if v_payload->>'operation' is distinct from 'reinforcement-explanation' or (v_payload->>'userId')::uuid is distinct from v_user
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
    or v_request.recommended_type is distinct from 'explanation'
    or (v_payload->>'choiceVersion')::integer is distinct from v_request.recommendation_choice_version
    or v_recommendations.status is distinct from 'ready'
    or v_recommendations.analysis_attempt_id is distinct from v_analysis.attempt_id
    or v_recommendations.attempt_id is distinct from v_request.recommendation_attempt_id then
    raise exception using errcode='PT409',message='Current sufficient diagnosis and explicit explanation choice required'; end if;
  select * into v_current from public.reinforcement_generations where request_id=v_request.id for update;
  if (v_payload->>'expectedVersion')::integer is distinct from coalesce(v_current.version,0) then
    raise exception using errcode='PT409',message='Detail level changed'; end if;

  if v_action='configure' then
    if not ((v_request.status='pending' and v_request.stage='choosing') or (v_request.status='error' and v_request.stage='failed'))
      or v_current.status in ('processing','ready') then raise exception using errcode='PT409',message='Generation already started'; end if;
    v_level:=v_payload->>'level';
    if v_level is null or v_level not in ('brief','intermediate','detailed') then raise exception using errcode='23514',message='Choose a supported detail level'; end if;
    if v_current.request_id is null then
      insert into public.reinforcement_generations(request_id,detail_level,version,status,choice_version)
        values(v_request.id,v_level,1,'draft',v_request.recommendation_choice_version) returning * into v_current;
    else
      update public.reinforcement_generations set detail_level=v_level,version=version+1,choice_version=v_request.recommendation_choice_version,updated_at=clock_timestamp()
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
    if (select count(*) from public.reinforcement_generations g join public.reinforcement_requests r on r.id=g.request_id
        where r.owner_id=v_user and g.status='processing' and g.lease_expires_at>clock_timestamp())>=2
      or (select count(*) from public.reinforcement_generation_runs t join public.reinforcement_requests r on r.id=t.request_id
        where r.owner_id=v_user and t.started_at>clock_timestamp()-interval '5 minutes')>=10 then
      raise exception using errcode='P0001',message='Generation rate limit'; end if;
    insert into public.reinforcement_generation_runs(attempt_id,request_id) values(v_attempt,v_request.id);
    update public.reinforcement_generations set status='processing',attempt_id=v_attempt,analysis_attempt_id=v_analysis.attempt_id,
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
    v_min:=case v_current.detail_level when 'brief' then 80 when 'intermediate' then 180 else 350 end;
    v_max:=case v_current.detail_level when 'brief' then 1200 when 'intermediate' then 3000 else 6000 end;
    if (jsonb_typeof(v_content)='object' and char_length(btrim(v_content->>'title')) between 3 and 160
      and char_length(btrim(v_content->>'text')) between v_min and v_max
      and char_length(v_content->>'sourceQuote') between 8 and 500
      and position(v_content->>'sourceQuote' in v_analysis.context->>'selectedText')>0
      and v_content->>'topicReference'=v_analysis.diagnosis->>'topic') is not true then
      raise exception using errcode='23514',message='Explanation must match source and level'; end if;
    update public.reinforcement_generations set status='ready',content=v_content,model=v_payload->>'model',error_code=null,
      finished_at=clock_timestamp(),updated_at=clock_timestamp() where request_id=v_request.id returning * into v_current;
    update public.reinforcement_requests set status='generated',stage='review',error_message=null where id=v_request.id;
  elsif v_payload->>'status'='error' then
    update public.reinforcement_generations set status='error',content=null,model=null,error_code=v_payload->>'errorCode',
      finished_at=clock_timestamp(),updated_at=clock_timestamp() where request_id=v_request.id returning * into v_current;
    update public.reinforcement_requests set status='error',stage='failed',error_message='La explicación no pudo completarse. Revisa el detalle y reintenta.' where id=v_request.id;
  else raise exception using errcode='23514',message='Invalid generation result'; end if;
  return jsonb_build_object('disposition','saved','generation',to_jsonb(v_current));
end;
$$;
revoke all on function private.change_verified_explanation(text,text) from public,anon;
grant execute on function private.change_verified_explanation(text,text) to authenticated;
create function public.change_reinforcement_explanation(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$ select private.change_verified_explanation(p_payload,p_signature); $$;
revoke all on function public.change_reinforcement_explanation(text,text) from public,anon;
grant execute on function public.change_reinforcement_explanation(text,text) to authenticated;
notify pgrst,'reload schema';
commit;
