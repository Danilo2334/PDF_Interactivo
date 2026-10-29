begin;
set local lock_timeout='5s';
-- Owner exercises are physically separate from reader results consumed by analytics.
do $$declare tab text;begin
 foreach tab in array array['quiz_reader_attempts','quiz_practice_attempts'] loop
  execute format('create table public.%I (
   id uuid primary key, publication_id uuid not null references public.experience_publications(id) on delete cascade,
   quiz_version_id uuid not null references public.reinforcement_quiz_versions(id) on delete cascade,
   owner_id uuid not null references auth.users(id) on delete cascade, reader_id uuid not null,
   publication_hash text not null check(publication_hash ~ ''^[a-f0-9]{64}$''),
   attempt_number integer not null check(attempt_number>0), answers jsonb not null check(jsonb_typeof(answers)=''array'' and jsonb_array_length(answers) between 1 and 3),
   score integer not null, total integer not null check(total between 1 and 3), feedback jsonb not null,
   input_hash text not null check(input_hash ~ ''^[a-f0-9]{64}$''), created_at timestamptz not null default clock_timestamp(),
   check(score between 0 and total), check(jsonb_typeof(feedback)=''object'' and octet_length(feedback::text)<=10000),
   unique(publication_id,quiz_version_id,reader_id,attempt_number))',tab);
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from public,anon,authenticated,service_role',tab);
  execute format('grant select on public.%I to authenticated',tab);
  execute format('create policy "Active owners read their quiz records" on public.%I for select to authenticated using(owner_id=(select auth.uid()) and (select private.can_manage_own_documents()))',tab);
  execute format('create index %I on public.%I(owner_id)',tab||'_owner_idx',tab);
  execute format('create index %I on public.%I(quiz_version_id)',tab||'_quiz_idx',tab);
  execute format('create index %I on public.%I(publication_id,reader_id,created_at desc)',tab||'_reader_date_idx',tab);
 end loop;
end;$$;
grant select on public.quiz_reader_attempts to service_role;

create function private.quiz_attempt_receipt(p jsonb,p_practice boolean) returns jsonb
language sql immutable security invoker set search_path='' as $$select case when p is null then null else
 jsonb_build_object('attemptId',p->'id','number',p->'attempt_number','createdAt',p->'created_at',
 'answers',p->'answers','feedback',p->'feedback','privateTest',p_practice) end;$$;
revoke all on function private.quiz_attempt_receipt(jsonb,boolean) from public,anon,authenticated,service_role;

