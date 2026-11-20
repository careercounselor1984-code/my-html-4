-- Harden stage input against reserved legacy codes and future event dates.
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
  IF new.client_code IS NOT NULL AND btrim(new.client_code) <> '' THEN
    IF supplied_code !~ '^[a-z0-9_-]{4,80}$' OR supplied_code LIKE 'legacy-%' THEN
      RAISE EXCEPTION '내담자 식별코드는 영문·숫자·하이픈·밑줄만 허용합니다.';
    END IF;
  END IF;
  IF new.event_date > (now() AT TIME ZONE 'Asia/Seoul')::date THEN
    RAISE EXCEPTION '미래 일자로 활동을 기록할 수 없습니다.';
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
