# Audit Closure ? UI Hygiene & Resilience

## Purpose

This bounded remediation closes the directly actionable Round-2 frontend findings without widening Enawuga authority. It is based on the external independent audit chain and is implemented only against the canonical post-F10 GitHub baseline.

## Findings addressed

- **R2-F01 ? duplicate Supervisor Neutrality navigation:** removed and prevented through schema-level duplicate ID/path rejection plus generated-workspace uniqueness tests.
- **R2-F02 ? legacy route baggage:** historical aliases are no longer mounted as active application routes. Historical source can remain as archaeology, but direct URLs now fail into the governed Module-not-found surface.
- **R2-F03 ? API error/timeout rendering:** Hub reads now have a bounded five-second client timeout. Hub Overview renders shared governed error state, never fabricates service data, and exposes explicit retry. Playwright covers HTTP 500 recovery and actual request timeout.
- **R2-F05 ? management responsive evidence:** Supervisor, Operations and Partner Admin representative dashboards are checked at 768x1024 for viewport containment and authority context.
- **R2-F04 ? static source-test fragility:** not declared fully closed here. This remediation adds runtime/schema/E2E tests for the affected behaviors rather than replacing every earlier historical source-match test.

## Authority boundary

No provider route, PartnerFI posting, settlement, funds movement, regulated-pilot approval, production credential, device control, geographic authorization or backend E10 capability is added. Error recovery retries only the same governed read request.

## Merge gate

Focused audit-closure tests, the complete unit/integration suite, production build, full Playwright suite, `git diff --check`, production dependency audit and exact-head hosted Linux CI must pass before merge.
