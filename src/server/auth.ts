import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

export type SyntheticRole = "AGENT" | "SUPERVISOR" | "PARTNER_ADMIN";

export interface SyntheticPrincipal {
  userId: string;
  role: SyntheticRole;
  allowedCustomerIds: readonly string[];
}

export interface SyntheticSessionView extends SyntheticPrincipal {
  csrfToken: string;
  expiresAt: string;
  localDevelopmentAuth: true;
}

export interface SyntheticSecurityAuditEvent {
  at: string;
  action:
    | "SESSION_CREATED"
    | "SESSION_REVOKED"
    | "SESSION_EXPIRED"
    | "AUTHENTICATION_DENIED"
    | "ROLE_DENIED"
    | "OBJECT_ACCESS_DENIED"
    | "CSRF_DENIED"
    | "RATE_LIMITED";
  outcome: "ALLOW" | "DENY";
  userId: string;
  role: SyntheticRole | "NONE";
  objectRef?: string;
}

interface StoredSession extends SyntheticPrincipal {
  sessionId: string;
  csrfToken: string;
  expiresAtMs: number;
}

export interface SyntheticAuthConfig {
  sessionTtlMs?: number;
  rateWindowMs?: number;
  maxRequestsPerWindow?: number;
}

export class SyntheticAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: 401 | 403 | 429,
  ) {
    super(code);
  }
}

const COOKIE_NAME = "enawuga_demo_session";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left),
    b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(req: Request, name: string) {
  const source = req.get("cookie") ?? "";
  for (const part of source.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export class SyntheticAuthService {
  private sessions = new Map<string, StoredSession>();
  private counters = new Map<string, { startedAt: number; count: number }>();
  private audit: SyntheticSecurityAuditEvent[] = [];
  private sessionTtlMs: number;
  private rateWindowMs: number;
  private maxRequestsPerWindow: number;

  constructor(config: SyntheticAuthConfig = {}) {
    this.sessionTtlMs = config.sessionTtlMs ?? 30 * 60_000;
    this.rateWindowMs = config.rateWindowMs ?? 60_000;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 60;
  }

  createSession(role: SyntheticRole, allowedCustomerIds: readonly string[]) {
    const userId =
      role === "AGENT"
        ? "synthetic-agent-01"
        : role === "SUPERVISOR"
          ? "synthetic-supervisor-01"
          : "synthetic-partner-admin-01";
    const session: StoredSession = {
      sessionId: randomUUID(),
      csrfToken: randomUUID(),
      userId,
      role,
      allowedCustomerIds: [...allowedCustomerIds],
      expiresAtMs: Date.now() + this.sessionTtlMs,
    };
    this.sessions.set(session.sessionId, session);
    this.record("SESSION_CREATED", "ALLOW", session);
    return session;
  }

  setSessionCookie(req: Request, res: Response, session: StoredSession) {
    const forwarded = req.get("x-forwarded-proto") ?? "";
    const secure = req.secure || forwarded.split(",")[0]?.trim() === "https";
    const maxAgeSeconds = Math.max(1, Math.floor(this.sessionTtlMs / 1000));
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(session.sessionId)}; Path=/api/demo; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`,
    );
  }

  clearSessionCookie(req: Request, res: Response) {
    const forwarded = req.get("x-forwarded-proto") ?? "";
    const secure = req.secure || forwarded.split(",")[0]?.trim() === "https";
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/api/demo; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`,
    );
  }

  authenticate(req: Request) {
    const sessionId = cookieValue(req, COOKIE_NAME);
    const session = sessionId ? this.sessions.get(sessionId) : undefined;
    if (!session) {
      this.record("AUTHENTICATION_DENIED", "DENY");
      throw new SyntheticAuthError("AUTHENTICATION_REQUIRED", 401);
    }
    if (session.expiresAtMs <= Date.now()) {
      this.sessions.delete(session.sessionId);
      this.counters.delete(session.sessionId);
      this.record("SESSION_EXPIRED", "DENY", session);
      throw new SyntheticAuthError("SESSION_EXPIRED", 401);
    }
    this.consumeRateLimit(session);
    return session;
  }

  requireRole(session: StoredSession, roles: readonly SyntheticRole[]) {
    if (!roles.includes(session.role)) {
      this.record("ROLE_DENIED", "DENY", session);
      throw new SyntheticAuthError("ROLE_ACCESS_DENIED", 403);
    }
  }

  requireCustomer(session: StoredSession, customerId: string) {
    if (!session.allowedCustomerIds.includes(customerId)) {
      this.record("OBJECT_ACCESS_DENIED", "DENY", session, customerId);
      throw new SyntheticAuthError("OBJECT_ACCESS_DENIED", 403);
    }
  }

  requireCsrf(req: Request, session: StoredSession) {
    const supplied = req.get("x-csrf-token") ?? "";
    if (!supplied || !safeEqual(supplied, session.csrfToken)) {
      this.record("CSRF_DENIED", "DENY", session);
      throw new SyntheticAuthError("CSRF_VALIDATION_FAILED", 403);
    }
  }

  revoke(session: StoredSession) {
    this.sessions.delete(session.sessionId);
    this.counters.delete(session.sessionId);
    this.record("SESSION_REVOKED", "ALLOW", session);
  }

  view(session: StoredSession): SyntheticSessionView {
    return {
      userId: session.userId,
      role: session.role,
      allowedCustomerIds: [...session.allowedCustomerIds],
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAtMs).toISOString(),
      localDevelopmentAuth: true,
    };
  }

  getAuditEntries() {
    return structuredClone(this.audit);
  }

  private consumeRateLimit(session: StoredSession) {
    const now = Date.now(),
      current = this.counters.get(session.sessionId);
    if (!current || now - current.startedAt >= this.rateWindowMs) {
      this.counters.set(session.sessionId, { startedAt: now, count: 1 });
      return;
    }
    current.count += 1;
    if (current.count > this.maxRequestsPerWindow) {
      this.record("RATE_LIMITED", "DENY", session);
      throw new SyntheticAuthError("RATE_LIMITED", 429);
    }
  }

  private record(
    action: SyntheticSecurityAuditEvent["action"],
    outcome: SyntheticSecurityAuditEvent["outcome"],
    session?: Pick<StoredSession, "userId" | "role">,
    objectRef?: string,
  ) {
    this.audit.push({
      at: new Date().toISOString(),
      action,
      outcome,
      userId: session?.userId ?? "anonymous",
      role: session?.role ?? "NONE",
      ...(objectRef ? { objectRef } : {}),
    });
    if (this.audit.length > 500) this.audit.splice(0, this.audit.length - 500);
  }
}
