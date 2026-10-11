# Remaining P0 blockers

P0-A does not make this prototype production-ready or authorize a pilot. Do not enable regulated mode or remote GhostSync by changing a flag.

## P0-B: authenticated partner-controlled staging design

1. Obtain written operating-role, licensed-partner scope and identity-provider contracts. Confirm agent submitter/supervisor roles and customer recovery authority.
2. Design an Ethiopia-resident staging deployment, databases, backups, regulated audit store and Ethiopia-controlled key custody. Approve subprocessors and retention. Use synthetic fixtures until authorization is established.
3. Implement server-verified sessions, role and object authorization, CSRF/session protections, rate limits, redacted audit trails and administrative recovery. The current `/api/demo` fixture API is intentionally unauthenticated and has shared in-memory state; it is not a production access model.
4. Implement durable transactional idempotency, unique event/transaction constraints, atomic alias updates, sequence policy across devices, tombstone retention and replay windows. Current Maps reset on restart. The mock receiver is test-only and there is no remote upload API.
5. Reconcile uncertain partner results via authenticated callbacks/status queries before any authoritative outcome. Acceptance is not settlement. No cash-dispense instruction may be derived from outbox insertion or delivery alone.
6. Review/replace remaining legacy financial illustration screens and arithmetic scoring before enabling interactions. Supervisor terminal controls and inventory/mesh demonstrations are UI simulations, not authorized operations. No actual hardware control exists.
7. Replace synthetic storage with approved encrypted edge storage and recovery, address device compromise, and explicitly handle pre-existing browser records without automatic upload.
8. Only after approved official contracts, design online eKYC and offline QR/FaydaEncode validation, provider attestation and phone/SIM-change recovery. Phone possession never substitutes for identity proof. Do not add live credentials in this PR.

## Findings addressed in P0-A

- Removed FIN/biometric transaction lookup, camera/OTP transaction bypass, arbitrary onboarding PII persistence and fake client HMAC signing.
- Closed legacy GhostSync, identity OTP, settlement, reconciliation and worker mutation endpoints; removed unsigned SVID trust path.
- Removed frontend Gemini-key injection and Firebase client execution; Firestore denies all access.
- Removed hardcoded Compose database password; unused Redis/PostgreSQL topology is no longer presented as operational infrastructure.
- Removed sensitive request/OTP logging and disabled external speech capture.
- Repaired stale E2E expectations and health smoke acceptance of 404/304.

## Known limitations

No authentication, approved providers, durable account ledger, real cryptography, production observability, encrypted browser storage or high-availability recovery has been implemented. Mock-provider/admin authority is an internal domain contract, not a security credential. Old git revisions contain illustrative hardcoded values; if any were reused externally, their owner must rotate them independently. No actual credential validity was tested.
