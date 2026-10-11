import { Routes, Route, Outlet } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { useEffect } from 'react';
import { initGhostSync } from './lib/ghostsync';
import Dashboard from './pages/Dashboard';
import OnboardAgent from './pages/OnboardAgent';
import SwapsLiquidity from './pages/SwapsLiquidity';
import GhostSyncQueue from './pages/GhostSyncQueue';
import AuditCompliance from './pages/AuditCompliance';
import SovereignNodeStatus from './pages/SovereignNode';
import JudgeTicker from './pages/JudgeTicker';
import FmcgLiquidity from './pages/FmcgLiquidity';
import DataMule from './pages/DataMule';
import KentiqPayg from './pages/KentiqPayg';
import PsnpPlus from './pages/PsnpPlus';
import Securitization from './pages/Securitization';
import AgriConnect from './pages/AgriConnect';
import SmartCycleEqub from './pages/SmartCycle';
import AgriTrustInsurance from './pages/AgriTrustInsurance';
import GovernanceCouncil from './pages/GovernanceCouncil';
import AgentLms from './pages/AgentLms';
import AgentKiosk from './pages/AgentKiosk';
import Farmer360 from './pages/Farmer360';
import SupervisorPortal from './pages/SupervisorPortal';
import InventoryManagement from './pages/InventoryManagement';
import BankRacing from './pages/BankRacing';
import SettlementSandbox from './pages/SettlementSandbox';
import ArdiEngine from './pages/ArdiEngine';
import LiveTranscription from './pages/LiveTranscription';
import type { ReactNode } from 'react';
function LegacyIllustration({children}:{children:ReactNode}) { return <><p className="p-3 bg-amber-950 text-amber-100">Legacy synthetic illustration. Financial actions are disabled pending migration to customer/KYC and PartnerFI boundaries.</p><fieldset disabled>{children}</fieldset></>; }
import { Toaster } from './components/ui/sonner';

export default function App() {
  useEffect(() => {
    initGhostSync();
  }, []);

  return (
    <>
      <div role="note" className="p-3 bg-amber-950 text-amber-100 text-center">Prototype / Synthetic Demo — Wishland: technology provider. PartnerFI: future regulated principal. All financial and identity integrations are simulated; no production or pilot authorization.</div>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="onboard" element={<OnboardAgent />} />
          <Route path="academy" element={<AgentLms />} />
          <Route path="farmer-360" element={<Farmer360 />} />
          <Route path="swaps" element={<LegacyIllustration><SwapsLiquidity /></LegacyIllustration>} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="queue" element={<GhostSyncQueue />} />
          <Route path="audit" element={<LegacyIllustration><AuditCompliance /></LegacyIllustration>} />
          <Route path="node-status" element={<SovereignNodeStatus />} />
          <Route path="fmcg-liquidity" element={<LegacyIllustration><FmcgLiquidity /></LegacyIllustration>} />
          <Route path="data-mule" element={<LegacyIllustration><DataMule /></LegacyIllustration>} />
          <Route path="kentiq-payg" element={<LegacyIllustration><KentiqPayg /></LegacyIllustration>} />
          <Route path="smartcycle" element={<LegacyIllustration><SmartCycleEqub /></LegacyIllustration>} />
          <Route path="bank-racing" element={<LegacyIllustration><BankRacing /></LegacyIllustration>} />
          <Route path="psnp-plus" element={<LegacyIllustration><PsnpPlus /></LegacyIllustration>} />
          <Route path="securitization" element={<LegacyIllustration><Securitization /></LegacyIllustration>} />
          <Route path="agri-connect" element={<LegacyIllustration><AgriConnect /></LegacyIllustration>} />
          <Route path="agritrust" element={<LegacyIllustration><AgriTrustInsurance /></LegacyIllustration>} />
          <Route path="governance" element={<LegacyIllustration><GovernanceCouncil /></LegacyIllustration>} />
          <Route path="ardi-engine" element={<ArdiEngine />} />
          <Route path="sandbox" element={<LegacyIllustration><SettlementSandbox /></LegacyIllustration>} />
          <Route path="transcription" element={<LiveTranscription />} />
        </Route>
        {/* Cinematic Dashboards outside of AppLayout */}
        <Route path="/judge-ticker" element={<JudgeTicker />} />
        <Route path="/kiosk" element={<AgentKiosk />} />
        <Route path="/supervisor" element={<SupervisorPortal />} />
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
