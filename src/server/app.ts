import { validateDataConfig } from "../domain/residency";
import { registerDemoApi, type DemoApiOptions } from "./demo-api";
import express from "express";
import {
  syntheticEnvelope,
  syntheticMetadata,
  demoAgents,
  infrastructureFixture,
  isoFixtures,
} from "../demo/fixtures";

export function createApp(options: DemoApiOptions = {}) {
  validateDataConfig(process.env);
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'",
    );
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.post(
    [
      "/api/ghostsync",
      "/api/fayda/otp/send",
      "/api/fayda/otp/verify",
      "/api/settlement/iso20022",
      "/api/reconciliation/run",
      "/api/worker/tasks",
    ],
    (_req, res) => {
      res
        .status(403)
        .json({ error: "PROTOTYPE_OPERATION_DISABLED", simulated: true });
    },
  );

  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      name: "Enawuga / Phygital Rural Agent Hub",
      ...syntheticMetadata,
    }),
  );
  // Public presentation fixtures contain no customer-specific state. The
  // customer workbench API is registered below and is session protected.
  app.get(["/api/demo/agents", "/api/agents"], (_req, res) =>
    res.json(syntheticEnvelope(demoAgents)),
  );
  app.get(["/api/demo/swaps", "/api/swaps"], (_req, res) =>
    res.json(syntheticEnvelope([])),
  );
  app.get(["/api/demo/infrastructure", "/api/node/metrics"], (_req, res) =>
    res.json(syntheticEnvelope(infrastructureFixture)),
  );
  app.get(["/api/demo/iso20022/logs", "/api/iso20022/logs"], (_req, res) =>
    res.json(syntheticEnvelope(isoFixtures)),
  );
  app.get(
    ["/api/demo/statements/:agentId", "/api/statements/:agentId"],
    (_req, res) => res.json(syntheticEnvelope([])),
  );

  registerDemoApi(app, options);

  app.post("/api/score/compute", (_req, res) =>
    res
      .status(403)
      .json({ error: "LEGACY_SCORING_DISABLED", ...syntheticMetadata }),
  );

  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API_NOT_FOUND" }),
  );
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res
        .status(error.type === "entity.too.large" ? 413 : 400)
        .json({ error: "INVALID_REQUEST" });
    },
  );
  return app;
}
