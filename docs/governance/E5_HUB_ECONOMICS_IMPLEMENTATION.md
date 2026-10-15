# E5 ? Hub Economics & Revenue Attribution Implementation

**Status:** Stage-4 synthetic implementation

## Purpose

E5 implements the bounded Hub Economics evidence module required by the governed Enawuga market-design backlog. It exists to make economic hypotheses inspectable without converting model assumptions into accounting truth, pilot performance, forecast accuracy, or regulated financial evidence.

The governing product blueprint requires assumptions and observations to remain separate and identifies four evidence classes: `MODEL_ASSUMPTION`, `MODEL_OUTPUT`, `OBSERVED`, and `EXTERNALLY_VERIFIED`. The current Stage-4 implementation defines all four labels but intentionally populates only `MODEL_ASSUMPTION` and `MODEL_OUTPUT`.

## Scope implemented

E5 adds:

- `HubEconomicsScenario` for strict synthetic model inputs;
- per-service `HubRevenueAttribution`;
- fixed-versus-variable cost classification;
- shareable-versus-non-shareable fixed-cost classification;
- deterministic modeled revenue, variable cost, total cost and margin outputs using integer ETB minor units;
- an explicit model-vs-observed variance object that is `NOT_AVAILABLE_STAGE4` while no accepted observation exists;
- evidence references on assumptions and derived outputs;
- explicit `SYNTHETIC_MODEL_ONLY` confidence labeling instead of numeric confidence precision;
- deterministic canonical SHA-256 content integrity for the read model;
- shared-Hub PartnerFI isolation;
- read-only Hub economics API projection.

## Evidence-class boundary

The machine-readable evidence vocabulary is:

- `MODEL_ASSUMPTION`
- `MODEL_OUTPUT`
- `OBSERVED`
- `EXTERNALLY_VERIFIED`

Current synthetic fixtures may use only the first two as evidence availability. `OBSERVED` is false and `EXTERNALLY_VERIFIED` is false in every Stage-4 read model.

A model output is derived arithmetic over model assumptions. It is not an observation. A checksum is content-integrity metadata. It is not external verification. A synthetic value must never be promoted into `OBSERVED` merely because the application displayed, persisted, exported or repeatedly reproduced it.

## Model inputs

A Stage-4 scenario is scoped by:

- tenant;
- Hub;
- PartnerFI;
- model version;
- bounded modeling period;
- governed service assumptions;
- fixed-cost assumptions;
- evidence references.

Each service assumption contains synthetic monthly volume, unit revenue in ETB minor units and unit variable cost in ETB minor units. Each fixed cost is explicitly `FIXED` and separately classified as `SHAREABLE` or `NON_SHAREABLE`.

These values are synthetic hypotheses chosen to exercise the product contract and arithmetic. They are not forecasts, tariff proposals, audited costs, observed transaction volumes, partner pricing, financial statements or pilot results. Their confidence is therefore machine-labeled `SYNTHETIC_MODEL_ONLY`; E5 does not manufacture a percentage confidence score.

## E1/E2 scope enforcement

E5 does not invent service scope. Before a scenario can produce a read model, the generator verifies that:

1. the Hub exists in the governed synthetic Hub graph;
2. tenant and Hub match;
3. the PartnerFI is a member of that Hub;
4. every economic service reference is an `ENABLED_SYNTHETIC` E2 Hub service binding for that same Hub and PartnerFI.

A Beta service cannot be inserted into an Alpha scenario, and a nonmember partner cannot acquire an economics projection through a synthetic value record.

## Revenue attribution and cost model

For each governed service:

```text
modeled service revenue
  = synthetic monthly volume
  ? synthetic unit revenue
```

and:

```text
modeled variable cost
  = synthetic monthly volume
  ? synthetic unit variable cost
```

The Hub/PartnerFI model then derives:

```text
modeled total cost
  = modeled variable cost
  + synthetic fixed-cost assumptions

modeled margin
  = modeled revenue
  - modeled total cost
```

All arithmetic is integer arithmetic in ETB minor units. The output may be positive or negative. Neither result means the Hub is viable or non-viable in reality.

## Model-vs-observed variance

The schema reserves a dedicated model-vs-observed variance surface, but current Stage-4 output is deliberately:

