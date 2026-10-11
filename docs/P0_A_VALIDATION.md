# P0-A validation

Baseline `c495a2198c0d814a416794b57d9cc2470bf2bcbc`: build, typecheck and API checks passed. Three original browser tests failed on stale expectations; those tests were replaced with assertions for the bounded synthetic prototype.

Final hosted validation used GitHub Actions on Ubuntu 24.04 with Node 24.21.0 and npm 11.19.0. Local development validation used Node 24.19.0 / npm 11.9.0 and system Chromium 154. No live providers, real customer inputs or live credentials were used.

| Command/check | Final result |
| --- | --- |
| `npm ci` | PASS; install completes. Dependency audit findings remain documented below. |
| `npm run lint` | PASS, `tsc --noEmit`. |
| `npm test` | PASS, **29 tests**; zero failures/skips. Includes domain/API integration, identity/phone/PartnerFI boundary tests, pending-verification idempotency and regulated-startup rejection. |
| `npm run build` | PASS; 2033 modules; nonfatal ~644 kB large-chunk advisory remains. |
| `docker build -t enawuga-synthetic-demo:pr .` | PASS in GitHub Actions. Synthetic image built successfully. |
| `npm run test:e2e` | PASS, **10 Playwright tests**; zero failures/skips. |
| Local production synthetic server + smoke test | PASS on isolated port 3011. |
| Local GET `/kiosk` | PASS, compiled SPA asset and Enawuga title. |
| Focused tracked-file credential scan | No private-key blocks, GitHub tokens, former Firebase key or removed hardcoded stand-ins found; this is not a comprehensive git-history secret audit. |
| GitHub Actions | PASS on the final P0-A cleanup branch. |
| Vercel commit statuses | Both configured preview/deployment status contexts report `success` for the final cleanup head. |

Browser coverage includes the Agent Terminal/KYC/account workbench, Ardi arithmetic illustration, supervisor synthetic fleet, offline outbox persistence/reconnect gating, phone alias change and re-verification, duplicate PartnerFI authorization without duplicate balance mutation, three-language presentation, proposed Farmer360 portfolio, onboarding/readiness, Data Mule, fixed dialogue, and desktop/mobile overflow checks. Presentation tests block non-loopback requests and verify that presentation-only interactions do not issue external mutations.

## Boundary corrections verified

Identity verification, phone-channel verification and PartnerFI customer linkage are now separate operations. A mock identity-provider success records KYC/identity state only; it does not prove possession of the phone alias and does not create a PartnerFI relationship. The synthetic demo fixture performs phone-channel verification and PartnerFI linking as explicit separate setup steps.

Repeated KYC start/re-verification requests return the existing pending challenge instead of silently replacing it. Transaction identity remains the immutable internal customer UUID; FIN/FAN and phone aliases are not accepted as transaction identity.

## Dependency audit

The hosted `npm audit --omit=dev` currently reports **38 findings: 2 critical, 25 high, 8 moderate and 3 low**. The findings include direct and transitive packages such as Firebase/grpc, React Router, Vite, Express-related `proxy-addr`/`qs`, Hono/MCP dependencies, protobuf, `ws`, PostCSS and build-tool dependencies. Several are reported as fixable by normal dependency updates; some suggested `--force` paths would introduce breaking downgrades (for example Firebase or shadcn) and were deliberately **not** applied.

This audit is report-only in CI for P0-A so the architectural/test evidence remains visible. It is an unresolved pre-merge security gate: do not treat a green workflow as dependency-security clearance. See `docs/DEPENDENCY_AUDIT.md` for the remediation policy and current triage.

## Deployment interpretation

Successful GitHub Actions and Vercel status checks prove only that the synthetic prototype builds/tests/deploys in those development environments. They do not establish production readiness, regulated-data residency, partner authorization, Fayda approval, financial connectivity or pilot authorization.

The Docker build is now verified, correcting the earlier validation note that Docker had not been run. No regulated-mode Docker or production deployment was attempted. Regulated mode remains fail-closed.
