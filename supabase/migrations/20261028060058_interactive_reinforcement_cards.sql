begin;
set local lock_timeout='5s';
-- Presentation references the approved title/content and immutable source selection;
-- it never creates an unreviewed copy of educational content.
create table public.reinforcement_cards (
 reinforcement_id uuid primary key references public.reinforcements(id) on delete cascade,
 approved_version_id uuid not null references public.reinforcement_review_versions(id) on delete cascade,
 initial_expanded boolean not null,
 version integer not null check(version between 1 and 1000000),
 operation_id uuid not null,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default clock_timestamp()
);
create index reinforcement_cards_approved_version_idx on public.reinforcement_cards(approved_version_id);
create index reinforcement_cards_updated_by_idx on public.reinforcement_cards(updated_by);
alter table public.reinforcement_cards enable row level security;
revoke all on public.reinforcement_cards from public,anon,authenticated;
grant select on public.reinforcement_cards to authenticated;
create policy "Owners read card presentation" on public.reinforcement_cards for select to authenticated
 using(exists(select 1 from public.reinforcements f join public.reinforcement_requests r on r.id=f.source_request_id
   where f.id=reinforcement_id and r.owner_id=(select auth.uid())));

create function private.save_reinforcement_card(p_request_id uuid,p_document_id uuid,p_reinforcement_id uuid,
 p_approved_version_id uuid,p_expected_version integer,p_initial_expanded boolean,p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.reinforcement_requests%rowtype; f public.reinforcements%rowtype; c public.reinforcement_cards%rowtype;
begin
 r:=private.lock_current_recommendation_request(p_request_id,p_document_id);
 if p_operation_id is null or p_initial_expanded is null or p_expected_version is null or p_expected_version<0 then
  raise exception using errcode='23514',message='Valid card presentation required'; end if;
 select * into f from public.reinforcements where id=p_reinforcement_id and source_request_id=r.id
   and document_id=r.document_id and page_number=r.page_number for update;
 if not found then raise exception using errcode='42501',message='Approved reinforcement unavailable'; end if;
 if f.approved_version_id is distinct from p_approved_version_id or f.approved_version_id is null
   or not exists(select 1 from public.reinforcement_review_heads where request_id=r.id and approved_version_id=f.approved_version_id) then
  raise exception using errcode='PT409',message='Approved content changed'; end if;
 if char_length(btrim(f.title))=0 or jsonb_typeof(f.content) is distinct from 'object'
   or char_length(btrim(coalesce(f.content->>'text','')))=0 then
  raise exception using errcode='23514',message='Title and content required'; end if;
 select * into c from public.reinforcement_cards where reinforcement_id=f.id for update;
 if found and c.operation_id=p_operation_id then
  if c.approved_version_id=p_approved_version_id and c.initial_expanded=p_initial_expanded and c.version=p_expected_version+1 then
   return to_jsonb(c); end if;
  raise exception using errcode='PT409',message='Operation already used'; end if;
 if coalesce(c.version,0)<>p_expected_version then raise exception using errcode='PT409',message='Card changed in another tab'; end if;
 insert into public.reinforcement_cards(reinforcement_id,approved_version_id,initial_expanded,version,operation_id,updated_by)
 values(f.id,f.approved_version_id,p_initial_expanded,p_expected_version+1,p_operation_id,auth.uid())
 on conflict(reinforcement_id) do update set approved_version_id=excluded.approved_version_id,
 initial_expanded=excluded.initial_expanded,version=excluded.version,operation_id=excluded.operation_id,
 updated_by=excluded.updated_by,updated_at=clock_timestamp() returning * into c;
 return to_jsonb(c);
end; $$;
revoke all on function private.save_reinforcement_card(uuid,uuid,uuid,uuid,integer,boolean,uuid) from public,anon;
grant execute on function private.save_reinforcement_card(uuid,uuid,uuid,uuid,integer,boolean,uuid) to authenticated;
create function public.save_reinforcement_card(p_request_id uuid,p_document_id uuid,p_reinforcement_id uuid,
 p_approved_version_id uuid,p_expected_version integer,p_initial_expanded boolean,p_operation_id uuid) returns jsonb
language sql security invoker set search_path='' as $$
 select private.save_reinforcement_card(p_request_id,p_document_id,p_reinforcement_id,p_approved_version_id,p_expected_version,p_initial_expanded,p_operation_id);
$$;
revoke all on function public.save_reinforcement_card(uuid,uuid,uuid,uuid,integer,boolean,uuid) from public,anon;
grant execute on function public.save_reinforcement_card(uuid,uuid,uuid,uuid,integer,boolean,uuid) to authenticated;
commit;
