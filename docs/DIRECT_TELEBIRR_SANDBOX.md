# Direct Telebirr sandbox workstream

**Status:** contract verification in progress  
**Branch:** `feat/telebirr-sandbox-adapter`  
**Baseline:** `023a0919a44a28241711331a2dfc115e530d2294`  
**Environment:** Telebirr developer/test environment only  
**Data:** synthetic only  
**Live funds / production authority:** not enabled

## Purpose

This workstream adds a **direct Ethio telecom Telebirr adapter** behind Enawuga's payment-gateway boundary. It is separate from the merged ArifPay adapter. A Telebirr transaction routed through ArifPay and a direct Telebirr merchant integration are different routes and MUST retain different provenance.

No Telebirr sandbox credential, app secret, merchant private key, short code or account-specific identifier is committed to Git, browser code, documentation examples or CI output.

## Current official-source findings — 2026-10-12

The current Ethio telecom developer portal exposes Telebirr Payment as a developer product and currently lists:

- developer registration / credentials;
- Payment API guidance;
- Payment Integration guidance;
- TestBed host application;
- Sign Tool;
- Python, C#, Java, Node.js and PHP demos;
- B2B Web Checkout demo;
- C2B Web Checkout demo;
- MiniApp / SuperApp payment integration guidance.

Current portal documentation states that payment requests use request signatures and RSA key pairs. The merchant keeps the private key and shares the public key with the service provider.

For the current `payment.preorder` example, the signature input is built from request parameters excluding `sign` and `sign_type`, arranged as `key=value`, alphabetically sorted, joined with `&`, then signed with the documented SHA-256/RSA process. Current examples include:

- `method=payment.preorder`;
- `version=1.0`;
- `appid`;
- `merch_code`;
- unique `merch_order_id`;
- `trade_type=Checkout`;
- `title`;
- `total_amount`;
- `trans_currency=ETB`;
- `timeout_express`;
- `notify_url` where applicable;
- `sign`;
- `sign_type=SHA256WithRSA`.

The current developer-portal support material also explicitly states that the token endpoint should use:

`/payment/v1/token`

and that the request body includes the merchant `appSecret`. This supersedes older examples that used a `fabricToken` path.

Portal examples/support material identify the create-order relative path as:

`/payment/v1/merchant/preOrder`

and indicate that access uses a token plus application identity. The exact account-scoped header/base-origin contract MUST be verified from the active Telebirr developer account before network code is enabled.

## Source hierarchy for this workstream

1. Current Ethio telecom developer portal documentation and current account API contract.
2. Current Ethio telecom-provided Sign Tool/TestBed/demos.
3. Current official portal support answers where the main documentation is incomplete.
4. Project-supplied historical demos as compatibility evidence only.

Old IP-address examples, disabled-TLS snippets, historical `fabricToken` routing and community examples are **not** authoritative configuration.

## Initial adapter architecture

The direct adapter will remain separate from ArifPay:

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

from an ArifPay-routed Telebirr payment:

```text
provider = TELEBIRR
route = ARIFPAY
```

## Security requirements before implementation

The direct Telebirr adapter MUST:

- keep app secret/private key server-side only;
- never expose private-key material or access tokens to the browser;
- never disable TLS certificate or hostname verification;
- use only the approved Telebirr developer/test origin for sandbox mode;
- fail closed if a production origin/credential mode is supplied;
- use unique Enawuga transaction and Telebirr merchant-order identifiers;
- persist submission intent before the provider call;
- treat timeouts/network ambiguity as uncertain, never failed-by-inference;
- distinguish order creation/payment initiation from provider-confirmed payment;
- preserve direct-Telebirr route provenance in reconciliation;
- avoid real customer PII until a later approved data/partner gate explicitly allows it;
- reuse the existing authenticated session, CSRF, object-authorization, audit and reconciliation patterns.

## Explicit unresolved contract gates

No network adapter should be enabled until all of the following are pinned from the **current active Telebirr sandbox account/API contract**:

1. Exact sandbox/test base origin with valid TLS hostname.
2. Exact token request schema and token response schema for `/payment/v1/token`.
3. Required application/header name(s) for token and `preOrder` calls.
4. Exact current `preOrder` request/response schema for the subscribed C2B product.
5. Exact canonical signing algorithm details for the account/product, including whether the current implementation requires PKCS#1 v1.5 or PSS/MGF1 semantics despite the public `SHA256WithRSA` label.
6. Current order/payment status-query endpoint and response lifecycle.
7. Provider callback/notification authentication and replay rules.
8. Test consumer/account identifiers required by TestBed, if any.
9. Product subscription/scope confirmation for the developer account.

## First implementation slice after contract pinning

The first code slice should be deliberately narrow:

1. `TelebirrSandboxConfig` with strict sandbox-origin/mode guards.
2. server-side credential/key loader with no secret logging.
3. canonical request-signing helper with deterministic test vectors.
4. token client.
5. one C2B `preOrder` path only.
6. durable pre-submit intent + idempotency/replay protection.
7. provider result mapped to gateway-scoped states only.
8. authenticated API route behind existing AGENT/customer controls.
9. read-only provider status reconciliation once the current status endpoint is pinned.
10. synthetic tests for signature determinism, invalid key/config, token failure, provider rejection, timeout/uncertainty, replay and restart recovery.

## Claim boundary

> This workstream is for direct Telebirr developer/test integration using synthetic data. It does not represent production Telebirr connectivity, live customer payment authority, PartnerFI settlement, Wishland-held funds, physical cash authority, or regulatory authorization.
