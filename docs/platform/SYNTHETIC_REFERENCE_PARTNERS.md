# Synthetic Reference Partners

## Purpose

Synthetic Reference Partners prove that Enawuga is a reusable multi-partner platform rather than a hard-coded application for one institution. They deliberately expose different capabilities, roles, regions and route provenance through the same Enawuga core.

The fixtures are not substitutes for live partners and must never be presented as licensed institutions, partnerships or production integrations.

## Design rule

Do not create one synthetic institution that supports every feature. Heterogeneity is the test.

The reference set should make the following statement demonstrably true:

> Two agents using the same Enawuga codebase can receive different authorized services because their partner organization, role, region and capability contract differ.

The synthetic-reference-partner workstream defines organizations, contract grants, route references and scoped principals. The separate Partner Service Catalog workstream will define service metadata, and the separate capability-driven UI workstream will consume those contracts/catalogs to compose workspaces. This keeps the implementation slices reviewable rather than bundling UI behavior into the fixture layer.

## Reference organizations

### 1. Synthetic PartnerFI Alpha

Partner class: `FINANCIAL_INSTITUTION`

Purpose: full agent cash-service reference within synthetic mode.

Capabilities:

- `FIN.ACCOUNT_LOOKUP` — `SIMULATION_ONLY`
- `FIN.CASH_IN_AUTHORIZE` — `SIMULATION_ONLY`
- `FIN.CASH_OUT_AUTHORIZE` — `SIMULATION_ONLY`
- `LIQ.NLC_READ` — `SIMULATION_ONLY` for Supervisor

Regions:

- `region_syn_adama`
- `region_syn_arisi`

Explicitly absent:

- credit approval;
- real KYC authority;
- live settlement;
- production payment rails.

### 2. Synthetic PartnerFI Beta

Partner class: `FINANCIAL_INSTITUTION`

Purpose: prove that an FI can use Enawuga without cash-in/cash-out.

Capabilities:

- `FIN.ACCOUNT_LOOKUP` — `SIMULATION_ONLY`
- `FIN.SAVINGS_INQUIRY` — `SIMULATION_ONLY`
- `FIN.SERVICE_REQUEST` — `SIMULATION_ONLY`

Region:

- `region_syn_adama` only

Explicitly absent:

- cash-in authorization;
- cash-out authorization;
- NLC planning;
- payment-gateway authority.

This partner is critical: when capability-driven UI is introduced, if the Agent workspace still exposes cash controls for Beta, the platform abstraction is wrong.

### 3. Synthetic Gateway Gamma

Partner class: `PAYMENT_GATEWAY_SYSTEM_OPERATOR`

Purpose: provider-neutral payment orchestration reference independent of ArifPay branding.

Capabilities:

- `PAY.C2B_CREATE` — `SIMULATION_ONLY`
- `PAY.STATUS_QUERY` — `SIMULATION_ONLY`

Route:

- `route_syn_gateway_gamma_c2b`

Authority boundary:

- payment-provider acceptance is not PartnerFI settlement;
- no customer-account ownership.

### 4. Synthetic Mobile Money Delta

Partner class: `MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER`

Purpose: prove a direct mobile-money route can exist independently of a gateway route.

Capabilities:

- `PAY.C2B_CREATE` — `DISABLED`
- `PAY.STATUS_QUERY` — `SIMULATION_ONLY`

Route:

- `route_syn_mobile_delta_direct`

The fixture preserves direct-route provenance and does not reuse Gateway Gamma, ArifPay, Telebirr or M-PESA route identity.

### 5. Synthetic Identity Epsilon

Partner class: `IDENTITY_PROVIDER`

Current capability-contract vocabulary:

- `IDV.ONBOARD_VERIFY` — `SIMULATION_ONLY`

Data scope:

- synthetic customer reference and identity-attestation reference only;
- no raw biometric artifact;
- no real Fayda data.

A future re-verification capability would require its own provider-neutral capability-contract change; it is not silently invented inside this fixture workstream.

### 6. Synthetic FMCG Zeta

Partner class: `FMCG_DISTRIBUTOR_MERCHANT`

Capabilities:

- `FMCG.CATALOG_READ` — `SIMULATION_ONLY`
- `FMCG.INVENTORY_READ` — `SIMULATION_ONLY`
- `FMCG.RESTOCK_DRAFT` — `SIMULATION_ONLY`

Explicitly absent:

- live order submission;
- dispatch authority;
- commercial settlement.

Data scope:

- inventory aggregates;
- restock/route references;
- no unrelated KYC, identity-attestation or bank-account data.

### 7. Synthetic Fleet Eta

