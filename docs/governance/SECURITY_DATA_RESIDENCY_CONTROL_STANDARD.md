# Security, Data Residency & Control Standard

## 1. Principle

Security and residency controls are evidence-based. Region labels, provider marketing statements or environment variables do not prove approved residency or regulated readiness.

## 2. Data classes

At minimum classify:

- Public/product content.
- Internal operational data.
- Customer personal data.
- Identity/KYC data.
- Financial/account data.
- Transaction/payment data.
- Authentication/session data.
- Secrets/credentials/keys.
- Audit/security events.
- Location/device/fleet data.
- Partner commercial data.

Each data class MUST have permitted storage, transit, logging, retention and access rules before live use.

## 3. Ethiopia-resident controlled environment gate

Before restricted real data is introduced, evidence MUST exist for:

- compute/ingress physical location;
- database primary and replica locations;
- backups and DR copies;
- audit store;
- operational logs/telemetry;
- secret/key custody and administration;
- vendor support access;
- subprocessors;
- data egress routes.

## 4. Encryption and key custody

The current encrypted-edge abstraction is not proof of encryption. Live restricted data requires an implemented, tested and approved design covering:

- encryption in transit;
- encryption at rest;
- key ownership;
- generation;
- access;
- rotation;
- revocation;
- backup/recovery;
- lost/stolen device response;
- administrative jurisdiction.

Do not claim HSM/TPM/TEE/Secure Element/certified encryption unless actually implemented and evidenced.

## 5. Identity and access management

Required for controlled staging/live:

- server-verified authentication;
- MFA for privileged roles;
- least privilege;
- organization scope;
- joiner/mover/leaver process;
- periodic access review;
- break-glass controls;
- session expiry/revocation;
- privileged action audit.

## 6. Audit

Audit records MUST be redacted and structured. They may include controlled terms such as FINANCIAL or PHONE_ALIAS_CHANGED but MUST NOT expose raw sensitive material such as:

- raw phone numbers where not necessary;
- FIN/FAN values;
- raw identity-provider payloads;
- session IDs/tokens/CSRF secrets;
- OTPs;
- credentials;
- biometrics.

## 7. Edge/offline

Before restricted offline storage is enabled:

- data-at-rest protection must be implemented;
- queued-message integrity/tamper control must be tested;
- replay and sequence policy must be enforced;
- lost/stolen device recovery must be defined;
- pre-existing browser/local records must not silently upload when a remote receiver becomes available;
- migration requires an explicit governed path.

## 8. Monitoring and incident response

Operational monitoring MUST avoid payload leakage. Joint incident procedures SHOULD define:

- severity;
- owner;
- escalation;
- provider notification;
- evidence preservation;
- credential/key rotation;
- containment;
- recovery;
- post-incident review.
