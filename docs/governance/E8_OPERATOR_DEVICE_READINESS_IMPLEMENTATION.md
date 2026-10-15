# E8 - Operator Training & Device Readiness Implementation

**Status:** Stage-4 synthetic implementation
**Epic:** E8 - Operator Training & Device Readiness
**Base:** merged `main` after E7 Corridor Planning
**Authority posture:** readiness/evidence read model only; no real operator identity, production device control, provider command, financial authority or regulated operating authority

## 1. Purpose

E8 implements the governed Enawuga operator/device-readiness backlog item as a bounded Stage-4 evidence model. It adds synthetic training assignment/completion, certification expiry, refresher state, device readiness, support/escalation and suspension/return-to-service review without changing E1 Hub authorization or granting any financial/provider/device authority.

The implementation follows the blueprint instruction to keep these concerns in explicit related objects instead of overloading the core `Hub` aggregate.

## 2. Core contracts

`src/domain/hubOperatorDeviceReadiness.ts` defines strict schemas for:

- `OperatorTrainingAssignment`;
- training-module completion evidence;
- `DeviceReadinessEvidence`;
- `SupportEscalationEvidence`;
- `HubOperatorDeviceReadinessPlan`;
- derived `OperatorReadinessProjection`;
- derived `DeviceReadinessProjection`;
- `ReturnToServiceReview`;
- digest-protected `HubOperatorDeviceReadinessReadModel`.

Unknown fields fail schema validation. IDs, arrays and evidence references are bounded.

## 3. Training and certification

The synthetic curriculum models:

- core Hub operations;
- customer safeguarding;
- offline recovery;
- incident escalation.

Training assignments include a synthetic curriculum version, language pack, assigned modules, completion evidence, due date, certification effective/expiry dates, authorized device references, suspension state, support references and evidence references.

Derived states distinguish:

- training: `NOT_STARTED`, `PARTIAL`, `COMPLETE`;
- certification: `NOT_CERTIFIED`, `CURRENT`, `EXPIRING_SOON`, `EXPIRED`;
- refresher: `NOT_REQUIRED`, `DUE_SOON`, `REQUIRED`;
- operational readiness: `READY_SYNTHETIC`, `TRAINING_REQUIRED`, `REFRESHER_REQUIRED`, `SUSPENDED_REVIEW_REQUIRED`.

The current synthetic refresher window is 30 days. It is an engineering rule for the fixture/read model, not a partner certification policy.

No training or certification state creates financial, payment, posting, settlement, provider or regulated authority.

## 4. Device readiness

Device evidence is anchored to devices already present in the E1 Hub graph and records bounded synthetic fields for:

- application version;
- local-storage protection capability;
- sync health;
- last synthetic check-in;
- security posture;
- replacement/retirement state;
- support/escalation references.

Derived device readiness is one of:

- `READY_SYNTHETIC`;
- `NEEDS_REVIEW`;
- `OUT_OF_SERVICE`.

A device projection always states:

- `remoteControlEnabled: false`;
- `providerCommandEnabled: false`;
- `firmwareMutationEnabled: false`.

The synthetic `lastCheckIn` values are fixtures, not real telemetry.

## 5. Partner and shared-infrastructure visibility

Device evidence has explicit visibility:

- `ASSIGNED_PARTNER`; or
- `SHARED_HUB_INFRASTRUCTURE`.

An assigned-partner device must resolve to an E1 device whose assigned operator belongs to the same PartnerFI. A shared-infrastructure device cannot claim a partner owner.

The Adama Alpha model includes the Alpha-assigned synthetic agent terminal plus the explicitly shared connectivity gateway. The Beta model sees the shared synthetic gateway but does not receive the Alpha terminal or Alpha operator assignments.

## 6. Support and escalation

Support evidence is synthetic and must reference a governed operator assignment and/or Hub device. Training/device support references must resolve to evidence carried by the same readiness plan.

The fixtures exercise:

- an open synthetic connectivity escalation at the shared Adama Hub; and
- an open synthetic return-to-service review for the planned Arisi Alpha operator assignment.

There is no live helpdesk integration, incident dispatch or production escalation system.

## 7. Suspension and return-to-service

A suspended/expired operator receives a read-only `ReturnToServiceReview`.

Possible missing prerequisites are:

- `TRAINING_COMPLETE`;
- `CERTIFICATION_CURRENT`;
- `SUPPORT_ESCALATION_CLOSED`;
- `AUTHORIZED_DEVICE_READY`.

Return-to-service states are:

- `NOT_REQUIRED`;
- `REVIEW_REQUIRED`;
- `BLOCKED`.

Every return-to-service record has:

- `mutationEnabled: false`;
- `automaticReturnToService: false`.

When a suspended fixture has unresolved prerequisites, return-to-service is `BLOCKED`. Even if all modeled prerequisites are later satisfied, the result is only `REVIEW_REQUIRED` with `requiresFutureAuthorization: true`; E8 never auto-reactivates an operator.

## 8. Scope validation

Every readiness plan is bound to:

