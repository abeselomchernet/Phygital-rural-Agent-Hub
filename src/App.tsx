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
import DemoPresenter from './components/DemoPresenter';
import { Toaster } from './components/ui/sonner';

export default function App() {
  useEffect(() => {
    initGhostSync();
  }, []);

  return (
    <>
      <DemoPresenter />
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="onboard" element={<OnboardAgent />} />
          <Route path="academy" element={<AgentLms />} />
          <Route path="farmer-360" element={<Farmer360 />} />
          <Route path="swaps" element={<SwapsLiquidity />} />
          <Route path="inventory" element={<InventoryManagement />} />
          <Route path="queue" element={<GhostSyncQueue />} />
          <Route path="audit" element={<AuditCompliance />} />
          <Route path="node-status" element={<SovereignNodeStatus />} />
          <Route path="fmcg-liquidity" element={<FmcgLiquidity />} />
          <Route path="data-mule" element={<DataMule />} />
          <Route path="kentiq-payg" element={<KentiqPayg />} />
          <Route path="smartcycle" element={<SmartCycleEqub />} />
          <Route path="bank-racing" element={<BankRacing />} />
          <Route path="psnp-plus" element={<PsnpPlus />} />
          <Route path="securitization" element={<Securitization />} />
          <Route path="agri-connect" element={<AgriConnect />} />
          <Route path="agritrust" element={<AgriTrustInsurance />} />
          <Route path="governance" element={<GovernanceCouncil />} />
          <Route path="ardi-engine" element={<ArdiEngine />} />
          <Route path="sandbox" element={<SettlementSandbox />} />
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
