# D4 Phase 3C — Opaque Customer Reference Compatibility

## Status

`TARGET_STAGE4_INTERNAL` / synthetic-only compatibility slice.

This slice introduces a versioned HTTP boundary that no longer requires the browser to submit or receive the canonical customer UUID for the covered customer/account/transaction workflow. It does not change regulated authority, identity authority, PartnerFI authority, settlement semantics, or the existing legacy demo routes.

## Reference semantics

`custref_v1_*` is a session-scoped opaque routing reference. It is HMAC-bound to the authenticated synthetic session, tenant, active partner organization, and canonical customer UUID. Resolution is limited to customer IDs already authorized in that session.

The reference is deliberately **not**:

- a PPID;
- a KYC/identity credential;
- a customer master identifier;
- a PartnerFI identifier;
- a cryptographic proof of identity;
- an authorization grant.

Authorization is still independently enforced by the server after reference resolution.

## Target v2 boundary

The bounded target routes in this slice are:

- `GET /api/demo/v2/customer`
- `GET /api/demo/v2/lookup`
- `GET /api/demo/v2/account?customerRef=...`
- `POST /api/demo/v2/phone`
- `POST /api/demo/v2/reverify/start`
- `POST /api/demo/v2/reverify/confirm`
- `POST /api/demo/v2/transactions`

Agent/Supervisor customer responses use the strict D4 customer projection contract. The transaction adapter continues to receive the canonical UUID only inside the server after the opaque reference has been authorized and resolved. The public v2 transaction result returns the opaque reference, not the canonical UUID.

## Fail-closed behavior

A reference from another session, tenant, partner scope, or unauthorized customer does not resolve. Supplying a canonical UUID where a `customerRef` is required fails schema validation. Logout/revocation remains authoritative; a reference cannot revive a revoked session.

## Compatibility boundary

The existing `/api/demo/customer`, `/api/demo/lookup`, `/api/demo/account`, `/api/demo/transactions`, payment-gateway routes, and legacy UI remain temporarily available because they still participate in the current synthetic demo and offline transport schemas. They are **legacy compatibility surfaces**, not the target D4 projection boundary.

A later bounded slice must migrate the browser/offline workflow and payment-gateway compatibility before those raw-UUID surfaces can be retired. This Phase 3C slice intentionally avoids a flag-day transport-schema migration.

## Non-authority boundary

Nothing in this slice authorizes live customer data, regulated processing, PartnerFI decisions, posting, settlement, custody, provider activation, credit, insurance adjudication, or regulatory action. The project remains `syntheticOnly=true`, `etResidencyApproved=false`, `regulatedModeAllowed=false`.
