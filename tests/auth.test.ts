import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SyntheticAuthError,
  SyntheticAuthService,
} from "../src/server/auth";

function request(headers: Record<string, string> = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    secure: false,
    get(name: string) {
      return normalized[name.toLowerCase()];
    },
  } as any;
}

function response() {
  const headers = new Map<string, string>();
  return {
    headers,
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
  } as any;
}

function expectAuthError(fn: () => unknown, code: string, status: number) {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof SyntheticAuthError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    return true;
  });
}

test("synthetic session uses HttpOnly same-site cookie and server-side role/object scope", () => {
  const auth = new SyntheticAuthService(),
    session = auth.createSession("AGENT", ["customer-a"]),
    res = response();
  auth.setSessionCookie(request(), res, session);
  const cookie = res.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/demo/);
  assert.doesNotMatch(cookie, /csrf/i);

  const cookiePair = cookie.split(";")[0];
  const authenticated = auth.authenticate(request({ cookie: cookiePair }));
  assert.equal(auth.view(authenticated).role, "AGENT");
  auth.requireRole(authenticated, ["AGENT"]);
  auth.requireCustomer(authenticated, "customer-a");
  expectAuthError(
    () => auth.requireRole(authenticated, ["PARTNER_ADMIN"]),
    "ROLE_ACCESS_DENIED",
    403,
  );
  expectAuthError(
    () => auth.requireCustomer(authenticated, "customer-b"),
    "OBJECT_ACCESS_DENIED",
    403,
  );
});

test("mutations require matching CSRF token and revoked sessions fail closed", () => {
  const auth = new SyntheticAuthService(),
    session = auth.createSession("AGENT", ["customer-a"]),
    res = response();
  auth.setSessionCookie(request(), res, session);
  const cookiePair = res.headers.get("set-cookie")!.split(";")[0],
    authenticated = auth.authenticate(request({ cookie: cookiePair }));
  expectAuthError(
    () => auth.requireCsrf(request(), authenticated),
    "CSRF_VALIDATION_FAILED",
    403,
  );
  expectAuthError(
    () => auth.requireCsrf(request({ "x-csrf-token": "wrong" }), authenticated),
    "CSRF_VALIDATION_FAILED",
    403,
  );
  auth.requireCsrf(
    request({ "x-csrf-token": auth.view(authenticated).csrfToken }),
    authenticated,
  );
  auth.revoke(authenticated);
  expectAuthError(
    () => auth.authenticate(request({ cookie: cookiePair })),
    "AUTHENTICATION_REQUIRED",
    401,
  );
});

test("expired sessions and rate limits fail closed", async () => {
  const expiring = new SyntheticAuthService({ sessionTtlMs: 5 }),
    expired = expiring.createSession("AGENT", ["customer-a"]),
    res = response();
  expiring.setSessionCookie(request(), res, expired);
  const cookiePair = res.headers.get("set-cookie")!.split(";")[0];
  await new Promise((resolve) => setTimeout(resolve, 10));
  expectAuthError(
    () => expiring.authenticate(request({ cookie: cookiePair })),
    "SESSION_EXPIRED",
    401,
  );

  const limited = new SyntheticAuthService({
      maxRequestsPerWindow: 1,
      rateWindowMs: 60_000,
    }),
    session = limited.createSession("AGENT", ["customer-a"]),
    rateRes = response();
  limited.setSessionCookie(request(), rateRes, session);
  const rateCookie = rateRes.headers.get("set-cookie")!.split(";")[0];
  limited.authenticate(request({ cookie: rateCookie }));
  expectAuthError(
    () => limited.authenticate(request({ cookie: rateCookie })),
    "RATE_LIMITED",
    429,
  );
});

test("security audit remains redacted and contains no session or CSRF secret", () => {
  const auth = new SyntheticAuthService(),
    session = auth.createSession("AGENT", ["customer-a"]),
    csrf = auth.view(session).csrfToken;
  expectAuthError(
    () => auth.requireCustomer(session, "customer-secret-object"),
    "OBJECT_ACCESS_DENIED",
    403,
  );
  const serialized = JSON.stringify(auth.getAuditEntries());
  assert.doesNotMatch(serialized, new RegExp(csrf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(serialized, /sessionId/i);
  assert.doesNotMatch(serialized, /phone|FIN|FAN|biometric/i);
  assert.match(serialized, /OBJECT_ACCESS_DENIED/);
});
