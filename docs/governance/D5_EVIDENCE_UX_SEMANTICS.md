# D5 Evidence UX State Semantics — Phase 4D

Status: bounded Stage-4 synthetic implementation.

This slice implements the D5.9 evidence-display semantics so integrity, external confirmation, synthetic status, offline capture, uncertainty, reconciliation and correction states cannot collapse into one generic "Verified" badge.

## Implemented states

- `DIGEST_VALID` → **Integrity verified** only. Digest match does not establish semantic truth.
- `DIGEST_MISMATCH` → **Integrity failed**.
- `EXTERNALLY_VERIFIED` → **Externally confirmed** only. It does not grant Enawuga authority.
- `NOT_EXTERNALLY_VERIFIED` → explicit absence of external confirmation.
- `SYNTHETIC` → **Synthetic fixture**, rendered as an attention state rather than a positive verification state.
- `OUTCOME_UNCERTAIN` → explicit ambiguity; no success/failure/settlement inference.
- `RECONCILIATION_REQUIRED` → governed comparison required.
- `OFFLINE_CAPTURED` → local capture requires server-side re-evaluation after sync.
- `EXPIRED`, `CORRECTED`, `SUPERSEDED` → explicit freshness/lineage states.

## Fail-closed combinations

The semantic mapper rejects:

- `DIGEST_VALID` together with `DIGEST_MISMATCH`;
- `EXTERNALLY_VERIFIED` together with `NOT_EXTERNALLY_VERIFIED`;
- `SYNTHETIC` together with `EXTERNALLY_VERIFIED` in the current Stage-4 evidence model.

Every descriptor hard-codes semantic truth, financial authority and settlement authority to false.

## UI integration

`EvidenceDrawer` now accepts a list of explicit semantic states and renders all applicable states together. `OperationsEvidence` uses this surface to show digest integrity, synthetic status, no external verification, offline capture, outcome uncertainty and reconciliation independently.

The existing authority banner remains unchanged: evidence visibility does not grant approval, execution, settlement or production authority.

## Deliberate boundaries

- No external confirmation is fabricated.
- No generic "Verified" badge is introduced.
- No green/positive synthetic certification state is introduced.
- No evidence state can create PartnerFI posting, settlement, credit, insurance, provider, regulatory or device-control authority.
- No live/real-person evidence is introduced.
- D1 canary observation and its cutover gate remain unchanged.
