# Governance Release Notes

This file records forward governance/state transitions. It does not replace immutable historical validation records or authorize regulated operation.

## 2026-10-13 - Governance v1.1 / Stage 3 entry

### Baseline

Canonical `main` baseline after PR #7:

`0028b079c1c641535e00db78b58f29bb442136ae`

GitHub Actions `Synthetic prototype validation` run #245 (`38426151886`) completed successfully on this baseline.

### Stage transition

- Stage 1 remains complete.
- Stage 2 - ArifPay Sandbox Integration is complete for its governed bounded sandbox scope.
- Stage 3 - Partner Ecosystem & Network Liquidity (synthetic) is now the active substantive stage.
- Stage 4 - Governed ET-resident staging foundation remains locked pending Stage 3 exit evidence.

### Provider status carried into Stage 3

- **ArifPay:** bounded sandbox C2B orchestration/reconciliation is merged. Gateway evidence remains separate from PartnerFI settlement authority.
- **Direct Telebirr:** inactive/TestBed foundation is merged. Direct payment initiation remains disabled pending TLS trust and provider-contract/protocol gates.
- **M-PESA Ethiopia direct:** inactive sandbox foundation is merged. The documented token contract has been runtime-verified from an external local environment; payment initiation, callbacks, status, payout, reversal, balance and settlement behavior remain unverified/unmounted.

These provider foundations are not Stage 3 activation work and do not become live merely because Stage 3 is active.

### Stage 3 approved engineering scope

Stage 3 may implement:

- partner organization and capability-switch models;
- Partner Ecosystem Console;
- provider/service route provenance;
- Network Liquidity Coverage / Liquidity Coverage Index decision support;
- 2h, 4h, 8h and EOD synthetic liquidity horizons;
- Healthy / Watch / Rebalance / Critical operational states where supported by the defined metric;
- synthetic Cash Fleet planning and liquidity-match simulation;
- bounded FMCG partner/inventory/logistics models;
- expanded role/object authorization;
- Supervisor/Operations network-operations UX.

### Locked boundaries

Stage 3 does not authorize:

- real customer PII;
- real funds;
- real cash custody or movement;
- production payment/provider credentials;
- direct Telebirr or M-PESA payment initiation;
- live PartnerFI account/balance/posting mutation;
- live identity-provider access;
- regulated pilot or production operation;
- claims that NLC/LCI is prudential regulatory LCR;
- claims that provider acceptance/success equals PartnerFI settlement;
- capability activation merely because code/configuration exists.

### Governance files synchronized

This transition updates or establishes:

- `PROGRAM_STATUS.yaml`;
- `CAPABILITY_REGISTRY.yaml`;
- `CURRENT_BASELINE.md`;
- `STAGE_GATE_ROADMAP.md`;
- governance-pack `README.md`;
- `EVIDENCE_REGISTER.md`;
- `RELEASE_NOTES.md`.

The first substantive Stage 3 implementation should use a separate feature branch after this governance transition is reviewed and merged.
