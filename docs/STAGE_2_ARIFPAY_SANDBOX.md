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
- sandbox simulator requests may use `x-arifpay-sim-mode: SUCCESS|FAIL`;
- sandbox-only fee-source header supports `CUSTOMER|MERCHANT`;
- hosted C2B sandbox session creation is `POST /api/sandbox/c2b/session`;
- current session-create body uses `cancelUrl`, synthetic simulator `phone`, synthetic `email`, unique `nonce`, `errorUrl`, `notifyUrl`, `successUrl`, `expireDate`, `amount`, `items`, and `lang`;
- the official collection's generic simulator success phone is `251911000000` and its sandbox email is `sandbox@example.com`;
- the collection extracts a session reference from `data.sessionId`, `data.uuid`, or a top-level `sessionId`;
- C2B rail paths are provider-specific after session creation;
- API responses use an `{ error, msg, data }` envelope while merchant `notifyUrl` webhooks are raw JSON;
- nonce/session lifecycle errors include duplicate nonce (`session already exist`), expired/not-found sessions, and already-successful/already-failed sessions.

Primary current sources:

- `https://developer.arifpay.net/docs/overview`
- `https://developer.arifpay.net/docs/laravel/overview`
- `https://developer.arifpay.net/docs/api-errors`
- `https://developer.arifpay.net/docs/get-api-keys`
- `https://developer.arifpay.net/postman/ArifPay-Sandbox.postman_collection.json`

## Official SDK compatibility note

ArifPay's older official TypeScript SDK (`Arifpay-net/typescript-sdk`) remains useful historical/request-shape evidence but is not authoritative for the current portal sandbox routing. It hard-codes `https://gateway.arifpay.net/v0` and uses an older `/sandbox/checkout/session` pattern with fields including `paymentMethods` and `beneficiaries`.

The current developer-portal Sandbox Postman collection instead uses `https://gateway.arifpay.org/api/sandbox/c2b/session` and the current sandbox session fields listed above.

**Governance decision:** the current developer-portal Sandbox Postman collection controls Stage 2 sandbox routing. The adapter does not use the older `.net/v0` host/path or beneficiary-based checkout payload.

## Implemented — S2-A guarded C2B adapter

`src/domain/paymentGateway.ts` provides:

- `PaymentGatewayAdapter` separate from `FinancialInstitutionAdapter`;
- sandbox-only `ArifPaySandboxAdapter`;
- exact sandbox-origin guard;
- fixed portal-sandbox-key guard for this stage;
- explicit network enable switch;
- pinned current checkout path `/api/sandbox/c2b/session`;
- fixed documented simulator phone/email rather than customer PII;
- current session-create request mapping with amount/items/lang and callback URLs;
- sandbox simulation headers pinned to `SUCCESS` + `MERCHANT` for the initial happy-path contract;
- integer minor-unit input with controlled ETB major-unit mapping;
- idempotency conflict and transaction replay protection;
- timeout/network/5xx/malformed response → `OUTCOME_UNCERTAIN`;
- duplicate/session-lifecycle response → `RECONCILIATION_REQUIRED`;
- successful session creation → `CHECKOUT_CREATED`, never settlement;
- returned amount mismatch, when present, → `OUTCOME_UNCERTAIN`;
- identical retries return the recorded local result and do not auto-post again.

## Implemented — S2-B durable synthetic gateway state

`src/domain/paymentGatewayState.ts` and `src/server/payment-gateway-persistence.ts` provide bounded local development durability:

- strict versioned gateway snapshot schema;
- atomic JSON replacement using the same bounded synthetic pattern as existing P0-B persistence;
- submission intent persisted **before** any provider call;
- provider result persisted after the call;
- restart-safe identical retry returns the saved result without reposting;
- restart with only a pre-submit intent fails closed as `GATEWAY_RECOVERY_RECONCILIATION_REQUIRED`;
- persisted idempotency and transaction-replay conflicts fail closed;
- malformed durable state fails closed.

This is single-process synthetic development storage, not a production transactional outbox, approved regulated ledger, exactly-once guarantee or Ethiopia-residency evidence.

## Implemented — S2-C authenticated server boundary

The synthetic API now exposes:

`POST /api/demo/payments/arifpay/c2b/checkout`

The route:

- reuses the existing server-side synthetic session;
- requires CSRF on mutation;
- requires `AGENT` role;
- requires customer object authorization;
- accepts only the strict bounded gateway request (`customerId`, `transactionId`, `idempotencyKey`, `amountMinor`, `currency=ETB`);
- rejects client-supplied phone or other extra fields;
- is unavailable by default when no payment gateway is configured;
- surfaces unresolved restart state as reconciliation required rather than reposting;
- records controlled redacted gateway audit events without keys, provider payloads, customer phone/email, provider references or idempotency keys.

`server.ts` wires the real sandbox adapter only when `ARIFPAY_MODE=sandbox` is explicitly configured. ArifPay sandbox mode also requires `SYNTHETIC_STATE_DIR`, so provider submission cannot be enabled without the bounded durable pre-submit state.

## Validation evidence

Draft PR #5 initial run #103 passed with 66/66 tests and 12/12 Chromium E2E.

After current Postman contract alignment and durable state, run #108 passed with:

- Node 24.21.0 / npm 11.19.0;
- production dependency audit: 0 vulnerabilities;
- TypeScript/lint: pass;
- 71/71 tests: pass;
- production build: pass;
- Docker build: pass;
- Chromium E2E: 12/12 pass.

The authenticated server-boundary integration is validated by the current PR #5 CI head.

A direct synthetic POST was attempted from the ChatGPT execution container after the current endpoint was verified. The container could not resolve `gateway.arifpay.org` (`curl: Could not resolve host`), so no request reached ArifPay and no provider response was observed. This is an execution-environment DNS limitation, not an ArifPay failure.

## Provider-contract gaps that remain

The current production Postman collection publishes generic verification routes by session UUID, nonce and transaction ID. The current **sandbox** Postman collection does not publish those same generic verification requests. Stage 2 therefore does not assume production verification paths apply to the sandbox host.

The current portal describes raw JSON merchant notifications to `notifyUrl`, but no verified callback-signature/authentication mechanism has been established in the reviewed sandbox contract. Raw webhook payloads are therefore not authoritative in Enawuga.

## Not implemented yet

- successful end-to-end network execution against ArifPay sandbox from an environment with outbound DNS/network access;
- verified current sandbox transaction/session/nonce status endpoint;
- provider-backed read-only verification/reconciliation service;
- authenticated provider webhook receiver, pending an explicit authenticity mechanism;
- Operations/Reconciliation dashboard based on authoritative provider status;
- B2C, wallet-to-bank, OTP/direct-payment or other rails;
- production host/key support.

## Required progression

1. Execute one synthetic C2B checkout from an approved development environment that can reach `gateway.arifpay.org`.
2. Obtain/verify ArifPay's current sandbox status/verification contract.
3. Implement read-only provider reconciliation; checkout creation remains non-terminal.
4. Add provider callback handling only after callback authenticity is explicitly verifiable.
5. Build Operations/Reconciliation UX on top of verified status/reconciliation, not raw callback trust.
6. Keep PartnerFI authorization/settlement and physical cash-in/cash-out outside the payment-gateway adapter.

## Claim boundary

> This work demonstrates guarded payment-gateway orchestration against current ArifPay sandbox contracts. It does not represent a live cash-in/cash-out deployment, a PartnerFI account, PartnerFI settlement, or production payment authorization.
