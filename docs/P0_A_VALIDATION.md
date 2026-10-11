# P0-A validation

Baseline c495a2198c0d814a416794b57d9cc2470bf2bcbc: build, typecheck and API checks passed. Three original browser tests failed on stale expectations; the inventory records exact assertions.

Environment: Node 24.19.0, npm 11.9.0, system Chromium 154. Existing lockfile installation retained; package-lock.json unchanged. No live providers or real customer inputs were used.

| Command/check | Final result |
| --- | --- |
| `npm run lint` | PASS, tsc --noEmit |
| `npm test` | PASS, 26 tests; zero failures/skips. Includes domain, loopback API and regulated-startup rejection. |
| `npm run build` | PASS, 3327 modules; nonfatal large-chunk advisory |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | PASS, 6 tests; zero failures/skips |
| `NODE_ENV=production DATA_MODE=synthetic HOST=127.0.0.1 PORT=3011 npm start` | Started synthetic API and compiled SPA |
| `TARGET_PORT=3011 ./node_modules/.bin/tsx scripts/smoke-test.ts` | PASS, HTTP 200/application-json/status ok |
| Local GET `/kiosk` on 3011 | PASS, compiled asset path and Enawuga title |
| `git diff --check` | PASS |
| Focused tracked-file credential scan | No private-key blocks, GitHub tokens, former Firebase key or removed hardcoded stand-ins found; not a comprehensive secret-history audit |

Browser coverage: current kiosk heading/KYC/account, Ardi calculation output, paginated supervisor fleet headers/rows, offline outbox persistence and reconnect gate, alias change/re-verification, and duplicate partner authorization without transport settlement.

During development, the strengthened supervisor test initially counted all five fixture agents rather than three visible paginated rows; corrected to verify three agents plus header and the expected first agent. A production check initially reached an existing dev process on port 3000; using isolated port 3011 verified the intended process. The earlier baseline dev process also caused a harmless Vite WebSocket port warning during browser testing; tests completed successfully.

Formatting-only changes followed the browser run; final typecheck/domain/API tests and build passed afterward. Docker build and hosted GitHub Actions were not run. No claim of regulated deployment readiness is made.

## Hosted preview note

Vercel preview deployment for the current private-repository PR is blocked on the Hobby plan because the preceding cloud-agent-authored commit was attributed to a separate GitHub identity that does not have contributing access to the Vercel project. Local validation and GitHub Actions passed. Hosted preview verification remains pending; no production protection settings were changed.
