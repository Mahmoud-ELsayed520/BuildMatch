-- ==============================================================================
-- BuildMatch Database Schema Migration 06: Set Security Invoker on Public Directory View
-- Author: Senior Backend & Security Engineer
-- Created: 2026-11-17
-- Target Environment: PostgreSQL 15+ (Supabase)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CONFIGURE VIEW TO EXECUTE UNDER CALLER PRIVILEGES (security_invoker = true)
-- Ensures that queries against `public.contractor_public_directory` enforce Row Level
-- Security (RLS) policies of underlying tables (profiles and contractor_profiles)
-- under the permissions and role of the querying user (security_invoker) rather than
-- the view owner (security_definer behavior).
-- ------------------------------------------------------------------------------
ALTER VIEW public.contractor_public_directory SET (security_invoker = true);
