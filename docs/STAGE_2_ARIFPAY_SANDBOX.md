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
- C2B rail paths are provider-specific after session creation (for example Telebirr and M-Pesa session/direct transfer paths);
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

## Implemented slice S2-A

`src/domain/paymentGateway.ts` adds:

- a `PaymentGatewayAdapter` boundary separate from `FinancialInstitutionAdapter`;
- `ArifPaySandboxAdapter` for C2B hosted-checkout orchestration;
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
- returned amount mismatch, when the provider returns an amount field, → `OUTCOME_UNCERTAIN`;
- identical retries return the recorded local result and do not auto-post again.

## Validation evidence

Draft PR #5 initial CI run #103 passed after the first adapter foundation:

- production dependency audit: 0 vulnerabilities;
- TypeScript/lint: pass;
- 66/66 tests: pass;
- production build: pass;
- Docker build: pass;
- Chromium E2E: 12/12 pass.

The current Sandbox Postman contract was then pinned and the adapter/tests updated accordingly; the post-update CI result is recorded on PR #5.

A direct synthetic POST was also attempted from the ChatGPT execution container after the current endpoint was verified. The container could not resolve `gateway.arifpay.org` (`curl: Could not resolve host`), so no request reached ArifPay and no provider response was observed. This is recorded as an execution-environment DNS limitation, not an ArifPay failure.

## Not implemented yet

The following remain Stage 2 work and must not be inferred from S2-A:

- successful end-to-end network execution against ArifPay sandbox from an environment with outbound DNS/network access;
- durable restart-safe payment-gateway result persistence;
- ArifPay transaction/session/nonce verification adapter;
- verified webhook authenticity/receiver contract;
- payment-gateway reconciliation service and replay store;
- server HTTP routes and UI integration;
- Operations/Reconciliation dashboard;
- B2C, wallet-to-bank, OTP/direct-payment or other rails;
- production host/key support.

## Required progression

1. Re-run one synthetic C2B checkout from an approved development environment that can reach `gateway.arifpay.org`.
2. Add durable gateway state before relying on idempotency across restarts.
3. Pin current transaction/session/nonce verification endpoints from official ArifPay documentation/collection and implement read-only reconciliation.
4. Treat checkout creation as non-terminal; verify/reconcile before any terminal business state.
5. Add callback handling only after the current provider callback-authentication mechanism is verified. A raw webhook payload alone is not trusted authority.
6. Keep PartnerFI authorization/settlement and physical cash-in/cash-out outside the payment-gateway adapter.

## Claim boundary

> This work demonstrates guarded payment-gateway orchestration against current ArifPay sandbox contracts. It does not represent a live cash-in/cash-out deployment, a PartnerFI account, PartnerFI settlement, or production payment authorization.
