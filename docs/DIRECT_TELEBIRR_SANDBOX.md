# Direct Telebirr sandbox workstream

**Status:** T1–T6 bounded sandbox controls implemented; payment initiation remains blocked by provider-contract gate  
**Branch:** `feat/telebirr-sandbox-adapter`  
**Baseline:** `023a0919a44a28241711331a2dfc115e530d2294`  
**Environment:** Telebirr developer/test environment only  
**Data:** synthetic only  
**Live funds / production authority:** not enabled

Direct Ethio telecom Telebirr integration remains separate from ArifPay. Current provider evidence supports sandbox configuration, token acquisition, request signing, preorder construction, and a SuperApp `rawRequest`/start-pay handoff. It still does not provide enough authoritative active-account detail for direct payment submission or server-side reconciliation.

Implemented T1–T6 controls include sandbox-only fail-closed configuration, deterministic RSA-PSS/SHA-256 signing, guarded server-side token acquisition, pure signed preorder construction, bounded preorder-response classification with no payment/settlement promotion, and durable pre-submit provider-correlation reservation with restart/idempotency/transaction/order/nonce replay controls.

T6 snapshots store **no app secret, private key, access token, request signature, callback payload or provider payment state**. They are bounded synthetic reservation records, not payment ledgers, production outboxes or residency evidence.

The canonical T6 implementation is `src/domain/telebirrPreorderIntent.ts` with `src/server/telebirr-preorder-intent-persistence.ts`. A duplicate experimental durability layer was removed during final review so PR #6 has one Telebirr pre-submit source of truth.

Current Ethio telecom documentation confirms that the front end receives a backend-produced `rawRequest` and invokes the SuperApp start-pay API. The documented client callback is **not** treated by Enawuga as authoritative payment, settlement, or reconciliation evidence. Current public material still does not provide a complete authoritative `queryOrder`/server-callback contract suitable for implementation without inference.

Remaining gates before C2B payment networking:

1. active developer-account C2B Web Checkout subscription/scope;
2. current `preOrder` response and checkout/raw-request assembly contract for that subscribed product;
3. account-specific required request fields;
4. authoritative `queryOrder` endpoint/request/response/status lifecycle;
5. authoritative server-side `notify_url` authentication/signature/replay rules;
6. TestBed synthetic consumer/account identifiers.

Until those gates are satisfied, **no direct Telebirr payment initiation is enabled**.

Exact T1–T6 validation — GitHub Actions run `38301700041`, head `904ac3407014599b2e0026d982fa4a3de839defe`: Node 24.21.0/npm 11.19.0, `npm ci` pass (576 packages), production audit **0 vulnerabilities**, TypeScript pass, **106/106 tests**, production build pass, Docker pass, **13/13 Chromium E2E**.

Existing development/tooling findings remain 23 (2 low, 4 moderate, 17 high); the >500 kB Vite advisory remains non-blocking.

> This workstream implements direct Telebirr developer/test configuration, request signing, token acquisition, local signed preorder construction, bounded preorder-response classification and durable pre-submit correlation reservation using synthetic test evidence. It does not submit a Telebirr preorder, initiate or confirm a Telebirr payment, represent production connectivity, move live funds, create PartnerFI settlement, expose Wishland as a regulated principal, or authorize physical cash activity.
