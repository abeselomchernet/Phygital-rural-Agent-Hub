# E9 - Neutrality & Scheme Governance Implementation

**Status:** Stage-4 synthetic implementation
**Epic:** E9 - Neutrality & Scheme Governance
**Base:** merged `main` after E8 Operator Training & Device Readiness
**Authority posture:** inspectable governance/read model only; no route mutation, provider fallback, commercial authority or regulated authority

## 1. Purpose

E9 implements the governed Enawuga neutrality backlog item as a bounded Stage-4 inspection model. It makes scheme rules, partner-equivalence evidence, policy change history, conflict-of-interest flags and governance decision records explicit without changing E2 service resolution or granting routing/commercial authority.

The implementation preserves the core architecture:

`Service -> Capability -> Route -> Adapter -> Partner -> Environment`

and does not create a second routing engine.

## 2. Versioned neutrality policy

`src/domain/hubNeutralityGovernance.ts` defines a strict `NeutralitySchemePolicy` with seven required Stage-4 rules:

- `NO_UNAUTHORIZED_PREFERENTIAL_ROUTING`;
- `ROUTE_PROVENANCE_REQUIRED`;
- `PARTNER_EQUIVALENCE_REVIEW`;
- `CONTRACT_SCOPE_PRECEDENCE`;
- `POLICY_CHANGE_REVIEW_REQUIRED`;
- `CONFLICT_DISCLOSURE_REQUIRED`;
- `CUSTOMER_DATA_ISOLATION_REQUIRED`.

Each rule carries a policy version, synthetic lifecycle state and evidence references. All rule versions must match the current policy version.

The synthetic fixture uses policy version 2. A contiguous v1 -> v2 change-history record is present and explicitly states:

- `productionEffect: false`;
- `routingMutationAuthorized: false`.

`ACCEPTED_SYNTHETIC` means only that the synthetic governance fixture records a reviewed change. It is not an institutional, commercial or regulatory approval.

## 3. Route-equivalence checks

E9 derives route participants from the current repository source of truth:

- PartnerFI service catalog;
- Partner capability contract/grant;
- registered route and adapter;
- E2 Hub service binding;
- target Hub region.

A route-equivalence check compares governance eligibility dimensions such as:

- capability identity;
- service type;
- workflow template;
- offline policy;
- input data-class requirements;
- role classes;
- Hub-region eligibility;
- route provenance;
- contract route authorization;
- enabled Hub service binding.

Possible results are:

- `EQUIVALENT_FOR_SYNTHETIC_REVIEW`;
- `DIFFERENCE_REQUIRES_REVIEW`;
- `NOT_COMPARABLE`.

The meaning is deliberately narrow:

`GOVERNANCE_ELIGIBILITY_COMPARISON_ONLY_NOT_PROVIDER_OR_ROUTE_INTERCHANGEABILITY`

Every check always states:

- `routeInterchangeable: false`;
- `fallbackAuthorized: false`;
- `automaticRouteSelectionAuthorized: false`.

This preserves the E1E invariant that route/provider pinning and idempotency rules cannot be bypassed by a neutrality comparison.

## 4. Synthetic equivalence fixtures

### Shared Account Lookup

PartnerFI Alpha and PartnerFI Beta both expose `FIN.ACCOUNT_LOOKUP` at the shared Adama Hub. Their synthetic catalog/contract/binding semantics align on the governed comparison dimensions, so the check returns:

`EQUIVALENT_FOR_SYNTHETIC_REVIEW`

The underlying routes remain different (`route_syn_partnerfi_alpha_core` vs `route_syn_partnerfi_beta_core`). The result does not permit substitution, fallback or automatic route selection.

### Non-comparable services

Alpha Cash In and Beta Service Request use different capabilities. E9 returns:

`NOT_COMPARABLE`

with `CAPABILITY_MISMATCH` rather than forcing unrelated services into a false equivalence class.

A same-capability difference in a policy dimension such as offline handling returns `DIFFERENCE_REQUIRES_REVIEW` while keeping fallback/interchangeability false.

## 5. Conflict-of-interest and incentive disclosure

Each Hub-member PartnerFI has an explicit synthetic conflict-of-interest record.

The baseline fixture uses:

- `NONE_IDENTIFIED_SYNTHETIC`;
- `NONE_DECLARED_SYNTHETIC` incentive disclosure.

These are synthetic test states, not real commercial findings about any institution.

If a fixture is changed to `DECLARED_SYNTHETIC_REVIEW_REQUIRED`, the scheme moves to `REVIEW_REQUIRED`. E9 does not automatically clear a conflict, alter routing or approve a commercial incentive.

The read boundary explicitly states `realCommercialIncentiveDataPresent: false`.

## 6. Governance decisions

E9 carries bounded `NeutralityGovernanceDecision` records for policy-change review, route-equivalence review and future conflict review.

Every decision record has authority flags fixed to false for:

- route mutation;
- commercial authority;
- regulated authority.

Decision references must resolve to an existing comparison, policy-change or conflict record. Unknown references fail closed.

## 7. Neutrality state

The read model derives one of:

- `NO_SYNTHETIC_EXCEPTION_IDENTIFIED`;
- `REVIEW_REQUIRED`;
- `EVIDENCE_INCOMPLETE`.

