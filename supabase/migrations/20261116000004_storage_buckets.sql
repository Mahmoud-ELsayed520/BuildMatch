-- ==============================================================================
-- BuildMatch Database Schema Migration 04: Storage Buckets & Policies
-- Author: Mahmoud El Sayed (Project Leader & Architect)
-- Created: 2026-11-16
-- Target Environment: PostgreSQL 15+ (Supabase Storage)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Storage Buckets
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'project-files',
    'project-files',
    false,
    26214400, -- 25 MiB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/acad', 'application/x-dwg', 'image/vnd.dwg']
  ),
  (
    'verification-docs',
    'verification-docs',
    false,
    10485760, -- 10 MiB
    ARRAY['application/pdf', 'image/jpeg', 'image/png']
  ),
  (
    'progress-photos',
    'progress-photos',
    false,
    15728640, -- 15 MiB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 2. Storage Policies for `project-files`
-- Path convention: {project_id}/{file_name}
-- ------------------------------------------------------------------------------
CREATE POLICY "project_files_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND (
      public.is_admin()
      -- 1. Project owner has full read access to all their project files
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
      )
      -- 2. Assigned contractor has access to files for active assigned execution
      OR EXISTS (
        SELECT 1 FROM public.project_packages pkg
        JOIN public.projects p ON p.id = pkg.project_id
        WHERE p.id::text = (storage.foldername(name))[1]
        AND pkg.assigned_contractor_id = auth.uid()
        AND pkg.status IN ('assigned', 'in_progress', 'pending_handover')
      )
      -- 3. Authenticated contractors browsing published projects can ONLY access explicitly public files
      OR EXISTS (
        SELECT 1 FROM public.project_files pf
        JOIN public.projects p ON p.id = pf.project_id
        WHERE p.id::text = (storage.foldername(name))[1]
        AND pf.file_path = name
        AND pf.is_public = true
        AND p.status NOT IN ('draft', 'cancelled')
        AND auth.role() = 'authenticated'
      )
    )
  );

CREATE POLICY "project_files_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "project_files_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-files'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 3. Storage Policies for `verification-docs` (STRICT PRIVACY)
-- Path convention: {contractor_id}/{file_name}
-- ------------------------------------------------------------------------------
CREATE POLICY "verification_docs_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-docs'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "verification_docs_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-docs'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "verification_docs_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'verification-docs'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ------------------------------------------------------------------------------
-- 4. Storage Policies for `progress-photos`
-- Path convention: {package_id}/{milestone_id}/{file_name}
-- ------------------------------------------------------------------------------
CREATE POLICY "progress_photos_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'progress-photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.project_packages pkg
        JOIN public.projects p ON p.id = pkg.project_id
        WHERE pkg.id::text = (storage.foldername(name))[1]
        AND (p.owner_id = auth.uid() OR pkg.assigned_contractor_id = auth.uid())
      )
    )
  );

CREATE POLICY "progress_photos_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.project_packages pkg
        WHERE pkg.id::text = (storage.foldername(name))[1]
        AND pkg.assigned_contractor_id = auth.uid()
      )
    )
  );
