-- 2026-11-21 phase 2: normalized person reference, center privacy, deduped stages.
-- No real personal data or sample records are inserted by this migration.

ALTER TABLE public.counselor_job_activity
  ADD COLUMN IF NOT EXISTS client_code text,
  ADD COLUMN IF NOT EXISTS actor_team text;

-- Preserve any existing legacy entries, including those without a stable participant reference.
UPDATE public.counselor_job_activity a
SET actor_team = coalesce(e.team, '기존 기록')
FROM public.counselor_accounts ca
LEFT JOIN public.edoc_employees e ON e.id=ca.employee_id
WHERE ca.user_id=a.actor_id AND a.actor_team IS NULL;
UPDATE public.counselor_job_activity SET actor_team='기존 기록' WHERE actor_team IS NULL;

-- Every counselor is linked to a canonical organizational team on the server.
CREATE OR REPLACE FUNCTION private.job_archive_actor_team()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $func$
 SELECT e.team FROM public.counselor_accounts a
 JOIN public.edoc_employees e ON e.id=a.employee_id
 WHERE a.user_id=(select auth.uid()) AND a.active AND e.active
   AND a.terminated_at IS NULL AND NOT a.must_change_password
 LIMIT 1;
$func$;
REVOKE ALL ON FUNCTION private.job_archive_actor_team() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.job_archive_actor_team() TO authenticated;

CREATE OR REPLACE FUNCTION private.counselor_job_activity_stamp()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $func$
DECLARE staff_name text; staff_team text; supplied_code text;
BEGIN
  SELECT e.name, e.team INTO staff_name, staff_team
  FROM public.counselor_accounts ca
  JOIN public.edoc_employees e ON e.id=ca.employee_id
  WHERE ca.user_id=auth.uid() AND ca.active AND e.active
    AND ca.terminated_at IS NULL AND NOT ca.must_change_password LIMIT 1;
  IF staff_name IS NULL OR staff_team IS NULL THEN
    RAISE EXCEPTION '활성 상담사 로그인 후 이용하세요.';
  END IF;
  supplied_code:=lower(regexp_replace(coalesce(new.client_code,''),'[[:space:]]+','','g'));
  -- The old UI has no client_code; keep it functioning with an explicitly marked legacy key.
  -- The new UI requires a stable participant code and never uses this fallback.
  IF supplied_code='' THEN
    supplied_code:='legacy-'||lower(regexp_replace(trim(new.client_label),'[[:space:]]+','','g'));
  END IF;
  IF length(supplied_code)<4 OR length(supplied_code)>80 THEN
    RAISE EXCEPTION '내담자 식별코드를 확인하세요.';
  END IF;
  IF supplied_code ~ '^[0-9]{13}$' OR supplied_code ~ '^01[016789][0-9]{7,8}$' THEN
    RAISE EXCEPTION '주민등록번호나 휴대전화번호는 식별코드로 사용하지 마세요.';
  END IF;
  new.actor_id:=auth.uid();
  new.actor_name:=left(staff_name,80);
  new.actor_team:=left(staff_team,80);
  new.client_code:=supplied_code;
  new.created_at:=now();
  new.voided_at:=null;
  RETURN new;
END;
$func$;

-- Strict DB-level deduplication of one stage per person per job per team.
-- Skip rows from the legacy UI, which did not provide a reliable participant ID.
CREATE UNIQUE INDEX IF NOT EXISTS counselor_job_activity_unique_stage_v2
ON public.counselor_job_activity(job_key,actor_team,client_code,event_type)
WHERE voided_at IS NULL AND client_code IS NOT NULL AND client_code !~ '^legacy-';

CREATE INDEX IF NOT EXISTS counselor_job_activity_team_date_idx
ON public.counselor_job_activity(actor_team,event_date DESC)
WHERE voided_at IS NULL;

-- Client may write only non-privileged columns; staff identity and team come from trigger.
GRANT INSERT (client_code) ON public.counselor_job_activity TO authenticated;
REVOKE SELECT ON public.counselor_job_activity FROM authenticated;
GRANT SELECT (id,job_key,event_type,client_label,client_code,event_date,notes,actor_id,actor_name,actor_team,created_at,voided_at)
ON public.counselor_job_activity TO authenticated;

-- Private notes/names may only be seen within the user's active center.
DROP POLICY IF EXISTS job_activity_read ON public.counselor_job_activity;
CREATE POLICY job_activity_read ON public.counselor_job_activity
FOR SELECT TO authenticated
USING (
 (select private.job_archive_member())
 AND actor_team = (select private.job_archive_actor_team())
 AND EXISTS (
   SELECT 1 FROM public.counselor_job_archive j
   WHERE j.job_key=counselor_job_activity.job_key AND j.is_shared
 )
);
DROP POLICY IF EXISTS job_activity_create ON public.counselor_job_activity;
CREATE POLICY job_activity_create ON public.counselor_job_activity
FOR INSERT TO authenticated
WITH CHECK (
 (select private.job_archive_member())
 AND actor_id=(select auth.uid())
 AND actor_team=(select private.job_archive_actor_team())
 AND EXISTS (
   SELECT 1 FROM public.counselor_job_archive j
   WHERE j.job_key=counselor_job_activity.job_key AND j.is_shared
 )
);
DROP POLICY IF EXISTS job_activity_void ON public.counselor_job_activity;
CREATE POLICY job_activity_void ON public.counselor_job_activity
FOR UPDATE TO authenticated
USING (
 (select private.job_archive_member())
 AND actor_id=(select auth.uid())
 AND actor_team=(select private.job_archive_actor_team())
 AND voided_at IS NULL
)
WITH CHECK (
 (select private.job_archive_member())
 AND actor_id=(select auth.uid())
 AND actor_team=(select private.job_archive_actor_team())
 AND voided_at IS NOT NULL
);

-- Only aggregated center counts (never client names/codes) can cross a center boundary.
CREATE OR REPLACE FUNCTION public.job_activity_center_summary(
 p_from date DEFAULT NULL,
 p_to date DEFAULT NULL
)
RETURNS TABLE(center_name text, activity_type text, activity_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=''
AS $func$
BEGIN
 IF NOT private.job_archive_member() THEN
  RAISE EXCEPTION '활성 상담사 전용입니다.';
 END IF;
 IF p_from IS NOT NULL AND p_to IS NOT NULL
  AND (p_to < p_from OR p_to-p_from > 366) THEN
  RAISE EXCEPTION '조회 기간은 367일 이내로 제한됩니다.';
 END IF;
 RETURN QUERY
 SELECT a.actor_team, a.event_type, count(*)::bigint
 FROM public.counselor_job_activity a
 WHERE a.voided_at IS NULL
   AND (p_from IS NULL OR a.event_date >= p_from)
   AND (p_to IS NULL OR a.event_date <= p_to)
   AND a.actor_team IS NOT NULL
 GROUP BY a.actor_team,a.event_type ORDER BY a.actor_team,a.event_type;
END;
$func$;
REVOKE ALL ON FUNCTION public.job_activity_center_summary(date,date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.job_activity_center_summary(date,date) TO authenticated;
