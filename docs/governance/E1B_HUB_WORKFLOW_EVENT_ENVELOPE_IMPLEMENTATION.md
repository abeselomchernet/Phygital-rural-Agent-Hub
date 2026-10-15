# E1B Hub Workflow Event / Evidence Envelope

## Status

Implemented as a bounded Stage-4 synthetic domain contract stacked on E1A. This work does not merge PR #44 or PR #45 and does not activate any provider, payment, settlement, device-control or production path.

## Purpose

E1B gives Hub workflows one canonical evidence envelope so later replay, trace, manifest and certification work can reason about the same identifiers and state boundaries.

The envelope carries:

- `eventId`
- `correlationId`
- `runId`
- `idempotencyKey`
- canonical SHA-256 `contentDigest`
- tenant and Hub references
- partner, service, capability, route and adapter references
- matching contract/catalog/route/adapter provenance versions when those governed references are present
- transport state
- authority state
- outcome
- limitation codes
- evidence references
- bounded provenance/version fields

## Core governance rule

**Transport state is not authority state.**

A request may be captured, queued, submitted or have provider evidence without establishing PartnerFI authorization, settlement or regulated authority.

Even the synthetic `PARTNER_AUTHORIZED_SYNTHETIC` state is required to retain `NO_SETTLEMENT_AUTHORITY`.

## Canonical digest

`contentDigest` is computed over the validated envelope content using deterministic key ordering and SHA-256. Verification recomputes the digest and fails closed on any content change.

This is content-integrity evidence for the bounded synthetic runtime. It is not a digital signature, provider attestation, qualified timestamp or production non-repudiation mechanism.

## Idempotency semantics

E1B records `idempotencyKey`, `correlationId` and `runId` as explicit evidence fields, but it does **not** claim that an event-envelope digest is a business-intent digest. Event metadata such as event ID, timestamp and state legitimately changes across a workflow.

Conflicting-retry/business-intent equality remains an E1E certification concern and must be evaluated against the governed workflow intent/payload rather than inferred from event metadata alone.

## Explicit non-capabilities

E1B adds no:

- real customer PII
- real funds or cash movement
- account posting or settlement
- live provider networking
- Telebirr or M-PESA payment activation
- production authentication
- device or firmware control
- provider callback authority
- production cryptographic signing
- distributed exactly-once guarantee

## Validation target

Focused E1B tests cover:

1. deterministic canonical digest generation;
2. tamper detection;
3. transport/authority separation;
4. preservation of the no-settlement-authority boundary;
5. explicit idempotency/correlation/run evidence fields;
6. fail-closed governed reference/provenance pairing;
7. duplicate limitation/evidence reference rejection.

The branch should also pass TypeScript, production build and `git diff --check`. Full-suite host-specific persistence behavior remains governed by the existing baseline evidence until the stacked PR is retargeted to `main` and runs the normal Linux workflow.

## Next workstream

E1C should build synthetic provenance/evidence manifests on top of this envelope rather than inventing a second event format.
