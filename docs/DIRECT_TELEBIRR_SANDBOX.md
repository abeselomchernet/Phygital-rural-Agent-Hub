# Direct Telebirr sandbox workstream

**Status:** first bounded adapter slice implemented; payment initiation still blocked by contract gate  
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

The current developer portal exposes Telebirr Payment tooling and currently lists:

- developer registration / credentials;
- Payment API and Payment Integration guidance;
- TestBed host application;
- Sign Tool;
- Python, C#, Java, Node.js and PHP demos;
- B2B Web Checkout demo;
- C2B Web Checkout demo;
- MiniApp / SuperApp payment integration guidance.

The public API catalog also lists **C2B Web Checkout** as an available integration product.

Current portal support material explicitly states that fabric-token acquisition should use:

`/payment/v1/token`

with the application secret in the request body. This supersedes older `fabricToken` routing.

Current portal support/examples identify the C2B create-order path as:

`/payment/v1/merchant/preOrder`

but provider-network payment initiation is still blocked in this workstream until the active account's subscribed product/scope and response contract are verified.

Current request-signature documentation states that payment requests use RSA key pairs. The merchant keeps the private key and shares the public key with the service provider. For the current `payment.preorder` example, the signing input:

1. excludes `sign` and `sign_type`;
2. flattens the business-content fields into `key=value` pairs;
3. sorts field names A-z;
4. joins them with `&`;
5. signs the resulting string using the documented SHA-256 with RSA MGF1 process.

Current examples include `method=payment.preorder`, `version=1.0`, `appid`, `merch_code`, unique `merch_order_id`, `trade_type=Checkout`, `title`, `total_amount`, `trans_currency=ETB`, `timeout_express`, `notify_url`, `sign`, and `sign_type=SHA256WithRSA`.

The current documentation family also exposes a `queryOrder` page for C2B Web Payment. The exact active-account query endpoint/request/response lifecycle has **not** yet been captured from authoritative current text, so no status-network client is implemented yet.

### Project account-export evidence

The project-supplied Telebirr developer-portal export records the developer/test gateway as:

`https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway`

and shows token acquisition using:

- `POST <base>/payment/v1/token`;
- `Content-Type: application/json`;
- `X-APP-Key: <fabric app id>`;
- JSON body `{ "appSecret": "..." }`;
- response fields including `token`, `effectiveDate`, and `expirationDate`.

The same export contains sandbox credential/private-key material. Those values are treated as secrets and are intentionally excluded from Git, documentation examples and CI.

The export's historical Python example disables TLS verification. Enawuga **does not copy that behavior**; HTTPS certificate and hostname validation remain mandatory.

### Compatibility evidence only

Older account/demo code and community libraries are useful for discovering names such as `queryOrder`, but they do not override current Ethio telecom documentation or the active account contract. Raw IP examples, old `/payment/v1/inapp/createOrder` routing and disabled-TLS snippets are not authoritative configuration.

## Architecture

The direct adapter remains separate from ArifPay:

```text
PaymentGatewayAdapter
├── ArifPaySandboxAdapter
└── TelebirrSandboxAdapter
```

Route provenance MUST distinguish at least:

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

`src/domain/telebirrSandbox.ts` defines a strict `TelebirrSandboxConfig`.

Controls include:

- `mode` must be `sandbox`;
- provider networking is false unless explicitly enabled;
- HTTPS is mandatory;
- the developer/test gateway is pinned to the project account-export origin/path;
- production/alternate gateway URLs fail closed;
- URL-embedded credentials are forbidden;
- Fabric App ID, app secret, merchant app ID, merchant code and private key remain server-side configuration only;
- private-key material accepts PEM or the portal-export bare PKCS#8 base64 representation without logging or persistence.

`.env.example` contains placeholders only. It does not contain the project's sandbox credential values.

## Implemented — T2 canonical request signing

The same module provides:

- one-level `biz_content` flattening;
- exclusion of `sign` and `sign_type` from canonical input;
- deterministic alphabetical key ordering;
- `key=value` joining using `&`;
- RSA-PSS / SHA-256 signing with MGF1 semantics and 32-byte salt, matching the current public signing example;
- base64 signature output only.

CI uses freshly generated synthetic RSA keys. No project Telebirr private key is used in automated tests.

## Implemented — T3 guarded fabric-token client

`TelebirrSandboxTokenClient` implements only credential bootstrap:

- provider network call is blocked unless `TELEBIRR_SANDBOX_NETWORK_ENABLED=true`;
- token URL is `<sandbox base>/payment/v1/token`;
- Fabric App ID is sent only in `X-APP-Key`;
- app secret is sent only in the JSON request body;
- malformed, authentication, provider rejection and network failures map to controlled errors;
- token values are returned to server-side caller code only and are not logged, persisted or exposed to browser code by this slice.

This client **does not create an order, initiate a payment, query payment status, receive callbacks or change any Enawuga financial state**.

## Security requirements before payment initiation

The direct Telebirr adapter MUST continue to:

- keep app secret/private key/access token server-side only;
- never expose key material or access tokens to the browser;
- never disable TLS certificate or hostname verification;
- use only the approved Telebirr developer/test origin for sandbox mode;
- fail closed if a production origin/credential mode is supplied;
- use unique Enawuga transaction and Telebirr merchant-order identifiers;
- persist submission intent before any provider payment mutation;
- treat timeout/network ambiguity as uncertain, never failed-by-inference;
- distinguish order creation/payment initiation from provider-confirmed payment;
- preserve direct-Telebirr route provenance in reconciliation;
- avoid real customer PII until a later approved data/partner gate explicitly allows it;
- reuse the existing authenticated session, CSRF, object-authorization, audit and reconciliation patterns.

## Remaining contract gates before C2B payment code

1. Confirm the active developer account is subscribed/authorized for the intended C2B Web Checkout API scope.
2. Confirm the current `preOrder` response schema and checkout/raw-request assembly required by that subscribed product.
3. Confirm whether any account-specific fields beyond the current public example are mandatory.
4. Capture the exact current `queryOrder` endpoint, request shape, response lifecycle and terminal statuses from authoritative account/current documentation.
5. Establish server-to-server `notify_url` callback authentication/signature and replay rules before treating any callback as authoritative.
6. Confirm any TestBed consumer/account identifiers needed for a synthetic network smoke test.

Until those gates are satisfied, **no direct Telebirr payment initiation network code is enabled**.

## Validation targets for this slice

Tests cover:

- sandbox/test gateway pinning;
- HTTPS and production/alternate-host rejection;
- environment loader network-off default;
- exact documented canonical signing string;
- RSA-PSS SHA-256 sign/verify using generated keys;
- PEM and bare-PKCS#8 key normalization;
- token-client network-disable behavior;
- token request URL/header/body shape;
- token response parsing;
- controlled auth/malformed/network error mapping.

## Next implementation slice after the remaining contract pinning

1. one C2B `preOrder` path only;
2. durable pre-submit intent and merchant-order idempotency;
3. provider result mapped to gateway-scoped states only;
4. authenticated AGENT/customer route with no provider secret/reference exposure;
5. read-only `queryOrder` reconciliation after the authoritative status contract is captured;
6. synthetic provider rejection, timeout/uncertainty, replay and restart tests;
7. callback handling only after authenticity is verifiable.

## Claim boundary

> This workstream currently implements direct Telebirr developer/test configuration, request signing and fabric-token acquisition using synthetic test evidence. It does not initiate a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
