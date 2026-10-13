import { Building2, Network, ShieldCheck, ToggleLeft, Truck } from "lucide-react";
import { CapabilityBadge } from "../components/ProductPresentation";
import {
  partnerEcosystemSummary,
  routeProvenanceLabel,
  syntheticPartnerOrganizations,
  syntheticRouteProvenance,
  type CapabilitySwitchState,
  type PartnerClass,
} from "../domain/partnerEcosystem";

const classLabel: Record<PartnerClass, string> = {
  FINANCIAL_INSTITUTION: "Financial Institution",
  PAYMENT_GATEWAY_SYSTEM_OPERATOR: "Payment Gateway / System Operator",
  MOBILE_MONEY_PAYMENT_INSTRUMENT_ISSUER: "Mobile Money / Payment Instrument Issuer",
  TELCO_COMMUNICATIONS: "Telco / Communications",
  IDENTITY_PROVIDER: "Identity Provider",
  FMCG_DISTRIBUTOR_MERCHANT: "FMCG / Distributor / Merchant",
  CASH_LOGISTICS_FLEET: "Cash Logistics / Fleet",
};

const stateLabel: Record<CapabilitySwitchState, string> = {
  DISABLED: "Disabled",
  SIMULATION_ONLY: "Simulation only",
  SANDBOX_BOUNDED: "Sandbox bounded",
};

export default function PartnerEcosystem() {
  const summary = partnerEcosystemSummary();

  return (
    <section className="max-w-6xl mx-auto space-y-6" data-testid="partner-ecosystem-console">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <CapabilityBadge state="IMPLEMENTED" />
          <CapabilityBadge state="SYNTHETIC DEMO" />
        </div>
        <div className="flex items-start gap-3">
          <Network className="h-7 w-7 text-indigo-400 mt-1" />
          <div>
            <h1 className="text-2xl font-black">Partner Ecosystem Console</h1>
            <p className="mt-2 text-slate-300">
              Stage 3 read-only partner model. Partner classes, capability switches and route provenance are visible without activating real services, moving cash, posting to PartnerFI accounts or exposing production credentials.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm" data-testid="partner-ecosystem-summary">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Partner organizations</p>
            <strong className="text-xl">{summary.partnerOrganizations}</strong>
            <p className="text-slate-400 mt-1">Synthetic/governance fixtures only.</p>
          </div>
          <div className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Sandbox bounded</p>
            <strong className="text-xl">{summary.sandboxBounded}</strong>
            <p className="text-slate-400 mt-1">Provider evidence, not settlement authority.</p>
          </div>
          <div className="rounded-xl border border-indigo-900/70 bg-indigo-950/20 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Simulation only</p>
            <strong className="text-xl">{summary.simulationOnly}</strong>
            <p className="text-slate-400 mt-1">Planning behavior with no operational dispatch.</p>
          </div>
          <div className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-4">
            <p className="text-slate-500 uppercase tracking-widest text-[10px]">Disabled switches</p>
            <strong className="text-xl">{summary.disabled}</strong>
            <p className="text-slate-400 mt-1">Code presence does not enable capability.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-100">
          <Building2 className="h-5 w-5 text-indigo-400" />
          <h2 className="font-black text-lg">Partner organizations & capability switches</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {syntheticPartnerOrganizations.map((partner) => (
            <article
              key={partner.partnerOrgId}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-100 space-y-4"
              data-testid={`partner-${partner.partnerOrgId}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{partner.displayName}</h3>
                  <p className="text-xs text-slate-400 mt-1">{classLabel[partner.partnerClass]}</p>
                </div>
                <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-300">
                  {partner.environment}
                </span>
              </div>

              <div className="space-y-2">
                {partner.capabilitySwitches.map((entry) => (
                  <div key={entry.capability} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="font-mono text-xs">{entry.capability}</strong>
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-300">
                        {stateLabel[entry.state]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{entry.reason}</p>
                  </div>
                ))}
              </div>

              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Permitted data</dt>
                  <dd className="text-slate-300">{partner.permittedDataClasses.join(", ") || "None"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Permitted routes</dt>
                  <dd className="text-slate-300">{partner.permittedRoutes.join(", ") || "None"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 space-y-4" data-testid="route-provenance">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-400" />
          <div>
            <h2 className="font-black text-lg">Route provenance</h2>
            <p className="text-sm text-slate-400 mt-1">
              Direct provider foundations remain distinct from gateway-routed payment paths. The UI must not imply a direct contract where the actual integration route is through a gateway/operator.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {syntheticRouteProvenance.map((route) => (
            <div key={route.routeId} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <code className="text-xs text-slate-200 break-all">{routeProvenanceLabel(route)}</code>
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-300">
                  {stateLabel[route.state]}
                </span>
              </div>
              <p className="text-xs text-slate-400">{route.authorityBoundary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-indigo-900/60 bg-indigo-950/20 p-5 text-slate-100">
          <div className="flex items-center gap-2 font-black">
            <ToggleLeft className="h-5 w-5" /> Capability-switch rule
          </div>
          <p className="mt-2 text-sm text-slate-300">
            A capability is not enabled because code, configuration or a provider contract exists. Activation requires the governed evidence, environment and authority gates for that specific capability.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-5 text-slate-100">
          <div className="flex items-center gap-2 font-black">
            <Truck className="h-5 w-5" /> Cash-fleet boundary
          </div>
          <p className="mt-2 text-sm text-slate-300">
            Stage 3 permits synthetic route planning only. No real cash custody, dispatch authority, handover, insurance assertion or PartnerFI posting is enabled.
          </p>
        </div>
      </div>
    </section>
  );
}
