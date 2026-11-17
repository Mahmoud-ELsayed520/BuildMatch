-- Keep package publication and proposal withdrawal on narrow RPC paths.
-- Change requests are decided exclusively by decide_change_request().
REVOKE UPDATE ON TABLE public.change_requests FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, package_id, requested_by, title, reason, scope_change_description,
  cost_impact, time_impact_days, status, decision_by, decision_notes,
  decided_at, created_at, updated_at
) ON TABLE public.change_requests FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS change_requests_update_policy ON public.change_requests;

-- Draft packages may be edited directly, but status/assignment fields are
-- reserved for the existing selection/handover RPCs and publish_package().
REVOKE INSERT ON TABLE public.project_packages FROM PUBLIC, anon, authenticated;
REVOKE INSERT (
  id, project_id, title, category, description, scope_of_work,
  estimated_budget, target_duration_days, status, assigned_contractor_id,
  assigned_proposal_id, assigned_at, handover_requested_at, completed_at,
  created_at, updated_at
) ON TABLE public.project_packages FROM PUBLIC, anon, authenticated;
GRANT INSERT (
  project_id, title, category, description, scope_of_work,
  estimated_budget, target_duration_days
) ON TABLE public.project_packages TO authenticated;

REVOKE UPDATE ON TABLE public.project_packages FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, project_id, title, category, description, scope_of_work,
  estimated_budget, target_duration_days, status, assigned_contractor_id,
  assigned_proposal_id, assigned_at, handover_requested_at, completed_at,
  created_at, updated_at
) ON TABLE public.project_packages FROM PUBLIC, anon, authenticated;
GRANT UPDATE (
  title, category, description, scope_of_work, estimated_budget, target_duration_days
) ON TABLE public.project_packages TO authenticated;

DROP POLICY IF EXISTS packages_insert_policy ON public.project_packages;
CREATE POLICY packages_insert_policy
  ON public.project_packages FOR INSERT
  WITH CHECK (
    status = 'draft'
    AND assigned_contractor_id IS NULL
    AND assigned_proposal_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_packages.project_id AND p.owner_id = auth.uid()
    )
    OR (public.is_admin() AND status = 'draft'
      AND assigned_contractor_id IS NULL AND assigned_proposal_id IS NULL)
  );

DROP POLICY IF EXISTS packages_update_policy ON public.project_packages;
CREATE POLICY packages_update_policy
  ON public.project_packages FOR UPDATE
  USING (
    project_packages.status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_packages.project_id AND p.owner_id = auth.uid()
    )
    OR (public.is_admin() AND project_packages.status = 'draft')
  )
  WITH CHECK (
    project_packages.status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_packages.project_id AND p.owner_id = auth.uid()
    )
    OR (public.is_admin() AND project_packages.status = 'draft')
  );

