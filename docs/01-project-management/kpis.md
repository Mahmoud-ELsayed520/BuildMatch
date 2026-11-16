# BuildMatch — Key Performance Indicators (KPIs)

**Status:** Proposed team targets, not measured results.  
The DEPI guideline requires KPIs but does not prescribe numerical thresholds. Targets below are proposed for the MVP and must be measured before being reported as achieved.

## Product and user experience

| KPI | Measurement | Proposed target | Measurement phase |
|---|---|---:|---|
| Core journey completion | Successful completion of critical UAT journeys / attempted journeys | ≥ 90% | UAT |
| Task success rate | Participants completing assigned usability tasks without moderator intervention | ≥ 85% | UAT |
| Mobile layout integrity | Key mobile screens without horizontal overflow or clipped primary actions | 100% | Responsive QA |
| Arabic RTL consistency | Critical flows with correct RTL order, alignment, and labels | 100% | UI QA |
| Form validation coverage | Required forms with validation and clear error feedback | 100% | Feature QA |

## Technical quality and reliability

| KPI | Measurement | Proposed target | Measurement phase |
|---|---|---:|---|
| Initial page performance | LCP at the 75th percentile on agreed representative routes | ≤ 2.5 s | Staging performance test |
| API/query latency | p95 for critical reads under documented test load | ≤ 500 ms | Integration test |
| Frontend runtime errors | Unhandled errors during agreed UAT suite | 0 critical errors | UAT |
| Build quality gate | Required lint, unit, DB, and build jobs passing | 100% pass before merge | Every PR |
| Critical security tests | RLS, role isolation, private storage, and atomic-selection tests passing | 100% pass | Security testing |
| Demo-window availability | Successful health checks / scheduled checks during demo window | ≥ 99.5% | Pre-demo monitoring |

## Business workflow integrity

| KPI | Measurement | Proposed target | Measurement phase |
|---|---|---:|---|
| Proposal comparability | Required proposal fields present in validated proposals | 100% | Feature tests |
| Single-winner integrity | Work packages with more than one selected contractor | 0 | DB/concurrency tests |
| Change approval integrity | Cost/time changes with explicit owner/admin decision | 100% | DB tests |
| Milestone evidence traceability | Progress updates linked to correct package and milestone | 100% | Integration tests |
| Contractor verification gate | Unverified/rejected contractors successfully submitting proposals | 0 | Authorization tests |

## Reporting rules

- These targets are team proposals, not DEPI grading weights or lecturer-issued targets.
- Do not mark a KPI achieved without reproducible measurement evidence.
- Record test date, environment, sample size, method, result, and evidence link.
- Missed targets must create a bug/issue with an owner and retest evidence.
- Do not claim production availability or real user adoption before deployment and real use.
