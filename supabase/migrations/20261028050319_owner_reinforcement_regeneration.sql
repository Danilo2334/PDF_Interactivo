begin;
set local lock_timeout='5s';
alter table public.reinforcement_review_versions add column generated_content jsonb
 check(generated_content is null or (jsonb_typeof(generated_content)='object' and octet_length(generated_content::text)<=32000));

-- One immutable operation per explicit click; retries of the same operation cannot spend twice.
create table public.reinforcement_regenerations (
 operation_id uuid primary key,
 attempt_id uuid not null,
 request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 expected_version integer not null check(expected_version between 1 and 99),
 instructions text not null check(char_length(btrim(instructions)) between 3 and 500),
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 status text not null check(status in ('processing','ready','error')),
 started_at timestamptz not null default clock_timestamp(),
 lease_expires_at timestamptz not null default clock_timestamp()+interval '120 seconds',
 finished_at timestamptz, result_version integer,
 model text check(model is null or char_length(model) between 1 and 100),
 error_code text check(error_code in ('provider_unavailable','provider_refused','invalid_content','timeout')),
 check((status='processing' and finished_at is null and result_version is null and error_code is null and model is null)
   or (status='ready' and finished_at is not null and result_version=expected_version+1 and error_code is null and model is not null)
   or (status='error' and finished_at is not null and result_version is null and error_code is not null and model is null))
);
create index reinforcement_regenerations_request_date_idx on public.reinforcement_regenerations(request_id,started_at desc);
create index reinforcement_regenerations_actor_date_idx on public.reinforcement_regenerations(actor_id,started_at desc);
alter table public.reinforcement_regenerations enable row level security;
revoke all on public.reinforcement_regenerations from public,anon,authenticated;
grant select on public.reinforcement_regenerations to authenticated;
create policy "Owners read regeneration attempts" on public.reinforcement_regenerations for select to authenticated
 using(exists(select 1 from public.reinforcement_requests r where r.id=request_id and r.owner_id=(select auth.uid())));

-- Serializes existing edit/approval and visual-generation paths against a live regeneration.
create function private.guard_live_regeneration() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('pdf_interactivo.regeneration_finish',true) is distinct from new.request_id::text
   and exists(select 1 from public.reinforcement_regenerations where request_id=new.request_id and status='processing' and lease_expires_at>clock_timestamp()) then
  raise exception using errcode='PT409',message='A regeneration is already in progress';
 end if;
 return new;
end; $$;
revoke all on function private.guard_live_regeneration() from public,anon,authenticated;
create trigger review_heads_guard_live_regeneration before update on public.reinforcement_review_heads for each row execute function private.guard_live_regeneration();
create trigger visuals_guard_live_regeneration before update on public.reinforcement_visuals for each row execute function private.guard_live_regeneration();

