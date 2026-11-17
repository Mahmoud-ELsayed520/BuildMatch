-- ==============================================================================
-- BuildMatch Database Schema Migration 05: Critical RPC Authorization Hotfix
-- Author: Senior Backend & Security Engineer
-- Created: 2026-11-17
-- Target Environment: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN DEFAULT PRIVILEGES FOR ROUTINES IN PUBLIC SCHEMA
-- Prevent newly created functions created by postgres role in schema public
-- from automatically granting EXECUTE to anon. Maintain authenticated and service_role.
-- ------------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON ROUTINES FROM anon;

-- ------------------------------------------------------------------------------
-- 2. EXPLICIT REVOKE & GRANT FOR THE FIVE SENSITIVE RPCS
-- Revoke EXECUTE from anon and PUBLIC explicitly on all five sensitive RPCs.
-- Grant EXECUTE to authenticated and service_role.
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.select_contractor_for_package(UUID, UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.select_contractor_for_package(UUID, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.request_package_handover(UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_package_handover(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.approve_package_completion(UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_package_completion(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.decide_change_request(UUID, TEXT, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_change_request(UUID, TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_verify_contractor(UUID, TEXT, TEXT) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verify_contractor(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ENSURE INTENTIONAL PUBLIC & HELPER ROUTINE PERMISSIONS ARE PRESERVED
-- Public contractor directory profile lookup MUST remain accessible to anon.
-- RLS helper functions and triggers must retain required execution privileges.
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_public_contractor_profile(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_approved_contractor() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. REDEFINE THE FOUR AFFECTED SENSITIVE RPCS WITH NULL-SAFE AUTHORIZATION CHECKS
-- Protect against auth.uid() IS NULL evaluation pitfalls where `<>` evaluates to NULL.
-- Preserves EXACT logic, columns, and notifications from migration 03.
-- ------------------------------------------------------------------------------

-- 4.1. SELECT CONTRACTOR FOR PACKAGE
CREATE OR REPLACE FUNCTION public.select_contractor_for_package(
  p_package_id UUID,
  p_proposal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_package_status TEXT;
  v_contractor_id UUID;
  v_proposal_status TEXT;
  v_contractor_approved BOOLEAN;
  v_total_packages INTEGER;
  v_assigned_packages INTEGER;
BEGIN
  -- 1. Identify package and project owner, locking the package row for update
  SELECT p.id, p.owner_id, pkg.status
  INTO v_project_id, v_owner_id, v_package_status
  FROM public.project_packages pkg
  JOIN public.projects p ON p.id = pkg.project_id
  WHERE pkg.id = p_package_id
  FOR UPDATE OF pkg;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work Package not found.';
  END IF;

  -- 2. Authorization check: caller must be authenticated and be the project owner or platform admin
  IF auth.uid() IS NULL
     OR (
       v_owner_id IS DISTINCT FROM auth.uid()
       AND NOT public.is_admin()
     )
  THEN
    RAISE EXCEPTION 'Unauthorized: Only the project owner can award this work package.';
  END IF;

  -- 3. Verify package eligibility
  IF v_package_status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'Package is not currently open for selection. Current status: %', v_package_status;
  END IF;

  -- 4. Verify proposal eligibility
  SELECT contractor_id, status
  INTO v_contractor_id, v_proposal_status
  FROM public.proposals
  WHERE id = p_proposal_id AND package_id = p_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal does not exist for this package.';
  END IF;

  IF v_proposal_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted proposals can be accepted. Current status: %', v_proposal_status;
  END IF;

  -- 5. Verify contractor is approved
  SELECT (verification_status = 'approved')
  INTO v_contractor_approved
  FROM public.contractor_profiles
  WHERE id = v_contractor_id;

  IF NOT COALESCE(v_contractor_approved, false) THEN
    RAISE EXCEPTION 'Cannot award work package to an unverified or rejected contractor.';
  END IF;

  -- 5. Atomic state transitions:
  -- A. Mark chosen proposal as accepted
  UPDATE public.proposals
  SET
    status = 'accepted',
    decision_at = NOW(),
    decision_reason = 'Selected by project owner',
    updated_at = NOW()
  WHERE id = p_proposal_id;

  -- B. Close/Reject all other competing proposals for this work package
  UPDATE public.proposals
  SET
    status = 'rejected',
    decision_at = NOW(),
    decision_reason = 'Another contractor was selected for this package',
    updated_at = NOW()
  WHERE package_id = p_package_id AND id <> p_proposal_id AND status = 'submitted';

  -- C. Update package status and assign contractor
  UPDATE public.project_packages
  SET
    status = 'assigned',
    assigned_contractor_id = v_contractor_id,
    assigned_proposal_id = p_proposal_id,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = p_package_id;

  -- D. Update parent project status if needed
  SELECT COUNT(*), COUNT(CASE WHEN status IN ('assigned', 'in_progress', 'completed') THEN 1 END)
  INTO v_total_packages, v_assigned_packages
  FROM public.project_packages
  WHERE project_id = v_project_id;

  IF v_assigned_packages = v_total_packages THEN
    UPDATE public.projects
    SET status = 'assigned', updated_at = NOW()
    WHERE id = v_project_id;
  ELSE
    UPDATE public.projects
    SET status = 'partially_assigned', updated_at = NOW()
    WHERE id = v_project_id;
  END IF;

  -- 6. Record Audit Log
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'SELECT_CONTRACTOR_PROPOSAL',
    'project_packages',
    p_package_id,
    jsonb_build_object(
      'proposal_id', p_proposal_id,
      'contractor_id', v_contractor_id,
      'project_id', v_project_id
    )
  );

  -- 7. Dispatch Notification to Awarded Contractor
  INSERT INTO public.notifications (user_id, title, message, link, type)
  VALUES (
    v_contractor_id,
    'مبروك! تم قبول عرضك',
    'لقد تم اختيار عرضك لتنفيذ حزمة العمل بنجاح. يمكنك الآن بدء خطة التنفيذ والمراحل.',
    '/contractor/packages/' || p_package_id,
    'proposal_accepted'
  );

  RETURN jsonb_build_object(
    'success', true,
    'package_id', p_package_id,
    'proposal_id', p_proposal_id,
    'assigned_contractor_id', v_contractor_id,
    'assigned_at', NOW()
  );
END;
$$;


-- 4.2. REQUEST PACKAGE HANDOVER
CREATE OR REPLACE FUNCTION public.request_package_handover(p_package_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_assigned_contractor UUID;
  v_owner_id UUID;
  v_unapproved_count INTEGER;
  v_package_title TEXT;
BEGIN
  -- Verify package and assignment
  SELECT pkg.assigned_contractor_id, p.owner_id, pkg.title
  INTO v_assigned_contractor, v_owner_id, v_package_title
  FROM public.project_packages pkg
  JOIN public.projects p ON p.id = pkg.project_id
  WHERE pkg.id = p_package_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work Package not found.';
  END IF;

  -- Caller must be authenticated and be the assigned contractor or platform admin
  IF auth.uid() IS NULL
     OR (
       v_assigned_contractor IS DISTINCT FROM auth.uid()
       AND NOT public.is_admin()
     )
  THEN
    RAISE EXCEPTION 'Unauthorized: Only the assigned contractor can request handover.';
  END IF;

  -- Check if there are milestones that are not yet approved
  SELECT COUNT(*)
  INTO v_unapproved_count
  FROM public.milestones
  WHERE package_id = p_package_id AND status <> 'approved';

  IF v_unapproved_count > 0 THEN
    RAISE EXCEPTION 'Cannot request handover: % milestone(s) are not yet approved.', v_unapproved_count;
  END IF;

  -- Update status to pending_handover
  UPDATE public.project_packages
  SET
    status = 'pending_handover',
    handover_requested_at = NOW(),
    updated_at = NOW()
  WHERE id = p_package_id;

  -- Notify landowner
  INSERT INTO public.notifications (user_id, title, message, link, type)
  VALUES (
    v_owner_id,
    'طلب استلام حزمة عمل',
    'طلب المقاول استلام حزمة العمل: ' || v_package_title || '. يرجى المعاينة وتأكيد الاكتمال.',
    '/landowner/packages/' || p_package_id,
    'handover_requested'
  );

  RETURN jsonb_build_object('success', true, 'status', 'pending_handover');
END;
$$;


-- 4.3. APPROVE PACKAGE COMPLETION
CREATE OR REPLACE FUNCTION public.approve_package_completion(p_package_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_assigned_contractor UUID;
  v_status TEXT;
  v_remaining_incomplete INTEGER;
BEGIN
  SELECT p.id, p.owner_id, pkg.assigned_contractor_id, pkg.status
  INTO v_project_id, v_owner_id, v_assigned_contractor, v_status
  FROM public.project_packages pkg
  JOIN public.projects p ON p.id = pkg.project_id
  WHERE pkg.id = p_package_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Work Package not found.';
  END IF;

  -- Caller must be authenticated and be the landowner or platform admin
  IF auth.uid() IS NULL
     OR (
       v_owner_id IS DISTINCT FROM auth.uid()
       AND NOT public.is_admin()
     )
  THEN
    RAISE EXCEPTION 'Unauthorized: Only the landowner can approve completion.';
  END IF;

  IF v_status <> 'pending_handover' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Package must be in pending_handover state to approve completion.';
  END IF;

  -- Finalize package
  UPDATE public.project_packages
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_package_id;

  -- Check if all packages in the project are completed
  SELECT COUNT(*)
  INTO v_remaining_incomplete
  FROM public.project_packages
  WHERE project_id = v_project_id AND status <> 'completed';

  IF v_remaining_incomplete = 0 THEN
    UPDATE public.projects
    SET status = 'completed', updated_at = NOW()
    WHERE id = v_project_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'APPROVE_PACKAGE_COMPLETION',
    'project_packages',
    p_package_id,
    jsonb_build_object('project_id', v_project_id, 'all_completed', (v_remaining_incomplete = 0))
  );

  -- Notify contractor
  IF v_assigned_contractor IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, link, type)
    VALUES (
      v_assigned_contractor,
      'تم اعتماد اكتمال حزمة العمل بنجاح',
      'قام مالك المشروع باعتماد اكتمال حزمة العمل وإغلاقها رسميًا.',
      '/contractor/packages/' || p_package_id,
      'package_completed'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'package_id', p_package_id,
    'project_completed', (v_remaining_incomplete = 0)
  );
END;
$$;


-- 4.4. DECIDE CHANGE REQUEST
CREATE OR REPLACE FUNCTION public.decide_change_request(
  p_request_id UUID,
  p_decision TEXT, -- 'approved' or 'rejected'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_package_id UUID;
  v_owner_id UUID;
  v_cost_impact NUMERIC(14, 2);
  v_time_impact INTEGER;
  v_current_status TEXT;
  v_requested_by UUID;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be either approved or rejected.';
  END IF;

  SELECT cr.package_id, p.owner_id, cr.cost_impact, cr.time_impact_days, cr.status, cr.requested_by
  INTO v_package_id, v_owner_id, v_cost_impact, v_time_impact, v_current_status, v_requested_by
  FROM public.change_requests cr
  JOIN public.project_packages pkg ON pkg.id = cr.package_id
  JOIN public.projects p ON p.id = pkg.project_id
  WHERE cr.id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Change Request not found.';
  END IF;

  -- Caller must be authenticated and be the project owner or platform admin
  IF auth.uid() IS NULL
     OR (
       v_owner_id IS DISTINCT FROM auth.uid()
       AND NOT public.is_admin()
     )
  THEN
    RAISE EXCEPTION 'Unauthorized: Only the project owner can decide on change requests.';
  END IF;

  IF v_current_status <> 'submitted' THEN
    RAISE EXCEPTION 'Change request is already decided. Current status: %', v_current_status;
  END IF;

  -- Apply decision
  UPDATE public.change_requests
  SET
    status = p_decision,
    decision_by = auth.uid(),
    decision_notes = p_notes,
    decided_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- If approved, update package estimated budget and duration
  IF p_decision = 'approved' THEN
    UPDATE public.project_packages
    SET
      estimated_budget = COALESCE(estimated_budget, 0) + v_cost_impact,
      target_duration_days = COALESCE(target_duration_days, 0) + v_time_impact,
      updated_at = NOW()
    WHERE id = v_package_id;
  END IF;

  -- Notify requester
  INSERT INTO public.notifications (user_id, title, message, link, type)
  VALUES (
    v_requested_by,
    'تحديث طلب التغيير',
    'تم ' || CASE WHEN p_decision = 'approved' THEN 'الموافقة على' ELSE 'رفض' END || ' طلب التغيير المقدم.',
    '/execution/change-requests/' || p_request_id,
    'change_request_' || p_decision
  );

  RETURN jsonb_build_object('success', true, 'status', p_decision);
END;
$$;
