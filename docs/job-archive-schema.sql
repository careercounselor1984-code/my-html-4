-- Shared job postings, no client records. Active counselor accounts only.
create or replace function private.job_archive_member()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.counselor_accounts a
 join public.edoc_employees e on e.id=a.employee_id
 where a.user_id=(select auth.uid()) and a.active and e.active
 and a.terminated_at is null and not a.must_change_password);
$$;
revoke all on function private.job_archive_member() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.job_archive_member() to authenticated;
create table public.counselor_job_archive (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 job_key text not null check(length(job_key)=64),
 owner_name text not null default '',
 job jsonb not null check(jsonb_typeof(job)='object' and octet_length(job::text)<=64000),
 is_shared boolean not null default false,
 saved_at timestamptz not null default now(),
 unique(owner_id,job_key)
);
alter table public.counselor_job_archive enable row level security;
revoke all on public.counselor_job_archive from anon, authenticated;
grant select,insert,update,delete on public.counselor_job_archive to authenticated;
create policy archive_read on public.counselor_job_archive for select to authenticated
 using ((select private.job_archive_member()) and (owner_id=(select auth.uid()) or is_shared));
create policy archive_insert on public.counselor_job_archive for insert to authenticated
 with check ((select private.job_archive_member()) and owner_id=(select auth.uid()));
create policy archive_update on public.counselor_job_archive for update to authenticated
 using ((select private.job_archive_member()) and owner_id=(select auth.uid()))
 with check ((select private.job_archive_member()) and owner_id=(select auth.uid()));
create policy archive_delete on public.counselor_job_archive for delete to authenticated
 using ((select private.job_archive_member()) and owner_id=(select auth.uid()));
create index counselor_job_archive_shared_saved_idx on public.counselor_job_archive(is_shared,saved_at desc);
create or replace function private.job_archive_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 select e.name into new.owner_name from public.counselor_accounts a
 join public.edoc_employees e on e.id=a.employee_id where a.user_id=new.owner_id;
 new.saved_at=now();
 return new;
end;$$;
revoke all on function private.job_archive_stamp() from public, anon, authenticated;
create trigger job_archive_stamp before insert or update on public.counselor_job_archive
 for each row execute function private.job_archive_stamp();
