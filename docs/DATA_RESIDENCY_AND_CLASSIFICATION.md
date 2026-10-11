# Data classification and residency

These are project architecture requirements, not a legal determination or proof of compliance. All current fixtures are SYNTHETIC_DEMO. Classifications below describe the corresponding real-world flows and are encoded in `src/domain/residency.ts`.

| Classification | Stores/flows | Required treatment |
| --- | --- | --- |
| RESTRICTED_FINANCIAL | Partner accounts, transaction requests, outbox, regulated audit | Ethiopia-resident only; partner authorization; no external telemetry |
| RESTRICTED_IDENTITY | Customer record, phone alias, KYC references | Ethiopia-resident only; access controls; minimum necessary data |
| OPERATIONAL_CONFIDENTIAL | Infrastructure and internal operational configuration | Restricted staff access; no secrets in client builds |
| AGGREGATED_NON_PII | Irreversibly aggregated operational metrics | No linkable identifiers; assess re-identification risk before export |
| SYNTHETIC_DEMO | Current fixtures and mock account state | Permitted in external development cloud; no real customer input |
| PUBLIC | Reviewed documentation | No credentials or restricted records |

Regulated audit logs and production backups must remain Ethiopia-resident. Keys for regulated production data must remain Ethiopia-controlled. Storage, replicas, support access, disaster recovery and subprocessors all require review; IP geolocation or an ET environment variable is not evidence of compliance.

Configuration defaults: `DATA_MODE=synthetic`, `REGULATED_DATA_RESIDENCY=ET`, `ALLOW_EXTERNAL_TELEMETRY=false`. The validator rejects unknown modes, external telemetry and **all regulated-mode execution**, including known external AWS/Firebase targets and purported local ET targets. No bypass flag exists. This deliberate block remains until approved deployment, provider, encryption, authorization and retention controls are implemented and reviewed.

Developer logs must not include bodies, FIN/FAN, phone aliases, account identifiers, OTPs or raw error objects containing restricted values. Telemetry must not export regulated identifiers. Firebase is disabled; Gemini secrets are not injected; browser speech capture is disabled. No live service connection is needed for testing.

Browser IndexedDB is unencrypted synthetic storage, not a compliant edge vault. Historical `GhostSyncDB` and conflict storage may contain earlier user-entered data: retain without upload/migration, and arrange explicit user-authorized review/deletion. Never automatically export it into the new outbox. Production retention/deletion schedules, key custody, remote wipe and offline credential validation are P0 blockers.
