# D4 Phase 3D — Browser Opaque Customer Flow

## Status

`TARGET_STAGE4_INTERNAL` / synthetic-only migration slice.

The Agent customer workbench now consumes the Phase 3C `/api/demo/v2/*` boundary and stores new offline request intents with a session-scoped opaque `customerRef` rather than the canonical customer UUID.

## Changes

- Agent customer/account/lookup/phone/re-verification/transaction calls use the v2 opaque-reference routes.
- The workbench renders an opaque customer reference and the strict Agent customer projection; raw identity detail is not rendered.
- New browser outbox records use `schemaVersion: 2` and contain `customerRef`, not `customerId`.
- Existing schema-v1 outbox rows are retained for compatibility but their canonical customer identifier is not rendered in the queue UI.
- Remote GhostSync delivery remains disabled; reconnect does not imply delivery, authorization, posting, or settlement.

## Compatibility boundary

The server's v1 demo API and the current session-view internal customer scope remain temporarily available for legacy payment/reconciliation and other existing synthetic flows. This Phase 3D slice does not claim that all canonical customer UUID exposure has been removed from every legacy compatibility surface.

A later bounded slice must migrate those remaining consumers before v1 customer identifiers can be removed from session responses and legacy endpoints.

## Authority boundary

Opaque references are routing references only. They are not PPIDs, identity credentials, KYC evidence, authorization grants, PartnerFI identifiers, or proof of ownership. Server-side role/object authorization remains mandatory after reference resolution.

No live customer data, regulated mode, provider activation, posting, settlement, custody, credit approval, insurance adjudication, or regulatory authority is enabled.
