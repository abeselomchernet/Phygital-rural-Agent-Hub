# F1 — Role Workspace & Wishland Design Foundation

## 1. Scope

F1 is the first bounded frontend productization increment. It does not add backend authority. It establishes the product shell and visual/governance foundation that later frontend increments will use to surface the already-implemented Stage-4 Hub capabilities.

## 2. Delivered

F1 delivers:

- one governed application shell with distinct Agent, Supervisor, Operations and Partner Admin portal identities;
- server-derived PartnerFI, Hub, region, role and environment context in the shell;
- a governed `/hub` overview for management roles;
- role-specific home dashboards rather than one generic dashboard with hidden cards;
- explicit Stage-4 synthetic and no-production-authority markers;
- a responsive desktop/sidebar and narrow-screen navigation architecture;
- formal Wishland/Enawuga application design tokens based on the existing repository palette;
- explicit `Wishland Networking PLC · Technology provider` attribution;
- frontend architecture, brand/design-system and delivery-plan documentation;
- regression coverage for Hub context, role navigation, branding and claim boundaries.

## 3. Hub context contract

`WorkspaceManifest` now includes the governed `hubId` produced by the existing Hub service workspace. The client no longer has to infer the active Hub from a region label, route, or hard-coded presentation default.

Management navigation exposes `/hub` to Supervisor, Operations and Partner Admin. Agent navigation intentionally does not gain `/hub` management access. Server authorization remains authoritative even for visible routes.

## 4. Role experience

### Agent

Task-first entry points for customer service, Farmer 360, offline requests, readiness, learning and inventory concepts. It emphasizes field work rather than management analytics.

### Supervisor

Hub Operations entry with governed Hub context, regional operations and capability-derived liquidity/fleet/FMCG modules. Economics, Pilot Evidence, Corridor, Readiness and Neutrality are staged for later frontend increments using existing read APIs.

### Operations

Exception/evidence-first Operations & Reconciliation entry with provider foundations, access/scope review and offline exceptions.

### Partner Admin

Institution-scoped Partner Administration entry with partner ecosystem, access/scope, operations evidence and Hub context.

## 5. Wishland / Enawuga brand implementation

F1 formalizes the existing green application palette through shared CSS variables, rather than replacing it with an unrelated theme.

The global product header preserves Enawuga as the product name and Phygital Rural Agent Hub as the descriptor, with explicit Wishland Networking PLC technology-provider attribution.

No official corporate logo asset was found in the governed repository/available project assets during F1. F1 therefore keeps the existing sprout as a temporary Enawuga product mark and does not invent a Wishland corporate logo.

## 6. Authority/non-claims

F1 does not add or imply:

- live institutions or live provider networking;
- real funds, cash custody, posting or settlement;
- production authentication or production readiness;
- live identity or biometric processing;
- remote device control;
- geographic expansion authorization;
- regulated pilot approval;
- PartnerFI capability or settlement authority.

The UI explicitly states that UI visibility is not authorization, provider success is not settlement, and production authority is not granted.

## 7. Validation expectations

A merge-ready F1 head must pass:

- focused workspace/branding/claim-control tests;
- complete unit/integration repository test suite;
- TypeScript lint/typecheck;
- production Vite build;
- Playwright frontend suite;
- `git diff --check`;
- exact-head hosted Linux CI before merge.

Local Playwright may use an installed Chromium-compatible browser through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; hosted CI remains the authoritative Chromium merge gate because CI installs its pinned browser revision.

### F4 branding sync addendum

The F1 statement above records what was available at F1 implementation time. In F4, the official Wishland corporate mark, wordmark and navy/teal/gold palette were located in `abeselomchernet/wishland` and imported into the governed frontend. The temporary sprout-only corporate treatment is therefore superseded; see `WISHLAND_BRAND_AND_DESIGN_SYSTEM.md` for current brand provenance and usage.
