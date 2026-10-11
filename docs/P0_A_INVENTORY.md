# P0-A pre-change inventory

Baseline: c495a2198c0d814a416794b57d9cc2470bf2bcbc, branch work; clean; remote main matches.

Implemented: React UI, Express in-memory mock, browser IndexedDB outbox, arithmetic scoring.
Mocked: identity checks, partner accounts, balances, hardware, settlement, reconciliation, SPIFFE and tracing. No licensed partner or authorization evidence is established.

| Concern | Files |
| --- | --- |
| Financial principal ambiguity | server.ts; src/pages/AgentKiosk.tsx, Farmer360.tsx, DataMule.tsx, SmartCycle.tsx, SettlementSandbox.tsx; README.md, SYSTEM_ARCHITECTURE.md, RELEASE.md, RUNBOOK.md |
| FIN as routine lookup | src/pages/AgentKiosk.tsx, Farmer360.tsx; SmartCycle.tsx displays Fayda participant references. No immutable customer foreign key exists in transaction payloads. |
| Phone fields | server.ts; src/pages/SupervisorPortal.tsx, OnboardAgent.tsx |
| Identity state | kiosk/Farmer360/supervisor/onboarding component state; server OTP map; unused firebase-blueprint.json and src/lib/firebase.ts |
| Persistence/delivery | src/lib/ghostsync.ts, iso20022.ts; src/pages/GhostSyncQueue.tsx, OnboardAgent.tsx; server.ts |
| External config | vite.config.ts injects Gemini key; unused Firebase client/config; docker-compose.yml embeds a demo DB password; Vercel serves SPA only |
| Security gaps | hardcoded HMAC stand-in, unsigned SVID decoding, sensitive request/OTP logs, unauthenticated mock endpoints, arbitrary queue payloads, no replay protection |

No literal Wishland-issued account was found; the absence of a partner boundary and local balance mutation implied platform authority. No Groq integration was found. LiveTranscription uses browser speech recognition, which can transmit audio externally.

Baseline: build, tsc and API smoke pass. Browser reproduction: 0/3 pass. app/applet/e2e/smoke.spec.ts:9 expects NAGA-NODE instead of Agent Terminal; :23 checks LCR before computation; :26 additionally expects Calculate instead of Compute Neural Score; :39 expects nonexistent TX HASH on supervisor dashboard. All are stale assertions/state assumptions; diagnostic interactions produced no page errors.
