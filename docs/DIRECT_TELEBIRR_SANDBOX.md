# Direct Telebirr sandbox workstream

Status: Draft / sandbox-only / synthetic data only.

This workstream is separate from Telebirr routed through ArifPay. Provider provenance must remain explicit.

## Implemented safety foundation

T1 — strict sandbox configuration and exact HTTPS/TestBed gateway guard.

T2 — deterministic canonicalization plus RSA-PSS/SHA-256 signing using the current Ethio telecom request-signature process. RSA-PSS signatures themselves are randomized; only canonicalization is deterministic. Signing accepts ordinary RSA private keys with modulus >= 2048 bits and applies the pinned SHA-256/PSS configuration. EC, weak RSA and restricted `rsa-pss` key profiles are rejected; restricted PSS key-parameter profiles remain a provider-conformance gate until authoritative hash/MGF/salt semantics are pinned.

T3 — guarded fabric-token client for `/payment/v1/token`, network-disabled by default. Redirects are rejected, successful response bodies are size-bounded and deadline-bounded, and every controlled early transport exit actively aborts the request. Response cancellation is best-effort/non-blocking so stalled cleanup cannot hold the caller beyond the controlled error path.

T4 — pure signed `payment.preorder` request construction for `/payment/v1/merchant/preOrder`; no provider mutation.

T5 — bounded preorder-response classification. `ORDER_CREATED` requires an explicit `SUCCESS`, exact merchant-order binding and a safe `prepay_id`; unknown or absent outcomes remain unverified. No state proves payment or settlement.

T6 — durable pre-submit correlation intent with idempotency, transaction, merchant-order and nonce replay protection. Local JSON persistence uses an exclusive local lock plus revision compare-and-swap, fsync of the candidate file, atomic rename and directory fsync. This is a local synthetic-development safety primitive, not a distributed database, production outbox or exactly-once guarantee. A stale lock fails closed and requires operator review.

T7 — merchant-side read-only `payment.queryorder` request construction and sandbox query client for `/payment/v1/merchant/queryOrder`. The client returns transport/provider payload evidence only and deliberately does not map provider status fields to payment or settlement until the authoritative status-value contract is pinned. Redirects, oversized responses and timeout-overrun body reads fail closed; controlled early exits abort the request without waiting indefinitely for response-stream cancellation.

T8 — pure signed H5/SuperApp `rawRequest` construction from `appid`, `merch_code`, `nonce_str`, `prepay_id`, timestamp, sign type and signature. Provider and merchant identifiers are constrained so delimiter injection cannot alter the raw request. The builder performs no provider call and does not invoke client `startPay`.

T9 — pure C2B browser Web Checkout URL construction based on the supplied `C2B_WebCheckoutDemo`. Browser query fields are percent-encoded independently so base64 signature bytes survive standards-compliant URL parsing. This safer serialization remains a provider/TestBed conformance gate before activation. T9 performs no provider call, opens no browser, and does not import B2B `WebCheckout` / `TransferToOtherOrg` semantics.

T10 — the existing Operations UI shows provider readiness only. ArifPay remains the only interactive sandbox reconciliation flow. Direct Telebirr is visible only as an inactive TestBed foundation with networking disabled and TLS trust unresolved; no Telebirr payment or reconciliation action is exposed.

## Independent closure review

Astra re-reviewed the post-hardening branch and found no critical or high finding for the inactive foundation. Its remaining medium finding was response cleanup that could outlive the configured deadline on HTTP error/oversized-response paths. The follow-up patch now actively aborts those requests and performs response cancellation without awaiting potentially stalled cleanup. Four regression tests cover token/query HTTP rejection, oversized declared responses, and restricted RSA-PSS key profiles.

This closes the reproduced transport-cleanup gap at the inactive foundation level. It does not activate Telebirr networking and does not change provider/payment/settlement authority.

## Evidence basis

Current Ethio telecom developer-portal documentation confirms:

