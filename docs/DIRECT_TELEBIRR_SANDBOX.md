# Direct Telebirr sandbox workstream

**Status:** T1–T6 bounded sandbox controls implemented; payment initiation remains blocked by provider-contract gate  
**Branch:** `feat/telebirr-sandbox-adapter`  
**Baseline:** `023a0919a44a28241711331a2dfc115e530d2294`  
**Environment:** Telebirr developer/test environment only  
**Data:** synthetic only  
**Live funds / production authority:** not enabled

## Scope

This workstream adds a direct Ethio telecom Telebirr integration path behind Enawuga's payment-gateway boundary, separate from ArifPay. Direct Telebirr provenance must remain distinct from Telebirr reached through ArifPay.

No Telebirr sandbox credential, app secret, merchant private key, short code or account-specific identifier is committed to Git, browser code, documentation examples or CI output.

## Current provider-contract boundary — 2026-10-12

Current Ethio telecom material establishes Telebirr Payment/TestBed tooling, `/payment/v1/token`, the `/payment/v1/merchant/preOrder` family, `payment.preorder`, ETB Checkout signing fields, RSA SHA-256/MGF1 signing, merchant-side private-key custody, and account/product subscription requirements.

Current H5/MiniApp documentation says the backend supplies a `rawRequest` to SuperApp start-pay and demonstrates a client callback. Enawuga does **not** treat that client callback as authoritative payment or settlement evidence.

The exact active-account `queryOrder` endpoint/request/response lifecycle and terminal states have not been pinned from authoritative current text. Reviewed public material also does not establish server-to-server `notify_url` authentication/signature/replay rules sufficient for authoritative reconciliation. Therefore no status-network client or authoritative callback receiver is enabled.

Project account-export evidence pins the developer/test gateway and token header/body shape. Older create-order and `prepay_id` behavior remain compatibility evidence only. Sandbox credentials/private-key material remain outside Git and disabled-TLS examples are not copied.

## Architecture

```text
PaymentGatewayAdapter
├── ArifPaySandboxAdapter
└── TelebirrSandboxAdapter
```

`TELEBIRR / DIRECT_TELEBIRR` remains distinct from `TELEBIRR / ARIFPAY`.

## Implemented controls

### T1 — sandbox configuration guard
Sandbox-only mode, networking off by default, HTTPS required, test gateway pinned, alternate/production gateway rejected, URL credentials forbidden, server-side secrets only, placeholder `.env.example`.

### T2 — canonical request signing
Deterministic flattened alphabetical canonicalization and RSA-PSS/SHA-256 MGF1 signing. CI uses generated synthetic keys only.

### T3 — guarded fabric-token client
Server-side `/payment/v1/token` acquisition with explicit network opt-in and controlled failures. No payment operation and no token logging/persistence/browser exposure.

### T4 — pure signed preorder builder
Constructs but does not submit a signed `payment.preorder` request using unique merchant-order ID/nonce, integer ETB minor units and only pinned fields.

### T5 — bounded preorder-response classification
`ORDER_CREATED` requires non-empty `prepay_id` exactly bound to the submitted merchant-order ID. Binding mismatch/malformed data fails closed. Every classification retains `paymentConfirmed=false` and `settlementConfirmed=false`.

### T6 — durable pre-submit correlation intent
`src/domain/telebirrPreorderIntent.ts` and `src/server/telebirr-preorder-intent-persistence.ts` reserve Enawuga `transactionId`, canonical `customerId`, `idempotencyKey`, Telebirr `merchantOrderId`, nonce, timestamp/title and integer ETB amount **before any future provider mutation**.

Controls include identical-idempotent replay, changed-payload conflict, transaction replay prevention, merchant-order replay prevention, nonce replay prevention, restart durability, malformed/duplicate state rejection, correlation lookup, and atomic versioned local JSON replacement.

The snapshot stores **no app secret, private key, access token, request signature, callback payload or provider payment state**. It is a bounded synthetic reservation record, not a payment ledger, production outbox or residency evidence.

## Remaining gates before C2B payment networking

1. Verify active developer-account C2B Web Checkout subscription/scope.
2. Pin current `preOrder` response and checkout/raw-request assembly contract.
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

Only documentation changed after that green code head. Normal CI on the final documentation head closes the evidence chain. Existing development/tooling findings remain 23 (2 low, 4 moderate, 17 high); the existing >500 kB Vite advisory remains non-blocking.

## Next implementation after provider-contract pinning

Add provider-network preorder only after subscription/scope and response/checkout verification; require T6 reservation before mutation; map results only to gateway-scoped states; expose through authenticated AGENT/customer controls without secrets/provider references; add `queryOrder` reconciliation only after authoritative status-contract capture; test uncertainty/replay/restart; and add callbacks only after authenticity is verifiable.

## Claim boundary

> This workstream implements direct Telebirr developer/test configuration, request signing, token acquisition, local signed preorder construction, bounded preorder-response classification and durable pre-submit correlation reservation using synthetic test evidence. It does not submit a Telebirr preorder, initiate or confirm a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
