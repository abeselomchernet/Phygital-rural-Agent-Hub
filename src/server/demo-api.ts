import { syntheticMetadata } from "../demo/fixtures";
import { HubAccessPurposeSchema } from "../domain/hub";
import {
  SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS,
  searchHubEconomics,
} from "../domain/hubEconomics";
import {
  SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS,
  searchStage4CorridorPlanning,
} from "../domain/corridorPlanning";
import {
  SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS,
  searchStage4HubOperatorDeviceReadiness,
} from "../domain/hubOperatorDeviceReadiness";
import {
  SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS,
  searchStage4PilotEvidence,
} from "../domain/pilotEvidenceEngine";
import {
  HubOfflineEvidenceViewerRoleSchema,
  SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
  searchHubOfflineEvidence,
} from "../domain/hubOfflineOperationsEvidence";
import {
  buildHubLiquidityTimeSeries,
  syntheticHubLiquidityObservations,
} from "../domain/hubLiquidityIntelligence";
import {
  HubOperationsViewerRoleSchema,
  SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
  searchHubOperationsTraces,
} from "../domain/hubOperationsTrace";
import type { Express } from "express";
import { z } from "zod";
import type { PartnerAdapterRegistry } from "../domain/adapterRegistry";
import {
  CustomerStore,
  type CustomerStorePersistence,
} from "../domain/customer";
import {
  KycService,
  MockFaydaAdapter,
  type KycPendingPersistence,
  type MockIdentityProviderPersistence,
} from "../domain/identity";
import {
  TransactionService,
  type FinancialInstitutionAdapter,
  type PartnerLedgerPersistence,
} from "../domain/financial";
import {
  PaymentGatewayC2BRequestSchema,
  type PaymentGatewayAdapter,
} from "../domain/paymentGateway";
import {
  PaymentGatewayReconciliationRequestSchema,
  type PaymentGatewayReconciliationService,
} from "../domain/paymentGatewayReconciliation";
import {
  SyntheticAuthError,
  SyntheticAuthService,
  type SyntheticRole,
} from "./auth";
import {
  SyntheticAuditLog,
  type SyntheticAuditPersistence,
} from "./audit";
import {
  createDefaultSyntheticFinancialInstitutionAdapter,
  createRuntimeAdapterRegistry,
} from "./adapter-bootstrap";
import {
  SyntheticWorkspaceKeySchema,
  generateHubServiceWorkspaceForSession,
  generateSyntheticWorkspaceForSession,
  resolveSyntheticWorkspaceContext,
} from "./workspace";

export const demoPhones = [
  "+251900000001",
  "+251900000002",
  "+251900000003",
] as const;

export interface DemoApiOptions {
  allowPrivilegedSyntheticRoles?: boolean;
  customerPersistence?: CustomerStorePersistence;
  partnerLedgerPersistence?: PartnerLedgerPersistence;
  financialInstitutionAdapter?: FinancialInstitutionAdapter;
  identityProviderPersistence?: MockIdentityProviderPersistence;
  kycPendingPersistence?: KycPendingPersistence;
  auditPersistence?: SyntheticAuditPersistence;
  paymentGateway?: PaymentGatewayAdapter;
  paymentGatewayReconciliation?: PaymentGatewayReconciliationService;
  adapterRegistry?: PartnerAdapterRegistry;
}

const roleSchema = z.enum([
  "AGENT",
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
]);
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const demoPhoneSet = new Set<string>(demoPhones);

