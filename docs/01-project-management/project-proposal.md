# BuildMatch — Project Proposal

**Project:** BuildMatch (بيلد ماتش)  
**DEPI track:** React Front-End Development  
**Group:** CAI5_SWD2_S7  
**Date:** 2026-11-16  
**Team:** Four members

## 1. Background and problem statement

Individual residential construction in Egypt often relies on personal referrals and fragmented communication between landowners and contractors. This creates three recurring problems:

1. Landowners struggle to compare quotations because scopes, quantities, inclusions, exclusions, and timelines are not consistently structured.
2. Disputes arise during execution when progress, handover, schedule changes, and cost changes are not recorded in a shared workflow.
3. Landowners may be forced to award an entire project to one contractor even when separate specialist contractors are better suited to individual work packages.

## 2. Proposed solution

BuildMatch is an Arabic-first web platform for the Egyptian residential construction market. It connects landowners with verified contractors and combines:

- **Construction marketplace:** landowners publish projects divided into independent work packages; verified contractors discover eligible packages and submit structured proposals.
- **Proposal comparison and selection:** landowners compare bids using consistent information and select one contractor per work package through a database-enforced atomic operation.
- **Construction execution management:** assigned contractors submit milestone progress and photo evidence; landowners review milestones, decide change requests, and confirm final handover.
- **Platform administration:** administrators review contractor verification and inspect moderation/audit information.

## 3. Target stakeholders

- Individual residential landowners.
- Residential contractors and contracting companies.
- Platform administrators responsible for verification and moderation.

## 4. Project objectives

1. Provide a clear workflow from project publication to work-package award and completion.
2. Make contractor proposals more comparable through structured scope, BOQ, price, and duration information.
3. Enforce contractor verification before bidding.
4. Prevent multiple winning contractors from being selected for the same work package.
5. Record milestone evidence and require explicit owner decisions for rework, change requests, and completion.
6. Deliver a responsive Arabic RTL web experience with documented English LTR examples.
7. Produce maintainable technical documentation, tests, and a deployable web application.

## 5. MVP scope

### Included
- Authentication and role-based profiles.
- Contractor profiles and verification.
- Landowner project and work-package management.
- Contractor discovery and filtering.
- Structured proposals and BOQ.
- Proposal comparison and atomic contractor selection.
- Milestones, progress evidence, change requests, and handover.
- Admin verification/moderation and post-completion reviews.

### Excluded
- Online payments and escrow.
- Real-time live chat.
- Building-materials marketplace.
- AI-based cost estimation.
- Native iOS/Android applications.
- Legally binding e-signatures.

## 6. Technology and architecture direction

- Frontend: React 18, Vite 5, JavaScript, Tailwind CSS.
- Backend/data platform: Supabase Auth, PostgreSQL, Row Level Security, Storage, and database RPC.
- Architecture: Modular Monolith with separated feature modules, shared UI, and service/data-access contracts.
- Collaboration: GitHub feature branches, pull requests, and CI checks.
- Design: Figma Product Design v1.0.

The technology choices above describe the approved project direction. A Supabase Cloud project and production deployment must not be claimed until provisioned and verified.

## 7. Delivery approach

Use short, reviewable Agile tasks. Each feature must trace to an approved requirement, Figma flow, and documented service/API contract. Database schema, RLS, RPC signatures, and storage policies are centrally owned by the Project Leader to prevent conflicting implementations.

## 8. Key deliverables

- Project proposal, plan, Gantt, WBS, roles/RACI, risks, and KPIs.
- Requirements and System Analysis & Design documentation.
- Figma screens, reusable components, prototypes, and handoff guidance.
- React application source code and Supabase database implementation.
- Automated test evidence, bug reports, deployment link, user manual, technical report, presentation, and project infographic.

The final implementation and presentation deliverables are future-phase outputs and are not represented as complete in this proposal.
