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

## Evidence hierarchy and contract status — 2026-10-12

### Current public Ethio telecom evidence

The current developer portal exposes Telebirr Payment tooling including developer credentials, Payment APIs/integration guidance, TestBed, Sign Tool, language demos, B2B/C2B Web Checkout demos and MiniApp/SuperApp payment guidance.

Current portal material establishes:

- fabric-token path `/payment/v1/token` with app secret in the request body;
- C2B preorder path family `/payment/v1/merchant/preOrder`;
- `payment.preorder`, `version=1.0`, `trade_type=Checkout`, ETB and the current signing-field family;
- RSA signing with SHA-256/RSA-MGF1 semantics;
- merchant private key remains merchant-side;
- `merch_order_id` must be non-null, unique and alphanumeric;
- API/product subscription is required before the account may invoke the create-order interface.

Current H5/MiniApp checkout documentation says the merchant backend produces a `rawRequest`, which the frontend passes to the SuperApp start-pay API. It also shows a client-side callback after the payment interaction. Enawuga does **not** treat that client callback as authoritative payment or settlement evidence.

The current public documentation/navigation references order-query behavior, but the exact active-account `queryOrder` endpoint/request/response lifecycle and terminal-status contract have **not** been captured from authoritative current Ethio telecom text. Public material reviewed on 2026-10-12 also does not establish a server-to-server `notify_url` authentication/signature/replay contract sufficient for authoritative reconciliation.

Therefore no status-network client or authoritative callback receiver is enabled.

### Project account-export evidence

The project-supplied Telebirr developer-portal export records the developer/test gateway as:

`https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway`

and shows token acquisition using:

- `POST <base>/payment/v1/token`;
- `Content-Type: application/json`;
- `X-APP-Key: <fabric app id>`;
- JSON body `{ "appSecret": "..." }`;
- response fields including `token`, `effectiveDate`, and `expirationDate`.

The export also shows an older create-order compatibility flow where a successful response supplies `biz_content.prepay_id`, while failure examples may contain null `merch_order_id` / `prepay_id`. That evidence supports bounded local response classification but does **not** establish the current `/payment/v1/merchant/preOrder` network response/checkout contract or authoritative `queryOrder` lifecycle.

The export contains sandbox credential/private-key material. Those values remain secrets and are excluded from Git, docs examples and CI. The historical demo also disables TLS verification; Enawuga **does not copy that behavior**.

### Compatibility evidence only

Older account/demo code and community libraries may expose names such as `queryOrder` or historical raw-request assembly, but they do not override current Ethio telecom documentation or the active-account contract. Raw IP examples, old `/payment/v1/inapp/createOrder` routing, guessed status mappings and disabled-TLS snippets are not authoritative configuration.

## Architecture

```text
PaymentGatewayAdapter
├── ArifPaySandboxAdapter
└── TelebirrSandboxAdapter
```

Route provenance MUST distinguish:

```text
provider = TELEBIRR
route = DIRECT_TELEBIRR
```

from:

```text
provider = TELEBIRR
route = ARIFPAY
```

## Implemented — T1 sandbox configuration guard

`src/domain/telebirrSandbox.ts` defines strict sandbox configuration:

- `mode=sandbox` only;
- provider networking false unless explicitly enabled;
- HTTPS mandatory;
- developer/test gateway pinned to account-export evidence;
- alternate/production gateway rejected;
- URL credentials forbidden;
- Fabric App ID, app secret, merchant app ID/code and private key server-side only;
- PEM or bare PKCS#8 private-key input supported without logging/persistence;
- unresolved redirect/H5 parameters omitted until their current contract is pinned.

`.env.example` contains placeholders only.

## Implemented — T2 canonical request signing

- excludes `sign` / `sign_type` from canonical input;
- flattens one-level `biz_content`;
- deterministic alphabetical key ordering;
- `key=value` joined with `&`;
- RSA-PSS / SHA-256 with MGF1 semantics and 32-byte salt;
- base64 signature output only;
- CI uses generated synthetic RSA keys, never project key material.

## Implemented — T3 guarded fabric-token client

`TelebirrSandboxTokenClient` implements credential bootstrap only:

- `POST <sandbox base>/payment/v1/token`;
- `X-APP-Key` contains Fabric App ID;
- body contains only `appSecret`;
- networking blocked unless explicitly enabled;
- controlled auth/provider/network/malformed errors;
- token remains server-side and is not logged/persisted/exposed to browser code.

It does **not** create an order, initiate payment, query status, receive callbacks or change financial state.

## Implemented — T4 pure signed `payment.preorder` builder

`buildTelebirrPreorderRequest` constructs but does **not submit** a C2B request.

It:

- accepts unique alphanumeric merchant order ID + nonce;
- uses explicit timestamp/title and integer ETB minor units;
- converts minor units without floating-point arithmetic;
- includes only currently pinned public request fields;
- excludes unresolved historical/demo-only `business_type`, `redirect_url`, `callback_info` and payee fields;
- signs server-side;
- exports `/payment/v1/merchant/preOrder` only as a future client path constant.

## Implemented — T5 bounded preorder-response classification

`src/domain/telebirrPreorderResponse.ts` adds local classification without provider networking.

The classifier:

