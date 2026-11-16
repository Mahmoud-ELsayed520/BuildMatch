# Contributing to BuildMatch

Welcome to the BuildMatch developer and contributor guidelines. BuildMatch is developed by a four-member engineering team under the Digital Egypt Pioneers Initiative (DEPI).

---

## 1. Team Responsibilities & Ownership

To ensure smooth parallel engineering without code collisions or architecture drifts, technical ownership is strictly partitioned:

| Team Role | Lead / Assignee | Primary Scope & Boundaries |
| :--- | :--- | :--- |
| **Project Leader / Architect** | Mahmoud El Sayed | System Architecture, Supabase Database, SQL Migrations, RLS Policies, Storage Buckets, RPC Functions, Figma Master UI/UX, PR Reviews. |
| **Frontend Engineer 1** | Member 2 | **Landowner Module:** Project drafting, publishing, work package specification, comparison matrix UI. |
| **Frontend Engineer 2** | Member 3 | **Contractor Module:** Contractor onboarding, credential upload UI, project search/filter discovery, proposal builder. |
| **Frontend Engineer 3** | Member 4 | **Execution & Admin Module:** Milestone tracking, progress photo submission, Change Request reviews, Admin verification console. |

> **Critical Rule:** Frontend engineers must NOT modify database migrations, invent custom API endpoints, or bypass Supabase client contracts. All data interactions must use the standardized service layers defined under `src/services/api/` and documented in `docs/03-system-analysis-design/api-data-contracts.md`.

---

## 2. Git Workflow & Branch Strategy

We follow a structured Git feature branch model based on two persistent branches:

```
[main] (Production / Submission Ready)
   ^
   | (PR with Architect approval)
[develop] (Shared Integration Branch)
   ^
   +--- feat/landowner-module
   +--- feat/contractor-module
   +--- feat/execution-module
   +--- feat/admin-module
   +--- feat/auth-foundation
   +--- docs/project-documentation
```

### Branch Rules:
1. **Never commit directly to `main` or `develop`.**
2. Branch names must follow standard prefixes:
   - `feat/feature-name`
   - `fix/bug-description`
   - `docs/documentation-topic`
3. Always branch off the latest `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/your-feature-name
   ```
4. Keep commits atomic and descriptive following Conventional Commits:
   - `feat(landowner): implement project creation form validation`
   - `fix(proposals): prevent duplicate submission on slow networks`
   - `docs(contracts): clarify change request approval parameters`

---

## 3. Pull Request (PR) Requirements

Before opening a Pull Request against `develop`:
1. Verify that your code passes linting without errors:
   ```bash
   npm run lint
   ```
2. Verify that unit tests pass:
   ```bash
   npm run test
   ```
3. Verify that the production build succeeds:
   ```bash
   npm run build
   ```
4. Fill out the pull request template completely, citing associated task and module IDs.
5. All PRs require review and approval by the Project Leader before merging into `develop`.

---

## 4. Code Standards & Conventions

- **Language:** JavaScript (ES Modules, ECMAScript 2022). Do not introduce TypeScript files.
- **Styling:** Tailwind CSS utility classes. Avoid custom inline styles or arbitrary CSS files outside `index.css`.
- **Forms:** React Hook Form integrated with Zod schemas defined in `src/validations/`.
- **Icons:** Use `lucide-react` exclusively.
- **State Management:** Local component state (`useState`, `useReducer`) and React Context for scoped shared state (`AuthContext`, `NotificationContext`). Do not install Redux.
- **Security:**
  - Never place service role keys in frontend code.
  - Never trust client-side role checks alone; always verify database RLS handles access control.
  - Do not commit `.env` or sensitive credentials.
