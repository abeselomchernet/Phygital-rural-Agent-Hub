import { Link } from "react-router-dom";
import { CapabilityBadge } from "../components/ProductPresentation";

const stage3Modules = [
  {
    title: "Network liquidity",
    description:
      "Synthetic NLC / Liquidity Coverage Index decision support across 2H, 4H, 8H and EOD horizons. Not prudential regulatory LCR.",
    to: "/liquidity",
    link: "Open Network Liquidity Console",
  },
  {
    title: "Cash Fleet planning",
    description:
      "Synthetic liquidity-match and route planning only. Planning capacity does not establish cash availability, custody, dispatch or handover authority.",
    to: "/cash-fleet",
    link: "Open Cash Fleet Planning Console",
  },
  {
    title: "FMCG inventory & logistics",
    description:
      "Purpose-limited synthetic inventory and restock-draft planning. No purchase order, commercial dispatch, delivery confirmation or settlement is created.",
    to: "/fmcg",
    link: "Open FMCG Inventory & Logistics Console",
  },
  {
    title: "Partner ecosystem",
    description:
      "Read-only partner classes, capability switches and route provenance. Code presence does not become partner authorization.",
    to: "/partners",
    link: "Open Partner Ecosystem Console",
  },
] as const;

export default function SupervisorRegionalOperations() {
  return (
    <section className="space-y-6" data-testid="supervisor-regional-operations">
      <div className="section-heading">
        <CapabilityBadge state="SYNTHETIC DEMO" />
        <h1>Supervisor / Regional Operations</h1>
        <p>
          Stage 3 synthetic network-operations workspace. It coordinates planning and
          evidence views only; it does not create regulated authority, move cash,
          dispatch a fleet, post to PartnerFI accounts or settle provider transactions.
        </p>
      </div>

      <section className="product-card" data-testid="supervisor-authority-boundary">
        <CapabilityBadge state="DISABLED PENDING PARTNER AUTHORIZATION" />
        <h2>Authority boundary</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <strong>PartnerFI financial authority</strong>
            <p>Separate and unavailable in this synthetic workspace.</p>
          </div>
          <div>
            <strong>Cash movement / dispatch / handover</strong>
            <p>Disabled. Planning artifacts are not instructions or custody events.</p>
          </div>
          <div>
            <strong>Provider settlement</strong>
            <p>Gateway or provider evidence never becomes PartnerFI settlement automatically.</p>
          </div>
        </div>
        <p>
          Current access controls remain the governed application controls already in the
          baseline. This presentation surface does not itself grant a role, capability or
          object permission.
        </p>
      </section>

      <div className="product-grid">
        {stage3Modules.map((module) => (
          <section className="product-card" key={module.to}>
            <CapabilityBadge state="SYNTHETIC DEMO" />
            <h2>{module.title}</h2>
            <p>{module.description}</p>
            <Link className="text-link" to={module.to}>
              {module.link}
            </Link>
          </section>
        ))}
      </div>

      <div className="product-grid">
        <section className="product-card">
          <CapabilityBadge state="IMPLEMENTED" />
          <h2>Operations & reconciliation</h2>
          <p>
            ArifPay sandbox reconciliation is the bounded interactive provider workflow.
            Direct Telebirr and M-PESA Ethiopia remain inactive foundations with no direct
            payment, status or callback authority exposed here.
          </p>
          <Link className="text-link" to="/operations">
            Open Operations & Reconciliation Center
          </Link>
        </section>

        <section className="product-card">
          <CapabilityBadge state="SYNTHETIC DEMO" />
          <h2>Agent readiness</h2>
          <p>
            Review the existing synthetic onboarding/readiness flow. Hardware, identity
            and PartnerFI authorization shown in the demo are not live institutional checks.
          </p>
          <Link className="text-link" to="/onboard">
            Open Agent Readiness
          </Link>
        </section>

        <section className="product-card">
          <CapabilityBadge state="SYNTHETIC DEMO" />
          <h2>Offline transport</h2>
          <p>
            Review Data Mule / GhostSync transport demonstrations using synthetic fixtures.
            No real field device or external network is controlled from this page.
          </p>
          <Link className="text-link" to="/data-mule">
            Open Data Mule
          </Link>
        </section>
      </div>
    </section>
  );
}
