do $$
declare a record;
begin
 select acct.user_id,acct.employee_id into a from public.counselor_accounts acct join public.edoc_employees e on e.id=acct.employee_id where acct.active and e.active and acct.terminated_at is null and not acct.must_change_password and e.auth_user_id=acct.user_id limit 1;
 if a.user_id is null then raise exception 'No journal test actor';end if;
 perform set_config('request.jwt.claim.sub',a.user_id::text,true);
 if not private.edoc_is_active_employee() then raise exception 'Active account denied';end if;
 update public.counselor_accounts set terminated_at=now() where user_id=a.user_id;
 if private.edoc_is_active_employee() or private.job_archive_member() then raise exception 'Terminated user allowed';end if;
 execute 'set local role authenticated';
 if exists(select 1 from public.edoc_employees) or exists(select 1 from public.counselor_device_bindings) or exists(select 1 from public.counselor_job_archive) then raise exception 'Terminated RLS allowed';end if;
 execute 'reset role';
 update public.counselor_accounts set terminated_at=null,must_change_password=true where user_id=a.user_id;
 if private.edoc_is_active_employee() then raise exception 'Password gate bypass';end if;
 raise notice 'PASS: active account, termination, RLS, password gate';
end $$;