- Telebirr payment products are registered/subscribed through the developer portal;
- the current H5/MiniApp checkout flow obtains a backend `rawRequest` and hands it to the Telebirr SuperApp `startPay` capability;
- SuperApp/client callbacks are presentation/client completion signals and are not sufficient server-side reconciliation authority;
- outbound payment requests use RSA request signing and the merchant keeps its private key while sharing the public key with the service provider;
- payment API scope/subscription is provider-controlled;
- the current product portal exposes separate C2B and B2B Web Checkout sample demos.

### Sanitized public references

Reviewed against the current public developer portal on 2026-10-13. These URLs contain no account credential or project secret:

- Getting Started: https://developer.ethiotelecom.et/docs/GettingStarted
- Developer product/TestBed page: https://developer.ethiotelecom.et/user/product
- MiniApp request-signature process: https://developer.ethiotelecom.et/docs/MiniApp%20Integration%20with%20Supper%20APP/RequestSignatureProcess
- H5 C2B request-signature process: https://developer.ethiotelecom.et/docs/H5%20C2B%20Web%20Payment%20Integration%20Quick%20Guide/Request_signature_Process
- H5/SuperApp checkout handoff: https://developer.ethiotelecom.et/docs/H5%20Integration%20with%20Supper%20APP/%20CheckOut

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

## TestBed TLS evidence

Credential-free probe evidence: GitHub Actions run `38371392549`, executed 2026-10-13 on a GitHub-hosted Ubuntu 24.04 runner. The temporary probe tested the documented hostname, that hostname forced to the supplied TestBed IP, and the raw TestBed IP with ordinary certificate verification only. All failed with curl exit 60 / `unable to get local issuer certificate` / OpenSSL verify result 20. The hostname resolved to the same TestBed IP present in the supplied Postman environment.

The temporary probe performed GET only, used no credentials, sent no payment mutation, and was removed immediately after evidence capture.

Enawuga does not use `verify=False`, curl `-k`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, or any equivalent bypass. Direct Telebirr TestBed networking stays fail-closed until Ethio telecom fixes/provides a trust chain accepted by the execution environment or supplies an explicitly approved TestBed CA chain.

## Product-contract distinctions

The supplied Postman `CreateOrder` example is an InApp/OpenAPI-style flow with additional payee fields. The current public H5/C2B documentation and C2B Web Checkout demo use the Checkout preorder family. Enawuga does not blend those product contracts.

The C2B and B2B Web Checkout demos are also separate. C2B uses `trade_type=Checkout`; B2B uses `trade_type=WebCheckout` with `business_type=TransferToOtherOrg`. T9 implements only the C2B browser URL handoff.

T7 therefore uses only the merchant `queryOrder` contract for server-side reconciliation. It does not use app-side payer identifiers/PINs or client callback state.

T8 uses only the H5 raw-request field set shown in the supplied Telebirr demo. It does not invoke SuperApp startPay and does not interpret any client callback as payment authority.

T9 constructs only the C2B browser Web Checkout URL. It does not launch navigation, create a provider order, confirm a payment, or establish settlement.

## Remaining provider gates

Before enabling the first direct Telebirr sandbox preorder network mutation:

1. confirm this account's exact C2B/Web Checkout subscription/scope;
2. provision fresh/reissued sandbox credentials because the supplied export/demo credential material has been exposed in shared artifacts;
3. obtain a valid TestBed TLS trust chain for the approved execution environment — no insecure-TLS bypass is permitted;
4. pin the exact current C2B `preOrder` response contract for the subscribed product;
5. pin authoritative `queryOrder` response fields and status-value meanings before mapping any provider status to an Enawuga payment state;
6. establish authoritative server-side `notify_url` authentication/signature, replay and retry behavior before treating callbacks as trusted authority;
7. verify provider compatibility with percent-encoded C2B browser query serialization before using T9 against TestBed;
8. pin provider support for any restricted RSA-PSS private-key parameter profile before accepting such key material;
9. use only freshly provisioned official TestBed synthetic consumer/account data for any controlled end-to-end payment test.

Until those gates are satisfied, direct Telebirr payment initiation remains disabled.

## Boundary

This branch contains sandbox integration safety primitives, read-only merchant query transport support and pure checkout handoff construction. It does not prove a live payment, customer-funds authority, PartnerFI settlement, Wishland-held funds, physical cash authority, production IAM, or regulated production deployment.
