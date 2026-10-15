# E1C Hub Synthetic Provenance / Evidence Manifest

## Status

Implemented as a bounded Stage-4 synthetic domain/export contract stacked on E1B. It does not merge or bypass PR #44, PR #45 or PR #46, and it does not activate any provider, payment, settlement, production-authentication or device-control path.

## Purpose

E1C turns the E1A fixture graph and E1B workflow envelopes into a machine-readable evidence package with explicit positive evidence, explicit non-evidence, deterministic checksums, version references and completeness state.

The implementation follows the repository-mining decisions that E1C should provide:

- a versioned fixture manifest;
- synthetic versus staging-synthetic classification;
- explicit zero/false non-evidence fields;
- deterministic fixture-graph identity;
- artifact checksum/version references;
- owner and retention metadata;
- explicit package completeness;
- canonical export and verification tests.

## Fixture graph identity

`stage4-hub-fixtures-v1` is the first governed fixture-dataset version.

The graph digest covers the current bounded Hub fixture structure plus the PartnerFI contracts, service catalogs and reference routes actually connected to Hub partner memberships. It includes Hub lifecycle/scope metadata, operators, devices, memberships, capability grants, service definitions and route/adapter references.

The E1C acceptance test intentionally pins the current graph counts. A material governed fixture-graph change should therefore be accompanied by an explicit fixture-dataset version review rather than silently inheriting the same identity.

## Runtime classification

The manifest distinguishes:

- `SYNTHETIC_FIXTURE` -> environment `synthetic`;
- `STAGING_SYNTHETIC` -> environment `staging`.

Both remain `dataMode: synthetic` and `providerExecution: NO_LIVE_PROVIDER_CALLS` in E1C. This classification does not prove that a staging environment exists, is Ethiopia-resident, or is production-authorized.

## Explicit non-evidence

Every valid E1C manifest records these bounded negative assertions as schema literals:

- external provider calls count = `0`;
- live ledger receipt count = `0`;
- PartnerFI settlement evidence count = `0`;
- real PII present = `false`;
- real funds present = `false`;
- regulated production authority granted = `false`;
- device control executed = `false`.

The schema cannot be used to flip those fields to positive values.

## Artifact inventory

Each inventory item carries only bounded metadata:

- artifact ID and kind;
- owner;
- retention class;
- version reference;
- SHA-256 digest when recorded;
- integrity state;
- controlled evidence references.

Raw payloads, secrets, credentials, provider bodies and personal data have no artifact schema field and fail strict validation.

`DIGEST_RECORDED` means only that a checksum is present in the manifest. It is not external validation, legal attestation, provider confirmation, qualified timestamping or non-repudiation evidence.

## Completeness semantics

Package completeness is derived from artifact state:

- `DIGEST_SET_COMPLETE` — every inventory item has a digest-recorded state;
- `INCOMPLETE_PENDING` — at least one item remains pending and none is unknown;
- `INCOMPLETE_UNKNOWN` — at least one item remains unknown.

Pending or unknown evidence is preserved as pending/unknown. The manifest never converts those states into a pass claim.

## E1B linkage

Workflow-envelope inputs are verified through the E1B content-digest boundary before inclusion. All included envelopes must belong to the manifest run ID, duplicate event IDs are rejected, and the manifest exports correlation IDs plus E1B content digests without storing raw provider payloads.

E1C also extracts the canonical SHA-256 implementation into `evidenceIntegrity.ts` so E1B and E1C use the same deterministic key-ordering rules. Existing E1B digest behavior remains covered by its regression tests.

## Export boundary

`exportHubEvidenceManifest()` emits deterministic canonical JSON. `parseHubEvidenceManifestExport()` verifies the manifest digest on re-entry.

The manifest digest protects the exported manifest content from undetected modification. It does not prove the truth of an external artifact that is referenced only by metadata.

## Explicit non-capabilities

E1C adds no:

- real customer PII;
- real funds or cash movement;
- account posting or settlement;
- live provider networking;
- Telebirr, M-PESA or ArifPay activation;
- production authentication;
- provider callback authority;
- device or firmware control;
- production cryptographic signing or non-repudiation claim;
- new API route or operations mutation surface.

## Validation target

Focused E1B/E1C tests cover deterministic fixture identity, explicit non-evidence, canonical export, tamper detection, runtime classification, pending/unknown preservation, strict raw-payload rejection, run binding, E1B envelope verification and duplicate artifact rejection.

The branch should additionally pass TypeScript, production build and `git diff --check`. Full Windows-suite persistence/fsync behavior remains compared against the established host-specific baseline.

## Next workstream

E1D should build a synthetic-only Operations trace read model over E1B events and E1C evidence metadata: correlation search, event timeline, queue/retry/conflict state, evidence refs, typed denied/deferred outcomes and redacted role-safe projections. Stage-4 action placeholders must remain non-mutating.
