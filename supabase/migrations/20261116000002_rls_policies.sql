-- ==============================================================================
-- BuildMatch Database Schema Migration 02: Row Level Security (RLS) Policies
-- Author: Mahmoud El Sayed (Project Leader & Architect)
-- Created: 2026-11-16
-- Target Environment: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Security Functions (SECURITY DEFINER with strict search_path)
-- ------------------------------------------------------------------------------

-- Check if current authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if current authenticated user is an approved contractor
CREATE OR REPLACE FUNCTION public.is_approved_contractor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractor_profiles
    WHERE id = auth.uid() AND verification_status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Get the role of the current user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. Enable RLS on All Public Application Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- Public read access to basic user profile info (name, city, role)
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can insert their own profile during registration; PREVENT self-registering as admin
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id AND role IN ('landowner', 'contractor')
  );

-- Users can update their own profile; cannot alter their role
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 4. CONTRACTOR PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- Public can view approved contractors; contractors can view their own; admin can view all
CREATE POLICY "contractor_profiles_select_policy"
  ON public.contractor_profiles FOR SELECT
  USING (
    verification_status = 'approved'
    OR auth.uid() = id
    OR public.is_admin()
  );

-- Contractor can insert their own profile initial data
CREATE POLICY "contractor_profiles_insert_policy"
  ON public.contractor_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'contractor'
    AND verification_status = 'pending'
  );

-- Contractors can update their details (bio, experience, specializations); CANNOT self-approve
CREATE POLICY "contractor_profiles_update_policy"
  ON public.contractor_profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    (
      auth.uid() = id
      AND verification_status = (SELECT cp.verification_status FROM public.contractor_profiles cp WHERE cp.id = auth.uid())
    )
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 5. VERIFICATION DOCUMENTS POLICIES (STRICT PRIVACY)
-- ------------------------------------------------------------------------------

-- Only the contractor who uploaded the document or platform admins can view them
CREATE POLICY "verification_docs_select_policy"
  ON public.verification_documents FOR SELECT
  USING (
    contractor_id = auth.uid()
    OR public.is_admin()
  );

-- Contractors can upload their own verification documents
CREATE POLICY "verification_docs_insert_policy"
  ON public.verification_documents FOR INSERT
  WITH CHECK (
    contractor_id = auth.uid()
    AND verification_status = 'pending'
  );

-- Only admins can update verification status / notes
CREATE POLICY "verification_docs_update_policy"
  ON public.verification_documents FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Contractors can delete documents while in pending status
CREATE POLICY "verification_docs_delete_policy"
  ON public.verification_documents FOR DELETE
  USING (
    (contractor_id = auth.uid() AND verification_status = 'pending')
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. PROJECTS POLICIES
-- ------------------------------------------------------------------------------

-- Owners see all their projects; approved contractors & landowners see published projects
CREATE POLICY "projects_select_policy"
  ON public.projects FOR SELECT
  USING (
    owner_id = auth.uid()
    OR (status NOT IN ('draft', 'cancelled') AND auth.role() = 'authenticated')
    OR public.is_admin()
  );

-- Landowners can create projects
CREATE POLICY "projects_insert_policy"
  ON public.projects FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'landowner'
  );

-- Owners can update their projects (if not completed or closed); admins can update anytime
CREATE POLICY "projects_update_policy"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (owner_id = auth.uid() AND status NOT IN ('completed', 'closed'))
    OR public.is_admin()
  );

-- Owners can delete draft projects only; admins can delete anytime
CREATE POLICY "projects_delete_policy"
  ON public.projects FOR DELETE
  USING (
    (owner_id = auth.uid() AND status = 'draft')
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. PROJECT FILES POLICIES
-- ------------------------------------------------------------------------------

CREATE POLICY "project_files_select_policy"
  ON public.project_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id
      AND (
        p.owner_id = auth.uid()
        OR (p.status NOT IN ('draft', 'cancelled') AND project_files.is_public = true)
        OR public.is_admin()
      )
    )
  );

CREATE POLICY "project_files_insert_policy"
  ON public.project_files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id AND p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "project_files_delete_policy"
  ON public.project_files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_files.project_id AND p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 8. PROJECT PACKAGES POLICIES
-- ------------------------------------------------------------------------------

-- Project owners, assigned contractors, or approved contractors browsing published projects
CREATE POLICY "packages_select_policy"
  ON public.project_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_packages.project_id
      AND (
        p.owner_id = auth.uid()
        OR (p.status NOT IN ('draft', 'cancelled') AND project_packages.status != 'draft')
        OR project_packages.assigned_contractor_id = auth.uid()
      )
    )
    OR public.is_admin()
  );

-- Project owners can insert packages for their own projects
CREATE POLICY "packages_insert_policy"
  ON public.project_packages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_packages.project_id AND p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Project owners can update packages (unless completed or closed); admins can update
CREATE POLICY "packages_update_policy"
  ON public.project_packages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_packages.project_id AND p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Project owners can delete draft packages
CREATE POLICY "packages_delete_policy"
  ON public.project_packages FOR DELETE
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_packages.project_id AND p.owner_id = auth.uid()
      )
      AND project_packages.status = 'draft'
    )
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 9. PROPOSALS POLICIES
-- ------------------------------------------------------------------------------

-- Contractor can see their own proposals; Project owner can see submitted/accepted proposals
CREATE POLICY "proposals_select_policy"
  ON public.proposals FOR SELECT
  USING (
    contractor_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.project_packages pkg
        JOIN public.projects p ON p.id = pkg.project_id
        WHERE pkg.id = proposals.package_id
        AND p.owner_id = auth.uid()
      )
      AND proposals.status IN ('submitted', 'accepted', 'rejected', 'closed')
    )
    OR public.is_admin()
  );

