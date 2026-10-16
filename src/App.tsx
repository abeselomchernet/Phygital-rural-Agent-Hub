import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { initGhostSync } from "./lib/ghostsync";
import { InventoryDemo } from "./components/ProductPresentation";
import CapabilityWorkspaceShell from "./components/CapabilityWorkspaceShell";
import "./components/navigation-groups.css";
import CapabilityHome from "./pages/CapabilityHome";
import HubOverview from "./pages/HubOverview";
import HubEconomics from "./pages/HubEconomics";
import PilotEvidence from "./pages/PilotEvidence";
import CorridorPlanning from "./pages/CorridorPlanning";
import OperatorDeviceReadiness from "./pages/OperatorDeviceReadiness";
import NeutralityGovernance from "./pages/NeutralityGovernance";
import OperationsEvidence from "./pages/OperationsEvidence";
import AgentKiosk from "./pages/AgentKiosk";
import Farmer360 from "./pages/Farmer360";
import GhostSyncQueue from "./pages/GhostSyncQueue";
import OnboardAgent from "./pages/OnboardAgent";
import AgentLearning from "./pages/AgentLearning";
import SupervisorRegionalOperations from "./pages/SupervisorRegionalOperations";
import OperationsNetworkOperations from "./pages/OperationsNetworkOperations";
import NetworkOperationsAccess from "./pages/NetworkOperationsAccess";
import PartnerEcosystem from "./pages/PartnerEcosystem";
import PartnerAdministration from "./pages/PartnerAdministration";
import NetworkLiquidity from "./pages/NetworkLiquidity";
import CashFleetPlanning from "./pages/CashFleetPlanning";
import FmcgCommerce from "./pages/FmcgCommerce";
import DataMule from "./pages/DataMule";
import LiveTranscription from "./pages/LiveTranscription";
import DemoArchitecture from "./pages/SovereignNode";
import ArdiEngine from "./pages/ArdiEngine";
import GuidedDemo from "./pages/GuidedDemo";
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
          <Route path="/" element={<CapabilityHome />} />
          <Route path="/hub" element={<HubOverview />} />
          <Route path="/hub/economics" element={<HubEconomics />} />
          <Route path="/hub/pilot-evidence" element={<PilotEvidence />} />
          <Route path="/hub/corridor-planning" element={<CorridorPlanning />} />
          <Route path="/hub/readiness" element={<OperatorDeviceReadiness />} />
          <Route path="/hub/neutrality" element={<NeutralityGovernance />} />
          <Route path="/operations/evidence" element={<OperationsEvidence />} />
          <Route path="/kiosk" element={<AgentKiosk />} />
          <Route path="/farmer-360" element={<Farmer360 />} />
          <Route path="/queue" element={<GhostSyncQueue />} />
          <Route path="/onboard" element={<OnboardAgent />} />
          <Route path="/academy" element={<AgentLearning />} />
          <Route path="/supervisor" element={<SupervisorRegionalOperations />} />
          <Route path="/operations" element={<OperationsNetworkOperations />} />
          <Route path="/network-operations" element={<NetworkOperationsAccess />} />
          <Route path="/partner-admin" element={<PartnerAdministration />} />
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
          <Route path="/guided-demo" element={<GuidedDemo />} />
          <Route
            path="*"
            element={
              <section className="product-card">
                <h2>Module not found</h2>
                <p>Choose a module from the active governed workspace.</p>
              </section>
            }
          />
        </Routes>
      </CapabilityWorkspaceShell>
      <Toaster position="top-right" />
    </>
  );
}
