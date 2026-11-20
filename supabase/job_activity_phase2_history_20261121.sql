-- Phase 2: keep historic activities available to the original center even if a job is later unshared.
-- Only INSERT requires a currently shared posting; existing records remain team-private.
DROP POLICY IF EXISTS job_activity_read ON public.counselor_job_activity;
CREATE POLICY job_activity_read ON public.counselor_job_activity
FOR SELECT TO authenticated
USING (
 (select private.job_archive_member())
 AND actor_team = (select private.job_archive_actor_team())
);
