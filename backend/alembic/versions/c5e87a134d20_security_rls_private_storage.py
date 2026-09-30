"""Enable Supabase RLS and private, profile-scoped resume storage.

Revision ID: c5e87a134d20
Revises: b95e4a023d61
Create Date: 2026-09-29

"""
from typing import Sequence, Union

from alembic import op

revision: str = "c5e87a134d20"
down_revision: Union[str, Sequence[str], None] = "b95e4a023d61"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PRIVATE_TABLES = (
    "profiles", "target_roles", "skills", "role_skills", "resources",
    "resumes", "resume_analysis", "user_skills", "skill_evidence",
    "readiness_scores", "readiness_breakdowns", "skill_gaps", "roadmaps",
    "roadmap_weeks", "roadmap_tasks", "task_progress", "mock_interviews",
    "interview_questions", "interview_answers", "interview_scores",
    "chat_sessions", "chat_messages", "activity_events", "job_snapshots",
    "job_skills", "institutions", "institution_memberships",
)

POLICIES = (
    ("careerpro_profiles_select_own", "profiles", "FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid())::text)"),
    ("careerpro_profiles_insert_own", "profiles", "FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid())::text)"),
    ("careerpro_profiles_update_own", "profiles", "FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())::text) WITH CHECK (user_id = (SELECT auth.uid())::text)"),
    ("careerpro_target_roles_read", "target_roles", "FOR SELECT TO authenticated USING (profile_id IS NULL OR profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_skills_read", "skills", "FOR SELECT TO authenticated USING (true)"),
    ("careerpro_role_skills_read", "role_skills", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.target_roles r WHERE r.id = target_role_id AND (r.profile_id IS NULL OR r.profile_id = (SELECT public.current_profile_id()))))"),
    ("careerpro_resumes_read_own", "resumes", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_resume_analysis_read_own", "resume_analysis", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resumes r WHERE r.id = resume_id AND r.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_user_skills_read_own", "user_skills", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_skill_evidence_read_own", "skill_evidence", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_skills us WHERE us.id = user_skill_id AND us.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_readiness_scores_read_own", "readiness_scores", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_readiness_breakdowns_read_own", "readiness_breakdowns", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.readiness_scores rs WHERE rs.id = score_id AND rs.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_skill_gaps_read_own", "skill_gaps", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_roadmaps_read_own", "roadmaps", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_roadmap_weeks_read_own", "roadmap_weeks", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roadmaps r WHERE r.id = roadmap_id AND r.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_roadmap_tasks_read_own", "roadmap_tasks", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roadmaps r WHERE r.id = roadmap_id AND r.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_task_progress_read_own", "task_progress", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.roadmap_tasks t JOIN public.roadmaps r ON r.id = t.roadmap_id WHERE t.id = task_id AND r.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_interviews_read_own", "mock_interviews", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_interview_questions_read_own", "interview_questions", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_interviews mi WHERE mi.id = interview_id AND mi.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_interview_answers_read_own", "interview_answers", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.interview_questions q JOIN public.mock_interviews mi ON mi.id = q.interview_id WHERE q.id = question_id AND mi.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_interview_scores_read_own", "interview_scores", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.mock_interviews mi WHERE mi.id = interview_id AND mi.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_chat_sessions_read_own", "chat_sessions", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_chat_messages_read_own", "chat_messages", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_sessions cs WHERE cs.id = session_id AND cs.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_activity_read_own", "activity_events", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_institution_memberships_read_own", "institution_memberships", "FOR SELECT TO authenticated USING (profile_id = (SELECT public.current_profile_id()))"),
    ("careerpro_institutions_read_member", "institutions", "FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.institution_memberships im WHERE im.institution_id = institutions.id AND im.profile_id = (SELECT public.current_profile_id())))"),
    ("careerpro_resources_read", "resources", "FOR SELECT TO authenticated USING (true)"),
)

STORAGE_POLICIES = (
    ("careerpro_resume_objects_select_own", "FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (SELECT public.current_profile_id())::text)"),
    ("careerpro_resume_objects_insert_own", "FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (SELECT public.current_profile_id())::text)"),
    ("careerpro_resume_objects_update_own", "FOR UPDATE TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (SELECT public.current_profile_id())::text) WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (SELECT public.current_profile_id())::text)"),
    ("careerpro_resume_objects_delete_own", "FOR DELETE TO authenticated USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = (SELECT public.current_profile_id())::text)"),
)


def upgrade() -> None:
    op.execute(
        """CREATE OR REPLACE FUNCTION public.current_profile_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
          SELECT p.id FROM public.profiles AS p
          WHERE p.user_id = (SELECT auth.uid())::text
          LIMIT 1
        $$"""
    )
    op.execute("REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon")
    op.execute("GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated")
    for table in PRIVATE_TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
    for policy_name, table, clause in POLICIES:
        op.execute(f"CREATE POLICY {policy_name} ON public.{table} {clause}")
        
    # Storage RLS is handled directly in Supabase console/migrations.

def downgrade() -> None:
    for policy_name, table, _clause in reversed(POLICIES):
        op.execute(f"DROP POLICY IF EXISTS {policy_name} ON public.{table}")
    for table in reversed(PRIVATE_TABLES):
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY")
    op.execute("DROP FUNCTION IF EXISTS public.current_profile_id()")