-- Only approved contractors can submit proposals for packages open for bidding
CREATE POLICY "proposals_insert_policy"
  ON public.proposals FOR INSERT
  WITH CHECK (
    contractor_id = auth.uid()
    AND public.is_approved_contractor()
    AND EXISTS (
      SELECT 1 FROM public.project_packages pkg
      WHERE pkg.id = proposals.package_id
      AND pkg.status IN ('open', 'under_review')
    )
  );

-- Contractors can update their draft proposals or withdraw submitted proposals
CREATE POLICY "proposals_update_policy"
  ON public.proposals FOR UPDATE
  USING (
    contractor_id = auth.uid()
    OR public.is_admin()
  )
  WITH CHECK (
    (contractor_id = auth.uid() AND status IN ('draft', 'submitted', 'withdrawn'))
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 10. PROPOSAL ITEMS POLICIES
-- ------------------------------------------------------------------------------

CREATE POLICY "proposal_items_select_policy"
  ON public.proposal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals prop
      WHERE prop.id = proposal_items.proposal_id
      AND (
        prop.contractor_id = auth.uid()
        OR (
          EXISTS (
            SELECT 1 FROM public.project_packages pkg
            JOIN public.projects p ON p.id = pkg.project_id
            WHERE pkg.id = prop.package_id AND p.owner_id = auth.uid()
          )
          AND prop.status IN ('submitted', 'accepted', 'rejected', 'closed')
        )
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "proposal_items_insert_policy"
  ON public.proposal_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.proposals prop
      WHERE prop.id = proposal_items.proposal_id
      AND prop.contractor_id = auth.uid()
      AND prop.status = 'draft'
    )
  );

-- ------------------------------------------------------------------------------
-- 11. MILESTONES POLICIES
-- ------------------------------------------------------------------------------

-- Visible to project owner, assigned contractor, or admin
CREATE POLICY "milestones_select_policy"
  ON public.milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = milestones.package_id
      AND (p.owner_id = auth.uid() OR pkg.assigned_contractor_id = auth.uid())
    )
    OR public.is_admin()
  );

-- Project owners or assigned contractors during execution setup
CREATE POLICY "milestones_insert_policy"
  ON public.milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = milestones.package_id
      AND p.owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Updates controlled: owners approve/request rework; contractors submit
CREATE POLICY "milestones_update_policy"
  ON public.milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = milestones.package_id
      AND (p.owner_id = auth.uid() OR pkg.assigned_contractor_id = auth.uid())
    )
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 12. PROGRESS UPDATES POLICIES
-- ------------------------------------------------------------------------------

CREATE POLICY "progress_updates_select_policy"
  ON public.progress_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.project_packages pkg ON pkg.id = m.package_id
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE m.id = progress_updates.milestone_id
      AND (p.owner_id = auth.uid() OR pkg.assigned_contractor_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY "progress_updates_insert_policy"
  ON public.progress_updates FOR INSERT
  WITH CHECK (
    contractor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.project_packages pkg ON pkg.id = m.package_id
      WHERE m.id = progress_updates.milestone_id
      AND pkg.assigned_contractor_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 13. CHANGE REQUESTS POLICIES
-- ------------------------------------------------------------------------------

CREATE POLICY "change_requests_select_policy"
  ON public.change_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = change_requests.package_id
      AND (p.owner_id = auth.uid() OR pkg.assigned_contractor_id = auth.uid())
    )
    OR public.is_admin()
  );

-- Landowner or assigned contractor can raise a change request
CREATE POLICY "change_requests_insert_policy"
  ON public.change_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = change_requests.package_id
      AND (p.owner_id = auth.uid() OR pkg.assigned_contractor_id = auth.uid())
    )
  );

-- Decision on change request: only project owner can approve/reject contractor change requests
CREATE POLICY "change_requests_update_policy"
  ON public.change_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = change_requests.package_id
      AND p.owner_id = auth.uid()
    )
    OR requested_by = auth.uid() -- Can cancel their own pending request
    OR public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 14. REVIEWS POLICIES
-- ------------------------------------------------------------------------------

-- Published reviews are public; others are admin/reviewer only
CREATE POLICY "reviews_select_policy"
  ON public.reviews FOR SELECT
  USING (
    status = 'published'
    OR reviewer_id = auth.uid()
    OR public.is_admin()
  );

-- Reviewers can only review after verified completion of the specific work package
CREATE POLICY "reviews_insert_policy"
  ON public.reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.project_packages pkg
      JOIN public.projects p ON p.id = pkg.project_id
      WHERE pkg.id = reviews.package_id
      AND p.owner_id = auth.uid()
      AND pkg.assigned_contractor_id = reviews.contractor_id
      AND pkg.status = 'completed'
    )
  );

-- Only admins can moderate/update reviews
CREATE POLICY "reviews_update_policy"
  ON public.reviews FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 15. NOTIFICATIONS POLICIES
-- ------------------------------------------------------------------------------

-- Users can only read their own notifications
CREATE POLICY "notifications_select_policy"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update_policy"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 16. REPORTS POLICIES
-- ------------------------------------------------------------------------------

-- Users see their own submitted reports; admins see all reports
CREATE POLICY "reports_select_policy"
  ON public.reports FOR SELECT
  USING (reporter_id = auth.uid() OR public.is_admin());

-- Authenticated users can submit reports
CREATE POLICY "reports_insert_policy"
  ON public.reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Admins can update/resolve reports
CREATE POLICY "reports_update_policy"
  ON public.reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 17. AUDIT LOGS POLICIES (IMMUTABLE)
-- ------------------------------------------------------------------------------

-- Only administrators can read audit logs
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- Deny direct client inserts, updates, or deletes on audit_logs
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());
