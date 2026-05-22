import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Activity, Database, AlertCircle, RefreshCw, FileKey, Server, Terminal, Hexagon } from 'lucide-react';

export default function AuditCompliance() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', event: 'AGENT_VERIFIED', actor: 'Fayda ID Oracle', target: 'AGT-8472', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'SUCCESS', hash: '0x3a4b...91ac' },
    { id: '2', event: 'LCR_THRESHOLD_BREACH', actor: 'Risk Engine', target: 'AGT-2291', timestamp: new Date(Date.now() - 2400000).toISOString(), status: 'WARNING', hash: '0xf11e...342d' },
    { id: '3', event: 'LIQUIDITY_INJECTION', actor: 'Sponsor Bank', target: 'AGT-2291', timestamp: new Date(Date.now() - 2300000).toISOString(), status: 'SUCCESS', hash: '0x88c2...100f' },
    { id: '4', event: 'AML_CHECK_FAILED', actor: 'Compliance Node', target: 'AGT-9912', timestamp: new Date(Date.now() - 1200000).toISOString(), status: 'BLOCKED', hash: '0x99aa...bbee' },
  ]);

  const simulateAnomaly = () => {
    setIsSimulating(true);
    toast.info("Running Deep Scan for Anomalous Routing patterns...");
    
    setTimeout(() => {
      const newLog = { 
        id: Math.random().toString(), 
        event: 'VELOCITY_LIMIT_EXCEEDED', 
        actor: 'Network Firewall', 
        target: 'ND-0X9A', 
        timestamp: new Date().toISOString(), 
        status: 'BLOCKED',
        hash: `0x${Math.random().toString(16).substr(2, 8)}...8a1c`
      };
      setAuditLogs(prev => [newLog, ...prev]);
      toast.error("Anomaly Detected: High-velocity transaction stream blocked.");
      setIsSimulating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      <div className="flex justify-between items-end border-b-2 border-indigo-500 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-indigo-600" />
            Audit & Compliance Intelligence
          </h1>
          <p className="text-slate-500 mt-2 font-medium uppercase tracking-widest text-xs">Hyperledger Fabric Anchored Immutable Logs & AML Guards</p>
        </div>
        <div className="flex space-x-2">
           <Button variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 shadow-sm" onClick={() => toast.success("Generating complete PDF compliance report...")}>
             <FileKey className="w-4 h-4 mr-2" /> Export PoR Report
           </Button>
           <Button onClick={simulateAnomaly} disabled={isSimulating} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
             {isSimulating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Terminal className="w-4 h-4 mr-2" />}
             Inject Simulation
           </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              NBE Directives
            </CardTitle>
            <CardDescription>FIS/02/2020 Real-Time Compliance status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-bold text-slate-700">KYC/CDD Integrity</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">100% Validated</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-bold text-slate-700">AML/CFT AI Guard</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Active Check</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-bold text-slate-700">Data Residency</span>
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Raxio Localized</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white shadow-xl md:col-span-2 relative overflow-hidden border border-slate-800">
           <div className="absolute top-0 right-0 p-4 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase flex items-center rounded-bl-2xl">
             <Hexagon size={12} className="mr-1 animate-spin-slow" /> Consensus Live
           </div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg text-slate-100">
              <Database className="w-5 h-5 mr-2 text-indigo-400" />
              Hyperledger Fabric Consensus
            </CardTitle>
            <CardDescription className="text-slate-400">Cryptographic Anchoring Metrics</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Peer Nodes</p>
                 <p className="text-2xl font-black text-indigo-400">4 / 4</p>
              </div>
              <Server className="text-slate-600 w-8 h-8 opacity-50" />
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Block Height</p>
                 <p className="text-2xl font-black text-emerald-400">#847,192</p>
              </div>
              <Activity className="text-slate-600 w-8 h-8 opacity-50" />
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl col-span-2">
               <div className="flex justify-between items-center mb-2">
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">State Database</p>
                 <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[10px]">CouchDB Verified</Badge>
               </div>
               <p className="text-xs text-slate-300 font-mono">Current Sequence Master: <span className="text-indigo-400">orderer0.naga.eth</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-t-0 p-0 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-slate-800 flex items-center">
            <FileKey className="w-5 h-5 mr-2 text-slate-500" />
            System Event Ledger
          </CardTitle>
          <CardDescription>Real-time cryptographically secured audit trail across all nodes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-600">Timestamp (UTC)</TableHead>
                <TableHead className="font-bold text-slate-600">Event Type</TableHead>
                <TableHead className="font-bold text-slate-600">Actor Entity</TableHead>
                <TableHead className="font-bold text-slate-600">Target Object</TableHead>
                <TableHead className="font-bold text-slate-600 text-right">State / Tx Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-500 py-4">
                     {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} 
                     <span className="text-slate-300 ml-2">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell className="font-bold text-slate-700 text-sm">{log.event.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-600">{log.actor}</TableCell>
                  <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block mt-2">
                     {log.target}
                  </TableCell>
                  <TableCell className="text-right py-4 space-y-1">
                    <div className="flex justify-end">
                      {log.status === 'SUCCESS' && <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 w-24 justify-center">SUCCESS</Badge>}
                      {log.status === 'WARNING' && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 w-24 justify-center">WARNING</Badge>}
                      {log.status === 'BLOCKED' && <Badge variant="destructive" className="w-24 justify-center bg-red-600 hover:bg-red-700">BLOCKED</Badge>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center justify-end">
                       Tx: {log.hash}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
