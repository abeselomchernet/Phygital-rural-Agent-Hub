import "dotenv/config";
import { createServer as createViteServer } from "vite";
import express from "express";
import path from "node:path";
import { createApp } from "./src/server/app";
import { validateDataConfig } from "./src/domain/residency";
import { createRuntimeAdapterContext } from "./src/server/adapter-bootstrap";
import { AtomicJsonCustomerPersistence } from "./src/server/customer-persistence";
import { AtomicJsonPartnerLedgerPersistence } from "./src/server/partner-ledger-persistence";
import {
  AtomicJsonKycPendingPersistence,
  AtomicJsonMockIdentityPersistence,
} from "./src/server/identity-persistence";
import { AtomicJsonSyntheticAuditPersistence } from "./src/server/audit-persistence";
import { createConfiguredSyntheticSessionPersistence } from "./src/server/session-persistence";

validateDataConfig(process.env);
const syntheticStateDir = process.env.SYNTHETIC_STATE_DIR;
const allowPrivilegedSyntheticRoles =
  process.env.ALLOW_PRIVILEGED_SYNTHETIC_ROLES === "true";
const requireDurableSessionStore =
  process.env.REQUIRE_DURABLE_SESSION_STORE === "true";
const sessionPersistence = createConfiguredSyntheticSessionPersistence({
  syntheticStateDir,
  requireDurable: requireDurableSessionStore,
});
const partnerLedgerPersistence = syntheticStateDir
  ? new AtomicJsonPartnerLedgerPersistence(
      path.join(syntheticStateDir, "partner-ledger.json"),
    )
  : undefined;
const runtimeAdapters = createRuntimeAdapterContext({
  env: process.env,
  syntheticStateDir,
  partnerLedgerPersistence,
});

const app = createApp({
  allowPrivilegedSyntheticRoles,
  adapterRegistry: runtimeAdapters.registry,
  financialInstitutionAdapter: runtimeAdapters.financialInstitutionAdapter,
  ...(syntheticStateDir
    ? {
        customerPersistence: new AtomicJsonCustomerPersistence(
          path.join(syntheticStateDir, "customers.json"),
        ),
        partnerLedgerPersistence,
        identityProviderPersistence: new AtomicJsonMockIdentityPersistence(
          path.join(syntheticStateDir, "mock-identity-provider.json"),
        ),
        kycPendingPersistence: new AtomicJsonKycPendingPersistence(
          path.join(syntheticStateDir, "kyc-pending.json"),
        ),
        auditPersistence: new AtomicJsonSyntheticAuditPersistence(
          path.join(syntheticStateDir, "audit.json"),
        ),
        sessionPersistence,
      }
    : {}),
  ...(runtimeAdapters.paymentGateway
    ? { paymentGateway: runtimeAdapters.paymentGateway }
    : {}),
  ...(runtimeAdapters.paymentGatewayReconciliation
    ? {
        paymentGatewayReconciliation:
          runtimeAdapters.paymentGatewayReconciliation,
      }
    : {}),
});
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve("dist")));
  app.get("*", (_req, res) => res.sendFile(path.resolve("dist/index.html")));
}
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
app.listen(port, host, () =>
  console.log(
    `Synthetic demo listening on ${host}:${port}${syntheticStateDir ? " with local synthetic durable state and restart-durable synthetic sessions" : " with in-memory synthetic sessions"}${runtimeAdapters.paymentGateway ? " with registry-routed guarded ArifPay sandbox adapter and status reconciliation" : ""}${allowPrivilegedSyntheticRoles ? " with explicitly enabled privileged synthetic roles" : ""}`,
  ),
);
