import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Server, Cloud, Shield, Database, Activity, Cpu, ArrowRightLeft, FileText, Code2, X, Network, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function SovereignNodeStatus() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isIsoModalOpen, setIsIsoModalOpen] = useState(false);
  const [isoLogs, setIsoLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isTestingFailover, setIsTestingFailover] = useState(false);
  const [latencyData, setLatencyData] = useState<{time: string, gcp: number, raxio: number}[]>([]);
  
  // Real-time LCR Tracking
  const [currentLcr, setCurrentLcr] = useState<number>(0.65);
  const [isLcrBreached, setIsLcrBreached] = useState(false);
  const lcrThreshold = 0.4;

  useEffect(() => {
    // Initialize latency chart
    const initialData = Array.from({length: 10}).map((_, i) => ({
      time: `-${10-i}s`,
      gcp: Math.floor(Math.random() * 20) + 80,
      raxio: Math.floor(Math.random() * 5) + 10
    }));
    setLatencyData(initialData);

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/node/metrics');
        if (res.ok) {
           const data = await res.json();
           setMetrics(data);
           
           setLatencyData(prev => {
             const newData = [...prev.slice(1), {
               time: new Date().toLocaleTimeString([], { hour12: false, second: '2-digit' }),
               gcp: data.gcpAiLayer.inferenceMs,
               raxio: data.raxioPrimary.latency
             }];
             return newData;
           });
        }
      } catch (e) {
        console.log('Failed to fetch node metrics');
      }
    };
    fetchMetrics();
    const int = setInterval(fetchMetrics, 3000);
    
    // Simulate LCR fluctuation specifically for this module
    const lcrInt = setInterval(() => {
      setCurrentLcr(prev => {
        // Randomly adjust between -0.05 and +0.05
        const adjustment = (Math.random() * 0.1) - 0.05;
        let newLcr = parseFloat((prev + adjustment).toFixed(2));
        
        // Prevent going above 1.5
        if (newLcr > 1.5) newLcr = 1.5;
        
        return newLcr;
      });
    }, 4500);

    return () => {
      clearInterval(int);
      clearInterval(lcrInt);
    };
  }, []);

  useEffect(() => {
    if (currentLcr < lcrThreshold && !isLcrBreached) {
      setIsLcrBreached(true);
      toast.error(`CRITICAL: LCR threshold breached (${currentLcr}). Intervention required.`, { duration: 10000 });
    } else if (currentLcr >= lcrThreshold && isLcrBreached) {
      setIsLcrBreached(false);
      toast.success(`LCR stabilized at ${currentLcr}. Normal operations resumed.`);
    }
  }, [currentLcr, isLcrBreached, lcrThreshold]);

  const triggerFailover = () => {
     setIsTestingFailover(true);
     toast.info("Testing BGP Anycast Routing Failover...");
     
     setTimeout(() => {
        setMetrics((prev: any) => ({
           ...prev,
           raxioPrimary: { ...prev.raxioPrimary, status: 'Recovering', cpu: 95 },
           gcpAiLayer: { ...prev.gcpAiLayer, status: 'Handling Overflow' }
        }));
        toast.warning("Raxio Traffic Overflowing to Edge Cache...");

        setTimeout(() => {
           setMetrics((prev: any) => ({
             ...prev,
             raxioPrimary: { ...prev.raxioPrimary, status: 'Active', cpu: 45 },
             gcpAiLayer: { ...prev.gcpAiLayer, status: 'Serving Models' }
           }));
           toast.success("Failover simulation complete. Routes stable.");
           setIsTestingFailover(false);
        }, 3000);
     }, 1500);
  };

  const forceLcrBreach = () => {
    setCurrentLcr(0.20);
  };

  const recoverLcr = () => {
    setCurrentLcr(0.75);
  };

  const openIsoLogs = async () => {
    setIsIsoModalOpen(true);
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/iso20022/logs');
      if (res.ok) setIsoLogs(await res.json());
    } catch (e) {
      console.log('Failed to fetch ISO logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-6xl mx-auto">
      
      {/* Dynamic LCR Breach Banner */}
      {isLcrBreached && (
        <div className="animate-in slide-in-from-top fade-in duration-300 bg-red-600 text-white rounded-xl shadow-lg border border-red-500 overflow-hidden">
           <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                 <div className="bg-red-500/50 p-2 rounded-full animate-pulse">
                   <AlertTriangle className="w-8 h-8 text-white" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-wider uppercase">Critical Compliance Alert: LCR Breach</h3>
                    <p className="text-red-100 font-medium">Liquidity Coverage Ratio has dropped to <span className="font-mono bg-red-950/40 px-2 py-0.5 rounded">{currentLcr}</span> (Threshold: {lcrThreshold}). Automatic sweeping engaged.</p>
                 </div>
              </div>
              <Button onClick={recoverLcr} variant="outline" className="border-white/20 text-red-600 hover:bg-white hover:text-red-700 font-bold bg-white/90">
                 Inject Fiat Vault Liquidity
              </Button>
           </div>
           <div className="bg-red-950/30 px-6 py-2 text-xs font-mono text-red-200 flex space-x-6">
              <span>Timestamp: {new Date().toISOString()}</span>
              <span>Action: Halt EthSwitch Settlements</span>
              <span>Status: Awaiting Sweep Injection</span>
           </div>
        </div>
      )}

      <div className="flex justify-between items-end border-b-2 border-indigo-500 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center">
             <Network className="w-8 h-8 mr-3 text-indigo-600" />
             Sovereign Edge Telemetry
          </h1>
          <p className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-xs">Raxio Tier 3 Ethiopia Data Center & GCP Flexible AI Layer</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={forceLcrBreach} variant="outline" className="border-red-500 text-red-700 hover:bg-red-50 shadow-sm">
             <AlertTriangle className="w-4 h-4 mr-2" />
             Test LCR Drop
          </Button>
          <Button onClick={triggerFailover} disabled={isTestingFailover} variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50 bg-amber-50/50 shadow-sm">
             {isTestingFailover ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2 text-amber-500" />}
             Test High-Availability Failover
          </Button>
        </div>
      </div>

      {!metrics ? (
        <div className="flex justify-center items-center h-48 opacity-50 text-indigo-500">
          <Activity className="w-8 h-8 animate-spin mr-3" />
          <span className="font-mono text-sm tracking-widest uppercase font-bold">Connecting to Raxio Core...</span>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            
            {/* Primary Raxio Node */}
            <Card className="col-span-2 border-t-4 border-t-blue-600 bg-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-blue-500/10 rounded-bl-2xl border-b border-l border-blue-500/20">
                 <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Local Data Residency</span>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className="w-5 h-5 text-blue-600" />
                    <CardTitle>Raxio Tier 3 Primary</CardTitle>
                  </div>
                </div>
                <CardDescription>Addis Ababa Core Gateway</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between">
                   <Badge variant="outline" className={`font-bold transition-colors duration-500 ${metrics.raxioPrimary.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200 animate-pulse'}`}>
                     {metrics.raxioPrimary.status}
                   </Badge>
                   <span className="text-xs text-slate-400 font-mono">Uptime: 99.999%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center font-bold text-xs uppercase tracking-widest"><Cpu className="w-3 h-3 mr-1"/> CPU Utilization</span>
                    <span className="font-mono font-black text-slate-700">{metrics.raxioPrimary.cpu}%</span>
                  </div>
                  <Progress value={metrics.raxioPrimary.cpu} className="h-1.5 bg-slate-100 [&>div]:bg-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 flex items-center font-bold text-xs uppercase tracking-widest"><Database className="w-3 h-3 mr-1"/> Memory Usage</span>
                    <span className="font-mono font-black text-slate-700">{metrics.raxioPrimary.memory}%</span>
                  </div>
                  <Progress value={metrics.raxioPrimary.memory} className="h-1.5 bg-slate-100 [&>div]:bg-blue-600" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-lg p-3">
                     <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Internal Latency</p>
                     <p className="font-mono text-xl font-black text-blue-600">{metrics.raxioPrimary.latency} <span className="text-xs text-slate-400 font-medium">ms</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                     <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Active Syncing Agents</p>
                     <p className="font-mono text-xl font-black text-slate-700">1,402</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GCP AI Layer */}
            <Card className="col-span-2 border-t-4 border-t-indigo-500 bg-white shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cloud className="w-5 h-5 text-indigo-500" />
                    <CardTitle>GCP Flexible AI Layer</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                    {metrics.gcpAiLayer.status}
                  </Badge>
                </div>
                <CardDescription>Frankfurt Region • Anonymous Data Inference</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="space-y-1">
                    <p className="text-[10px] text-indigo-600/80 uppercase font-black tracking-widest mb-1">Ardi Compute Latency</p>
                    <p className="font-mono text-3xl font-black text-indigo-700">{metrics.gcpAiLayer.inferenceMs} <span className="text-sm font-medium text-indigo-400">ms</span></p>
                  </div>
                  <Activity className="w-10 h-10 text-indigo-300" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Active ML Scoring Requests</p>
                    <p className="font-mono text-2xl font-black text-slate-800">{metrics.gcpAiLayer.requestsActive}</p>
                  </div>
                  <ArrowRightLeft className="w-8 h-8 text-slate-300" />
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card className="col-span-2 lg:col-span-3 border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center">
                     <Activity className="w-4 h-4 mr-2 text-indigo-500" /> Layered Latency Graph
                   </CardTitle>
                </CardHeader>
                <CardContent className="h-48 pt-4">
                   <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                      <AreaChart data={latencyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorGcp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRaxio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <RechartsTooltip 
                           contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                           itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Area type="monotone" dataKey="gcp" name="GCP AI (ms)" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorGcp)" />
                        <Area type="monotone" dataKey="raxio" name="Raxio Core (ms)" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRaxio)" />
                      </AreaChart>
                   </ResponsiveContainer>
                </CardContent>
             </Card>

            {/* The Border / Anonymization Layer */}
            <Card className="bg-slate-900 text-white shadow-xl lg:col-span-2">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <CardTitle className="text-slate-100">Data Anonymization Gateway</CardTitle>
                </div>
                <CardDescription className="text-slate-400">PII Stripping for Sovereign Compliance</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Payloads Sanitized (24h)</p>
                      <p className="font-mono text-3xl font-light text-emerald-400">{(metrics.anonymizer.piiStripped / 1000).toFixed(1)}k</p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                      Enforcing FIS/02/2020
                    </Badge>
                 </div>
                 <div className="mt-6 text-sm text-slate-400 max-w-sm">
                   Data flowing to GCP relies exclusively on synthetic keys. No personal identifiable information (PII) exits the Raxio Tier 3 boundary.
                 </div>
              </CardContent>
            </Card>

            {/* Hyperledger Record */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-slate-700" />
                  <CardTitle>Hyperledger Fabric Anchoring</CardTitle>
                </div>
                <CardDescription>Immutable record of cross-layer events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-600">Active Peers</span>
                  <span className="font-mono text-sm">{metrics.fabricLedger.peers} NAGA Nodes</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-sm font-medium text-slate-600">Latest Block Height</span>
                  <span className="font-mono text-sm text-primary">#{metrics.fabricLedger.lastBlock.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-medium text-slate-600">State DB</span>
                  <span className="font-mono text-sm text-slate-500">CouchDB</span>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Financial Statements Section */}
          <div className="mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <CardTitle>Financial Statements</CardTitle>
                  </div>
                  <CardDescription>Agent Statement Ledger (Target: AG-7742)</CardDescription>
                </div>
                <Button variant="outline" onClick={openIsoLogs} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Code2 className="w-4 h-4 mr-2" /> View Raw ISO 20022 Logs
                </Button>
              </CardHeader>
              <CardContent>
                <FinancialStatements agentId="AG-7742" />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ISO 20022 Logs Modal */}
      {isIsoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">ISO 20022 Settlement Messages</h3>
                  <p className="text-xs text-slate-400 font-mono">Raw XML Interbank Protocol Sandbox</p>
                </div>
              </div>
              <button onClick={() => setIsIsoModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 bg-slate-950">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
                   <Activity className="w-8 h-8 animate-spin text-indigo-500" />
                   <p className="text-sm font-mono uppercase tracking-widest">Decrypting Interbank Logs...</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {isoLogs.map((log) => (
                    <div key={log.id} className="p-5 hover:bg-slate-900/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                           <Badge variant="outline" className="border-slate-700 text-indigo-400 bg-indigo-500/10 font-mono text-[10px]">
                             {log.type}
                           </Badge>
                           <p className="font-medium text-slate-200 text-sm">{log.description}</p>
                        </div>
                        <div className="text-right">
                           <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${
                             log.status === 'PROCESSED' || log.status === 'ACKNOWLEDGED' 
                               ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                               : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                           }`}>
                             {log.status}
                           </Badge>
                           <p className="text-[10px] text-slate-500 font-mono mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <div className="bg-[#0d1117] rounded-lg p-4 border border-slate-800 overflow-x-auto">
                        <pre className="text-xs text-slate-300 font-mono leading-relaxed">
                          <code>{log.rawXml}</code>
                        </pre>
                      </div>
                    </div>
                  ))}
                  {isoLogs.length === 0 && (
                     <div className="p-8 text-center text-slate-500 font-mono text-sm">
                        No ISO 20022 message trace found for recent block events.
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialStatements({ agentId }: { agentId: string }) {
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatements = async () => {
      try {
        const res = await fetch(`/api/statements/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          // Provide some mock data if empty to show the UI in preview
          if (data.statements && data.statements.length > 0) {
            setStatements(data.statements);
          } else {
             setStatements([
               { date: new Date(Date.now() - 3600000).toISOString(), type: 'CREDIT', amount: 15000, currency: 'ETB', ref: 'TXD8A9F', isoMsgId: 'MSG1001' },
               { date: new Date(Date.now() - 86400000).toISOString(), type: 'DEBIT', amount: 5000, currency: 'ETB', ref: 'TXB2C3D', isoMsgId: 'MSG1000' }
             ]);
          }
        }
      } catch (e) {
        console.error('Failed to fetch statements', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatements();
  }, [agentId]);

  if (loading) return <div className="text-sm text-slate-500 animate-pulse">Loading statements...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium">Reference ID</th>
          </tr>
        </thead>
        <tbody>
          {statements.length === 0 ? (
            <tr>
               <td colSpan={4} className="px-4 py-6 text-center text-slate-500">No statements found for {agentId}.</td>
            </tr>
          ) : (
             statements.map((stmt, i) => (
               <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                 <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                   {new Date(stmt.date).toLocaleString()}
                 </td>
                 <td className="px-4 py-3">
                   <Badge variant="outline" className={stmt.type === 'CREDIT' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-rose-200 text-rose-700 bg-rose-50'}>
                     {stmt.type}
                   </Badge>
                 </td>
                 <td className="px-4 py-3 font-mono text-right font-medium">
                   {stmt.type === 'CREDIT' ? '+' : '-'}{stmt.amount.toLocaleString()} {stmt.currency || 'ETB'}
                 </td>
                 <td className="px-4 py-3 font-mono text-xs text-slate-500">
                   {stmt.ref}
                 </td>
               </tr>
             ))
          )}
        </tbody>
      </table>
    </div>
  );
}
