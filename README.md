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

The responsive presentation shell restores the rural-agent product breadth without live-integration claims. English, Amharic and Afaan Oromoo headings/navigation are available; detailed domain controls remain English, and translations need local-speaker review.

Frontend productization uses one governed application with Agent, Supervisor, Operations and Partner Admin portals. The current implementation adds a Wishland/Enawuga application design system and a governed Hub overview while keeping server authorization authoritative. See [frontend architecture](docs/frontend/FRONTEND_ARCHITECTURE.md), [Wishland/Enawuga brand and design system](docs/frontend/WISHLAND_BRAND_AND_DESIGN_SYSTEM.md), the [frontend delivery plan](docs/frontend/FRONTEND_DELIVERY_PLAN.md), and the bounded F1-F5 implementation notes under `docs/frontend/`.

- `/kiosk`: implemented local customer/request workflow plus synthetic inventory, liquidity planning, printer-slip and training concepts.
- `/farmer-360`: proposed read-only agriculture, vouchers, climate/insurance, solar PAYG, carbon, diaspora, procurement and PartnerFI service portfolio.
- `/onboard`: read-only readiness stages beside the existing mock identity workflow; no PII form, camera or real agent admission.
- `/queue` and `/data-mule`: local outbox, conflict learning and illustrative handoff. No remote delivery or settlement.
- `/hub`: governed Hub/partner/role/environment context and explicit Stage-4 authority boundaries.
- `/hub/economics`: Stage-4 model assumptions/outputs with observed variance explicitly unavailable.
- `/hub/pilot-evidence`: P1-P11 synthetic evidence states with no scale or pilot authorization.
- `/hub/corridor`: E7 synthetic corridor candidate comparison with geographic authorization explicitly not granted.
- `/hub/readiness`: E8 operator/device readiness evidence without activation or remote device-control authority.
- `/hub/neutrality`: E9 synthetic neutrality/governance evidence; route comparison never authorizes interchangeability or fallback.
- `/operations/evidence`: E4 offline/reconciliation evidence for Operations/Partner Admin; transport remains separate from settlement.
- `/supervisor`: synthetic fleet map/table/pagination; device controls disabled; readiness and transport concepts.
- `/transcription`: fixed authored dialogue; no microphone or speech service.
- `/node-status`: deterministic architecture samples, explicitly not operational telemetry.

Every module labels its status. IMPLEMENTED describes local software only. External Vercel SPA previews show the product portfolio while explaining that the Express customer API is unavailable; they never fabricate customer/account state as a fallback. Historical financial pages remain in source/Git but are not mounted. Their routes display proposed capabilities.

Browser storage is unencrypted and unsuitable for real identity or financial data. Legacy `GhostSyncDB` records remain untouched and are never auto-migrated or uploaded. See the [product-preservation inventory](docs/PRODUCT_PRESERVATION_REVIEW.md).

See [operating model](docs/OPERATING_MODEL.md), [architecture](SYSTEM_ARCHITECTURE.md), [data policy](docs/DATA_RESIDENCY_AND_CLASSIFICATION.md), [runbook](RUNBOOK.md), and [remaining P0 blockers](docs/P0_BACKLOG.md).

## P0-B bounded synthetic foundation

See the [P0-B plan](docs/P0_B_PLAN.md), [audit and recovery controls](docs/P0_B_AUDIT_RECOVERY.md), [edge-storage contract/threat model](docs/P0_B_EDGE_SECURITY.md), [Ethiopia staging evidence checklist](docs/P0_B_ET_STAGING_EVIDENCE.md), and [active claims review](docs/P0_B_CLAIMS_REVIEW.md).

The encrypted-edge adapter is an unavailable, fail-closed interface, not encryption for the existing browser database. Partner reconciliation is a local synthetic contract, not a live callback service. Optional JSON persistence is single-process development storage; real regulated infrastructure, atomic audit, key custody and provider contracts remain unapproved.
