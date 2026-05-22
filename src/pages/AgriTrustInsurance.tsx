import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, ArrowUpRight, CloudRain, Satellite, FileText, CheckCircle2, Sprout, Network } from 'lucide-react';

export default function AgriTrustInsurance() {
  const [ndviValue, setNdviValue] = useState(0.68);
  const [preferredWallet, setPreferredWallet] = useState<'M-PESA' | 'Telebirr'>('M-PESA');
  const [insuredAmount, setInsuredAmount] = useState(15000);
  const [isSimulating, setIsSimulating] = useState(false);
  const [contractLogs, setContractLogs] = useState([
    { id: 'tx-001', date: '2026-03-01', event: 'Premium Paid (ETB 1,500)', status: 'Confirmed' },
    { id: 'tx-002', date: '2026-03-05', event: 'Geo-Fence Locked (Adama Sector 4)', status: 'Active' },
    { id: 'tx-003', date: '2026-04-10', event: 'Baseline NDVI Logged (0.68)', status: 'Oracle Synced' }
  ]);

  const isWarning = ndviValue < 0.45 && ndviValue >= 0.35;
  const isAtRisk = ndviValue < 0.35;

  const simulateDrought = () => {
    setIsSimulating(true);
    toast.info("Ingesting Sentinel-2 Satellite Telemetry...");
    
    setTimeout(() => {
      setNdviValue(0.42);
      setContractLogs(prev => [{ id: `tx-${Math.random().toString(36).substr(2,4)}`, date: new Date().toISOString().split('T')[0], event: 'NDVI Warning Trigger (0.42)', status: 'Oracle Synced' }, ...prev]);
      toast.warning("Drought Warning. NDVI dropping.");
    }, 1500);

    setTimeout(() => {
      setNdviValue(0.31);
      setContractLogs(prev => [{ id: `tx-${Math.random().toString(36).substr(2,4)}`, date: new Date().toISOString().split('T')[0], event: 'Critical NDVI (0.31) - Payout Authorized', status: 'Pending Chain' }, ...prev]);
      toast.error("Severe NDVI Deviation Detected. Smart Contract Trigger Activated.");
      setIsSimulating(false);
    }, 3500);
  };

  const resetTelemetry = () => {
    setNdviValue(0.68);
    setContractLogs(prev => [{ id: `tx-${Math.random().toString(36).substr(2,4)}`, date: new Date().toISOString().split('T')[0], event: 'NDVI Recovered (0.68) - Normal', status: 'Oracle Synced' }, ...prev]);
    toast.success("Telemetry Reset to Healthy Baseline.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900">AgriTrust Parametric Cover</h1>
          <p className="text-slate-500 mt-2">Automated Climate Resilience via Sentinel-2 Satellite Data</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={resetTelemetry} disabled={!isAtRisk && !isWarning}>Reset Telemetry</Button>
          <Button onClick={simulateDrought} disabled={isAtRisk || isSimulating} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            {isSimulating ? <Satellite className="w-4 h-4 mr-2 animate-bounce" /> : <CloudRain className="w-4 h-4 mr-2" />}
            Simulate Drought Event
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl flex flex-col">
          {/* Policy Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-white font-bold text-2xl flex items-center">
                <ShieldCheck className="text-emerald-500 mr-3" size={28} />
                AgriTrust Protection
              </h2>
              <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold flex items-center">
                 <Network className="w-3 h-3 mr-1" /> Smart Contract: #AT-ADAMA-2026
              </p>
              <p className="text-slate-500 text-sm mt-1 flex items-center">
                 <Sprout className="w-3 h-3 mr-1" /> Beneficiary: Chaltu (Fayda: ***892)
              </p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
              isAtRisk 
                ? 'bg-red-500/10 text-red-500 border-red-500/30 animate-pulse' 
                : isWarning
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
            }`}>
              {isAtRisk ? 'Payout Triggered' : isWarning ? 'Drought Warning' : 'Active Cover'}
            </div>
          </div>

          {/* Satellite Health Dial */}
          <div className={`flex flex-col items-center py-8 bg-slate-950 rounded-3xl mb-8 relative border transition-colors duration-500 ${isAtRisk ? 'border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.1)]' : isWarning ? 'border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.1)]' : 'border-emerald-500/20'}`}>
            <div className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-3 flex items-center">
              <Satellite className={`w-4 h-4 mr-2 ${isSimulating ? 'animate-pulse text-indigo-400' : 'text-slate-400'}`} /> Live Satellite NDVI Oracle
            </div>
            <div className={`text-7xl font-black mb-4 transition-colors duration-1000 ${isAtRisk ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-400'}`}>
              {ndviValue.toFixed(2)}
            </div>
            
            <div className="w-full px-12 mt-4">
              <div className="h-3 w-full bg-slate-800 rounded-full flex overflow-hidden relative">
                {/* Target Lines */}
                <div className="absolute top-0 bottom-0 left-[35%] w-0.5 bg-slate-400 z-20" />
                <div className="absolute top-0 bottom-0 left-[45%] w-0.5 bg-slate-500/50 z-20 dashed" />
                
                {/* Trigger Zones */}
                <div className="h-full bg-red-500/20 absolute left-0 top-0 bottom-0 z-10" style={{ width: '35%' }} /> 
                <div className="h-full bg-amber-500/20 absolute left-[35%] top-0 bottom-0 z-10" style={{ width: '10%' }} /> 

                {/* Progress Fill */}
                <div 
                  className={`h-full transition-all duration-1000 z-10 ${isAtRisk ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                  style={{ width: `${ndviValue * 100}%` }} 
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 mt-3 font-bold uppercase tracking-widest">
                <span className="text-red-500/80">Critical Payout (&lt;0.35)</span>
                <span className="text-amber-500/80 -ml-16">Warning (&lt;0.45)</span>
                <span className="text-emerald-500/80">Healthy Baseline</span>
              </div>
            </div>
          </div>

          {/* Payout Information */}
          <div className="grid grid-cols-2 gap-4 mt-auto">
            <div className="p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Max Cover Amount</p>
              <p className="text-white font-black text-2xl">{(insuredAmount).toLocaleString()} <span className="text-sm font-medium text-slate-400">ETB</span></p>
              <p className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-widest">+15 Pt Ardi Score Boost</p>
            </div>
            <div className="p-5 bg-slate-800/40 rounded-2xl border border-slate-700/50">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1 flex justify-between items-center">
                Disbursement Target
                <button 
                  onClick={() => setPreferredWallet(p => p === 'M-PESA' ? 'Telebirr' : 'M-PESA')}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 opacity-80 hover:opacity-100"
                >
                  Edit
                </button>
              </p>
              <p className="text-indigo-400 font-black text-2xl flex items-center">
                {preferredWallet} <ArrowUpRight size={18} className="ml-2 opacity-50" />
              </p>
            </div>
          </div>

          {/* Action/Information Bar */}
          {isAtRisk && (
            <div className="mt-8 flex items-start space-x-4 bg-red-500/10 border border-red-500/30 p-5 rounded-2xl">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={24} />
              <p className="text-sm text-red-200 leading-relaxed font-medium">
                NDVI threshold breached. An initial relief payout of <strong className="text-white bg-red-500/20 px-2 py-0.5 rounded border border-red-500/50 outline-none">ETB {(insuredAmount * 0.4).toLocaleString()}</strong> has been queued to the ledger for {preferredWallet} transfer. No adjuster verification required.
              </p>
            </div>
          )}
          {isWarning && !isAtRisk && (
             <div className="mt-8 flex items-start space-x-4 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={24} />
              <p className="text-sm text-amber-200 leading-relaxed font-medium">
                Drought Warning: Crop health is declining. If NDVI drops below 0.35, the smart contract will automatically trigger a 40% relief payout.
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-[2rem] p-6 border border-slate-800 shadow-2xl flex flex-col h-[600px]">
           <h3 className="text-white font-bold text-lg mb-6 flex items-center">
             <FileText className="w-5 h-5 mr-2 text-indigo-400" />
             Smart Contract Ledger
           </h3>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {contractLogs.map((log) => (
                 <div key={log.id} className="relative pl-6 pb-2 border-l border-slate-800 last:border-0 last:pb-0">
                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                    <p className="text-[10px] text-slate-500 font-mono mb-1">{log.date} • {log.id}</p>
                    <p className={`text-sm font-bold mb-1 ${log.event.includes('Critical') ? 'text-red-400' : log.event.includes('Warning') ? 'text-amber-400' : 'text-slate-300'}`}>{log.event}</p>
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-400">
                      {log.status === 'Confirmed' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />}
                      {log.status}
                    </div>
                 </div>
              ))}
           </div>

           <div className="mt-6 pt-6 border-t border-slate-800">
              <p className="text-slate-400 text-xs mb-2">Algorithm & Oracles</p>
              <div className="flex items-center space-x-2">
                 <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 bg-indigo-400/10 text-[10px]">Copernicus Sentinel-2</Badge>
                 <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 text-[10px]">Polygon ZK</Badge>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