- status: `NOT_AVAILABLE_STAGE4`;
- modeled margin: available as `MODEL_OUTPUT`;
- observed margin: `null`;
- variance: `null`;
- observed evidence references: empty.

This prevents the absence of pilot observations from being silently replaced with synthetic numbers or zeroes.

Future observed values require a later authorized evidence path. External verification must be a still stronger state backed by accepted external evidence; it cannot be inferred from observation alone.

## Synthetic fixtures

The current fixture set contains separate model scenarios for:

- PartnerFI Alpha at the shared synthetic Adama Hub; and
- PartnerFI Beta at the same shared synthetic Adama Hub.

The two scenarios use their own governed E2 service IDs and cannot leak across PartnerFI scope. They exist to prove the generic model and isolation behavior, not to represent commercial terms of any real institution.

## Integrity boundary

Each read model carries a canonical SHA-256 `economicsDigest`. Verification recomputes the digest and fails closed on schema-valid tampering.

The digest proves only that the canonical read-model content matches the recorded digest. It is not:

- provider attestation;
- accounting assurance;
- external validation;
- legal non-repudiation;
- proof that a transaction occurred;
- proof that revenue or cost was observed;
- proof of forecast accuracy.

## API

E5 adds the read-only route:

```text
GET /api/demo/hubs/:hubId/economics
```

The route:

- requires a synthetic authenticated session;
- allows only `SUPERVISOR`, `OPERATIONS`, or `PARTNER_ADMIN`;
- reuses E1A `HUB_SUPERVISE` or `HUB_PARTNER_REVIEW` authorization as appropriate;
- derives tenant, Hub and PartnerFI scope from the authenticated server-side session/Hub projection;
- returns only that scoped economics read model.

There is no POST/PUT/PATCH/DELETE economics action route. No caller can submit or approve economic evidence through this API.

## Machine-enforced Stage-4 boundaries

Every E5 read model states:

- `stage: STAGE_4`;
- `syntheticOnly: true`;
- `readOnly: true`;
- `modelIsObservedPerformance: false`;
- `forecastAccuracyClaimed: false`;
- `accountingTruthClaimed: false`;
- `realFundsIncluded: false`;
- `partnerPostingAuthorityGranted: false`;
- `settlementAuthorityGranted: false`;
- `observedPilotEvidencePresent: false`;
- `externalVerificationPresent: false`.

## Explicit non-capabilities

E5 does not add:

- real PII or customer records;
- real transaction or settlement data;
- real revenue, cost, margin or accounting records;
- audited or externally verified economics;
- observed pilot values;
- forecast accuracy claims;
- commercial pricing authority;
- PartnerFI posting or settlement authority;
- cash movement or custody;
- provider activation or live provider networking;
- production authentication;
- a regulated pilot or production capability;
- an economics mutation/approval endpoint.

## Local validation

Validated on the exact E5 implementation state before commit:

- focused E5 Hub economics domain/API tests: **14/14 passed**;
- cumulative E1A?E5 Hub/workspace/liquidity/offline/economics tests: **124/124 passed**;
- `npm run lint` / `tsc --noEmit`: **passed**;
- production Vite build: **passed**;
- `git diff --check`: **passed**;
- full Windows repository suite: **346/353 passed**.

The seven failures are the same established Windows M-PESA/Telebirr persistence/fsync baseline:

1. reserved unresolved attempt survives restart and requires reconciliation without repost;
2. two preloaded local stores cannot overwrite one another;
3. preorder correlation intent survives restart before any provider mutation;
4. same idempotency key with changed preorder intent fails closed;
5. same Enawuga transaction cannot reserve a second Telebirr intent;
6. merchant-order ID and nonce are globally replay protected;
7. durable snapshot stores correlation intent but no Telebirr secrets or signatures.

E5 adds no payment/provider persistence path. Hosted Linux GitHub Actions remains the authoritative merge gate for the exact PR head.

## Next governed gate

After E5 is accepted, the next proposed backlog epic is **E6 ? Pilot Evidence Engine**. A numeric threshold must never self-authorize pilot progression or scale. Pilot targets, metric observations, evidence references, gate reviews, gate decisions and scale decisions must remain separately governed, and Stage-4 fixtures must not be represented as real pilot evidence.
