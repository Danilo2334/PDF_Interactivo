begin;
set local lock_timeout = '5s';

alter table public.reinforcement_requests
  drop constraint reinforcement_requests_status_check,
  add constraint reinforcement_requests_status_check check (status in ('pending','processing','error','generated','approved')),
  add column stage text not null default 'queued',
  add column updated_at timestamptz not null default now(),
  add column error_message text,
  add column approved_by uuid references auth.users(id),
  add column approved_at timestamptz,
  add constraint reinforcement_request_stage_check check (
    (status='pending' and stage in ('queued','choosing')) or
    (status='processing' and stage in ('analyzing','generating')) or
    (status='error' and stage='failed') or
    (status='generated' and stage='review') or
    (status='approved' and stage='approved')
  ),
  add constraint reinforcement_request_error_check check (
    (status='error' and error_message is not null and char_length(btrim(error_message)) between 1 and 2000) or
    (status<>'error' and error_message is null)
  ),
  add constraint reinforcement_request_approval_check check (
    (status='approved' and approved_by is not null and approved_by=owner_id and approved_at is not null) or
    (status<>'approved' and approved_by is null and approved_at is null)
  );
create index reinforcement_requests_owner_document_status_idx
  on public.reinforcement_requests(owner_id,project_id,document_id,status,created_at desc,id desc);
create index reinforcement_requests_owner_document_date_idx
  on public.reinforcement_requests(owner_id,project_id,document_id,created_at desc,id desc);

create table public.reinforcement_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
  previous_status text check (previous_status in ('pending','processing','error','generated','approved')),
  status text not null check (status in ('pending','processing','error','generated','approved')),
  previous_stage text,
  stage text not null,
  actor_kind text not null check (actor_kind in ('owner','system','migration')),
  actor_id uuid references auth.users(id) on delete set null,
  event_kind text not null check (event_kind in ('created','transition','baseline')),
  occurred_at timestamptz not null default clock_timestamp()
);
create index reinforcement_request_events_request_date_idx on public.reinforcement_request_events(request_id,occurred_at desc,id desc);
create index reinforcement_request_events_actor_idx on public.reinforcement_request_events(actor_id);
create index reinforcement_requests_approver_idx on public.reinforcement_requests(approved_by);
alter table public.reinforcement_request_events enable row level security;
revoke all on public.reinforcement_request_events from public,anon,authenticated;
grant select on public.reinforcement_request_events to authenticated;
create policy "Owners can read events of their available requests"
on public.reinforcement_request_events for select to authenticated using (
  exists (select 1 from public.reinforcement_requests r where r.id=request_id
    and r.owner_id=(select auth.uid()))
);

-- Existing rows predate this journal. Record an honest baseline now, rather than
-- inventing historical transitions or attributing the migration to their owner.
insert into public.reinforcement_request_events(request_id,status,stage,actor_kind,event_kind)
select id,status,stage,'migration','baseline' from public.reinforcement_requests;

create function private.guard_reinforcement_request_state() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    if new.status<>'pending' or new.stage<>'queued' or new.approved_by is not null or new.approved_at is not null then
      raise exception using errcode='23514', message='New requests start pending';
    end if;
    return new;
  end if;
  if row(old.id,old.owner_id,old.project_id,old.document_id,old.page_number,old.verified_page_count,
    old.selection,old.selected_text,old.text_source,old.category,old.need,old.idempotency_key,old.input_hash,old.created_at)
    is distinct from row(new.id,new.owner_id,new.project_id,new.document_id,new.page_number,new.verified_page_count,
    new.selection,new.selected_text,new.text_source,new.category,new.need,new.idempotency_key,new.input_hash,new.created_at)
  then raise exception using errcode='23514', message='Submitted request content is immutable'; end if;
  if new.status is distinct from old.status and not (
    (old.status='pending' and new.status='processing') or
    (old.status='processing' and new.status in ('pending','error','generated')) or
    (old.status='error' and new.status='processing') or
    (old.status='generated' and new.status in ('processing','approved'))
  ) then raise exception using errcode='23514', message='Invalid request transition'; end if;
  if new.status='approved' and old.status<>'approved' then
    -- Only the future explicit owner-approval transaction (HU024) may set this
    -- local marker, after validating the decision. No current endpoint sets it.
    -- Authenticated users have no UPDATE rights and no setter RPC is exposed.
    if auth.uid() is distinct from new.owner_id or not private.can_manage_own_documents()
      or new.approved_by is distinct from new.owner_id or new.approved_at is null
      or current_setting('pdf_interactivo.owner_approval',true) is distinct from new.id::text then
      raise exception using errcode='42501', message='Explicit owner approval is required';
    end if;
  end if;
  if new.status='approved' and old.status='approved'
    and row(new.approved_by,new.approved_at) is distinct from row(old.approved_by,old.approved_at) then
    raise exception using errcode='23514', message='Approval is immutable';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.guard_reinforcement_request_state() from public,anon,authenticated;
create trigger reinforcement_requests_guard_state before insert or update on public.reinforcement_requests
for each row execute function private.guard_reinforcement_request_state();

create function private.record_reinforcement_request_event() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if tg_op='INSERT' then
    insert into public.reinforcement_request_events(request_id,status,stage,actor_kind,actor_id,event_kind)
    values(new.id,new.status,new.stage,'owner',new.owner_id,'created');
  elsif row(old.status,old.stage) is distinct from row(new.status,new.stage) then
    insert into public.reinforcement_request_events(request_id,previous_status,status,previous_stage,stage,actor_kind,actor_id,event_kind)
    values(new.id,old.status,new.status,old.stage,new.stage,
      case when new.status='approved' then 'owner' else 'system' end,
      case when new.status='approved' then auth.uid() else null end,'transition');
  end if;
  return new;
end;
$$;
revoke all on function private.record_reinforcement_request_event() from public,anon,authenticated;
create trigger reinforcement_requests_record_event after insert or update on public.reinforcement_requests
for each row execute function private.record_reinforcement_request_event();

notify pgrst,'reload schema';
commit;
