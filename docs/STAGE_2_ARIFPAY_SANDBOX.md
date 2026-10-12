# Stage 2 — ArifPay sandbox integration

**Status:** implementation in progress  
**Environment:** sandbox only  
**Data:** synthetic only  
**Live funds / PartnerFI settlement authority:** not enabled

## Current official-source findings — 2026-10-12

Current ArifPay Developer Portal and its linked Sandbox Postman collection confirm:

- sandbox collection base URL: `https://gateway.arifpay.org`;
- sandbox testing must not use production hosts;
- authentication uses `x-arifpay-key`;
- the portal sandbox uses the fixed public test key `arif-sandbox-portal-key`;
- the sandbox collection explicitly states **no live PSP calls**;
- sandbox simulator requests may use `x-arifpay-sim-mode: SUCCESS|FAIL`;
- sandbox-only fee-source header supports `CUSTOMER|MERCHANT`;
- hosted C2B sandbox session creation is `POST /api/sandbox/c2b/session`;
- current session-create body uses callback URLs, simulator `phone`/`email`, unique `nonce`, `expireDate`, `amount`, `items`, and `lang`;
- C2B rail paths are provider-specific after session creation;
- API responses use an `{ error, msg, data }` envelope while merchant `notifyUrl` webhooks are raw JSON;
- documented lifecycle states include `SUCCESS`, `PENDING`, `FAILED`, `CANCELED`, and `EXPIRED`;
- nonce/session lifecycle errors include duplicate nonce, expired/not-found sessions, and already-successful/already-failed sessions.

Primary current sources:

- `https://developer.arifpay.net/docs/overview`
- `https://developer.arifpay.net/docs/laravel/overview`
- `https://developer.arifpay.net/docs/api-errors`
- `https://developer.arifpay.net/docs/wallet-to-bank`
- `https://developer.arifpay.net/postman/ArifPay-Sandbox.postman_collection.json`
- `https://developer.arifpay.net/postman/ArifPay-Production.postman_collection.json`

## Official SDK compatibility note

ArifPay's older official TypeScript SDK remains historical/request-shape evidence only. It hard-codes the historical `.net/v0` host and an older checkout path/payload. Stage 2 uses the current developer-portal sandbox contract and does not copy the legacy SDK routing.

## Implemented — S2-A guarded C2B adapter

`src/domain/paymentGateway.ts` provides:

- `PaymentGatewayAdapter` separate from `FinancialInstitutionAdapter`;
- sandbox-only `ArifPaySandboxAdapter`;
- exact sandbox-origin and sandbox-key guards;
- explicit network-enable switch;
- pinned current checkout path `/api/sandbox/c2b/session`;
- fixed documented simulator phone/email rather than customer PII;
- controlled ETB minor-unit mapping;
- idempotency conflict and transaction replay protection;
- timeout/network/5xx/malformed response → `OUTCOME_UNCERTAIN`;
- duplicate/session-lifecycle response → `RECONCILIATION_REQUIRED`;
- successful session creation → `CHECKOUT_CREATED`, never settlement;
- amount mismatch → `OUTCOME_UNCERTAIN`;
- identical retries return the recorded local result and do not auto-post again.

## Implemented — S2-B durable synthetic gateway state

`src/domain/paymentGatewayState.ts` and `src/server/payment-gateway-persistence.ts` provide bounded local development durability:

- strict versioned gateway snapshot schema;
- atomic JSON replacement following the existing P0-B synthetic persistence pattern;
- submission intent persisted **before** any provider call;
- provider result persisted after the call;
- restart-safe identical retry without reposting;
- restart with only a pre-submit intent fails closed as `GATEWAY_RECOVERY_RECONCILIATION_REQUIRED`;
- persisted idempotency and transaction-replay conflicts fail closed;
- durable lookup by transaction ID for reconciliation;
- malformed durable state fails closed.

This remains single-process synthetic development storage, not a production transactional outbox, approved regulated ledger, exactly-once guarantee, or Ethiopia-residency evidence.

## Implemented — S2-C authenticated checkout boundary

The synthetic API exposes:

`POST /api/demo/payments/arifpay/c2b/checkout`

The route:

- reuses the existing server-side synthetic session;
- requires CSRF on mutation;
- requires `AGENT` role;
- requires customer object authorization;
- accepts only the strict bounded gateway request;
- rejects client-supplied phone or other extra fields;
- is unavailable by default when no payment gateway is configured;
- surfaces unresolved restart state as reconciliation required rather than reposting;
- records controlled redacted gateway audit events without keys, provider payloads, customer phone/email, provider references, or idempotency keys.

## Verified sandbox status contract

The public Sandbox Postman collection does not list the same generic verification requests as the Production collection. A bounded series of temporary GitHub Actions probes therefore tested only documented production route families against the official sandbox using synthetic simulator data.

Observed evidence:

