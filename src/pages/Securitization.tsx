import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Landmark, PieChart, ShieldCheck, FileCheck2, Activity, RefreshCw, Hexagon, Banknote, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

const trancheData = [
  { name: 'Class A (Senior)', yield: '6-8%', volume: 600000, color: '#3b82f6', rating: 'ESX-AAA', active: true },
  { name: 'Class B (Mezzanine)', yield: '12-16%', volume: 300000, color: '#f59e0b', rating: 'ESX-BBB', active: true },
  { name: 'Class C (Equity)', yield: 'Residual', volume: 100000, color: '#10b981', rating: 'Unrated', active: true },
];

export default function Securitization() {
  const [isPackaging, setIsPackaging] = useState(false);
  const [poolSize, setPoolSize] = useState(842500); // starts under target
  const targetSize = 1000000;
  
  const packageNewAssets = () => {
    setIsPackaging(true);
    toast.info("Scanning Sovereign node for Ardi > 70 seasoned assets...");
    
    setTimeout(() => {
       const newAssets = Math.floor(Math.random() * 50000) + 10000;
       setPoolSize(prev => Math.min(prev + newAssets, targetSize));
       toast.success(`Successfully packaged $${newAssets.toLocaleString()} of prime agricultural micro-assets into the SPV vault.`);
       setIsPackaging(false);
    }, 2500);
  };
  
  const poolProgress = (poolSize / targetSize) * 100;
  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 border-b-2 border-indigo-500 pb-2 inline-block">Securitization SPV Engine</h1>
          <p className="text-slate-500 mt-3 font-semibold uppercase tracking-widest text-xs">Project: Diaspora & Carbon Match Bond • ESX Capital Markets</p>
        </div>
        <div className="flex space-x-2">
          <Badge variant="outline" className={`px-4 py-1.5 h-fit text-sm font-bold shadow-sm ${poolSize >= targetSize ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-indigo-500 text-indigo-700 bg-indigo-50'}`}>
            {poolSize >= targetSize ? 'ESX Ready - Pool Filled' : 'Accumulating P2G Flows'}
          </Badge>
          <Button onClick={packageNewAssets} disabled={isPackaging || poolSize >= targetSize} className="bg-indigo-600 hover:bg-indigo-700 w-56">
            {isPackaging ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Hexagon className="w-4 h-4 mr-2" />}
            {poolSize >= targetSize ? 'Target Reached' : 'Sweep Carbon/Diaspora Flow'}
          </Button>
        </div>
      </div>
      
      {/* Pool Accumulation Progress */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
         <div className="flex justify-between items-end mb-2">
            <div>
               <p className="text-sm font-bold text-slate-800">SPV Vault Accumulation</p>
               <p className="text-xs text-slate-500">Gross Principal Balance sourced from Carbon tCO₂e and Diaspora Wallets (ETB equivalent)</p>
            </div>
            <div className="text-right">
               <p className="text-2xl font-black text-indigo-600">${poolSize.toLocaleString()} <span className="text-sm text-slate-400 font-medium">/ ${(targetSize).toLocaleString()}</span></p>
            </div>
         </div>
         <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
             <div 
               className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-1000 ease-out" 
               style={{ width: `${poolProgress}%` }}
             />
         </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <Card className="md:col-span-2 border-t-4 border-t-indigo-500 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
               <PieChart className="w-5 h-5 mr-2 text-indigo-500" />
               Tranche Waterfall Structure
            </CardTitle>
            <CardDescription>Risk-adjusted stratification for institutional ESX investors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {trancheData.map((t, i) => (
               <div key={i} className="border p-4 rounded-xl flex justify-between items-center relative overflow-hidden bg-slate-50/50 hover:bg-white transition-colors">
                 <div className="absolute left-0 top-0 bottom-0 w-2" style={{backgroundColor: t.color}} />
                 <div className="ml-4 flex-1">
                   <div className="flex items-center">
                      <p className="font-bold text-slate-800">{t.name}</p>
                      <Badge variant="secondary" className="ml-2 text-[10px] font-bold bg-slate-200 text-slate-700">{t.rating}</Badge>
                   </div>
                   <p className="text-sm text-slate-500 mt-1">Target Yield: <span className="font-semibold text-slate-700">{t.yield}</span></p>
                 </div>
                 <div className="text-right">
                   <p className="font-mono font-black text-xl text-slate-800">${(t.volume).toLocaleString()}</p>
                   <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Target Allocation</p>
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white md:col-span-2 shadow-xl border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-emerald-500/10 rounded-bl-2xl border-b border-l border-emerald-500/20">
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center">
                <ShieldCheck className="w-3 h-3 mr-1" /> Automated Risk Filter Active
             </span>
          </div>
          <CardHeader>
             <CardTitle className="flex items-center text-slate-100">
               <Banknote className="w-5 h-5 mr-2 text-indigo-400" />
               Credit Enhancement & Filters
             </CardTitle>
             <CardDescription className="text-slate-400">Ardi Score algorithmic underwriting criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:border-emerald-500/50 transition-colors">
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 flex items-center">
                   <ShieldAlert className="w-3 h-3 mr-1" /> Min Ardi Score
                 </p>
                 <p className="text-3xl font-black text-emerald-400">≥ 70</p>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Reserve Account</p>
                 <p className="text-3xl font-black text-blue-400">3-6%</p>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Asset Seasoning</p>
                 <p className="text-2xl font-black text-white mt-1">≥ 30 Days</p>
               </div>
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 border-r-4 border-r-indigo-500">
                 <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Overcollateralization</p>
                 <p className="text-2xl font-black text-white mt-1">5-10% Target</p>
               </div>
             </div>
             
             <div className="border-t border-slate-700 pt-5 mt-2">
               <p className="text-sm font-medium flex items-center mb-2 text-slate-300">
                 <FileCheck2 className="w-4 h-4 mr-2 text-indigo-400" />
                 Proof of Reserve (PoR) Hash Lock
               </p>
               <div className="bg-black/50 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-500 break-all flex justify-between items-center group cursor-pointer hover:text-emerald-400 transition-colors">
                 <span>0x4b7f94d3c90e1a2f6b8d9c0e2f5a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a</span>
                 <RefreshCw className="w-3 h-3 opacity-0 group-hover:opacity-100" />
               </div>
               <p className="text-[10px] text-slate-500 mt-2 text-right">Anchored to Polygon ZK via Hyperledger Bridge</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
