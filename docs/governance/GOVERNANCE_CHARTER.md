# Governance Charter

## 1. Program objective

Build Enawuga into a governed rural service operating platform that can support field agents, supervisors, Wishland technology operations, regulated financial institutions, payment/telco/mobile-money partners, FMCG and logistics partners, and other authorized service providers without collapsing their legal, technical or operational responsibilities into one system role.

The project MUST progress through evidence-based gates. A feature being coded does not mean it is authorized to operate with real customers, real funds or production credentials.

## 2. Permanent operating boundaries

### 2.1 Wishland

Wishland Networking PLC is the technology/orchestration provider. Unless future written licensed authority explicitly changes the model, Wishland MUST NOT be represented in software or documentation as:

- the owner of customer deposits or e-money;
- the issuer of regulated financial accounts;
- the authority that posts or settles PartnerFI transactions;
- the entity that independently authorizes regulated cash-in/cash-out;
- the owner of customer financial liability merely because Enawuga displays or transports data.

Wishland MAY provide software, workflow orchestration, user interfaces, partner adapters, transaction intent routing, reconciliation tooling, operational dashboards, audit/evidence functions and approved support services.

### 2.2 Regulated and commercial partners

Each external partner owns only the authority established by its license, contract and integration agreement. Enawuga MUST model partner type and route explicitly rather than treating all partners as a generic bank.

Partner classes include:

- Bank / MFI / other licensed financial institution.
- Payment gateway / payment-system operator.
- Mobile-money or payment-instrument issuer.
- Telco or communications service provider.
- Identity verification provider.
- FMCG / distributor / merchant / agricultural input supplier.
- Cash-logistics or fleet operator.
- Insurance / PAYG / voucher / program operator.
- Government or social-program integrator where formally approved.

### 2.3 GhostSync

GhostSync is transport and synchronization. It MUST NOT be a settlement authority. A queue insert, device transfer, receiver acknowledgement or successful upload MUST NOT independently become a financial posting or cash-dispense instruction.

### 2.4 Customer identity

`customerId` is the canonical internal identity. Phone is an operational alias and may change. Identity proof, phone possession and partner-account linkage are separate facts and MUST remain separate in code and UI.

## 3. Evidence-status vocabulary

Every material capability statement SHOULD be classified as one of:

- **Implemented** - executable behavior exists and is validated in the repository.
- **Synthetic / Sandbox** - executable behavior exists only with fixtures, mocks or sandbox providers.
- **Staging** - connected to an approved non-production external environment under governed credentials.
- **Pilot-authorized** - specifically approved for bounded live use under named scope and controls.
- **Production-authorized** - approved for production operation under current contracts and controls.
- **Proposed** - target capability not yet implemented or approved.
- **Disabled pending authorization** - code may exist but operation is intentionally locked.
- **Historical** - evidence of a prior stage, not a current-state claim.

## 4. Decision rights

| Decision | Minimum owner / approval |
|---|---|
| Repository architecture change | Technical lead + PR review |
| Enable external sandbox adapter | Technical lead + security review |
| Introduce real PII | Data/security gate + program approval |
| Introduce real financial data | Partner + data/security gate |
| Enable production payment credential | Named partner approval + security + change approval |
| Enable cash custody / movement | Contracted regulated/commercial authority + operating policy |
| Enable PartnerFI posting/settlement | PartnerFI-authorized integration only |
| Move to ET-resident controlled staging | Evidence-gate review |
| Controlled live pilot | Written pilot authorization + all required gate evidence |
| Production launch | Production-readiness board / named approvers |

## 5. Change-control rules

- No direct pushes to `main`.
- Each phase MUST use a scoped branch and PR.
- Every PR MUST identify capability status before and after the change.
- Every PR that changes partner/financial state behavior MUST include state-transition tests and claim-boundary review.
- Secrets MUST NOT be committed.
- Historical validation documents MUST NOT be retroactively rewritten except to correct factual errors; new state is recorded in a new dated record.
- A stage transition MUST update `PROGRAM_STATUS.yaml`, relevant capability states, evidence register and release notes.

## 6. Stop conditions

Engineering MUST stop and escalate if any of the following occurs:

- a requested implementation would move real funds without approved authority;
- credentials appear to be production when the stage is sandbox/staging;
- a provider response is treated as settlement without an authoritative state contract;
- customer PII would leave approved data paths;
- encryption/key custody is assumed but not evidenced;
- a requirement conflicts with a recorded partner obligation;
- a new feature would make the UI imply more authority than the system possesses.
