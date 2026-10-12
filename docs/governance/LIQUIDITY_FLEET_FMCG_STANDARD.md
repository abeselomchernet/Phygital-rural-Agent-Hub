# Network Liquidity, Cash Fleet & FMCG Standard

## 1. Objective

Enawuga may provide liquidity intelligence, fleet planning and FMCG/logistics coordination as a technology layer. These functions can be developed synthetically before live financial/cash authority exists.

## 2. Terminology

Use:

- **Network Liquidity Coverage (NLC)** or **Liquidity Coverage Index (LCI)** for Enawuga's operational metric.
- **Cash Fleet** or **Mobile Liquidity Network** for cash logistics.

Do not use unqualified **LCR** to imply a regulatory Liquidity Coverage Ratio unless a licensed partner formally defines and approves the metric.

Do not formally label the fleet as an ATM network unless the deployed service actually meets the relevant contractual/regulatory/product definition.

## 3. Liquidity metric model

A starting planning metric may be:

`available authorized operational liquidity / forecast required liquidity`

The exact numerator, denominator, exclusions, time horizon and confidence treatment MUST be partner-calibrated before live decisioning.

Recommended horizons:

- 2-hour coverage.
- 4-hour coverage.
- 8-hour coverage.
- end-of-day coverage.

Dashboard states:

- Healthy.
- Watch.
- Rebalance.
- Critical.

## 4. Data inputs by maturity

### Synthetic stage

- fixed agent cash/e-float fixtures;
- generated demand history;
- mock fleet positions;
- mock FMCG route/inventory data.

### Staging stage

- approved non-production partner feeds;
- controlled location/device feeds;
- test dispatch/handover workflow.

### Pilot/production

Only approved live data with purpose-limited access, retention and organization-scoped permissions.

## 5. Cash Fleet capability

Early safe features:

- map and route planning;
- demand forecasting;
- replenishment recommendations;
- dispatch simulation;
- handover workflow simulation;
- exception/incident simulation;
- reconciliation model.

Live cash movement additionally requires evidence for:

- cash ownership/custody;
- authorized handlers;
- handover confirmation;
- transaction/ledger linkage;
- limits;
- loss/fraud procedures;
- physical security;
- insurance or risk treatment where applicable;
- accounting/reconciliation;
- PartnerFI/contractual authority.

## 6. FMCG model

### Commerce/logistics track

May include:

- product catalog;
- inventory;
- restock request;
- order capture;
- dispatch;
- delivery confirmation;
- commercial settlement status;
- demand analytics.

### Liquidity-network track

Enawuga may identify a potential match between an agent liquidity need and an eligible distributor/fleet route. During synthetic/staging stages the system MUST label this as a planning/matching simulation.

A live value exchange requires separate authorization for:

1. physical cash custody transfer;
2. corresponding regulated digital posting/settlement;
3. reconciliation between those events.

The system MUST NOT infer one from the other.

## 7. Partner data isolation

FMCG/fleet users may receive only operational data required for the approved workflow. They MUST NOT have general access to customer KYC, bank balances or unrelated transactions.

## 8. Supervisor UX target

Supervisor network operations SHOULD surface:

- agent liquidity deficit/surplus;
- NLC/LCI horizons;
- priority replenishments;
- nearby eligible fleet/FMCG sources;
- dispatch state;
- handover/reconciliation exceptions;
- GhostSync health;
- operational alerts.
