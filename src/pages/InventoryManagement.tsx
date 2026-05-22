import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  PackageOpen, ArrowRight, Box, Boxes, Truck, MapPin, 
  CheckCircle2, Globe, BarChart3, ScanLine, ShieldCheck,
  Zap, Database, QrCode
} from 'lucide-react';

const dict = {
  EN: {
    title: "Physical Inventory Subsystem",
    subtitle: "Super-Agent Hubs, Tokenization & Last-Mile Dispatch",
    tabHubs: "Network Hubs",
    tabDispatch: "Agent Dispatch",
    tabTokenize: "Asset Tokenization",
    hubNode: "Primary Distribution Node",
    utilization: "Warehouse Utilization",
    stockHolding: "Cryptographically Verified Stock",
    pendingReqs: "Pending Restock Requests",
    liveReqs: "Live requests from standard agents over Ghost-Sync",
    ref: "Ref:",
    dispatchBtn: "Dispatch from Hub",
    dispatched: "Mule Dispatched",
    nps: "NPS Fertilizer",
    urea: "Urea Fertilizer",
    teff: "Teff Seed (Elite)",
    scanTitle: "Inventory Intake & Sandbox",
    scanDesc: "Simulate scanning a physical asset to anchor it to the ledger.",
    scanBtn: "Simulate QR Scan",
    tokenizing: "Anchoring to Ledger...",
    tokenSuccess: "Asset Cryptographically Anchored",
    sysStatus: "Integrity Status",
    synced: "Ghost-Synced"
  },
  AM: {
    title: "የግዙፍ እቃዎች አስተዳደር ንዑስ ስርዓት",
    subtitle: "የሱፐር-ወኪል ማዕከላት፣ ንብረት ምዝገባ እና የስርጭት አስተዳደር",
    tabHubs: "የማከፋፈያ ማዕከላት",
    tabDispatch: "የወኪል ስርጭት",
    tabTokenize: "ንብረት ምዝገባ (Tokenization)",
    hubNode: "ዋና የስርጭት ማዕከል",
    utilization: "የመጋዘን አጠቃቀም",
    stockHolding: "በዲጂታል የተረጋገጠ ክምችት",
    pendingReqs: "በጥበቃ ላይ ያሉ የእቃ ጥያቄዎች",
    liveReqs: "ከወኪሎች የመጡ የቀጥታ ጥያቄዎች (Ghost-Sync)",
    ref: "መለያ:",
    dispatchBtn: "ከማዕከል አሰራጭ",
    dispatched: "ስርጭት ተጀምሯል",
    nps: "NPS ማዳበሪያ",
    urea: "ዩሪያ ማዳበሪያ",
    teff: "የጤፍ ዘር (ምርጥ)",
    scanTitle: "የእቃ አገባብ ሰሙሌሽን",
    scanDesc: "አካላዊ ንብረትን ወደ ዲጂታል መዝገብ ለማስገባት ስካን ማድረግን ይሞክሩ።",
    scanBtn: "QR ስካን ይሞክሩ",
    tokenizing: "ወደ መዝገብ በማስገባት ላይ...",
    tokenSuccess: "ንብረቱ በዲጂታል መዝገብ ተረጋግጧል",
    sysStatus: "የስርዓት ደህንነት",
    synced: "Ghost-Synced"
  },
  OR: {
    title: "Sirna To'annoo Meeshaalee Qabatamaa",
    subtitle: "Wiirtulee Bakka Bu'oota Olaanaa, To'annoo fi Raabsaa",
    tabHubs: "Wiirtulee Raabsaa",
    tabDispatch: "Raabsaa Bakka Bu'ootaa",
    tabTokenize: "Galmee Qabeenyaa (Tokenization)",
    hubNode: "Wiirtuu Raabsaa Bu'uuraa",
    utilization: "Itti Fayyadama Kuusaa",
    stockHolding: "Kuusaa Dijiitaalaan Mirkanaa'e",
    pendingReqs: "Gaaffilee Meeshaa Eeggachaa Jiran",
    liveReqs: "Gaaffilee kallattii bakka bu'oota irraa (Ghost-Sync)",
    ref: "Ragaa:",
    dispatchBtn: "Wiirtuu Irraa Raabsi",
    dispatched: "Raabsaan Eegaleera",
    nps: "Xaa'oo NPS",
    urea: "Xaa'oo Yuuriyaa",
    teff: "Sanyii Xaafii (Filatamaa)",
    scanTitle: "Galmee Meeshaa fi Fakkeessii",
    scanDesc: "Qabeenya qabatamaa gara galmee dijiitaalaatti galchuuf iskaanii gochuu yaali.",
    scanBtn: "QR Iskaanii Yaali",
    tokenizing: "Galmee Dijiitaalaatti Galchaa Jira...",
    tokenSuccess: "Qabeenyichi Dijiitaalaan Mirkanaa'eera",
    sysStatus: "Nageenya Sirnichaa",
    synced: "Ghost-Synced"
  }
};

