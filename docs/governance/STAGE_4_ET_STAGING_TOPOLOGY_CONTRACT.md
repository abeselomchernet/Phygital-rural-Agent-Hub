# Stage 4 — Ethiopia-Resident Non-Production Staging Topology Contract

**Stage:** Stage 4 — Governed ET-resident staging foundation  
**Workstream:** S4-A — topology and residency-evidence contract  
**Status:** TARGET TOPOLOGY DEFINED / EXTERNAL INFRASTRUCTURE EVIDENCE NOT YET ACCEPTED  
**Authority:** Engineering/governance contract only; does not authorize regulated data, real funds, production credentials, live PartnerFI posting, cash movement or provider production activation.

## 1. Purpose

Stage 4 must turn the prior residency checklist into an explicit topology and evidence contract before restricted data can ever be considered. The contract defines what must exist and what must be evidenced for a future Ethiopia-resident **non-production** staging environment.

A provider name, cloud region label, deployment URL, environment variable or successful CI run is not residency evidence. The existing `REGULATED_DATA_RESIDENCY=ET` configuration value is a fail-closed configuration input only; it does not establish physical location, legal jurisdiction, key custody, backup location, support-access location or approved regulated readiness.

The active Stage 4 runtime remains **synthetic-only**. `DATA_MODE=regulated` remains blocked.

## 2. Target topology

The target non-production path is:

```text
Approved test device / operator
        ↓
Authenticated application ingress
        ↓
Wishland orchestration compute
        ├──→ primary database
        │       ├──→ replica database
        │       └──→ backup store
        ├──→ redacted audit store
        ├──→ redacted logging / monitoring
        └──→ controlled provider egress

Privileged administration
        ↓
MFA / least-privilege admin access path

Provider / vendor support
        ↓
separately inventoried and approved support-access path

Encryption / secrets
        ↓
separately evidenced key-custody path
```

This topology is deliberately provider-neutral. A hosting vendor is not selected or accepted merely by this document.

## 3. Required topology components

The machine-readable contract in `src/domain/stage4StagingTopology.ts` requires exactly one declared component of each kind:

1. `APPLICATION_INGRESS`
2. `ORCHESTRATION_COMPUTE`
3. `PRIMARY_DATABASE`
4. `REPLICA_DATABASE`
5. `BACKUP_STORE`
6. `AUDIT_STORE`
7. `LOGGING_MONITORING`
8. `KEY_CUSTODY`
9. `ADMIN_ACCESS_PATH`
10. `SUPPORT_ACCESS_PATH`
11. `CONTROLLED_EGRESS`

Every component has an independent provider/facility/location declaration and evidence state. This prevents a single "Ethiopia region" claim from silently covering backups, observability, keys, support personnel or DR paths that may sit elsewhere.

## 4. Evidence states

Each component can be recorded only as:

- `NOT_PROVIDED`
- `COLLECTED_UNREVIEWED`
- `ACCEPTED_FOR_STAGE4_REVIEW`
- `REJECTED`

`ACCEPTED_FOR_STAGE4_REVIEW` requires an evidence reference. It means only that the artifact is accepted as input to the Stage 4 gate review. It does **not** mean the repository itself has approved residency or regulated operation.

The evaluator can return `eligibleForExternalGateReview=true` only when all required components:

- declare Ethiopia (`ET`) as their physical/data-path location;
- carry accepted Stage 4 evidence references;
- have no rejected evidence; and
- the topology itself has evidence references.

Even then the evaluator always returns:

- `etResidencyApproved=false`
- `regulatedModeAllowed=false`

An explicit governance/external-evidence decision is still required.

## 5. Evidence expected by component

| Component | Minimum evidence before Stage 4 gate acceptance |
|---|---|
| Application ingress | physical hosting/facility location, ingress routing, TLS termination location, network inventory, allowed inbound paths |
| Orchestration compute | physical compute location, tenant/isolation model, patching responsibility, runtime inventory, controlled egress |
| Primary database | primary physical location, encryption, privileged access, durability/isolation evidence, deletion controls |
| Replica database | replica physical location, replication path, privileged access, failover behavior |
| Backup store | backup-copy locations, encryption/key separation, retention, expiry/deletion and successful synthetic restore evidence |
| Audit store | redacted schema, append/tamper controls, access, time integrity, retention/legal-hold behavior |
| Logging/monitoring | telemetry destinations, payload suppression, data classes, subprocessor locations, redaction tests |
| Key custody | actual technology, key owner, generation, storage location, administrator jurisdiction, rotation/revocation/recovery |
| Admin access | IAM source, MFA, least privilege, break-glass, JML process, access review, administrator location/jurisdiction |
| Support access | vendor/subprocessor inventory, support purpose, support-person location/jurisdiction, approval and audit trail |
| Controlled egress | explicit destinations, DNS/network paths, sandbox/TestBed route ownership, deny-by-default behavior, data classes |

## 6. Data-flow rules

Stage 4 topology records every controlled data-flow edge. In the current reference topology every edge has:

`restrictedDataPermitted: false`

This is intentional. Stage 4 infrastructure/evidence work uses synthetic fixtures only. No topology file can authorize real customer PII, financial/account data, real transaction value or production credentials.

Provider routes remain independently governed. Stage 4 infrastructure availability does not activate Telebirr, M-PESA Ethiopia, ArifPay production, PartnerFI posting, identity providers, remote GhostSync or real cash movement.

## 7. Current reference manifest

`CURRENT_STAGE4_REFERENCE_TOPOLOGY` declares all required logical components and the intended synthetic data flows, but intentionally leaves:

- `providerName = null`
- `facilityOrRegion = null`
- `countryCode = null`
- `evidenceState = NOT_PROVIDED`
- evidence references empty

Therefore the current result is **not eligible for external gate review** and is **not residency-approved**.

This is the correct starting condition until a concrete Ethiopia-hosted candidate environment and its evidence are selected and reviewed.

## 8. Provider selection rule

A Stage 4 hosting candidate must be evaluated on actual evidence, not marketing labels. Before the candidate is accepted we must capture, at minimum:

- exact physical facility and compute location;
- database primary/replica location;
- backup and DR-copy location;
- log/monitoring and audit-store path;
- key/secrets custody path;
- administrative and support-access jurisdiction;
- subprocessors;
- contractual/data-processing terms relevant to the staging scope;
- egress paths and external dependencies.

A candidate that cannot evidence any required component remains incomplete even if the application itself runs successfully.

## 9. Relationship to earlier evidence package

`docs/P0_B_ET_STAGING_EVIDENCE.md` remains historical/forward evidence guidance and is not rewritten. This Stage 4 contract operationalizes that checklist into a strict machine-readable topology model and fail-closed evidence evaluator.

## 10. S4-A exit condition

S4-A is complete only when two distinct things exist:

1. **Topology contract implemented** — repository structure, schema, tests and fail-closed rules are merged.
2. **Concrete candidate evidence captured** — a named non-production hosting candidate has evidence for every required topology component and is ready for explicit Stage 4 review.

This PR can satisfy item 1 only. Item 2 requires real external infrastructure/provider evidence and must not be inferred from code, configuration or CI.
