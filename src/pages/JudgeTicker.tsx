import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Server, QrCode, ShieldCheck, Database, Zap } from 'lucide-react';
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
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-emerald-500 text-emerald-500 bg-emerald-950/20 hover:bg-emerald-900/40">
              <QrCode className="w-4 h-4 mr-2" />
              Verify Last Block
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 text-white border-slate-800">
            <DialogHeader>
              <DialogTitle>Audit Verification</DialogTitle>
              <DialogDescription className="text-slate-400">
                Scan to view raw immutable JSON payload on the Raxio ledger.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-8 bg-white rounded-lg my-4">
              {/* Placeholder for actual QR code */}
              <div className="grid grid-cols-4 gap-2 w-48 h-48">
                {Array.from({length: 16}).map((_, i) => (
                  <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`} />
                ))}
              </div>
            </div>
            <p className="text-xs font-mono text-slate-500 break-all text-center">
              HASH: 8f2a1b9e3c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
            </p>
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
