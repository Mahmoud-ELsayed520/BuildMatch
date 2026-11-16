-- ==============================================================================
-- BuildMatch Database Integrity & RLS Assertion Tests
-- Use with pgTAP or execute directly in psql/Supabase SQL Editor
-- ==============================================================================

BEGIN;

-- Test 1: Verify all 15 core tables exist
DO $$
DECLARE
  v_table_count INT;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'contractor_profiles', 'verification_documents',
    'projects', 'project_files', 'project_packages', 'proposals',
    'proposal_items', 'milestones', 'progress_updates', 'change_requests',
    'reviews', 'notifications', 'reports', 'audit_logs'
  );

  IF v_table_count <> 15 THEN
    RAISE EXCEPTION 'Schema Test Failed: Expected 15 tables, found %', v_table_count;
  END IF;
  RAISE NOTICE 'Test 1 Passed: All 15 core tables exist.';
END $$;

-- Test 2: Verify RLS is enabled on all 15 public tables
DO $$
DECLARE
  v_unprotected_count INT;
BEGIN
  SELECT COUNT(*) INTO v_unprotected_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename IN (
    'profiles', 'contractor_profiles', 'verification_documents',
    'projects', 'project_files', 'project_packages', 'proposals',
    'proposal_items', 'milestones', 'progress_updates', 'change_requests',
    'reviews', 'notifications', 'reports', 'audit_logs'
  );

  IF v_unprotected_count > 0 THEN
    RAISE EXCEPTION 'Security Test Failed: % tables have RLS disabled!', v_unprotected_count;
  END IF;
  RAISE NOTICE 'Test 2 Passed: Row Level Security is active on every core table.';
END $$;

-- Test 3: Verify RPC functions exist
DO $$
DECLARE
  v_func_count INT;
BEGIN
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND proname IN (
    'is_admin', 'is_approved_contractor', 'current_user_role',
    'select_contractor_for_package', 'request_package_handover',
    'approve_package_completion', 'decide_change_request',
    'admin_verify_contractor'
  );

  IF v_func_count < 8 THEN
    RAISE EXCEPTION 'Function Test Failed: Expected at least 8 security and RPC functions, found %', v_func_count;
  END IF;
  RAISE NOTICE 'Test 3 Passed: All required RPC functions and security helpers are defined.';
END $$;

-- Test 4: Verify check constraint on profiles.role (prevents invalid roles)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, role, full_name, city)
    VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'super_hacker', 'Fake Hacker', 'Cairo');
    RAISE EXCEPTION 'Role Constraint Failed: Invalid role was accepted!';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Test 4 Passed: Check constraint rejected invalid profile role.';
  END;
END $$;

ROLLBACK;
