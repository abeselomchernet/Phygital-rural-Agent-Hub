import path from "node:path";

import {
  PartnerAdapterRegistry,
  adapterRegistration,
  routeRegistration,
  type PartnerAdapterResolutionProvenance,
} from "../domain/adapterRegistry";
import {
  MockPartnerFI,
  type FinancialInstitutionAdapter,
  type PartnerLedgerPersistence,
} from "../domain/financial";
import {
  ArifPaySandboxAdapter,
  arifPaySandboxConfigFromEnv,
  type PaymentGatewayAdapter,
} from "../domain/paymentGateway";
import { DurablePaymentGatewayAdapter } from "../domain/paymentGatewayState";
import {
  ArifPaySandboxStatusReader,
  PaymentGatewayReconciliationService,
} from "../domain/paymentGatewayReconciliation";
import {
  SYNTHETIC_ADAPTER_IDS,
  SYNTHETIC_PARTNER_IDS,
  SYNTHETIC_ROUTE_IDS,
  SYNTHETIC_SERVICE_IDS,
} from "../domain/syntheticReferencePartners";
import { AtomicJsonPaymentGatewayPersistence } from "./payment-gateway-persistence";
import { AtomicJsonPaymentGatewayReconciliationPersistence } from "./payment-gateway-reconciliation-persistence";

export const RUNTIME_PARTNER_IDS = {
  ARIFPAY_SANDBOX: "org_arifpay_sandbox_reference",
} as const;

export const RUNTIME_SERVICE_IDS = {
  ARIFPAY_C2B: "svc_arifpay_c2b",
  ARIFPAY_STATUS: "svc_arifpay_status",
} as const;

export const RUNTIME_ROUTE_IDS = {
  ARIFPAY_SANDBOX: "route_arifpay_sandbox_c2b",
} as const;

export const RUNTIME_ADAPTER_IDS = {
  ARIFPAY_SANDBOX: "adapter_arifpay_sandbox_v1",
  TELEBIRR_TESTBED_FOUNDATION: "adapter_telebirr_testbed_foundation_v1",
  MPESA_ETHIOPIA_SANDBOX_FOUNDATION:
    "adapter_mpesa_ethiopia_sandbox_foundation_v1",
} as const;

type SyntheticPartnerFiCoreAdapter = {
  financialInstitution: FinancialInstitutionAdapter;
  planningCapabilities: readonly string[];
};

type ArifPayRuntimeAdapter = {
  paymentGateway: PaymentGatewayAdapter;
  paymentGatewayReconciliation: PaymentGatewayReconciliationService;
};

export type RuntimeAdapterContext = {
  registry: PartnerAdapterRegistry;
  financialInstitutionAdapter: FinancialInstitutionAdapter;
  financialInstitutionRoute: PartnerAdapterResolutionProvenance;
  paymentGateway?: PaymentGatewayAdapter;
  paymentGatewayReconciliation?: PaymentGatewayReconciliationService;
  paymentGatewayRoute?: PartnerAdapterResolutionProvenance;
};

export type RuntimeAdapterBootstrapOptions = {
  env?: Record<string, string | undefined>;
  syntheticStateDir?: string;
  partnerLedgerPersistence?: PartnerLedgerPersistence;
};

