# Remaining P0 / pre-live blockers

P0-A and P0-B are complete for their bounded synthetic scope. They do **not** make this repository production-ready, authorize a pilot, or permit regulated mode / real-data GhostSync by changing a flag.

## Bounded controls already implemented in P0-B

The following are implemented and validated in the synthetic environment:

1. Server-verified synthetic sessions, role/object authorization, CSRF/session protections, rate limits, redacted audit trails and controlled administrative recovery.
2. Durable single-process JSON persistence for synthetic customer / PartnerFI / reconciliation state, including restart-safe idempotency and replay protections.
3. Authenticated mock reconciliation callbacks/status handling with uncertain-state, duplicate/replay/sequence and terminal-state protections.
4. Legacy browser-record quarantine and explicit no-auto-upload behavior.
5. Fail-closed encrypted-edge interface/threat-model contract; actual approved encryption/key operations are still not implemented.
6. Ethiopia-resident staging evidence checklist and active UI/claims review.

These controls remain synthetic-development implementations. They are not substitutes for approved production IAM, transactional databases, regulated audit infrastructure, cryptographic key custody, live provider contracts or licensed financial authority.

## Remaining external / production gates

1. **Operating-role and partner authority** — Obtain written licensed-partner scope, operating responsibilities, agent/supervisor authority, customer recovery authority, complaints handling and settlement/reconciliation responsibilities.
2. **Approved Ethiopia-resident environment** — Provide and approve evidence for compute/ingress, database, backups, audit store, logging/monitoring, DR, subprocessors, retention and actual data paths. Use synthetic fixtures until authorization is established.
3. **Production IAM and security administration** — Implement approved MFA, privileged-access controls, joiner/mover/leaver, break-glass, access attestations, production rate/abuse controls and monitored administrative recovery.
4. **Production transactional persistence** — Replace single-process JSON snapshots with approved durable multi-process transactional storage. Demonstrate uniqueness, atomicity, concurrency/isolation, recovery, idempotency and cross-store audit/outbox guarantees.
5. **Approved cryptography / edge security** — Implement encrypted edge storage, approved key generation/custody/rotation/revocation/recovery, device compromise response and governed migration of pre-existing records. The current edge interface intentionally fails closed.
6. **Live reconciliation contract** — Integrate only approved provider/PartnerFI callbacks or status queries. Provider acceptance is not settlement. No cash-dispense instruction may be derived from outbox insertion, network delivery or gateway acceptance alone.
7. **Identity integration** — Only after approved official agreements, implement online eKYC/offline verification patterns, permitted data fields, provider attestations, consent, phone/SIM-change recovery and retention rules. Phone possession never substitutes for identity proof.
8. **Payment and financial-provider integration** — Production credentials, live payment rails, live account lookup/posting and funds movement remain disabled until provider agreements, security review, approved data residency and explicit stage authorization exist.
9. **Cash / liquidity operations** — Fleet cash, agent liquidity, FMCG-liquidity matching and any custody handoff remain planning/simulation only until ownership, custody, limits, insurance/security, handover, accounting and reconciliation authority are formally approved.
10. **Production operations** — Complete monitoring/alerting, incident response, vulnerability management, capacity planning, restore/failover exercises, support/on-call ownership and change-management evidence.

## P0-A findings already addressed

- Removed FIN/biometric transaction lookup, camera/OTP transaction bypass, arbitrary onboarding PII persistence and fake client HMAC signing.
- Closed legacy GhostSync, identity OTP, settlement, reconciliation and worker mutation endpoints; removed unsigned SVID trust path.
- Removed frontend Gemini-key injection and Firebase client execution; Firestore denies all access.
- Removed hardcoded Compose database password; unused Redis/PostgreSQL topology is no longer presented as operational infrastructure.
- Removed sensitive request/OTP logging and disabled external speech capture.
- Repaired stale E2E expectations and health smoke acceptance of 404/304.

## Known bounded limitations

- Offline operation still requires an already-loaded app; there is no service worker for offline page reload.
- Synthetic sessions are not PartnerFI SSO or production identity/access management.
- JSON persistence is unencrypted single-process development storage and is not a transactional regulatory ledger/database.
- No approved provider connectivity, production observability, approved encrypted browser storage, production HA/DR or live hardware control exists.
- Mock-provider/admin authority is an internal domain contract, not a real security credential.
- Old git revisions contain illustrative hardcoded values; if any were reused externally, their owner must rotate them independently. No actual credential validity was tested.

See `docs/P0_POST_MERGE_CLOSURE.md` for the Stage 1 closure record and `docs/governance/PROGRAM_STATUS.yaml` for the active stage.
