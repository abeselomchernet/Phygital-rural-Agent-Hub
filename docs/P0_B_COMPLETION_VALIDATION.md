# P0-B completion validation

Starting branch: `p0-b-auth-durable-staging-foundation`, head `b31f3cbe30d026b988aa19e71a79c36a252a9503`, clean working tree. Continued existing Draft PR #3. No replacement remote branch/PR, merge, Vercel project creation, protection change or live provider activation.

## Validation commands and evidence

| Command | Local result |
| --- | --- |
| `npm ci --cache /workspace/.npm` | PASS, 576 packages; lockfile unchanged |
| `npm audit --omit=dev` | PASS, 0 vulnerabilities |
| `npm run lint` | PASS, TypeScript |
| `npm test` | PASS, 59 tests, no failures/skips |
| `npm run build` | PASS; existing >500KB chunk advisory |
| `docker build -t enawuga-synthetic-demo:pr .` | Standard local attempt blocked by environment-specific configuration/CA trust; equivalent build passes with the environment CA temporarily mounted, details below |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | PASS, 12 tests, no failures/skips |
| `git diff --check` | PASS |

The full development/tooling graph still reports the known 23 findings (2 low, 4 moderate, 17 high). Production graph is clean. No `npm audit fix --force` or dependency mutation was used.

Docker first needed writable Buildx configuration (`BUILDX_CONFIG=/workspace/onboarding/buildx`). The standard build then hit `SELF_SIGNED_CERT_IN_CHAIN` because the base container lacks this cloud workspace's proxy CA. A temporary Dockerfile outside the repository replaces only `RUN npm ci` with:

```dockerfile
RUN --mount=type=secret,id=environment_ca,target=/tmp/environment-ca.pem NODE_EXTRA_CA_CERTS=/tmp/environment-ca.pem npm ci
```

It builds with `--secret id=environment_ca,src=/etc/ssl/certs/ca-certificates.crt`, preserving TLS, package-integrity validation and the original install/build steps. The CA mount is temporary; no repository Dockerfile, trust bypass or credential is added. Local image build completed successfully. Hosted CI uses the unchanged repository Dockerfile; its exact result is linked in PR #3 after push.

One browser run failed because Chromium returned `ERR_NETWORK_CHANGED` for three local JS modules while Docker networking was starting. Eleven other tests passed. The full browser suite was rerun after Docker finished, without relaxing assertions. New browser regressions cover legacy records remaining untouched/unuploaded even with a reachable mock receiver, and unavailable account data never becoming a fabricated zero balance.

## Changed files in this completion pass

- Documentation: `README.md`, `docs/P0_B_PLAN.md`, `docs/P0_B_AUDIT_RECOVERY.md`, `docs/P0_B_EDGE_SECURITY.md`, `docs/P0_B_ET_STAGING_EVIDENCE.md`, `docs/P0_B_CLAIMS_REVIEW.md`, this validation record.
- Audit/domain/runtime: `src/domain/audit.ts`, `src/domain/customer.ts`, `src/domain/reconciliation.ts`, `src/server/audit.ts`, `src/server/auth.ts`, `src/server/demo-api.ts`.
- Edge contract: `src/security/edge-storage.ts`.
- UI: `src/components/CustomerWorkbench.tsx`, `src/pages/GhostSyncQueue.tsx`.
- Tests: `tests/helpers/audit-privacy.ts`, `tests/api.test.ts`, `tests/audit.test.ts`, `tests/auth.test.ts`, `tests/reconciliation.test.ts`, `tests/recovery-audit.test.ts`, `tests/edge-storage.test.ts`, `app/applet/e2e/presentation.spec.ts`.

B3's local synthetic core is implemented/tested. B4's bounded audit/recovery controls are implemented; cross-store transactional audit is not. B5 is an unavailable encryption contract plus threat model, not actual browser encryption. B6 is an evidence package, not provisioned/approved staging. B7 preserves product concepts with accurate active labels. Regulated mode and remote GhostSync remain closed.

External blockers remain: PartnerFI/provider contracts and licensed scope, real identity/session authority, approved Ethiopia-resident compute/database/backup/audit placement, key custody, retention/subprocessor/incident/operations evidence, and owner-managed hosted deployment/access. See the evidence checklist for accountable owners. No real-data or live-funds authorization follows from these test results.
