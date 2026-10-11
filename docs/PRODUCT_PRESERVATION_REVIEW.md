# P0-A product-preservation review

Comparison: c495a2198c0d814a416794b57d9cc2470bf2bcbc → original P0-A head 1f9c6580e932ef685364c547ddb071c06f401297. Architecture remains accepted. This review restores presentation without restoring financial or identity authority. Historical implementations remain in Git.

A = unsafe/misleading; keep removed. B = useful UX restored/redesigned safely. C = future capability, visibly disabled/documented. D = duplicate/obsolete implementation.

| Original screen / user capability | Class | Disposition |
| --- | --- | --- |
| Kiosk: English, Amharic, Afaan Oromoo navigation and tablet layout | B | Responsive workspace, translated presentation/navigation; domain controls remain English and this limitation is shown |
| Kiosk: cash-in/out keypad and transaction entry | B/D | Retain amount entry and accessible request controls in shared domain workbench; obsolete duplicate keypad handlers not restored |
| Kiosk: local float/commission mutation, successful payout/dispense claims | A | Only explicit Mock PartnerFI result may affect simulated account state |
| Kiosk: balances and morning liquidity/LCR illustration | B | Separate synthetic planning scenario; sliders never touch account state |
| Kiosk: inventory/restock list and quantities | B | Local restock draft illustration; no order is sent or stock paid for |
| Kiosk: Bluetooth discovery, printer connection and receipt | B/C | Preview-only hardware/receipt concept; no device APIs, connection or payment receipt claim |
| Kiosk: FIN lookup, OTP and high-value biometric bypass/camera | A | Keep removed; phone alias/customerId and explicit mock KYC retained |
| Kiosk: instant bank account opening, SMS/USSD payment confirmation | A/C | Claims removed; approved partner account/messaging integration remains visibly disabled |
| Kiosk: Farmer portfolio, Equb, PAYG, insurance, relief, vouchers, procurement, market buffer, carbon and diaspora actions | B/C | Restore portfolio presentation as proposed/read-only; execution disabled |
| Farmer360: multilingual profile/service portfolio and ecosystem exploration | B | Restore portfolio cards, feature explanations and boundaries beside shared customer workbench |
| Farmer360: FIN search, fake scan/OTP, real-bank ledger provisioning, cash/SMS success toasts | A | Keep removed; no personal data capture or fake external action |
| Farmer360: score/credit access claims and privacy guarantee | A/C | Proposed scoring/review shown without credit entitlement or unimplemented privacy guarantees |
| GhostSync: queue list, states, counts, event details, local retry | B | Restore visual transport timeline, cards, details and retry using real synthetic outbox |
| GhostSync: collision manifest, sequence/timestamp comparison and review concepts | B | Synthetic side-by-side conflict learning card; no actual payload reconciliation |
| GhostSync: combine amounts, arbitrary nonce edits, 'reconciled perfectly', void/delete authority | A | No financial merge/void action; do not modify or discard historical records |
| GhostSync: automatic upload/force sync | A/C | Gate remains closed; future authenticated durable receiver explicitly documented |
| GhostSync: legacy bulk delete/select/reset and duplicate localStorage conflict engine | D | Superseded by safer review-only presentation; historical records untouched |
| OnboardAgent: four-stage identity/business/device/training wizard and progress | B | Read-only synthetic readiness walkthrough, no form PII or approval submission |
| OnboardAgent: identity/TIN format checks presented as verification, scanner, fake POS provisioning | A/C | Keep false checks removed; real verification/provisioning remains disabled |
| OnboardAgent: storing complete identity/commercial form in IndexedDB | A | Keep removed; walkthrough stores no form data |
| OnboardAgent: confirmation beep/confetti and duplicated OTP logic | D | Redundant feedback not restored as evidence of verification |
| Supervisor: fleet map/table, pagination, synthetic agent detail and inventory views | B | Fleet map/table, pagination and details retained; labels and responsive containment improved; data remains synthetic |
| Supervisor: onboarding form, biometric/TIN probe and instant admission | A | Keep removed; replace disabled panel with readiness walkthrough |
| Supervisor: terminal lock, mesh receipt and restock demonstration | B/C | Explicit local simulation labels; never describe actual device control or transport |
| DataMule: discovery/pull/core sequence animation | B | Restore as synthetic transport walkthrough with no network, upload or settlement |
| LiveTranscription: multilingual transcript display, start/stop/clear/export concepts | B/C | Load/clear fixed synthetic dialogue; external speech capture and recording disabled |
| LiveTranscription: browser speech/microphone capture | A/C | Keep disabled pending privacy/residency approval |
| DemoPresenter: tour navigation/audio storytelling | B/C | Product overview and training concepts restored; old audio's false operational claims remain inactive |
| GhostSyncWidget: queue count/offline status | B | Queue counts and local retry remain in the redesigned outbox; old widget and false connection animation are not mounted |
| Agent academy: learning progression and education | B | Restore a field-practice exercise and readiness stages; no rewards, certification or agent authority |
| Legacy financial screens: unsupported issuance/settlement buttons | A/C | Old executable screens are not mounted; their routes show proposed read-only service cards. Historical source remains available |
| Infrastructure/ISO GET fixtures | B | Deterministic fixtures inside explicit synthetic response envelopes; no operational infrastructure claims |

