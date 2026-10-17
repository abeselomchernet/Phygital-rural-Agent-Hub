# D2 Evidence Signature Foundation — Phase 2A-2

## Status

`TARGET_STAGE4_INTERNAL` cryptographic integrity/origin foundation only.

This slice implements the Wave-D dual-profile signature architecture as algorithm-agile application primitives. It does not provision keys, select a production KMS/HSM, assert institutional acceptance, establish semantic truth, or grant any financial/regulatory authority.

## Implemented

- canonical SHA-256 payload digest binding;
- Ed25519 signature profile for bounded internal/edge-compatible Stage-4 artifacts;
- ECDSA P-256 + SHA-256 signature profile for future institution-compatible negotiation;
- explicit key ID and key-version binding inside the signed message;
- signed timestamp binding;
- fixed algorithm/profile validation before signing;
- fail-closed verification on payload tampering, metadata tampering, wrong key, wrong algorithm or unsupported EC curve;
- verification result keeps digest integrity, key profile and signature validity separate;
- verification always reports `semanticTruthEstablished=false` and `externalAuthorityEstablished=false`.

## Deliberate boundaries

- no production private keys are generated or stored by application code;
- no KMS/HSM vendor is selected;
- no production cryptoperiod or rotation schedule is asserted;
- no certificate/PKI trust chain is introduced;
- no regulator, NBE, PartnerFI, insurer or provider acceptance of Ed25519 or ECDSA P-256 is claimed;
- no evidence manifest is automatically considered true because it is signed;
- no signature activates a provider route, financial posting, settlement, credit approval, insurance adjudication or regulated mode;
- no external evidence-package release is enabled.

## Signature profiles

`ED25519`
- architecture support for bounded internal or edge-compatible artifact signing;
- signing/verification uses Ed25519 directly over a canonical signature-context message;
- external acceptance remains unproven.

`ECDSA_P256_SHA256`
- architecture support for future recipient/institution profiles where negotiated and approved;
- requires EC key on NIST P-256 / `prime256v1`;
- uses SHA-256 and IEEE-P1363 signature encoding;
- support does not mean any external party requires or accepts this profile.

## What is signed

The signature covers a canonical message containing:

- signature format/domain;
- algorithm;
- key ID;
- key version;
- canonical payload SHA-256 digest;
- signed timestamp.

Changing any of those fields invalidates verification. The raw payload is separately canonicalized and digested, so changing payload content also fails verification.

## Verification semantics

A successful result means only:

1. the supplied payload matches the signed digest;
2. the public key matches the declared cryptographic profile;
3. the signature verifies with that public key.

It does **not** mean:

- the source was legally authorized;
- the evidence is factually or semantically true;
- the signer is externally trusted;
- the key is regulator-approved;
- a transaction settled;
- a customer is eligible for credit;
- a claim or payout was approved;
- a regulator endorsed the artifact.

Trust-store, revocation, recipient negotiation and external assurance remain future bounded work.

## Key custody

Production physical key custody remains `EXTERNAL_VALIDATION_REQUIRED`. Keys are injected by callers. Test suites generate ephemeral in-memory keys only. No private key material is committed, logged or persisted by this slice.

## Next bounded D2 slices

1. key registry / trust-status / revocation metadata without production KMS provisioning;
2. governed PPID mapping persistence and migration from single `partnerCustomerId`;
3. customer phone dual-representation migration to encrypted field + blind index;
4. evidence-manifest integration using this signature envelope;
5. consent / `DATA_ACCESS_BASIS_GATE` foundation before D4 authorization integration.

All future work must preserve `syntheticOnly=true`, `etResidencyApproved=false` and `regulatedModeAllowed=false`.