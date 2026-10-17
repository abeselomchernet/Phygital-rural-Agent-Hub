# D2 Privacy / Identity Foundation — Phase 2A-1

## Status

`TARGET_STAGE4_INTERNAL` foundation only.

This slice implements bounded cryptographic identity primitives selected by Wave-D ADR-D2-02 and the D2.4 low-entropy lookup architecture. It does not activate production identity sharing, KMS/HSM custody, PartnerFI onboarding, regulated data processing, or live financial authority.

## Implemented

- deterministic HMAC-SHA256 pairwise pseudonymous identifiers (PPIDs);
- partner-level and service-level PPID scope separation;
- 160-bit truncated PPID output encoded with Base64URL;
- explicit key-version binding in PPID output;
- keyed HMAC-SHA256 blind indexes for Ethiopian mobile-number lookup;
- tenant separation in blind-index derivation;
- AES-256-GCM phone-field encryption with 96-bit random nonces;
- customer ID + key version bound as authenticated additional data (AAD);
- explicit separation of PPID, blind-index and field-encryption key purposes;
- fail-closed rejection of wrong key length, key-purpose reuse, invalid phone formats and authenticated-decryption failures.

## Not implemented in this slice

- production KMS/HSM selection or provisioning;
- storage of production cryptographic keys;
- key escrow/recovery ceremonies;
- production cryptoperiods or regulatory rotation periods;
- automatic key rotation;
- migration of the existing `CustomerStore` plaintext phone alias representation;
- replacement of `partnerCustomerId` with persistent multi-partner PPID mappings;
- PostgreSQL PPID/customer-phone schema or runtime migration;
- Ed25519/ECDSA artifact signing;
- consent / lawful-basis authorization;
- external PartnerFI identity exchange.

## Privacy boundary

The internal canonical customer UUID remains an Enawuga internal identifier. A PPID is derived from the canonical customer UUID and the authorized partner/service scope using a keyed PRF. Different partner or service scopes produce different pseudonyms. This creates computational separation under the HMAC-SHA256 PRF assumption and secret-key confidentiality; it does not make cross-context linkage mathematically impossible and does not prevent linkage through auxiliary data.

Phone/MSISDN lookup uses a keyed blind index rather than an unkeyed hash. The blind index is deterministic only inside the intended tenant/key-version context. Plain SHA-256 of phone numbers remains rejected as a privacy boundary.

Recoverable phone storage is separately encrypted with AES-256-GCM. Lookup and decryption use different key classes. Database compromise alone is not treated as equivalent to key compromise.

## Key custody boundary

All functions accept cryptographic key material from their caller. No key is generated, persisted, logged, exported, committed, or provisioned by this slice. Tests use synthetic in-memory keys only.

Production physical custody remains `EXTERNAL_VALIDATION_REQUIRED`. `etResidencyApproved=false` and `regulatedModeAllowed=false` remain unchanged.

## Runtime integration boundary

The existing customer runtime is intentionally unchanged in this slice. `CustomerStore` continues to use its current synthetic representation until a separately reviewed migration slice introduces dual representation, readback verification, rollback, and persistence migration.

The new functions therefore provide cryptographic building blocks, not a claim that Farmer 360, PartnerFI mappings, or customer lookup are already PPID/encryption-backed in the running application.

## Security invariants

1. PPID key != blind-index key != field-encryption key.
2. Each privacy key is exactly 256 bits in the current bounded implementation.
3. Partner PPID scope != service PPID scope.
4. Partner A PPID != Partner B PPID for the same internal subject.
5. Service A PPID != Service B PPID for the same partner/subject.
6. Phone blind index != plaintext phone and != plain SHA-256(phone).
7. Phone ciphertext uses randomized AES-GCM nonces.
8. Customer ID and encryption key version are authenticated as AAD.
9. Tampered ciphertext/AAD/authentication tags fail closed.
10. Cryptography does not create identity, financial, regulatory, or PartnerFI decision authority.

## Next bounded D2 slices

Recommended continuation while the D1 PostgreSQL canary observation accrues:

1. D2 signature/key-version foundation for Ed25519 plus ECDSA P-256 algorithm agility, without external acceptance claims.
2. governed persistent PPID mapping model and migration from the single `partnerCustomerId` field.
3. customer phone dual-representation migration to blind-index + encrypted field storage.
4. evidence-manifest signing and offline verification.
5. consent / `DATA_ACCESS_BASIS_GATE` foundation before D4 authorization integration.

Each remains a separate reviewable PR and must preserve `syntheticOnly=true`.