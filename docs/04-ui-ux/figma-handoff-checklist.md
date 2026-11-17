# BuildMatch — Figma Handoff Checklist

> **Important Note on Module Allocation:**  
> Module ownership for Member 2, Member 3, and Member 4 is intentionally unassigned until the team confirms its preferred allocation. No module assignment should be inferred from older documentation.

**Figma file:** https://www.figma.com/design/oNUAk7viZgNJ82x8B92wqn  
**File name:** BuildMatch | بيلد ماتش — Product Design v1.0  
**Audit date:** 2026-11-16  
**Status:** Previously verified inventory inspected through the connected Figma integration.

## 1. Verified file structure

10 pages:
1. 00 — Cover
2. 01 — Foundations
3. 02 — Components
4. 03 — Public
5. 04 — Landowner
6. 05 — Contractor
7. 06 — Admin
8. 07 — Prototypes
9. 08 — Responsive
10. 09 — Handoff

## 2. Verified inventory

| Area | Verified count |
|---|---:|
| Public screens/dialogs | 11 |
| Landowner screens/dialogs | 27 |
| Contractor screens/dialogs | 29 |
| Admin screens/dialogs | 13 |
| **Primary screens/dialogs total** | **80** |
| Components | 159 |
| Component sets | 12 |
| Variables | 39 |
| Text styles | 18 |
| Prototype reactions | 128 |
| Representative responsive layouts | 17 |

The 80 primary screen/dialog count is the sum of the Public, Landowner, Contractor, and Admin page inventories. Prototype copies and supporting frames are not counted as additional primary product screens.

## 3. Responsive coverage

The Responsive page contains 17 representative layouts:
- 6 Arabic RTL mobile layouts.
- 6 Arabic RTL tablet layouts.
- 2 additional Arabic RTL mobile layouts (progress photo upload and BOQ pricing).
- 3 English LTR examples (two desktop, one mobile).

This is representative coverage, not a claim that all 80 screens have mobile, tablet, and desktop variants.

## 4. Prototype and handoff

- Prototype page contains 86 top-level frames.
- Direct structural inspection found 128 nodes with prototype reactions (128 reactions).
- Handoff page exists and includes a Developer Handoff specification.
- Prototype flow index node: `2:13977`.
- Developer handoff node: `2:10703`.

## 5. Developer handoff checklist

- [x] Design pages organized by Foundations, Components, Public, Landowner, Contractor, Admin, Prototypes, Responsive, and Handoff.
- [x] Reusable components and component sets present.
- [x] Semantic variables and text styles present.
- [x] Primary role-based screen inventory present.
- [x] Representative responsive examples present.
- [x] Prototype interactions present.
- [ ] Every primary screen has all responsive breakpoints.
- [ ] Every screen has every loading, empty, error, success, disabled, and permission state instantiated.
- [ ] All English LTR screen equivalents are complete.
- [ ] Real photo/evidence assets replace any simulated placeholders where required.
- [ ] Runtime keyboard navigation, focus behavior, screen-reader labels, and contrast are tested in the browser.
- [ ] Final screen-to-task mapping is reviewed by each assigned frontend owner after team role selection.

## 6. Implementation notes

- Treat Figma as the UI source of truth; do not invent new visual patterns independently.
- Forms and uploads shown as demos/prototypes are not connected to live backend services by virtue of appearing in Figma.
- UI implementation must use the approved route map and service/API contracts (`docs/03-system-design/16-api-and-integration-design.md`).
- Any design change affecting requirements, data fields, or workflows must be reviewed by the Project Leader and reflected in documentation.

## 7. Correction to previous documentation

An earlier version of this checklist stated that no cloud Figma file existed and listed only 21 screens. That statement is obsolete. The current file was created and the inventory above was verified on 2026-11-16.
