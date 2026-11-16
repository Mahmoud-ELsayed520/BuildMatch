# BuildMatch — Risk Register

| ID | Risk | Likelihood | Impact | Mitigation / response | Owner |
|---|---|---|---|---|---|
| RSK-01 | Compressed time before 2026-11-30 implementation deadline | High | High | Keep MVP frozen; prioritize critical journeys; daily blockers; no scope expansion | Project Leader |
| RSK-02 | Team role choices are delayed or responsibilities overlap | Medium | High | Collect choices by kickoff; confirm one owner per task; maintain RACI and folder boundaries | Project Leader |
| RSK-03 | Lecturer feedback or official grading rubric is unavailable | Medium | Medium | Request written feedback/rubric; record non-issuance if confirmed; never invent comments or percentages | Project Leader |
| RSK-04 | Privilege escalation or unauthorized role changes | Medium | High | Enforce database-side RLS and protected role updates; run authorization tests | Project Leader |
| RSK-05 | Exposure of contractor KYC documents | Medium | High | Private Storage bucket, signed access, strict object policies, and cross-user tests | Project Leader |
| RSK-06 | Race condition allows multiple winning proposals for one package | Medium | High | Use documented atomic RPC and database row locking; run two-client concurrency test | Project Leader |
| RSK-07 | Parallel frontend work causes merge conflicts or contract drift | High | Medium | Separate module ownership; synchronize branches; PR review; freeze shared contracts | Project Leader and module owners |
| RSK-08 | Figma responsive/state coverage is mistaken as complete for every screen | Medium | Medium | Treat 17 responsive frames as representative; add per-screen QA during implementation | All module owners |
| RSK-09 | Supabase Cloud project is not provisioned or credentials are mishandled | Medium | High | Cloud setup is owned by Project Leader; use environment variables and never commit secrets | Project Leader |
| RSK-10 | Local database tests pass but managed Auth/Storage runtime differs | Medium | High | Validate against local/managed Supabase during integration; keep test evidence environment-specific | Project Leader |
| RSK-11 | Scope creep delays delivery | High | High | Enforce MVP exclusions and formal change control | Project Leader |
| RSK-12 | Runtime accessibility issues remain after visual design review | Medium | Medium | Keyboard, focus, contrast, and screen-reader QA during implementation | All module owners |
