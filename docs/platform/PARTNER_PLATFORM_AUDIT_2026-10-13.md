# Enawuga Partner-Platform Audit — 2026-10-13

## Product thesis

> Wishland is not selling one custom rural-agent application to one bank. It provides governed shared agent-infrastructure software into which licensed institutions can bring their own products, authority, accounts, rails and policies.

This audit tests the current Enawuga baseline against that target. The desired outcome is a partner-ready platform in which a new institution can be configured, tested, certified and activated without rewriting the Enawuga core or rebuilding the Agent/Supervisor/Operations user journeys.

## Audit scope

Reviewed current governance and runtime structures covering:

- partner classes and partner organization model;
- capability switches and route provenance;
- synthetic authentication/RBAC/object authorization;
- PartnerFI and payment-gateway adapter interfaces;
- ArifPay sandbox composition and Telebirr/M-PESA bounded foundations;
- Agent, Supervisor, Operations and Partner Ecosystem presentation surfaces;
- Stage 3 synthetic NLC/LCI, Cash Fleet and FMCG planning modules.

This audit is architectural. It does not authorize any live provider, real customer data, regulated posting, cash movement or production credential use.

## What is already structurally correct

### 1. Orchestration is separated from regulated authority

The current governance correctly states that provider responses do not bypass internal state rules and that external adapters translate provider-specific contracts into Enawuga contracts. Gateway/provider success is not automatically PartnerFI settlement.

### 2. Partner classes already exist

The platform already distinguishes Financial Institution, Payment Gateway/System Operator, Mobile Money/Payment Instrument Issuer, Telco/Communications, Identity Provider, FMCG/Distributor/Merchant and Cash Logistics/Fleet.

### 3. Capability switches are explicit

The current Partner Ecosystem model does not infer authority from code presence. It separately represents disabled, simulation-only and bounded sandbox capability states.

### 4. Route provenance is preserved

Direct provider routes and gateway-routed services are modeled separately. This is a strong foundation for a future route resolver.

### 5. Adapter boundaries exist

`FinancialInstitutionAdapter` and `PaymentGatewayAdapter` already provide useful seams between Enawuga orchestration and external systems. ArifPay is implemented behind a bounded sandbox adapter, while Telebirr and M-PESA foundations remain separately gated.

### 6. Role/object authorization exists

Synthetic sessions already enforce server-side roles, customer object scope and network-operation object scope. This is the right direction for partner/organization-scoped authorization.

## Gaps preventing true partner plug-in readiness

### A. Partner organization configuration is still synthetic-fixture shaped

The active schema requires `partnerOrgId` values beginning with `synthetic-`, supports only synthetic/sandbox/testbed environments, and stores role/capability data directly inside fixture records. This is correct for Stage 3 evidence, but it is not yet a reusable versioned partner contract.

### B. Business capabilities and provider-specific routes are mixed

The capability enum currently includes both generic institutional authority (`PARTNERFI_CASH_IN_AUTH`) and provider/route-specific entries (`ARIFPAY_C2B`, `TELEBIRR_DIRECT_C2B`, `MPESA_ETHIOPIA_DIRECT_C2B`). A plug-in platform needs three separate concepts:

1. user/business service;
2. governed capability/authority;
3. integration route/adapter.

They must not be interchangeable.

### C. No partner-owned service catalog exists

The platform has UI service concepts, but there is no machine-readable catalog saying which partner offers which service, to which role, in which region/environment, through which required capability and route policy. This means the UI cannot yet be generated from partner configuration.

### D. Agent membership is not partner-scoped

Synthetic auth currently carries user ID, role, customer scope and network-object scope, but not partner organization membership, partner service grants or region/agent-group membership. The current Partner Ecosystem fixture role list also focuses on Supervisor/Partner Admin/Operations and is not yet a general user-to-partner membership model.

### E. UI navigation is still presentation-defined

PR #18 improved navigation structure and truthfulness, but navigation is still statically authored. It is not derived from authenticated organization membership + role + object scope + active partner services/capabilities.

