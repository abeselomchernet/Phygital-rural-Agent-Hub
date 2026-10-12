# Direct Telebirr sandbox workstream

**Status:** T1–T6 bounded sandbox controls implemented; payment initiation remains blocked by provider-contract gate  
**Branch:** `feat/telebirr-sandbox-adapter`  
**Baseline:** `023a0919a44a28241711331a2dfc115e530d2294`  
**Environment:** Telebirr developer/test environment only  
**Data:** synthetic only  
**Live funds / production authority:** not enabled

## Scope

Direct Ethio telecom Telebirr integration remains separate from ArifPay. `TELEBIRR / DIRECT_TELEBIRR` provenance must remain distinct from `TELEBIRR / ARIFPAY`.

No Telebirr sandbox credential, app secret, merchant private key, short code or account-specific identifier is committed to Git, browser code, documentation examples or CI output.

## Current provider-contract boundary — 2026-10-12

Current Ethio telecom material establishes Telebirr Payment/TestBed tooling, `/payment/v1/token`, the `/payment/v1/merchant/preOrder` family, `payment.preorder`, ETB Checkout signing fields, RSA SHA-256/MGF1 signing, merchant-side private-key custody, and account/product subscription requirements.

Current H5/MiniApp documentation says the backend supplies a `rawRequest` to SuperApp start-pay and demonstrates a client callback. Enawuga does **not** treat that client callback as authoritative payment or settlement evidence.

The exact active-account `queryOrder` endpoint/request/response lifecycle and terminal states have not been pinned from authoritative current text. Reviewed public material also does not establish server-to-server `notify_url` authentication/signature/replay rules sufficient for authoritative reconciliation. No status-network client or authoritative callback receiver is enabled.

Project account-export evidence pins the developer/test gateway and token header/body shape. Older create-order and `prepay_id` behavior remain compatibility evidence only. Sandbox credentials/private-key material remain outside Git and disabled-TLS examples are not copied.

## Implemented controls

- **T1 sandbox configuration guard:** sandbox-only mode, network off by default, HTTPS, pinned test gateway, no URL credentials, server-side secrets only.
- **T2 canonical request signing:** deterministic flattened canonical string and RSA-PSS/SHA-256 MGF1 signing with synthetic CI keys.
- **T3 guarded fabric-token client:** server-side `/payment/v1/token`, explicit network opt-in, controlled failures, no token exposure/persistence.
- **T4 pure signed preorder builder:** constructs but does not submit `payment.preorder`; unique order ID/nonce and integer ETB minor units.
- **T5 bounded preorder-response classifier:** exact order binding; `ORDER_CREATED` is never payment/settlement confirmation.
- **T6 durable pre-submit correlation intent:** reserves Enawuga transaction/customer/idempotency plus Telebirr merchant-order ID/nonce before any future provider mutation; restart/idempotency/transaction/order/nonce replay controls; atomic versioned local persistence.

T6 snapshots store **no app secret, private key, access token, request signature, callback payload or provider payment state**. They are bounded synthetic reservation records, not payment ledgers, production outboxes or residency evidence.

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

Add provider-network preorder only after subscription/scope and response/checkout verification; require T6 reservation before mutation; map results only to gateway-scoped states; expose through authenticated AGENT/customer controls without secrets/provider references; add `queryOrder` reconciliation only after authoritative status-contract capture; test uncertainty/replay/restart; add callbacks only after authenticity is verifiable.

## Claim boundary

> This workstream implements direct Telebirr developer/test configuration, request signing, token acquisition, local signed preorder construction, bounded preorder-response classification and durable pre-submit correlation reservation using synthetic test evidence. It does not submit a Telebirr preorder, initiate or confirm a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
