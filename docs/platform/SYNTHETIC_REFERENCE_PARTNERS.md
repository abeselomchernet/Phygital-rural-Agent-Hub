# Synthetic Reference Partners

## Purpose

Synthetic Reference Partners prove that Enawuga is a reusable multi-partner platform rather than a hard-coded application for one institution. They deliberately expose different capabilities, services, roles and regions through the same Enawuga core.

The fixtures are not substitutes for live partners and must never be presented as licensed institutions, partnerships or production integrations.

## Design rule

Do not create one synthetic institution that supports every feature. Heterogeneity is the test.

The reference set should make the following statement demonstrably true:

> Two agents using the same Enawuga codebase can see different authorized services because their partner organization, role, region and capability contract differ.

## Reference organizations

### 1. Synthetic PartnerFI Alpha

Partner class: `FINANCIAL_INSTITUTION`

Purpose: full agent cash-service reference within synthetic mode.

Capabilities:

- `FIN.ACCOUNT_LOOKUP` — SIMULATION_ONLY
- `FIN.CASH_IN_AUTHORIZE` — SIMULATION_ONLY
- `FIN.CASH_OUT_AUTHORIZE` — SIMULATION_ONLY
- `LIQ.NLC_READ` — SIMULATION_ONLY for Supervisor

Agent services:

- Account lookup
- Cash-in request
- Cash-out request

Supervisor services:

- Regional agent overview
- NLC/LCI read-only planning

Explicitly absent:

- credit approval;
- real KYC authority;
- live settlement;
- production payment rails.

### 2. Synthetic PartnerFI Beta

Partner class: `FINANCIAL_INSTITUTION`

Purpose: prove that an FI can use Enawuga without cash-in/cash-out.

Capabilities:

- `FIN.ACCOUNT_LOOKUP` — SIMULATION_ONLY
- `FIN.SAVINGS_INQUIRY` — SIMULATION_ONLY
- `FIN.SERVICE_REQUEST_CREATE` — SIMULATION_ONLY

Agent services:

- Account/customer reference lookup
- Savings inquiry
- Savings-service request

Explicitly disabled:

- cash-in authorization;
- cash-out authorization;
- NLC planning;
- payment gateway access.

This partner is critical: if the Agent Terminal still shows cash controls for Beta, the platform abstraction is wrong.

### 3. Synthetic Gateway Gamma

Partner class: `PAYMENT_GATEWAY_SYSTEM_OPERATOR`

Purpose: provider-neutral payment orchestration reference independent of ArifPay branding.

Capabilities:

- `PAY.C2B_CREATE` — SIMULATION_ONLY
- `PAY.STATUS_QUERY` — SIMULATION_ONLY

Routes:

- `route_syn_gateway_gamma_c2b`

Authority boundary:

- payment-provider acceptance is not PartnerFI settlement;
- no customer account ownership.

### 4. Synthetic Mobile Money Delta

Partner class: `MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER`

Purpose: prove a direct mobile-money route can exist independently of a gateway route.

Capabilities:

- `PAY.C2B_CREATE` — DISABLED initially
- `PAY.STATUS_QUERY` — SIMULATION_ONLY if a pure synthetic status flow is needed

The fixture must preserve direct-route provenance and must not reuse ArifPay route identity.

### 5. Synthetic Identity Epsilon

Partner class: `IDENTITY_PROVIDER`

Capabilities:

- `IDV.ONBOARD_VERIFY` — SIMULATION_ONLY
- `IDV.REVERIFY` — SIMULATION_ONLY

Data scope:

- synthetic identity-reference/attestation fields only;
- no raw biometric artifact or real Fayda data.

### 6. Synthetic FMCG Zeta

Partner class: `FMCG_DISTRIBUTOR_MERCHANT`

Capabilities:

- `FMCG.CATALOG_READ` — SIMULATION_ONLY
- `FMCG.RESTOCK_DRAFT` — SIMULATION_ONLY

Explicitly disabled:

- live order submission;
- dispatch authority;
- commercial settlement.

Data scope:

- inventory aggregates;
- route/restock references;
- no unrelated KYC/bank-balance data.

### 7. Synthetic Fleet Eta

Partner class: `CASH_LOGISTICS_FLEET`

Capabilities:

- `FLEET.ROUTE_PLAN` — SIMULATION_ONLY
- `FLEET.DISPATCH` — DISABLED
- `FLEET.CASH_HANDOVER` — DISABLED

This fixture proves that planning permission does not imply custody or movement authority.

## Suggested organization/role matrix

| Reference partner | Agent | Supervisor | Operations | Partner Admin |
|---|---|---|---|---|
| PartnerFI Alpha | account + cash service requests | regional/NLC view | exceptions/reconciliation refs | contract/capability view |
| PartnerFI Beta | account + savings/service requests | scoped service overview | service exceptions | contract/capability view |
| Gateway Gamma | no direct generic workspace | provider status where scoped | C2B/status evidence | route/config evidence |
| Mobile Money Delta | no service while disabled | none | status/readiness only | route/config evidence |
| Identity Epsilon | bounded verification request only if service requires | exception view | identity-provider status | data/capability config |
| FMCG Zeta | local stock/service view if assigned | regional inventory/restock plan | inventory exceptions | catalog/data scope |
| Fleet Eta | none | route planning | planning evidence | capability scope |

## Region heterogeneity

Use at least two synthetic regions, for example:

- `region_syn_adama`
- `region_syn_arisi`

PartnerFI Alpha may be available in both; PartnerFI Beta only in one. This proves service visibility is region-scoped and prevents a future national hard-code.

## Agent heterogeneity

Use distinct synthetic agent memberships, e.g.:

```text
agent_syn_alpha_01 -> PartnerFI Alpha / region_syn_adama
agent_syn_beta_01  -> PartnerFI Beta / region_syn_adama
agent_syn_alpha_02 -> PartnerFI Alpha / region_syn_arisi
```

No user should gain services from another organization merely because the role name is also `AGENT`.

## Relationship to real sandbox providers

ArifPay sandbox, Telebirr TestBed foundation and M-PESA Ethiopia sandbox foundation remain evidence-backed provider-specific foundations. They are not renamed as synthetic reference organizations.

Reference partners test the reusable architecture. Real/provider-specific sandbox foundations test external contracts. Both can coexist but must remain distinguishable.

## Required tests

Implementation should prove:

1. Alpha agent sees cash-in/cash-out; Beta agent does not.
2. Beta can expose a savings/service request without adding Beta-specific UI code.
3. Region-scoped services disappear outside permitted regions.
4. Agent from one partner cannot read another partner's customer/service objects.
5. Gateway Gamma and Mobile Money Delta maintain different route provenance.
6. Fleet route planning does not expose dispatch/handover actions.
7. FMCG fixtures cannot request unrelated financial/identity data.
8. Changing a capability contract changes the generated workspace without editing the page component.

## Acceptance criteria

- At least two materially different synthetic PartnerFIs.
- At least one reference organization for each partner class needed by current architecture.
- All fixtures pass the Partner Capability Contract schema.
- No reference partner contains real PII, real credentials or claims of external partnership.
- No single fixture exposes every capability.
- E2E tests exercise differences in UI/service availability and server-side denial.

## Out of scope

- Production institution names/configuration.
- Real agent enrollment.
- Real accounts/funds.
- Live provider credentials.
- Live dispatch or settlement.
