# Direct Telebirr sandbox workstream

**Status:** bounded config/signing/token/preorder-construction/response-classification/durable-intent slices implemented; payment initiation still blocked by contract gate  
**Branch:** `feat/telebirr-sandbox-adapter`  
**Baseline:** `023a0919a44a28241711331a2dfc115e530d2294`  
**Environment:** Telebirr developer/test environment only  
**Data:** synthetic only  
**Live funds / production authority:** not enabled

## Purpose

This workstream adds a **direct Ethio telecom Telebirr adapter** behind Enawuga's payment-gateway boundary. It is separate from the merged ArifPay adapter. A Telebirr transaction routed through ArifPay and a direct Telebirr merchant integration are different routes and MUST retain different provenance.

No Telebirr sandbox credential, app secret, merchant private key, short code or account-specific identifier is committed to Git, browser code, documentation examples or CI output.

## Current contract boundary — 2026-10-12

Current Ethio telecom material establishes the Telebirr Payment/TestBed tooling, `/payment/v1/token`, the `/payment/v1/merchant/preOrder` family, `payment.preorder`, ETB Checkout signing fields, RSA SHA-256/MGF1 request signing, merchant-side private-key custody, and account/product subscription requirements.

Current H5/MiniApp documentation says a merchant backend supplies a `rawRequest` to the SuperApp start-pay API and demonstrates a client callback. Enawuga does **not** treat that client callback as authoritative payment or settlement evidence.

The exact active-account `queryOrder` endpoint/request/response lifecycle and terminal states have not been pinned from authoritative current text, and reviewed public material does not establish a server-to-server `notify_url` authentication/signature/replay contract sufficient for authoritative reconciliation. No status-network client or authoritative callback receiver is enabled.

Project account-export evidence pins the developer/test gateway and token header/body shape. Its older create-order flow and `prepay_id` behavior are compatibility evidence only. Sandbox credentials/private-key material remain outside Git. Historical disabled-TLS examples are not copied.

## Architecture

```text
PaymentGatewayAdapter
├── ArifPaySandboxAdapter
└── TelebirrSandboxAdapter
```

Direct-route provenance remains `provider=TELEBIRR / route=DIRECT_TELEBIRR`, distinct from `provider=TELEBIRR / route=ARIFPAY`.

## Implemented controls

### T1 — sandbox configuration guard

Sandbox-only mode, networking false by default, HTTPS mandatory, developer/test gateway pinned, alternate/production gateway rejected, URL credentials forbidden, provider secrets server-side only, and placeholders only in `.env.example`.

### T2 — canonical request signing

One-level business-content flattening, deterministic alphabetical `key=value` canonicalization, RSA-PSS/SHA-256 MGF1 signing, base64 output, and generated synthetic CI keys only.

### T3 — guarded fabric-token client

Server-side token acquisition through `/payment/v1/token`, `X-APP-Key`, JSON `appSecret`, explicit network opt-in, controlled errors, and no token logging/persistence/browser exposure. It does not create an order or payment.

### T4 — pure signed preorder builder

Builds but does not submit a signed `payment.preorder` request using unique merchant-order ID/nonce, integer ETB minor units and only pinned request fields. `/payment/v1/merchant/preOrder` is exported as a future client path constant only.

### T5 — bounded preorder-response classification

Local-only classification. `ORDER_CREATED` requires a non-empty `prepay_id` exactly bound to the submitted alphanumeric merchant-order ID. Binding mismatch/malformed responses fail closed. All states keep `paymentConfirmed=false` and `settlementConfirmed=false`. Provider response signatures remain non-authoritative until their current verification contract is pinned.

### T6 — durable pre-submit correlation intent

`src/domain/telebirrPreorderIntent.ts` and `src/server/telebirr-preorder-intent-persistence.ts` provide a provider-independent persist-before-submit reservation.

The reservation binds Enawuga `transactionId`, canonical `customerId`, `idempotencyKey`, Telebirr `merchantOrderId`, Telebirr `nonce`, timestamp/title, ETB amount in integer minor units and ETB currency.

It provides:

- identical idempotent replay -> existing reservation;
- changed payload under the same key -> `IDEMPOTENCY_CONFLICT`;
- repeated Enawuga transaction -> `TRANSACTION_REPLAY`;
- repeated merchant-order ID -> `TELEBIRR_MERCHANT_ORDER_REPLAY`;
- repeated nonce -> `TELEBIRR_NONCE_REPLAY`;
- restart durability;
- malformed/duplicate persisted-state rejection;
- lookup by Enawuga transaction ID or merchant-order ID;
- atomic versioned local JSON replacement.

The snapshot deliberately stores **no app secret, private key, access token, request signature, callback payload or provider payment state**. It is a bounded synthetic reservation record, not a payment ledger, production outbox or residency evidence.

## Remaining gates before any C2B payment network mutation

1. Verify the active developer account's C2B Web Checkout subscription/scope.
2. Pin the current `preOrder` response and checkout/raw-request assembly contract.
3. Pin any account-specific required request fields.
4. Pin authoritative current `queryOrder` endpoint/request/response/status lifecycle.
5. Establish authoritative server-to-server `notify_url` authentication/signature/replay rules.
6. Confirm TestBed synthetic consumer/account identifiers.

Until those gates are satisfied, **no direct Telebirr payment initiation is enabled**.

## Validation evidence

T6 code validation — GitHub Actions run `38298524544`, code head `93819d53a82caa369493edc62453d72d11c181c7`:

- Node 24.21.0 / npm 11.19.0;
- `npm ci`: pass — 576 packages;
- production dependency audit: **0 vulnerabilities**;
- TypeScript/lint: pass;
- unit/domain/API tests: **105/105 pass**;
- production build: pass;
- Docker build: pass;
- Chromium E2E: **13/13 pass**.

T6 tests cover restart durability, idempotency conflict, transaction replay, merchant-order replay, nonce replay, secret/signature exclusion from snapshots, malformed/duplicate persistence and unsafe identifier rejection.

Only documentation changed after the green T6 code head. Normal CI on the final documentation head closes the evidence chain. Existing development/tooling findings remain 23 (2 low, 4 moderate, 17 high); the existing >500 kB Vite bundle advisory remains non-blocking.

## Next implementation after provider-contract pinning

Add the provider-network preorder client only after subscription/scope and response/checkout verification; require T6 reservation before mutation; map provider result only to gateway-scoped states; expose through authenticated AGENT/customer controls without secrets/provider references; add read-only `queryOrder` reconciliation only after authoritative status-contract capture; test uncertainty/replay/restart; and add callbacks only after authenticity is verifiable.

## Claim boundary

> This workstream implements direct Telebirr developer/test configuration, request signing, token acquisition, local signed preorder construction, bounded preorder-response classification and durable pre-submit correlation reservation using synthetic test evidence. It does not submit a Telebirr preorder, initiate or confirm a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
