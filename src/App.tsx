import { Routes, Route, Link } from "react-router-dom";
import { useEffect } from "react";
import { initGhostSync } from "./lib/ghostsync";
import {
  ServicePortfolio,
  InventoryDemo,
  LiquidityDemo,
  CapabilityBadge,
} from "./components/ProductPresentation";
import CapabilityWorkspaceShell from "./components/CapabilityWorkspaceShell";
import "./components/navigation-groups.css";
import AgentKiosk from "./pages/AgentKiosk";
import Farmer360 from "./pages/Farmer360";
import GhostSyncQueue from "./pages/GhostSyncQueue";
import OnboardAgent from "./pages/OnboardAgent";
import AgentLearning from "./pages/AgentLearning";
import SupervisorRegionalOperations from "./pages/SupervisorRegionalOperations";
import OperationsNetworkOperations from "./pages/OperationsNetworkOperations";
import NetworkOperationsAccess from "./pages/NetworkOperationsAccess";
import PartnerEcosystem from "./pages/PartnerEcosystem";
import NetworkLiquidity from "./pages/NetworkLiquidity";
import CashFleetPlanning from "./pages/CashFleetPlanning";
import FmcgCommerce from "./pages/FmcgCommerce";
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
      <CapabilityWorkspaceShell>
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
                <div className="product-grid">
                  <section className="product-card">
                    <CapabilityBadge state="IMPLEMENTED" />
                    <h2>Operations & reconciliation</h2>
                    <p>
                      Governed ArifPay sandbox status checks for bounded operations.
                      Gateway confirmation remains separate from PartnerFI settlement.
                    </p>
                    <Link to="/operations" className="text-link">
                      Open Operations & Reconciliation Center
                    </Link>
                  </section>
                  <section className="product-card" data-testid="network-operations-home-card">
                    <CapabilityBadge state="IMPLEMENTED" />
                    <h2>Network operations access</h2>
                    <p>
                      Stage 3 synthetic role/object scopes for Supervisor, Operations
                      and Partner Admin views. No cash movement, dispatch, PartnerFI
                      posting or settlement authority is created.
                    </p>
                    <Link to="/network-operations" className="text-link">
                      Review Network Operations Access
                    </Link>
                  </section>
                  <section className="product-card" data-testid="partner-ecosystem-home-card">
                    <CapabilityBadge state="SYNTHETIC DEMO" />
                    <h2>Partner ecosystem</h2>
                    <p>
                      Stage 3 read-only partner classes, capability switches and route
                      provenance. Code presence never becomes service authorization.
                    </p>
                    <Link to="/partners" className="text-link">
                      Open Partner Ecosystem Console
                    </Link>
                  </section>
                  <section className="product-card" data-testid="network-liquidity-home-card">
                    <CapabilityBadge state="SYNTHETIC DEMO" />
                    <h2>Network liquidity</h2>
                    <p>
                      Stage 3 NLC / Liquidity Coverage Index planning for 2H, 4H, 8H and
                      EOD horizons. Synthetic decision support only; not regulatory LCR.
                    </p>
                    <Link to="/liquidity" className="text-link">
                      Open Network Liquidity Console
                    </Link>
                  </section>
                  <section className="product-card" data-testid="cash-fleet-home-card">
                    <CapabilityBadge state="SYNTHETIC DEMO" />
                    <h2>Cash Fleet planning</h2>
                    <p>
                      Synthetic Cash Fleet and FMCG-route liquidity matching. Planning
                      capacity is hypothetical; no custody, dispatch, handover or cash
                      movement is authorized.
                    </p>
                    <Link to="/cash-fleet" className="text-link">
                      Open Cash Fleet Planning Console
                    </Link>
                  </section>
                  <section className="product-card" data-testid="fmcg-home-card">
                    <CapabilityBadge state="SYNTHETIC DEMO" />
                    <h2>FMCG inventory & logistics</h2>
                    <p>
                      Purpose-limited synthetic inventory, restock-draft and route
                      planning. No live order, dispatch or settlement is authorized.
                    </p>
                    <Link to="/fmcg" className="text-link">
                      Open FMCG Inventory & Logistics Console
                    </Link>
                  </section>
                </div>
                <ServicePortfolio />
              </>
            }
          />
          <Route path="/kiosk" element={<AgentKiosk />} />
          <Route path="/farmer-360" element={<Farmer360 />} />
          <Route path="/queue" element={<GhostSyncQueue />} />
          <Route path="/onboard" element={<OnboardAgent />} />
          <Route path="/academy" element={<AgentLearning />} />
          <Route path="/supervisor" element={<SupervisorRegionalOperations />} />
          <Route path="/operations" element={<OperationsNetworkOperations />} />
          <Route path="/network-operations" element={<NetworkOperationsAccess />} />
          <Route path="/partners" element={<PartnerEcosystem />} />
          <Route path="/liquidity" element={<NetworkLiquidity />} />
          <Route path="/cash-fleet" element={<CashFleetPlanning />} />
          <Route path="/fmcg" element={<FmcgCommerce />} />
          <Route path="/data-mule" element={<DataMule />} />
          <Route path="/transcription" element={<LiveTranscription />} />
          <Route path="/node-status" element={<DemoArchitecture />} />
          <Route path="/judge-ticker" element={<DemoArchitecture />} />
          <Route path="/inventory" element={<InventoryDemo />} />
          <Route path="/ardi-engine" element={<ArdiEngine />} />
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
      </CapabilityWorkspaceShell>
      <Toaster position="top-right" />
    </>
  );
}