-- No backfill: existing explanations enter review only after the owner requests it.
create function private.prepare_explanation_review(p_request_id uuid,p_document_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.reinforcement_requests%rowtype; g public.reinforcement_generations%rowtype; h public.reinforcement_review_heads%rowtype;
begin
 r:=private.lock_current_recommendation_request(p_request_id,p_document_id);
 if r.recommended_type is distinct from 'explanation' or r.status<>'generated' or r.stage<>'review' then
  raise exception using errcode='PT409',message='Current generated explanation required'; end if;
 select * into h from public.reinforcement_review_heads where request_id=r.id for update;
 if found then return to_jsonb(h); end if;
 select * into g from public.reinforcement_generations where request_id=r.id and status='ready';
 if not found or g.choice_version<>r.recommendation_choice_version then raise exception using errcode='PT409',message='Verified explanation required'; end if;
 insert into public.reinforcement_review_versions(request_id,version,origin,title,text,actor_id,generated_content)
 values(r.id,1,'ai',g.content->>'title',g.content->>'text',auth.uid(),g.content);
 insert into public.reinforcement_review_heads(request_id,current_version) values(r.id,1) returning * into h;
 return to_jsonb(h);
end; $$;
revoke all on function private.prepare_explanation_review(uuid,uuid) from public,anon;
grant execute on function private.prepare_explanation_review(uuid,uuid) to authenticated;
create function public.prepare_explanation_review(p_request_id uuid,p_document_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.prepare_explanation_review(p_request_id,p_document_id);$$;
revoke all on function public.prepare_explanation_review(uuid,uuid) from public,anon;
grant execute on function public.prepare_explanation_review(uuid,uuid) to authenticated;

create function private.change_verified_regeneration(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); secret text; p jsonb; expires bigint; op uuid; action text; hsh text; c jsonb; g jsonb; kind text;
 r public.reinforcement_requests%rowtype; a public.reinforcement_analyses%rowtype;
 h public.reinforcement_review_heads%rowtype; v public.reinforcement_review_versions%rowtype;
 job public.reinforcement_regenerations%rowtype; min_chars integer:=80; max_chars integer:=6000;
begin
 if u is null or not private.can_manage_own_documents() or p_payload is null or octet_length(p_payload)>50000
   or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then raise exception using errcode='42501',message='Invalid regeneration proof'; end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then raise exception using errcode='42501',message='Invalid regeneration proof'; end if;
 p:=p_payload::jsonb; expires:=(p->>'expiresAt')::bigint; op:=(p->>'operationId')::uuid; action:=p->>'action';
 if p->>'operation' is distinct from 'reinforcement-regeneration' or (p->>'userId')::uuid is distinct from u or op is null
   or expires is null or expires<extract(epoch from clock_timestamp()) or expires>extract(epoch from clock_timestamp())+120 then
  raise exception using errcode='42501',message='Expired or foreign proof'; end if;
 if action is null or action not in ('start','finish') then raise exception using errcode='23514',message='Invalid action'; end if;
 perform pg_advisory_xact_lock(hashtextextended('contextual-analysis:'||u::text,0));
 r:=private.lock_current_recommendation_request((p->>'requestId')::uuid,(p->>'documentId')::uuid);
 select * into a from public.reinforcement_analyses where request_id=r.id;
 if a.status is distinct from 'ready' or a.context->>'enough' is distinct from 'true' or a.diagnosis->>'sufficient' is distinct from 'true'
  or a.attempt_id is distinct from (p->>'analysisAttemptId')::uuid
  or r.recommendation_choice_version is distinct from (p->>'choiceVersion')::integer
  or not exists(select 1 from public.reinforcement_recommendations x where x.request_id=r.id and x.status='ready'
    and x.analysis_attempt_id=a.attempt_id and x.attempt_id=r.recommendation_attempt_id) then
  raise exception using errcode='PT409',message='Current analysis and choice required'; end if;
 select * into h from public.reinforcement_review_heads where request_id=r.id for update;
 if not found then raise exception using errcode='PT409',message='Prepare review first'; end if;
 select * into job from public.reinforcement_regenerations where operation_id=op for update;
 if action='start' then
  if (char_length(btrim(p->>'instructions')) between 3 and 500) is not true or (p->>'expectedVersion')::integer is null then
   raise exception using errcode='23514',message='Instructions and saved version required'; end if;
  hsh:=encode(extensions.digest(jsonb_build_object('request',r.id,'document',r.document_id,'version',(p->>'expectedVersion')::integer,'instructions',btrim(p->>'instructions'))::text,'sha256'),'hex');
  if job.operation_id is not null then
   if job.request_id<>r.id or job.actor_id<>u then raise exception using errcode='42501',message='Foreign operation'; end if;
   if job.input_hash<>hsh then raise exception using errcode='PT409',message='Operation reused with different input'; end if;
   if job.status<>'processing' then return jsonb_build_object('disposition','cached','job',to_jsonb(job)); end if;
   if job.lease_expires_at>clock_timestamp() then return jsonb_build_object('disposition','busy','job',to_jsonb(job)); end if;
   if h.current_version<>job.expected_version then raise exception using errcode='PT409',message='Obsolete version'; end if;
   update public.reinforcement_regenerations set status='error',error_code='timeout',finished_at=clock_timestamp() where operation_id=op;
   -- A distinct operation is required after an expired worker, avoiding late completion of that worker.
   return jsonb_build_object('disposition','cached','job',to_jsonb(job)||jsonb_build_object('status','error','error_code','timeout','finished_at',clock_timestamp()));
  end if;
  if h.current_version is distinct from (p->>'expectedVersion')::integer or r.status not in ('generated','approved')
    or r.stage not in ('review','approved','discarded') then raise exception using errcode='PT409',message='Current review version required'; end if;
  if exists(select 1 from public.reinforcement_review_events where operation_id=op) then raise exception using errcode='PT409',message='Operation already used for review'; end if;
  if h.current_version>=100 then raise exception using errcode='P0001',message='Review version limit'; end if;
  if exists(select 1 from public.reinforcement_regenerations where request_id=r.id and status='processing' and lease_expires_at>clock_timestamp()) then
   return jsonb_build_object('disposition','busy'); end if;
  if (select count(*) from public.reinforcement_regenerations where actor_id=u and status='processing' and lease_expires_at>clock_timestamp())>=2
    or (select count(*) from public.reinforcement_regenerations where actor_id=u and started_at>clock_timestamp()-interval '5 minutes')>=10 then
   raise exception using errcode='P0001',message='Regeneration rate limit'; end if;
  kind:=r.recommended_type;
  if kind='explanation' then select to_jsonb(t) into g from public.reinforcement_generations t where request_id=r.id;
  elsif kind='example' then select to_jsonb(t) into g from public.reinforcement_examples t where request_id=r.id;
  elsif kind='summary' then select to_jsonb(t) into g from public.reinforcement_summaries t where request_id=r.id;
  elsif kind='image' then select to_jsonb(t) into g from public.reinforcement_visuals t where request_id=r.id;
  else raise exception using errcode='PT409',message='Unsupported format'; end if;
  if g->>'status' is distinct from 'ready' or (g->>'choice_version')::integer is distinct from r.recommendation_choice_version then
   raise exception using errcode='PT409',message='Current generated content required'; end if;
  select * into v from public.reinforcement_review_versions where request_id=r.id and version=h.current_version;
  insert into public.reinforcement_regenerations(operation_id,attempt_id,request_id,actor_id,expected_version,instructions,input_hash,status)
   values(op,(p->>'attemptId')::uuid,r.id,u,h.current_version,btrim(p->>'instructions'),hsh,'processing') returning * into job;
  return jsonb_build_object('disposition','started','job',to_jsonb(job),'kind',kind,'generation',g,
   'previous',coalesce(v.generated_content,v.summary_content,v.visual_content,g->'content')||jsonb_build_object('title',v.title,'text',v.text));
 end if;
 if job.operation_id is null or job.request_id<>r.id or job.actor_id<>u or job.attempt_id is distinct from (p->>'attemptId')::uuid then raise exception using errcode='42501',message='Owned attempt required'; end if;
 if job.status<>'processing' then return jsonb_build_object('disposition','cached','job',to_jsonb(job)); end if;
 if job.lease_expires_at<=clock_timestamp() or h.current_version<>job.expected_version then raise exception using errcode='PT409',message='Obsolete attempt'; end if;
 if p->>'status'='error' then
  update public.reinforcement_regenerations set status='error',error_code=p->>'errorCode',finished_at=clock_timestamp() where operation_id=op returning * into job;
  return jsonb_build_object('disposition','saved','job',to_jsonb(job));
 end if;
 if p->>'status' is distinct from 'ready' then raise exception using errcode='23514',message='Invalid result'; end if;
 c:=p->'content'; kind:=r.recommended_type;
 if kind='explanation' then
  select case detail_level when 'brief' then 80 when 'intermediate' then 180 else 350 end,
   case detail_level when 'brief' then 1200 when 'intermediate' then 3000 else 6000 end into min_chars,max_chars from public.reinforcement_generations where request_id=r.id;
 elsif kind='summary' then
  select case mode when 'compact' then 350 else 700 end into max_chars from public.reinforcement_summaries where request_id=r.id;
  c:=jsonb_set(c,'{concepts}',private.clean_summary_concepts(c->'concepts',a.context));
 elsif kind='example' then min_chars:=120;
 elsif kind='image' then max_chars:=1600;
 else raise exception using errcode='PT409',message='Unsupported format'; end if;
 if (jsonb_typeof(c)='object' and char_length(btrim(c->>'title')) between 3 and 160 and char_length(btrim(c->>'text')) between min_chars and max_chars
   and char_length(c->>'sourceQuote') between 8 and 500 and position(c->>'sourceQuote' in a.context->>'selectedText')>0
   and c->>'topicReference'=a.diagnosis->>'topic') is not true then raise exception using errcode='23514',message='Content must match source'; end if;
 if kind<>'explanation' and c->>'consistentWithSource' is distinct from 'true' then raise exception using errcode='23514',message='Inconsistent content'; end if;
 if kind='example' and (char_length(btrim(c->>'relation')) between 20 and 1200 and char_length(btrim(c->>'limitations')) between 20 and 1200) is not true then raise exception using errcode='23514',message='Example relations required'; end if;
 if kind='image' and (not private.visual_scene_is_valid(c->'scene') or c->'scene'->>'kind' is distinct from (select mode from public.reinforcement_visuals where request_id=r.id)) then raise exception using errcode='23514',message='Invalid visual scene'; end if;
 perform set_config('pdf_interactivo.regeneration_finish',r.id::text,true);
 insert into public.reinforcement_review_versions(request_id,version,origin,title,text,actor_id,generated_content,summary_content,visual_content)
 values(r.id,h.current_version+1,'ai',c->>'title',c->>'text',u,c,case when kind='summary' then c else null end,case when kind='image' then c else null end) returning * into v;
 update public.reinforcement_review_heads set current_version=v.version,decision='pending',updated_at=clock_timestamp() where request_id=r.id returning * into h;
 perform set_config('pdf_interactivo.owner_review',r.id::text,true); perform set_config('pdf_interactivo.review_edit',r.id::text,true);
 update public.reinforcement_requests set status='generated',stage='review',approved_by=null,approved_at=null where id=r.id;
 update public.reinforcement_regenerations set status='ready',model=p->>'model',result_version=v.version,finished_at=clock_timestamp() where operation_id=op returning * into job;
 insert into public.reinforcement_review_events(operation_id,request_id,version,action,actor_id,input_hash,receipt)
 values(op,r.id,v.version,'regenerate',u,job.input_hash,to_jsonb(h));
 return jsonb_build_object('disposition','saved','job',to_jsonb(job));
end; $$;
revoke all on function private.change_verified_regeneration(text,text) from public,anon;
grant execute on function private.change_verified_regeneration(text,text) to authenticated;
create function public.change_reinforcement_regeneration(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_verified_regeneration(p_payload,p_signature);$$;
revoke all on function public.change_reinforcement_regeneration(text,text) from public,anon;
grant execute on function public.change_reinforcement_regeneration(text,text) to authenticated;

create or replace function private.review_owned_reinforcement(p_request_id uuid,p_document_id uuid,p_expected_version integer,p_action text,
  p_title text,p_text text,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_request public.reinforcement_requests%rowtype; v_head public.reinforcement_review_heads%rowtype;
  v_version public.reinforcement_review_versions%rowtype; v_event public.reinforcement_review_events%rowtype;
  v_hash text; v_receipt jsonb; v_now timestamptz:=clock_timestamp(); v_mode text; v_kind text;
begin
  v_request:=private.lock_current_recommendation_request(p_request_id,p_document_id);
  if p_operation_id is null or p_action is null or p_action not in ('edit','approve','discard') or p_expected_version is null then
    raise exception using errcode='23514',message='Invalid review action'; end if;
  if p_action<>'edit' and (p_title is not null or p_text is not null) then raise exception using errcode='23514',message='Review the saved version'; end if;
  v_hash:=encode(extensions.digest(jsonb_build_object('request',p_request_id,'document',p_document_id,'action',p_action,
    'version',p_expected_version,'title',p_title,'text',p_text)::text,'sha256'),'hex');
  select * into v_event from public.reinforcement_review_events where operation_id=p_operation_id;
  if found then
    if v_event.request_id<>p_request_id or v_event.actor_id<>auth.uid() then raise exception using errcode='42501',message='Foreign operation'; end if;
    if v_event.input_hash<>v_hash then raise exception using errcode='PT409',message='Operation reused with different input'; end if;
    return v_event.receipt;
  end if;
  select * into v_head from public.reinforcement_review_heads where request_id=p_request_id for update;
  if not found or v_head.current_version<>p_expected_version or (not exists(select 1 from public.reinforcement_examples where request_id=p_request_id and status='ready') and not exists(select 1 from public.reinforcement_visuals where request_id=p_request_id and status='ready') and not exists(select 1 from public.reinforcement_generations where request_id=p_request_id and status='ready' and v_request.recommended_type='explanation')) then
    raise exception using errcode='PT409',message='Current generated version required'; end if;
  select * into v_version from public.reinforcement_review_versions where request_id=p_request_id and version=v_head.current_version;
  perform set_config('pdf_interactivo.owner_review',p_request_id::text,true);
  if p_action='edit' then
    if v_head.decision='discarded' or v_request.status not in ('generated','approved') or v_request.stage not in ('review','approved') then
      raise exception using errcode='PT409',message='Draft no longer editable'; end if;
    if (char_length(btrim(p_title)) between 3 and 160 and char_length(btrim(p_text)) between 80 and 6000) is not true then
      raise exception using errcode='23514',message='Review title and text'; end if;
    if v_head.current_version>=100 then raise exception using errcode='P0001',message='Review version limit'; end if;
    if v_version.title=btrim(p_title) and v_version.text=btrim(p_text) then return to_jsonb(v_head); end if;
    insert into public.reinforcement_review_versions(request_id,version,origin,title,text,actor_id,visual_content,generated_content)
      values(p_request_id,v_head.current_version+1,'owner',btrim(p_title),btrim(p_text),auth.uid(),v_version.visual_content,case when v_version.generated_content is null then null else v_version.generated_content||jsonb_build_object('title',btrim(p_title),'text',btrim(p_text)) end) returning * into v_version;
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
    if v_version.visual_content is not null then select mode into v_mode from public.reinforcement_visuals where request_id=p_request_id; v_kind:='visual';
    elsif v_request.recommended_type='explanation' then select detail_level into v_mode from public.reinforcement_generations where request_id=p_request_id; v_kind:='explanation';
    else select mode into v_mode from public.reinforcement_examples where request_id=p_request_id; v_kind:='example'; end if;
    insert into public.reinforcements(document_id,page_number,title,content,source_request_id,approved_version_id)
      values(v_request.document_id,v_request.page_number,v_version.title,jsonb_build_object('type',v_kind,'mode',v_mode,'visual',v_version.visual_content,'text',v_version.text,
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
revoke all on function private.review_owned_reinforcement(uuid,uuid,integer,text,text,text,uuid) from public,anon;
grant execute on function private.review_owned_reinforcement(uuid,uuid,integer,text,text,text,uuid) to authenticated;
create or replace function public.review_reinforcement_draft(p_request_id uuid,p_document_id uuid,p_expected_version integer,p_action text,
  p_title text,p_text text,p_operation_id uuid) returns jsonb language sql security invoker set search_path='' as $$
  select private.review_owned_reinforcement(p_request_id,p_document_id,p_expected_version,p_action,p_title,p_text,p_operation_id);
$$;
revoke all on function public.review_reinforcement_draft(uuid,uuid,integer,text,text,text,uuid) from public,anon;
grant execute on function public.review_reinforcement_draft(uuid,uuid,integer,text,text,text,uuid) to authenticated;


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
    insert into public.reinforcement_review_versions(request_id,version,origin,title,text,actor_id,summary_content,generated_content)
      values(p_request_id,v_head.current_version+1,'owner',btrim(p_title),btrim(p_text),auth.uid(),v_version.summary_content||jsonb_build_object('title',btrim(p_title),'text',btrim(p_text),'concepts',v_concepts),case when v_version.generated_content is null then null else v_version.generated_content||jsonb_build_object('title',btrim(p_title),'text',btrim(p_text),'concepts',v_concepts) end) returning * into v_version;
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


notify pgrst,'reload schema';
commit;
