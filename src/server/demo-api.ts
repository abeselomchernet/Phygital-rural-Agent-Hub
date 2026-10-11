import { syntheticMetadata } from "../demo/fixtures";
import type { Express } from "express";
import { z } from "zod";
import { CustomerStore } from "../domain/customer";
import { KycService, MockFaydaAdapter } from "../domain/identity";
import { MockPartnerFI, TransactionService } from "../domain/financial";

// Only predeclared synthetic fixtures enter the unauthenticated prototype API.
export const demoPhones = [
  "+251900000001",
  "+251900000002",
  "+251900000003",
] as const;
export function registerDemoApi(app: Express) {
  const customers = new CustomerStore(),
    identity = new KycService(customers, new MockFaydaAdapter());
  const partner = new MockPartnerFI(),
    transactions = new TransactionService(customers, partner);
  const customer = customers.create(demoPhones[0]);
  identity.start(customer.customerId);
  identity.confirm(customer.customerId);
  const fixtureId = customer.customerId;
  app.use("/api/demo", (req, res, next) => {
    if (req.method !== "GET" && !req.is("application/json"))
      return res.status(415).json({ error: "JSON_REQUIRED" });
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`)
      return res.status(403).json({ error: "CROSS_ORIGIN_DISABLED" });
    next();
  });
  const respond = (res: any, fn: () => unknown) => {
    try {
      res.json({ ...(fn() as object), ...syntheticMetadata });
    } catch {
      res.status(400).json({ error: "DEMO_REQUEST_REJECTED" });
    }
  };
  app.get("/api/demo/customer", (_req, res) =>
    res.json({ ...customers.get(fixtureId), ...syntheticMetadata }),
  );
  app.get("/api/demo/lookup", (req, res) =>
    respond(res, () =>
      customers.resolve(z.enum(demoPhones).parse(req.query.phone)),
    ),
  );
  app.post("/api/demo/phone", (req, res) =>
    respond(res, () => {
      const { phone } = z
        .object({ phone: z.enum(demoPhones) })
        .strict()
        .parse(req.body);
      return customers.changePhone(fixtureId, phone);
    }),
  );
  app.post("/api/demo/reverify/start", (req, res) =>
    respond(res, () => {
      z.object({}).strict().parse(req.body);
      identity.requestReverification(fixtureId, "PHONE_CHANGE");
      return customers.get(fixtureId);
    }),
  );
  app.post("/api/demo/reverify/confirm", (req, res) =>
    respond(res, () => {
      z.object({}).strict().parse(req.body);
      return identity.confirm(fixtureId);
    }),
  );
  app.get("/api/demo/account", (_req, res) =>
    res.json({ ...partner.getAccountSummary(fixtureId), ...syntheticMetadata }),
  );
  app.post("/api/demo/transactions", (req, res) =>
    respond(res, () => {
      if (req.body?.customerId !== fixtureId)
        throw new Error("OBJECT_ACCESS_DENIED");
      return transactions.submit(req.body);
    }),
  );
}
