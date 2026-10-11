import { syntheticMetadata } from "../demo/fixtures";
import type { Express } from "express";
import { z } from "zod";
import {
  CustomerStore,
  type CustomerStorePersistence,
} from "../domain/customer";
import { KycService, MockFaydaAdapter } from "../domain/identity";
import {
  MockPartnerFI,
  TransactionService,
  type PartnerLedgerPersistence,
} from "../domain/financial";
import {
  SyntheticAuthError,
  SyntheticAuthService,
  type SyntheticRole,
} from "./auth";

export const demoPhones = [
  "+251900000001",
  "+251900000002",
  "+251900000003",
] as const;

export interface DemoApiOptions {
  allowPrivilegedSyntheticRoles?: boolean;
  customerPersistence?: CustomerStorePersistence;
  partnerLedgerPersistence?: PartnerLedgerPersistence;
}

const roleSchema = z.enum(["AGENT", "SUPERVISOR", "PARTNER_ADMIN"]);
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const demoPhoneSet = new Set<string>(demoPhones);

export function registerDemoApi(app: Express, options: DemoApiOptions = {}) {
  const customers = new CustomerStore(options.customerPersistence),
    identity = new KycService(customers, new MockFaydaAdapter()),
    partner = new MockPartnerFI("accept", options.partnerLedgerPersistence),
    transactions = new TransactionService(customers, partner),
    auth = new SyntheticAuthService();

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
    // Synthetic fixture bootstrap recovery only. This does not recover or
    // override a suspended/re-verification-required regulated decision.
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
    if (origin && origin !== `${req.protocol}://${req.get("host")}`)
      return res.status(403).json({ error: "CROSS_ORIGIN_DISABLED" });
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
      const { role } = z
        .object({ role: roleSchema.default("AGENT") })
        .strict()
        .parse(req.body);
      if (role !== "AGENT" && !options.allowPrivilegedSyntheticRoles)
        throw new SyntheticAuthError("PRIVILEGED_SYNTHETIC_ROLE_DISABLED", 403);
      const allowedCustomerIds = [fixtureId];
      const session = auth.createSession(role as SyntheticRole, allowedCustomerIds);
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
      const resolved = customers.resolve(
        z.enum(demoPhones).parse(req.query.phone),
      );
      auth.requireCustomer(res.locals.syntheticSession, resolved.customerId);
      return resolved;
    }),
  );
  app.post("/api/demo/phone", (req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, ["AGENT"]);
      auth.requireCustomer(res.locals.syntheticSession, fixtureId);
      const { phone } = z
        .object({ phone: z.enum(demoPhones) })
        .strict()
        .parse(req.body);
      return customers.changePhone(fixtureId, phone);
    }),
  );
  app.post("/api/demo/reverify/start", (req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, ["AGENT"]);
      auth.requireCustomer(res.locals.syntheticSession, fixtureId);
      z.object({}).strict().parse(req.body);
      identity.requestReverification(fixtureId, "PHONE_CHANGE");
      return customers.get(fixtureId);
    }),
  );
  app.post("/api/demo/reverify/confirm", (req, res) =>
    respond(res, () => {
      auth.requireRole(res.locals.syntheticSession, ["AGENT"]);
      auth.requireCustomer(res.locals.syntheticSession, fixtureId);
      z.object({}).strict().parse(req.body);
      identity.confirm(fixtureId);
      return customers.recordMockPhoneVerification(fixtureId);
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
      auth.requireRole(res.locals.syntheticSession, ["AGENT"]);
      const requestedCustomerId = z.string().uuid().parse(req.body?.customerId);
      auth.requireCustomer(res.locals.syntheticSession, requestedCustomerId);
      if (requestedCustomerId !== fixtureId)
        throw new SyntheticAuthError("OBJECT_ACCESS_DENIED", 403);
      return transactions.submit(req.body);
    }),
  );
}
