-- Milestone changes must use the server-validated status transition RPC.
-- Client roles retain SELECT/INSERT rights; trusted service_role keeps UPDATE.
REVOKE UPDATE ON TABLE public.milestones FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (
  id, package_id, title, description, sequence_order, due_date,
  payment_percentage, payment_amount, status, submitted_at, approved_at,
  rework_notes, created_at, updated_at
) ON TABLE public.milestones FROM PUBLIC, anon, authenticated;
GRANT UPDATE ON TABLE public.milestones TO service_role;

-- The table is never updated directly by normal clients after the RPC is added.
-- Remove the old row UPDATE policy; SELECT and INSERT policies are unchanged.
DROP POLICY IF EXISTS "milestones_update_policy" ON public.milestones;

CREATE OR REPLACE FUNCTION public.update_milestone_status(
  p_milestone_id UUID,
  p_status TEXT,
  p_rework_notes TEXT DEFAULT NULL
)
RETURNS public.milestones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_package_id UUID;
  v_milestone public.milestones%ROWTYPE;
  v_owner_id UUID;
  v_assigned_contractor_id UUID;
  v_is_admin BOOLEAN;
  v_authorized BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to update a milestone.'
      USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN (
    'pending', 'in_progress', 'submitted_for_review', 'approved', 'rework_required'
  ) THEN
    RAISE EXCEPTION 'Unsupported milestone status: %', p_status
      USING ERRCODE = '22023';
  END IF;

  -- Lock in the same package-first order used by select_contractor_for_package.
  -- Then lock the milestone row before validating its current state.
  SELECT m.package_id INTO v_package_id
  FROM public.milestones AS m
  WHERE m.id = p_milestone_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone % was not found.', p_milestone_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT p.owner_id, pkg.assigned_contractor_id
    INTO v_owner_id, v_assigned_contractor_id
  FROM public.project_packages AS pkg
  JOIN public.projects AS p ON p.id = pkg.project_id
  WHERE pkg.id = v_package_id
  FOR UPDATE OF pkg;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone % was not found.', p_milestone_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT m.* INTO v_milestone
  FROM public.milestones AS m
  WHERE m.id = p_milestone_id AND m.package_id = v_package_id
  FOR UPDATE OF m;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone % was not found.', p_milestone_id
      USING ERRCODE = 'P0002';
  END IF;

  v_is_admin := public.is_admin();

  v_authorized := (
    v_actor_id IS NOT DISTINCT FROM v_assigned_contractor_id AND (
      (v_milestone.status = 'pending' AND p_status = 'in_progress')
      OR (v_milestone.status = 'in_progress' AND p_status = 'submitted_for_review')
      OR (v_milestone.status = 'rework_required' AND p_status = 'in_progress')
    )
  ) OR (
    (v_actor_id IS NOT DISTINCT FROM v_owner_id OR v_is_admin)
    AND v_milestone.status = 'submitted_for_review'
    AND p_status IN ('approved', 'rework_required')
  );

  IF v_actor_id IS DISTINCT FROM v_assigned_contractor_id
     AND v_actor_id IS DISTINCT FROM v_owner_id
     AND NOT v_is_admin
  THEN
    RAISE EXCEPTION 'Not authorized to update this milestone.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Transition from % to % is not permitted for this user.',
      v_milestone.status, p_status
      USING ERRCODE = '42501';
  END IF;

  IF p_status = 'rework_required' AND NULLIF(btrim(p_rework_notes), '') IS NULL THEN
    RAISE EXCEPTION 'Rework notes are required when requesting rework.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.milestones AS m
  SET status = p_status,
      updated_at = now(),
      submitted_at = CASE
        WHEN p_status = 'submitted_for_review' THEN now()
        ELSE m.submitted_at
      END,
      approved_at = CASE
        WHEN p_status = 'approved' THEN now()
        WHEN p_status IN ('in_progress', 'submitted_for_review', 'rework_required') THEN NULL
        ELSE m.approved_at
      END,
      rework_notes = CASE
        WHEN p_status = 'rework_required' THEN btrim(p_rework_notes)
        ELSE m.rework_notes
      END
  WHERE m.id = p_milestone_id
  RETURNING m.* INTO v_milestone;

  RETURN v_milestone;
END;
$$;

REVOKE ALL ON FUNCTION public.update_milestone_status(UUID, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.update_milestone_status(UUID, TEXT, TEXT) TO authenticated;