function registerSyntheticPartnerFiAdapters(
  registry: PartnerAdapterRegistry,
  partnerLedgerPersistence?: PartnerLedgerPersistence,
) {
  registry.registerAdapter(
    adapterRegistration({
      adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
      partnerClass: "FINANCIAL_INSTITUTION",
      providerKey: "SYNTHETIC_PARTNERFI_ALPHA",
      protocolFamily: "ENAWUGA_SYNTHETIC_FI",
      environment: "synthetic",
      supportedCapabilities: [
        "FIN.ACCOUNT_LOOKUP",
        "FIN.CASH_IN_AUTHORIZE",
        "FIN.CASH_OUT_AUTHORIZE",
        "LIQ.NLC_READ",
      ],
      configSchemaId: "CFG_SYNTHETIC_PARTNERFI_ALPHA_V1",
      implementationKey: "SYNTHETIC_PARTNERFI_ALPHA_CORE_V1",
      status: "REGISTERED_SYNTHETIC",
      runtimeMode: "EXECUTABLE",
      evidenceRefs: ["EV-SYN-ALPHA-V1"],
    }),
    (): SyntheticPartnerFiCoreAdapter => ({
      financialInstitution: new MockPartnerFI("accept", partnerLedgerPersistence),
      planningCapabilities: ["LIQ.NLC_READ"],
    }),
  );

  registry.registerRoute(
    routeRegistration({
      routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
      providerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
      partnerClass: "FINANCIAL_INSTITUTION",
      environment: "synthetic",
      serviceIds: [
        SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
        SYNTHETIC_SERVICE_IDS.ALPHA_CASH_IN,
        SYNTHETIC_SERVICE_IDS.ALPHA_CASH_OUT,
        SYNTHETIC_SERVICE_IDS.ALPHA_NLC_READ,
      ],
      adapterId: SYNTHETIC_ADAPTER_IDS.ALPHA,
      supportedCapabilities: [
        "FIN.ACCOUNT_LOOKUP",
        "FIN.CASH_IN_AUTHORIZE",
        "FIN.CASH_OUT_AUTHORIZE",
        "LIQ.NLC_READ",
      ],
      status: "SYNTHETIC_BOUNDED",
      evidenceRefs: ["EV-SYN-ALPHA-V1"],
    }),
  );

  registry.registerAdapter(
    adapterRegistration({
      adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
      partnerClass: "FINANCIAL_INSTITUTION",
      providerKey: "SYNTHETIC_PARTNERFI_BETA",
      protocolFamily: "ENAWUGA_SYNTHETIC_FI",
      environment: "synthetic",
      supportedCapabilities: [
        "FIN.ACCOUNT_LOOKUP",
        "FIN.SAVINGS_INQUIRY",
        "FIN.SERVICE_REQUEST",
      ],
      configSchemaId: "CFG_SYNTHETIC_PARTNERFI_BETA_V1",
      implementationKey: "SYNTHETIC_PARTNERFI_BETA_CORE_V1",
      status: "REGISTERED_SYNTHETIC",
      runtimeMode: "EXECUTABLE",
      evidenceRefs: ["EV-SYN-BETA-V1"],
    }),
    (): SyntheticPartnerFiCoreAdapter => ({
      financialInstitution: new MockPartnerFI("accept"),
      planningCapabilities: ["FIN.SAVINGS_INQUIRY", "FIN.SERVICE_REQUEST"],
    }),
  );

  registry.registerRoute(
    routeRegistration({
      routeId: SYNTHETIC_ROUTE_IDS.BETA_CORE,
      providerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,
      partnerClass: "FINANCIAL_INSTITUTION",
      environment: "synthetic",
      serviceIds: [
        SYNTHETIC_SERVICE_IDS.BETA_ACCOUNT_LOOKUP,
        SYNTHETIC_SERVICE_IDS.BETA_SAVINGS_INQUIRY,
        SYNTHETIC_SERVICE_IDS.BETA_SERVICE_REQUEST,
      ],
      adapterId: SYNTHETIC_ADAPTER_IDS.BETA,
      supportedCapabilities: [
        "FIN.ACCOUNT_LOOKUP",
        "FIN.SAVINGS_INQUIRY",
        "FIN.SERVICE_REQUEST",
      ],
      status: "SYNTHETIC_BOUNDED",
      evidenceRefs: ["EV-SYN-BETA-V1"],
    }),
  );
}

function registerBoundedDirectProviderFoundations(registry: PartnerAdapterRegistry) {
  registry.registerAdapter(
    adapterRegistration({
      adapterId: RUNTIME_ADAPTER_IDS.TELEBIRR_TESTBED_FOUNDATION,
      partnerClass: "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
      providerKey: "TELEBIRR_DIRECT",
      protocolFamily: "TELEBIRR_TESTBED_FOUNDATION",
      environment: "testbed",
      supportedCapabilities: ["PAY.C2B_CREATE", "PAY.STATUS_QUERY"],
      configSchemaId: "CFG_TELEBIRR_TESTBED_FOUNDATION_V1",
      implementationKey: "TELEBIRR_TESTBED_FOUNDATION_V1",
      status: "REGISTERED_TESTBED",
      runtimeMode: "FOUNDATION_ONLY",
      evidenceRefs: ["EV-TELEBIRR-FOUNDATION"],
    }),
  );

  registry.registerAdapter(
    adapterRegistration({
      adapterId: RUNTIME_ADAPTER_IDS.MPESA_ETHIOPIA_SANDBOX_FOUNDATION,
      partnerClass: "MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER",
      providerKey: "MPESA_ETHIOPIA_DIRECT",
      protocolFamily: "MPESA_ETHIOPIA_SANDBOX_FOUNDATION",
      environment: "sandbox",
      supportedCapabilities: ["PAY.C2B_CREATE", "PAY.STATUS_QUERY"],
      configSchemaId: "CFG_MPESA_ETHIOPIA_SANDBOX_FOUNDATION_V1",
      implementationKey: "MPESA_ETHIOPIA_SANDBOX_FOUNDATION_V1",
      status: "REGISTERED_SANDBOX",
      runtimeMode: "FOUNDATION_ONLY",
      evidenceRefs: ["EV-MPESA-FOUNDATION"],
    }),
  );
}

