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

## Evidence basis

Current Ethio telecom developer-portal documentation confirms:

- Telebirr payment products are registered/subscribed through the developer portal;
- the current H5/MiniApp checkout flow obtains a backend `rawRequest` and hands it to the Telebirr SuperApp `startPay` capability;
- SuperApp/client callbacks are presentation/client completion signals and are not sufficient server-side reconciliation authority;
- outbound payment requests use RSA request signing and the merchant keeps its private key while sharing the public key with the service provider;
- payment API scope/subscription is provider-controlled.

The project-supplied Telebirr demo confirms the historical/current family of token → create order → `prepay_id` → raw-request assembly. Its sample disables TLS verification; Enawuga does not copy that behavior.

The project-supplied Postman collection/environment adds account/TestBed evidence without being copied into GitHub:

- a TestBed base URL/environment;
- merchant/application variables and synthetic consumer variables;
- `POST /payment/v1/token`;
- `POST /payment/v1/merchant/preOrder`;
- `POST /payment/v1/merchant/queryOrder` using method `payment.queryorder` and merchant-order identity only;
- app-side `checkout`, `payOrder` and `checkOrder` requests, which remain outside the current server-side reconciliation slice.

Secrets, private keys, app secrets, consumer PINs, tokens and account-specific identifiers from the supplied material are not stored in this repository.

## Product-contract distinctions

The supplied Postman `CreateOrder` example is an InApp/OpenAPI-style flow with additional payee fields. The current public H5/C2B documentation uses the Checkout preorder shape. Enawuga does not blend those product contracts.

T7 therefore uses only the merchant `queryOrder` contract for server-side reconciliation. It does not use app-side payer identifiers/PINs or client callback state.

## Remaining provider gates

Before enabling the first direct Telebirr sandbox preorder network mutation:

1. confirm this account's exact C2B/Web Checkout subscription/scope;
2. confirm which supplied TestBed gateway form is authoritative in the execution environment and presents a valid TLS certificate — no insecure-TLS bypass is permitted;
3. pin the exact current C2B `preOrder` response/checkout raw-request contract for the subscribed product;
4. pin authoritative `queryOrder` response fields and status-value meanings before mapping any provider status to an Enawuga payment state;
5. establish authoritative server-side `notify_url` authentication/signature, replay and retry behavior before treating callbacks as trusted authority;
6. use only official TestBed synthetic consumer/account data for any controlled end-to-end payment test.

Until those gates are satisfied, direct Telebirr payment initiation remains disabled.

## Boundary

This branch contains sandbox integration safety primitives and read-only query transport support. It does not prove a live payment, customer-funds authority, PartnerFI settlement, Wishland-held funds, physical cash authority, production IAM, or regulated production deployment.
