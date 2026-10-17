# D5 Evidence Correction & Lineage — Phase 4B

## Status

Bounded Stage-4 synthetic implementation. Phase 4B extends the Phase 4A read-only Evidence Explorer with append-only correction lineage and derived-evidence invalidation semantics. It does not create a correction mutation API and does not authorize automatic recomputation or external decisions.

## Correction semantics

Evidence correction is modeled as a new evidence record plus a separate append-only correction record. The original evidence remains present and immutable.

A correction must bind:

- one scoped superseded evidence record
- one scoped replacement evidence record
- a bounded correction reason
- a recorded timestamp

Cross-tenant, cross-Hub, and cross-PartnerFI correction references fail closed. Self-supersession, multiple direct replacements of the same evidence record, and correction cycles are forbidden.

## Derived evidence invalidation

Dependencies explicitly identify source evidence and derived evidence. When a source is superseded, dependent derived evidence is marked for recomputation. The Phase 4B model may surface affected projection targets including Evidence Explorer, Farmer 360, and ARDI decision support.

This is an invalidation signal only:

- `automaticRecomputePerformed=false`
- `decisionAuthorityGranted=false`

The model does not silently recompute ARDI, does not make a credit decision, and does not modify PartnerFI state.

## Read boundary

`GET /api/demo/evidence-explorer/lineage` exposes scoped lineage to the currently mounted Supervisor, Operations, and Partner Admin synthetic roles through the existing Hub authorization boundary.

Another PartnerFI's evidence returns no lineage in the current scoped view rather than leaking its existence.

## Explicit non-authorizations

Phase 4B does not add:

- evidence deletion
- evidence overwrite
- human-review assignment or closure
- automatic correction acceptance
- automatic Farmer 360 recomputation
- automatic ARDI recomputation
- PartnerFI decision authority
- external evidence export
- regulated or live financial authority

The D1 PostgreSQL canary observation gate continues independently and is unchanged by this work.
