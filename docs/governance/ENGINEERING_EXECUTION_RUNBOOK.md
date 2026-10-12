# Engineering Execution & Handoff Runbook

## 1. Resume procedure

A new engineer MUST begin with:

1. Read `docs/governance/PROGRAM_STATUS.yaml`.
2. Verify repository visibility/default branch and current `main` SHA.
3. Read `CURRENT_BASELINE.md` and the active stage in `STAGE_GATE_ROADMAP.md`.
4. Inspect open PRs/issues before editing.
5. Configure Git identity for the repository owner/authorized contributor.
6. Reproduce baseline validation before making broad changes.
7. Read the domain standard relevant to the assigned work.

## 2. Branch strategy

Examples:

- `chore/p0-b-post-merge-closure`
- `feat/arifpay-sandbox-adapter`
- `feat/partner-ecosystem-model`
- `feat/network-liquidity-synthetic`
- `infra/et-staging-foundation`

Do not push directly to `main`.

## 3. Work-unit contract

Every assigned work unit should declare:

- objective;
- active stage;
- files/components in scope;
- explicit out-of-scope items;
- data allowed in tests;
- partner/environment allowed;
- state/authority assumptions;
- acceptance tests;
- evidence deliverables;
- stop condition.

## 4. Sandbox integration workflow

For a provider integration:

1. Verify current official provider docs.
2. Define internal adapter contract.
3. Create sandbox adapter separately from future production adapter.
4. Add environment hard guard.
5. Store credentials outside repo/client.
6. Implement one narrow end-to-end flow.
7. Add callback/reconciliation behavior.
8. Add failure/idempotency/replay tests.
9. Add operations/visibility UI.
10. Update capability registry and evidence record.
11. Open Draft PR and stop for review.

## 5. Documentation discipline

When implementation changes:

- update forward governance/status documents;
- do not rewrite historical validation to match the present;
- update claims labels where necessary;
- record decisions that materially change architecture.

## 6. PR minimum template

Each PR SHOULD contain:

- problem/outcome;
- active stage and capability status;
- architecture change;
- security/data implications;
- files changed;
- tests/evidence;
- remaining gaps;
- explicit statements of what this PR does **not** prove or authorize;
- merge recommendation.

## 7. Handoff report

At the end of a work session/phase, record:

- current branch;
- exact HEAD SHA;
- clean/dirty working-tree state;
- completed tasks;
- tests and results;
- known failures;
- external blockers;
- next recommended action;
- prohibited next actions until approval.

## 8. Deployment rule

A build/deployment system is not an authorization system. Vercel or another external preview may be used only according to the current environment policy and must not become the regulated data plane merely because deployment succeeds.
