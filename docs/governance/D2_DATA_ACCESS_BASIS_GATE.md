# D2 DATA_ACCESS_BASIS_GATE — Phase 2A-3

## Status

`TARGET_STAGE4_INTERNAL` synthetic policy-evaluation foundation only.

This slice implements the seventh Wave-D authorization predicate as an independently testable domain gate. It does not determine the lawful basis for any real processing activity, create legal sufficiency, approve a partner, or integrate the gate into the D4 runtime authorization stack yet.

## Supported basis types

- `CONSENT`
- `CONTRACTUAL_NECESSITY`
- `LEGAL_OBLIGATION`
- `OTHER_APPROVED_BASIS`

No basis value is self-authorizing. A UI selection, free-form string, contract number, mandate string, partner request or consent checkbox cannot satisfy the gate on its own.

## Stage-4 policy boundary

The current policy schema accepts only `SYNTHETIC_POLICY_FIXTURE`. An ALLOW result therefore means only that the request and basis record matched a governed synthetic Stage-4 policy fixture and recognized synthetic basis-evidence reference.

Every decision keeps:

- `legalSufficiencyEstablished=false`
- `externalApprovalEstablished=false`
- `regulatedAuthorityEstablished=false`

A future live/regulated policy representation requires separate legal/privacy/partner approval and must not be inferred from this Stage-4 implementation.

## Fail-closed evaluation

The gate checks:

1. policy lifecycle/effective window;
2. exact policy version;
3. exact basis ID;
4. basis lifecycle/effective window;
5. consent withdrawal where consent is the configured basis;
6. subject reference;
7. requesting organization;
8. requested purpose;
9. allowed basis type;
10. organization scope under the policy;
11. purpose scope under the policy;
12. requested data classes against the basis;
13. requested data classes against the policy;
14. recognized basis-evidence reference;
15. exact policy binding for `OTHER_APPROVED_BASIS`.

Missing, expired, revoked, withdrawn, mismatched, unsupported or unrecognized state returns DENY.

## Basis-specific evidence

`CONSENT`
- requires a consent-grant reference;
- forward access fails after a validated withdrawal time;
- does not permit contract/mandate/other-basis fields to be mixed into the same basis record.

`CONTRACTUAL_NECESSITY`
- requires a contract reference;
- architecture does not decide whether a real contract legally justifies the requested purpose.

`LEGAL_OBLIGATION`
- requires a mandate/authority reference;
- architecture does not decide whether the mandate is legally valid or applicable.

`OTHER_APPROVED_BASIS`
- requires an explicit approved-basis policy reference;
- remains disabled in practical terms unless a configured policy recognizes the evidence and exact policy reference.

## Data classes

The bounded initial vocabulary is:

- `PROFILE`
- `CONTACT`
- `SERVICE_HISTORY`
- `EVIDENCE`
- `DECISION_SUPPORT`

This is an internal authorization vocabulary, not a legal classification taxonomy.

## Offline boundary

Offline capture of consent intent or other basis evidence is not implemented as authorization here. The gate evaluates synchronized records/policy state. Offline capture alone must never release customer-specific projections or external packages.

## Runtime integration boundary

This slice does **not** modify `SyntheticAuthService` or existing HTTP authorization. D4 integration must compose this seventh predicate with role, tenant, partner, hub/service/capability, data-classification and purpose checks. A successful basis gate cannot override any other failed predicate.

## Next bounded work

1. persist basis/policy/audit records under D1 storage boundaries;
2. add consent withdrawal/re-evaluation event semantics;
3. integrate the gate into D4 scoped authorization as the seventh predicate;
4. propagate basis status into D6 package eligibility without exposing legal conclusions;
5. add human-review/audit surfaces for denied or stale policy evidence.

All future work must preserve `syntheticOnly=true`, `etResidencyApproved=false` and `regulatedModeAllowed=false`.