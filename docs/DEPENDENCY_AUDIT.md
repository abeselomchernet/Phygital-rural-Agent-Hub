# Dependency security audit

Status: **OPEN PRE-MERGE GATE** for P0-A.

The final hosted P0-A cleanup run executed `npm audit --omit=dev`. It reported **38 vulnerabilities: 2 critical, 25 high, 8 moderate and 3 low**. This document records the evidence and the safe remediation policy; it is not a claim that every advisory is reachable in the current synthetic prototype.

## Policy

1. Do **not** run `npm audit fix --force` on this branch. The current audit proposes breaking dependency changes for some chains, including a Firebase downgrade and a shadcn downgrade.
2. Prefer removing dependencies that are no longer used by active source before upgrading their transitive trees.
3. For dependencies that remain active, regenerate `package-lock.json` with npm, then run the complete lint/domain/API/build/Docker/Playwright suite.
4. Do not hand-edit dependency versions without regenerating the lockfile.
5. Before P0-A is marked ready to merge, either:
   - eliminate high/critical production audit findings, or
   - document a package-by-package reachability/acceptance rationale for any residual finding and keep production/pilot use blocked.
6. The current CI audit step is report-only (`npm audit --omit=dev || true`). A green workflow therefore does **not** mean dependency-security clearance.

## Current audit groups

### Critical

- `proxy-addr` — critical IP-spoofing advisory; part of the HTTP/Express dependency graph and therefore requires priority remediation.
- `websocket-driver` — critical WebSocket advisories; determine the owning direct dependency and remove or upgrade that chain.

### High-priority direct/runtime surfaces

- `react-router` / `react-router-dom` — multiple high advisories; the application actively uses React Router and this chain must be upgraded/tested rather than dismissed as unused.
- `vite` — high development-server advisory; upgrade through a lockfile-managed dependency update and rerun build/E2E.
- Firebase / `@grpc/grpc-js` / protobuf-related packages — Firebase execution was removed from the active prototype, so first verify there are no remaining active imports. If unused, remove the direct Firebase dependency instead of accepting a forced breaking downgrade.
- `@modelcontextprotocol/sdk` / Hono-related chain — identify the owning direct package and whether it is needed by the runtime prototype; remove unused tooling dependencies or upgrade safely.
- Express-related `body-parser`, `qs`, `proxy-addr` and related packages — update the Express dependency graph and retest request parsing/origin controls.
- `ws`, `js-yaml`, `nanoid`, PostCSS, browserslist, source-map and related transitive packages — apply supported non-breaking updates through npm and regenerate the lockfile.

### Direct packages to review for removal

The synthetic P0-A source no longer uses Firebase for identity/financial persistence and no longer injects Gemini/GenAI credentials. The following direct dependencies should be checked for active imports before the dependency-remediation commit:

- `firebase`
- `@firebase/eslint-plugin-security-rules`
- `@google/genai`

If they are unused, remove them with npm so the lockfile is regenerated cleanly. Do not remove them by editing `package.json` alone.

`shadcn` also introduces a vulnerable tooling chain in the current audit. Determine whether the package is required at runtime or only used as a development/code-generation tool before changing it. The audit's suggested forced downgrade is not acceptable without an explicit compatibility review.

## Required verification after remediation

Run all of the following from a clean install:

```sh
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npm test
npm run build
docker build -t enawuga-synthetic-demo:pr .
npm run test:e2e
```

The dependency remediation must not reintroduce Firebase execution, Gemini key injection, live identity/payment connectivity, remote GhostSync delivery, regulated mode, or unsafe historical financial routes.

## Scope note

P0-A remains a synthetic prototype. Dependency remediation is necessary for repository hygiene and safer development, but clearing the package audit alone would not make Enawuga production-ready, authorize a pilot, or satisfy the P0-B requirements for authentication, durable idempotency, encrypted storage, approved Ethiopia-resident infrastructure, key custody, partner contracts and regulated operational controls.