CREATE OR REPLACE FUNCTION public.publish_project_package(p_package_id UUID)
RETURNS public.project_packages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_package public.project_packages;
  v_owner_id UUID;
  v_actor_id UUID := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT pkg.*
    INTO v_package
  FROM public.project_packages AS pkg
  WHERE pkg.id = p_package_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or package not found' USING ERRCODE = '42501';
  END IF;
  SELECT p.owner_id INTO v_owner_id
  FROM public.projects AS p WHERE p.id = v_package.project_id;
  IF v_owner_id IS DISTINCT FROM v_actor_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized or package not found' USING ERRCODE = '42501';
  END IF;
  IF v_package.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft packages can be published' USING ERRCODE = '23514';
  END IF;

  UPDATE public.project_packages AS pkg
  SET status = 'open'
  WHERE pkg.id = p_package_id
  RETURNING pkg.* INTO v_package;

  RETURN v_package;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_project_package(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.publish_project_package(UUID) TO authenticated;

-- Proposal insert/update data remains contractor-owned, while accepted or
-- decided proposals cannot be edited directly. Timestamps/decisions/version
-- and status transitions are controlled by the database/RPCs.
REVOKE INSERT ON TABLE public.proposals FROM PUBLIC, anon, authenticated;
REVOKE INSERT (
  id, package_id, contractor_id, total_price, currency, proposed_duration_days,
  scope_summary, included_materials, excluded_work, payment_schedule_terms,
  notes, status, submitted_at, decision_at, decision_reason, version,
  created_at, updated_at
) ON TABLE public.proposals FROM PUBLIC, anon, authenticated;
GRANT INSERT (
  package_id, contractor_id, total_price, currency, proposed_duration_days,
  scope_summary, included_materials, excluded_work, payment_schedule_terms,
  notes, status
) ON TABLE public.proposals TO authenticated;

REVOKE UPDATE ON TABLE public.proposals FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, package_id, contractor_id, total_price, currency, proposed_duration_days,
  scope_summary, included_materials, excluded_work, payment_schedule_terms,
  notes, status, submitted_at, decision_at, decision_reason, version,
  created_at, updated_at
) ON TABLE public.proposals FROM PUBLIC, anon, authenticated;
GRANT UPDATE (
  total_price, currency, proposed_duration_days, scope_summary,
  included_materials, excluded_work, payment_schedule_terms, notes
) ON TABLE public.proposals TO authenticated;

DROP POLICY IF EXISTS proposals_insert_policy ON public.proposals;
CREATE POLICY proposals_insert_policy
  ON public.proposals FOR INSERT
  WITH CHECK (
    contractor_id = auth.uid()
    AND status IN ('draft', 'submitted')
    AND decision_at IS NULL
    AND decision_reason IS NULL
    AND version = 1
    AND public.is_approved_contractor()
    AND EXISTS (
      SELECT 1 FROM public.project_packages AS pkg
      WHERE pkg.id = proposals.package_id
        AND pkg.status IN ('open', 'under_review')
    )
  );

DROP POLICY IF EXISTS proposals_update_policy ON public.proposals;
CREATE POLICY proposals_update_policy
  ON public.proposals FOR UPDATE
  USING (
    contractor_id = auth.uid() AND status IN ('draft', 'submitted')
  )
  WITH CHECK (
    contractor_id = auth.uid() AND status IN ('draft', 'submitted')
  );

CREATE OR REPLACE FUNCTION public.set_proposal_submission_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'submitted' THEN
    NEW.submitted_at := pg_catalog.now();
  ELSE
    NEW.submitted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_proposal_submission_timestamp() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS tr_proposals_submission_timestamp ON public.proposals;
CREATE TRIGGER tr_proposals_submission_timestamp
  BEFORE INSERT ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.set_proposal_submission_timestamp();

CREATE OR REPLACE FUNCTION public.withdraw_proposal(p_proposal_id UUID)
RETURNS public.proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_package_id UUID;
  v_proposal public.proposals;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT p.package_id INTO v_package_id
  FROM public.proposals AS p
  WHERE p.id = p_proposal_id AND p.contractor_id = v_actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or proposal not found' USING ERRCODE = '42501';
  END IF;

  -- Match contractor selection's package-before-proposal lock order.
  PERFORM 1 FROM public.project_packages AS pkg
  WHERE pkg.id = v_package_id
  FOR UPDATE;

  SELECT p.* INTO v_proposal
  FROM public.proposals AS p
  WHERE p.id = p_proposal_id AND p.contractor_id = v_actor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized or proposal not found' USING ERRCODE = '42501';
  END IF;
  IF v_proposal.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Only draft or submitted proposals can be withdrawn' USING ERRCODE = '23514';
  END IF;

  UPDATE public.proposals AS p
  SET status = 'withdrawn'
  WHERE p.id = p_proposal_id
  RETURNING p.* INTO v_proposal;

  RETURN v_proposal;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_proposal(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_proposal(UUID) TO authenticated;
