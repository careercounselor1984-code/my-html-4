-- Already applied to the connected database.
alter table public.counselor_job_archive drop constraint counselor_job_archive_job_check, add constraint counselor_job_archive_job_check check(jsonb_typeof(job)='object' and octet_length(job::text)<=64000);
