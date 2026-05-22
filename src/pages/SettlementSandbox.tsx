import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Server, ShieldCheck, Database, Landmark, CheckCircle2, AlertCircle, PlayCircle, Clock, RefreshCcw } from 'lucide-react';

type StepStatus = 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export default function SettlementSandbox() {
  const [stages, setStages] = useState([
    { id: 'init', name: 'Agent Payload Initiation', status: 'IDLE' as StepStatus, log: '' },
    { id: 'auth', name: 'Fayda Zero-Knowledge Auth', status: 'IDLE' as StepStatus, log: '' },
    { id: 'aml', name: 'FIS/02/2020 Compliance Guard', status: 'IDLE' as StepStatus, log: '' },
    { id: 'ledger', name: 'Hyperledger Anchor Lock', status: 'IDLE' as StepStatus, log: '' },
    { id: 'iso', name: 'ISO 20022 Interbank Route', status: 'IDLE' as StepStatus, log: '' },
    { id: 'settle', name: 'Target Tier-1 Bank Settlement', status: 'IDLE' as StepStatus, log: '' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [failAtStep, setFailAtStep] = useState<string | null>(null);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const runSimulation = async () => {
    if (isRunning) return;
    setIsRunning(true);
    
    // Reset stages
    setStages(stages.map(s => ({ ...s, status: 'IDLE', log: '' })));

    let failed = false;
    for (let i = 0; i < stages.length; i++) {
      if (failed) break;

      const stage = stages[i];
      
      // Set to processing
      setStages(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'PROCESSING', log: 'Evaluating constraints...' } : s));
      
      await delay(1200);

      if (failAtStep === stage.id) {
        setStages(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'FAILED', log: 'Constraint violated. Sequence aborted.' } : s));
        toast.error(`${stage.name} blocked the payload.`);
        failed = true;
      } else {
        setStages(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'SUCCESS', log: 'Constraints met. Payload advanced.' } : s));
      }
    }

    if (!failed) {
      toast.success("E2E Settlement Sequence Completed Successfully.");
    }
    
    setIsRunning(false);
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-500 border-emerald-500 bg-emerald-500/10';
      case 'FAILED': return 'text-red-500 border-red-500 bg-red-500/10';
      case 'PROCESSING': return 'text-amber-500 border-amber-500 bg-amber-500/10 animate-pulse';
      default: return 'text-slate-400 border-slate-700 bg-slate-800/30';
    }
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'FAILED': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'PROCESSING': return <RefreshCcw className="w-5 h-5 text-amber-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full overflow-hidden max-w-7xl mx-auto border border-slate-200 rounded-xl bg-white shadow-sm">
      
      {/* Main Flow Canvas */}
      <div className="flex-1 overflow-y-auto p-8 relative bg-slate-50 border-r border-slate-200">
        <div className="mb-8">
           <h1 className="text-3xl font-light tracking-tight text-slate-900 border-b-2 border-indigo-500 pb-2 inline-block">Sandbox Settlement Architecture</h1>
           <p className="text-slate-500 mt-3 font-semibold uppercase tracking-widest text-xs">End-to-End Core Workflow Data Flow</p>
        </div>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[29px] top-[30px] bottom-[30px] w-0.5 bg-slate-200 z-0" />
          
          <div className="space-y-8 relative z-10">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex flex-row items-center space-x-6">
                
                {/* Status Node */}
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center bg-white z-10 shadow-sm transition-all duration-500 ${getStatusColor(stage.status)}`}>
                   {getStatusIcon(stage.status)}
                </div>

                {/* Info Card */}
                <Card className={`flex-1 transition-all duration-500 ${stage.status === 'PROCESSING' ? 'border-amber-400 shadow-md ring-1 ring-amber-400/50' : 'border-slate-200 shadow-sm'}`}>
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg text-slate-800">{stage.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className={getStatusColor(stage.status)}>
                        {stage.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0 pb-4">
                     <p className="text-sm font-mono text-slate-500 bg-slate-100 p-2 rounded-md">
                       {stage.log || 'Awaiting trigger...'}
                     </p>
                     
                     {/* Data Visualization Mock depending on step */}
                     {stage.status === 'SUCCESS' && stage.id === 'iso' && (
                        <div className="mt-3 bg-[#0d1117] p-3 rounded-lg border border-slate-800">
                           <pre className="text-[10px] text-green-400 font-mono">
{`<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008">
  <MsgId>SOV-SIM-994</MsgId>
  <Sts>ACCC</Sts>
</Document>`}
                           </pre>
                        </div>
                     )}
                     {stage.status === 'SUCCESS' && stage.id === 'ledger' && (
                         <div className="mt-3 flex items-center text-xs font-mono text-indigo-600 bg-indigo-50 p-2 rounded-md">
                           <Database className="w-4 h-4 mr-2" /> Block Hash Anchored: 0x8f7d99...
                         </div>
                     )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Controls */}
      <div className="w-80 bg-white p-6 flex flex-col justify-start">
        <h3 className="font-bold text-slate-800 mb-2 flex items-center">
           <PlayCircle className="w-5 h-5 mr-2 text-indigo-600" />
           Simulation Matrix
        </h3>
        <p className="text-xs text-slate-500 mb-6">Manipulate sequence parameters to observe Sovereign Nexus failure modes.</p>
        
        <div className="space-y-6">
          
          <div className="space-y-3">
             <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Environment Injection</p>
             <div className="space-y-2">
                <Button 
                  onClick={() => setFailAtStep(null)} 
                  variant={failAtStep === null ? "default" : "outline"}
                  className={`w-full justify-start ${failAtStep === null ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Standard Healthy Path
                </Button>
                <Button 
                  onClick={() => setFailAtStep('aml')} 
                  variant={failAtStep === 'aml' ? "default" : "outline"}
                  className={`w-full justify-start ${failAtStep === 'aml' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                >
                  <ShieldCheck className="w-4 h-4 mr-2" /> Force AML Blacklist Hit
                </Button>
                <Button 
                  onClick={() => setFailAtStep('iso')} 
                  variant={failAtStep === 'iso' ? "default" : "outline"}
                  className={`w-full justify-start ${failAtStep === 'iso' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                >
                  <AlertCircle className="w-4 h-4 mr-2" /> Force Interbank XML Error
                </Button>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
             <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-3">Execution</p>
             <Button
               onClick={runSimulation}
               disabled={isRunning}
               className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg font-bold shadow-lg"
             >
               {isRunning ? <RefreshCcw className="w-5 h-5 mr-2 animate-spin" /> : <PlayCircle className="w-5 h-5 mr-2" />}
               Commence Settlement
             </Button>
          </div>
          
          {/* Active Logs / Summary */}
          <div className="bg-slate-900 rounded-lg p-4 mt-8 flex-1">
             <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-2">Live Orchestrator Output</p>
             <div className="font-mono text-xs text-emerald-400/80 space-y-1 mt-2">
                <p>{'> System Initialized'}</p>
                {stages.map((s, i) => (
                  s.status !== 'IDLE' && <p key={i}>{`> [${s.id}] Status: ${s.status}`}</p>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
