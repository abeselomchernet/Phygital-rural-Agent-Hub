# ARCH-16 Legacy Quarantine — Phase 0 Closure

**Date:** 2026-10-17
**Implementation baseline:** 9a8578858e0be1f1e78ce1572119ee85fdcfbf85
**Scope:** Stage-4 bounded internal implementation only

## Purpose

ARCH-16 removes legacy, unmounted presentation artifacts that contain prohibited or superseded authority/claim patterns from the governed source tree. This is a quarantine/removal change only; it creates no new financial, provider, regulatory, identity, settlement, insurance, device-control, or production authority.

## Removed legacy artifacts

- src/pages/AgentLms.tsx
- src/pages/GovernanceCouncil.tsx
- src/pages/AuditCompliance.tsx
- src/pages/SmartCycle.tsx
- src/pages/AgriTrustInsurance.tsx

src/components/DemoPresenter.tsx was already absent from the accepted baseline and remains protected by existing regression coverage.

## Route and navigation quarantine

The accepted src/App.tsx baseline already had none of the quarantined legacy routes mounted. Phase 0 additionally removes stale legacy navigation references for /smartcycle, /agritrust, /governance, and /audit from src/components/layout/AppLayout.tsx.

## Regression controls

tests/legacy-quarantine.test.ts fails if a quarantined artifact or stale governed route/navigation entry is reintroduced. tests/audit-truth-sync.test.ts now treats the removed legacy Audit Compliance page as quarantined rather than requiring presentation-level wording checks on a file that no longer belongs in the governed tree.

## Preserved boundaries

- synthetic-only Stage-4 boundaries remain unchanged;
- provider success remains distinct from PartnerFI settlement;
- UI visibility remains distinct from authorization;
- no live PartnerFI, insurer, regulator, identity, device, or production integration is activated;
- no Phase-1 persistence work is included in this change.

## Validation gate

The Phase-0 change is accepted only if the repository continues to pass production dependency audit, TypeScript/lint, the full unit/domain/API test suite, and production build, followed by the repository CI gate on the pull request.
