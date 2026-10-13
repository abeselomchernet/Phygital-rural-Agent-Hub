# Safaricom Ethiopia M-PESA sandbox foundation

Status: Draft / Ethiopia sandbox contract evidence retrieved / token runtime verified / payment runtime inactive / synthetic data only.

Date checked: 2026-10-13.

This workstream now has provider-supplied Safaricom Ethiopia sandbox evidence for the token endpoint and several product endpoints, plus successful external runtime verification of the sandbox token contract. The payment runtime remains deliberately unmounted: no M-PESA payment route, customer payment initiation, callback authority, status mapping or PartnerFI mutation is enabled by this PR.

## Evidence now established

Project-supplied Safaricom Ethiopia portal material identifies the `Phygital-rural-Agent-Hub` application in the Sandbox domain with products including Pay Out Sandbox, USSD PUSH Sandbox, TSQ API Product, B2B API Product and Accept Payment Sandbox.

The supplied Ethiopia portal documentation and Postman collection establish these sandbox contract elements:

- sandbox host: `https://apisandbox.safaricom.et`;
- token endpoint: `GET /v1/token/generate?grant_type=client_credentials`;
- token authentication: HTTP Basic using consumer key and consumer secret;
- successful token shape: `access_token`, `token_type: Bearer`, `expires_in`;
- USSD Push / merchant-initiated C2B endpoint: `POST /mpesa/stkpush/v3/processrequest` with bearer authentication;
- C2B URL registration endpoint: `POST /v1/c2b-register-url/register`;
- B2C payout endpoint: `POST /mpesa/b2c/v2/paymentrequest`;
- transaction-status endpoint: `POST /mpesa/transactionstatus/v1/query`;
- account-balance endpoint: `POST /mpesa/accountbalance/v2/query`;
- reversal endpoint: `POST /mpesa/reversal/v2/request`.

The credential-bearing source artifacts are evidence inputs only. Their consumer credentials, passkeys, initiator passwords, bearer tokens and security credentials MUST NOT be copied into Git, PR text, browser code, logs, fixtures or documentation. Sandbox credentials should be rotated after the controlled integration work.

## Evidence inconsistencies that remain gates

The Ethiopia source material is not internally uniform, so this PR does not blindly translate every example into runtime behavior.

Known examples:

- some request-parameter descriptions still show Kenya-style `2547...` MSISDN examples even though Ethiopia simulator/example requests use `251...` values;
- one historical Postman response example contains an `internalsandbox.safaricom.co.ke` result URL even though the actual Ethiopia request endpoints use `apisandbox.safaricom.et`;
- the USSD Push password description is inconsistent across supplied material: one description says a base64 encoding of `Shortcode + Passkey + Timestamp`, while the Postman test-data note states `Base64(Sha256(ShortCode + Passkey + TimeStamp))`.

Therefore no payer/MSISDN production rule, callback authority rule or USSD Push password derivation is implemented in this PR. Those details require controlled Ethiopia sandbox verification before initiation code is added.

## Callback/authenticity boundary

The supplied material documents asynchronous callbacks, result URLs and C2B validation/confirmation bodies, but the reviewed evidence does not establish an authoritative callback signature, HMAC, mTLS client identity or equivalent authenticity mechanism.

Accordingly:

- inbound callback JSON is not treated as settlement authority;
- no callback receiver is mounted;
- no callback result directly mutates PartnerFI or regulated financial state;
- future callback evidence must be correlated to a reserved internal attempt and independently reconciled where required.

A webhook.site URL was supplied for sandbox observation. It may be used only with Safaricom sandbox/simulator identities and synthetic amounts. It is not an approved production callback endpoint.

## Current implementation

Implemented now:

- provider metadata: `MPESA_ETHIOPIA_DIRECT`;
- jurisdiction metadata: `ET`;
- environment metadata: `sandbox`;
- contract status: `EVIDENCE_RETRIEVED`;
- foundation networking fixed to `false`;
- token contract marked documented;
- initiation/status-read/notification capabilities remain unavailable;
- hard-pinned Ethiopia sandbox token host and path;
- guarded server-side token client primitive with networking disabled unless explicitly enabled by a future reviewed caller;
- redirect rejection, timeout, bounded-response parsing and strict token-response validation;
- no token, consumer secret or authorization header persistence;
- provider-neutral attempt/reservation schema and bounded local synthetic persistence;
- cross-provider reservation conflict primitives for future reviewed orchestration;
- read-only Operations readiness visibility.

Not implemented or mounted:

- server/API route for M-PESA;
- runtime environment wiring that can activate M-PESA networking;
- USSD Push/C2B payment initiation;
- C2B URL registration;
- B2C payout;
- transaction-status transport;
- account-balance transport;
- reversal transport;
- callback/notification endpoint;
- provider-specific lifecycle/status mapping;
- PartnerFI account, balance, authorization or settlement mutation.

The neutral attempt store remains an unmounted foundation. Existing ArifPay and Telebirr runtime flows have not been migrated into it, so this branch does not claim that current provider implementations already share one global cross-provider idempotency store.

## Controlled token smoke status

The Codex cloud execution environment could not reach `apisandbox.safaricom.et` because its restricted outbound proxy denied the HTTPS CONNECT tunnel. That failure remains environment-specific and did not evaluate provider authentication.

A successful credentialed token-generation smoke was then completed on 2026-10-13 from a local Windows runtime using the current sandbox application credentials without printing or persisting the credential or returned access token.

Before the credentialed call, the local runtime resolved `apisandbox.safaricom.et` to an Ethiopia sandbox address, completed TLS successfully, and received an HTTP `404` from the provider root path, establishing direct HTTPS reachability. The existing sanitized smoke utility then returned:

- `ok: true`;
- provider `MPESA_ETHIOPIA_DIRECT`;
- environment `sandbox`;
- token type `Bearer`;
- expiry `3599` seconds.

This verifies the documented Ethiopia sandbox token contract at runtime. It does not verify any payment-initiation, payout, callback, status, reversal, balance, PartnerFI posting or settlement behavior.

## Remaining activation gates

Before M-PESA payment initiation is mounted, at minimum:

1. verify TLS/redirect behavior from the intended hosted sandbox execution environment;
2. confirm the exact app-product assignment for the narrow first payment flow;
3. pin the Ethiopia USSD Push password derivation using successful sandbox evidence;
4. confirm approved synthetic Ethiopia payer/MSISDN fixtures and formatting;
5. verify initiation request/response correlation using `MerchantRequestID` and `CheckoutRequestID`;
6. establish callback authenticity/replay/retry rules or retain callbacks as non-authoritative evidence;
7. verify transaction-status semantics before mapping provider state;
8. define provider idempotency/retry behavior for uncertain initiation outcomes;
9. preserve strict sandbox/production host and credential separation.

## Explicit safety boundary

No payment, payout, reversal, account-balance query, status query or callback registration was sent in this workstream.

No real customer data was used.

No live funds were involved.

No Kenya endpoint or Kenya-only protocol is implemented as an Ethiopia runtime contract.

No callback authority or provider status-to-settlement mapping is introduced.

No PartnerFI settlement, regulated-account or cash-in/cash-out authority is introduced.

Local attempt persistence is a synthetic development safety primitive only. It is not a distributed lock, transactional outbox, provider exactly-once guarantee, regulated ledger or production settlement store.

## Configuration consequence

The repo still does not contain M-PESA credential values. Future runtime configuration may reference server-side secret names for the verified Ethiopia sandbox contract, but values must remain outside Git and browser code.

An environment variable alone must never enable a payment path. Activation requires explicit server-side wiring, capability governance, tests and evidence review.
