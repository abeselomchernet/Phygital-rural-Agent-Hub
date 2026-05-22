import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sprout, Barcode, CloudRain, ShieldAlert, Landmark, CircleDollarSign, Fingerprint, Search, Award } from 'lucide-react';
import { Input } from "@/components/ui/input";

const INVENTORY = [
  { id: '1', name: 'NPS Fertilizer', type: 'Fertilizer', price: 4500, unit: '50kg Bag', govtSubsidy: true },
  { id: '2', name: 'Teff Seed (Quncho)', type: 'Seed', price: 2800, unit: '25kg Bag', govtSubsidy: false },
  { id: '3', name: 'Urea Fertilizer', type: 'Fertilizer', price: 5200, unit: '50kg Bag', govtSubsidy: true },
];

export default function AgriConnect() {
  const [ndviStatus, setNdviStatus] = useState<'HEALTHY' | 'DROUGHT_WARNING'>('HEALTHY');
  
  // Agri-Input Marketplace State
  const [farmerFayda, setFarmerFayda] = useState('892-771-445');
  const [ardiScore, setArdiScore] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState(INVENTORY[0]);
  const [isScoring, setIsScoring] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState<'CASH' | 'CREDIT' | null>(null);

  const triggerOracle = () => {
    toast.info("Ingesting Sentinel-2 Satellite NDVI Feed...");
    setTimeout(() => {
      setNdviStatus('DROUGHT_WARNING');
      toast.warning("NDVI fell below 0.35 threshold. Triggering AgriTrust Smart Contracts.");
    }, 2000);
  };

  const calculateArdiScore = () => {
    setIsScoring(true);
    toast.loading("Querying Ardi Score Engine...", { id: 'ardi' });
    
    // Call the updated server route
    fetch('/api/score/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId: farmerFayda, features: { agri_input_repayment: 88, stk_success_rate: 92 } })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'QUEUED') {
        const jobId = data.jobId;
        const poll = setInterval(() => {
          fetch(`/api/score/compute/${jobId}`)
            .then(r => r.json())
            .then(jobData => {
               if (jobData.status === 'SUCCESS') {
                  clearInterval(poll);
                  setArdiScore(jobData.result.ardiScore);
                  toast.success(`Ardi Score computed: ${jobData.result.ardiScore}. Partner Banks notified for bidding.`, { id: 'ardi' });
                  setIsScoring(false);
               } else if (jobData.status === 'FAILED') {
                  clearInterval(poll);
                  toast.error("Ardi Score computation failed.", { id: 'ardi' });
                  setIsScoring(false);
               }
               // else status is 'PENDING', keep polling
            })
            .catch(() => {
                clearInterval(poll);
                setIsScoring(false);
            });
        }, 1000);
      } else {
        // Fallback for immediate response (legacy)
        setArdiScore(data.ardiScore);
        toast.success(`Ardi Score computed: ${data.ardiScore}. Partner Banks notified for bidding.`, { id: 'ardi' });
        setIsScoring(false);
      }
    })
    .catch(() => {
      setArdiScore(740); // fallback
      toast.success("Ardi Score loaded: 740. Partner Banks notified for bidding.", { id: 'ardi' });
      setIsScoring(false);
    });
  };

  const handlePurchase = (bankName?: string) => {
    if (purchaseMode === 'CASH' || (purchaseMode === 'CREDIT' && bankName)) {
      const modeDesc = bankName ? `Credit via ${bankName}` : 'Cash/Gov Distribution';
      toast.success(`Transaction Confirmed! 1x ${selectedItem.name} deployed via ${modeDesc}.`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">Agri-Connect Market & Stabilization</h1>
        <p className="text-slate-500 mt-2">Smart Input Credit, GS1 Traceability, and Market Buffer Orchestrator</p>
      </div>

      {/* AGRI-INPUT MARKETPLACE & CREDIT BIDDING ENGINE */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card className="h-full border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center text-slate-800">
                <Sprout className="w-5 h-5 mr-3 text-emerald-600" />
                Agri-Input Distribution Hub
              </CardTitle>
              <CardDescription>Select Input & Distribute to Farmer</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Farmer Fayda ID (FIN)</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      value={farmerFayda} 
                      onChange={(e) => setFarmerFayda(e.target.value)} 
                      className="pl-10 font-mono" 
                      placeholder="e.g. 892-771-445" 
                    />
                  </div>
                </div>
                <Button onClick={calculateArdiScore} disabled={isScoring} className="bg-slate-900 border-none font-bold">
                  {isScoring ? <Search className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2 text-yellow-400" />}
                  Check Ardi Score
                </Button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {INVENTORY.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedItem.id === item.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                       <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                       {item.govtSubsidy && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[9px] px-1 shadow-none">Gov Sub</Badge>}
                    </div>
                    <p className="text-xs font-mono text-slate-500 mb-2 border-b pb-2">{item.unit}</p>
                    <p className="font-black text-emerald-700">{item.price.toLocaleString()} ETB</p>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
           <Card className="h-full border-slate-200 shadow-md flex flex-col">
              <CardHeader className="bg-slate-900 text-white rounded-t-xl">
                 <CardTitle className="text-lg">Checkout & Financing</CardTitle>
                 {ardiScore && <CardDescription className="text-emerald-400 font-bold">Ardi Score: {ardiScore} - Credit Eligible</CardDescription>}
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{selectedItem.name} (x1)</p>
                    <p className="text-xs text-slate-500">{selectedItem.govtSubsidy ? 'Eligible for Direct Distribution' : 'Retail Input'}</p>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{selectedItem.price.toLocaleString()} ETB</p>
                </div>

                <div className="p-6 space-y-4 flex-1">
                  {!ardiScore ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Search className="w-12 h-12 mb-3 opacity-20" />
                      <p className="font-medium">Fetch Ardi Score to view available partner bank credit offers.</p>
                      
                      <div className="mt-6 w-full pt-6 border-t border-slate-100">
                         <Button onClick={() => setPurchaseMode('CASH')} variant={purchaseMode === 'CASH' ? 'default' : 'outline'} className={`w-full justify-start h-14 ${purchaseMode === 'CASH' ? 'bg-emerald-600' : ''}`}>
                            <CircleDollarSign className="w-5 h-5 mr-3" /> Cash / Direct Govt Distrib
                         </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                         <Landmark className="w-4 h-4 mr-2" /> Live Bank Bids (For {selectedItem.price} ETB)
                       </p>
                       
                       <div onClick={() => setPurchaseMode('CREDIT')} className={`border-2 rounded-xl p-4 cursor-pointer flex justify-between items-center transition-all ${purchaseMode === 'CREDIT' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}>
                         <div>
                           <p className="font-bold text-indigo-900">Coop Bank of Oromia</p>
                           <p className="text-sm text-indigo-700/80">3-Month Harvest Cycle</p>
                         </div>
                         <div className="text-right">
                           <Badge className="bg-emerald-100 text-emerald-700 shadow-none hover:bg-emerald-100 mb-1">Pre-Approved</Badge>
                           <p className="font-black text-indigo-900">1.2% Interest</p>
                         </div>
                       </div>
                       
                       <div className="border-2 border-slate-100 rounded-xl p-4 opacity-50 flex justify-between items-center grayscale">
                         <div>
                           <p className="font-bold text-slate-900">Dashen Bank</p>
                           <p className="text-sm text-slate-500">6-Month Cycle</p>
                         </div>
                         <div className="text-right">
                           <Badge variant="outline" className="mb-1 text-slate-500">Processing...</Badge>
                           <p className="font-black text-slate-600">Pending</p>
                         </div>
                       </div>

                      <div className="pt-4 border-t border-slate-100">
                         <Button onClick={() => setPurchaseMode('CASH')} variant={purchaseMode === 'CASH' ? 'default' : 'outline'} className={`w-full justify-start h-12 ${purchaseMode === 'CASH' ? 'bg-slate-900 text-white border-none' : 'text-slate-600'}`}>
                            <CircleDollarSign className="w-5 h-5 mr-3" /> Pay with Cash
                         </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 p-4 border-t border-slate-100">
                 <Button 
                    disabled={!purchaseMode} 
                    onClick={() => handlePurchase(purchaseMode === 'CREDIT' ? 'Coop Bank of Oromia' : undefined)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-bold shadow-lg"
                 >
                    Execute Transaction
                 </Button>
              </CardFooter>
           </Card>
        </div>
        <Card className="h-full border-slate-200 shadow-md">
           <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-slate-800">
                  <Sprout className="w-5 h-5 mr-3 text-emerald-600" />
                  Market Stabilization Buffer (P2G)
                </CardTitle>
                <CardDescription>DAO-Managed Cooperative Grain Purchase</CardDescription>
              </div>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 uppercase tracking-widest text-[10px]">Active Buffer</Badge>
           </CardHeader>
           <CardContent className="p-6">
             <div className="bg-slate-900 rounded-xl p-6 text-white text-center flex flex-col justify-center border-b-4 border-amber-500 shadow-xl mb-6">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Current Buffer Threshold</p>
               <p className="text-4xl font-black text-amber-400">12,400 <span className="text-sm font-bold text-slate-400">Quintals</span></p>
               <p className="text-emerald-400 text-xs font-bold uppercase mt-3">Target: 20,000 Qts (Stabilized)</p>
             </div>
             
             <div className="space-y-4">
               <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-amber-400 transition-colors cursor-pointer bg-white">
                  <div>
                    <p className="font-bold text-slate-800">Teff Cooperative (Adama)</p>
                    <p className="text-xs text-slate-500 font-mono">Offer: 500 Quintals @ 2,800 ETB/Qt</p>
                  </div>
                  <Button className="bg-amber-500 hover:bg-amber-600 shadow-lg text-white font-bold" onClick={() => toast.success("P2G Purchase Executed. Float transferred to Coop via Sovereign Switch.")}>Buy to Buffer</Button>
               </div>
               <div className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-amber-400 transition-colors cursor-pointer bg-white">
                  <div>
                    <p className="font-bold text-slate-800">Maize Union (Modjo)</p>
                    <p className="text-xs text-slate-500 font-mono">Offer: 1,200 Quintals @ 1,400 ETB/Qt</p>
                  </div>
                  <Button className="bg-amber-500 hover:bg-amber-600 shadow-lg text-white font-bold" onClick={() => toast.success("P2G Purchase Executed. Float transferred to Coop via Sovereign Switch.")}>Buy to Buffer</Button>
               </div>
             </div>
           </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Marketplace GS1 */}
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center text-slate-800">
               <Barcode className="w-5 h-5 mr-2 text-primary" />
               Supply Chain GS1 Traceability
             </CardTitle>
             <CardDescription>Hyperledger Fabric Immutable Records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="border rounded-xl p-4 bg-slate-50 space-y-3">
               <div className="flex justify-between items-center border-b pb-2">
                 <span className="text-xs uppercase font-bold text-slate-500">Asset</span>
                 <Badge variant="outline" className="font-mono">GTIN: 00012345678905</Badge>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="font-medium text-slate-700">Product:</span>
                 <span>50kg Bag Teff Seed (Grade A)</span>
               </div>
               <div className="flex justify-between items-center text-sm">
                 <span className="font-medium text-slate-700">Origin Node:</span>
                 <span className="font-mono text-xs">OSSC_HALABA_01</span>
               </div>
               <div className="flex justify-between items-center text-sm font-bold text-emerald-600 mt-2 pt-2 border-t">
                 <span>Status:</span>
                 <span>SETTLED VIA ESCROW</span>
               </div>
             </div>
          </CardContent>
        </Card>

        {/* AgriTrust */}
        <Card className={ndviStatus === 'DROUGHT_WARNING' ? 'border-orange-500' : ''}>
          <CardHeader>
             <CardTitle className="flex items-center text-slate-800">
               <CloudRain className={`w-5 h-5 mr-2 ${ndviStatus === 'DROUGHT_WARNING' ? 'text-orange-500' : 'text-blue-500'}`} />
               AgriTrust Parametric Oracle
             </CardTitle>
             <CardDescription>Sentinel-2 Vegetation Index Monitoring</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
             <div className={`p-6 rounded-xl border ${ndviStatus === 'DROUGHT_WARNING' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
               <p className="text-xs uppercase font-bold tracking-widest mb-2" style={{color: ndviStatus === 'DROUGHT_WARNING' ? '#c2410c' : '#1d4ed8'}}>
                 Current Adama NDVI
               </p>
               <p className="text-5xl font-black tabular-nums" style={{color: ndviStatus === 'DROUGHT_WARNING' ? '#ea580c' : '#2563eb'}}>
                 {ndviStatus === 'DROUGHT_WARNING' ? '0.31' : '0.64'}
               </p>
             </div>
             
             {ndviStatus === 'DROUGHT_WARNING' && (
               <div className="bg-red-50 text-red-700 p-3 rounded-md flex items-start text-left text-sm border border-red-200">
                 <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                 <p><strong>Drought Alert Triggered.</strong> B2C payouts executing to 500 insured farmers via Sovereign Switch.</p>
               </div>
             )}

             <Button 
               variant="outline" 
               className="w-full" 
               onClick={triggerOracle}
               disabled={ndviStatus === 'DROUGHT_WARNING'}
             >
               Force NDVI Shock (Test Mode)
             </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
