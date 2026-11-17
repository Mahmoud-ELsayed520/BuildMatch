-- Keep the shared timestamp trigger safe from caller-controlled search_path values.
ALTER FUNCTION public.handle_updated_at() SET search_path = pg_catalog, public;

-- Create application profiles inside the Auth transaction so sign-up works when
-- Supabase email confirmation is enabled and no browser session is returned.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- raw_user_meta_data is user controlled; never allow self-service admin roles.
  v_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'contractor' THEN 'contractor'
    ELSE 'landowner'
  END;
  v_full_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    'BuildMatch user'
  );

  INSERT INTO public.profiles (id, role, full_name, phone, city)
  VALUES (
    NEW.id,
    v_role,
    v_full_name,
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), ''),
    COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'city'), ''), 'Cairo')
  )
  ON CONFLICT (id) DO NOTHING;

  IF v_role = 'contractor' THEN
    INSERT INTO public.contractor_profiles (id, business_name, verification_status)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'business_name'), ''), v_full_name),
      'pending'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created_buildmatch_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_buildmatch_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Repair users created before the trigger existed. Only supported self-service
-- roles are backfilled; existing profiles and admin accounts are left intact.
INSERT INTO public.profiles (id, role, full_name, phone, city)
SELECT
  u.id,
  CASE WHEN u.raw_user_meta_data ->> 'role' = 'contractor' THEN 'contractor' ELSE 'landowner' END,
  COALESCE(NULLIF(btrim(u.raw_user_meta_data ->> 'full_name'), ''), 'BuildMatch user'),
  NULLIF(btrim(u.raw_user_meta_data ->> 'phone'), ''),
  COALESCE(NULLIF(btrim(u.raw_user_meta_data ->> 'city'), ''), 'Cairo')
FROM auth.users AS u
WHERE u.raw_user_meta_data ->> 'role' IN ('landowner', 'contractor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contractor_profiles (id, business_name, verification_status)
SELECT
  p.id,
  COALESCE(NULLIF(btrim(u.raw_user_meta_data ->> 'business_name'), ''), p.full_name),
  'pending'
FROM public.profiles AS p
JOIN auth.users AS u ON u.id = p.id
WHERE p.role = 'contractor'
ON CONFLICT (id) DO NOTHING;
