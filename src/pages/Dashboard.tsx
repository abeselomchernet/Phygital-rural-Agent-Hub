import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Users, Repeat, Network, Coins, Wifi, Zap, Globe, Cpu, RefreshCw, LayoutDashboard, ExternalLink, Store, ShieldAlert, AlertTriangle, PlayCircle, Server } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getPendingEvents, retryEvent, clearEvent } from '@/lib/ghostsync';
import { toast } from 'sonner';

const data = [
  { time: '08:00', liquidity: 420000, volume: 12400 },
  { time: '10:00', liquidity: 510000, volume: 18398 },
  { time: '12:00', liquidity: 860000, volume: 98000 },
  { time: '14:00', liquidity: 678000, volume: 39080 },
  { time: '16:00', liquidity: 789000, volume: 48000 },
  { time: '18:00', liquidity: 439000, volume: 38000 },
  { time: '20:00', liquidity: 845200, volume: 63000 },
];

export default function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pulseLine, setPulseLine] = useState(false);
  const [failedEvents, setFailedEvents] = useState<any[]>([]);

  const loadFailedEvents = async () => {
    try {
      const allEvents = await getPendingEvents();
      const failed = allEvents.filter(e => e.status === 'failed');
      setFailedEvents(failed);
    } catch (err) {
      console.error("Failed to load events in dashboard:", err);
    }
  };

  useEffect(() => {
    loadFailedEvents();
    const interval = setInterval(loadFailedEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetrySingle = async (row_key: string) => {
    try {
      await retryEvent(row_key);
      toast.success('Retrying transaction queue injection...');
      loadFailedEvents();
    } catch (e) {
      toast.error('Failed to trigger retry');
    }
  };

  const handleClearSingle = async (row_key: string) => {
    try {
      await clearEvent(row_key);
      toast.success('Transaction removed from local outbox');
      loadFailedEvents();
    } catch (e) {
      toast.error('Failed to clear transaction');
    }
  };

  useEffect(() => {
    const pulse = setInterval(() => {
      setPulseLine(p => !p);
    }, 2000);
    return () => clearInterval(pulse);
  }, []);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    loadFailedEvents();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-indigo-500 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center">
            <LayoutDashboard className="w-8 h-8 mr-3 text-indigo-600" />
            Nexus Command Center
          </h1>
          <p className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-xs flex items-center bg-indigo-50 w-fit px-3 py-1 rounded-full border border-indigo-100">
             <Globe className="w-3 h-3 mr-2 text-indigo-500" /> Phygital Rural Agent Hub • Adama-Modjo Corridor
          </p>
        </div>
        <div className="flex space-x-3">
          <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 h-10 px-4 flex items-center shadow-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" /> Nodes Synced: 1,402
          </Badge>
          <Button onClick={triggerRefresh} disabled={isRefreshing} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md w-32">
             {isRefreshing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
             Poll Core
          </Button>
        </div>
      </div>

      {/* GhostSync Failure Warnings */}
      {failedEvents.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/70 border-rose-100 shadow-sm animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center text-red-800 space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                <CardTitle className="text-sm font-black uppercase tracking-wider">
                  GhostSync Buffer Alert: {failedEvents.length} Connection Failure(s) Detected
                </CardTitle>
              </div>
              <Badge variant="destructive" className="font-mono text-xs px-2.5 py-0.5">
                Stalled Outbox Queue
              </Badge>
            </div>
            <CardDescription className="text-red-700/80">
              Transactions buffered locally due to simulated or actual telemetry offline gaps. Resolve or retry items to synchronize.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="border border-red-200/60 rounded-lg overflow-hidden bg-white/95 divide-y divide-red-100 max-h-[350px] overflow-y-auto">
              {failedEvents.map((evt) => (
                <div key={evt.row_key} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 gap-3 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-850 font-mono">
                        {evt.type}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 bg-rose-50/50 font-bold">
                        Failed Retry Limit (Attempts: {evt.retry_count})
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Queued: {new Date(evt.created_at).toLocaleString()} • ID: {evt.row_key.substring(0, 8)}...
                    </p>
                    {evt.payload && (
                      <div className="bg-slate-50 border border-slate-100 rounded p-1.5 text-[10px] font-mono text-slate-650 max-w-full overflow-x-auto select-all">
                        {JSON.stringify(evt.payload).substring(0, 160)}
                        {JSON.stringify(evt.payload).length > 160 ? '...' : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={() => handleRetrySingle(evt.row_key)}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold"
                    >
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin-hover" /> Retry Event
                    </Button>
                    <Button
                      onClick={() => handleClearSingle(evt.row_key)}
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 font-bold"
                      title="Clear from Queue"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-blue-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 z-10">
            <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-500">Network Agents</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">1,402</div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center">
               <span className="text-emerald-500 mr-1">+14</span> Since 00:00 UTC
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-emerald-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 z-10">
            <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-500">Gross Liquidity</CardTitle>
            <Coins className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">845.2<span className="text-lg text-slate-400">k</span></div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center">
               <span className="text-emerald-500 mr-1">+12%</span> ETB Pool Delta
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-indigo-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute right-0 top-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 z-10">
            <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-500">Daily Core Swaps</CardTitle>
            <Repeat className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">142</div>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 flex items-center">
               EthSwitch 24H Volume
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-amber-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-all bg-slate-900 border-x-slate-800 border-b-slate-800">
          <div className="absolute right-0 top-0 w-16 h-16 bg-amber-500/10 rounded-bl-full -z-10 group-hover:scale-110 transition-transform" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 z-10">
            <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-400">Carbon tCO₂e Locked</CardTitle>
            <Cpu className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-400">12.4<span className="text-lg text-amber-600">k</span></div>
            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1 flex items-center">
               <span className="text-emerald-400 mr-1 flex items-center"><ShieldCheck className="w-3 h-3 mr-1"/> SPV Tokenized</span> G2P Payouts Ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cinematic Portals Launcher */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-indigo-100 overflow-hidden relative bg-gradient-to-br from-indigo-50/50 to-white shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Store className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-lg">Agent POS Kiosk</h3>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Offline Ready</Badge>
                </div>
                <p className="text-slate-500 text-sm mt-1 max-w-md">
                  Launch the decoupled edge POS interface used by offline rural merchant agents to stage transactions, collect crop payments, and load digital wallets without immediate network connections.
                </p>
              </div>
            </div>
            <a 
              href="/kiosk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-9 gap-1.5 px-3.5"
            >
              Launch Kiosk <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        </Card>

        <Card className="border border-blue-100 overflow-hidden relative bg-gradient-to-br from-blue-50/50 to-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-lg">Super Agent Portal</h3>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none">Sync Supervisor</Badge>
                </div>
                <p className="text-slate-500 text-sm mt-1 max-w-md">
                  Launch the supervisory platform for managing decentralized route mapping, validating local bulk ledger synchronizations, and physical float distribution logs.
                </p>
              </div>
            </div>
            <a 
              href="/supervisor" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 gap-1.5 px-3.5"
            >
              Launch Portal <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        </Card>
      </div>

      {/* Main Trajectory Chart & Secondary Operations panel */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-3 md:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50 pb-4">
            <div>
               <CardTitle className="text-slate-800">G2P/P2G Transaction Mass & Liquidity</CardTitle>
               <CardDescription>Corridor aggregation bridging Carbon Payouts, School Feeding, and Core Swaps</CardDescription>
            </div>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">24H Live Trace</Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[320px]">
              <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                <AreaChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorLiquidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dx={-10} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dx={10} tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    labelStyle={{ color: '#475569', marginBottom: '4px' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="liquidity" name="Network Liquidity (ETB)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLiquidity)" />
                  <Area yAxisId="right" type="monotone" dataKey="volume" name="Transaction Mass" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action / Orchestration Center */}
        <Card className="col-span-3 md:col-span-1 shadow-sm border-slate-200">
           <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
              <CardTitle className="text-slate-800 flex items-center text-sm uppercase tracking-widest font-black">
                 <Network className="w-4 h-4 mr-2 text-indigo-500" /> Subsystem Routing
              </CardTitle>
           </CardHeader>
           <CardContent className="pt-6 space-y-4">
              <div className="p-4 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors cursor-pointer group">
                 <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">School Feeding Procurement (P2G)</p>
                    <Network className="w-5 h-5 text-emerald-400 group-hover:animate-pulse" />
                 </div>
                 <p className="text-xs text-slate-500 leading-relaxed">Aggregated local staple procurement. Routing direct P2G transactions to Super-Agent hubs.</p>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl bg-white hover:border-amber-300 transition-colors cursor-pointer group">
                 <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors">Market Stabilization Buffer</p>
                    <Coins className="w-5 h-5 text-amber-400 group-hover:animate-pulse" />
                 </div>
                 <p className="text-xs text-slate-500 leading-relaxed">P2G/G2P Hybrid. Smooth staple crop prices by purchasing from co-ops and issuing top-ups.</p>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 mt-8 border border-slate-800">
                 <div className="flex justify-between items-center mb-4">
                   <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Live Orchestrator</p>
                   <div className={`w-2 h-2 rounded-full ${pulseLine ? 'bg-emerald-400' : 'bg-emerald-400/20'} transition-colors duration-300`} />
                 </div>
                 <div className="space-y-2 font-mono text-[10px] text-emerald-500/80">
                   <p>{'>'} LCR check passed (EthSwitch)</p>
                   <p>{'>'} School Order #882 Procured</p>
                   <p>{'>'} SPV Securitization matched</p>
                   <p>{'>'} Diaspora Vault: +2,400 ETB <span className="text-emerald-400">OK</span></p>
                 </div>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