### F. Provider composition is still hard-coded in runtime bootstrap

The server directly constructs the ArifPay sandbox adapter when ArifPay environment variables are present. `MockPartnerFI` is also directly instantiated inside the demo API. This is safe for the current bounded baseline, but a scalable partner platform needs a registry/resolver so the core requests an adapter by governed route rather than importing a specific provider path.

### G. Current PartnerFI contract is intentionally narrow and synthetic

The current financial contract is cash-in/cash-out oriented and `PartnerResult` is explicitly simulation-shaped. A future contract must preserve the current safety semantics while allowing multiple partner services without turning the core into bank-specific branches.

### H. No governed onboarding state machine exists

Partner records are fixtures. There is no formal lifecycle such as draft -> contract reviewed -> configured -> sandbox verified -> certified -> staging approved -> authorized/suspended/expired.

### I. No reusable adapter certification contract exists

There are strong provider-specific tests today, but no single certification suite that a new adapter must pass to prove schema conformance, idempotency, route provenance, error/uncertainty mapping, environment isolation, callback/replay controls, secret handling and authority boundaries.

## Target architecture

```text
Users / Agents / Supervisors / Operations
                  |
                  v
       Capability-driven Workspace
                  |
                  v
        Authorization / Policy Runtime
   membership + role + object + region + service
                  |
                  v
          Partner Service Catalog
                  |
                  v
        Partner Capability Contract
                  |
                  v
       Route Resolver / Adapter Registry
          |          |          |
          v          v          v
     PartnerFI   Gateway     Other partner adapters
                  |
                  v
      External licensed/approved systems
```

The Enawuga core owns workflow, state, audit, authorization, offline behavior, reconciliation semantics and user experience patterns. Partners own their products, legal authority, accounts, limits/policies, credentials, external posting/settlement and the capabilities they explicitly grant.

## Required design separation

The following seven workstreams MUST remain separate deliverables and separate review/merge units:

1. Partner Capability Contract.
2. Synthetic Reference Partners.
3. Partner Service Catalog.
4. Capability-driven UI.
5. Adapter Registry.
6. Partner Onboarding Workflow.
7. Contract Certification Suite.

No implementation PR should combine these into one large feature. Each workstream gets its own architecture document, acceptance criteria, tests and migration boundary.

## Recommended dependency order

1. Partner Capability Contract — establishes vocabulary and evaluation rules.
2. Synthetic Reference Partners — proves heterogeneity without live institutions.
3. Partner Service Catalog — binds partner products/services to capabilities.
4. Adapter Registry — removes provider-specific bootstrap coupling.
5. Capability-driven UI — consumes membership + catalog + capability decisions.
6. Partner Onboarding Workflow — governs creation/configuration/approval of partner records.
7. Contract Certification Suite — makes adapter/service progression evidence-gated and repeatable.

The certification design should be written before any live partner onboarding, but implementation can mature alongside onboarding after the contract/registry abstractions exist.

## Non-negotiable invariants

- Wishland/Enawuga does not become the customer deposit/account owner merely by orchestrating a service.
- A gateway/provider response is not PartnerFI settlement unless independently evidenced by the authoritative party/contract.
- Code presence, adapter registration and configuration do not create service authorization.
- Capability evaluation is server-side and fail-closed.
- UI hiding is convenience, not authorization.
- A partner must not receive data outside its declared/approved data scope.
- Direct and gateway-routed provider paths preserve route provenance.
- Production and sandbox/test adapters remain separately gated.
- No generic partner plug-in may load arbitrary untrusted executable code into the Enawuga process. Initial adapters are compiled, reviewed modules registered through a governed registry.
- New partner integration should require core changes only when it introduces a genuinely new domain capability or unsupported protocol contract.

## Success definition

The architecture is considered partner-ready when two deliberately different synthetic PartnerFIs can use the same Enawuga core and UI framework while exposing different services/capabilities, roles and regions; when provider routes can be swapped through governed registry/configuration rather than core edits; and when a new conforming partner can be onboarded through configuration + adapter certification instead of a custom Enawuga fork.
