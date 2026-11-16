# BuildMatch — Gantt Chart & Recovery Schedule

**Status date:** 2026-11-16  
**Note:** DEPI dates below are official target dates from the supplied guideline. Recovery dates are team proposals, not DEPI-issued extensions.

## 1. Official DEPI milestones

| Deliverable | Official DEPI target |
|---|---:|
| Project Planning & Management | 2026-10-16 |
| Literature Review | 2026-10-16 |
| Requirements Gathering | 2026-10-16 |
| System Analysis & Design | 2026-11-06 |
| Implementation (Source Code & Execution) | 2026-11-30 |
| Final Presentation, Testing & Reports | 2026-12-04 |

## 2. Recovery Gantt

```mermaid
gantt
    title BuildMatch Pre-Implementation Closure and Recovery Plan
    dateFormat YYYY-MM-DD
    axisFormat %d-%b

    section Pre-implementation closure
    Consolidate DEPI documentation and evidence :active, p1, 2026-11-16, 2026-11-17
    Correct Figma handoff and repository baseline :p2, 2026-11-16, 2026-11-17
    Collect teammate role choices and confirm RACI :p3, 2026-11-16, 2026-11-18
    Final implementation handoff gate :milestone, p4, 2026-11-18, 0d

    section Implementation (future phase)
    Parallel frontend modules and backend foundation :p5, 2026-11-18, 2026-11-26
    Integration and feature completion :p6, 2026-11-27, 2026-11-29
    Code freeze and release candidate :crit, p7, 2026-11-30, 1d

    section Testing and final submission (future phase)
    Regression, UAT, bug fixes, user manual and report :p8, 2026-12-01, 2026-12-03
    Final presentation and submission :crit, p9, 2026-12-04, 1d
```

## 3. Current stop point

The current work is limited to the pre-implementation closure tasks. The proposed 2026-11-18 kickoff is conditional on named role assignments, repository access/branch synchronization, and Figma/API handoff review. If the gate is not met, the team lead must update the recovery schedule rather than silently treating the kickoff as completed.

## 4. Resource allocation

- Project Leader: planning, architecture, Supabase foundation, Figma, shared contracts, integration oversight.
- Landowner UI owner: landowner frontend module.
- Contractor UI owner: contractor frontend module.
- Execution/Admin UI owner: execution and admin frontend modules.
- All members: onboarding, module review, integration, responsive/RTL QA, regression, and final presentation contributions.

The three frontend role owners are not yet named; allocation is pending teammate choice.
