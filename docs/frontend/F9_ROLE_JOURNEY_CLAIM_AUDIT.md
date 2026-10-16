# F9 End-to-End Role Journeys and Claim Audit

## Status

Frontend workstream F9 exercises the governed role journeys end to end and audits visible Stage-4 claims without adding backend capability or authority.

This work is test and evidence hardening only. It is not a production-readiness declaration, regulatory approval, accessibility certification, partner acceptance, settlement proof or live-pilot authorization.

## Covered role journeys

F9 adds Playwright journeys for:

- PartnerFI Alpha Agent and PartnerFI Beta Agent capability isolation through one shared workspace generator;
- Supervisor Hub Economics and Pilot Evidence decision-support routes;
- Operations offline/reconciliation evidence and role-scoped Partner Ecosystem evidence;
- Partner Admin administration and neutrality/governance evidence;
- direct URL denial for Agent access to Partner Administration and Partner Ecosystem surfaces.

The tests start the same controlled synthetic workspace sessions used by the server and do not inject a client-side role override.

## Runtime claim audit

Every F9 journey verifies the shared workspace context still states `Synthetic data` and `No production authority`, and that the presentation shell remains `Stage 4` / `Synthetic`.

The runtime audit also rejects a bounded vocabulary of unqualified claims such as `production approved`, `regulated pilot approved`, `settlement complete` and `live funds moved`, and verifies that production activation/settlement controls are absent.

This vocabulary is intentionally narrow. F9 does not claim to be a complete legal, regulatory, advertising or accessibility-language review.

## Screenshot evidence

Each audited route captures a full-page Playwright screenshot and attaches it to the test result. Those screenshots are diagnostic evidence only: they help show which visible claims were present when the automated assertions ran.

Screenshots are not certification, external verification, production evidence, regulatory evidence or proof that a provider, PartnerFI, network, device or financial workflow was live.

## Authority boundary

F9 does not create provider activation, PartnerFI posting, settlement, cash movement, identity authority, device-control authority, regulated-pilot approval or production execution.

A route becoming visible in a test does not grant authority. Server-side role, object, purpose, Hub, partner and environment policy remain authoritative.

Frontend F9 also does not unlock backend Epic E10 Inclusion Analytics. E10 remains gated by approved purpose, approved data fields, privacy/legal review and partner policy.

## Validation expectations

The F9 change must pass:

- focused F9 static/unit assertions;
- focused F9 Playwright role journeys;
- the full unit/integration suite;
- the full Playwright suite;
- lint, production build and `git diff --check`;
- hosted Linux CI on the exact PR head before merge.