The baseline Stage-4 fixture reaches `NO_SYNTHETIC_EXCEPTION_IDENTIFIED`. This means only that the bounded synthetic evidence does not contain a modeled exception. It does **not** claim production neutrality, independent audit assurance or real-world partner equivalence.

Route provenance, contract-route or Hub-binding gaps produce `EVIDENCE_INCOMPLETE`. Synthetic conflicts, unreviewed policy changes or same-capability differences produce `REVIEW_REQUIRED`.

## 8. Hub and partner scope

The scheme is anchored to the E1 shared Adama Hub and current synthetic tenant.

Route-equivalence participants must:

- be synthetic member PartnerFIs of the Hub;
- target the Hub's region;
- resolve through the current PartnerFI catalog/contract and E2 service binding.

A non-member provider or wrong-region comparison fails closed.

Scheme-level metadata can name both compared PartnerFIs because the purpose is neutrality inspection. It exposes no customer-level object data and no partner customer records.

## 9. Data isolation

E9 does not add cross-partner customer visibility. The API/read model contains only bounded synthetic governance metadata such as PartnerFI IDs, service/capability/route references, policy classes and evidence references.

The read boundary asserts:

- `customerLevelRestrictedDataPresent: false`;
- `crossPartnerCustomerDataExposed: false`.

Tests also prove that synthetic customer object IDs are absent from the API response.

## 10. External audit boundary

The blueprint anticipates independent audit evidence references in a later maturity state. Current Stage 4 does not manufacture such evidence.

`externalAuditEvidenceRefs` is required to be empty and every read model states:

`externalAuditEvidencePresent: false`.

Synthetic governance evidence references are not an independent audit, external attestation or regulatory review.

## 11. Integrity metadata

Each read model includes a deterministic canonical SHA-256 `neutralityDigest` using the repository evidence-integrity utility.

The digest protects read-model content against schema-valid tampering. It is not:

- external verification;
- proof of real commercial neutrality;
- a provider attestation;
- an audit opinion;
- route authorization;
- legal non-repudiation.

## 12. Read-only API

E9 adds:

`GET /api/demo/hubs/:hubId/neutrality-governance`

The route:

1. requires an authenticated synthetic session;
2. permits `SUPERVISOR`, `OPERATIONS` or `PARTNER_ADMIN`;
3. reuses the E1 Hub authorization boundary;
4. derives tenant and Hub scope server-side;
5. returns only the Stage-4 scheme-level read model for the authorized Hub.

There is no POST/PATCH/PUT/DELETE endpoint for policy approval, route selection, fallback enablement, conflict clearing or commercial incentive approval.

## 13. Explicit Stage-4 read boundary

Every E9 read model states:

- `stage: STAGE_4`;
- `syntheticOnly: true`;
- `readOnly: true`;
- `customerLevelRestrictedDataPresent: false`;
- `crossPartnerCustomerDataExposed: false`;
- `realCommercialIncentiveDataPresent: false`;
- `externalAuditEvidencePresent: false`;
- `liveRouteMutationEnabled: false`;
- `routeFallbackAuthorized: false`;
- `providerInterchangeabilityClaimed: false`;
- `liveNetworkAllowed: false`;
- `realFundsIncluded: false`;
- `settlementAuthorityGranted: false`;
- `productionRoutingAuthorityGranted: false`;
- `commercialAuthorityGranted: false`;
- `regulatedAuthorityGranted: false`.

## 14. Explicit non-capabilities

E9 does **not** add or claim:

- automatic routing or route substitution;
- provider fallback authority;
- provider technical/commercial interchangeability;
- real partner fee/incentive disclosures;
- cross-partner customer data access;
- independent audit evidence;
- production network calls;
- real funds or settlement;
- commercial contract approval;
- regulated scheme authority;
- production signing/non-repudiation.

## 15. Validation contract

Exact local Windows validation for this implementation:

- focused E9 domain/API tests: **17/17 PASS**;
- cumulative governed Hub/workspace E1-E9 tests: **179/179 PASS**;
- TypeScript `tsc --noEmit`: **PASS**;
- production Vite build: **PASS**;
- `git diff --check`: **PASS**;
- full repository suite: **418/418 PASS**.

The E8 post-merge `main` Linux validation completed successfully before the E9 merge gate.

Hosted Linux GitHub Actions remains the authoritative merge gate for the exact E9 PR head.

## 16. Files

- `src/domain/hubNeutralityGovernance.ts`
- `src/server/demo-api.ts`
- `tests/hub-neutrality-governance.test.ts`
- `tests/hub-neutrality-governance-api.test.ts`
- `docs/governance/E9_NEUTRALITY_GOVERNANCE_IMPLEMENTATION.md`

## 17. Next governed gate

The next backlog item is **E10 - Inclusion Analytics**, but its status is `PROPOSED_REQUIRES_DATA_PURPOSE_REVIEW` and Stage-4 safety is `synthetic_only`.

The backlog requires all of the following before implementation beyond a strictly synthetic design boundary:

- approved purpose;
- approved data fields;
- privacy/legal review;
- partner policy.

The rule is: aggregate by default and do not collect sensitive data solely for dashboards.

E9 does not create or imply any of those E10 approvals. The next step after E9 is therefore to verify whether those explicit governance prerequisites exist; absent them, E10 must remain gated rather than being inferred or self-authorized.