1. Sandbox session creation returned HTTP `200` and a session reference.
2. Sandbox Telebirr simulator transfer `POST /api/sandbox/c2b/telebirr-ussd/transfer` returned HTTP `200`, a transaction reference, and `SUCCESS` in the simulator response.
3. Production verify-by-session and verify-by-nonce paths returned `404` on the sandbox host.
4. Production `GET /api/checkout/session/{sessionId}` rejected the sandbox session with the explicit message: `This Session is not production. use test route instead.`
5. The sandbox-prefixed session route was then tested:

   `GET /api/sandbox/checkout/session/{sessionId}`

   It returned HTTP `200`, `data` present, message `No Errors`, and provider status `SUCCESS` for the synthetic completed session.
6. Sandbox-prefixed nonce, generic verify, and transaction-ID verification variants returned `404` and are **not** used.

The temporary probe workflow was deleted after evidence capture. Normal CI does not depend on ArifPay network availability.

## Implemented — S2-D provider-backed reconciliation

`src/domain/paymentGatewayReconciliation.ts` and `src/server/payment-gateway-reconciliation-persistence.ts` add a read-only, session-ID-based reconciliation path using only the verified sandbox endpoint.

Provider lifecycle mapping is deliberately gateway-scoped:

- `PENDING` → `PAYMENT_PENDING`;
- `SUCCESS` → `GATEWAY_CONFIRMED`;
- `FAILED` → `GATEWAY_FAILED`;
- `CANCELED` / `CANCELLED` → `GATEWAY_CANCELED`;
- `EXPIRED` → `GATEWAY_EXPIRED`;
- unknown/malformed/network/HTTP uncertainty → `OUTCOME_UNCERTAIN`.

`GATEWAY_CONFIRMED` means ArifPay's sandbox reports the payment session successful. It does **not** mean PartnerFI settlement, Wishland-held funds, physical cash settlement, or production payment finality.

Reconciliation safeguards:

- status is bound to the recorded checkout transaction/customer/session;
- no arbitrary provider session ID is accepted from the client;
- reconciliation state is locally restart-durable;
- terminal gateway states are sticky and are not re-polled into a regression;
- network/5xx/404/auth/malformed status responses never become payment failure or success by inference;
- provider session IDs/transaction references are not written into the controlled audit schema.

The synthetic API now also exposes:

`POST /api/demo/payments/arifpay/c2b/reconcile`

This route:

- requires the existing authenticated session and CSRF protection;
- is restricted to `SUPERVISOR` or `PARTNER_ADMIN`;
- requires customer object authorization;
- accepts only `customerId` and Enawuga `transactionId`;
- looks up the provider session server-side from durable checkout evidence;
- records controlled reconciliation audit events;
- remains unavailable by default unless the guarded ArifPay sandbox runtime is explicitly configured.

`server.ts` wires checkout plus reconciliation only when `ARIFPAY_MODE=sandbox` is explicitly configured, and requires `SYNTHETIC_STATE_DIR` before provider networking can be enabled.

## Validation evidence

Earlier Stage 2 milestones:

- run #103: 66/66 tests, 12/12 Chromium E2E;
- run #108: 71/71 tests, 12/12 Chromium E2E;
- run #113: 75/75 tests, production audit 0, lint/build/Docker pass, 12/12 Chromium E2E.

Final S2-D reconciliation validation is recorded on Draft PR #5 after the reconciliation implementation and temporary-probe removal.

The existing development/tooling dependency findings and Vite bundle-size advisory remain separate non-production follow-up items; production dependency audit remains the blocking dependency check.

## Successful sandbox-network evidence

A one-time GitHub Actions smoke run (`38266511796`) submitted one synthetic session-create request to the official sandbox and observed:

- HTTP `200`;
- `error:false`;
- message `Sandbox session created`;
- session reference present.

Subsequent bounded reconciliation probes established the session-ID sandbox status route described above. All temporary provider-probe workflows were removed after evidence capture.

No production credential, real customer PII, real money, or live PSP call was involved.

## Provider-contract gap that remains

The portal documents raw JSON merchant notifications to `notifyUrl`, but no callback-signature/authentication mechanism has been established from the reviewed sandbox contract. Raw provider webhooks therefore remain **non-authoritative** in Enawuga and no production-style webhook receiver is enabled.

## Not implemented yet

- authoritative provider webhook ingestion, pending a verifiable callback-authentication mechanism;
- Operations/Reconciliation dashboard UI over the new reconciliation service;
- B2C, wallet-to-bank, OTP/direct-payment, or other rails;
- direct Telebirr or direct M-Pesa adapters;
- production host/key support.

## Required progression

1. Keep session-ID reconciliation as the authoritative sandbox read path for the current C2B slice.
2. Add callback handling only after provider callback authenticity is explicitly verifiable.
3. Build Operations/Reconciliation UX on top of the verified reconciliation service, not raw callback trust.
4. Treat any future direct Telebirr/M-Pesa integrations as separate provider adapters with their own contracts and credentials.
5. Keep PartnerFI authorization/settlement and physical cash-in/cash-out outside the payment-gateway adapter.

## Claim boundary

> This work demonstrates guarded ArifPay sandbox C2B orchestration plus provider-backed session-ID reconciliation using synthetic simulator traffic. It does not represent a live PSP transaction, live cash-in/cash-out deployment, a PartnerFI account, PartnerFI settlement, or production payment authorization.
