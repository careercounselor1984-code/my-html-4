CREATE OR REPLACE FUNCTION private.edoc_is_active_employee()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.edoc_employees e
    where e.auth_user_id = (select auth.uid())
      and e.active = true
  );
$function$;
