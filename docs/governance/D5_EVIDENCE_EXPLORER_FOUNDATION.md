# D5 Evidence Explorer — Phase 4A Foundation

## Status

Bounded Stage-4 synthetic implementation foundation. This document does not authorize live, regulated, provider, PartnerFI, settlement, credit, insurance, or production activity.

## Purpose

Phase 4A introduces one read-only evidence search core with role-safe projections for the currently mounted Supervisor, Operations, and Partner Admin synthetic workspaces.

The foundation intentionally keeps the following concepts separate:

- integrity verification
- source authentication
- semantic confirmation
- external authority

No single `verified` state is used as a substitute for those independent questions.

## Search boundary

Evidence is scoped by tenant, Hub, and active PartnerFI before optional filters are evaluated. Supported filters are exact evidence ID, exact correlation ID, service, capability, evidence class, review state, and bounded occurrence time range.

Fuzzy customer, phone, identity, name, or free-text search is not provided. The read model contains no raw provider payload, raw customer identifier, phone number, identity reference, credential, balance, or transaction payload.

## Role projection boundary

- Supervisor receives summary evidence metadata.
- Operations additionally receives provenance reference metadata.
- Partner Admin additionally receives bounded source-actor reference metadata.

Every projection explicitly carries `piiIncluded=false` and `mutationAuthorityGranted=false`.

## Synthetic reference data

The Phase 4A fixtures are synthetic architecture evidence used to prove scoping and semantic behavior. They are not pilot observations and are not externally authoritative facts.

A synthetic record may have an integrity-valid digest while remaining semantically unconfirmed and not externally authoritative. This is deliberate.

## Explicit non-authorizations

This phase does not implement:

- evidence correction or supersession mutations
- human-review assignment or closure
- external evidence exports
- external reviewer identities
- regulator access
- PartnerFI decision authority
- settlement, posting, custody, credit approval, claim approval, payout, or device control

## Next bounded slices

Phase 4B may add append-only correction/supersession and derived-evidence invalidation semantics. Phase 4C may add a bounded human-review case model. UI work should follow the same evidence semantics and must not collapse integrity, source, semantic confirmation, and external authority into one visual state.