create function private.change_verified_quiz_attempt(p_payload text,p_signature text,p_practice boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb; secret text; exp bigint; u uuid:=auth.uid(); pub public.experience_publications%rowtype;
 project public.projects%rowtype; doc public.documents%rowtype; reader uuid; quiz_id uuid; op uuid; action text; tab text;
 item jsonb; quiz jsonb; q jsonb; answers jsonb; answer integer; correct_index integer; n integer; total integer; score integer:=0;
 question_feedback jsonb:='[]'::jsonb; feedback jsonb; previous jsonb; input_hash text; recent integer;
begin
 if p_payload is null or octet_length(p_payload)>4500 or coalesce(p_signature,'') !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='42501',message='Invalid quiz attempt proof';end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then
  raise exception using errcode='42501',message='Invalid quiz attempt proof';end if;
 p:=p_payload::jsonb;exp:=(p->>'expiresAt')::bigint;reader:=(p->>'readerId')::uuid;quiz_id:=(p->>'quizVersionId')::uuid;action:=p->>'action';
 if p->>'operation' is distinct from 'quiz-attempt' or (p->>'privateTest')::boolean is distinct from p_practice
  or exp is null or exp<extract(epoch from clock_timestamp()) or exp>extract(epoch from clock_timestamp())+310
  or reader is null or quiz_id is null or action is null or action not in ('status','submit') then
  raise exception using errcode='42501',message='Expired or foreign quiz attempt proof';end if;
 if p_practice then
  if u is null or not private.can_manage_own_documents() or (p->>'userId')::uuid is distinct from u or reader<>u then
   raise exception using errcode='42501',message='Owner exercise permission required';end if;
 elsif current_setting('role',true)<>'service_role' then
  raise exception using errcode='42501',message='Reader attempts require the server role';
 end if;
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if not found or pub.snapshot_hash is distinct from p->>'publicationHash' then raise exception using errcode='PT404',message='Publication not available';end if;
 select * into project from public.projects where id=pub.project_id for share;
 if not found or project.owner_id<>pub.owner_id or project.document_id<>pub.document_id or project.status='deleting'
   or p_practice and pub.owner_id<>u then raise exception using errcode='PT404',message='Publication not authorized';end if;
 -- A publisher/replacement holding the project lock may have changed visibility
 -- while this transaction waited. Re-read after acquiring that lock.
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if not found or pub.snapshot_hash is distinct from p->>'publicationHash' then raise exception using errcode='PT404',message='Publication changed';end if;
 if not exists(select 1 from public.profiles where id=pub.owner_id and is_active and role in ('owner','admin')) then
  raise exception using errcode='PT404',message='Publication not available';end if;
 select * into doc from public.documents where id=pub.document_id and owner_id=pub.owner_id;
 if not found or doc.status not in ('uploaded','ready') or not private.document_is_available(doc.id)
  or doc.storage_path is distinct from pub.snapshot->'document'->>'storagePath'
  or doc.size_bytes is distinct from (pub.snapshot->'document'->>'sizeBytes')::bigint then
  raise exception using errcode='PT404',message='Document changed';end if;
 if not p_practice then
  if pub.published_at is null or pub.token is null or pub.token is distinct from p->>'publicationToken'
   or pub.origin is distinct from p->>'origin' or exists(select 1 from public.experience_publications newer
     where newer.project_id=pub.project_id and newer.published_at is not null and newer.version>pub.version) then
   raise exception using errcode='PT404',message='Current published version required';end if;
 end if;
 if coalesce((pub.snapshot->>'requireIdentification')::boolean,false) and (p->>'identified') is distinct from 'true' then
  raise exception using errcode='42501',message='Reader identification required';end if;
 select i into item from jsonb_array_elements(pub.snapshot->'items') i where i->'quiz'->>'id'=quiz_id::text;
 if item is null or not exists(select 1 from public.reinforcement_quiz_versions v where v.id=quiz_id
    and v.source_version_id=(item->>'sourceVersionId')::uuid and v.request_id=(item->>'requestId')::uuid) then
  raise exception using errcode='PT404',message='Approved quiz not in this publication';end if;
 quiz:=item->'quiz'->'content';
 if jsonb_typeof(quiz->'questions') is distinct from 'array' or jsonb_array_length(quiz->'questions') not between 1 and 3
   or jsonb_typeof(quiz->'allowRetries') is distinct from 'boolean' then raise exception using errcode='23514',message='Invalid published quiz';end if;
 tab:=case when p_practice then 'quiz_practice_attempts' else 'quiz_reader_attempts' end;
 perform pg_advisory_xact_lock(hashtextextended('quiz-attempt:'||tab||':'||pub.id::text||':'||reader::text,0));
 execute format('select count(*)::integer from public.%I where publication_id=$1 and quiz_version_id=$2 and reader_id=$3',tab) into n using pub.id,quiz_id,reader;
 if action='status' then
  execute format('select to_jsonb(a) from public.%I a where publication_id=$1 and quiz_version_id=$2 and reader_id=$3 order by attempt_number desc limit 1',tab)
   into previous using pub.id,quiz_id,reader;
  return jsonb_build_object('latest',private.quiz_attempt_receipt(previous,p_practice),'attempts',n,'allowRetries',quiz->'allowRetries');
 end if;
 op:=(p->>'operationId')::uuid;answers:=p->'answers';total:=jsonb_array_length(quiz->'questions');
 if op is null or jsonb_typeof(answers) is distinct from 'array' or jsonb_array_length(answers)<>total then
  raise exception using errcode='23514',message='Answer every published question';end if;
 for idx in 0..total-1 loop
  q:=quiz->'questions'->idx;
  if jsonb_typeof(answers->idx) is distinct from 'number' or coalesce(answers->>idx,'') !~ '^[0-4]$'
   or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') not between 2 and 5
   or coalesce(q->>'correctIndex','') !~ '^[0-4]$' then raise exception using errcode='23514',message='Invalid published answer';end if;
  answer:=(answers->>idx)::integer;correct_index:=(q->>'correctIndex')::integer;
  if answer>=jsonb_array_length(q->'options') or correct_index>=jsonb_array_length(q->'options') then
   raise exception using errcode='23514',message='Answer outside the published options';end if;
  if answer=correct_index then score:=score+1;end if;
  question_feedback:=question_feedback||jsonb_build_array(jsonb_build_object('correct',answer=correct_index,
    'explanation',q->>'explanation','correctOption',q->'options'->correct_index));
 end loop;
 feedback:=jsonb_build_object('score',score,'total',total,'questions',question_feedback);
 input_hash:=encode(extensions.digest(jsonb_build_object('publication',pub.id,'hash',pub.snapshot_hash,'quiz',quiz_id,'reader',reader,'answers',answers)::text,'sha256'),'hex');
 execute format('select to_jsonb(a) from public.%I a where id=$1',tab) into previous using op;
 if previous is not null then
  if previous->>'input_hash' is distinct from input_hash then raise exception using errcode='PT409',message='Attempt operation already used';end if;
  return private.quiz_attempt_receipt(previous,p_practice);
 end if;
 if n>0 and quiz->>'allowRetries'='false' then raise exception using errcode='PT409',message='This quiz does not allow retries';end if;
 execute format('select count(*)::integer from public.%I where publication_id=$1 and reader_id=$2 and created_at>clock_timestamp()-interval ''5 minutes''',tab) into recent using pub.id,reader;
 if recent>=30 then raise exception using errcode='PT429',message='Wait before another quiz attempt';end if;
 begin
  execute format('insert into public.%I(id,publication_id,quiz_version_id,owner_id,reader_id,publication_hash,attempt_number,answers,score,total,feedback,input_hash)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning to_jsonb(%I.*)',tab,tab)
   into previous using op,pub.id,quiz_id,pub.owner_id,reader,pub.snapshot_hash,n+1,answers,score,total,feedback,input_hash;
 exception when unique_violation then raise exception using errcode='PT409',message='Attempt operation already used';end;
 return private.quiz_attempt_receipt(previous,p_practice);
end;$$;
revoke all on function private.change_verified_quiz_attempt(text,text,boolean) from public,anon;
grant execute on function private.change_verified_quiz_attempt(text,text,boolean) to authenticated,service_role;
create function public.change_quiz_practice(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_verified_quiz_attempt(p_payload,p_signature,true);$$;
revoke all on function public.change_quiz_practice(text,text) from public,anon,service_role;
grant execute on function public.change_quiz_practice(text,text) to authenticated;
grant usage on schema private to service_role;
create function public.change_quiz_reader_attempt(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_verified_quiz_attempt(p_payload,p_signature,false);$$;
revoke all on function public.change_quiz_reader_attempt(text,text) from public,anon,authenticated;
grant execute on function public.change_quiz_reader_attempt(text,text) to service_role;
commit;
