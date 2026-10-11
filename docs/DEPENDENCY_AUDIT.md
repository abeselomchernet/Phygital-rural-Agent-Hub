# Dependency security audit

Status: **PRODUCTION DEPENDENCY GATE CLEARED FOR P0-A MERGE REVIEW**.

The dependency-remediation pass removed unused runtime provider packages, regenerated the lockfile, applied supported non-breaking production fixes, and added a narrow `qs` override because the Express 4 dependency range otherwise retained a version covered by the active advisory.

The final hosted validation run executed `npm audit --omit=dev` after a clean `npm ci` and reported **0 production vulnerabilities**. CI now treats that command as a hard gate rather than report-only.

This result is dependency-audit evidence for the current lockfile only. It is not a claim that the prototype is production-ready, regulated, approved, or safe for real customer data.

## Changes made

- Removed unused `firebase` and `@google/genai` runtime dependencies after confirming the active prototype no longer imports them.
- Kept `shadcn` as development/code-generation tooling instead of a production dependency.
- Regenerated `package-lock.json` with npm rather than hand-editing lock entries.
- Applied non-breaking production dependency updates with npm.
- Added a root npm override for `qs` at `^6.15.4` to keep the Express dependency graph above the affected advisory range.
- Retained Express 4 for this bounded pass instead of introducing an unnecessary major framework migration.
- Changed GitHub Actions from `npm audit --omit=dev || true` to the enforced `npm audit --omit=dev` gate.

## Final hosted evidence

From a clean GitHub Actions install on the remediated lockfile:

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 576 packages installed |
| `npm audit --omit=dev` | **PASS; 0 vulnerabilities** |
| `npm run lint` | PASS |
| `npm test` | PASS; 29 tests |
| `npm run build` | PASS |
| `docker build -t enawuga-synthetic-demo:pr .` | PASS |
| `npm run test:e2e` | PASS; 10 tests |

The full dependency tree, including development tooling, still reports **23 findings (2 low, 4 moderate, 17 high)** during `npm ci`. Those findings are not present in the `--omit=dev` production graph. They remain a development-tooling hygiene backlog and should be upgraded or removed without using an indiscriminate `npm audit fix --force` downgrade. In particular, the shadcn/tooling chain should be handled separately from runtime dependencies.

## Policy going forward

1. Do not use `npm audit fix --force` as a blanket remediation strategy.
2. Keep the production audit as a hard CI gate.
3. Prefer removing unused packages before accepting transitive risk.
4. Regenerate and commit `package-lock.json` for dependency changes; do not hand-edit it.
5. Re-run lint, tests, build, Docker and browser tests after dependency updates.
6. Treat development-only findings separately, but do not allow a dev dependency to migrate into the production graph without clearing the production audit.

## Architecture boundaries preserved

The dependency cleanup did not reintroduce Firebase execution, Gemini/GenAI credential injection, live Fayda/bank/payment connectivity, remote GhostSync delivery, regulated mode, fake settlement, or historical unsafe financial routes. Wishland remains a technology/software/orchestration provider only; PartnerFI remains the future regulated financial principal.

## Scope note

Clearing the production npm audit is necessary repository hygiene, not production authorization. P0-B still requires authentication and partner roles, durable transaction/idempotency controls, real-customer object authorization, encrypted edge storage, approved Ethiopia-resident infrastructure and key custody, provider contracts, authenticated remote receiver controls, and other regulated operational safeguards before any real pilot or production use.
