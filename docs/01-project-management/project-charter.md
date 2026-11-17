# BuildMatch — Project Charter

**Project code:** DEPI-REACT-2026-BM  
**Track:** React Front-End Development  
**Group:** CAI5_SWD2_S7  
**Issue date:** 2026-11-16  
**Status:** Pre-implementation charter; role assignments pending team selection.

## 1. Purpose

This charter defines the project objectives, scope, governance, responsibilities, and delivery boundaries for BuildMatch under DEPI.

## 2. Objectives

1. Deliver a responsive Arabic-first web platform using React 18, Vite, and Tailwind CSS.
2. Use Supabase PostgreSQL/Auth/Storage with database-enforced authorization.
3. Support structured work-package bidding and one atomic contractor selection per package.
4. Support milestone evidence, change-request decisions, and formal handover.
5. Maintain traceable requirements, design, testing, and delivery documentation.

## 3. Governance and authority

- Project Leader owns architecture, Supabase schema/migrations/RLS/RPC/Storage, Figma, shared contracts, and PR approval.
- Three frontend module owners will be selected by the teammates from Landowner, Contractor, and Execution/Admin roles.
- Final names and GitHub usernames must be added after the team confirms role choices.
- No direct commits to `main` or `develop`; changes flow through reviewed PRs.

## 4. Budget and resources

- Academic project; planned use of free-tier services where suitable.
- Human resources: four DEPI React Front-End members.
- Tools: Node.js, npm, Git, GitHub, VS Code/Antigravity, Figma, and Supabase tooling.
- Any paid service or production resource requires team approval before use.

## 5. Constraints and assumptions

- Implementation deadline: 2026-11-30.
- Final presentation/testing/reports deadline: 2026-12-04.
- MVP scope is frozen unless formally changed.
- The repository contains starter code and database artifacts; these must be reviewed rather than recreated.
- Supabase Cloud provisioning and production deployment are not considered complete until verified.
