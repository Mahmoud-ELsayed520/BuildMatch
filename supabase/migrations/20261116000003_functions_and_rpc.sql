-- ==============================================================================
-- BuildMatch Database Schema Migration 03: Functions, RPC & Atomic Transactions
-- Author: Mahmoud El Sayed (Project Leader & Architect)
-- Created: 2026-11-16
-- Target Environment: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ATOMIC CONTRACTOR SELECTION RPC
-- Concurrency-safe selection of a contractor proposal for a Work Package.
-- Ensures only one proposal can be accepted per package.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.select_contractor_for_package(
  p_package_id UUID,
  p_proposal_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_owner_id UUID;
  v_package_status TEXT;
  v_contractor_id UUID;
  v_proposal_status TEXT;
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

  -- 2. Authorization check: caller must be the project owner or platform admin
  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
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

-- ------------------------------------------------------------------------------
-- 2. REQUEST PACKAGE HANDOVER RPC
-- Initiated by assigned contractor after all milestones are completed/approved
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_package_handover(p_package_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_assigned_contractor <> auth.uid() AND NOT public.is_admin() THEN
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

-- ------------------------------------------------------------------------------
-- 3. APPROVE PACKAGE COMPLETION RPC
-- Confirmed by landowner to conclude a package and update project lifecycle
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_package_completion(p_package_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
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

  RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. DECIDE CHANGE REQUEST RPC
-- Handles landowner approval or rejection of scope/cost/timeline changes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_change_request(
  p_request_id UUID,
  p_decision TEXT, -- 'approved' or 'rejected'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_owner_id <> auth.uid() AND NOT public.is_admin() THEN
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

-- ------------------------------------------------------------------------------
-- 5. ADMIN CONTRACTOR VERIFICATION RPC
-- Administrative action for vetting contractors
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_verify_contractor(
  p_contractor_id UUID,
  p_decision TEXT, -- 'approved' or 'rejected'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required.';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected.';
  END IF;

  UPDATE public.contractor_profiles
  SET
    verification_status = p_decision,
    verification_notes = p_notes,
    verified_at = NOW(),
    verified_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_contractor_id;

  -- Update associated documents
  UPDATE public.verification_documents
  SET verification_status = p_decision, notes = p_notes
  WHERE contractor_id = p_contractor_id AND verification_status = 'pending';

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'ADMIN_VERIFY_CONTRACTOR',
    'contractor_profiles',
    p_contractor_id,
    jsonb_build_object('decision', p_decision, 'notes', p_notes)
  );

  -- Notify contractor
  INSERT INTO public.notifications (user_id, title, message, link, type)
  VALUES (
    p_contractor_id,
    'حالة توثيق حساب المقاول',
    CASE
      WHEN p_decision = 'approved' THEN 'تهانينا! تم توثيق حسابك بنجاح. يمكنك الآن تصفح وتقديم العروض على حزم العمل.'
      ELSE 'نأسف، تم رفض طلب التوثيق. السبب: ' || COALESCE(p_notes, 'يرجى مراجعة المستندات المرفقة.')
    END,
    '/contractor/profile',
    'verification_update'
  );

  RETURN jsonb_build_object('success', true, 'verification_status', p_decision);
END;
$$;
