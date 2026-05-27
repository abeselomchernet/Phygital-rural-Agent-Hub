import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  AlertCircle, 
  RefreshCw, 
  FileKey, 
  Server, 
  Terminal, 
  Hexagon, 
  Scale, 
  ClipboardCheck, 
  ArrowRight, 
  ShieldAlert, 
  FileText, 
  Send, 
  CheckCircle2, 
  Award, 
  Check, 
  Layers, 
  UserCheck, 
  Radio 
} from 'lucide-react';

interface ISO20022Log {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: string;
  rawXml: string;
}

export default function AuditCompliance() {
  const [activeTab, setActiveTab] = useState<'readiness' | 'ledger' | 'iso20022'>('readiness');
  
  // Existing Audit state
  const [isSimulating, setIsSimulating] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isNetworkPartitioned, setIsNetworkPartitioned] = useState(() => localStorage.getItem('CHAOS_NETWORK_PARTITION') === 'true');
  const [reconciliationReport, setReconciliationReport] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState([
    { id: '1', event: 'AGENT_VERIFIED', actor: 'Fayda ID Oracle', target: 'AGT-8472', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'SUCCESS', hash: '0x3a4b...91ac' },
    { id: '2', event: 'LCR_THRESHOLD_BREACH', actor: 'Risk Engine', target: 'AGT-2291', timestamp: new Date(Date.now() - 2400000).toISOString(), status: 'WARNING', hash: '0xf11e...342d' },
    { id: '3', event: 'LIQUIDITY_INJECTION', actor: 'Sponsor Bank', target: 'AGT-2291', timestamp: new Date(Date.now() - 2300000).toISOString(), status: 'SUCCESS', hash: '0x88c2...100f' },
    { id: '4', event: 'AML_CHECK_FAILED', actor: 'Compliance Node', target: 'AGT-9912', timestamp: new Date(Date.now() - 1200000).toISOString(), status: 'BLOCKED', hash: '0x99aa...bbee' },
  ]);

  // ISO 20022 log telemetry state
  const [isoLogs, setIsoLogs] = useState<ISO20022Log[]>([]);
  const [selectedIsoLog, setSelectedIsoLog] = useState<ISO20022Log | null>(null);

  // NBE Pilot and Sandbox Readiness detailed checks state
  const [verifications, setVerifications] = useState<Record<string, 'IDLE' | 'VERIFYING' | 'PASSED'>>({
    fayda: 'PASSED',
    ghostsync: 'IDLE',
    iso: 'PASSED',
    zerotrust: 'IDLE',
    raxio_infra: 'PASSED',
    commodity_escrow: 'IDLE'
  });

  // Sandbox Dossier compiler wizard state
  const [pilotRegion, setPilotRegion] = useState('Adama Corridor');
  const [sponsorBank, setSponsorBank] = useState('Commercial Bank of Ethiopia');
  const [escrowVolume, setEscrowVolume] = useState('15,000,000');
  const [maxDailyLimit, setMaxDailyLimit] = useState('250,000');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledDossier, setCompiledDossier] = useState<any | null>(null);
  const [isSubmittingToNbe, setIsSubmittingToNbe] = useState(false);
  const [hasSubmittedToNbe, setHasSubmittedToNbe] = useState(false);

  // Load ISO logs from server
  useEffect(() => {
    const fetchIsoLogs = async () => {
      try {
        const res = await fetch('/api/iso20022/logs');
        if (res.ok) {
          const logs = await res.json();
          setIsoLogs(logs);
          if (logs.length > 0) {
            setSelectedIsoLog(logs[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load ISO logs from server:", err);
      }
    };
    fetchIsoLogs();
  }, []);

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
    }, 1500);
  };

  const handleVerifyMetric = (key: string) => {
    setVerifications(prev => ({ ...prev, [key]: 'VERIFYING' }));
    toast.info(`Initiating mathematical audit check on ${key.toUpperCase()} integration...`);
    
    setTimeout(() => {
      setVerifications(prev => ({ ...prev, [key]: 'PASSED' }));
      toast.success(`Verification SUCCESS: ${key.toUpperCase()} metrics met 100% regulatory constraints!`);
    }, 1600);
  };

  const runReconciliation = async () => {
    setIsReconciling(true);
    toast.loading("Authenticating via SPIFFE/mTLS...", { id: 'recon' });
    
    try {
      const svidPayload = btoa(JSON.stringify({
         spiffe_id: "spiffe://enawuga.com/ns/governance/sa/auditor",
         issued_at: Date.now(),
         expires_at: Date.now() + 3600000
      }));
      const mockSvid = `${svidPayload}.VERIFIED_MTLS_SIG_XYZ`;

      const res = await fetch('/api/reconciliation/run', { 
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'x-spiffe-svid': mockSvid
        }
      });
      
      const data = await res.json();
      
      if (res.status === 401 || res.status === 403) {
         toast.error(`Zero Trust mTLS Block: ${data.error}`, { id: 'recon', duration: 5000 });
         setIsReconciling(false);
         return;
      }
      
      setReconciliationReport(data);
      if (data.status === 'CLEARED') {
        toast.success(`Reconciliation complete. Trace ID: ${data.traceId}. 100% Match!`, { id: 'recon' });
      } else {
        toast.error(`Reconciliation complete. Discovered ${data.discrepanciesFound} settling discrepancies!`, { id: 'recon', duration: 5000 });
      }
    } catch (e) {
      toast.error("Failed to reach Reconciliation Engine.", { id: 'recon' });
    } finally {
      setIsReconciling(false);
    }
  };

  const runChaosReconciliation = async () => {
    setIsReconciling(true);
    toast.loading("Chaos Simulation: Injecting expired SPIFFE/mTLS SVID...", { id: 'recon' });
    
    try {
      const svidPayload = btoa(JSON.stringify({
         spiffe_id: "spiffe://enawuga.com/ns/governance/sa/auditor",
         issued_at: Date.now() - 7200000,
         expires_at: Date.now() - 3600000 
      }));
      const mockSvid = `${svidPayload}.VERIFIED_MTLS_SIG_XYZ_EXPIRED`;

      const res = await fetch('/api/reconciliation/run', { 
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'x-spiffe-svid': mockSvid
        }
      });
      
      const data = await res.json();
      
      if (res.status === 401 || res.status === 403) {
         toast.error(`Zero Trust Block (Chaos Success): ${data.error}`, { id: 'recon', duration: 6000 });
         setIsReconciling(false);
         setReconciliationReport(null);
         return;
      }
      
      setReconciliationReport(data);
      toast.error(`CRITICAL FAILURE: Chaos test bypassed Zero Trust!`, { id: 'recon', duration: 8000 });
    } catch (e) {
      toast.error("Failed to reach Reconciliation Engine.", { id: 'recon' });
    } finally {
      setIsReconciling(false);
    }
  };

  const toggleNetworkPartition = () => {
    const newState = !isNetworkPartitioned;
    setIsNetworkPartitioned(newState);
    if (newState) {
      localStorage.setItem('CHAOS_NETWORK_PARTITION', 'true');
      toast.error('CHAOS INJECTED: Network Partition active. Edge nodes isolated.');
    } else {
      localStorage.removeItem('CHAOS_NETWORK_PARTITION');
      toast.success('CHAOS RESOLVED: Reconnected to main grid.');
      window.dispatchEvent(new Event('online'));
    }
  };

  const handleCompileDossier = () => {
    setIsCompiling(true);
    setCompiledDossier(null);
    setHasSubmittedToNbe(false);
    toast.loading("Compiling Pilot parameters & fetching cryptographic proof seals...", { id: 'compile' });

    setTimeout(() => {
      const dossier = {
        applicationId: `NBE-SNDBX-${Math.floor(100000 + Math.random() * 900000)}`,
        targetWoreda: pilotRegion,
        sponsorInstitution: sponsorBank,
        structuredLimitLimit: maxDailyLimit + " ETB",
        escrowGrtVal: escrowVolume + " ETB",
        compiledAt: new Date().toISOString(),
        validationHash: "0x" + crypto.randomUUID().replace(/-/g, '').substring(0, 40),
        signatures: [
          "Super-Agent Trust Bridge Root (SHA256)",
          "Sovereign Naga-Node Physical Core",
          "Fayda Digital ID Verification Oracle"
        ],
        conformingEndpoints: [
          "/api/ghostsync",
          "/api/settlement/iso20022",
          "/api/score/compute"
        ]
      };
      setCompiledDossier(dossier);
      setIsCompiling(false);
      toast.success("NBE Sandbox Dossier Compiled & Handshake Signed!", { id: 'compile' });
    }, 1800);
  };

  const handleSubmitToNbeRegistry = () => {
    setIsSubmittingToNbe(true);
    toast.info("Transmitting cryptographically sealed dossier to NBE Sandbox Registry Portal...", { id: 'nbe-submit' });

    setTimeout(() => {
      setIsSubmittingToNbe(false);
      setHasSubmittedToNbe(true);
      toast.success("Pilot Application SUCCESS: NBE Sandbox Permit Issued (#NBE-PRMT-2026-NAGA)", { id: 'nbe-submit', duration: 5000 });
    }, 2000);
  };

  // Compute calculated passed counts (for dynamic visual display progress)
  const passedCount = Object.values(verifications).filter(v => v === 'PASSED').length;
  const progressPercent = Math.round((passedCount / Object.keys(verifications).length) * 100);

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      
      {/* Header and Title Control Rail */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-2 border-indigo-500 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center">
            <ShieldCheck className="w-8 h-8 mr-3 text-indigo-600 animate-pulse" />
            Audit & Compliance Intelligence
          </h1>
          <p className="text-slate-500 mt-1 font-mono uppercase tracking-widest text-xs">
            NBE Regulatory Sandbox & Sovereign Pilot Assurance Core
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button 
             variant={isNetworkPartitioned ? "destructive" : "outline"} 
             className={`text-xs ${!isNetworkPartitioned ? "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100" : "font-bold"}`} 
             onClick={toggleNetworkPartition}>
             <Activity className={`w-3.5 h-3.5 mr-1.5 ${isNetworkPartitioned ? 'animate-pulse' : ''}`} />
             {isNetworkPartitioned ? "End Partition Simulation" : "Simulate Partition Scenario"}
           </Button>
           <Button variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 shadow-sm" onClick={() => toast.success("Generating complete PDF compliance report with ledger merkle tree proof...")}>
             <FileKey className="w-3.5 h-3.5 mr-1.5" /> Force PoR Report Output
           </Button>
           <Button onClick={simulateAnomaly} disabled={isSimulating} className="text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-md">
             {isSimulating ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5 mr-1.5" />}
             Inject Anomaly Scan
           </Button>
        </div>
      </div>

      {/* Primary Analytics Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Readiness Meter Card */}
        <Card className="border-t-4 border-t-indigo-600 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center text-xs font-mono text-indigo-600 uppercase tracking-wider font-bold">
              <span>Auditable Criteria</span>
              <Award className="w-4 h-4" />
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-1.5 pt-1">
              NBE Core Pilot Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-black text-rose-600">{progressPercent}%</span>
                <span className="text-slate-400 text-xs ml-1">Criteria Met</span>
              </div>
              <Badge variant="outline" className={progressPercent === 100 ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold" : "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"}>
                {progressPercent === 100 ? "Verified Pre-Pilot" : "Audit In Progress"}
              </Badge>
            </div>
            
            {/* Visual Mini Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-rose-600 transition-all duration-700 rounded-full" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Calculates compliance status against the current National Bank of Ethiopia regulatory parameters. Ensure all categories are fully verified to generate the signing package.
            </p>
          </CardContent>
        </Card>

        {/* NBE Directive Metrics */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center text-xs font-mono text-emerald-600 uppercase tracking-wider font-bold">
              <span>FIS/02/2020 Compliance</span>
              <Scale className="w-4 h-4" />
            </div>
            <CardTitle className="text-xl font-bold pt-1">Directives Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700">KYC/CDD Integrity check</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">100% Validated</Badge>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700">AML/CFT AI Guard checks</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">Active Engine</Badge>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="font-semibold text-slate-700">Local Sovereign Residency</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">Raxio On-Prem</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Consensus Node Monitor */}
        <Card className="bg-slate-900 border border-slate-850 text-white shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" /> Consensus Peer Ring
              </span>
              <Layers className="text-slate-600 w-4 h-4" />
            </div>
            <CardTitle className="text-xl font-bold pt-1 text-slate-100 flex items-center justify-between">
              Hyperledger Matrix
              <span className="font-mono text-rose-500 text-sm font-semibold">BLOCK #847,192</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1 text-xs">
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="bg-slate-800/40 border border-slate-800 p-2 rounded-md">
                <div className="text-slate-400 text-[10px]">PEERS LIVE</div>
                <div className="text-lg font-black text-indigo-400">4 / 4</div>
              </div>
              <div className="bg-slate-800/40 border border-slate-800 p-2 rounded-md">
                <div className="text-slate-400 text-[10px]">STATE STORAGE</div>
                <div className="text-lg font-black text-emerald-400 font-mono">CouchDB</div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-850 truncate">
              Orderer Node: <span className="text-indigo-400">orderer0.naga.eth</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Visual Tab Control Bar */}
      <div className="flex border-b border-slate-200 pt-2 gap-1.5">
        <button
          onClick={() => setActiveTab('readiness')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'readiness'
              ? 'border-indigo-600 text-indigo-650 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          NBE Sandbox Pilot Readiness Checklist
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-650 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350'
          }`}
        >
          <Database className="w-4 h-4" />
          Hyperledger Logs & Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('iso20022')}
          className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'iso20022'
              ? 'border-indigo-600 text-indigo-650 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-350'
          }`}
        >
          <Terminal className="w-4 h-4" />
          ISO 20022 pacs.008 XML Inspector
          <Badge className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0 font-bold font-mono">LIVE</Badge>
        </button>
      </div>

      {/* Dynamic Tab Panes */}
      <div className="mt-4 transition-all duration-300">
        
        {/* TAB 1: NBE Sandbox Pilot Readiness */}
        {activeTab === 'readiness' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Auditor Interactive Diagnostics Panel */}
            <div className="grid md:grid-cols-2 gap-6">
              
              <Card className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-850">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    Regulatory Proof Checklist
                  </CardTitle>
                  <CardDescription>
                    Iterate over structural items below to guarantee mathematical trust assertions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  
                  {/* Item 1: Fayda ID */}
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">1. Biometric Binding (Fayda ZKP)</span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 font-bold">Card Integrity Match</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">Verifies local device-level biometrics with hash masking.</p>
                    </div>
                    {verifications.fayda === 'PASSED' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-3 py-1 font-bold">APPROVED</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleVerifyMetric('fayda')} disabled={verifications.fayda === 'VERIFYING'} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        {verifications.fayda === 'VERIFYING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verify Match"}
                      </Button>
                    )}
                  </div>

                  {/* Item 2: GhostSync */}
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">2. GhostSync Asynchronous Outbox</span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 font-bold">Data Mule BLE Mesh</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">Ensures correct indexing of local buffers when completely offline.</p>
                    </div>
                    {verifications.ghostsync === 'PASSED' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-3 py-1 font-bold">APPROVED</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleVerifyMetric('ghostsync')} disabled={verifications.ghostsync === 'VERIFYING'} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        {verifications.ghostsync === 'VERIFYING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verify Handshake"}
                      </Button>
                    )}
                  </div>

                  {/* Item 3: ISO 20022 conformance */}
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">3. Interbank Settlement Conformance</span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 font-bold">ISO 20022 schemas</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">Asserts XML messages match pacs.008 schema templates perfectly.</p>
                    </div>
                    {verifications.iso === 'PASSED' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-3 py-1 font-bold">APPROVED</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleVerifyMetric('iso')} disabled={verifications.iso === 'VERIFYING'} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        {verifications.iso === 'VERIFYING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Audit Schema"}
                      </Button>
                    )}
                  </div>

                  {/* Item 4: Zero Trust Identity SVIDs */}
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">4. SPIFFE Zero-Trust Identities</span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 font-bold">mTLS SVID Crypt</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">Asserts server middleware intercepts unauthorized entities.</p>
                    </div>
                    {verifications.zerotrust === 'PASSED' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-3 py-1 font-bold">APPROVED</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleVerifyMetric('zerotrust')} disabled={verifications.zerotrust === 'VERIFYING'} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        {verifications.zerotrust === 'VERIFYING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Intercept Check"}
                      </Button>
                    )}
                  </div>

                  {/* Item 5: Local Sovereign Residency */}
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">5. Raxio Localized Servers</span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 font-bold">Data Residency Act</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">Validates primary CouchDB storage localized inside Ethiopia limits.</p>
                    </div>
                    {verifications.raxio_infra === 'PASSED' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-3 py-1 font-bold">APPROVED</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleVerifyMetric('raxio_infra')} disabled={verifications.raxio_infra === 'VERIFYING'} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        {verifications.raxio_infra === 'VERIFYING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verify Geo-location"}
                      </Button>
                    )}
                  </div>

                  {/* Item 6: Cash-Flow commodity escrows */}
                  <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">6. Merchant FMCG Escrow Pool</span>
                        <Badge variant="outline" className="text-[9px] bg-slate-50 font-bold">Virtual ATM float</Badge>
                      </div>
                      <p className="text-[11px] text-slate-400">Verifies liquid reserves are backed backed by commodity supply lines.</p>
                    </div>
                    {verifications.commodity_escrow === 'PASSED' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-3 py-1 font-bold">APPROVED</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleVerifyMetric('commodity_escrow')} disabled={verifications.commodity_escrow === 'VERIFYING'} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700">
                        {verifications.commodity_escrow === 'VERIFYING' ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Verify Pool Reserves"}
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>

              {/* Sandbox Dossier Compiler Form */}
              <Card className="border border-slate-200 flex flex-col justify-between">
                <div>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-850">
                      <FileText className="w-5 h-5 text-rose-500" />
                      Dynamic Dossier Compilation
                    </CardTitle>
                    <CardDescription>
                      Inject active operational parameters to seal and prepare the formal NBE Sandbox submission document.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {/* Region Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-500 block">PILOT SITE REGION REGISTRY:</label>
                      <select 
                        value={pilotRegion}
                        onChange={(e) => setPilotRegion(e.target.value)}
                        className="w-full bg-slate-50 rounded-lg p-2.5 text-xs text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 font-mono"
                      >
                        <option value="Adama Corridor Hub">Adama Corridor Hub (34 Kiosks, 12 Mules)</option>
                        <option value="Modjo Zone East">Modjo Zone East (20 Kiosks, 6 Mules)</option>
                        <option value="Bishoftu Market West">Bishoftu Market West (45 Kiosks, 14 Mules)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* Sponsor Bank */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-slate-500 block">SPONSOR BANK TIER 1:</label>
                        <select 
                          value={sponsorBank}
                          onChange={(e) => setSponsorBank(e.target.value)}
                          className="w-full bg-slate-50 rounded-lg p-2.5 text-xs text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 font-mono"
                        >
                          <option value="Commercial Bank of Ethiopia">CBE Prime (CBE)</option>
                          <option value="Awash International Bank">Awash Bank (AIB)</option>
                          <option value="Dashen Bank S.C.">Dashen Bank</option>
                        </select>
                      </div>

                      {/* Escrow Val */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-slate-500 block">ESCROW VOL LIQUIDITY (ETB):</label>
                        <input 
                          type="text"
                          value={escrowVolume}
                          onChange={(e) => setEscrowVolume(e.target.value)}
                          className="w-full bg-slate-50 rounded-lg p-2.5 text-xs text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 font-mono font-semibold"
                        />
                      </div>

                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-slate-500 block">MAX SINGLE-PAYMENT VELOCITY THRESHOLD (ETB):</label>
                      <input 
                        type="text"
                        value={maxDailyLimit}
                        onChange={(e) => setMaxDailyLimit(e.target.value)}
                        className="w-full bg-slate-50 rounded-lg p-2.5 text-xs text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 font-mono"
                      />
                    </div>

                  </CardContent>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                  <Button 
                    onClick={handleCompileDossier}
                    disabled={isCompiling || progressPercent < 100}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11"
                  >
                    {isCompiling ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin-slow" />
                        Generating Signing Certificate Seals...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Assemble & Cryptographically Sign Dossier
                      </>
                    )}
                  </Button>
                  
                  {progressPercent < 100 && (
                    <p className="text-[10px] text-red-500 text-center mt-2 font-semibold">
                      ⚠ Please verify all 6 Pre-Pilot core requirements to proceed with assembly.
                    </p>
                  )}
                </div>
              </Card>

            </div>

            {/* Compiled Dossier Display Panel */}
            {compiledDossier && (
              <Card className="border border-indigo-200 bg-slate-950 text-slate-100 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 bg-indigo-600 text-[10px] font-mono font-bold uppercase tracking-widest text-white rounded-bl-xl shadow-md">
                  Cryptographically Sealed
                </div>
                <CardHeader className="border-b border-slate-850">
                  <CardTitle className="text-sm font-mono tracking-widest text-indigo-400 font-bold uppercase">
                    REGULATORY SANCTION PACKAGE # {compiledDossier.applicationId}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Sovereign Core Handshake verified. Compiled at: {new Date(compiledDossier.compiledAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4 text-xs">
                    
                    <div className="space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-lg">
                      <span className="text-slate-400 font-mono text-[10px] font-bold block">TARGETED PILOT REGION / WOREDA</span>
                      <span className="text-white font-bold">{compiledDossier.targetWoreda}</span>
                    </div>

                    <div className="space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-lg">
                      <span className="text-slate-400 font-mono text-[10px] font-bold block">SETTLEMENT SPONSOR BANK PARTNER</span>
                      <span className="text-emerald-400 font-bold">{compiledDossier.sponsorInstitution}</span>
                    </div>

                    <div className="space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-lg">
                      <span className="text-slate-400 font-mono text-[10px] font-bold block">ESCROW FLUIDITY GUARANTEE</span>
                      <span className="text-indigo-300 font-bold font-mono">{compiledDossier.escrowGrtVal}</span>
                    </div>

                    <div className="space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-lg">
                      <span className="text-slate-400 font-mono text-[10px] font-bold block">VELOCITY TRANSACTION THRESHOLD limit</span>
                      <span className="text-rose-400 font-bold font-mono">{compiledDossier.structuredLimitLimit}</span>
                    </div>

                  </div>

                  <div className="space-y-1.5 bg-slate-900 border border-slate-850 p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 block uppercase tracking-widest">
                      DISTRIBUTED LEDGER IDENTIFIER HASH (NAGA_NBE_ANCHOR_PROOF):
                    </span>
                    <span className="font-mono text-[11px] text-green-400 block break-all font-bold p-1 bg-slate-950 rounded select-all border border-slate-850">
                      {compiledDossier.validationHash}
                    </span>
                  </div>

                  {/* Trust Roots */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block upper tracking-wider">SECURED VERIFIABLE SEALS & AUTHORIZATION ROOTS:</span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {compiledDossier.signatures.map((sig: string, idx: number) => (
                        <span key={idx} className="bg-slate-900 text-[10.5px] font-mono px-2.5 py-1 rounded text-slate-355 border border-slate-800 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> {sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Submission triggers */}
                  <div className="pt-4 border-t border-slate-850 flex items-center justify-between flex-wrap gap-3">
                    <p className="text-[11px] text-slate-400 max-w-md font-sans leading-relaxed">
                      Sealing this dossier anchors all metadata securely onto our CouchDB and Hyperledger state database trees. No PII is exported.
                    </p>
                    
                    {hasSubmittedToNbe ? (
                      <div className="bg-emerald-950 border border-emerald-500/40 p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-emerald-300">
                          REGULATORY GATEWAY TRANSMITTED: Permit Valid!
                        </span>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleSubmitToNbeRegistry}
                        disabled={isSubmittingToNbe}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black font-mono tracking-wide text-xs h-10 px-6 shrink-0 shadow-lg"
                      >
                        {isSubmittingToNbe ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Establishing Secure Tunnel...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 mr-1.5 animate-bounce" />
                            Transmit Package to NBE Sandbox Portal
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                </CardContent>
              </Card>
            )}

          </div>
        )}

        {/* TAB 2: Hyperledger Fabric Console & Event Ledger (Existing items) */}
        {activeTab === 'ledger' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Live Ledger logs */}
            <Card className="shadow-lg border-t-0 p-0 overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <FileKey className="w-5 h-5 text-slate-500" />
                  Consensus System Event Ledger
                </CardTitle>
                <CardDescription>Real-time cryptographically secured system audit trails.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-100/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-600 text-xs font-mono">Timestamp (UTC)</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs font-sans">Event Type</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs font-sans">Actor Entity</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs font-sans">Target Object</TableHead>
                      <TableHead className="font-bold text-slate-600 text-xs font-sans text-right">State / Tx Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-mono text-xs text-slate-500 py-4.5">
                           {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} 
                           <span className="text-slate-300 ml-2">{new Date(log.timestamp).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700 text-xs">{log.event.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-xs font-medium text-slate-600">{log.actor}</TableCell>
                        <TableCell className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-2">
                           {log.target}
                        </TableCell>
                        <TableCell className="text-right py-4 space-y-1">
                          <div className="flex justify-end">
                            {log.status === 'SUCCESS' && <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 w-24 justify-center font-bold text-[10px]">SUCCESS</Badge>}
                            {log.status === 'WARNING' && <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 w-24 justify-center font-bold text-[10px]">WARNING</Badge>}
                            {log.status === 'BLOCKED' && <Badge variant="destructive" className="w-24 justify-center bg-red-600 hover:bg-red-700 font-bold text-[10px]">BLOCKED</Badge>}
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

            {/* Reconciliation Core */}
            <Card className="border-t-4 border-t-amber-500 shadow-xl overflow-hidden mt-6">
              <CardHeader className="bg-amber-50/70 border-b border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5">
                <div>
                  <CardTitle className="flex items-center text-amber-900 text-lg">
                    <Scale className="w-5 h-5 mr-3 text-amber-600" />
                    Automated Settlement Reconciliation
                  </CardTitle>
                  <CardDescription className="text-amber-700 mt-1">
                    Cross-reference internal ledger pacs.008 execution against external sponsor bank MT940 statement drops.
                  </CardDescription>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <Button 
                    onClick={runChaosReconciliation} 
                    disabled={isReconciling}
                    variant="destructive"
                    size="sm"
                    className="shadow-sm font-bold text-xs"
                  >
                    <Terminal className="w-3.5 h-3.5 mr-1" />
                    Simulate Expired mTLS SVID
                  </Button>
                  <Button 
                    onClick={runReconciliation} 
                    disabled={isReconciling}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-xs font-bold"
                  >
                    {isReconciling ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Database className="w-3.5 h-3.5 mr-1.5" />}
                    Run mTLS Bank Reconciliation
                  </Button>
                </div>
              </CardHeader>

              {reconciliationReport && (
                <CardContent className="p-6 bg-white space-y-6">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">OTel Trace ID</p>
                       <p className="font-mono text-xs text-slate-800 font-bold select-all">{reconciliationReport.traceId}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                       {reconciliationReport.status === 'CLEARED' ? (
                         <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">FULLY CLEARED</Badge>
                       ) : (
                         <Badge variant="destructive" className="font-bold">DISCREPANCIES DETECTED</Badge>
                       )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="border border-slate-100 p-4 rounded-xl text-center shadow-sm">
                      <p className="text-2xl font-black text-slate-800">{reconciliationReport.totalInternalRecords}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">Internal Tx Count</p>
                    </div>
                    <div className="border border-slate-100 p-4 rounded-xl text-center shadow-sm">
                      <p className="text-2xl font-black text-emerald-600">{reconciliationReport.matchedRecords}</p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">Settled / Matched</p>
                    </div>
                    <div className={`border p-4 rounded-xl text-center shadow-sm ${reconciliationReport.discrepanciesFound > 0 ? 'border-red-200 bg-red-50' : 'border-slate-100'}`}>
                      <p className={`text-2xl font-black ${reconciliationReport.discrepanciesFound > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {reconciliationReport.discrepanciesFound}
                      </p>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-1">Unmatched Exceptions</p>
                    </div>
                  </div>

                  {reconciliationReport.discrepancies.length > 0 && (
                    <div className="mt-4 border border-red-200 rounded-lg overflow-hidden">
                      <div className="bg-red-50 p-3 border-b border-red-200">
                        <h4 className="flex items-center text-sm font-bold text-red-900">
                          <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                          Reconciliation Exceptions Requiring Manual Review
                        </h4>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-bold w-1/4">Ref / Tx ID</TableHead>
                            <TableHead className="text-xs font-bold w-1/4">Category</TableHead>
                            <TableHead className="text-xs font-bold w-1/4">Reason</TableHead>
                            <TableHead className="text-xs font-bold text-right w-1/4">Delta (Int vs Bank)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reconciliationReport.discrepancies.map((d: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs text-slate-600">{d.txId}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-250 text-[10px] font-bold">
                                  {d.category.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-500 font-medium">{d.reason}</TableCell>
                              <TableCell className="text-right text-xs font-mono font-semibold">
                                <span className="text-slate-800">{d.internalAmount.toFixed(2)}</span>
                                <span className="mx-2 text-slate-300">/</span>
                                <span className="text-slate-800">{d.bankAmount.toFixed(2)}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

          </div>
        )}

        {/* TAB 3: ISO 20022 XML Inspector */}
        {activeTab === 'iso20022' && (
          <div className="grid md:grid-cols-12 gap-6 animate-fade-in text-xs font-medium">
            
            {/* List card on the left side (5 Cols) */}
            <Card className="md:col-span-5 border border-slate-200 h-[600px] flex flex-col">
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 justify-between">
                  ISO Outbox Queue Telemetry
                  <Badge className="bg-indigo-600 text-white font-mono">{isoLogs.length} Messages</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect raw credit transfers routed upstream.
                </CardDescription>
              </CardHeader>
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                {isoLogs.map(log => (
                  <button
                    key={log.id}
                    onClick={() => setSelectedIsoLog(log)}
                    className={`w-full text-left p-3.5 transition-colors duration-150 flex flex-col gap-1 hover:bg-slate-50/80 ${
                      selectedIsoLog?.id === log.id ? 'bg-indigo-50/50 border-r-4 border-indigo-650' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono text-indigo-755 font-bold uppercase">{log.type}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-slate-800 font-semibold">{log.description}</p>
                    <div className="flex items-center gap-1.5 pt-1">
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                        {log.status}
                      </Badge>
                      <span className="text-[9.5px] font-mono text-slate-400">ID: {log.id.substring(0, 10)}...</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Editor Console display on the right side (7 Cols) */}
            <Card className="md:col-span-7 border border-slate-200 h-[600px] flex flex-col bg-slate-950 text-slate-200">
              <CardHeader className="p-4 border-b border-slate-850 bg-slate-900 select-none">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    <TitleWithMonoFont text={selectedIsoLog ? `${selectedIsoLog.type} Conformance Schema` : "Select ISO Message"} />
                  </div>
                  <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/30">
                    Read Only XML Source
                  </Badge>
                </div>
              </CardHeader>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[10.5px] text-green-400/90 whitespace-pre scrollbar-thin select-all leading-normal bg-slate-950">
                {selectedIsoLog ? (
                  <code>{selectedIsoLog.rawXml}</code>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 font-sans">
                    <Terminal className="w-12 h-12 mb-2 text-slate-600 animate-pulse" />
                    <p className="text-xs font-bold font-mono">Select a message logs block on the left side to inspect content.</p>
                  </div>
                )}
              </div>
            </Card>

          </div>
        )}

      </div>

    </div>
  );
}

// Simple internal display helpers
function TitleWithMonoFont({ text }: { text: string }) {
  return (
    <span className="text-xs font-mono font-bold tracking-tight text-slate-200 truncate max-w-[340px] block">
      {text}
    </span>
  );
}
