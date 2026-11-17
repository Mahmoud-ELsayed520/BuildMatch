# Contributing to BuildMatch

Welcome to the BuildMatch developer and contributor guidelines. BuildMatch is developed by a four-member engineering team under the Digital Egypt Pioneers Initiative (DEPI).

---

## 1. Team Responsibilities & Ownership

To ensure smooth parallel engineering without code collisions or architecture drifts, technical ownership is strictly partitioned:

| Team Role | Assignee | Primary Scope & Boundaries |
| :--- | :--- | :--- |
| **Project Leader / Architect** | Project Leader | System Architecture, Supabase Database, SQL Migrations, RLS Policies, Storage Buckets, RPC Functions, Figma Master UI/UX, Shared Service Contracts, PR Reviews. |
| **Frontend Engineer** | Teammate 1 | Landowner UI BM-008-BM-013; `src/features/landowner/`. |
| **Frontend Engineer** | Teammate 2 | Contractor UI BM-014-BM-018; `src/features/contractor/`. |
| **Frontend Engineer** | Teammate 3 | Execution/Admin UI BM-019-BM-026; `src/features/execution/`, `src/features/admin/`. |

The project leader maps these labels to names and owns the shared Auth foundation, routes, services, database, Storage authorization, and integration approval.

> **Critical Rule:** Frontend engineers must NOT modify database migrations, invent custom API endpoints, or bypass Supabase client contracts. All data interactions must use the standardized service layers defined under `src/services/` and documented in [`docs/03-system-design/16-api-and-integration-design.md`](docs/03-system-design/16-api-and-integration-design.md).

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
   ```powershell
   git status --short
   git fetch origin
   git switch develop
   git pull --ff-only origin develop
   git switch -c feat/your-feature-name
   ```
   Start from a clean tree. If `git status --short` lists work, preserve it and ask the project leader how to keep it separate; do not stage or commit another contributor's files.
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
   npm test
   npm run test:db
   ```
   `npm run test:db` is relevant for database/security changes and only runs against the isolated local PostgreSQL cluster; the runner verifies the configured data directory before dropping its test database.
3. Verify that the production build succeeds:
   ```bash
   npm run build
   ```
4. Fill out the pull request template completely, citing associated task and module IDs.
5. All PRs require review and approval by the Project Leader before merging into `develop`.

### PowerShell feature branch and PR commands

Replace the branch name and BM ID for your assignment. Review staged and unstaged file lists before staging. Stage only files inside your owned feature directory; ask the project leader before changing shared files.

```powershell
git status --short
git fetch origin
git switch develop
git pull --ff-only origin develop
git switch -c feat/landowner-module
git status --short
git diff --name-only
npm test
npm run lint
npm run build
git add -- src/features/landowner
git diff --cached --name-only
git diff --cached --check
git commit -m "feat(landowner): implement BM-008 dashboard"
git push -u origin feat/landowner-module
gh pr create --base develop --head feat/landowner-module --title "[BM-008] Landowner dashboard" --body-file .github/pull_request_template.md
```

To update an existing branch without rewriting history, start with a clean working tree:

```powershell
git status --short
git fetch origin
git switch feat/landowner-module
git merge origin/develop
```

Resolve conflicts in owned files where possible, inspect `git diff`, and rerun checks. Do not use reset, clean, or force-push to resolve conflicts. The available GitHub connector cannot inspect branch protection settings; the project leader should verify required PR reviews and CI checks in repository settings.

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