- one tenant;
- one Hub;
- one PartnerFI.

The Hub must exist in the E1 synthetic graph and carry the PartnerFI membership. Training assignments must resolve to operators for the same PartnerFI. Authorized device references must exist and must not cross operator assignment. Partner-scoped device evidence cannot cross PartnerFI scope. Support evidence cannot reference an operator outside the current PartnerFI.

All mismatches fail closed.

## 9. Synthetic fixtures

### Adama PartnerFI Alpha

The fixture exercises multiple readiness states:

- Alpha agent: complete/current -> `READY_SYNTHETIC`;
- Alpha supervisor: certification near expiry -> `REFRESHER_REQUIRED`;
- Alpha operations: partial training/no certification -> `TRAINING_REQUIRED`;
- Alpha partner admin: complete/current -> `READY_SYNTHETIC`;
- Alpha-assigned terminal: `READY_SYNTHETIC`;
- shared connectivity gateway: degraded/open support review -> `NEEDS_REVIEW`.

Overall state: `REVIEW_REQUIRED`.

### Adama PartnerFI Beta

The Beta agent training/certification fixture is current. The PartnerFI-scoped projection excludes Alpha operator assignments and the Alpha terminal. The shared gateway remains visible as explicitly shared Hub infrastructure and keeps the overall state at `REVIEW_REQUIRED`.

### Planned Arisi PartnerFI Alpha

The synthetic certification is expired and the operator fixture is suspended with an open support escalation. Return-to-service is `BLOCKED` pending current certification and closed escalation evidence. No field site, live operator or live device is implied.

## 10. Integrity metadata

Each read model includes a deterministic canonical SHA-256 `readinessDigest` using the existing evidence-integrity canonicalization utility.

The digest provides content-integrity metadata only. It is not:

- external verification;
- a training-provider attestation;
- an audit opinion;
- a device attestation;
- proof that a person completed real training;
- proof of live device posture;
- production signing or legal non-repudiation.

Schema-valid tampering causes verification failure.

## 11. Read-only API

E8 adds:

`GET /api/demo/hubs/:hubId/operator-device-readiness`

The route:

1. requires an authenticated synthetic session;
2. permits only `SUPERVISOR`, `OPERATIONS` or `PARTNER_ADMIN`;
3. reuses the E1 Hub authorization boundary (`HUB_SUPERVISE` or `HUB_PARTNER_REVIEW`);
4. derives tenant, Hub and PartnerFI scope from the authenticated Hub projection;
5. returns only matching Stage-4 readiness read models.

There is no POST/PATCH/PUT/DELETE endpoint for certification, suspension, return-to-service, device commands, firmware changes or readiness override.

## 12. Explicit Stage-4 read boundary

Every E8 read model asserts:

- `stage: STAGE_4`;
- `syntheticOnly: true`;
- `readOnly: true`;
- `realOperatorIdentityPresent: false`;
- `realDeviceTelemetryPresent: false`;
- `realSupportTicketingIntegrated: false`;
- `trainingCreatesFinancialAuthority: false`;
- `certificationCreatesFinancialAuthority: false`;
- `productionDeviceControlEnabled: false`;
- `remoteCommandsEnabled: false`;
- `automaticReturnToServiceEnabled: false`;
- `realFundsIncluded: false`;
- `partnerPostingAuthorityGranted: false`;
- `settlementAuthorityGranted: false`;
- `regulatedAuthorityGranted: false`.

## 13. Non-capabilities

E8 does **not** add or claim:

- real operator identities or employment records;
- real training-provider certification;
- production device enrollment or MDM;
- real device telemetry;
- remote device commands;
- firmware/application mutation;
- live support/helpdesk integration;
- automatic operator suspension or reactivation;
- production authentication;
- real PII;
- real funds or cash movement;
- PartnerFI posting/settlement;
- provider activation;
- regulated operating authority.

## 14. Validation contract

Exact local Windows validation for this implementation:

- focused E8 domain/API tests: **15/15 PASS**;
- cumulative governed Hub/workspace E1-E8 tests: **162/162 PASS**;
- TypeScript `tsc --noEmit`: **PASS**;
- production Vite build: **PASS**;
- `git diff --check`: **PASS**;
- full repository suite: **401/401 PASS**.

E8 adds no provider/payment persistence behavior. Hosted Linux GitHub Actions remains the authoritative merge gate for the exact PR head.

## 15. Files

- `src/domain/hubOperatorDeviceReadiness.ts`
- `src/server/demo-api.ts`
- `tests/hub-operator-device-readiness.test.ts`
- `tests/hub-operator-device-readiness-api.test.ts`
- `docs/governance/E8_OPERATOR_DEVICE_READINESS_IMPLEMENTATION.md`

## 16. Next governed gate

After E8 passes review and authoritative CI/merge, the machine-readable backlog next epic is **E9 - Neutrality & Scheme Governance**.

E9 must remain Stage-4-safe and model versioned scheme rules, route-equivalence checks, change-approval history, conflict-of-interest flags and governance evidence without granting commercial or regulated authority.
