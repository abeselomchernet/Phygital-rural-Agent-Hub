# F6 - Agent Field / Mobile UX Implementation

## 1. Purpose

F6 turns the existing governed Agent workspace into a phone/tablet-first field surface while preserving the Stage-4 authority boundary. It does not create a second Agent application, a new financial workflow, a provider connection or a production identity surface.

## 2. Implemented UI/UX

- `AgentFieldStatus` provides a compact field-state strip for Agent home, Agent Terminal and GhostSync queue.
- The strip distinguishes browser connectivity signal, local synthetic outbox count and Stage-4 remote-delivery state.
- Agent home remains task-first and gives `Serve customer` stronger visual priority.
- Agent mobile links become large touch targets.
- At phone width, a five-item primary Agent navigation is derived from the server-provided Agent navigation manifest: Home, Terminal, Farmer 360, Queue and Readiness.
- Agent Terminal uses the canonical Wishland navy/teal field surface.
- GhostSync keeps the desktop evidence table and adds mobile request cards with transport, financial-state and retry information.
- Queue semantics are unchanged: local persistence/transport is not provider acceptance or settlement.

## 3. Wishland / Enawuga brand treatment

F6 follows `WISHLAND_BRAND_AND_DESIGN_SYSTEM.md` and the official assets synchronized from the governed Wishland source. Wishland Networking PLC remains the technology/software/orchestration provider, Enawuga remains the product/platform, and Phygital Rural Agent Hub remains the product descriptor.

Primary Agent actions use Wishland navy, interactive/information emphasis uses Wishland teal, and controlled attention/focus uses governed teal/gold tokens. Role differentiation comes from task structure and information density, not a separate corporate palette.

## 4. Connectivity and offline truth boundary

The browser `online` / `offline` event and `navigator.onLine` are local browser/device hints only. They are labeled `Browser connectivity signal`. They do not establish provider/API reachability, PartnerFI availability, payment-rail availability, request receipt, authorization/posting, reconciliation, or settlement/finality.

`remoteSyncEnabled` remains false at Stage 4. The local outbox remains synthetic and untrusted.

## 5. Responsive architecture

Desktop/tablet retains the governed sidebar/navigation shell. On phone widths, the Agent-only primary navigation is fixed near the bottom for thumb reach. It is built only from items already present in the authenticated Agent `WorkspaceManifest`; it does not invent capabilities. Secondary field tools remain available through the Agent home and wider governed navigation.

The queue provides both table and card renderings of the same local records; only presentation changes by viewport.

## 6. Accessibility

- mobile primary targets are at least 48px high;
- connectivity state includes text and icon, not color alone;
- queue cards use semantic `dl/dt/dd` structure;
- focus-visible treatment uses governed brand tokens;
- status text avoids success wording for queueing/transport.

## 7. Non-claims

F6 does not add live provider networking, real PII, customer self-service authority, real cash handling, PartnerFI posting/settlement, production authentication, device enrollment/control, geographic authority, regulated pilot authority or production readiness.

## 8. Validation expectation

The bounded PR must pass focused F6 regression tests, full unit/integration tests, TypeScript lint, production build, targeted Agent Playwright at mobile width, full Playwright, `git diff --check`, and hosted Linux CI on the exact PR head before merge.
