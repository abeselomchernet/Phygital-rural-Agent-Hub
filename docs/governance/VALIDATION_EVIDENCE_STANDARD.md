# Validation & Evidence Standard

## 1. General rule

A stage advances only when its acceptance evidence exists. Passing unit tests does not prove contracts, licensing, residency, cash custody or partner authorization.

## 2. Standard engineering validation

For applicable Node/React changes, minimum local/CI validation SHOULD include:

- clean dependency install;
- production dependency audit;
- TypeScript/lint;
- domain/API tests;
- production build;
- E2E browser tests;
- whitespace/diff checks;
- Docker/packaging validation where in scope.

The current baseline uses Node 24 + npm 11.

## 3. Required evidence classes

### Code evidence

- commit SHA;
- changed files;
- test counts/results;
- CI URL/run ID;
- build artifact/deployment evidence;
- security scan where applicable.

### Architecture evidence

- adapter/state diagram;
- data flow;
- authority boundary;
- rollback/fail-closed behavior;
- threat/risk review.

### External evidence

Where applicable:

- partner agreement/approval identifier;
- credential/environment ownership;
- hosting/residency evidence;
- key-custody evidence;
- data-processing/retention approval;
- incident/RACI contacts;
- pilot/production authorization.

## 4. Integration test minimums

External provider adapter tests SHOULD cover:

- happy path;
- provider-declared failure;
- authentication failure;
- malformed response;
- timeout/network error;
- duplicate request/idempotency;
- changed replay conflict;
- duplicate callback;
- out-of-order/stale callback;
- terminal-state regression attempt;
- reconciliation recovery;
- secret/log redaction.

## 5. UX/claims review

Every stage that changes visible functionality MUST review:

- whether labels imply live connectivity;
- whether balances are authoritative;
- whether settlement/finality is overstated;
- whether identity status is overstated;
- whether cash authority is overstated;
- whether proposed/sandbox/staging capabilities are clearly labeled.

## 6. Gate review record

A gate review MUST capture:

- stage being entered/exited;
- evidence list;
- unresolved risks;
- decision (`APPROVE`, `APPROVE_WITH_CONDITIONS`, `REJECT`);
- approver(s);
- effective date;
- review/expiry date where needed.

## 7. Evidence retention

Historical evidence should remain immutable. Later results are added as new records rather than overwriting prior outcomes.