Each redesigned module displays IMPLEMENTED, SYNTHETIC DEMO, PROPOSED, or DISABLED PENDING PARTNER AUTHORIZATION. IMPLEMENTED describes local software behavior only, never an approved external integration. External Vercel SPA previews show the portfolio even when the Express API is absent; transaction controls require that API and do not silently fall back to fabricated customer state.


## Active implementation and terminology

`ProductPresentation.tsx` and its scoped CSS provide the shared shell, capability legend, translated presentation headings, inventory draft, liquidity scenario, receipt/device preview, training note, portfolio, readiness stages, conflict comparison, transport walkthrough and fixed dialogue. `CustomerWorkbench` remains the only transactional UI and still calls the existing P0-A customer/KYC/PartnerFI and outbox code.

Active routes no longer mount the old AppLayout ticker, DemoPresenter audio, JudgeTicker, GhostSyncWidget or legacy financial pages. Their source/history remains available, but their runtime claims and alternate interactions are not reintroduced. `/judge-ticker` now shows the explicit demo architecture. Legacy service routes resolve to proposed portfolio cards. `/academy` now shows the synthetic learning exercise and readiness walkthrough.

The former infrastructure dashboard was replaced by deterministic educational CPU/memory/latency samples and an unprovisioned-component map. `NAGA-NODE`, `Sovereign Node/Nexus`, Raxio/GCP/Fabric/EthSwitch production claims are absent from active API fixtures and mounted presentation. The actual health check identifies Enawuga and marks its data mode. The illustrative ISO snippet explicitly disclaims conformance and transmission.

All remaining presentation GET endpoints return `{ simulated: true, dataMode: "synthetic", capabilityStatus: "SYNTHETIC DEMO", data: ... }`. Preferred paths are `/api/demo/agents`, `/api/demo/swaps`, `/api/demo/infrastructure`, `/api/demo/iso20022/logs`, `/api/demo/statements/:agentId`; old GET paths remain as clearly marked compatibility aliases. Customer/account/lookup responses retain their existing field shape and add synthetic metadata. No new financial or identity endpoint was introduced.

React/ReactDOM type packages were missing from the original manifest. They were added to validate the new JSX composition correctly; this exposed and corrected three legacy JSX prop errors without activating those legacy components.

## Recovery and validation evidence

The interrupted pass was recovered on `p0-a-regulatory-identity-residency-boundaries` at `1f9c6580e932ef685364c547ddb071c06f401297`. The two untracked files, this inventory and `src/components/ProductPresentation.tsx`, were retained and extended; no reset, stash, branch replacement or discarded work occurred. Origin/main remained `c495a2198c0d814a416794b57d9cc2470bf2bcbc`.

Ardi's active technical explanations now describe manual sample inputs and local arithmetic, not Fayda data capture, neural inference, proven fairness or smart-contract allocation. The calculation button is named `Compute Demo Score`; its existing browser test follows that accurate label. Financial/domain and GhostSync implementation files remain unchanged in this preservation pass.

Validation commands: `npm run lint`, `npm test`, `npm run build`, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`, and `git diff --check`. The suites cover 27 domain/API cases and 10 browser cases. The multi-route layout test has a 120-second budget for fourteen complete navigations; its overflow and synthetic-state assertions remain intact. Build retains the nonfatal large-chunk advisory.

Local built SPA review covered kiosk, Farmer360, queue, supervisor, onboarding, Data Mule, conversation and demo architecture at 1440px and 390px. All sixteen combinations had no document overflow or browser exceptions. Screenshots were inspected for typography, containment and capability labels. SPA-only customer API failure leaves portfolio content visible without fabricating an account or exposing posting controls.

Hosted Vercel review remains **pending**: both existing preview URLs require SSO. The user will configure authorized access separately. No protection settings were changed or bypassed. Deployment-specific deep links, asset loading and API availability remain to be checked on an authorized hosted preview; local SPA fallback is covered. No hosted-only application defect was established.

Production blockers remain in `P0_BACKLOG.md`: partner contracts/roles, durable authorization/idempotency, approved residency and key custody, encrypted edge storage and authorized providers. Translations need local-speaker review. No P0-B work, live integrations, real customer data, merge or production authorization is included.
