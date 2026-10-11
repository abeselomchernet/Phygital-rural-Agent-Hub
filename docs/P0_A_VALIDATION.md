# P0-A validation

Baseline `c495a2198c0d814a416794b57d9cc2470bf2bcbc`: build, typecheck and API checks passed. Three original browser tests failed on stale expectations; those tests were replaced with assertions for the bounded synthetic prototype.

Final hosted validation uses GitHub Actions on Ubuntu 24.04 with Node 24.21.0 and npm 11.19.0. Local development validation used Node 24.19.0 / npm 11.9.0 and system Chromium 154. No live providers, real customer inputs or live credentials were used.

| Command/check | Final result |
| --- | --- |
| `npm ci` | PASS; 576 packages installed on the remediated lockfile. |
| `npm audit --omit=dev` | **PASS; 0 production vulnerabilities. CI now enforces this as a hard gate.** |
| `npm run lint` | PASS, `tsc --noEmit`. |
| `npm test` | PASS, **29 tests**; zero failures/skips. Includes domain/API integration, identity/phone/PartnerFI boundary tests, pending-verification idempotency and regulated-startup rejection. |
| `npm run build` | PASS; 2033 modules; nonfatal ~645 kB large-chunk advisory remains. |
| `docker build -t enawuga-synthetic-demo:pr .` | PASS in GitHub Actions. Synthetic image built successfully. |
| `npm run test:e2e` | PASS, **10 Playwright tests**; zero failures/skips. |
| Local production synthetic server + smoke test | PASS on isolated port 3011. |
| Local GET `/kiosk` | PASS, compiled SPA asset and Enawuga title. |
| Focused tracked-file credential scan | No private-key blocks, GitHub tokens, former Firebase key or removed hardcoded stand-ins found; this is not a comprehensive git-history secret audit. |
| GitHub Actions | PASS on the dependency-remediated P0-A branch. |

Browser coverage includes the Agent Terminal/KYC/account workbench, Ardi arithmetic illustration, supervisor synthetic fleet, offline outbox persistence/reconnect gating, phone alias change and re-verification, duplicate PartnerFI authorization without duplicate balance mutation, three-language presentation, proposed Farmer360 portfolio, onboarding/readiness, Data Mule, fixed dialogue, and desktop/mobile overflow checks. Presentation tests block non-loopback requests and verify that presentation-only interactions do not issue external mutations.

## Boundary corrections verified

Identity verification, phone-channel verification and PartnerFI customer linkage are separate operations. A mock identity-provider success records KYC/identity state only; it does not prove possession of the phone alias and does not create a PartnerFI relationship. The synthetic demo fixture performs phone-channel verification and PartnerFI linking as explicit separate setup steps.

Repeated KYC start/re-verification requests return the existing pending challenge instead of silently replacing it. Transaction identity remains the immutable internal customer UUID; FIN/FAN and phone aliases are not accepted as transaction identity.

## Dependency remediation

The original production audit reported 38 findings, including critical/high chains through unused Firebase/GenAI dependencies and active framework/transitive packages. The remediation pass:

- removed unused `firebase` and `@google/genai` runtime dependencies;
- classified `shadcn` as development-only tooling;
- regenerated `package-lock.json` with npm;
- applied supported non-breaking production dependency fixes;
- pinned patched `qs` through an npm override for the Express 4 dependency graph; and
- changed CI from report-only auditing to enforced `npm audit --omit=dev`.

The clean hosted validation now reports **`found 0 vulnerabilities` for the production graph**. The full install including development tooling still reports **23 findings (2 low, 4 moderate, 17 high)**. Those development-only findings remain a tooling-hygiene backlog and are not being hidden or represented as cleared. No blanket `npm audit fix --force` was used. See `docs/DEPENDENCY_AUDIT.md`.

## Deployment interpretation

Successful GitHub Actions and deployment-status checks prove only that the synthetic prototype builds/tests in development environments. They do not establish production readiness, regulated-data residency, partner authorization, Fayda approval, financial connectivity or pilot authorization.

The Docker build is verified, correcting the earlier validation note that Docker had not been run. No regulated-mode Docker or production deployment was attempted. Regulated mode remains fail-closed.
