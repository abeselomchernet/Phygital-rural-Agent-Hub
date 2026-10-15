# F3 ? Hub Economics & Pilot Evidence Dashboards

## Scope

F3 surfaces the existing E5 Hub Economics and E6 Pilot Evidence Engine as governed frontend decision-support dashboards. It does not create new economics logic, pilot scoring logic, review authority or scale authority in the browser.

## Routes

- `/hub/economics` ? scoped E5 Hub Economics read model.
- `/hub/pilot-evidence` ? scoped E6 P1-P11 Pilot Evidence read model.

These routes are included in Supervisor, Operations and Partner Admin navigation. Agent navigation does not expose them. Direct requests remain subject to server role/Hub authorization.

## Economics UX

The Economics dashboard preserves the domain distinction between `MODEL_ASSUMPTION` and `MODEL_OUTPUT`. It presents modeled revenue, costs and margin with explicit synthetic confidence and never converts the model into accounting records, forecast validation or observed pilot performance.

`modelVsObservedVariance.status = NOT_AVAILABLE_STAGE4` is surfaced as unavailable; observed margin and variance are not fabricated. `OBSERVED` and `EXTERNALLY_VERIFIED` evidence classes remain unavailable at Stage 4.

The reusable evidence drawer includes the economics digest only as an integrity reference. Digest integrity does not validate the economic assumptions or grant authority.

## Pilot Evidence UX

The Pilot Evidence dashboard renders all P1-P11 gate assessments with exact domain status vocabulary, including `UNKNOWN`, `COLLECTING`, `PARTIAL`, `MEETS_TARGET_UNREVIEWED` and `MISSES_TARGET_UNREVIEWED`. Positive synthetic threshold results are not translated into `APPROVED`.

The page always exposes the Stage-4 scale boundary: `NO_AUTHORIZED_SCALE_DECISION_STAGE4`, no actual pilot represented as running, no real pilot observations, no external verification and no bounded-expansion authority.

Metric constraints are displayed with their domain unit/comparator. P1-P5 remain hypotheses; P6-P11 remain engineering evidence gates.

The Pilot Evidence digest is shown only as an integrity reference. It does not prove evidence truth, external review or regulatory acceptance.

## Shared evidence UX

F3 extends the F2 evidence drawer with an optional integrity reference so economics and pilot digests can be inspected without confusing them with evidence acceptance. Evidence details continue to include classification, references, limitations and authority implications.

## Wishland / Enawuga design

Both dashboards use the established Wishland/Enawuga design tokens, role shell and semantic status components. They remain visually consistent with the Hub workspace rather than becoming standalone analytics applications.

## Non-claims

F3 does not add or imply:

- observed Hub financial performance;
- accounting truth or forecast accuracy;
- real pilot execution or real pilot observations;
- external evidence verification or acceptance;
- numeric threshold self-authorization;
- pilot continuation, scale or geographic expansion authority;
- live funds, PartnerFI posting, settlement or production execution.

## Validation

Merge readiness requires focused F3 tests, full unit/integration tests, lint/typecheck, production build, Playwright role/dashboard coverage, `git diff --check` and exact-head hosted Linux CI.