function registerArifPay(
  registry: PartnerAdapterRegistry,
  options: RuntimeAdapterBootstrapOptions,
) {
  const env = options.env ?? process.env;
  const requested = env.ARIFPAY_MODE !== undefined;

  if (requested && env.ARIFPAY_MODE !== "sandbox")
    throw new Error("ARIFPAY_SANDBOX_MODE_REQUIRED");
  if (requested && !options.syntheticStateDir)
    throw new Error("ARIFPAY_SANDBOX_REQUIRES_SYNTHETIC_STATE_DIR");

  const adapterInput = adapterRegistration({
    adapterId: RUNTIME_ADAPTER_IDS.ARIFPAY_SANDBOX,
    partnerClass: "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
    providerKey: "ARIFPAY",
    protocolFamily: "ARIFPAY_REST",
    environment: "sandbox",
    supportedCapabilities: ["PAY.C2B_CREATE", "PAY.STATUS_QUERY"],
    configSchemaId: "CFG_ARIFPAY_SANDBOX_V1",
    credentialRef: requested ? "secretref_arifpay_sandbox" : null,
    implementationKey: "ARIFPAY_SANDBOX_V1",
    status: requested ? "REGISTERED_SANDBOX" : "REGISTERED_DISABLED",
    runtimeMode: requested ? "EXECUTABLE" : "FOUNDATION_ONLY",
    evidenceRefs: ["EV-2026-10-12-ARIFPAY-S2"],
  });

  const factory = requested
    ? (): ArifPayRuntimeAdapter => {
        const stateDir = options.syntheticStateDir;
        if (!stateDir)
          throw new Error("ARIFPAY_SANDBOX_REQUIRES_SYNTHETIC_STATE_DIR");
        const config = arifPaySandboxConfigFromEnv(env);
        const durableGateway = new DurablePaymentGatewayAdapter(
          new ArifPaySandboxAdapter(config),
          new AtomicJsonPaymentGatewayPersistence(
            path.join(stateDir, "payment-gateway.json"),
          ),
        );
        return {
          paymentGateway: durableGateway,
          paymentGatewayReconciliation: new PaymentGatewayReconciliationService(
            durableGateway,
            new ArifPaySandboxStatusReader(config),
            new AtomicJsonPaymentGatewayReconciliationPersistence(
              path.join(stateDir, "payment-gateway-reconciliation.json"),
            ),
          ),
        };
      }
    : undefined;

  registry.registerAdapter(adapterInput, factory);
  registry.registerRoute(
    routeRegistration({
      routeId: RUNTIME_ROUTE_IDS.ARIFPAY_SANDBOX,
      providerOrgId: RUNTIME_PARTNER_IDS.ARIFPAY_SANDBOX,
      partnerClass: "PAYMENT_GATEWAY_SYSTEM_OPERATOR",
      environment: "sandbox",
      serviceIds: [
        RUNTIME_SERVICE_IDS.ARIFPAY_C2B,
        RUNTIME_SERVICE_IDS.ARIFPAY_STATUS,
      ],
      adapterId: RUNTIME_ADAPTER_IDS.ARIFPAY_SANDBOX,
      supportedCapabilities: ["PAY.C2B_CREATE", "PAY.STATUS_QUERY"],
      status: requested ? "SANDBOX_BOUNDED" : "DISABLED",
      evidenceRefs: ["EV-2026-10-12-ARIFPAY-S2"],
    }),
  );
}

export function createRuntimeAdapterRegistry(
  options: RuntimeAdapterBootstrapOptions = {},
) {
  const registry = new PartnerAdapterRegistry();
  registerSyntheticPartnerFiAdapters(registry, options.partnerLedgerPersistence);
  registerBoundedDirectProviderFoundations(registry);
  registerArifPay(registry, options);
  return registry;
}

export function createDefaultSyntheticFinancialInstitutionAdapter(
  persistence?: PartnerLedgerPersistence,
) {
  const registry = createRuntimeAdapterRegistry({
    partnerLedgerPersistence: persistence,
    env: {},
  });
  const resolution = registry.resolve<SyntheticPartnerFiCoreAdapter>({
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    environment: "synthetic",
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
  });
  return resolution.adapter.financialInstitution;
}

export function createRuntimeAdapterContext(
  options: RuntimeAdapterBootstrapOptions = {},
): RuntimeAdapterContext {
  const env = options.env ?? process.env;
  const registry = createRuntimeAdapterRegistry({ ...options, env });
  const financial = registry.resolve<SyntheticPartnerFiCoreAdapter>({
    partnerOrgId: SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,
    serviceId: SYNTHETIC_SERVICE_IDS.ALPHA_ACCOUNT_LOOKUP,
    capabilityId: "FIN.ACCOUNT_LOOKUP",
    environment: "synthetic",
    routeId: SYNTHETIC_ROUTE_IDS.ALPHA_CORE,
  });

  const result: RuntimeAdapterContext = {
    registry,
    financialInstitutionAdapter: financial.adapter.financialInstitution,
    financialInstitutionRoute: financial.provenance,
  };

  if (env.ARIFPAY_MODE !== undefined) {
    const arifPay = registry.resolve<ArifPayRuntimeAdapter>({
      partnerOrgId: RUNTIME_PARTNER_IDS.ARIFPAY_SANDBOX,
      serviceId: RUNTIME_SERVICE_IDS.ARIFPAY_C2B,
      capabilityId: "PAY.C2B_CREATE",
      environment: "sandbox",
      routeId: RUNTIME_ROUTE_IDS.ARIFPAY_SANDBOX,
    });
    result.paymentGateway = arifPay.adapter.paymentGateway;
    result.paymentGatewayReconciliation =
      arifPay.adapter.paymentGatewayReconciliation;
    result.paymentGatewayRoute = arifPay.provenance;
  }

  return result;
}
