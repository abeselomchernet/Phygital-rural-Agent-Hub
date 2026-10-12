# Architecture & Integration Standard

## 1. Architectural principle

Enawuga MUST separate orchestration from external authority. Adapters translate provider-specific APIs into internal contracts; provider responses do not bypass state-transition rules.

## 2. Core logical services

- Identity & Customer.
- Authentication / RBAC / organization scope.
- Transaction Intent Core.
- FinancialInstitutionAdapter.
- PaymentGatewayAdapter.
- CommunicationsAdapter.
- IdentityVerificationProvider.
- Partner Ecosystem / capability service.
- GhostSync transport.
- Reconciliation.
- Audit/evidence.
- Network Liquidity service.
- Inventory/FMCG service.
- Fleet/logistics service.

## 3. Provider adapter pattern

Examples:

`PaymentGatewayAdapter -> ArifPaySandboxAdapter -> future ArifPayProductionAdapter`

`FinancialInstitutionAdapter -> MockPartnerFI -> future PartnerBankAdapter`

Production and sandbox implementations SHOULD be separate concrete adapters so that environment mistakes fail closed.

## 4. Transaction identity and idempotency

Every externally submitted financial/payment intent MUST carry:

- internal `transactionId`;
- stable idempotency key for the operation;
- canonical `customerId` where customer-specific;
- partner route/provenance;
- amount/currency;
- operation type;
- created timestamp;
- actor/agent context;
- capability/environment identifier.

Retries MUST be safe. Changed payload under reused idempotency key MUST be rejected or treated as a conflict.

## 5. Authority states

Internal status MUST distinguish at least:

- `CREATED`
- `CAPTURED_OFFLINE`
- `QUEUED`
- `SUBMITTED`
- `PROVIDER_ACCEPTED`
- `AUTHORIZED_NOT_SETTLED` where applicable
- `RECONCILIATION_REQUIRED`
- `SETTLED_BY_PARTNER` or provider-specific authoritative terminal state only when independently evidenced
- `REJECTED`
- `FAILED`
- `CANCELLED` where supported

A provider-specific `SUCCESS` string MUST be mapped according to the contract, not assumed to equal final settlement.

## 6. Callback/webhook standard

A callback receiver MUST:

- authenticate/verify sender by the provider's supported mechanism;
- validate schema and data types;
- bind callback to an existing internal transaction/session;
- enforce replay/sequence/terminal-state rules;
- record a redacted audit event;
- return a safe acknowledgement;
- avoid logging secrets/raw sensitive payloads;
- queue reconciliation if authority is uncertain.

## 7. GhostSync integration

GhostSync may transport transaction intents/events. The remote receiver MUST re-run authorization/object validation; transport success never upgrades financial authority.

## 8. Route provenance

For every transaction, record both the customer-facing service and the actual integration route.

Example:

- Service: Telebirr collection.
- Route: ArifPay gateway.
- Upstream provider: Telebirr.
- Enawuga adapter: `ArifPay...Adapter`.

This avoids false claims of direct integration.

## 9. Secrets and configuration

- Secrets only in approved secret storage/environment injection.
- No production keys in frontend bundle or repository.
- Environment host allow-listing SHOULD prevent sandbox code from pointing to production.
- Production adapter enablement MUST require explicit capability and environment approval.

## 10. Failure handling

Network timeout or ambiguous provider response MUST produce an uncertain/reconciliation-required state, not automatic retry where double execution is possible.
