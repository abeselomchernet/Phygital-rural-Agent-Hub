import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import {
  NetworkOperationsActionSchema,
  NetworkOperationsObjectIdSchema,
  defaultNetworkObjectIdsForRole,
  isNetworkOperationsActionAuthorized,
  type NetworkOperationsAction,
  type NetworkOperationsObjectId,
} from "../domain/networkOperationsAuthorization";
import {
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_REFERENCE_PRINCIPALS,
  SYNTHETIC_REGION_IDS,
  type getSyntheticReferencePartner,
} from "../domain/syntheticReferencePartners";
import { SyntheticAuditLog, type SyntheticAuditEventInput } from "./audit";

export type SyntheticRole =
  | "AGENT"
  | "SUPERVISOR"
  | "OPERATIONS"
  | "PARTNER_ADMIN";

export interface SyntheticWorkspaceContext {
  activePartnerOrgId: string;
  partnerOrgMemberships: readonly string[];
  regionId: string;
  agentGroupIds: readonly string[];
  serviceScopes: readonly string[];
  objectScopes: readonly string[];
}

export interface SyntheticPrincipal {
  userId:
    | "synthetic-agent-01"
    | "synthetic-supervisor-01"
    | "synthetic-operations-01"
    | "synthetic-partner-admin-01";
  role: SyntheticRole;
  allowedCustomerIds: readonly string[];
  allowedNetworkObjectIds: readonly NetworkOperationsObjectId[];
  workspaceContext: SyntheticWorkspaceContext;
}

export interface SyntheticSessionView extends SyntheticPrincipal {
  csrfToken: string;
  expiresAt: string;
  localDevelopmentAuth: true;
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

function contextFromReferencePrincipal(
  principal: (typeof SYNTHETIC_REFERENCE_PRINCIPALS)[keyof typeof SYNTHETIC_REFERENCE_PRINCIPALS],
  activePartnerOrgId: string,
  regionId: string,
): SyntheticWorkspaceContext {
  return {
    activePartnerOrgId,
    partnerOrgMemberships: [...principal.partnerOrgMemberships],
    regionId,
    agentGroupIds: [...principal.agentGroupIds],
    serviceScopes: [...principal.serviceScopes],
    objectScopes: [...principal.objectScopes],
  };
}

export function defaultSyntheticWorkspaceContextForRole(
  role: SyntheticRole,
): SyntheticWorkspaceContext {
  if (role === "AGENT")
    return contextFromReferencePrincipal(
      SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      SYNTHETIC_REGION_IDS.ADAMA,
    );
  if (role === "SUPERVISOR")
    return contextFromReferencePrincipal(
      SYNTHETIC_REFERENCE_PRINCIPALS.alphaSupervisor,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      SYNTHETIC_REGION_IDS.ADAMA,
    );
  return {
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [],
    serviceScopes: [],
    objectScopes: [],
  };
}

export function syntheticWorkspaceContextForReference(
  reference: "ALPHA_AGENT_ADAMA" | "BETA_AGENT_ADAMA" | "ALPHA_SUPERVISOR_ADAMA",
) {
  if (reference === "BETA_AGENT_ADAMA")
    return contextFromReferencePrincipal(
      SYNTHETIC_REFERENCE_PRINCIPALS.betaAgentAdama,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      SYNTHETIC_REGION_IDS.ADAMA,
    );
  if (reference === "ALPHA_SUPERVISOR_ADAMA")
    return contextFromReferencePrincipal(
      SYNTHETIC_REFERENCE_PRINCIPALS.alphaSupervisor,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      SYNTHETIC_REGION_IDS.ADAMA,
    );
  return contextFromReferencePrincipal(
    SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    SYNTHETIC_REGION_IDS.ADAMA,
  );
}

export class SyntheticAuthService {
  private sessions = new Map<string, StoredSession>();
  private counters = new Map<string, { startedAt: number; count: number }>();
  private sessionTtlMs: number;
  private rateWindowMs: number;
  private maxRequestsPerWindow: number;

  constructor(
    config: SyntheticAuthConfig = {},
    private audit = new SyntheticAuditLog(),
  ) {
    this.sessionTtlMs = config.sessionTtlMs ?? 30 * 60_000;
    this.rateWindowMs = config.rateWindowMs ?? 60_000;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 60;
  }

  createSession(
    role: SyntheticRole,
    allowedCustomerIds: readonly string[],
    allowedNetworkObjectIds: readonly NetworkOperationsObjectId[] = defaultNetworkObjectIdsForRole(role),
    workspaceContext: SyntheticWorkspaceContext = defaultSyntheticWorkspaceContextForRole(role),
  ) {
    const userId =
      role === "AGENT"
        ? "synthetic-agent-01"
        : role === "SUPERVISOR"
          ? "synthetic-supervisor-01"
          : role === "OPERATIONS"
            ? "synthetic-operations-01"
            : "synthetic-partner-admin-01";
    const session: StoredSession = {
      sessionId: randomUUID(),
      csrfToken: randomUUID(),
      userId,
      role,
      allowedCustomerIds: [...allowedCustomerIds],
      allowedNetworkObjectIds: allowedNetworkObjectIds.map((objectId) =>
        NetworkOperationsObjectIdSchema.parse(objectId),
      ),
      workspaceContext: {
        activePartnerOrgId: workspaceContext.activePartnerOrgId,
        partnerOrgMemberships: [...workspaceContext.partnerOrgMemberships],
        regionId: workspaceContext.regionId,
        agentGroupIds: [...workspaceContext.agentGroupIds],
        serviceScopes: [...workspaceContext.serviceScopes],
        objectScopes: [...workspaceContext.objectScopes],
      },
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

  requireNetworkObject(
    session: StoredSession,
    objectId: NetworkOperationsObjectId,
    action: NetworkOperationsAction = "READ",
  ) {
    const parsedObjectId = NetworkOperationsObjectIdSchema.parse(objectId);
    const parsedAction = NetworkOperationsActionSchema.parse(action);
    if (
      !session.allowedNetworkObjectIds.includes(parsedObjectId) ||
      !isNetworkOperationsActionAuthorized(
        session.role,
        parsedObjectId,
        parsedAction,
      )
    ) {
      this.record("OBJECT_ACCESS_DENIED", "DENY", session);
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
      allowedNetworkObjectIds: [...session.allowedNetworkObjectIds],
      workspaceContext: {
        activePartnerOrgId: session.workspaceContext.activePartnerOrgId,
        partnerOrgMemberships: [...session.workspaceContext.partnerOrgMemberships],
        regionId: session.workspaceContext.regionId,
        agentGroupIds: [...session.workspaceContext.agentGroupIds],
        serviceScopes: [...session.workspaceContext.serviceScopes],
        objectScopes: [...session.workspaceContext.objectScopes],
      },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAtMs).toISOString(),
      localDevelopmentAuth: true,
    };
  }

  getAuditEntries() {
    return this.audit.list();
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
    action: SyntheticAuditEventInput["action"],
    outcome: "ALLOW" | "DENY",
    session?: Pick<StoredSession, "userId" | "role">,
    objectRef?: string,
  ) {
    this.audit.record({
      category: "AUTH",
      action,
      outcome,
      actor: {
        userId: session?.userId ?? "anonymous",
        role: session?.role ?? "NONE",
      },
      ...(objectRef && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(objectRef)
        ? { customerId: objectRef }
        : {}),
    });
  }
}
