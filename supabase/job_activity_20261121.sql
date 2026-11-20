-- 상담사 공동 채용공고 활용 기록 (2026-11-21)
-- 공개 GitHub에는 스키마만 저장하고 실제 내담자 기록은 Supabase에만 보관합니다.
create table if not exists public.counselor_job_activity (
  id uuid primary key default gen_random_uuid(),
  job_key text not null check (job_key ~ '^[0-9a-f]{64}$'),
  event_type text not null check (event_type in ('provided','referred','employed')),
  client_label text not null check (char_length(trim(client_label)) between 1 and 80),
  event_date date not null default (now() at time zone 'Asia/Seoul')::date,
  notes text not null default '' check (char_length(notes) <= 400),
  actor_id uuid not null default auth.uid(),
  actor_name text not null default '상담사',
  created_at timestamptz not null default now(),
  voided_at timestamptz
);
create index if not exists counselor_job_activity_job_date_idx on public.counselor_job_activity(job_key,event_date desc);
create index if not exists counselor_job_activity_actor_date_idx on public.counselor_job_activity(actor_id,event_date desc);
create index if not exists counselor_job_archive_shared_key_idx on public.counselor_job_archive(job_key) where is_shared;
alter table public.counselor_job_activity enable row level security;
revoke all on public.counselor_job_activity from public, anon, authenticated;
grant select on public.counselor_job_activity to authenticated;
grant insert (job_key,event_type,client_label,event_date,notes) on public.counselor_job_activity to authenticated;
grant update (voided_at) on public.counselor_job_activity to authenticated;

-- 인증된 상담사 이름을 서버에서 확정하여 조작된 작성자 표시를 방지합니다.
create or replace function private.counselor_job_activity_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare staff_name text;
begin
  select e.name into staff_name
  from public.counselor_accounts ca
  join public.edoc_employees e on e.id=ca.employee_id
  where ca.user_id=auth.uid()
    and ca.active and e.active
    and ca.terminated_at is null
    and not ca.must_change_password
  limit 1;
  if staff_name is null then
    raise exception '활성 상담사 로그인 후 이용해 주세요.';
  end if;
  new.actor_id := auth.uid();
  new.actor_name := left(staff_name, 80);
  new.created_at := now();
  new.voided_at := null;
  return new;
end;
$function$;
revoke all on function private.counselor_job_activity_stamp() from public, anon, authenticated;
drop trigger if exists counselor_job_activity_stamp_trigger on public.counselor_job_activity;
create trigger counselor_job_activity_stamp_trigger
before insert on public.counselor_job_activity
for each row execute function private.counselor_job_activity_stamp();

drop policy if exists job_activity_read on public.counselor_job_activity;
create policy job_activity_read on public.counselor_job_activity
for select to authenticated
using (
  (select private.job_archive_member())
  and (
    actor_id = (select auth.uid())
    or exists (
      select 1 from public.counselor_job_archive j
      where j.job_key = counselor_job_activity.job_key and j.is_shared
    )
  )
);
drop policy if exists job_activity_create on public.counselor_job_activity;
create policy job_activity_create on public.counselor_job_activity
for insert to authenticated
with check (
  (select private.job_archive_member())
  and actor_id = (select auth.uid())
  and exists (
    select 1 from public.counselor_job_archive j
    where j.job_key = counselor_job_activity.job_key and j.is_shared
  )
);
-- 기록은 삭제하지 않고 작성자 본인만 취소 처리합니다.
drop policy if exists job_activity_void on public.counselor_job_activity;
create policy job_activity_void on public.counselor_job_activity
for update to authenticated
using ((select private.job_archive_member()) and actor_id = (select auth.uid()) and voided_at is null)
with check ((select private.job_archive_member()) and actor_id = (select auth.uid()) and voided_at is not null);