type LangKey = 'EN' | 'AM' | 'OR';
type Tab = 'HUB' | 'DISPATCH' | 'TOKENIZE';

export default function InventoryManagement() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const [activeTab, setActiveTab] = useState<Tab>('HUB');
  const [isScanning, setIsScanning] = useState(false);
  const [scanHash, setScanHash] = useState<string | null>(null);
  
  const [hubs, setHubs] = useState([
    { id: 'SA-ADAMA', name: 'Zinash K. (Super Agent - Adama Hub)', stock: { NPS: 450, UREA: 320, TEFF: 120 }, capacity: 80 },
    { id: 'SA-MODJO', name: 'Alamo Dist. (Super Agent - Modjo)', stock: { NPS: 120, UREA: 90, TEFF: 40 }, capacity: 35 },
  ]);

  const [requests, setRequests] = useState([
    { id: 'REQ-881', agent: 'Agent M. (Bishoftu)', item: 'NPS', qty: 50, status: 'PENDING' },
    { id: 'REQ-882', agent: 'Agent T. (Dukem)', item: 'TEFF', qty: 20, status: 'PENDING' },
    { id: 'REQ-883', agent: 'Agent L. (Hawassa)', item: 'UREA', qty: 100, status: 'PENDING' }
  ]);

  const handleDispatch = (reqId: string, itemType: string, qty: number) => {
    toast.loading(`Processing dispatch for ${reqId}...`);
    setTimeout(() => {
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'DISPATCHED' } : r));
      
      // Deduct from Adama Hub for demo purposes
      setHubs(prev => prev.map(h => {
        if(h.id === 'SA-ADAMA' && h.stock[itemType as keyof typeof h.stock]) {
          return {
            ...h,
            stock: {
              ...h.stock,
              [itemType]: h.stock[itemType as keyof typeof h.stock] - qty
            }
          };
        }
        return h;
      }));

      toast.success(t.dispatched);
    }, 1500);
  };

  const handleScan = () => {
    setIsScanning(true);
    setScanHash(null);
    toast.info(t.tokenizing);
    
    setTimeout(() => {
      setIsScanning(false);
      const newHash = "0x" + Math.random().toString(16).slice(2, 40).padStart(38, '0');
      setScanHash(newHash);
      toast.success(t.tokenSuccess);

      // Increment Adama stock as receiving new item
      setHubs(prev => prev.map(h => {
        if(h.id === 'SA-ADAMA') {
          return { ...h, stock: { ...h.stock, NPS: h.stock.NPS + 10 } };
        }
        return h;
      }));
    }, 2500);
  };

  const getItemLabel = (itemCode: string) => {
    if(itemCode === 'NPS') return t.nps;
    if(itemCode === 'UREA') return t.urea;
    if(itemCode === 'TEFF') return t.teff;
    return itemCode;
  };

  const getLanguageLabel = (l: LangKey) => {
    if(l === 'EN') return 'English';
    if(l === 'AM') return 'አማርኛ (Amharic)';
    if(l === 'OR') return 'Afaan Oromoo';
    return l;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
             <Database className="w-8 h-8 mr-3 text-indigo-400" />
             {t.title}
          </h1>
          <p className="text-slate-400 mt-2 uppercase tracking-widest text-[10px] font-bold">{t.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-slate-900 border-slate-700 text-slate-200">
                <Globe className="w-4 h-4 mr-2 text-indigo-400" />
                {getLanguageLabel(lang)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-slate-800 text-slate-200 border-slate-700">
              <DropdownMenuItem onClick={() => setLang('EN')} className="cursor-pointer focus:bg-slate-700 focus:text-white">English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('AM')} className="cursor-pointer focus:bg-slate-700 focus:text-white">አማርኛ (Amharic)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('OR')} className="cursor-pointer focus:bg-slate-700 focus:text-white">Afaan Oromoo (Oromiffa)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            {t.sysStatus}: {t.synced}
          </Badge>
        </div>
      </div>

      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <Button onClick={() => setActiveTab('HUB')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'HUB' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <Boxes className="w-4 h-4 mr-2" /> {t.tabHubs}
        </Button>
        <Button onClick={() => setActiveTab('DISPATCH')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'DISPATCH' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <ArrowRight className="w-4 h-4 mr-2" /> {t.tabDispatch}
        </Button>
        <Button onClick={() => setActiveTab('TOKENIZE')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'TOKENIZE' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <QrCode className="w-4 h-4 mr-2" /> {t.tabTokenize}
        </Button>
      </div>

      <div className="mt-6">
        {activeTab === 'HUB' && (
          <div className="grid md:grid-cols-2 gap-6">
            {hubs.map(hub => (
              <Card key={hub.id} className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Database className="w-24 h-24 text-indigo-500" />
                </div>
                <CardHeader className="bg-slate-800/50 border-b border-slate-800 pb-4 relative z-10">
                  <CardTitle className="text-lg flex items-center text-slate-100">
                     <MapPin className="w-5 h-5 mr-3 text-indigo-400" />
                     {hub.name}
                  </CardTitle>
                  <CardDescription className="text-slate-500 ml-8">{t.hubNode} • {hub.id}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.utilization}</span>
                    <span className={`font-mono font-bold ${hub.capacity > 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{hub.capacity}%</span>
                  </div>
                  <Progress value={hub.capacity} className={`h-1.5 mb-8 bg-slate-800 ${hub.capacity > 75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
                  
                  <h4 className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mb-3 flex items-center">
                     <ShieldCheck className="w-3 h-3 mr-1" /> {t.stockHolding}
                  </h4>
                  <div className="space-y-2">
                     <div className="flex justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors">
                       <span className="font-medium flex items-center text-slate-300 text-sm"><Box className="w-4 h-4 mr-3 text-slate-500" /> {t.nps}</span>
                       <span className="font-mono text-indigo-300 font-bold">{hub.stock.NPS} <span className="text-[10px] text-slate-500">U</span></span>
                     </div>
                     <div className="flex justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors">
                       <span className="font-medium flex items-center text-slate-300 text-sm"><Box className="w-4 h-4 mr-3 text-slate-500" /> {t.urea}</span>
                       <span className="font-mono text-indigo-300 font-bold">{hub.stock.UREA} <span className="text-[10px] text-slate-500">U</span></span>
                     </div>
                     <div className="flex justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition-colors">
                       <span className="font-medium flex items-center text-slate-300 text-sm"><Box className="w-4 h-4 mr-3 text-emerald-500" /> {t.teff}</span>
                       <span className="font-mono text-emerald-300 font-bold">{hub.stock.TEFF} <span className="text-[10px] text-slate-500">U</span></span>
                     </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'DISPATCH' && (
          <Card className="bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-5">
              <CardTitle className="text-slate-100 flex items-center">
                 <Truck className="w-5 h-5 mr-3 text-amber-500" /> {t.pendingReqs}
              </CardTitle>
              <CardDescription className="text-slate-400">{t.liveReqs}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800/50">
                {requests.map(req => (
                  <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center shrink-0">
                        <PackageOpen className="w-6 h-6 text-slate-400 cursor-pointer" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 text-lg mb-1">{req.agent}</h4>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-slate-400 text-sm">Requested:</span>
                          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{req.qty}x {getItemLabel(req.item)}</Badge>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">{t.ref} <span className="text-slate-400">{req.id}</span></p>
                      </div>
                    </div>
                    <div>
                      {req.status === 'PENDING' ? (
                        <Button onClick={() => handleDispatch(req.id, req.item, req.qty)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full md:w-auto shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                          <Zap className="w-4 h-4 mr-2" /> {t.dispatchBtn}
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2 px-4 shadow-none">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> {t.dispatched}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'TOKENIZE' && (
          <div className="max-w-2xl mx-auto">
             <Card className="bg-slate-900 border-slate-800 shadow-2xl text-center overflow-hidden">
                <CardHeader className="bg-slate-800/30 border-b border-slate-800 pb-8 pt-8">
                   <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-6">
                      <ScanLine className={`w-12 h-12 text-indigo-400 ${isScanning ? 'animate-pulse' : ''}`} />
                   </div>
                   <CardTitle className="text-2xl text-slate-100">{t.scanTitle}</CardTitle>
                   <CardDescription className="text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">{t.scanDesc}</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                   {scanHash ? (
                     <div className="space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
                           <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                           <p className="text-emerald-400 font-bold mb-4">{t.tokenSuccess}</p>
                           <p className="font-mono text-xs text-slate-400 break-all bg-slate-950 p-4 rounded-lg border border-slate-800">{scanHash}</p>
                        </div>
                        <Button onClick={() => setScanHash(null)} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                           Scan Another Batch
                        </Button>
                     </div>
                   ) : (
                     <div className="py-8">
                       <Button onClick={handleScan} disabled={isScanning} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-16 px-12 text-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all">
                          {isScanning ? (
                            <><ScanLine className="w-5 h-5 mr-3 animate-spin" /> {t.tokenizing}</>
                          ) : (
                            <><QrCode className="w-6 h-6 mr-3" /> {t.scanBtn}</>
                          )}
                       </Button>
                     </div>
                   )}
                </CardContent>
             </Card>
          </div>
        )}
      </div>
    </div>
  );
}
