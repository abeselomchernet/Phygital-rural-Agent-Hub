# B5 — edge storage contract and threat model

Status: **INTERFACE / FAIL-CLOSED PLACEHOLDER**. `src/security/edge-storage.ts` defines sealed-record binding and key lifecycle operations. `UnavailableEncryptedEdgeStorage` rejects seal/open/rotate/retire; it never stores plaintext or pretends to encrypt it. Regulated construction fails even with residency set to ET. The interface is not wired into the existing browser outbox: IndexedDB remains plaintext, synthetic-only. No encryption implementation, secure hardware, certified cryptography, HSM, TPM, Secure Element, TEE or approved key custody is claimed.

| Threat | Current boundary/evidence | Required before real edge storage |
| --- | --- | --- |
| Device compromise / XSS | Synthetic fixtures only; no encryption claim | Authenticated encryption does not protect an unlocked compromised client. Harden OS/browser, CSP, software updates, access and incident controls; assess memory capture |
| Stolen session | HttpOnly same-site cookie, CSRF, role/object checks, expiry/revocation; development identity only | Partner identity, device binding and reauthentication policy, effective revocation, abuse limits; CSRF does not defeat session theft |
| Offline replay | Stable event/transaction IDs, durable receiver replay receipts/tombstones and sequence checks tested locally | Durable atomic uniqueness across processes, approved replay windows; never trust client clocks or transport as authorization |
| Queued-message tampering | Strict envelope validation and replay fingerprint checks; browser records are not authenticated | Approved AEAD implementation, unique nonce per key; authenticate version, record/device/customer ID, sequence and schema as associated data; reject modified ciphertext/tag/binding before parsing |
| Clock skew | Local receiver rejects events older than seven days or more than 60 seconds ahead | Approved server-time source and review for clock anomalies; no extending expiry by changing client timestamps |
| Lost/stolen device | No remote wipe or device key is implemented | Revoke sessions/device keys, quarantine old queue, governed recovery and incident review; no new transaction IDs to bypass deduplication |
| Recovery | No automatic legacy migration or upload; recovery design in B4 | Explicit ownership, consent and partner authority, replay continuity, authenticated backup restore and reconciliation |
| Key rotation | Interface operations reject as unavailable | Versioned keys, authorized rotation and rewrap/re-encrypt procedure, nonce uniqueness, controlled overlap, old-key retirement, backup recovery and revocation tests; no keys alongside ciphertext |
| Data at rest | Local JSON and IndexedDB are plaintext synthetic fixtures | Approved cipher/library, envelope key design, ET-approved custody/backup locations, least privilege, metadata minimization, deletion and recovery evidence |

A future adapter must validate bindings before decryption, apply size/version limits, fail closed on missing/revoked keys or corrupt data, and never fall back to plaintext. Rotation must preserve transaction/event identity and cannot mark anything delivered/authorized/settled. Key deletion and cryptographic erasure claims require evidence across replicas and backups. No prototype method authorizes cash, settlement or real identity verification.

Acceptance evidence for this bounded phase: unavailable operations reject and leave supplied bytes unchanged; both regulated configurations reject; existing transport tests cover tampering/replay/clock windows/restart. AEAD round-trip, ciphertext tamper, nonce/key rotation and custody tests remain prerequisites for a future actual adapter, not passing claims here.