- recognizes explicit provider rejection separately from malformed/unverified responses;
- requires non-empty `prepay_id` plus **exact** alphanumeric `merch_order_id` binding for `ORDER_CREATED`;
- returns `RESPONSE_BINDING_MISMATCH` for a different order ID;
- never trims/normalizes provider identifiers into a match;
- returns `RESPONSE_UNVERIFIED` for missing/malformed binding;
- keeps `paymentConfirmed=false` and `settlementConfirmed=false` for every state;
- does not claim provider response-signature verification until the active response-signature/public-key contract is pinned.

`ORDER_CREATED` means only that the bounded response contains a prepay reference bound to the exact merchant-order identifier. It is not payment confirmation.

## Implemented — T6 durable pre-submit correlation intent

`src/domain/telebirrPreorderIntent.ts` and `src/server/telebirr-preorder-intent-persistence.ts` add a provider-independent persist-before-submit safety primitive.

Before any future Telebirr preorder mutation may be wired, the intent store can atomically reserve:

- Enawuga `transactionId`;
- canonical `customerId`;
- `idempotencyKey`;
- Telebirr `merchantOrderId`;
- Telebirr `nonce`;
- timestamp/title;
- ETB amount in integer minor units;
- currency fixed to ETB.

Controls:

- identical idempotent reservation returns the existing intent;
- same idempotency key with changed payload -> `IDEMPOTENCY_CONFLICT`;
- same Enawuga transaction under a different key -> `TRANSACTION_REPLAY`;
- reused merchant-order ID -> `TELEBIRR_MERCHANT_ORDER_REPLAY`;
- reused nonce -> `TELEBIRR_NONCE_REPLAY`;
- reservation survives local synthetic restart;
- malformed or duplicated persisted state fails closed;
- lookup by Enawuga transaction ID or merchant-order ID supports future reconciliation binding;
- snapshot is versioned and atomically replaced using the existing bounded synthetic persistence pattern.

The snapshot deliberately stores **no app secret, private key, access token, request signature, callback payload or provider payment state**.

This is a local synthetic-development reservation record only. It is not proof that Telebirr received an order, not a payment ledger, not an exactly-once production outbox and not Ethiopia-residency evidence.

## Security requirements before payment initiation

The direct Telebirr adapter MUST continue to:

- keep app secret/private key/access token server-side only;
- never expose key material or access tokens to browser code;
- never disable TLS certificate/hostname verification;
- use only the approved developer/test origin in sandbox mode;
- fail closed on production/alternate origin or mode;
- persist the provider-correlation intent before any provider mutation;
- use unique Enawuga transaction, merchant-order ID and nonce;
- treat timeout/network ambiguity as uncertain, never failure-by-inference;
- distinguish order creation/payment initiation from provider-confirmed payment;
- preserve `DIRECT_TELEBIRR` route provenance;
- avoid real customer PII until a later approved partner/data gate;
- reuse authenticated session, CSRF, object authorization, audit and reconciliation controls.

## Remaining contract gates before C2B payment network code

1. Confirm this developer account is subscribed/authorized for the intended C2B Web Checkout API scope.
2. Confirm the current `preOrder` response and checkout/raw-request assembly contract for that subscribed product.
3. Confirm any account-specific required request fields beyond the public signing example.
4. Capture authoritative current `queryOrder` endpoint, request shape, response lifecycle and terminal statuses.
5. Establish server-to-server `notify_url` callback authentication/signature and replay rules before treating callbacks as authoritative.
6. Confirm TestBed synthetic consumer/account identifiers for a network smoke test.

Until these gates are satisfied, **no direct Telebirr payment initiation network code is enabled**.

## Validation evidence

T5 exact-head validation was green at `df3db0026e6a6b5b1138b9cc1ab26c2ff66d9fe0`: 98/98 unit/domain/API tests and 13/13 Chromium E2E.

T6 code validation was green on GitHub Actions run `38298524544` at code head `93819d53a82caa369493edc62453d72d11c181c7`:

- Node 24.21.0 / npm 11.19.0;
- `npm ci`: pass — 576 packages;
- production dependency audit: **0 vulnerabilities**;
- TypeScript/lint: pass;
- unit/domain/API tests: **105/105 pass**;
- production build: pass;
- Docker build: pass;
- Chromium E2E: **13/13 pass**.

T6 adds tests for restart durability, idempotency conflict, transaction replay, merchant-order replay, nonce replay, secret/signature exclusion from snapshots, malformed/duplicate persistence and unsafe identifier rejection.

A docs-only follow-up records this milestone; the current PR head must also pass the same normal CI before the evidence chain is considered closed.

Existing development/tooling findings remain 23 (2 low, 4 moderate, 17 high). The existing Vite >500 kB bundle advisory remains non-blocking.

## Next implementation slice after contract pinning

1. provider-network C2B `preOrder` client only after active-account subscription/scope and response/checkout contract verification;
2. require the T6 durable reservation before the first provider mutation;
3. map provider result to gateway-scoped states only;
4. authenticated AGENT/customer route with no provider secret/reference exposure;
5. read-only `queryOrder` reconciliation only after authoritative status contract capture;
6. rejection, timeout/uncertainty, replay and restart tests;
7. callback handling only after authenticity is verifiable.

## Claim boundary

> This workstream currently implements direct Telebirr developer/test configuration, request signing, fabric-token acquisition, local construction of signed C2B preorder requests, bounded local preorder-response classification, and durable pre-submit provider-correlation reservation using synthetic test evidence. It does not submit a Telebirr preorder, initiate or confirm a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
