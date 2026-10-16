# F7 - Partner Administration Frontend Implementation

## 1. Purpose

F7 turns the Partner Admin role into a coherent institution-scoped portal instead of a collection of generic evidence pages. It reuses the existing governed session/workspace architecture and does not create new provider, payment, settlement, credential or regulatory authority.

## 2. Portal structure

The Partner Admin home now links to a dedicated `/partner-admin` administration overview. The page presents:

- active PartnerFI / Hub / region / environment identity;
- the active synthetic PartnerFI published service catalog and required capability references;
- provider foundation / environment / route-state evidence already present in the authenticated workspace manifest;
- read-only network object scopes from the existing authorization model;
- drill-down links to Neutrality & Governance, Partner Ecosystem, Access & Scopes and Operations Evidence.

The page is role-gated in the presentation layer. A non-Partner-Admin direct visit receives an access-denied state. This does not replace server authorization.

## 3. Published catalog vs actionable services

The service section intentionally inspects the synthetic published catalog rather than pretending that Partner Admin can execute every listed service. Published roles, required capabilities, route references, data classes and offline policy are shown as governance metadata.

Catalog presence is not service availability and does not grant live provider, posting, settlement or production authority.

## 4. Partner Ecosystem least-visibility presentation

`/partners` now derives visible synthetic partner objects from each object's explicit `authorizedRoles`. Route provenance is limited to route references declared by those visible objects.

Agent direct navigation receives an access-denied presentation. Operations continues to see the provider foundations required for bounded reconciliation/evidence work. Partner Admin sees only the partner objects explicitly marked for that role.

Hidden client-side fixtures are not treated as a security boundary; server authorization remains authoritative. This change is a UI truth/least-visibility improvement.

## 5. Wishland / Enawuga design

F7 uses the official Wishland/Enawuga hierarchy and canonical token system already governed in `WISHLAND_BRAND_AND_DESIGN_SYSTEM.md`:

- Wishland Networking PLC - company / technology/software/orchestration provider;
- Enawuga - product/platform;
- Phygital Rural Agent Hub - product descriptor;
- Wishland navy `#0A2A52` - institutional framing and primary context;
- Wishland teal `#007DBA` - interactive/information emphasis;
- Wishland gold `#D4AF37` - controlled accent/focus only, never approval.

No mark is recolored/redrawn and no Partner Admin-specific corporate palette is introduced.

## 6. Configuration-language boundary

Partner Admin UI is inspection-oriented. It contains no provider activation toggles and no buttons named `Activate`, `Enable`, `Approve`, `Settle`, `Issue credential` or similar authority verbs.

Provider registration/foundation state, catalog publication, role/object scope and governance evidence remain distinct from activation authority.

## 7. E2E privileged-role test harness

The Playwright web server explicitly sets `ALLOW_PRIVILEGED_SYNTHETIC_ROLES=true` only in the controlled E2E environment so role journeys can be exercised. Default runtime behavior remains fail-closed, as already covered by server tests. The test-only flag does not imply production identity, SSO or privileged-role availability in deployed environments.

## 8. Non-claims

F7 adds no live PartnerFI connectivity, provider activation, real funds, settlement, real PII, production authentication, credential management, real device control, geographic authority, regulated pilot authority or production readiness.

## 9. Validation expectation

The bounded PR must pass focused Partner Admin/workspace tests, full unit/integration tests, TypeScript lint, production build, targeted Partner Admin / Partner Ecosystem Playwright, full Playwright, `git diff --check`, and hosted Linux CI on the exact PR head before merge.
