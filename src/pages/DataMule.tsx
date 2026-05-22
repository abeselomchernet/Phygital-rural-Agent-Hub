import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, WifiOff, RefreshCcw, ShieldCheck, Bluetooth } from 'lucide-react';

export default function DataMule() {
  const [meshStatus, setMeshStatus] = useState<'ISOLATED' | 'PEER_DISCOVERY' | 'SECURE_TUNNEL' | 'LEDGER_SETTLED'>('ISOLATED');
  const [offlineTxns, setOfflineTxns] = useState(142);
  const [mulePayload, setMulePayload] = useState(0);
  
  const handleMeshConnect = () => {
    setMeshStatus('PEER_DISCOVERY');
    toast.info("Initializing BLE/Wi-Fi Direct Peer Discovery...");
    setTimeout(() => {
      setMeshStatus('SECURE_TUNNEL');
      toast.success("Mutual Auth Complete. Encrypted Tunnel to Data Mule Established.");
    }, 2000);
  };

  const handlePullData = () => {
    toast.loading("Harvesting Encrypted Payloads from Agent...");
    setTimeout(() => {
      setMulePayload(offlineTxns);
      setOfflineTxns(0);
      toast.success(`Success! Transferred ${offlineTxns} JSON payloads into Mule Vault.`);
    }, 2500);
  };

  const handleCoreSync = () => {
     toast.loading("Mule reached Cellular Grid. Offloading to Sovereign Core...");
     setTimeout(() => {
        setMeshStatus('LEDGER_SETTLED');
        toast.success(`Settlement Complete: ${mulePayload} Transferred safely.`);
        setMulePayload(0);
     }, 3000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">Data Mule Protocol</h1>
        <p className="text-slate-500 mt-2">Delay-Tolerant Networking (DTN) for Zero-Connectivity Zones</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {/* Offline Node */}
        <Card className={`transition-all duration-500 ${meshStatus === 'ISOLATED' ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'opacity-80'}`}>
          <CardHeader>
            <CardTitle className="flex items-center text-slate-800">
              <WifiOff className="w-5 h-5 mr-3 text-amber-500" />
              Isolated Agent Node
            </CardTitle>
            <CardDescription>Zone: Bonga Rural (0% Connectivity)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center relative overflow-hidden">
               {meshStatus === 'PEER_DISCOVERY' && <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>}
               <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Encrypted Phantom Queue</p>
               <p className="text-5xl font-black text-slate-800">{offlineTxns}</p>
               <p className="text-xs text-slate-400 mt-2">Unsettled Payloads</p>
            </div>
            <Button 
               variant="outline" 
               className="w-full border-blue-200 text-blue-700 hover:bg-blue-50" 
               onClick={handleMeshConnect}
               disabled={meshStatus !== 'ISOLATED'}
            >
              <Bluetooth className="w-4 h-4 mr-2" />
              Broadcast BLE Beacon
            </Button>
          </CardContent>
        </Card>

        {/* Super Agent Mule */}
        <Card className={`transition-all duration-500 ${meshStatus === 'SECURE_TUNNEL' ? 'border-primary shadow-[0_0_20px_rgba(79,70,229,0.2)] scale-105' : meshStatus === 'PEER_DISCOVERY' ? 'border-blue-300 animate-pulse' : 'opacity-50 grayscale'}`}>
          <CardHeader>
            <CardTitle className="flex items-center text-primary">
              <Database className="w-5 h-5 mr-3" />
              Roaming Data Mule
            </CardTitle>
            <CardDescription>Supervisor Tablet (Mesh Enabled)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="p-6 bg-primary/10 border border-primary/20 rounded-xl text-center text-primary">
               <p className="text-xs uppercase tracking-widest font-bold mb-2">Transit Vault</p>
               <p className="text-5xl font-black">{mulePayload}</p>
               <p className="text-xs opacity-70 mt-2">Cryptographic Blobs</p>
             </div>
             <Button 
               className="w-full" 
               onClick={handlePullData}
               disabled={meshStatus !== 'SECURE_TUNNEL' || offlineTxns === 0}
             >
               Ingest Ledgers
             </Button>
          </CardContent>
        </Card>

        {/* Sovereign Switch */}
        <Card className={`transition-all duration-500 ${mulePayload > 0 ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'opacity-50 grayscale'}`}>
          <CardHeader>
            <CardTitle className="flex items-center text-emerald-600">
              <ShieldCheck className="w-5 h-5 mr-3" />
              Sovereign Switch
            </CardTitle>
            <CardDescription>Adama Branch (Grid Active)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col justify-end">
            <div className="p-6 border border-dashed border-emerald-200 rounded-xl text-center mb-auto">
               <p className="text-sm text-slate-500 mb-2">Awaiting Mule Arrival</p>
               {meshStatus === 'LEDGER_SETTLED' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">State: Synchronized</Badge>}
            </div>
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleCoreSync}
              disabled={mulePayload === 0}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Settle to Core Ledger
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
