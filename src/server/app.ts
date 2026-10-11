import { validateDataConfig } from "../domain/residency";
import { registerDemoApi } from "./demo-api";
import express from "express";
import {
  syntheticEnvelope,
  syntheticMetadata,
  demoAgents,
  infrastructureFixture,
  isoFixtures,
} from "../demo/fixtures";

export function createApp() {
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
  // Legacy unauthenticated identity, settlement and upload paths are closed.
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
  registerDemoApi(app);

  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      name: "Enawuga / Phygital Rural Agent Hub",
      ...syntheticMetadata,
    }),
  );
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
