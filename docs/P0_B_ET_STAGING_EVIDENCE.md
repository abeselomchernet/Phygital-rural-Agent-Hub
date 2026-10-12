# B6 — proposed Ethiopia-resident staging evidence package

Status: **ARCHITECTURE / EXTERNAL EVIDENCE REQUIRED**. This package does not provision infrastructure or authorize regulated data. All current external development stays synthetic-only. Vercel, AWS, IBM and other provider names or region labels do not establish Ethiopian regulated-data residency. `DATA_MODE=regulated` remains blocked even with `REGULATED_DATA_RESIDENCY=ET`.

Proposed flow: approved device → authenticated application ingress → Wishland orchestration → approved PartnerFI adapter. PartnerFI remains principal for accounts, authorization, funds, KYC policy and settlement. An authenticated partner callback enters an independently verified reconciliation path; GhostSync carries requests only. Application database, audit store, backups, keys and operational logs must each pass evidence review, including disaster-recovery copies and administrative access.

| Component / responsibility | Required evidence and acceptance criteria | Accountable owner | Current status |
| --- | --- | --- | --- |
| Compute / ingress | Physical hosting locations, contracts, deployment inventory, network routes, isolation, patching and controlled egress | Wishland operations + hosting provider; PartnerFI approval | NOT PROVIDED |
| Database | Primary/replica locations, durable atomic transactions, uniqueness/isolation tests, privileged access, encryption and restore evidence | Wishland data operations + PartnerFI governance | NOT PROVIDED |
| Backups | Copy/replica locations, access, encryption/key separation, restore tests, expiration and deletion verification | Operations; PartnerFI retention owner | NOT PROVIDED |
| Audit store | Restricted redacted schema, append-only/tamper evidence, access review, legal holds, retention, export and time integrity | PartnerFI compliance policy; Wishland implementation | NOT PROVIDED |
| Encryption / key custody | ET-approved custody and administrator jurisdiction, key ownership, key generation/rotation/revocation/backup recovery evidence; specific technology verified independently | PartnerFI security owner + approved custodian | NOT PROVIDED |
| Logging / monitoring | Data classification, payload suppression, alert destinations, telemetry/subprocessor locations and redaction tests | Wishland security operations | NOT PROVIDED |
| IAM / access administration | Partner user authority, least privilege, MFA, break-glass, joiner/mover/leaver controls, access attestations and admin-location review | PartnerFI authority; Wishland technical enforcement | NOT PROVIDED |
| Incident response | Joint escalation, loss/fraud/identity breach procedures, notification duties, evidence preservation and exercised playbooks | Named PartnerFI/Wishland incident leads | NOT PROVIDED |
| Retention / deletion | Approved schedule per data class/store, tombstone/replay safety, consent, legal holds, deletion across replicas/backups and customer recovery | PartnerFI legal/compliance; Wishland execution | NOT PROVIDED |
| Subprocessors | Inventory, permitted purpose, physical data paths, contracts, support access, jurisdiction and change approval | PartnerFI/vendor governance | NOT PROVIDED |
| Disaster recovery | Approved recovery sites, agreed RPO/RTO, restore/failover exercise, key availability, replay integrity and rollback policy | Operations; PartnerFI acceptance | NOT PROVIDED |
| Operational ownership | Named on-call owners, deployment/change approval, vulnerability management, capacity and service responsibilities | Written Wishland/PartnerFI RACI | NOT PROVIDED |
| PartnerFI responsibilities | Licensed scope, customer funds/liability, transaction and settlement authority, KYC/identity-provider permissions, complaints/recovery and reconciliation contracts | Licensed PartnerFI | NOT PROVIDED |
| Wishland responsibilities | Software/orchestration boundaries, data-processing agreement, security controls and support obligations; no holding/issuing/settling funds | Wishland | NOT PROVIDED |
| Identity/provider contracts | Approved Fayda/other provider verification pattern, permitted fields and retention; separate phone-channel proof | PartnerFI + authorized provider | NOT PROVIDED |

Evidence register for each row must record artifact ID/version, owner, reviewer, review date, expiry, decision and unresolved conditions. Review must include actual data-flow/backup/support paths rather than only marketing statements. No gate is satisfied by this document or passing CI. Keep real-data ingress, remote GhostSync and live adapters disabled until contracts, security/privacy review, deployment evidence and explicit authorization are complete. Synthetic staging exercises must use fixtures and must not reuse production credentials.

The canonical external preview project is `phygital-rural-agent-hub`; the deleted `phygital-rural-agent-hub-ri4n` must not be recreated. Preview access/protection remains owner-controlled and is separate from any future regulated staging decision.
