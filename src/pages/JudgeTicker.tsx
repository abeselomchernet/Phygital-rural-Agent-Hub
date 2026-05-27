import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Server, QrCode, ShieldCheck, Database, Zap, Camera, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Tooltip } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Mock Data
const initialLCRData = [
  { time: '00:00', lcr: 32 },
  { time: '04:00', lcr: 35 },
  { time: '08:00', lcr: 28 },
  { time: '12:00', lcr: 25 },
  { time: '16:00', lcr: 30 },
  { time: '20:00', lcr: 29 },
];

const creditScoreDist = [
  { range: '<300', count: 12 },
  { range: '300-600', count: 45 },
  { range: '>600', count: 120 },
];

const mockTransactions = [
  "[17:01:22] LOG: Farmer Onboarding (Fayda Verified) -> Data Vault | HASH: 74161c...",
  "[17:02:05] ROUTE: Cash-In 500 ETB -> Sponsor Bank API (M-PESA) | HASH: a9e42a...",
  "[17:03:10] ROUTE: Equb Contribution 150 ETB -> Sponsor Bk Escrow | HASH: b8c312...",
  "[17:04:15] LOG: Agent Selam +4.5 ETB Commission Recorded | HASH: d51929...",
  "[17:05:45] ROUTE: KentiQ Solar Unlock JWS -> IoT Device | HASH: e4f567..."
];

