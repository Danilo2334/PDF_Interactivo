begin;
set local lock_timeout='5s';
-- Independent review heads keep the optional quiz from gating the reinforcement.
create table public.reinforcement_quiz_versions (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
 version integer not null check(version between 1 and 99), source_version_id uuid not null references public.reinforcement_review_versions(id) on delete cascade,
 source jsonb not null check(jsonb_typeof(source)='object' and octet_length(source::text)<=18000),
 content jsonb not null check(jsonb_typeof(content)='object' and octet_length(content::text)<=20000),
 origin text not null check(origin in ('ai','owner')), actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp(), model text check(model is null or char_length(model) between 1 and 100),
 unique(request_id,version)
);
create table public.reinforcement_quiz_heads (
 request_id uuid primary key references public.reinforcement_requests(id) on delete cascade,
 choice text not null default 'undecided' check(choice in ('undecided','generate','omit')), choice_version integer not null default 0 check(choice_version>=0),
 target_source_version_id uuid references public.reinforcement_review_versions(id) on delete cascade,
 current_version integer not null default 0 check(current_version between 0 and 99), decision text not null default 'pending' check(decision in ('pending','approved','discarded')),
 approved_version_id uuid references public.reinforcement_quiz_versions(id) on delete set null,
 approved_by uuid references auth.users(id), approved_at timestamptz, updated_at timestamptz not null default clock_timestamp()
);
create table public.reinforcement_quiz_events (
 operation_id uuid primary key, request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
 version integer not null check(version between 0 and 99), action text not null check(action in ('choose_generate','choose_omit','edit','approve','discard','regenerate')),
 actor_id uuid not null references auth.users(id), occurred_at timestamptz not null default clock_timestamp(),
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'), receipt jsonb not null
);
create table public.reinforcement_quiz_jobs (
 operation_id uuid primary key, request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
 source_version_id uuid not null references public.reinforcement_review_versions(id) on delete cascade,
 source jsonb not null, actor_id uuid not null references auth.users(id), expected_version integer not null check(expected_version between 0 and 98),
 choice_version integer not null, question_count integer not null check(question_count between 1 and 3), input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 status text not null check(status in ('processing','ready','error')), started_at timestamptz not null default clock_timestamp(),
 lease_expires_at timestamptz not null default clock_timestamp()+interval '120 seconds', finished_at timestamptz,
 result_version integer, model text, error_code text check(error_code in ('provider_unavailable','provider_refused','invalid_quiz','insufficient_quiz','timeout','source_changed')),
 check((status='processing' and finished_at is null and result_version is null and model is null and error_code is null)
  or(status='ready' and finished_at is not null and result_version=expected_version+1 and model is not null and error_code is null)
  or(status='error' and finished_at is not null and result_version is null and model is null and error_code is not null))
);
create index reinforcement_quiz_versions_source_idx on public.reinforcement_quiz_versions(source_version_id);
create index reinforcement_quiz_versions_actor_idx on public.reinforcement_quiz_versions(actor_id);
create index reinforcement_quiz_heads_target_idx on public.reinforcement_quiz_heads(target_source_version_id);
create index reinforcement_quiz_heads_approved_idx on public.reinforcement_quiz_heads(approved_version_id);
create index reinforcement_quiz_heads_actor_idx on public.reinforcement_quiz_heads(approved_by);
create index reinforcement_quiz_events_request_date_idx on public.reinforcement_quiz_events(request_id,occurred_at desc);
create index reinforcement_quiz_events_actor_idx on public.reinforcement_quiz_events(actor_id);
create index reinforcement_quiz_jobs_request_date_idx on public.reinforcement_quiz_jobs(request_id,started_at desc);
create index reinforcement_quiz_jobs_actor_date_idx on public.reinforcement_quiz_jobs(actor_id,started_at desc);
create index reinforcement_quiz_jobs_source_idx on public.reinforcement_quiz_jobs(source_version_id);
do $$declare tab text;begin
 foreach tab in array array['reinforcement_quiz_versions','reinforcement_quiz_heads','reinforcement_quiz_events','reinforcement_quiz_jobs'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('create policy "Active owners read private quiz data" on public.%I for select to authenticated using((select private.can_manage_own_documents()) and exists(select 1 from public.reinforcement_requests r where r.id=request_id and r.owner_id=(select auth.uid())))',tab);
 end loop;
end;$$;

create function private.reinforcement_quiz_source(p_request_id uuid,p_document_id uuid,p_source_version_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.reinforcement_requests%rowtype; v public.reinforcement_review_versions%rowtype; concepts jsonb; result jsonb;
begin
 r:=private.lock_current_recommendation_request(p_request_id,p_document_id);
 select rv.* into v from public.reinforcement_review_versions rv join public.reinforcement_review_heads h on h.request_id=rv.request_id
  where rv.request_id=r.id and rv.id=p_source_version_id and ((rv.version=h.current_version and h.decision<>'discarded') or rv.id=h.approved_version_id);
 if not found then raise exception using errcode='PT409',message='Current or approved reinforcement version required'; end if;
 select coalesce(jsonb_agg(c.concept),'[]'::jsonb) into concepts from (
  select q.concept from public.reinforcement_analyses a cross join lateral jsonb_array_elements_text(
   case when jsonb_typeof(a.diagnosis->'concepts')='array' then a.diagnosis->'concepts' else '[]'::jsonb end) with ordinality q(concept,n)
  where a.request_id=r.id and char_length(q.concept) between 1 and 200 and strpos(lower(v.text),lower(q.concept))>0 order by q.n limit 8
 ) c;
 result:=jsonb_build_object('versionId',v.id,'requestId',r.id,'documentId',r.document_id,'pageNumber',r.page_number,'title',v.title,'text',v.text,'concepts',concepts);
 return result||jsonb_build_object('hash',encode(extensions.digest(result::text,'sha256'),'hex'));
end;$$;
revoke all on function private.reinforcement_quiz_source(uuid,uuid,uuid) from public,anon;
grant execute on function private.reinforcement_quiz_source(uuid,uuid,uuid) to authenticated;
create function public.get_reinforcement_quiz_source(p_request_id uuid,p_document_id uuid,p_source_version_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.reinforcement_quiz_source(p_request_id,p_document_id,p_source_version_id);$$;
revoke all on function public.get_reinforcement_quiz_source(uuid,uuid,uuid) from public,anon;
grant execute on function public.get_reinforcement_quiz_source(uuid,uuid,uuid) to authenticated;

create function private.validate_reinforcement_quiz(p_content jsonb,p_source jsonb,p_count integer default null) returns void
language plpgsql security invoker set search_path='' as $$
declare q jsonb; option_count integer; n integer;
begin
 if p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>20000
  or jsonb_typeof(p_content->'title') is distinct from 'string' or char_length(btrim(p_content->>'title')) not between 3 and 160
  or jsonb_typeof(p_content->'allowRetries') is distinct from 'boolean' or jsonb_typeof(p_content->'questions') is distinct from 'array' then
  raise exception using errcode='23514',message='Invalid private quiz content'; end if;
 n:=jsonb_array_length(p_content->'questions');
 if n not between 1 and 3 or p_count is not null and n<>p_count then raise exception using errcode='23514',message='One to three questions required'; end if;
 if (select count(distinct lower(regexp_replace(btrim(x->>'prompt'),'\s+',' ','g'))) from jsonb_array_elements(p_content->'questions') x)<>n then
  raise exception using errcode='23514',message='Questions must be distinct'; end if;
 for q in select * from jsonb_array_elements(p_content->'questions') loop
  if jsonb_typeof(q)<>'object' or jsonb_typeof(q->'prompt') is distinct from 'string' or char_length(btrim(q->>'prompt')) not between 8 and 400
   or jsonb_typeof(q->'explanation') is distinct from 'string' or char_length(btrim(q->>'explanation')) not between 20 and 1000
   or jsonb_typeof(q->'sourceQuote') is distinct from 'string' or char_length(btrim(q->>'sourceQuote')) not between 8 and 500
   or strpos(p_source->>'text',q->>'sourceQuote')=0 or jsonb_typeof(q->'options') is distinct from 'array' then
   raise exception using errcode='23514',message='Question must cite its own reinforcement'; end if;
  option_count:=jsonb_array_length(q->'options');
  if option_count not between 2 and 5 or jsonb_typeof(q->'correctIndex') is distinct from 'number'
    or (q->>'correctIndex') !~ '^[0-4]$' or (q->>'correctIndex')::integer>=option_count then
   raise exception using errcode='23514',message='Exactly one valid answer required'; end if;
  if exists(select 1 from jsonb_array_elements(q->'options') o where jsonb_typeof(o)<>'string' or char_length(btrim(o#>>'{}')) not between 1 and 300)
    or (select count(distinct lower(regexp_replace(btrim(o#>>'{}'),'\s+',' ','g'))) from jsonb_array_elements(q->'options') o)<>option_count then
   raise exception using errcode='23514',message='Distinct non-empty answer options required'; end if;
 end loop;
end;$$;
revoke all on function private.validate_reinforcement_quiz(jsonb,jsonb,integer) from public,anon,authenticated;

create function private.change_verified_quiz(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); secret text; p jsonb; exp bigint; op uuid; action text; source_id uuid; source jsonb; input_hash text;
 r public.reinforcement_requests%rowtype; h public.reinforcement_quiz_heads%rowtype; j public.reinforcement_quiz_jobs%rowtype;
 v public.reinforcement_quiz_versions%rowtype; e public.reinforcement_quiz_events%rowtype; expected integer; next_version integer; next_content jsonb;
begin
 if u is null or not private.can_manage_own_documents() or p_payload is null or octet_length(p_payload)>50000
   or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then raise exception using errcode='42501',message='Invalid quiz proof'; end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then raise exception using errcode='42501',message='Invalid quiz proof'; end if;
 p:=p_payload::jsonb;exp:=(p->>'expiresAt')::bigint;op:=(p->>'operationId')::uuid;action:=p->>'action';source_id:=(p->>'sourceVersionId')::uuid;input_hash:=p->>'inputHash';
 if p->>'operation' is distinct from 'reinforcement-quiz' or (p->>'userId')::uuid is distinct from u or exp is null
   or exp<extract(epoch from clock_timestamp()) or exp>extract(epoch from clock_timestamp())+310 or op is null or source_id is null
   or coalesce(input_hash,'') !~ '^[a-f0-9]{64}$' or action is null or action not in ('choose','start','finish','edit','approve','discard') then
  raise exception using errcode='42501',message='Expired or foreign quiz proof'; end if;
 perform pg_advisory_xact_lock(hashtextextended('reinforcement-quiz:'||u::text,0));
 r:=private.lock_current_recommendation_request((p->>'requestId')::uuid,(p->>'documentId')::uuid);
 select * into h from public.reinforcement_quiz_heads where request_id=r.id for update;
 if h.request_id is null then
  if action<>'choose' then raise exception using errcode='PT409',message='Choose whether to create a quiz first'; end if;
  insert into public.reinforcement_quiz_heads(request_id) values(r.id) returning * into h;
 end if;
 if action in ('choose','edit','approve','discard') then
  select * into e from public.reinforcement_quiz_events where operation_id=op;
  if found then
   if e.request_id<>r.id or e.actor_id<>u or e.input_hash<>input_hash then raise exception using errcode='PT409',message='Quiz operation already used'; end if;
   return jsonb_build_object('head',e.receipt);
  end if;
  if exists(select 1 from public.reinforcement_quiz_jobs where operation_id=op) then raise exception using errcode='PT409',message='Generation operation already used'; end if;
  if exists(select 1 from public.reinforcement_quiz_jobs where request_id=r.id and status='processing' and lease_expires_at>clock_timestamp()) then
   raise exception using errcode='PT409',message='Quiz generation in progress'; end if;
 end if;
 if action<>'finish' then source:=private.reinforcement_quiz_source(r.id,r.document_id,source_id); end if;
 if action='choose' then
  if p->>'choice' is null or p->>'choice' not in ('generate','omit') or (p->>'choiceVersion')::integer is distinct from h.choice_version then
   raise exception using errcode='PT409',message='Quiz choice changed'; end if;
  update public.reinforcement_quiz_heads set choice=p->>'choice',choice_version=choice_version+1,target_source_version_id=source_id,updated_at=clock_timestamp()
   where request_id=r.id returning * into h;
  insert into public.reinforcement_quiz_events(operation_id,request_id,version,action,actor_id,input_hash,receipt)
   values(op,r.id,h.current_version,'choose_'||(p->>'choice'),u,input_hash,to_jsonb(h));
  return jsonb_build_object('head',to_jsonb(h));
 end if;
 if action='start' then
  select * into j from public.reinforcement_quiz_jobs where operation_id=op;
  if found then
   if j.request_id<>r.id or j.actor_id<>u or j.input_hash<>input_hash then raise exception using errcode='PT409',message='Generation operation changed'; end if;
   if j.status='processing' and j.lease_expires_at<=clock_timestamp() then raise exception using errcode='PT409',message='Expired operation; refresh before retrying'; end if;
   return jsonb_build_object('disposition',case when j.status='processing' then 'busy' else 'cached' end,'job',to_jsonb(j));
  end if;
  if exists(select 1 from public.reinforcement_quiz_events where operation_id=op) then raise exception using errcode='PT409',message='Review operation already used'; end if;
  if h.choice<>'generate' or h.target_source_version_id<>source_id or h.choice_version is distinct from (p->>'choiceVersion')::integer
   or h.current_version is distinct from (p->>'expectedVersion')::integer or h.current_version>=99 then raise exception using errcode='PT409',message='Current quiz choice/version required'; end if;
  if exists(select 1 from public.reinforcement_quiz_jobs where request_id=r.id and status='processing' and lease_expires_at>clock_timestamp()) then
   return jsonb_build_object('disposition','busy'); end if;
  if (select count(*) from public.reinforcement_quiz_jobs where actor_id=u and status='processing' and lease_expires_at>clock_timestamp())>=2
   or (select count(*) from public.reinforcement_quiz_jobs where actor_id=u and started_at>clock_timestamp()-interval '5 minutes')>=10 then
   raise exception using errcode='P0001',message='Quiz generation limit reached'; end if;
  insert into public.reinforcement_quiz_jobs(operation_id,request_id,source_version_id,source,actor_id,expected_version,choice_version,question_count,input_hash,status)
   values(op,r.id,source_id,source,u,h.current_version,h.choice_version,(p->>'questionCount')::integer,input_hash,'processing') returning * into j;
  select * into v from public.reinforcement_quiz_versions where request_id=r.id and version=h.current_version and source_version_id=source_id;
  return jsonb_build_object('disposition','started','job',to_jsonb(j),'source',source,'previous',v.content);
 end if;
 if action='finish' then
  select * into j from public.reinforcement_quiz_jobs where operation_id=op and request_id=r.id for update;
  if not found or j.actor_id<>u or j.source_version_id<>source_id or j.input_hash<>input_hash or j.status<>'processing'
   or j.lease_expires_at<=clock_timestamp() or h.current_version<>j.expected_version or h.choice_version<>j.choice_version or h.choice<>'generate' then
   raise exception using errcode='PT409',message='Quiz operation expired or superseded'; end if;
  if p->>'status'='error' then
   update public.reinforcement_quiz_jobs set status='error',finished_at=clock_timestamp(),error_code=p->>'errorCode' where operation_id=op returning * into j;
   return jsonb_build_object('job',to_jsonb(j));
  end if;
  begin source:=private.reinforcement_quiz_source(r.id,r.document_id,source_id);
  exception when sqlstate 'PT409' then
   update public.reinforcement_quiz_jobs set status='error',finished_at=clock_timestamp(),error_code='source_changed' where operation_id=op returning * into j;
   return jsonb_build_object('job',to_jsonb(j));
  end;
  if p->>'status' is distinct from 'ready' or char_length(coalesce(p->>'model','')) not between 1 and 100 then raise exception using errcode='23514',message='Complete quiz result required'; end if;
  perform private.validate_reinforcement_quiz(p->'content',j.source,j.question_count);
  if p->'content'->>'allowRetries'<>'false' then raise exception using errcode='23514',message='Provider cannot choose retries'; end if;
  -- Retry policy is an owner setting, never a decision delegated to the model.
  next_content:=(p->'content')||jsonb_build_object('allowRetries',coalesce(
    (select content->'allowRetries' from public.reinforcement_quiz_versions where request_id=r.id and version=h.current_version),'false'::jsonb));
  next_version:=h.current_version+1;
  insert into public.reinforcement_quiz_versions(request_id,version,source_version_id,source,content,origin,actor_id,model)
   values(r.id,next_version,source_id,j.source,next_content,'ai',u,p->>'model');
  update public.reinforcement_quiz_heads set current_version=next_version,decision='pending',updated_at=clock_timestamp() where request_id=r.id returning * into h;
  update public.reinforcement_quiz_jobs set status='ready',finished_at=clock_timestamp(),result_version=next_version,model=p->>'model' where operation_id=op returning * into j;
  insert into public.reinforcement_quiz_events(operation_id,request_id,version,action,actor_id,input_hash,receipt) values(op,r.id,next_version,'regenerate',u,input_hash,to_jsonb(h));
  return jsonb_build_object('head',to_jsonb(h),'job',to_jsonb(j));
 end if;
 expected:=(p->>'expectedVersion')::integer;
 if h.choice<>'generate' or h.target_source_version_id<>source_id or h.current_version is distinct from expected or expected is null or expected<1 then
  raise exception using errcode='PT409',message='Current private quiz required'; end if;
 select * into v from public.reinforcement_quiz_versions where request_id=r.id and version=h.current_version;
 if not found or v.source_version_id<>source_id then raise exception using errcode='PT409',message='Quiz source changed'; end if;
 if action='edit' then
  if h.current_version>=99 then raise exception using errcode='P0001',message='Quiz version limit reached'; end if;
  perform private.validate_reinforcement_quiz(p->'content',v.source);
  next_version:=h.current_version+1;
  insert into public.reinforcement_quiz_versions(request_id,version,source_version_id,source,content,origin,actor_id)
   values(r.id,next_version,source_id,v.source,p->'content','owner',u);
  update public.reinforcement_quiz_heads set current_version=next_version,decision='pending',updated_at=clock_timestamp() where request_id=r.id returning * into h;
 elsif action='approve' then
  if h.decision<>'pending' or p->>'confirmed' is distinct from 'true' then raise exception using errcode='PT409',message='Explicit review of pending quiz required'; end if;
  perform private.validate_reinforcement_quiz(v.content,v.source);
  update public.reinforcement_quiz_heads set decision='approved',approved_version_id=v.id,approved_by=u,approved_at=clock_timestamp(),updated_at=clock_timestamp() where request_id=r.id returning * into h;
 elsif action='discard' then
  if h.decision<>'pending' then raise exception using errcode='PT409',message='Only pending quiz can be discarded'; end if;
  update public.reinforcement_quiz_heads set decision='discarded',updated_at=clock_timestamp() where request_id=r.id returning * into h;
 end if;
 insert into public.reinforcement_quiz_events(operation_id,request_id,version,action,actor_id,input_hash,receipt) values(op,r.id,h.current_version,action,u,input_hash,to_jsonb(h));
 return jsonb_build_object('head',to_jsonb(h));
end;$$;
revoke all on function private.change_verified_quiz(text,text) from public,anon;
grant execute on function private.change_verified_quiz(text,text) to authenticated;
create function public.change_reinforcement_quiz(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_verified_quiz(p_payload,p_signature);$$;
revoke all on function public.change_reinforcement_quiz(text,text) from public,anon;
grant execute on function public.change_reinforcement_quiz(text,text) to authenticated;
commit;
