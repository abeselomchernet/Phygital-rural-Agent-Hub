# Direct Telebirr sandbox workstream

Status: Draft / sandbox-only / synthetic data only.

This workstream is separate from Telebirr routed through ArifPay. Provider provenance must remain explicit.

## Implemented safety foundation

T1 — strict sandbox configuration and HTTPS/TestBed guard.

T2 — deterministic RSA-PSS/SHA-256 signing using the current Ethio telecom request-signature process.

T3 — guarded fabric-token client for `/payment/v1/token`, network-disabled by default.

T4 — pure signed `payment.preorder` request construction for `/payment/v1/merchant/preOrder`; no provider mutation.

T5 — bounded preorder-response classification. `ORDER_CREATED` is not payment or settlement.

T6 — durable pre-submit correlation intent with idempotency, transaction, merchant-order and nonce replay protection. One canonical persistence implementation only.

T7 — merchant-side read-only `payment.queryorder` request construction and sandbox query client for `/payment/v1/merchant/queryOrder`. The client returns transport/provider payload evidence only and deliberately does not map provider status fields to payment or settlement until the authoritative status-value contract is pinned.

T8 — pure signed H5/SuperApp `rawRequest` construction from `appid`, `merch_code`, `nonce_str`, `prepay_id`, timestamp, sign type and signature. Provider and merchant identifiers are constrained so delimiter injection cannot alter the raw request. The builder performs no provider call and does not invoke client `startPay`.

T9 — pure C2B browser Web Checkout URL construction based on the supplied `C2B_WebCheckoutDemo`. It prefixes the signed raw request with the provider TestBed web paygate and appends `version=1.0&trade_type=Checkout`. It performs no provider call, opens no browser, and does not import B2B `WebCheckout` / `TransferToOtherOrg` semantics.

## Evidence basis

Current Ethio telecom developer-portal documentation confirms:

- Telebirr payment products are registered/subscribed through the developer portal;
- the current H5/MiniApp checkout flow obtains a backend `rawRequest` and hands it to the Telebirr SuperApp `startPay` capability;
- SuperApp/client callbacks are presentation/client completion signals and are not sufficient server-side reconciliation authority;
- outbound payment requests use RSA request signing and the merchant keeps its private key while sharing the public key with the service provider;
- payment API scope/subscription is provider-controlled;
- the current product portal exposes separate C2B and B2B Web Checkout sample demos.

The project-supplied Telebirr H5 material confirms the token → create order → `prepay_id` → raw-request assembly family. Its sample disables TLS verification; Enawuga does not copy that behavior.

The project-supplied `C2B_WebCheckoutDemo` confirms:

- TestBed API base `https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway`;
- TestBed browser paygate base `https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?`;
- C2B preorder endpoint `/payment/v1/merchant/preOrder`;
- C2B preorder `trade_type=Checkout`;
- browser checkout URL assembled from the signed raw request followed by `version=1.0&trade_type=Checkout`.

The project-supplied `B2B_WebCheckoutDemo` is retained as separate product evidence only. It uses `trade_type=WebCheckout`, `business_type=TransferToOtherOrg`, and additional B2B checkout parameters. Those fields are not imported into the current C2B adapter.

The project-supplied Postman collection/environment adds account/TestBed evidence without being copied into GitHub:

- a TestBed base URL/environment;
- merchant/application variables and synthetic consumer variables;
- `POST /payment/v1/token`;
- `POST /payment/v1/merchant/preOrder`;
- `POST /payment/v1/merchant/queryOrder` using method `payment.queryorder` and merchant-order identity only;
- app-side `checkout`, `payOrder` and `checkOrder` requests, which remain outside the current server-side reconciliation slice;
- refund/query-refund request examples, which are not implemented in this bounded C2B workstream.

The two supplied Postman ZIPs are byte-identical copies and therefore constitute one evidence source, not two independent confirmations.

Secrets, private keys, app secrets, consumer PINs, tokens and account-specific identifiers from the supplied material are not stored in this repository.

## Credential handling consequence

The supplied demo/export files visibly contain credential material, including private-key/app-secret style values and synthetic TestBed identity data. Those values are treated as exposed reference material and MUST NOT be promoted into Enawuga runtime configuration.

Before any direct sandbox network activation, provision fresh/reissued TestBed credentials through an approved secret-management path. Do not commit them, paste them into PR comments, browser code, audit logs, snapshots or durable synthetic state.

## Product-contract distinctions

The supplied Postman `CreateOrder` example is an InApp/OpenAPI-style flow with additional payee fields. The current public H5/C2B documentation and C2B Web Checkout demo use the Checkout preorder family. Enawuga does not blend those product contracts.

The C2B and B2B Web Checkout demos are also separate. C2B uses `trade_type=Checkout`; B2B uses `trade_type=WebCheckout` with `business_type=TransferToOtherOrg`. T9 implements only the C2B browser URL handoff.

T7 therefore uses only the merchant `queryOrder` contract for server-side reconciliation. It does not use app-side payer identifiers/PINs or client callback state.

T8 uses only the H5 raw-request field set shown in the supplied Telebirr demo. It does not invoke SuperApp startPay and does not interpret any client callback as payment authority.

T9 constructs only the C2B browser Web Checkout URL. It does not launch navigation, create a provider order, confirm a payment, or establish settlement.

## Exact T9 validation

Head validated before this evidence-only documentation update: `98ecb584118537ea5679436b1987276f3f2e8d73`.
GitHub Actions run: `38308461486`.

- Node 24.21.0 / npm 11.19.0;
- `npm ci`: pass — 576 packages;
- production dependency audit: **0 vulnerabilities**;
- TypeScript/lint: pass;
- unit/domain/API tests: **115/115 pass**;
- production build: pass;
- Docker build: pass;
- Chromium E2E: **13/13 pass**.

Existing full development/tooling findings remain 23 (2 low, 4 moderate, 17 high). The existing Vite >500 kB bundle advisory remains non-blocking.

## Remaining provider gates

Before enabling the first direct Telebirr sandbox preorder network mutation:

1. confirm this account's exact C2B/Web Checkout subscription/scope;
2. provision fresh/reissued sandbox credentials because the supplied export/demo credential material has been exposed in shared artifacts;
3. confirm which supplied TestBed gateway form is authoritative in the execution environment and presents a valid TLS certificate — no insecure-TLS bypass is permitted;
4. pin the exact current C2B `preOrder` response contract for the subscribed product;
5. pin authoritative `queryOrder` response fields and status-value meanings before mapping any provider status to an Enawuga payment state;
6. establish authoritative server-side `notify_url` authentication/signature, replay and retry behavior before treating callbacks as trusted authority;
7. use only freshly provisioned official TestBed synthetic consumer/account data for any controlled end-to-end payment test.

Until those gates are satisfied, direct Telebirr payment initiation remains disabled.

## Boundary

This branch contains sandbox integration safety primitives, read-only merchant query transport support and pure checkout handoff construction. It does not prove a live payment, customer-funds authority, PartnerFI settlement, Wishland-held funds, physical cash authority, production IAM, or regulated production deployment.