export default function JudgeTicker() {
  const [lcrData, setLcrData] = useState(initialLCRData);
  const [transactions, setTransactions] = useState<string[]>([]);
  const [currentLcr, setCurrentLcr] = useState(29);
  const [isBreached, setIsBreached] = useState(false);

  // Optical Ledger Camera Scanner Simulation States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [scanCompleted, setScanCompleted] = useState(false);
  const [flashIntensity, setFlashIntensity] = useState(false);

  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Play double synthesizer confirmation beeps (high frequency verification tones)
      playTone(987.77, 0, 0.08); // B5 tone
      playTone(1318.51, 0.09, 0.15); // E6 tone
    } catch (e) {
      console.warn("AudioContext speaker blocked or unsupported in this agent context:", e);
    }
  };

  const startAuditScan = () => {
    setIsScanning(true);
    setScanCompleted(false);
    setScanProgress(0);
    setScanMessage('Initializing encrypted quantum lens link...');
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress > 100) {
        clearInterval(interval);
        playSuccessBeep();
        setFlashIntensity(true);
        setTimeout(() => setFlashIntensity(false), 900);
        setScanProgress(100);
        setScanCompleted(true);
        setIsScanning(false);
      } else {
        setScanProgress(currentProgress);
        if (currentProgress < 20) {
          setScanMessage('Calibrating optical focal point...');
        } else if (currentProgress < 40) {
          setScanMessage('Locking onto multi-agent telemetry block...');
        } else if (currentProgress < 65) {
          setScanMessage('Reading SVID keys & cross-proving Adama hashes...');
        } else if (currentProgress < 85) {
          setScanMessage('Validating Zero-Knowledge trust signatures...');
        } else {
          setScanMessage('Updating Ledger verification stamps...');
        }
      }
    }, 90);
  };

  useEffect(() => {
    // Simulate incoming transactions
    let idx = 0;
    const int = setInterval(() => {
      setTransactions(prev => [mockTransactions[idx % mockTransactions.length], ...prev].slice(0, 8));
      idx++;
    }, 2500);
    return () => clearInterval(int);
  }, []);

  const triggerBreach = () => {
    setIsBreached(true);
    setCurrentLcr(9);
    setLcrData(prev => [...prev.slice(1), { time: new Date().toLocaleTimeString().slice(0,5), lcr: 9 }]);
    
    // Auto-recover after 5 seconds to show Nexus Swap
    setTimeout(() => {
      setIsBreached(false);
      setCurrentLcr(35);
      setLcrData(prev => [...prev.slice(1), { time: new Date().toLocaleTimeString().slice(0,5), lcr: 35 }]);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 p-6 font-sans">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center">
            <Activity className="text-emerald-500 mr-3 animate-pulse" size={32} />
            UNCDF LIVE TICKER
          </h1>
          <div className="flex items-center space-x-3 mt-2">
            <p className="text-slate-400 uppercase tracking-widest text-xs">Adama-Modjo Corridor | Sovereign OS</p>
            <Badge variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-950/30 text-[10px]">TECH PROVIDER (NO CASH HELD)</Badge>
          </div>
        </div>
        <Dialog onOpenChange={(open) => { if (!open) { setIsScanning(false); setScanCompleted(false); } }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-emerald-500 text-emerald-500 bg-emerald-950/20 hover:bg-emerald-900/40">
              <QrCode className="w-4 h-4 mr-2" />
              Verify Last Block
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 text-white border-slate-800 max-w-lg relative overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Camera className="w-5 h-5 text-indigo-400" />
                Ledger Block Auditor
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Execute virtual real-time ledger audits verifying decentralized consensus states.
              </DialogDescription>
            </DialogHeader>

            {/* Simulated green flash completion overlay */}
            {flashIntensity && (
              <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none z-20 animate-pulse border-2 border-emerald-500 rounded-lg" />
            )}

            {!isScanning && !scanCompleted && (
              <div className="flex flex-col items-center py-4 space-y-4">
                <p className="text-xs text-slate-400 text-center font-mono max-w-xs">
                  Awaiting optical signature lock on the newest Raxio Ledger block.
                </p>

                <div className="p-6 bg-white rounded-xl relative overflow-hidden group border-2 border-slate-800 shadow-lg">
                  {/* Pseudo QR code */}
                  <div className="grid grid-cols-6 gap-1 w-40 h-40">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`bg-black transition-opacity duration-300 ${
                          (i % 5 === 0 || i % 7 === 0 || i < 6 || i % 6 === 0 || i > 30) ? 'opacity-100' : 'opacity-10'
                        }`} 
                      />
                    ))}
                  </div>
                  {/* Overlay indicating scan target */}
                  <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-slate-950 text-[10px] text-indigo-400 font-mono py-1 px-2 rounded border border-indigo-500/30">
                      SYS_HASH_LINK_A98
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={startAuditScan}
                  type="button"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white select-none shadow-md font-bold mt-2"
                >
                  <Camera className="w-4 h-4 mr-2 animate-pulse" />
                  Initialize Camera Audit Scan
                </Button>
              </div>
            )}

            {isScanning && (
              <div className="py-6 flex flex-col items-center">
                {/* Holographic Viewfinder Stage */}
                <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center mb-6">
                  
                  {/* Bouncing Laser Line Overlay */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_12px_#6366f1] animate-bounce w-full" />

                  {/* Corners */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-indigo-500" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-indigo-500" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-indigo-500" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-indigo-500" />

                  <div className="absolute inset-6 flex flex-col justify-between border border-indigo-500/10 bg-black/40 p-3 rounded font-mono text-[10px] text-slate-400 pointer-events-none">
                    <div className="flex justify-between">
                      <span className="text-indigo-400 animate-pulse">● LIVE AUDIT STREAM</span>
                      <span>SVID: S_WRE_LOCK</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <RefreshCw className="w-10 h-10 text-indigo-500/30 animate-spin mb-2" />
                      <span className="text-slate-300 font-bold uppercase tracking-widest text-[9px]">Capturing QR Matrix...</span>
                    </div>

                    <div className="flex justify-between text-[9px]">
                      <span>GRID_ID: BLOCK_STAMP_771</span>
                      <span className="text-white font-bold">{scanProgress}%</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar and logs */}
                <div className="w-full space-y-3">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-400 transition-all duration-100"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                    <p className="font-mono text-[11px] text-slate-300 truncate">
                      {scanMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {scanCompleted && (
              <div className="space-y-4 py-3">
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-sans font-bold text-emerald-400 text-sm">Ledger Verified Successfully</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      This block successfully matches consensus specifications and the verified Sovereign ID signatures are logged on the Raxio mainframe.
                    </p>
                  </div>
                </div>

                {/* Decoded immutable parameters */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/60 font-mono text-xs">
                  <div className="p-3 flex justify-between items-center bg-slate-900/40">
                    <span className="text-slate-400">Block Number:</span>
                    <span className="text-white font-bold">#28,941,120</span>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-slate-900/10">
                    <span className="text-slate-400">Ledger Root Hash:</span>
                    <span className="text-indigo-400 text-[10px] break-all max-w-[200px] text-right">
                      8f2a1b9e3c4d5f6a7b8c9d0e1f...
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-slate-900/10">
                    <span className="text-slate-400">Consensus Standard:</span>
                    <span className="text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                      Byzantine-SVID Proof
                    </span>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-slate-900/10">
                    <span className="text-slate-400">Sponsor Escrows:</span>
                    <span className="text-white text-[11px] font-bold">74,250.00 ETB Verified</span>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-slate-900/10">
                    <span className="text-slate-400">Timestamp Auth:</span>
                    <span className="text-slate-300">
                      {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => { setScanCompleted(false); setScanProgress(0); }}
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                  >
                    Reset & Audit New Block
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-120px)]">
        
        {/* Quadrant 1: Active Network Pulse */}
        <Card className="bg-slate-900/50 border-slate-800 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-200">Active Network Pulse</CardTitle>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 flex items-center px-3 py-1">
                <Database className="w-3 h-3 mr-2 animate-pulse" />
                RAXIO CLOUD: SECURE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-8">
             <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Active Supervisors</p>
                  <p className="text-5xl font-black text-white">4</p>
                </div>
                <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Active Agents</p>
                  <p className="text-5xl font-black text-white">50</p>
                </div>
             </div>
             
             <div className="space-y-3">
               <h4 className="text-xs uppercase text-slate-500 font-bold mb-2">Edge Nodes</h4>
               {['Modjo-Hub-01', 'Adama-South-04', 'Wenji-Kiosk-11'].map(node => (
                 <div key={node} className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="font-mono text-sm text-slate-300">{node}</span>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Online</Badge>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>

        {/* Quadrant 3: SmartCycle LCR Heartbeat */}
        <Card className={`border-slate-800 transition-colors duration-500 flex flex-col ${isBreached ? 'bg-red-950/20 border-red-500/50' : 'bg-slate-900/50'}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-slate-200">SmartCycle LCR Heartbeat</CardTitle>
              <Button size="sm" variant="destructive" onClick={triggerBreach} disabled={isBreached}>
                Force Breach
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col relative">
            
            {isBreached && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-red-950/80 rounded-xl backdrop-blur-sm animate-pulse border border-red-500">
                <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
                <p className="text-red-400 font-black text-2xl tracking-widest">AGENT FLOAT BREACH (9%)</p>
                <p className="text-white mt-2 font-mono bg-black/50 px-4 py-2 rounded-lg flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500" /> ROUTING REBALANCE COMMAND TO SPONSOR BANK...
                </p>
              </div>
            )}

            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={lcrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <YAxis domain={[0, 50]} stroke="#475569" tick={{fill: '#475569'}} />
                  <XAxis dataKey="time" stroke="#475569" tick={{fill: '#475569'}} />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b'}} />
                  <Line 
                    type="monotone" 
                    dataKey="lcr" 
                    stroke={isBreached ? '#ef4444' : '#10b981'} 
                    strokeWidth={4} 
                    dot={{fill: isBreached ? '#ef4444' : '#10b981', r: 6}} 
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
               <span className="text-slate-400">Current LCR:</span>
               <span className={`text-3xl font-black ${currentLcr < 15 ? 'text-red-500' : 'text-emerald-500'}`}>
                 {currentLcr}%
               </span>
            </div>
          </CardContent>
        </Card>

        {/* Quadrant 2: Live Transaction Ticker */}
        <Card className="bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center">
              <Server className="w-4 h-4 mr-2 text-indigo-400" />
              Live Transaction Ticker
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden relative">
             <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900/50 to-transparent z-10" />
             <div className="space-y-2">
                {transactions.map((tx, idx) => (
                  <div key={idx} className="animate-in fade-in slide-in-from-top-4 duration-500 p-3 bg-slate-950 border border-slate-800 rounded-md font-mono text-[10px] text-emerald-400">
                    {tx}
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-slate-500 text-center py-8 text-sm">Awaiting transactions...</div>
                )}
             </div>
          </CardContent>
        </Card>

        {/* Quadrant 4: Wealth & Credit Hub */}
        <Card className="bg-slate-900/50 border-slate-800 flex flex-col">
          <CardHeader>
            <CardTitle className="text-slate-200">Wealth & Credit Hub</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-6">
             
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                 <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">ESX Securitization SPV</p>
                 <p className="text-3xl font-black text-emerald-400">$1,248,500</p>
               </div>
               <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                 <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Agent Revenue Uplift</p>
                 <p className="text-3xl font-black text-blue-400">+42.5%</p>
               </div>
             </div>

             <div className="flex-1">
                <p className="text-[10px] uppercase text-slate-500 font-bold mb-4">Ardi Score Distribution</p>
                <div className="h-[120px]">
                  <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={creditScoreDist} layout="vertical" margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', color: '#fff'}} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
