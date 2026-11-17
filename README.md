# BuildMatch (منصة إدارة ومطابقة مشاريع البناء)

> Egyptian Construction Marketplace & Project Management Platform connecting residential landowners with qualified contractors.

[![BuildMatch CI](https://github.com/Mahmoud-ELsayed520/BuildMatch/actions/workflows/ci.yml/badge.svg)](https://github.com/Mahmoud-ELsayed520/BuildMatch/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-DEPI%20Academic-blue.svg)](LICENSE)

---

## 1. Overview & Value Proposition

**BuildMatch** is an end-to-end web platform designed for the Egyptian residential construction market. It solves the fragmentation, lack of pricing transparency, and execution disputes common in residential building by bridging two interconnected workflows:

1. **Construction Marketplace:** Landowners publish residential construction projects divided into independent **Work Packages** (e.g. Concrete Skeleton, Masonry, Plumbing, Electrical, Finishes). Verified contractors discover opportunities, review architectural requirements, and submit structured, comparable bids. Landowners compare proposals across standardized price and timeline metrics and atomically award packages.
2. **Construction Management:** Once a package is awarded, the platform transitions into an active execution and milestone-tracking dashboard. Contractors submit milestone progress with photo evidence, request rework or change requests, and initiate formal handover. Landowners review deliverables, approve or request rework, and confirm final package sign-off.

---

## 2. Core Modules

| Module # | Module Name | Scope Summary |
| :--- | :--- | :--- |
| **01** | **Authentication & Profiles** | Role-based registration (`landowner`, `contractor`), secure Supabase Auth, profiles, and RLS. |
| **02** | **Contractor Verification** | Business licensing, syndicate credentials, experience portfolio, and admin verification workflow. |
| **03** | **Landowner Projects** | Project creation, CAD/PDF drawing uploads, budgeting, and division into independent Work Packages. |
| **04** | **Contractor Discovery** | Filterable public feed of open packages by city, category, and budget range. |
| **05** | **Proposals & Bidding** | Structured contractor bidding with itemized scopes, exclusions, durations, and payment milestones. |
| **06** | **Comparison & Selection** | Standardized proposal comparison matrices and concurrency-safe, atomic package assignment via RPC. |
| **07** | **Construction Execution** | Milestone tracking, photo progress logs, Change Request approval workflows, and owner handover. |
| **08** | **Admin Dashboard** | Contractor verification reviews, project moderation, platform audit logs, and verified reviews. |

---

## 3. Technology Stack

- **Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router v6, React Hook Form, Zod, Lucide React.
- **Backend & Database:** Supabase (PostgreSQL 15+, Row Level Security, Storage, Database Functions / RPC).
- **Quality & DevOps:** ESLint, Prettier, Vitest, React Testing Library, GitHub Actions CI.
- **Architecture:** Modular Monolith with strictly separated domain features, service contracts, and database-enforced authorization.

---

## 4. Getting Started

### Prerequisites
- **Node.js:** v20 LTS (same major version used by CI)
- **npm:** v10 or later
- **Git**
- **PostgreSQL 17 binaries** for `npm run test:db` (or configure `PG_BIN` to their `bin` directory)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mahmoud-ELsayed520/BuildMatch.git
   cd BuildMatch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```powershell
   Copy-Item .env.example .env.local
   ```
   Edit `.env.local` and supply the Supabase project URL and publishable/legacy anon key provided securely by the project leader. Never use a service-role or secret key in the browser:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Run Linting & Tests:**
   ```bash
   npm run lint
   npm test
   npm run test:db
   npm run build
   ```
   `npm run test:db` uses an isolated local PostgreSQL cluster in `.pgdata_test` on port 5433. It refuses to run destructive setup against a server whose data directory is outside that configured test cluster.

---

## 5. Database & Supabase Migrations

All database schemas, constraints, RLS policies, RPC functions, and storage definitions are version-controlled under `supabase/migrations/`. The connected BuildMatch Supabase project was read-only checked on 2026-11-17: it reports PostgreSQL 17.12 and six baseline migrations. Migrations `20261117000003`, `20261117175421`, and `20261117181620` are local-only and require separate review; do not apply them from teammate branches.

- `20261116000001_initial_schema.sql` — Schema definitions, foreign keys, indexes, and constraints.
- `20261116000002_rls_policies.sql` — Comprehensive Row Level Security policies.
- `20261116000003_functions_and_rpc.sql` — Atomic selection RPC, change request triggers, and audit logging.
- `20261116000004_storage_buckets.sql` — Storage bucket configuration (`project-files`, `verification-docs`, `progress-photos`).
- `20261117000001_fix_rpc_authorization.sql` — RPC authorization and grants.
- `20261117000002_set_view_security_invoker.sql` — public contractor view security.
- `20261117000003_limit_milestone_status_updates.sql` — local milestone write hardening.
- `20261117175421_auth_profile_bootstrap.sql` — local Auth profile bootstrap and safe legacy profile backfill.
- `20261117181620_harden_business_update_paths.sql` — local package, proposal, and change-request write hardening.

Local Supabase setup commands and test scripts are detailed in [`docs/05-implementation/database-setup-guide.md`](docs/05-implementation/database-setup-guide.md).

---

## 6. Team Structure & Responsibilities

Developed under the Digital Egypt Pioneers Initiative (DEPI) React Track (Group: `CAI5_SWD2_S7`). Current frontend ownership is:

- **Project Leader:** Overall Architecture, Database & Supabase Engineering, Security & RLS, Figma UI/UX Design System, Shared Contracts, Code Review and Integration Approval.
- **Teammate 1:** Landowner frontend, BM-008-BM-013, `src/features/landowner/`.
- **Teammate 2:** Contractor frontend, BM-014-BM-018, `src/features/contractor/`.
- **Teammate 3:** Execution and Admin frontend, BM-019-BM-026, `src/features/execution/` and `src/features/admin/`.

Project Leader owns shared architecture, Supabase, database changes, Auth foundation, API contracts, shared routes, integration, and final review. These allocations supersede older pre-implementation documents that said assignments were pending.

For full team workflows, pre-implementation handoff, and branch guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md), [`docs/00-depi-readiness/`](docs/00-depi-readiness/), and [`docs/08-team-work/`](docs/08-team-work/).
