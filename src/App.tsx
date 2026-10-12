import { Routes, Route, Link } from "react-router-dom";
import { useEffect } from "react";
import { initGhostSync } from "./lib/ghostsync";
import {
  PresentationShell,
  ServicePortfolio,
  InventoryDemo,
  LiquidityDemo,
  TrainingDemo,
  CapabilityBadge,
  OnboardingWalkthrough,
} from "./components/ProductPresentation";
import AgentKiosk from "./pages/AgentKiosk";
import Farmer360 from "./pages/Farmer360";
import GhostSyncQueue from "./pages/GhostSyncQueue";
import OnboardAgent from "./pages/OnboardAgent";
import SupervisorPortal from "./pages/SupervisorPortal";
import OperationsReconciliation from "./pages/OperationsReconciliation";
import DataMule from "./pages/DataMule";
import LiveTranscription from "./pages/LiveTranscription";
import DemoArchitecture from "./pages/SovereignNode";
import ArdiEngine from "./pages/ArdiEngine";
import { Toaster } from "./components/ui/sonner";
// Legacy financial implementation files remain in Git/source for design history;
// active routes expose read-only proposals, never alternate posting paths.
export default function App() {
  useEffect(() => {
    initGhostSync();
  }, []);
  return (
    <>
      <PresentationShell>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <div className="section-heading">
                  <h2>Service close to the community</h2>
                  <p>
                    Explore agent workflows, offline resilience and the proposed
                    rural service portfolio.
                  </p>
                </div>
                <div className="product-grid">
                  <InventoryDemo />
                  <LiquidityDemo />
                </div>
                <section className="product-card">
                  <CapabilityBadge state="IMPLEMENTED" />
                  <h2>Operations & reconciliation</h2>
                  <p>
                    Governed ArifPay sandbox status checks for supervisor/admin
                    operations. Gateway confirmation remains separate from PartnerFI
                    settlement.
                  </p>
                  <Link to="/operations" className="text-link">
                    Open Operations & Reconciliation Center
                  </Link>
                </section>
                <ServicePortfolio />
              </>
            }
          />
          <Route path="/kiosk" element={<AgentKiosk />} />
          <Route path="/farmer-360" element={<Farmer360 />} />
          <Route path="/queue" element={<GhostSyncQueue />} />
          <Route path="/onboard" element={<OnboardAgent />} />
          <Route path="/supervisor" element={<SupervisorPortal />} />
          <Route path="/operations" element={<OperationsReconciliation />} />
          <Route path="/data-mule" element={<DataMule />} />
          <Route path="/transcription" element={<LiveTranscription />} />
          <Route path="/node-status" element={<DemoArchitecture />} />
          <Route path="/judge-ticker" element={<DemoArchitecture />} />
          <Route path="/inventory" element={<InventoryDemo />} />
          <Route
            path="/academy"
            element={
              <div className="product-grid">
                <TrainingDemo />
                <OnboardingWalkthrough />
              </div>
            }
          />
          <Route
            path="/ardi-engine"
            element={
              <section className="rounded-xl p-4 bg-slate-950">
                <CapabilityBadge state="SYNTHETIC DEMO" />
                <p className="text-slate-200 p-4">
                  Arithmetic scoring illustration only. No AI provider, credit
                  decision or entitlement.
                </p>
                <ArdiEngine />
              </section>
            }
          />
          {[
            "swaps",
            "fmcg-liquidity",
            "kentiq-payg",
            "smartcycle",
            "bank-racing",
            "psnp-plus",
            "securitization",
            "agri-connect",
            "agritrust",
            "governance",
            "sandbox",
            "audit",
          ].map((path) => (
            <Route
              key={path}
              path={"/" + path}
              element={<ServicePortfolio />}
            />
          ))}
          <Route
            path="*"
            element={
              <section className="product-card">
                <h2>Module not found</h2>
                <p>Choose a prototype module from the navigation.</p>
              </section>
            }
          />
        </Routes>
      </PresentationShell>
      <Toaster position="top-right" />
    </>
  );
}
