-- ==============================================================================
-- BuildMatch Database Schema Migration 01: Initial Entities & Constraints
-- Author: Mahmoud El Sayed (Project Leader & Architect)
-- Created: 2026-11-16
-- Target Environment: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility function for automatically setting updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Base user account metadata linked to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('landowner', 'contractor', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT NOT NULL DEFAULT 'Cairo',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_city ON public.profiles(city);

-- ------------------------------------------------------------------------------
-- 2. CONTRACTOR PROFILES (Detailed contractor commercial metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE public.contractor_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  bio TEXT,
  specializations TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  portfolio_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_contractor_profiles_updated_at
  BEFORE UPDATE ON public.contractor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_contractor_verification_status ON public.contractor_profiles(verification_status);
CREATE INDEX idx_contractor_specializations ON public.contractor_profiles USING GIN (specializations);

-- ------------------------------------------------------------------------------
-- 3. VERIFICATION DOCUMENTS (Private contractor identity & licensing files)
-- ------------------------------------------------------------------------------
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('commercial_register', 'tax_card', 'syndicate_id', 'id_card', 'insurance_certificate', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_docs_contractor ON public.verification_documents(contractor_id);
CREATE INDEX idx_verification_docs_status ON public.verification_documents(verification_status);

-- ------------------------------------------------------------------------------
-- 4. PROJECTS (Residential landowner projects)
-- ------------------------------------------------------------------------------
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  land_area_sqm NUMERIC(10, 2) NOT NULL CHECK (land_area_sqm > 0),
  floors_count INTEGER NOT NULL DEFAULT 1 CHECK (floors_count >= 1),
  construction_type TEXT NOT NULL CHECK (construction_type IN ('concrete_skeleton', 'full_turnkey', 'finishing_only', 'renovation', 'structural_extension')),
  estimated_budget NUMERIC(14, 2) CHECK (estimated_budget IS NULL OR estimated_budget > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
  expected_start_date DATE,
  expected_completion_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open_for_proposals', 'under_review', 'partially_assigned', 'assigned', 'in_progress', 'completed', 'cancelled', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_projects_dates CHECK (expected_completion_date IS NULL OR expected_start_date IS NULL OR expected_completion_date >= expected_start_date)
);

CREATE TRIGGER tr_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_city ON public.projects(city);

-- ------------------------------------------------------------------------------
-- 5. PROJECT FILES (Architectural drawings, site photos, engineering permits)
-- ------------------------------------------------------------------------------
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_category TEXT NOT NULL CHECK (file_category IN ('architectural_drawing', 'structural_drawing', 'site_photo', 'soil_report', 'license_permit', 'other')),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_files_project ON public.project_files(project_id);

-- ------------------------------------------------------------------------------
-- 6. PROJECT PACKAGES (Modular independent work packages)
-- ------------------------------------------------------------------------------
CREATE TABLE public.project_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('excavation_foundation', 'concrete_skeleton', 'masonry', 'plumbing_sanitary', 'electrical', 'hvac', 'insulation', 'plaster_gypsum', 'flooring_tiling', 'painting', 'carpentry_aluminum', 'facades', 'turnkey')),
  description TEXT NOT NULL,
  scope_of_work TEXT NOT NULL,
  estimated_budget NUMERIC(14, 2) CHECK (estimated_budget IS NULL OR estimated_budget > 0),
  target_duration_days INTEGER CHECK (target_duration_days IS NULL OR target_duration_days > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'under_review', 'assigned', 'in_progress', 'pending_handover', 'completed', 'cancelled', 'closed')),
  assigned_contractor_id UUID REFERENCES public.contractor_profiles(id) ON DELETE SET NULL,
  assigned_proposal_id UUID, -- Will reference proposals(id) below
  assigned_at TIMESTAMPTZ,
  handover_requested_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_project_packages_updated_at
  BEFORE UPDATE ON public.project_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_packages_project ON public.project_packages(project_id);
CREATE INDEX idx_packages_status ON public.project_packages(status);
CREATE INDEX idx_packages_category ON public.project_packages(category);
CREATE INDEX idx_packages_contractor ON public.project_packages(assigned_contractor_id);

-- ------------------------------------------------------------------------------
-- 7. PROPOSALS (Contractor structured bids)
-- ------------------------------------------------------------------------------
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.project_packages(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
  total_price NUMERIC(14, 2) NOT NULL CHECK (total_price > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
  proposed_duration_days INTEGER NOT NULL CHECK (proposed_duration_days > 0),
  scope_summary TEXT NOT NULL,
  included_materials TEXT,
  excluded_work TEXT,
  payment_schedule_terms TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'withdrawn', 'closed')),
  submitted_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  decision_reason TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key for assigned_proposal_id in project_packages
ALTER TABLE public.project_packages
  ADD CONSTRAINT fk_packages_assigned_proposal
  FOREIGN KEY (assigned_proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;

CREATE TRIGGER tr_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_proposals_package ON public.proposals(package_id);
CREATE INDEX idx_proposals_contractor ON public.proposals(contractor_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);

-- Enforce maximum of ONE active proposal per contractor per package
CREATE UNIQUE INDEX uq_contractor_active_proposal_per_package
  ON public.proposals(package_id, contractor_id)
  WHERE status IN ('draft', 'submitted', 'accepted');

-- ------------------------------------------------------------------------------
-- 8. PROPOSAL ITEMS (Itemized Bill of Quantities / Cost Breakdown)
-- ------------------------------------------------------------------------------
CREATE TABLE public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'item',
  unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(14, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposal_items_proposal ON public.proposal_items(proposal_id);

-- ------------------------------------------------------------------------------
-- 9. MILESTONES (Execution stage schedule and agreed deliverables)
-- ------------------------------------------------------------------------------
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.project_packages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sequence_order INTEGER NOT NULL CHECK (sequence_order >= 1),
  due_date DATE,
  payment_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (payment_percentage >= 0 AND payment_percentage <= 100),
  payment_amount NUMERIC(14, 2) CHECK (payment_amount IS NULL OR payment_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted_for_review', 'approved', 'rework_required')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rework_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_milestone_sequence UNIQUE (package_id, sequence_order)
);

CREATE TRIGGER tr_milestones_updated_at
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_milestones_package ON public.milestones(package_id);
CREATE INDEX idx_milestones_status ON public.milestones(status);

-- ------------------------------------------------------------------------------
-- 10. PROGRESS UPDATES (Milestone execution logs with photographic evidence)
-- ------------------------------------------------------------------------------
CREATE TABLE public.progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  percentage_completed INTEGER NOT NULL CHECK (percentage_completed >= 0 AND percentage_completed <= 100),
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_updates_milestone ON public.progress_updates(milestone_id);

-- ------------------------------------------------------------------------------
-- 11. CHANGE REQUESTS (Formal scope, cost, or duration adjustment requests)
-- ------------------------------------------------------------------------------
CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.project_packages(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  scope_change_description TEXT NOT NULL,
  cost_impact NUMERIC(14, 2) NOT NULL DEFAULT 0,
  time_impact_days INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
  decision_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_change_requests_updated_at
  BEFORE UPDATE ON public.change_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_change_requests_package ON public.change_requests(package_id);
CREATE INDEX idx_change_requests_status ON public.change_requests(status);

-- ------------------------------------------------------------------------------
-- 12. REVIEWS (Verified post-completion contractor evaluations)
-- ------------------------------------------------------------------------------
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.project_packages(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
  rating_overall INTEGER NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_quality INTEGER CHECK (rating_quality BETWEEN 1 AND 5),
  rating_punctuality INTEGER CHECK (rating_punctuality BETWEEN 1 AND 5),
  rating_communication INTEGER CHECK (rating_communication BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  is_verified_completion BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_review_per_package UNIQUE (package_id, reviewer_id)
);

CREATE INDEX idx_reviews_contractor ON public.reviews(contractor_id);

-- ------------------------------------------------------------------------------
-- 13. NOTIFICATIONS (In-app user event alerts)
-- ------------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  type TEXT NOT NULL DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- ------------------------------------------------------------------------------
-- 14. REPORTS (Platform moderation & dispute tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('project', 'contractor', 'proposal', 'review', 'user')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON public.reports(status);

-- ------------------------------------------------------------------------------
-- 15. AUDIT LOGS (Immutable record of security and business-critical operations)
-- ------------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
