import React, { useState, useEffect } from 'react';
import { 
  Wifi, BatteryFull, Signal, Radar, Users, UserPlus, FileText, 
  Box, GraduationCap, ArrowRight, CheckCircle2, AlertTriangle,
  Smartphone, Activity, Landmark, ShieldCheck, Bluetooth, MapPin, Fingerprint,
  Truck, Map, Network, Zap, Lock, Unlock, Clock, RefreshCw,
  PackageOpen, Coins
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import DataMuleGraph from '../components/DataMuleGraph';

export default function SupervisorPortal() {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [activeView, setActiveView] = useState<'DASHBOARD' | 'ONBOARD' | 'MESH_SYNC' | 'FLEET' | 'INVENTORY'>('DASHBOARD');
  
  // Mesh Sync State
  const [meshState, setMeshState] = useState<'idle' | 'broadcasting' | 'syncing' | 'complete'>('idle');
  const [syncedAgents, setSyncedAgents] = useState<any[]>([]);

  // Onboarding State
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardData, setOnboardData] = useState({ fayda: '', tin: '', posSerial: '' });

  // Terminal Lock State
  const [lockedAgents, setLockedAgents] = useState<Record<string, boolean>>({});
  
  // Detailed Agent Profile State
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Fleet State
  const [agentsList, setAgentsList] = useState<any[]>([
    // Fallbacks just in case API is slow
    { id: 'AGT-842', name: 'Zinash K.', phone: '+251 911 234567', location: 'Adama Hub', transactions: 142, volume: '45,000', float: '12,500', ardiScore: 92, lastSync: '2m ago', syncStatus: 'ONLINE', lat: 8.5414, lng: 39.2689 },
    { id: 'AGT-109', name: 'Bekele T.', phone: '+251 922 345678', location: 'Modjo Rural', transactions: 89, volume: '28,300', float: '5,000', ardiScore: 78, lastSync: '14h ago', syncStatus: 'OFFLINE_PENDING', lat: 8.5885, lng: 39.1216 },
    { id: 'AGT-993', name: 'Alemu M.', phone: '+251 933 456789', location: 'Bishoftu Market', transactions: 210, volume: '88,000', float: '32,000', ardiScore: 95, lastSync: 'Just now', syncStatus: 'SYNCING', lat: 8.7516, lng: 38.9774 },
    { id: 'AGT-445', name: 'Chala D.', phone: '+251 944 567890', location: 'Dukem East', transactions: 34, volume: '9,200', float: '1,500', ardiScore: 65, lastSync: '2d ago', syncStatus: 'FAILED', lat: 8.8037, lng: 38.9044 },
    { id: 'AGT-772', name: 'Hirut A.', phone: '+251 955 678901', location: 'Meki South', transactions: 67, volume: '18,400', float: '4,200', ardiScore: 81, lastSync: '5m ago', syncStatus: 'ONLINE', lat: 8.1500, lng: 38.8167 },
  ]);

  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          setAgentsList(data);
        }
      })
      .catch(err => console.error("Could not fetch agents", err));
  }, []);

  const handleLockToggle = (agentId: string) => {
    setLockedAgents(prev => {
      const isLocked = !prev[agentId];
      if (isLocked) {
        toast.error(`Terminal LOCKED for ${agentId}. Supervision clearance required.`, { id: `lock-${agentId}` });
      } else {
        toast.success(`Terminal UNLOCKED for ${agentId}.`, { id: `lock-${agentId}` });
      }
      return { ...prev, [agentId]: isLocked };
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAgents = agentsList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(agentsList.length / itemsPerPage);

  const triggerMeshSync = () => {
    setMeshState('broadcasting');
    toast.loading("Activating Wi-Fi Direct & BLE Mesh Subsystem...", { id: 'mesh' });
    
    setTimeout(() => {
      toast.success("GhostSync Hotspot Live (SSID: SOV-MULE-ADAMA)", { id: 'mesh' });
      setMeshState('syncing');
      
      // Simulate discovering and syncing with offline agents
      setTimeout(() => setSyncedAgents(p => [...p, { id: 'AGT-842', name: 'Zinash K.', tx: 42, bytes: '1.2MB' }]), 1500);
      setTimeout(() => setSyncedAgents(p => [...p, { id: 'AGT-109', name: 'Bekele T.', tx: 18, bytes: '0.8MB' }]), 3500);
      setTimeout(() => setSyncedAgents(p => [...p, { id: 'AGT-993', name: 'Alemu M.', tx: 7, bytes: '0.3MB' }]), 5000);
      
      setTimeout(() => {
        setMeshState('complete');
        toast.success("Mesh Sync Complete. 67 Offline ledgers securely buffered.", { id: 'mesh' });
      }, 7000);
    }, 2000);
  };

  const handleOnboardSubmit = () => {
    toast.loading("Provisioning Sub-Agent Credentials on Sovereign Switch...", { id: 'onboard' });
    setTimeout(() => {
      toast.success("Agent Provisioned Successfully! Fayda, TIN, and POS locked to Root Identity.", { id: 'onboard' });
      setOnboardStep(1);
      setOnboardData({ fayda: '', tin: '', posSerial: '' });
      setActiveView('DASHBOARD');
    }, 3000);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white font-sans flex flex-col overflow-hidden select-none">
      {/* Android Status Bar */}
      <div className="h-8 bg-black w-full flex justify-between items-center px-4 text-[10px] text-slate-400 font-medium tracking-wide">
        <div className="flex items-center space-x-2">
          <span>{time}</span>
          <Signal className="w-3 h-3" />
          <span>Safaricom ET (Super)</span>
        </div>
        <div className="flex items-center space-x-3">
          <Bluetooth className="w-3 h-3 text-indigo-500" />
          <Wifi className="w-3 h-3 text-indigo-500" />
          <BatteryFull className="w-4 h-4 text-emerald-500" />
        </div>
      </div>

      {/* App Header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-black uppercase tracking-widest text-indigo-400 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2 text-indigo-500" />
            Super Agent Hub
          </h1>
          <p className="text-xs text-slate-400 font-bold tracking-widest mt-1">Modjo Command / Node 04</p>
        </div>
        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Master Float</p>
          <p className="text-xl font-black text-white leading-none">250,000 <span className="text-xs text-slate-400">ETB</span></p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-950 relative">
        
        {/* === DASHBOARD VIEW === */}
        {activeView === 'DASHBOARD' && (
          <div className="p-6 space-y-6 max-w-4xl mx-auto pb-24">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-indigo-600 border-none shadow-lg text-white">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Activity className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-4xl font-black">12</p>
                  <p className="text-xs uppercase font-bold tracking-widest opacity-80">Active Agents</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800 text-white">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-blue-500/10 rounded-bl-2xl">
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center">
                        <Truck className="w-3 h-3 mr-1" /> P2G Active
                     </span>
                  </div>
                  <PackageOpen className="w-8 h-8 mb-2 text-blue-500" />
                  <p className="text-4xl font-black">4</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">School Feeding Hubs</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-indigo-500/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.1)] col-span-2 md:col-span-1">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Coins className="w-8 h-8 mb-2 text-indigo-400" />
                  <p className="text-3xl font-black text-indigo-300">14.2<span className="text-sm">k</span></p>
                  <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-widest">Network Commissions</p>
                  <p className="text-[9px] text-slate-500 font-mono mt-1">+125 ETB (30 mins)</p>
                </CardContent>
              </Card>
            </div>

            <h3 className="text-sm font-bold tracking-widest uppercase text-slate-500 mt-8 mb-4">Command Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => setActiveView('MESH_SYNC')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-colors shadow-lg active:scale-95">
                <div className="bg-blue-500/20 p-4 rounded-full mb-4">
                  <Radar className="w-8 h-8 text-blue-500" />
                </div>
                <span className="font-black text-sm uppercase tracking-wider text-white">Data Mule Sync</span>
                <span className="text-[10px] text-slate-500 mt-2">Buffer offline ledgers</span>
              </button>

              <button onClick={() => setActiveView('ONBOARD')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-colors shadow-lg active:scale-95">
                <div className="bg-emerald-500/20 p-4 rounded-full mb-4">
                  <UserPlus className="w-8 h-8 text-emerald-500" />
                </div>
                <span className="font-black text-sm uppercase tracking-wider text-white">Onboard Agent</span>
                <span className="text-[10px] text-slate-500 mt-2">Hardware & KYC</span>
              </button>

              <button onClick={() => setActiveView('FLEET')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-colors shadow-lg active:scale-95">
                <div className="bg-orange-500/20 p-4 rounded-full mb-4">
                  <Users className="w-8 h-8 text-orange-500" />
                </div>
                <span className="font-black text-sm uppercase tracking-wider text-white">Fleet Mgmt</span>
                <span className="text-[10px] text-slate-500 mt-2">Float & Performance</span>
              </button>

              <button onClick={() => setActiveView('INVENTORY')} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-colors shadow-lg active:scale-95">
                <div className="bg-teal-500/20 p-4 rounded-full mb-4">
                  <Truck className="w-8 h-8 text-teal-500" />
                </div>
                <span className="font-black text-sm uppercase tracking-wider text-white">Inventory</span>
                <span className="text-[10px] text-slate-500 mt-2">Stock & Dispatch</span>
              </button>
            </div>
            
            <Card className="bg-slate-900 border-slate-800 mt-6 overflow-hidden">
               <div className="bg-gradient-to-r from-red-600/20 to-transparent p-4 border-b border-slate-800">
                  <div className="flex items-center text-red-500 font-black uppercase tracking-widest text-xs mb-1">
                     <AlertTriangle className="w-4 h-4 mr-2" />
                     Priority 3 Liquidity Recovery Detected
                  </div>
                  <p className="text-white text-sm">Asset-Light Logistics: FMCG Virtual ATM Swap Required</p>
               </div>
               <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                     <div className="flex items-center mb-2">
                        <MapPin className="w-5 h-5 text-indigo-400 mr-2" />
                        <span className="text-white font-bold text-sm">Adama Hub (Agent 10045)</span>
                     </div>
                     <p className="text-slate-500 text-xs pl-7 mb-1">Target Match: BGI Distribution Truck</p>
                     <p className="text-emerald-500 text-xs pl-7 font-mono font-bold">12km away (ETA 22 min)</p>
                  </div>
                  <div className="flex items-center justify-between bg-black/40 rounded-xl p-3 border border-slate-800">
                     <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Swap Ledger Target</p>
                        <p className="text-xl font-black text-white">45,000 <span className="text-xs text-slate-500">ETB</span></p>
                     </div>
                     <button 
                        onClick={() => toast.success("Coordination Initiated. Routing details and GhostSync handshakes sent to BGI Truck.", { icon: <Truck className="w-4 h-4" /> })}
                        className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all p-3 rounded-lg flex items-center justify-center text-white"
                     >
                        <Truck className="w-5 h-5" />
                     </button>
                  </div>
               </CardContent>
            </Card>

            <h3 className="text-sm font-bold tracking-widest uppercase text-slate-500 mt-8 mb-4">Financial Summaries (Top Agents)</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
               {agentsList.slice(0, 3).map(agent => (
                 <Card key={agent.id} className="bg-slate-900 border-slate-800 transition-colors hover:border-slate-700">
                    <CardContent className="p-5">
                       <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
                          <div>
                            <h4 className="font-bold text-white text-lg">{agent.name}</h4>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">{agent.location}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-xs font-black text-emerald-500 mb-1">Float: {agent.float}</div>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Volume (ETB)</p>
                             <p className="text-lg font-black text-slate-200">{agent.volume}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total TX</p>
                             <p className="text-lg font-black text-slate-200">{agent.transactions}</p>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
               ))}
            </div>
          </div>
        )}

        {/* === MESH SYNC (DATA MULE) VIEW === */}
        {activeView === 'MESH_SYNC' && (
          <div className="p-6 h-full flex flex-col max-w-6xl mx-auto pb-24">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest">GhostSync Hub</h2>
              <p className="text-slate-400 mt-2 text-sm">Activate local Hotspot/BLE mesh to harvest cryptographic ledgers from offline rural agents.</p>
            </div>
            
            {/* Real-time D3 Mesh Sync proximity link graph */}
            <div className="bg-slate-900/50 p-2 border border-slate-800 rounded-3xl mb-6">
              <DataMuleGraph />
            </div>

            {/* GhostSync hardware triggers and state trackers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-sm font-black text-[#6366f1] uppercase tracking-widest mb-3">Sovereign Bluetooth Broadcast</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Activating BLE and Wi-Fi Direct beacons sends localized heartbeat signals to nearby data mules and offline merchants, allowing automated background reconciliation hooks.
                </p>
                
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={meshState === 'idle' ? triggerMeshSync : undefined}
                    disabled={meshState !== 'idle'}
                    className={`flex-1 py-4 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      meshState === 'idle' 
                        ? 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white active:scale-95 cursor-pointer' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {meshState === 'idle' ? 'Initiate Broadcaster' : 'Broadcaster Active'}
                  </button>
                  
                  {meshState !== 'idle' && (
                    <button 
                      onClick={() => { setMeshState('idle'); setSyncedAgents([]); }}
                      className="px-6 py-4 bg-red-600 hover:bg-red-500 text-white border border-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 cursor-pointer"
                    >
                      Kill Hotspot
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-3">Sync Event Feed</h3>
                  {syncedAgents.length === 0 ? (
                    <p className="text-slate-500 text-xs font-mono">Listening on local 2.4GHz socket...</p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {syncedAgents.map((agent, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs font-mono">
                          <span className="text-slate-300 font-sans font-bold">{agent.name}</span>
                          <span className="text-emerald-400 font-bold">+{agent.tx} TX ({agent.bytes})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">GHOSTSYNC STATUS: {meshState.toUpperCase()}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === ONBOARD AGENT VIEW === */}
        {activeView === 'ONBOARD' && (
          <div className="p-6 max-w-2xl mx-auto pb-24">
            <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">Agent Provisioning</h2>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 relative">
               <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 z-0">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((onboardStep - 1) / 3) * 100}%` }} />
               </div>
               {[1, 2, 3, 4].map(step => (
                  <div key={step} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-colors ${
                     onboardStep >= step ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}>
                     {step}
                  </div>
               ))}
            </div>

            <Card className="bg-slate-900 border-slate-800 w-full mb-6 relative overflow-hidden">
               <CardContent className="p-6 space-y-6 relative z-10">
                  
                  {/* Step 1: Fayda Identity */}
                  {onboardStep === 1 && (
                     <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center mb-6">
                           <div className="bg-indigo-500/20 p-3 rounded-xl mr-4"><Fingerprint className="w-6 h-6 text-indigo-400" /></div>
                           <div>
                              <h3 className="text-lg font-black text-white">Trust Root Identity</h3>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Fayda Zero-Knowledge Probe</p>
                           </div>
                        </div>
                        <input type="text" placeholder="Enter Fayda ID or Scan Thumbprint" value={onboardData.fayda} onChange={e => setOnboardData({...onboardData, fayda: e.target.value})} className="w-full bg-slate-950 border border-slate-800 py-4 px-4 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                     </div>
                  )}

                  {/* Step 2: Commercial TIN */}
                  {onboardStep === 2 && (
                     <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center mb-6">
                           <div className="bg-blue-500/20 p-3 rounded-xl mr-4"><FileText className="w-6 h-6 text-blue-400" /></div>
                           <div>
                              <h3 className="text-lg font-black text-white">Business Compliance</h3>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">TIN & Trade License Capture</p>
                           </div>
                        </div>
                        <input type="text" placeholder="Tax Identification Number (TIN)" value={onboardData.tin} onChange={e => setOnboardData({...onboardData, tin: e.target.value})} className="w-full bg-slate-950 border border-slate-800 py-4 px-4 rounded-xl text-white font-mono text-lg focus:outline-none focus:border-blue-500 transition-colors mb-4" />
                        <button className="w-full py-6 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 flex flex-col items-center justify-center transition-colors bg-slate-950/50">
                           <Smartphone className="w-8 h-8 mb-2 opacity-50" />
                           <span className="font-bold text-sm">Scan Trade License Document</span>
                        </button>
                     </div>
                  )}

                  {/* Step 3: Hardware Assignment */}
                  {onboardStep === 3 && (
                     <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center mb-6">
                           <div className="bg-orange-500/20 p-3 rounded-xl mr-4"><Box className="w-6 h-6 text-orange-400" /></div>
                           <div>
                              <h3 className="text-lg font-black text-white">Hardware Assignment</h3>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">POS Terminal & Printer Mating</p>
                           </div>
                        </div>
                        <input type="text" placeholder="Scan Terminal Serial Barcode" value={onboardData.posSerial} onChange={e => setOnboardData({...onboardData, posSerial: e.target.value})} className="w-full bg-slate-950 border border-slate-800 py-4 px-4 rounded-xl text-white font-mono text-lg mb-4 focus:outline-none focus:border-orange-500" />
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                           <div>
                              <p className="text-white font-bold">Thermal Printer (MPT-II)</p>
                              <p className="text-xs text-slate-500 font-mono">MAC: Pending Bind</p>
                           </div>
                           <button className="px-4 py-2 bg-slate-800 text-xs font-bold text-white rounded-lg uppercase">Bind BLE</button>
                        </div>
                     </div>
                  )}

                  {/* Step 4: Training & Finalize */}
                  {onboardStep === 4 && (
                     <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center mb-6">
                           <div className="bg-emerald-500/20 p-3 rounded-xl mr-4"><GraduationCap className="w-6 h-6 text-emerald-400" /></div>
                           <div>
                              <h3 className="text-lg font-black text-white">Academy Sign-off</h3>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Confirm LMS Completion</p>
                           </div>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                           <div className="flex items-center bg-slate-950 p-3 border border-slate-800 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                              <span className="text-sm font-bold text-slate-300">GhostSync Operations Configured</span>
                           </div>
                           <div className="flex items-center bg-slate-950 p-3 border border-slate-800 rounded-lg">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                              <span className="text-sm font-bold text-slate-300">SmartCycle Equb Matrix Initialized</span>
                           </div>
                           <div className="flex items-center bg-slate-950 p-3 border border-emerald-900 rounded-lg">
                              <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" />
                              <span className="text-sm font-bold text-emerald-400">Agent Handover Ready</span>
                           </div>
                        </div>

                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-xl text-center">
                           <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mb-1">Cryptographic Binding</p>
                           <p className="text-[10px] text-slate-400">Minting Sub-Agent keys on Sovereign Registry...</p>
                        </div>
                     </div>
                  )}
               </CardContent>
            </Card>

            <div className="flex justify-between">
               {onboardStep > 1 ? (
                  <button onClick={() => setOnboardStep(p => p - 1)} className="px-6 py-4 bg-slate-800 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors">Back</button>
               ) : <div></div>}
               
               {onboardStep < 4 ? (
                  <button onClick={() => setOnboardStep(p => p + 1)} className="px-8 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-colors flex items-center">Next <ArrowRight className="w-5 h-5 ml-2" /></button>
               ) : (
                  <button onClick={handleOnboardSubmit} className="px-8 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 transition-colors flex items-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">Activate Agent</button>
               )}
            </div>
          </div>
        )}

        {/* === FLEET MANAGEMENT VIEW === */}
        {activeView === 'FLEET' && (
          <div className="p-6 max-w-6xl mx-auto pb-24">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-widest">Fleet Management</h2>
              <p className="text-slate-400 mt-2 text-sm">Agent profiles, metrics, and remote supervision.</p>
            </div>
            
            {/* MAP VIEW */}
            <Card className="bg-slate-900 border-slate-800 mb-8 overflow-hidden relative min-h-[300px]">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at center, #6366f1 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                backgroundPosition: 'center center'
              }}></div>
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Radar className="w-64 h-64 text-indigo-500 animate-[spin_10s_linear_infinite]" />
              </div>
              <CardContent className="p-6 relative z-10 h-full w-full">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  <Map className="w-4 h-4 mr-2" />
                  Live Agent Telemetry
                </h3>
                
                <div className="relative w-full h-[250px] bg-slate-950/50 rounded-xl border border-slate-800 backdrop-blur-sm overflow-hidden">
                  {/* Map Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between py-4 opacity-10">
                    <div className="w-full border-t border-indigo-400"></div>
                    <div className="w-full border-t border-indigo-400"></div>
                    <div className="w-full border-t border-indigo-400"></div>
                  </div>
                  <div className="absolute inset-0 flex justify-between px-4 opacity-10">
                    <div className="h-full border-l border-indigo-400"></div>
                    <div className="h-full border-l border-indigo-400"></div>
                    <div className="h-full border-l border-indigo-400"></div>
                  </div>
                  
                  {/* Agents Plotting */}
                  {agentsList.map(agent => {
                    // Normalize Bounds: Lat 8.0-9.0, Lng 38.5-39.5
                    const xPercent = ((agent.lng - 38.5) / (39.5 - 38.5)) * 100;
                    const yPercent = ((9.0 - agent.lat) / (9.0 - 8.0)) * 100;
                    
                    const isOnline = agent.syncStatus === 'ONLINE';
                    const isSyncing = agent.syncStatus === 'SYNCING';
                    
                    const statusColor = isOnline ? 'bg-emerald-500' : isSyncing ? 'bg-yellow-500' : 'bg-red-500';
                    const pulseColor = isOnline ? 'bg-emerald-500' : isSyncing ? 'bg-yellow-500' : 'bg-red-500';

                    return (
                      <div 
                        key={`map-${agent.id}`}
                        onClick={() => setSelectedAgent(agent)}
                        className="absolute group transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 z-10"
                        style={{ left: `${Math.max(5, Math.min(95, xPercent))}%`, top: `${Math.max(5, Math.min(95, yPercent))}%` }}
                      >
                        <div className="relative flex items-center justify-center">
                          {/* Marker Blip */}
                          <div className={`absolute w-3 h-3 rounded-full ${statusColor} z-10`}></div>
                          {(isOnline || isSyncing) && (
                             <div className={`absolute w-8 h-8 rounded-full ${pulseColor} opacity-20 animate-ping`}></div>
                          )}
                          <div className="absolute w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-700 shadow-xl opacity-80"></div>
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max px-3 py-2 bg-slate-800 border border-slate-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                          <p className="font-bold flex items-center gap-1.5 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`}></span>
                            {agent.name} <span className="text-slate-400 font-mono text-[10px]">({agent.id})</span>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{agent.location}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AGENT CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {currentAgents.map(agent => (
                <Card key={`card-${agent.id}`} onClick={() => setSelectedAgent(agent)} className="bg-slate-900 border-slate-800 p-5 flex flex-col justify-between hover:bg-slate-800/80 cursor-pointer transition-colors">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-lg leading-tight">{agent.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{agent.id}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-slate-300 bg-black/20 p-2 rounded-lg">
                      <Smartphone className="w-4 h-4 mr-3 text-slate-500" />
                      <span className="font-medium">{agent.phone}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-300 bg-black/20 p-2 rounded-lg">
                      <MapPin className="w-4 h-4 mr-3 text-slate-500" />
                      <span className="font-medium truncate">{agent.location}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider">Agent</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Last Sync</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Status</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Txns</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Volume (ETB)</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Current Float</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Ardi Score</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-xs tracking-wider text-right">Remote Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentAgents.map((agent) => (
                      <TableRow key={agent.id} onClick={() => setSelectedAgent(agent)} className="border-slate-800 hover:bg-slate-800/50 cursor-pointer text-white whitespace-nowrap">
                        <TableCell>
                          <div className="font-bold">{agent.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{agent.id}</div>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex items-center justify-end text-xs text-slate-400">
                             <Clock className="w-3 h-3 mr-1.5 opacity-70" />
                             {agent.lastSync}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                            agent.syncStatus === 'ONLINE' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                            agent.syncStatus === 'SYNCING' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' :
                            'bg-red-500/10 border border-red-500/20 text-red-400'
                          }`}>
                            {agent.syncStatus === 'SYNCING' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                            {agent.syncStatus === 'ONLINE' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></div>}
                            {(agent.syncStatus === 'OFFLINE_PENDING' || agent.syncStatus === 'FAILED') && <div className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></div>}
                            {agent.syncStatus === 'OFFLINE_PENDING' ? 'OFFLINE' : agent.syncStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{agent.transactions}</TableCell>
                        <TableCell className="text-right font-medium">{agent.volume}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-400">{agent.float}</TableCell>
                        <TableCell className="text-right">
                          <span className={`px-2 py-1 rounded font-bold text-xs ${
                            agent.ardiScore >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                            agent.ardiScore >= 80 ? 'bg-indigo-500/20 text-indigo-400' :
                            agent.ardiScore >= 70 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {agent.ardiScore}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleLockToggle(agent.id); }}
                             className={`p-2 rounded-lg transition-colors border ${lockedAgents[agent.id] ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'}`}
                             title={lockedAgents[agent.id] ? "Unlock Terminal" : "Lock Terminal"}
                           >
                              {lockedAgents[agent.id] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                           </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
                 <div className="flex space-x-2">
                   <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-slate-800 rounded bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                   >
                      Prev
                   </button>
                   <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-slate-800 rounded bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                   >
                      Next
                   </button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* === INVENTORY VIEW === */}
        {activeView === 'INVENTORY' && (
          <div className="p-6 space-y-6 max-w-6xl mx-auto pb-24">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center">
                   <Truck className="w-6 h-6 mr-3 text-teal-500" /> Super Agent Inventory Network
                </h2>
                <p className="text-slate-400 mt-2">Oversee local hub limits and agent restock flows</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Adama Hub (Super Agent)</p>
                     <div className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-1 rounded">Active</div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-6">Zinash K.</h3>
                  <div className="space-y-4">
                     <div>
                       <div className="flex justify-between text-xs font-medium text-slate-300 mb-1"><span>NPS Fertilizer</span> <span>450/500</span></div>
                       <Progress value={90} className="h-1.5 [&>div]:bg-teal-500 bg-slate-800" />
                     </div>
                     <div>
                       <div className="flex justify-between text-xs font-medium text-slate-300 mb-1"><span>Urea Fertilizer</span> <span>320/400</span></div>
                       <Progress value={80} className="h-1.5 [&>div]:bg-teal-500 bg-slate-800" />
                     </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Modjo Dist (Super Agent)</p>
                     <div className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase px-2 py-1 rounded">Active</div>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-6">Alamo Dist.</h3>
                  <div className="space-y-4">
                     <div>
                       <div className="flex justify-between text-xs font-medium text-slate-300 mb-1"><span>NPS Fertilizer</span> <span>120/500</span></div>
                       <Progress value={24} className="h-1.5 [&>div]:bg-teal-500 bg-slate-800" />
                     </div>
                     <div>
                       <div className="flex justify-between text-xs font-medium text-slate-300 mb-1"><span>Urea Fertilizer</span> <span>90/400</span></div>
                       <Progress value={22} className="h-1.5 [&>div]:bg-teal-500 bg-slate-800" />
                     </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <h3 className="text-sm font-bold tracking-widest uppercase text-slate-500 mt-8 mb-4">Pending Last-Mile Restocks</h3>
            <Card className="bg-slate-900 border-slate-800 w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Req ID</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Requesting Agent</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Item & Qty</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Routing Hub</TableHead>
                    <TableHead className="text-slate-400 font-bold uppercase tracking-widest text-[10px] text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-slate-300">REQ-881</TableCell>
                    <TableCell className="font-medium">Agent M. (Bishoftu)</TableCell>
                    <TableCell className="text-teal-400 font-bold">50x NPS Fertilizer</TableCell>
                    <TableCell className="text-slate-400">Adama Hub</TableCell>
                    <TableCell className="text-right">
                       <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-1 uppercase tracking-widest font-black rounded-md">Pending Mule</span>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-slate-300">REQ-882</TableCell>
                    <TableCell className="font-medium">Agent T. (Dukem)</TableCell>
                    <TableCell className="text-teal-400 font-bold">20x Teff Seed</TableCell>
                    <TableCell className="text-slate-400">Modjo Dist</TableCell>
                    <TableCell className="text-right">
                       <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-1 uppercase tracking-widest font-black rounded-md">Pending Mule</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 px-6 py-3 pb-safe z-50">
         <div className="flex justify-between w-full max-w-lg mx-auto">
            <button onClick={() => setActiveView('DASHBOARD')} className={`flex flex-col items-center justify-center space-y-1 ${activeView === 'DASHBOARD' ? 'text-indigo-400' : 'text-slate-500'}`}>
               <Activity className="w-6 h-6" />
               <span className="text-[9px] font-black uppercase tracking-widest">Dash</span>
            </button>
            <button onClick={() => setActiveView('MESH_SYNC')} className={`flex flex-col items-center justify-center space-y-1 ${activeView === 'MESH_SYNC' ? 'text-indigo-400' : 'text-slate-500'}`}>
               <Radar className="w-6 h-6" />
               <span className="text-[9px] font-black uppercase tracking-widest">Sync</span>
            </button>
            <button onClick={() => setActiveView('ONBOARD')} className={`flex flex-col items-center justify-center space-y-1 ${activeView === 'ONBOARD' ? 'text-indigo-400' : 'text-slate-500'}`}>
               <UserPlus className="w-6 h-6" />
               <span className="text-[9px] font-black uppercase tracking-widest">Onboard</span>
            </button>
            <button onClick={() => setActiveView('FLEET')} className={`flex flex-col items-center justify-center space-y-1 ${activeView === 'FLEET' ? 'text-indigo-400' : 'text-slate-500'}`}>
               <Users className="w-6 h-6" />
               <span className="text-[9px] font-black uppercase tracking-widest">Fleet</span>
            </button>
            <button onClick={() => setActiveView('INVENTORY')} className={`flex flex-col items-center justify-center space-y-1 ${activeView === 'INVENTORY' ? 'text-teal-400' : 'text-slate-500'}`}>
               <Truck className="w-6 h-6" />
               <span className="text-[9px] font-black uppercase tracking-widest">Inv.</span>
            </button>
         </div>
      </nav>

      {/* Agent Performance Modal */}
      {selectedAgent && (
         <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col">
               <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-400" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-white leading-tight">{selectedAgent.name}</h2>
                        <p className="text-xs font-mono text-slate-400">{selectedAgent.id} • {selectedAgent.location}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedAgent(null)} className="text-slate-400 hover:text-white transition-colors">
                     <Activity className="w-8 h-8 rotate-45 transform" />
                  </button>
               </div>
               
               <div className="p-6 space-y-6 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Ardi Score</p>
                        <p className={`text-2xl font-black ${selectedAgent.ardiScore >= 80 ? 'text-emerald-400' : 'text-orange-400'}`}>{selectedAgent.ardiScore}</p>
                     </div>
                     <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Status</p>
                        <p className={`text-sm font-black mt-2 inline-flex px-2 py-1 rounded ${selectedAgent.syncStatus === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>{selectedAgent.syncStatus}</p>
                     </div>
                     <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Last Sync</p>
                        <p className="text-sm font-bold text-slate-300 mt-2">{selectedAgent.lastSync}</p>
                     </div>
                     <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Network</p>
                        <p className="text-sm font-bold text-slate-300 mt-2 flex items-center"><Wifi className="w-4 h-4 mr-1 text-slate-500" /> Edge</p>
                     </div>
                  </div>

                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6">
                     <h3 className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-4">Financial Summary</h3>
                     <div className="grid grid-cols-3 gap-4">
                        <div>
                           <p className="text-sm text-indigo-300 mb-1">Transactions</p>
                           <p className="text-2xl font-black text-white">{selectedAgent.transactions}</p>
                        </div>
                        <div>
                           <p className="text-sm text-indigo-300 mb-1">Volume</p>
                           <p className="text-2xl font-black text-white">{selectedAgent.volume}</p>
                        </div>
                        <div>
                           <p className="text-sm text-indigo-300 mb-1">Agri-Float</p>
                           <p className="text-2xl font-black text-emerald-400">{selectedAgent.float}</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button
                        onClick={() => handleLockToggle(selectedAgent.id)}
                        className={`flex-1 py-4 flex justify-center items-center font-bold uppercase tracking-widest text-sm rounded-xl transition-colors ${lockedAgents[selectedAgent.id] ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                     >
                        {lockedAgents[selectedAgent.id] ? <><Lock className="w-5 h-5 mr-2" /> Unlock Terminal</> : <><Unlock className="w-5 h-5 mr-2" /> Lock Terminal</>}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
