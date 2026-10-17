import { randomUUID, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import {
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  HubAccessPurposeSchema,
  HubIdSchema,
  authorizeSyntheticHubAccess,
  projectAuthorizedHub,
  type HubAccessPurpose,
  type HubId,
} from "../domain/hub";
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
import {
  InMemorySyntheticSessionPersistence,
  type SyntheticSessionPersistence,
} from "./session-persistence";

export type SyntheticRole =
  | "AGENT"
  | "SUPERVISOR"
  | "OPERATIONS"
  | "PARTNER_ADMIN";

export interface SyntheticWorkspaceContext {
  tenantId: string;
  activePartnerOrgId: string;
  partnerOrgMemberships: readonly string[];
  regionId: string;
  agentGroupIds: readonly string[];
  serviceScopes: readonly string[];
  objectScopes: readonly string[];
  hubAssignments: readonly HubId[];
  hubPurposeScopes: readonly HubAccessPurpose[];
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

export interface SyntheticSessionView {
  userId: SyntheticPrincipal["userId"];
  role: SyntheticRole;
  allowedNetworkObjectIds: readonly NetworkOperationsObjectId[];
  workspaceContext: SyntheticWorkspaceContext;
  csrfToken: string;
  expiresAt: string;
  localDevelopmentAuth: true;
}

export interface StoredSession extends SyntheticPrincipal {
  sessionId: string;
  csrfToken: string;
  expiresAtMs: number;
}

export interface SyntheticAuthConfig {
  sessionTtlMs?: number;
  rateWindowMs?: number;
  maxRequestsPerWindow?: number;
  cleanupIntervalMs?: number;
}

export class SyntheticAuthError extends Error {
  constructor(
    readonly code: string,
    readonly status: 401 | 403 | 429 | 503,
  ) {
    super(code);
  }
}

const COOKIE_NAME = "enawuga_demo_session";

export const StoredSessionSchema = z
  .object({
    sessionId: z.string().uuid(),
    csrfToken: z.string().uuid(),
    userId: z.enum([
      "synthetic-agent-01",
      "synthetic-supervisor-01",
      "synthetic-operations-01",
      "synthetic-partner-admin-01",
    ]),
    role: z.enum(["AGENT", "SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]),
    allowedCustomerIds: z.array(z.string().min(1).max(120)).max(64),
    allowedNetworkObjectIds: z.array(NetworkOperationsObjectIdSchema).max(64),
    workspaceContext: z
      .object({
        tenantId: z.string().min(1).max(120),
        activePartnerOrgId: z.string().min(1).max(120),
        partnerOrgMemberships: z.array(z.string().min(1).max(120)).max(32),
        regionId: z.string().min(1).max(120),
        agentGroupIds: z.array(z.string().min(1).max(120)).max(64),
        serviceScopes: z.array(z.string().min(1).max(120)).max(128),
        objectScopes: z.array(z.string().min(1).max(120)).max(128),
        hubAssignments: z.array(HubIdSchema).max(32),
        hubPurposeScopes: z.array(HubAccessPurposeSchema).max(8),
      })
      .strict(),
    expiresAtMs: z.number().int().safe().positive(),
  })
  .strict();

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

function hubAssignmentsForRegion(regionId: string): readonly HubId[] {
  if (regionId === SYNTHETIC_REGION_IDS.ADAMA)
    return [SYNTHETIC_HUB_IDS.ADAMA_SHARED];
  if (regionId === SYNTHETIC_REGION_IDS.ARISI)
    return [SYNTHETIC_HUB_IDS.ARISI_ALPHA];
  return [];
}

function hubPurposeScopesForRole(role: SyntheticRole): readonly HubAccessPurpose[] {
  if (role === "AGENT") return ["HUB_VIEW", "HUB_OPERATE"];
  if (role === "SUPERVISOR") return ["HUB_VIEW", "HUB_SUPERVISE"];
  if (role === "OPERATIONS") return ["HUB_VIEW", "HUB_PARTNER_REVIEW"];
  return ["HUB_VIEW", "HUB_PARTNER_REVIEW", "HUB_ADMINISTER"];
}

function contextFromReferencePrincipal(
  principal: (typeof SYNTHETIC_REFERENCE_PRINCIPALS)[keyof typeof SYNTHETIC_REFERENCE_PRINCIPALS],
  activePartnerOrgId: string,
  regionId: string,
  role: SyntheticRole,
): SyntheticWorkspaceContext {
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    activePartnerOrgId,
    partnerOrgMemberships: [...principal.partnerOrgMemberships],
    regionId,
    agentGroupIds: [...principal.agentGroupIds],
    serviceScopes: [...principal.serviceScopes],
    objectScopes: [...principal.objectScopes],
    hubAssignments: [...hubAssignmentsForRegion(regionId)],
    hubPurposeScopes: [...hubPurposeScopesForRole(role)],
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
      role,
    );
  if (role === "SUPERVISOR")
    return contextFromReferencePrincipal(
      SYNTHETIC_REFERENCE_PRINCIPALS.alphaSupervisor,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      SYNTHETIC_REGION_IDS.ADAMA,
      role,
    );
  return {
    tenantId: SYNTHETIC_HUB_TENANT_IDS.STAGE4,
    activePartnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    partnerOrgMemberships: [SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA],
    regionId: SYNTHETIC_REGION_IDS.ADAMA,
    agentGroupIds: [],
    serviceScopes: [],
    objectScopes: [],
    hubAssignments: [SYNTHETIC_HUB_IDS.ADAMA_SHARED],
    hubPurposeScopes: [...hubPurposeScopesForRole(role)],
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
      "AGENT",
    );
  if (reference === "ALPHA_SUPERVISOR_ADAMA")
    return contextFromReferencePrincipal(
      SYNTHETIC_REFERENCE_PRINCIPALS.alphaSupervisor,
      SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      SYNTHETIC_REGION_IDS.ADAMA,
      "SUPERVISOR",
    );
  return contextFromReferencePrincipal(
    SYNTHETIC_REFERENCE_PRINCIPALS.alphaAgentAdama,
    SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    SYNTHETIC_REGION_IDS.ADAMA,
    "AGENT",
  );
}

export class SyntheticAuthService {
  private counters = new Map<string, { startedAt: number; count: number }>();
  private sessionTtlMs: number;
  private rateWindowMs: number;
  private maxRequestsPerWindow: number;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(
    config: SyntheticAuthConfig = {},
    private audit = new SyntheticAuditLog(),
    private sessionPersistence: SyntheticSessionPersistence = new InMemorySyntheticSessionPersistence(),
  ) {
    this.sessionTtlMs = config.sessionTtlMs ?? 30 * 60_000;
    this.rateWindowMs = config.rateWindowMs ?? 60_000;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow ?? 60;
    const cleanupIntervalMs = config.cleanupIntervalMs ?? 60_000;
    if (!Number.isSafeInteger(cleanupIntervalMs) || cleanupIntervalMs < 0)
      throw new Error("SESSION_CLEANUP_INTERVAL_INVALID");
    if (cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        try {
          this.sessionPersistence.sweepExpired(Date.now());
        } catch {
          // Retaining an expired/corrupt record is safe: authenticate still parses
          // and checks expiry before granting a session. Cleanup never grants access.
        }
      }, cleanupIntervalMs);
      this.cleanupTimer.unref?.();
    }
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
        tenantId: workspaceContext.tenantId,
        activePartnerOrgId: workspaceContext.activePartnerOrgId,
        partnerOrgMemberships: [...workspaceContext.partnerOrgMemberships],
        regionId: workspaceContext.regionId,
        agentGroupIds: [...workspaceContext.agentGroupIds],
        serviceScopes: [...workspaceContext.serviceScopes],
        objectScopes: [...workspaceContext.objectScopes],
        hubAssignments: [...workspaceContext.hubAssignments],
        hubPurposeScopes: [...workspaceContext.hubPurposeScopes],
      },
      expiresAtMs: Date.now() + this.sessionTtlMs,
    };
    const parsedSession = StoredSessionSchema.parse(session);
    this.saveSession(parsedSession);
    this.record("SESSION_CREATED", "ALLOW", parsedSession);
    return parsedSession;
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
    const session = sessionId ? this.loadSession(sessionId) : undefined;
    if (!session) {
      this.record("AUTHENTICATION_DENIED", "DENY");
      throw new SyntheticAuthError("AUTHENTICATION_REQUIRED", 401);
    }
    if (session.expiresAtMs <= Date.now()) {
      this.removeSession(session.sessionId);
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

  requireHubAccess(
    session: StoredSession,
    hubId: string,
    purpose: HubAccessPurpose = "HUB_VIEW",
  ) {
    const access = authorizeSyntheticHubAccess({
      hubId,
      purpose,
      context: {
        tenantId: session.workspaceContext.tenantId,
        role: session.role,
        activePartnerOrgId: session.workspaceContext.activePartnerOrgId,
        partnerOrgMemberships: [...session.workspaceContext.partnerOrgMemberships],
        regionId: session.workspaceContext.regionId,
        agentGroupIds: [...session.workspaceContext.agentGroupIds],
        assignedHubIds: [...session.workspaceContext.hubAssignments],
        allowedPurposes: [...session.workspaceContext.hubPurposeScopes],
      },
    });
    if (!access) {
      this.record("OBJECT_ACCESS_DENIED", "DENY", session);
      throw new SyntheticAuthError("HUB_ACCESS_DENIED", 403);
    }
    return projectAuthorizedHub(access);
  }

  requireCsrf(req: Request, session: StoredSession) {
    const supplied = req.get("x-csrf-token") ?? "";
    if (!supplied || !safeEqual(supplied, session.csrfToken)) {
      this.record("CSRF_DENIED", "DENY", session);
      throw new SyntheticAuthError("CSRF_VALIDATION_FAILED", 403);
    }
  }

  revoke(session: StoredSession) {
    this.removeSession(session.sessionId);
    this.counters.delete(session.sessionId);
    this.record("SESSION_REVOKED", "ALLOW", session);
  }

  view(session: StoredSession): SyntheticSessionView {
    return {
      userId: session.userId,
      role: session.role,
      allowedNetworkObjectIds: [...session.allowedNetworkObjectIds],
      workspaceContext: {
        tenantId: session.workspaceContext.tenantId,
        activePartnerOrgId: session.workspaceContext.activePartnerOrgId,
        partnerOrgMemberships: [...session.workspaceContext.partnerOrgMemberships],
        regionId: session.workspaceContext.regionId,
        agentGroupIds: [...session.workspaceContext.agentGroupIds],
        serviceScopes: [...session.workspaceContext.serviceScopes],
        objectScopes: [...session.workspaceContext.objectScopes],
        hubAssignments: [...session.workspaceContext.hubAssignments],
        hubPurposeScopes: [...session.workspaceContext.hubPurposeScopes],
      },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAtMs).toISOString(),
      localDevelopmentAuth: true,
    };
  }

  persistenceMode() {
    return { mode: this.sessionPersistence.mode, durable: this.sessionPersistence.durable } as const;
  }

  dispose() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = undefined;
  }

  private saveSession(session: StoredSession) {
    try {
      this.sessionPersistence.save(session.sessionId, session.expiresAtMs, session);
    } catch {
      this.record("AUTHENTICATION_DENIED", "DENY", session);
      throw new SyntheticAuthError("SESSION_STORE_UNAVAILABLE", 503);
    }
  }

  private loadSession(sessionId: string): StoredSession | undefined {
    try {
      const raw = this.sessionPersistence.load(sessionId);
      return raw === undefined ? undefined : StoredSessionSchema.parse(raw);
    } catch {
      this.record("AUTHENTICATION_DENIED", "DENY");
      throw new SyntheticAuthError("SESSION_STORE_UNAVAILABLE", 503);
    }
  }

  private removeSession(sessionId: string) {
    try {
      this.sessionPersistence.remove(sessionId);
    } catch {
      throw new SyntheticAuthError("SESSION_STORE_UNAVAILABLE", 503);
    }
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
