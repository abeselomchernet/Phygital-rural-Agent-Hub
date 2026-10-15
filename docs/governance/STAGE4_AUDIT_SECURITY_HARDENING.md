# Stage-4 Independent-Audit Security Hardening

**Status:** bounded Stage-4 implementation
**Source:** independent read-only audit dated 2026-10-15
**Scope:** F-01 through F-04 only

## Purpose

This change closes the four HIGH/MEDIUM current defects identified by the independent audit before any network-exposed staging use. The audit remains an external review artifact; this repository document records only the implementation and validation performed in the canonical codebase.

## F-01 — unauthenticated session-start rate limiting

`POST /api/demo/session/start` now passes through a dedicated in-memory limiter before a session is created.

- default: 20 attempts per 60 seconds per Express client IP;
- configurable in bounded server options for deterministic testing;
- denial returns `429 SESSION_START_RATE_LIMITED`;
- denial is recorded through the existing redacted AUTH audit vocabulary;
- the limiter stores only an ephemeral client-key counter and grants no authority.

The authenticated per-session limiter remains separate and unchanged.

## F-02 — CSP completion

The API/server CSP now includes:

- `default-src 'self'`;
- `script-src 'self'`;
- `style-src 'self' 'unsafe-inline'` to preserve the current React presentation surfaces that use inline style attributes;
- the existing same-origin connection/media restrictions, `object-src 'none'`, and `frame-ancestors 'none'`.

No external script origin is enabled.

## F-03 — lookup enumeration resistance

`GET /api/demo/lookup` no longer exposes different outcomes for an invalid phone shape versus an unavailable/not-authorized demo phone.

After role authorization, invalid, unresolved, or object-scope-denied lookups all return the same bounded response:

`404 CUSTOMER_LOOKUP_UNAVAILABLE`

Successful lookups remain restricted by the existing session role and customer-object authorization boundary.

## F-04 — reverse-proxy configuration

`createApp()` now has an explicit bounded `trustProxyHops` setting.

- local/test default: `0` trusted proxy hops;
- production default: `1` trusted proxy hop;
- explicit values are constrained to integer `0..5`;
- the setting allows Express `req.protocol` / `req.ip` semantics to reflect a single managed reverse proxy in production while avoiding unconditional proxy trust in local development.

Deployments with a different network topology must set the hop count deliberately rather than assuming arbitrary forwarded headers are authoritative.

## Boundary

This hardening does **not**:

- enable production authentication;
- convert the in-memory synthetic session store into a production identity service;
- activate M-PESA, Telebirr, ArifPay, Fayda, posting, settlement, callbacks, or live funds;
- grant regulated, provider, settlement, route-selection, or geographic authority;
- change the Stage-4 synthetic evidence classification.

## Validation requirements

The merge gate requires:

- focused API/auth tests covering rate limiting, trusted-proxy behavior, CSP headers, and lookup response normalization;
- full repository unit/integration suite;
- TypeScript lint/typecheck;
- production Vite build;
- `git diff --check`;
- authoritative hosted Linux CI, including Docker and Playwright E2E.

Local Playwright execution may require an installed Chromium binary; absence of a local browser is an environment prerequisite failure, not a test pass.
