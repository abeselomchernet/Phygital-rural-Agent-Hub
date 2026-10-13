# Safaricom Ethiopia M-PESA sandbox foundation

Status: Draft / inactive contract-and-correlation foundation only / synthetic data only.

Date checked: 2026-10-13.

This workstream establishes only a provider-neutral correlation/reservation foundation plus read-only Operations readiness metadata for a possible future direct Safaricom Ethiopia M-PESA integration. It does not implement an Ethiopia M-PESA API contract and it does not activate any provider network path.

## Established evidence

Current public Safaricom Ethiopia material establishes that:

- Safaricom M-PESA Mobile Financial Services PLC operates M-PESA in Ethiopia;
- M-PESA merchant/payment services exist in Ethiopia, including merchant payments and merchant onboarding;
- Safaricom Ethiopia has public merchant/paybill/bulk-payment terms and business material for M-PESA services.

Sanitized public references reviewed on 2026-10-13:

- Safaricom Ethiopia M-PESA launch: https://www.safaricom.et/en/whats-new/latest/news-and-blogs/safaricom-ethiopia-goes-live-with-m-pesa
- Safaricom Ethiopia terms and conditions, including M-PESA Merchant / Paybill / Bulk Payment: https://www.safaricom.et/en/help-and-support/terms-and-privacy/terms-and-conditions
- Safaricom M-PESA / EagleLion merchant-integration announcement: https://www.safaricom.et/en/whats-new/latest/news-and-blogs/m-pesa-safaricom-and-eagle-lion-partner-to-drive-digital-financial-inclusion-in-ethiopia

A public M-PESA developer-portal lead was identified during research, but the authoritative Ethiopia-specific developer/sandbox contract needed for provider-facing implementation was not retrieved and pinned during this workstream.

Public Kenya/Daraja documentation is NOT treated as an Ethiopia integration contract. No Kenya-specific request fields, endpoints, credentials, token flow, shortcode/passkey model, callback rules, status meanings or currency assumptions are implemented here.

## Current implementation

Implemented now:

- provider metadata: `MPESA_ETHIOPIA_DIRECT`;
- jurisdiction metadata: `ET`;
- environment metadata: `sandbox`;
- contract status fixed to `UNVERIFIED`;
- networking fixed to `false`;
- initiation/status/notification capabilities marked unavailable;
- provider-neutral attempt/reservation schema and bounded local synthetic persistence;
- cross-provider reservation conflict primitives for future reviewed orchestration;
- read-only Operations readiness visibility.

Not implemented:

- provider endpoint or hostname;
- OAuth/token client;
- STK Push or equivalent initiation flow;
- C2B registration;
- status-query transport;
- callback/notification endpoint;
- credentials, consumer key/secret, shortcode, passkey or merchant identifier;
- provider-specific correlation/status fields;
- PartnerFI account, balance, authorization or settlement mutation.

The neutral attempt store is currently an unmounted foundation. Existing ArifPay and Telebirr runtime flows have not been migrated into it, so this branch does not claim that current live-in-code provider paths already share one cross-provider idempotency store.

## Unresolved activation gates

Before any direct Safaricom Ethiopia M-PESA sandbox networking can be considered, authoritative Ethiopia-specific evidence must establish and pin at least:

1. developer/sandbox availability for the intended Ethiopia account/product;
2. exact sandbox hostname and endpoint allowlist;
3. exact subscribed product;
4. authentication method;
5. token behavior, if applicable;
6. amount and currency rules;
7. merchant/service identifiers;
8. approved synthetic payer/MSISDN format;
9. initiation request schema;
10. initiation response schema;
11. authoritative provider correlation identifiers;
12. status/query contract;
13. lifecycle/status meanings;
14. notification/callback authentication;
15. replay and retry rules;
16. provider idempotency behavior;
17. redirect policy;
18. TLS requirements;
19. provider response/body constraints;
20. production/sandbox separation.

## Explicit safety boundary

No M-PESA provider call was made in this workstream.

No M-PESA credential was used or stored.

No real customer data was used.

No live funds were involved.

No Kenya-specific protocol was implemented.

No callback authority or provider status mapping was introduced.

No PartnerFI settlement, regulated-account or cash-in/cash-out authority was introduced.

Local attempt persistence is a synthetic development safety primitive only. It is not a distributed lock, transactional outbox, provider exactly-once guarantee, regulated ledger or production settlement store.

## Configuration consequence

Do not add speculative configuration such as `MPESA_BASE_URL`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE` or `MPESA_PASSKEY` until authoritative Safaricom Ethiopia evidence establishes the relevant contract.

An environment variable alone must never be capable of activating networking while the contract remains unverified.