Partner class: `CASH_LOGISTICS_FLEET`

Capabilities:

- `FLEET.ROUTE_PLAN` — `SIMULATION_ONLY`
- `FLEET.DISPATCH` — `DISABLED`
- `FLEET.CASH_HANDOVER` — `DISABLED`

This fixture proves that planning permission does not imply custody or movement authority.

### 8. Synthetic Telco Theta

Partner class: `TELCO_COMMUNICATIONS`

Capability:

- `COMMS.SMS_SEND` — `SIMULATION_ONLY`

Purpose: ensure every current partner class has an explicit reference organization without treating communication capability as a payment or PartnerFI authority.

Data scope:

- synthetic customer-contact reference and audit reference only.

## Role and scope intent

| Reference partner | Agent | Supervisor | Operations | Partner Admin |
|---|---|---|---|---|
| PartnerFI Alpha | account + cash request capabilities | regional/NLC view | later exception/reconciliation service catalog | contract/capability evidence |
| PartnerFI Beta | account + savings/service request capabilities | later scoped service overview | later service exceptions | contract/capability evidence |
| Gateway Gamma | no generic FI workspace | none by default | C2B/status evidence | route/config evidence |
| Mobile Money Delta | no C2B while disabled | none | status/readiness only | route/config evidence |
| Identity Epsilon | bounded verification when service requires it | none by default | identity-provider status | data/capability evidence |
| FMCG Zeta | catalog/inventory references where assigned | regional inventory/restock planning | inventory exceptions later | data/capability evidence |
| Fleet Eta | none by default | route planning | planning evidence | capability evidence |
| Telco Theta | no generic workspace | none by default | bounded communications evidence | capability evidence |

The table describes intended consumption by later Service Catalog and capability-driven UI workstreams. The reference-contract layer itself does not create pages or navigation.

## Region heterogeneity

Use at least two synthetic regions:

- `region_syn_adama`
- `region_syn_arisi`

PartnerFI Alpha is available in both; PartnerFI Beta only in Adama. This proves service/capability visibility is region-scoped and prevents a future national hard-code.

## Agent heterogeneity

Use distinct synthetic memberships and groups, for example:

```text
agent_syn_alpha_01 -> PartnerFI Alpha / Adama / Alpha agent group
agent_syn_beta_01  -> PartnerFI Beta / Adama / Beta agent group
agent_syn_alpha_02 -> PartnerFI Alpha / Arisi / Alpha agent group
```

No principal gains another organization's capability merely because both principals have the role `AGENT`.

## Relationship to real sandbox providers

ArifPay sandbox, Telebirr TestBed foundation and M-PESA Ethiopia sandbox foundation remain evidence-backed provider-specific foundations. They are not renamed as synthetic reference organizations.

Reference partners test the reusable architecture. Provider-specific sandbox/TestBed foundations test external contracts. Both can coexist but remain distinguishable.

## Phased acceptance tests

### Synthetic reference partner runtime slice

This workstream must prove:

1. all reference contracts pass the strict Partner Capability Contract schema;
2. Alpha has cash-in/cash-out while Beta does not;
3. Beta exposes savings/service-request capabilities without institution-specific evaluator branches;
4. region and partner membership scopes fail closed;
5. Gateway Gamma and Mobile Money Delta keep distinct route/adapter provenance;
6. Fleet route planning does not authorize dispatch or cash handover;
7. FMCG data scope excludes unrelated identity and financial data;
8. every current partner class has a synthetic reference organization;
9. no single synthetic fixture exposes the whole capability vocabulary.

### Later Service Catalog + capability-driven UI slices

Those separate workstreams must then prove:

1. Alpha and Beta generate different Agent workspaces from the same page framework;
2. changing a contract/catalog changes service visibility without editing partner-specific page code;
3. Beta never receives cash controls merely because the common Agent UI supports cash for Alpha;
4. E2E and server-side authorization agree on partner, role, region and object scope.

## Acceptance criteria

- At least two materially different synthetic PartnerFIs.
- At least one synthetic reference for every current partner class.
- All fixtures pass the Partner Capability Contract schema.
- No fixture contains real PII, real credentials or claims of external partnership.
- No single fixture exposes every capability.
- Real/provider-specific routes remain separate from synthetic routes.
- UI composition is deferred to the dedicated capability-driven UI workstream rather than embedded in partner fixtures.

## Out of scope

- Production institution names/configuration.
- Real agent enrollment.
- Real accounts/funds.
- Live provider credentials.
- Live dispatch, cash handover or settlement.
- Partner Service Catalog implementation.
- Capability-driven UI implementation.
