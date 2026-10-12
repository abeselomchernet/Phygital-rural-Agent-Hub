# Direct Telebirr sandbox workstream

**Status:** T1–T6 bounded sandbox controls implemented; payment initiation remains blocked by provider-contract gate  
**Branch:** `feat/telebirr-sandbox-adapter`  
**Baseline:** `023a0919a44a28241711331a2dfc115e530d2294`  
**Environment:** Telebirr developer/test environment only  
**Data:** synthetic only  
**Live funds / production authority:** not enabled

Direct Telebirr remains a separate route from ArifPay. Current Ethio telecom evidence supports token acquisition, preorder request/signature construction, TestBed tooling and account/product subscription requirements, but it does not yet provide enough authoritative active-account detail for `queryOrder`, server-side callback authenticity, or final checkout assembly to enable a direct payment mutation safely.

Implemented controls:

- T1 sandbox-only configuration, HTTPS and pinned developer/test gateway.
- T2 deterministic RSA-PSS/SHA-256 MGF1 signing with synthetic CI keys.
- T3 guarded server-side `/payment/v1/token` client; no payment operation/token exposure.
- T4 pure signed `payment.preorder` construction; no provider submission.
- T5 local preorder-response classification; `ORDER_CREATED` never means paid/settled.
- T6 durable pre-submit correlation reservation binding Enawuga transaction/customer/idempotency to Telebirr merchant-order ID and nonce with restart and replay controls.

T6 snapshots store **no app secret, private key, access token, request signature, callback payload or provider payment state**. They are bounded synthetic reservation records, not payment ledgers, production outboxes or residency evidence.

Remaining gates before payment networking:

1. active-account C2B Web Checkout subscription/scope;
2. current `preOrder` response and checkout/raw-request assembly contract;
3. account-specific required request fields;
4. authoritative `queryOrder` endpoint/request/response/status lifecycle;
5. authoritative server-to-server `notify_url` authentication/signature/replay rules;
6. TestBed synthetic consumer/account identifiers.

Until those gates are satisfied, **no direct Telebirr payment initiation is enabled**.

T6 code validation — GitHub Actions run `38298524544`, code head `93819d53a82caa369493edc62453d72d11c181c7`:

- Node 24.21.0 / npm 11.19.0;
- `npm ci`: pass — 576 packages;
- production dependency audit: **0 vulnerabilities**;
- TypeScript/lint: pass;
- unit/domain/API tests: **105/105 pass**;
- production build: pass;
- Docker build: pass;
- Chromium E2E: **13/13 pass**.

Only documentation changed after that green code head. Normal CI on this final documentation head closes the evidence chain. Existing development/tooling findings remain 23 (2 low, 4 moderate, 17 high); the existing >500 kB Vite advisory remains non-blocking.

Next, after provider-contract pinning: add the provider-network preorder client only after subscription/scope and response/checkout verification; require T6 reservation before mutation; map results only to gateway-scoped states; expose through authenticated AGENT/customer controls without secrets/provider references; add `queryOrder` reconciliation only after authoritative status-contract capture; test uncertainty/replay/restart; add callbacks only after authenticity is verifiable.

> This workstream implements direct Telebirr developer/test configuration, request signing, token acquisition, local signed preorder construction, bounded preorder-response classification and durable pre-submit correlation reservation using synthetic test evidence. It does not submit a Telebirr preorder, initiate or confirm a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
