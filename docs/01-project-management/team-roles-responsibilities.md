# BuildMatch — Team Roles & RACI

**Status:** Proposed role model. Named assignments are pending teammate selection.

## 1. Team structure

All four members are on the React Front-End track. The Project Leader retains ownership of project coordination, architecture, Supabase/backend foundation, Figma, shared service contracts, and PR approval. The remaining three members choose from the frontend module roles below.

| Role | Main responsibilities | Status |
|---|---|---|
| Project Leader / Architect / Backend Owner | Project coordination; architecture; Supabase schema/migrations/RLS/RPC/Storage; Figma; shared contracts; code review and integration | Confirmed |
| Landowner Frontend Owner | Owner dashboard; project create/edit; work packages; proposal inbox/comparison; selection and owner-side decisions | Available for selection |
| Contractor Frontend Owner | Contractor profile/KYC UI; package discovery; proposal/BOQ creation and management | Available for selection |
| Execution & Admin Frontend Owner | Awarded packages; milestones; progress evidence; change requests; handover; admin verification/moderation UI | Available for selection |

A member may request a role based on skills and availability. The final allocation must be confirmed by the team before tasks are assigned.

## 2. RACI

R = Responsible, A = Accountable, C = Consulted, I = Informed.

| Deliverable | Project Leader | Landowner role | Contractor role | Execution/Admin role |
|---|---:|---:|---:|---:|
| Project coordination and architecture | A/R | I | I | I |
| Supabase schema, migrations, RLS, RPC, Storage | A/R | I | I | I |
| Figma system and UI/UX handoff | A/R | C | C | C |
| Authentication foundation and shared contracts | A/R | C | C | C |
| Landowner UI module | A | R | I | C |
| Contractor UI module | A | I | R | I |
| Execution UI module | A | C | I | R |
| Admin UI module | A | I | C | R |
| Integration and PR approval | A/R | R | R | R |
| QA and final submission | A | R | R | R |

## 3. Working boundaries

- Frontend owners consume documented services and API/data contracts.
- Only the Project Leader changes schema migrations, RLS policies, RPC signatures, and storage authorization rules unless explicitly delegated.
- No member commits directly to `main` or `develop`.
- Each module owner submits PRs to `develop`; Project Leader reviews and approves.
- Role labels must be replaced with actual names and GitHub usernames after selection.
