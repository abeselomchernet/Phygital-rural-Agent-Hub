# Enawuga / Phygital Rural Agent Hub

**Prototype / Synthetic Demo.** Wishland Networking PLC provides technology and orchestration only. A future licensed PartnerFI must own regulated customer accounts and liabilities, authorization, posting, lending and settlement within its authorized scope. This project is separate from Model 6.

There are no live bank, Fayda, TIN, payment-provider, Firebase or Gemini integrations. This repository does not establish production readiness, pilot authorization or regulatory approval.

## Development

Validated with Node 24 and npm 11. Dependencies are locked in `package-lock.json`.

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run test:e2e
```

The Express/Vite demo defaults to loopback port 3000. No secrets, Redis or PostgreSQL are required. Playwright starts its own synthetic server on port 3010. Install its Chromium with `npx playwright install --with-deps chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for an installed browser.

## Boundaries implemented

- Immutable internal `customerId` UUID is the only customer foreign key in transaction requests. Phone is an operational alias; changing it preserves identity and requires re-verification. Alias collisions are rejected.
- KYC state transitions and transaction eligibility live in domain services. Normal transactions do not invoke the mock identity provider. Phone possession is not identity proof.
- Mock Fayda supports explicit verification/re-verification, storing opaque references only. FIN/FAN belongs only in a future approved onboarding-provider interaction, never routine transaction lookup. No biometric data is collected. Offline QR/FaydaEncode verification is unsupported pending official terms and approvals.
- Mock PartnerFI owns simulated account values. Wishland orchestrates requests; it does not hold funds or issue accounts. Partner acceptance in this simulation does not mean real settlement.
- GhostSync persists synthetic transaction envelopes in IndexedDB. Remote delivery remains disabled. Delivery acknowledgment, partner authorization and reconciliation are separate states.
- `DATA_MODE=regulated` fails startup/build, including when residency says `ET`. Approved infrastructure, key custody, access control and partner contracts do not exist yet. External cloud development is synthetic-only.

## UI scope

`/kiosk`, `/farmer-360` and `/onboard` use the shared synthetic customer workflow. The phone selector permits only declared fixture aliases. Kiosk requests enter the local outbox; an explicit separate action demonstrates mock partner authorization. It does not deliver the outbox. Supervisor fleet data remains a demo; agent admission is disabled. The legacy camera/OTP/FIN transaction paths and arbitrary identity form persistence were removed; their history is preserved in Git.

Other financial scenario screens are read-only legacy illustrations, with financial controls disabled pending migration; they are not authoritative financial services. See the security backlog for further consolidation. Browser storage is unencrypted and unsuitable for real identity or financial data. Existing legacy `GhostSyncDB` records are retained in place and never auto-migrated or uploaded.

See [operating model](docs/OPERATING_MODEL.md), [architecture](SYSTEM_ARCHITECTURE.md), [data policy](docs/DATA_RESIDENCY_AND_CLASSIFICATION.md), [runbook](RUNBOOK.md), and [remaining P0 blockers](docs/P0_BACKLOG.md).