export function registerDemoApi(app: Express, options: DemoApiOptions = {}) {
  const audit = new SyntheticAuditLog(options.auditPersistence),
    customers = new CustomerStore(options.customerPersistence, audit),
    provider = new MockFaydaAdapter(options.identityProviderPersistence),
    identity = new KycService(customers, provider, options.kycPendingPersistence),
    partner =
      options.financialInstitutionAdapter ??
      createDefaultSyntheticFinancialInstitutionAdapter(
        options.partnerLedgerPersistence,
      ),
    transactions = new TransactionService(customers, partner),
    auth = new SyntheticAuthService({}, audit),
    workspaceRegistry =
      options.adapterRegistry ?? createRuntimeAdapterRegistry({ env: {} });

  let customer = customers
    .list()
    .find((entry) => entry.primaryPhone && demoPhoneSet.has(entry.primaryPhone));
  if (!customer) {
    customer = customers.create(demoPhones[0]);
    identity.start(customer.customerId);
    customer = identity.confirm(customer.customerId);
    customer = customers.recordMockPhoneVerification(customer.customerId);
  } else if (
    customer.kycStatus === "UNVERIFIED" ||
    customer.kycStatus === "PENDING"
  ) {
    identity.start(customer.customerId);
    customer = identity.confirm(customer.customerId);
    if (customer.primaryPhone)
      customer = customers.recordMockPhoneVerification(customer.customerId);
  }
  if (!customer.partnerCustomerId)
    customer = customers.linkPartnerCustomer(
      customer.customerId,
      partner.lookupPartnerCustomer(customer.customerId),
    );
  const fixtureId = customer.customerId;

  app.use("/api/demo", (req, res, next) => {
    if (mutationMethods.has(req.method) && !req.is("application/json"))
      return res.status(415).json({ error: "JSON_REQUIRED" });
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
      audit.record({
        category: "AUTH",
        action: "CROSS_ORIGIN_DENIED",
        outcome: "DENY",
        actor: { userId: "anonymous", role: "NONE" },
      });
      return res.status(403).json({ error: "CROSS_ORIGIN_DISABLED" });
    }
    next();
  });

  const respond = (res: any, fn: () => unknown) => {
    try {
      res.json({ ...(fn() as object), ...syntheticMetadata });
    } catch (error) {
      if (error instanceof SyntheticAuthError)
        return res.status(error.status).json({ error: error.code });
      res.status(400).json({ error: "DEMO_REQUEST_REJECTED" });
    }
  };

  app.post("/api/demo/session/start", (req, res) =>
    respond(res, () => {
      const { role, workspaceKey } = z
        .object({
          role: roleSchema.default("AGENT"),
          workspaceKey: SyntheticWorkspaceKeySchema.optional(),
        })
        .strict()
        .parse(req.body);
      if (role !== "AGENT" && !options.allowPrivilegedSyntheticRoles) {
        audit.record({
          category: "AUTH",
          action: "PRIVILEGED_ROLE_DENIED",
          outcome: "DENY",
          actor: { userId: "anonymous", role: "NONE" },
        });
        throw new SyntheticAuthError("PRIVILEGED_SYNTHETIC_ROLE_DISABLED", 403);
      }
      const workspaceContext = resolveSyntheticWorkspaceContext({
        role: role as SyntheticRole,
        workspaceKey,
      });
      const session = auth.createSession(
        role as SyntheticRole,
        [fixtureId],
        undefined,
        workspaceContext,
      );
      auth.setSessionCookie(req, res, session);
      return auth.view(session);
    }),
  );

  app.use("/api/demo", (req, res, next) => {
    try {
      const session = auth.authenticate(req);
      if (mutationMethods.has(req.method)) auth.requireCsrf(req, session);
      res.locals.syntheticSession = session;
      next();
    } catch (error) {
      if (error instanceof SyntheticAuthError)
        return res.status(error.status).json({ error: error.code });
      next(error);
    }
  });

  app.get("/api/demo/session", (_req, res) =>
    res.json({
      ...auth.view(res.locals.syntheticSession),
      ...syntheticMetadata,
    }),
  );
  app.get("/api/demo/workspace", (_req, res) =>
    respond(res, () =>
      generateSyntheticWorkspaceForSession({
        session: res.locals.syntheticSession,
        registry: workspaceRegistry,
        evaluatedAt: new Date().toISOString(),
      }),
    ),
  );
  app.get("/api/demo/hubs/:hubId", (req, res) =>
    respond(res, () => {
      const purpose = HubAccessPurposeSchema.parse(
        typeof req.query.purpose === "string" ? req.query.purpose : "HUB_VIEW",
      );
      return auth.requireHubAccess(
        res.locals.syntheticSession,
        req.params.hubId,
        purpose,
      );
    }),
  );
  app.get("/api/demo/hubs/:hubId/services", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      const purpose =
        session.role === "AGENT"
          ? "HUB_OPERATE"
          : session.role === "SUPERVISOR"
            ? "HUB_SUPERVISE"
            : "HUB_PARTNER_REVIEW";
      auth.requireHubAccess(session, req.params.hubId, purpose);
      return generateHubServiceWorkspaceForSession({
        session,
        registry: workspaceRegistry,
        hubId: req.params.hubId,
        evaluatedAt: new Date().toISOString(),
      });
    }),
  );
  app.get("/api/demo/hubs/:hubId/economics", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]);
      const purpose =
        session.role === "SUPERVISOR" ? "HUB_SUPERVISE" : "HUB_PARTNER_REVIEW";
      const hub = auth.requireHubAccess(session, req.params.hubId, purpose);
      return {
        readOnly: true as const,
        economics: searchHubEconomics({
          readModels: SYNTHETIC_E5_HUB_ECONOMICS_READ_MODELS,
          tenantId: hub.tenantId,
          hubId: hub.hubId,
          partnerOrgId: hub.partnerMembership.partnerOrgId,
        }),
      };
    }),
  );
  app.get("/api/demo/hubs/:hubId/pilot-evidence", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]);
      const purpose =
        session.role === "SUPERVISOR" ? "HUB_SUPERVISE" : "HUB_PARTNER_REVIEW";
      const hub = auth.requireHubAccess(session, req.params.hubId, purpose);
      return {
        readOnly: true as const,
        programs: searchStage4PilotEvidence({
          readModels: SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS,
          tenantId: hub.tenantId,
          hubId: hub.hubId,
          partnerOrgId: hub.partnerMembership.partnerOrgId,
        }),
      };
    }),
  );
  app.get("/api/demo/hubs/:hubId/corridor-planning", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]);
      const purpose =
        session.role === "SUPERVISOR" ? "HUB_SUPERVISE" : "HUB_PARTNER_REVIEW";
      const hub = auth.requireHubAccess(session, req.params.hubId, purpose);
      return {
        readOnly: true as const,
        plans: searchStage4CorridorPlanning({
          readModels: SYNTHETIC_E7_CORRIDOR_PLANNING_READ_MODELS,
          tenantId: hub.tenantId,
          anchorHubId: hub.hubId,
          partnerOrgId: hub.partnerMembership.partnerOrgId,
        }),
      };
    }),
  );
  app.get("/api/demo/hubs/:hubId/operator-device-readiness", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]);
      const purpose =
        session.role === "SUPERVISOR" ? "HUB_SUPERVISE" : "HUB_PARTNER_REVIEW";
      const hub = auth.requireHubAccess(session, req.params.hubId, purpose);
      return {
        readOnly: true as const,
        readiness: searchStage4HubOperatorDeviceReadiness({
          readModels: SYNTHETIC_E8_OPERATOR_DEVICE_READINESS_READ_MODELS,
          tenantId: hub.tenantId,
          hubId: hub.hubId,
          partnerOrgId: hub.partnerMembership.partnerOrgId,
        }),
      };
    }),
  );
  app.get("/api/demo/hubs/:hubId/liquidity", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["SUPERVISOR"]);
      const hub = auth.requireHubAccess(session, req.params.hubId, "HUB_SUPERVISE");
      const evaluatedAt = new Date().toISOString();
      const serviceManifest = generateHubServiceWorkspaceForSession({
        session,
        registry: workspaceRegistry,
        hubId: req.params.hubId,
        evaluatedAt,
      });
      if (
        !serviceManifest.offerings.some(
          (offering) => offering.serviceType === "NETWORK_LIQUIDITY_READ",
        )
      )
        throw new SyntheticAuthError("HUB_LIQUIDITY_ACCESS_DENIED", 403);

      const timeSeries = buildHubLiquidityTimeSeries({
        tenantId: hub.tenantId,
        hubId: hub.hubId,
        partnerOrgId: hub.partnerMembership.partnerOrgId,
        observations: syntheticHubLiquidityObservations,
        evaluatedAt,
      });
      return {
        readOnly: true as const,
        latestSnapshot:
          timeSeries.snapshots[timeSeries.snapshots.length - 1],
        timeSeries,
      };
    }),
  );
  app.get("/api/demo/hub-operations/offline-evidence", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["OPERATIONS", "PARTNER_ADMIN"]);
      const { hubId, correlationId } = z
        .object({
          hubId: z.string().min(1).max(120),
          correlationId: z.string().min(1).max(120).optional(),
        })
        .strict()
        .parse(req.query);
      const hub = auth.requireHubAccess(session, hubId, "HUB_PARTNER_REVIEW");
      return {
        readOnly: true as const,
        traces: searchHubOfflineEvidence({
          readModel: SYNTHETIC_E4_OFFLINE_EVIDENCE_READ_MODEL,
          scope: {
            role: HubOfflineEvidenceViewerRoleSchema.parse(session.role),
            tenantId: hub.tenantId,
            hubId: hub.hubId,
            partnerOrgId: hub.partnerMembership.partnerOrgId,
          },
          correlationId,
        }),
      };
    }),
  );
  app.get("/api/demo/hub-operations/traces", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["OPERATIONS", "PARTNER_ADMIN"]);
      const { hubId, correlationId } = z
        .object({
          hubId: z.string().min(1).max(120),
          correlationId: z.string().min(1).max(120).optional(),
        })
        .strict()
        .parse(req.query);
      const hub = auth.requireHubAccess(session, hubId, "HUB_PARTNER_REVIEW");
      return {
        readOnly: true as const,
        traces: searchHubOperationsTraces({
          readModel: SYNTHETIC_E1D_OPERATIONS_READ_MODEL,
          scope: {
            role: HubOperationsViewerRoleSchema.parse(session.role),
            tenantId: hub.tenantId,
            hubId: hub.hubId,
            partnerOrgId: hub.partnerMembership.partnerOrgId,
          },
          correlationId,
        }),
      };
    }),
  );
  app.post("/api/demo/session/logout", (req, res) => {
    auth.revoke(res.locals.syntheticSession);
    auth.clearSessionCookie(req, res);
    res.json({ loggedOut: true, ...syntheticMetadata });
  });
  app.get("/api/demo/security/audit", (_req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, ["PARTNER_ADMIN"]);
      return { events: auth.getAuditEntries() };
    }),
  );

  app.get("/api/demo/customer", (_req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, [
        "AGENT",
        "SUPERVISOR",
        "PARTNER_ADMIN",
      ]);
      auth.requireCustomer(res.locals.syntheticSession, fixtureId);
      return customers.get(fixtureId);
    }),
  );
  app.get("/api/demo/lookup", (req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, [
        "AGENT",
        "SUPERVISOR",
        "PARTNER_ADMIN",
      ]);
      const resolved = customers.resolve(z.enum(demoPhones).parse(req.query.phone));
      auth.requireCustomer(res.locals.syntheticSession, resolved.customerId);
      return resolved;
    }),
  );
  app.post("/api/demo/phone", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["AGENT"]);
      auth.requireCustomer(session, fixtureId);
      const { phone } = z
        .object({ phone: z.enum(demoPhones) })
        .strict()
        .parse(req.body);
      const changed = customers.changePhone(fixtureId, phone);
      audit.record({
        category: "CUSTOMER",
        action: "PHONE_ALIAS_CHANGED",
        outcome: "SUCCESS",
        actor: { userId: session.userId, role: session.role },
        customerId: fixtureId,
        stateTo: changed.phoneStatus,
      });
      return changed;
    }),
  );
  app.post("/api/demo/reverify/start", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["AGENT"]);
      auth.requireCustomer(session, fixtureId);
      z.object({}).strict().parse(req.body);
      const before = customers.get(fixtureId).kycStatus;
      identity.requestReverification(fixtureId, "PHONE_CHANGE");
      const after = customers.get(fixtureId);
      audit.record({
        category: "KYC",
        action: "KYC_REVERIFICATION_REQUESTED",
        outcome: "PENDING",
        actor: { userId: session.userId, role: session.role },
        customerId: fixtureId,
        stateFrom: before,
        stateTo: after.kycStatus,
        code: "PHONE_CHANGE",
      });
      return after;
    }),
  );
  app.post("/api/demo/reverify/confirm", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["AGENT"]);
      auth.requireCustomer(session, fixtureId);
      z.object({}).strict().parse(req.body);
      const before = customers.get(fixtureId).kycStatus;
      identity.confirm(fixtureId);
      const confirmed = customers.recordMockPhoneVerification(fixtureId);
      audit.record({
        category: "KYC",
        action: "KYC_REVERIFICATION_CONFIRMED",
        outcome: "SUCCESS",
        actor: { userId: session.userId, role: session.role },
        customerId: fixtureId,
        stateFrom: before,
        stateTo: confirmed.kycStatus,
      });
      return confirmed;
    }),
  );
  app.get("/api/demo/account", (_req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, [
        "AGENT",
        "SUPERVISOR",
        "PARTNER_ADMIN",
      ]);
      auth.requireCustomer(res.locals.syntheticSession, fixtureId);
      return partner.getAccountSummary(fixtureId);
    }),
  );

  app.post("/api/demo/transactions", (req, res) =>
    respond(res, () => {
      const session = res.locals.syntheticSession;
      auth.requireRole(session, ["AGENT"]);
      const requestedCustomerId = z.string().uuid().parse(req.body?.customerId);
      auth.requireCustomer(session, requestedCustomerId);
      if (requestedCustomerId !== fixtureId)
        throw new SyntheticAuthError("OBJECT_ACCESS_DENIED", 403);
      audit.record({
        category: "FINANCIAL",
        action: "PARTNER_TRANSACTION_SUBMITTED",
        outcome: "PENDING",
        actor: { userId: session.userId, role: session.role },
        customerId: requestedCustomerId,
      });
      let result;
      try {
        result = transactions.submit(req.body);
      } catch (error) {
        audit.record({
          category: "FINANCIAL",
          action: "PARTNER_TRANSACTION_REJECTED",
          outcome: "FAIL",
          actor: { userId: session.userId, role: session.role },
          customerId: requestedCustomerId,
          code: "REQUEST_REJECTED",
        });
        throw error;
      }
      audit.record({
        category: "FINANCIAL",
        action: "PARTNER_TRANSACTION_RESULT",
        outcome:
          result.state === "PARTNER_REJECTED"
            ? "FAIL"
            : result.state === "PARTNER_AUTH_PENDING" ||
                result.state === "RECONCILIATION_REQUIRED"
              ? "PENDING"
              : "SUCCESS",
        actor: { userId: session.userId, role: session.role },
        customerId: requestedCustomerId,
        transactionId: result.transactionId,
        stateTo: result.state,
      });
      return result;
    }),
  );

  app.post("/api/demo/payments/arifpay/c2b/checkout", async (req, res) => {
    const session = res.locals.syntheticSession;
    let request;
    try {
      auth.requireRole(session, ["AGENT"]);
      request = PaymentGatewayC2BRequestSchema.parse(req.body);
      auth.requireCustomer(session, request.customerId);
      if (request.customerId !== fixtureId)
        throw new SyntheticAuthError("OBJECT_ACCESS_DENIED", 403);
    } catch (error) {
      if (error instanceof SyntheticAuthError)
        return res.status(error.status).json({ error: error.code });
      return res.status(400).json({ error: "DEMO_REQUEST_REJECTED" });
    }

    if (!options.paymentGateway) {
      audit.record({
        category: "FINANCIAL",
        action: "PAYMENT_GATEWAY_REJECTED",
        outcome: "FAIL",
        actor: { userId: session.userId, role: session.role },
        customerId: request.customerId,
        transactionId: request.transactionId,
        code: "GATEWAY_UNAVAILABLE",
      });
      return res.status(503).json({
        error: "PAYMENT_GATEWAY_UNAVAILABLE",
        ...syntheticMetadata,
      });
    }

    audit.record({
      category: "FINANCIAL",
      action: "PAYMENT_GATEWAY_SUBMITTED",
      outcome: "PENDING",
      actor: { userId: session.userId, role: session.role },
      customerId: request.customerId,
      transactionId: request.transactionId,
    });

    try {
      const result = await options.paymentGateway.createC2BCheckout(request);
      audit.record({
        category: "FINANCIAL",
        action: "PAYMENT_GATEWAY_RESULT",
        outcome:
          result.state === "CHECKOUT_CREATED"
            ? "SUCCESS"
            : result.state === "GATEWAY_REJECTED"
              ? "FAIL"
              : "PENDING",
        actor: { userId: session.userId, role: session.role },
        customerId: request.customerId,
        transactionId: request.transactionId,
        stateTo: result.state,
        code: result.code,
      });
      return res.json({ ...result, ...syntheticMetadata });
    } catch (error) {
      const recoveryRequired =
        error instanceof Error &&
        error.message === "GATEWAY_RECOVERY_RECONCILIATION_REQUIRED";
      audit.record({
        category: "FINANCIAL",
        action: "PAYMENT_GATEWAY_REJECTED",
        outcome: recoveryRequired ? "PENDING" : "FAIL",
        actor: { userId: session.userId, role: session.role },
        customerId: request.customerId,
        transactionId: request.transactionId,
        code: recoveryRequired
          ? "GATEWAY_RECOVERY_RECONCILIATION_REQUIRED"
          : "REQUEST_REJECTED",
      });
      return res.status(recoveryRequired ? 409 : 400).json({
        error: recoveryRequired
          ? "PAYMENT_GATEWAY_RECONCILIATION_REQUIRED"
          : "PAYMENT_GATEWAY_REQUEST_REJECTED",
        ...syntheticMetadata,
      });
    }
  });

  app.post("/api/demo/payments/arifpay/c2b/reconcile", async (req, res) => {
    const session = res.locals.syntheticSession;
    let request;
    try {
      auth.requireRole(session, ["SUPERVISOR", "OPERATIONS", "PARTNER_ADMIN"]);
      request = PaymentGatewayReconciliationRequestSchema.parse(req.body);
      auth.requireCustomer(session, request.customerId);
      if (request.customerId !== fixtureId)
        throw new SyntheticAuthError("OBJECT_ACCESS_DENIED", 403);
    } catch (error) {
      if (error instanceof SyntheticAuthError)
        return res.status(error.status).json({ error: error.code });
      return res.status(400).json({ error: "DEMO_REQUEST_REJECTED" });
    }

    if (!options.paymentGatewayReconciliation) {
      audit.record({
        category: "RECONCILIATION",
        action: "PAYMENT_GATEWAY_RECONCILIATION_REJECTED",
        outcome: "FAIL",
        actor: { userId: session.userId, role: session.role },
        customerId: request.customerId,
        transactionId: request.transactionId,
        code: "GATEWAY_UNAVAILABLE",
      });
      return res.status(503).json({
        error: "PAYMENT_GATEWAY_RECONCILIATION_UNAVAILABLE",
        ...syntheticMetadata,
      });
    }

    audit.record({
      category: "RECONCILIATION",
      action: "PAYMENT_GATEWAY_RECONCILIATION_QUERIED",
      outcome: "PENDING",
      actor: { userId: session.userId, role: session.role },
      customerId: request.customerId,
      transactionId: request.transactionId,
    });

    try {
      const result = await options.paymentGatewayReconciliation.reconcile(request);
      audit.record({
        category: "RECONCILIATION",
        action: "PAYMENT_GATEWAY_RECONCILIATION_RESULT",
        outcome:
          result.state === "GATEWAY_CONFIRMED"
            ? "SUCCESS"
            : result.state === "GATEWAY_FAILED" ||
                result.state === "GATEWAY_CANCELED" ||
                result.state === "GATEWAY_EXPIRED"
              ? "FAIL"
              : "PENDING",
        actor: { userId: session.userId, role: session.role },
        customerId: request.customerId,
        transactionId: request.transactionId,
        stateTo: result.state,
        code: result.code,
      });
      return res.json({ ...result, ...syntheticMetadata });
    } catch {
      audit.record({
        category: "RECONCILIATION",
        action: "PAYMENT_GATEWAY_RECONCILIATION_REJECTED",
        outcome: "FAIL",
        actor: { userId: session.userId, role: session.role },
        customerId: request.customerId,
        transactionId: request.transactionId,
        code: "REQUEST_REJECTED",
      });
      return res.status(400).json({
        error: "PAYMENT_GATEWAY_RECONCILIATION_REJECTED",
        ...syntheticMetadata,
      });
    }
  });
}
