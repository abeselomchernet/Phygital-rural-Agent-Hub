# D4 Phase 3E — Browser Session Customer-Scope Minimization

## Status

`TARGET_STAGE4_INTERNAL` / synthetic-only migration slice.

This slice removes canonical customer UUID scope from the browser-visible synthetic session view and moves Operations ArifPay reconciliation to a transaction-only v2 request boundary. Canonical customer scope remains server-side in the authenticated `StoredSession` because object authorization still requires it.

## Changes

- Browser session responses no longer expose `allowedCustomerIds`.
- Server-side stored sessions continue to retain customer authorization scope.
- The browser client session type no longer carries customer UUIDs.
- Operations Reconciliation no longer reads or stores a customer UUID from the session response.
- `POST /api/demo/v2/payments/arifpay/c2b/reconcile` accepts only an Enawuga transaction UUID.
- The server resolves the checkout's canonical customer UUID from the existing recorded gateway state, independently enforces session customer scope, and then invokes the existing reconciliation service internally.
- The v2 reconciliation response omits `customerId`.
- The existing v1 reconciliation endpoint remains temporarily for test/legacy compatibility.

## Fail-closed behavior

The v2 reconciliation request is strict: injecting a customer UUID or other unknown fields fails validation. A transaction with no recorded checkout cannot supply a browser-selected customer scope. Server-side role, CSRF, customer-object scope and fixture scope remain independently enforced.

## Privacy / authority boundary

This is data minimization, not a change of authority. Transaction-only reconciliation does not make a transaction ID an identity credential, customer identifier, authorization grant, settlement proof or PartnerFI decision.

No live customer data, regulated mode, live provider route, PartnerFI posting/settlement, custody, credit approval, insurance adjudication or regulatory authority is enabled. `syntheticOnly=true`, `etResidencyApproved=false`, `regulatedModeAllowed=false` remain unchanged.

## Remaining compatibility work

The internal `StoredSession` intentionally retains `allowedCustomerIds` for authorization. Legacy v1 API routes and internal payment-domain records may still carry canonical UUIDs server-side. Further migration must be bounded separately; this slice does not claim canonical identifiers have been eliminated from internal domain state.
