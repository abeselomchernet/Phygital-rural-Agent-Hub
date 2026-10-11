# Synthetic prototype runbook

Use only synthetic fixtures. Wishland supplies software; future licensed partners are responsible for regulated activity. No production/pilot approval is implied.

## Start and validate

```sh
npm ci
DATA_MODE=synthetic ALLOW_EXTERNAL_TELEMETRY=false npm run dev
# In another shell:
npm run lint
npm test
npm run build
TARGET_PORT=3000 npx tsx scripts/smoke-test.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

Use bundled Playwright Chromium by omitting the executable variable if installed. Browser tests start an isolated process on 3010 and use fresh browser contexts; API tests start ephemeral loopback listeners. No cloud services are contacted. `npm test` includes unit and API integration tests.

`NODE_ENV=production npm start` serves a previously built static frontend with the same synthetic API. The name production here is only the asset-serving mode; it is not permission to use regulated data. `DATA_MODE=regulated` must exit with a fatal validation error. Build-time validation also fails closed.

The synthetic server must restart after backend edits; Vite provides frontend transforms. In-memory customer IDs, aliases and mock partner postings reset on restart. Browser outbox entries remain, so stale customer references require deliberate review; never remap them silently to a new customer.

## Storage and troubleshooting

No Redis/PostgreSQL dependencies exist in the active mock workflow. Docker Compose runs only the synthetic Node service. Vercel's SPA-only deployment cannot supply the Express demo API; use the Node workflow for functional testing.

Remote GhostSync remains disabled. Offline insertion and retry do not authorize payments or settle funds. Keep legacy GhostSyncDB untouched; do not upload old entries. No browser-storage reset is necessary for normal development. Any deletion of historical user-entered data requires explicit authorization.

A blocked KYC request requires the mock re-verification flow, not direct state editing or a biometric bypass. A phone change retains the customer UUID. Administrative suspended-account recovery has no HTTP endpoint.

See [P0 backlog](docs/P0_BACKLOG.md) before designing a real receiver, deployment or external connector.
