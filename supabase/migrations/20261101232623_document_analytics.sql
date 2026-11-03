-- HU041: derive aggregates under caller RLS; do not persist copies of reader data.
create index reader_opens_period_idx on public.reader_reinforcement_opens(project_id,document_id,occurred_at);
create index quiz_reader_period_idx on public.quiz_reader_attempts(publication_id,created_at);

create function public.get_document_analytics(p_project_id uuid,p_document_id uuid,p_from date,p_to date,p_through timestamptz default statement_timestamp()) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_owner uuid:=auth.uid(); v_project record; v_start timestamptz; v_end timestamptz;
begin
 if v_owner is null or not private.can_manage_own_documents() then raise exception using errcode='42501',message='Active owner required'; end if;
 if p_from is null or p_to is null or p_from>p_to or p_through is null or p_through>statement_timestamp()+interval '1 second' then
  raise exception using errcode='23514',message='Invalid analytics period'; end if;
 select p.id,p.name into v_project from public.projects p join public.documents d on d.id=p.document_id and d.owner_id=p.owner_id
 where p.id=p_project_id and p.document_id=p_document_id and p.owner_id=v_owner and p.status<>'deleting'
  and d.status in ('uploaded','ready') and private.document_is_available(d.id);
 if not found then raise exception using errcode='PT404',message='Document unavailable'; end if;
 v_start:=p_from::timestamp at time zone 'America/Bogota';
 v_end:=(p_to+1)::timestamp at time zone 'America/Bogota';
 return (with
 visits as materialized (select v.id from public.reader_open_visits v where v.project_id=p_project_id and v.document_id=p_document_id and v.owner_id=v_owner
  and v.occurred_at>=v_start and v.occurred_at<v_end and v.occurred_at<=p_through),
 opens as materialized (select o.publication_id,o.reinforcement_id,o.page_number,o.title from public.reader_reinforcement_opens o join public.reader_open_visits v on v.id=o.visit_id
  and v.document_id=p_document_id and v.project_id=p_project_id and v.owner_id=v_owner
  where o.project_id=p_project_id and o.document_id=p_document_id and o.owner_id=v_owner and o.occurred_at>=v_start and o.occurred_at<v_end and o.occurred_at<=p_through),
 opinions as materialized (select f.publication_id,f.reinforcement_id,f.page_number,f.title,f.rating from public.reader_reinforcement_feedback f where f.project_id=p_project_id and f.document_id=p_document_id and f.owner_id=v_owner
  and f.created_at>=v_start and f.created_at<v_end and f.created_at<=p_through),
 pubs as materialized (select p.id,p.version,p.snapshot,p.snapshot_hash from public.experience_publications p where p.project_id=p_project_id and p.document_id=p_document_id
  and p.owner_id=v_owner and p.published_at is not null and p.published_at<=p_through),
 attempts as materialized (select a.id,a.publication_id,a.quiz_version_id,a.publication_hash,a.score,a.total from public.quiz_reader_attempts a join pubs p on p.id=a.publication_id where a.owner_id=v_owner
  and a.created_at>=v_start and a.created_at<v_end and a.created_at<=p_through),
 quiz_catalog as (select p.id publication_id,p.version publication_version,p.snapshot_hash,(i->>'pageNumber')::integer page_number,i->'quiz' quiz
  from pubs p cross join lateral jsonb_array_elements(p.snapshot->'items') i where i->'quiz'<>'null'::jsonb),
 valid_attempts as materialized (select a.id,a.score,a.total,q.* from attempts a join quiz_catalog q on q.publication_id=a.publication_id and q.quiz->>'id'=a.quiz_version_id::text
  and q.snapshot_hash=a.publication_hash and a.total=jsonb_array_length(q.quiz->'content'->'questions')),
 quiz_groups as (select publication_id,publication_version,page_number,quiz->>'id' quiz_id,(quiz->>'version')::integer quiz_version,quiz->'content'->>'title' title,
  count(*) attempts,sum(score) correct,sum(total) questions,round(100.0*sum(score)/nullif(sum(total),0),2) accuracy
  from valid_attempts group by publication_id,publication_version,page_number,quiz->>'id',quiz->>'version',quiz->'content'->>'title'),
 ref_metrics as (
  select o.publication_id,o.reinforcement_id,o.page_number,max(o.title) title,count(*) opens,0::bigint useful,0::bigint unclear from opens o group by o.publication_id,o.reinforcement_id,o.page_number
  union all select f.publication_id,f.reinforcement_id,f.page_number,max(f.title),0::bigint,count(*) filter(where rating='useful'),count(*) filter(where rating='unclear')
  from opinions f group by f.publication_id,f.reinforcement_id,f.page_number),
 ref_groups as (select r.publication_id,r.reinforcement_id,r.page_number,max(r.title) title,sum(r.opens) opens,sum(r.useful) useful,sum(r.unclear) unclear,p.version publication_version
  from ref_metrics r left join pubs p on p.id=r.publication_id group by r.publication_id,r.reinforcement_id,r.page_number,p.version)
 select jsonb_build_object('document',jsonb_build_object('id',p_document_id,'projectId',p_project_id,'name',v_project.name),'from',p_from,'to',p_to,'timeZone','America/Bogota','through',p_through,
  'totals',jsonb_build_object('visits',(select count(*) from visits),'opens',(select count(*) from opens),'quizAttempts',(select count(*) from valid_attempts),
   'correctAnswers',coalesce((select sum(score) from valid_attempts),0),'answeredQuestions',coalesce((select sum(total) from valid_attempts),0),
   'accuracy',(select round(100.0*sum(score)/nullif(sum(total),0),2) from valid_attempts),
   'feedback',(select count(*) from opinions),'useful',(select count(*) from opinions where rating='useful'),'unclear',(select count(*) from opinions where rating='unclear'),
   'excludedQuizAttempts',(select count(*) from attempts)-(select count(*) from valid_attempts)),
  'reinforcements',coalesce((select jsonb_agg(jsonb_build_object('id',reinforcement_id,'title',title,'pageNumber',page_number,'publicationVersion',publication_version,
   'opens',opens,'useful',useful,'unclear',unclear) order by page_number,publication_version,title,reinforcement_id) from ref_groups),'[]'::jsonb),
  'quizzes',coalesce((select jsonb_agg(jsonb_build_object('id',quiz_id,'title',title,'pageNumber',page_number,'publicationVersion',publication_version,'quizVersion',quiz_version,
   'attempts',attempts,'correct',correct,'questions',questions,'accuracy',accuracy) order by page_number,publication_version,quiz_version,quiz_id) from quiz_groups),'[]'::jsonb)));
end;$$;
revoke all on function public.get_document_analytics(uuid,uuid,date,date,timestamptz) from public,anon,service_role;
grant execute on function public.get_document_analytics(uuid,uuid,date,date,timestamptz) to authenticated;
