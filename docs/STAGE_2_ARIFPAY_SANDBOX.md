# Stage 2 — ArifPay sandbox integration

**Status:** implementation in progress  
**Environment:** sandbox only  
**Data:** synthetic only  
**Live funds / PartnerFI settlement authority:** not enabled

## Current official-source findings — 2026-10-12

Current ArifPay Developer Portal material confirms:

- sandbox collection base URL: `https://gateway.arifpay.org`;
- sandbox testing must not use production hosts;
- authentication uses `x-arifpay-key`;
- the portal sandbox uses the fixed test key identified as `arif-sandbox-portal-key`;
- hosted checkout supports C2B payment collection;
- transaction/session identifiers are used for verification and reconciliation;
- API responses use an `{ error, msg, data }` envelope while merchant webhooks are raw JSON;
- nonce/session lifecycle errors include duplicate nonce (`session already exist`), expired/not-found sessions, and already-successful/already-failed sessions.

Primary current sources:

- `https://developer.arifpay.net/docs/overview`
- `https://developer.arifpay.net/docs/api/overview`
- `https://developer.arifpay.net/docs/api-errors`
- `https://developer.arifpay.net/docs/get-api-keys`

## Official SDK compatibility note

ArifPay's older official TypeScript SDK (`Arifpay-net/typescript-sdk`) is useful for request/response shape evidence. It models checkout creation with:

- `cancelUrl`, `errorUrl`, `notifyUrl`, `successUrl`;
- unique `nonce`;
- `paymentMethods`;
- `expireDate`;
- `items`;
- `beneficiaries`;
- checkout response fields `sessionId`, `paymentUrl`, `cancelUrl`, `totalAmount`.

However, that SDK hard-codes the historical host `https://gateway.arifpay.net/v0` and, in sandbox mode, calls `/sandbox/checkout/session`. The current portal now directs sandbox collections to `https://gateway.arifpay.org`.

**Governance decision:** do not combine the new host with the legacy path by assumption. The adapter therefore requires `ARIFPAY_SANDBOX_CHECKOUT_PATH` to be supplied from the current Sandbox/Postman contract before network activation.

## Implemented slice S2-A

`src/domain/paymentGateway.ts` adds:

- a `PaymentGatewayAdapter` boundary separate from `FinancialInstitutionAdapter`;
- `ArifPaySandboxAdapter` for C2B hosted-checkout orchestration;
- exact sandbox-origin guard;
- fixed portal-sandbox-key guard for this stage;
- explicit network enable switch;
- explicit current checkout path requirement;
- server-side beneficiary and callback/redirect configuration;
- no customer phone, FIN/FAN, biometric or PartnerFI credential in checkout payloads;
- integer minor-unit input with controlled ETB major-unit mapping;
- idempotency conflict and transaction replay protection;
- timeout/network/5xx/malformed response → `OUTCOME_UNCERTAIN`;
- duplicate/session-lifecycle response → `RECONCILIATION_REQUIRED`;
- successful session creation → `CHECKOUT_CREATED`, never settlement;
- amount mismatch → `OUTCOME_UNCERTAIN`;
- identical retries return the recorded local result and do not auto-post again.

## Not implemented yet

The following remain Stage 2 work and must not be inferred from S2-A:

- current sandbox checkout path verification from the current ArifPay Sandbox/Postman collection;
- real network call against ArifPay sandbox;
- durable restart-safe payment-gateway result persistence;
- ArifPay transaction/session verification adapter;
- authenticated/verified ArifPay webhook receiver contract;
- payment-gateway reconciliation service and replay store;
- server HTTP routes and UI integration;
- Operations/Reconciliation dashboard;
- B2C, wallet-to-bank, OTP/direct-payment or other rails;
- production host/key support.

## Required progression

1. Obtain/inspect current official Sandbox/Postman endpoint path and request fields.
2. Set the checkout path only after that verification.
3. Exercise one synthetic C2B checkout with sandbox-only configuration.
4. Add verification/status reconciliation before treating any asynchronous result as terminal.
5. Add callback handling only after the current provider callback-authentication contract is verified. A raw webhook payload alone is not trusted authority.
6. Keep PartnerFI authorization/settlement and physical cash-in/cash-out outside the payment-gateway adapter.

## Claim boundary

> This work demonstrates payment-gateway orchestration using ArifPay sandbox contracts. It does not represent a live cash-in/cash-out deployment, a PartnerFI account, PartnerFI settlement, or production payment authorization.
