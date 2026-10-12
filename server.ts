import "dotenv/config";
import { createServer as createViteServer } from "vite";
import express from "express";
import path from "node:path";
import { createApp } from "./src/server/app";
import { validateDataConfig } from "./src/domain/residency";
import {
  ArifPaySandboxAdapter,
  arifPaySandboxConfigFromEnv,
  type PaymentGatewayAdapter,
} from "./src/domain/paymentGateway";
import { DurablePaymentGatewayAdapter } from "./src/domain/paymentGatewayState";
import {
  ArifPaySandboxStatusReader,
  PaymentGatewayReconciliationService,
} from "./src/domain/paymentGatewayReconciliation";
import { AtomicJsonCustomerPersistence } from "./src/server/customer-persistence";
import { AtomicJsonPartnerLedgerPersistence } from "./src/server/partner-ledger-persistence";
import {
  AtomicJsonKycPendingPersistence,
  AtomicJsonMockIdentityPersistence,
} from "./src/server/identity-persistence";
import { AtomicJsonSyntheticAuditPersistence } from "./src/server/audit-persistence";
import { AtomicJsonPaymentGatewayPersistence } from "./src/server/payment-gateway-persistence";
import { AtomicJsonPaymentGatewayReconciliationPersistence } from "./src/server/payment-gateway-reconciliation-persistence";

validateDataConfig(process.env);
const syntheticStateDir = process.env.SYNTHETIC_STATE_DIR;
const allowPrivilegedSyntheticRoles =
  process.env.ALLOW_PRIVILEGED_SYNTHETIC_ROLES === "true";

let paymentGateway: PaymentGatewayAdapter | undefined;
let paymentGatewayReconciliation: PaymentGatewayReconciliationService | undefined;
if (process.env.ARIFPAY_MODE !== undefined) {
  if (process.env.ARIFPAY_MODE !== "sandbox")
    throw new Error("ARIFPAY_SANDBOX_MODE_REQUIRED");
  if (!syntheticStateDir)
    throw new Error("ARIFPAY_SANDBOX_REQUIRES_SYNTHETIC_STATE_DIR");

  const config = arifPaySandboxConfigFromEnv(process.env);
  const durableGateway = new DurablePaymentGatewayAdapter(
    new ArifPaySandboxAdapter(config),
    new AtomicJsonPaymentGatewayPersistence(
      path.join(syntheticStateDir, "payment-gateway.json"),
    ),
  );
  paymentGateway = durableGateway;
  paymentGatewayReconciliation = new PaymentGatewayReconciliationService(
    durableGateway,
    new ArifPaySandboxStatusReader(config),
    new AtomicJsonPaymentGatewayReconciliationPersistence(
      path.join(syntheticStateDir, "payment-gateway-reconciliation.json"),
    ),
  );
}

const app = createApp({
  allowPrivilegedSyntheticRoles,
  ...(syntheticStateDir
    ? {
        customerPersistence: new AtomicJsonCustomerPersistence(
          path.join(syntheticStateDir, "customers.json"),
        ),
        partnerLedgerPersistence: new AtomicJsonPartnerLedgerPersistence(
          path.join(syntheticStateDir, "partner-ledger.json"),
        ),
        identityProviderPersistence: new AtomicJsonMockIdentityPersistence(
          path.join(syntheticStateDir, "mock-identity-provider.json"),
        ),
        kycPendingPersistence: new AtomicJsonKycPendingPersistence(
          path.join(syntheticStateDir, "kyc-pending.json"),
        ),
        auditPersistence: new AtomicJsonSyntheticAuditPersistence(
          path.join(syntheticStateDir, "audit.json"),
        ),
      }
    : {}),
  ...(paymentGateway ? { paymentGateway } : {}),
  ...(paymentGatewayReconciliation ? { paymentGatewayReconciliation } : {}),
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
    `Synthetic demo listening on ${host}:${port}${syntheticStateDir ? " with local synthetic durable state" : ""}${paymentGateway ? " with guarded ArifPay sandbox adapter and status reconciliation" : ""}${allowPrivilegedSyntheticRoles ? " with explicitly enabled privileged synthetic roles" : ""}`,
  ),
);
