import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  FileText, Fingerprint, SplitSquareHorizontal, Landmark, Globe, ShieldCheck, 
  CloudLightning, QrCode, Smartphone, WifiOff, Sprout, SendToBack, Zap, Database
} from 'lucide-react';

const dict = {
  EN: {
    title: "PSNP-Plus Orchestrator",
    subtitle: "G2P/P2G Digital Public Infrastructure via Sovereign Switch",
    tabShock: "Climate Shock Relief",
    tabVoucher: "Smart Input Vouchers",
    tabMobile: "Telco & M-Money Assets",
    batchTitle: "Relief Batch Ingestion",
    batchDesc: "MoF Emergency Ledger (5,000 farmers)",
    ndviTitle: "AgriTrust NDVI Oracle",
    ndviDesc: "Satellite verification & GhostSync Queueing",
    executeRouter: "Execute Multi-Rail Router",
    parseBtn: "Upload & Parse G2P Batch",
    payload: "Total Payload",
    settled: "TRANSACTIONS SETTLED",
    predictiveMsg: "Liquidity AI has pre-positioned physical cash at responding Kiosks.",
    voucherTitle: "Restricted Spend Control",
    voucherDesc: "Generate targeted vouchers ensuring funds are used for approved agricultural inputs.",
    issueVoucherBtn: "Issue Urea/NPS Vouchers",
    whitelistInfo: "Whitelist: GS1-Market Merchants Only",
    transportCash: "Cash Unlock: 20% Logistics Allowance",
    mobileTitle: "Value Added Services (P2G/B2C)",
    mobileDesc: "Top-up & Mobile Money allocations directly through the unified interface.",
    telebirrBtn: "Issue Telebirr Airtime",
    mpesaBtn: "Issue M-PESA Float",
    processing: "Processing...",
    statusActive: "Active"
  },
  AM: {
    title: "PSNP-Plus (ሴፍቲኔት) ማስተባበሪያ",
    subtitle: "የመንግስት እርዳታ (G2P) እና ዲጂታል ክፍያዎች በማዕከላዊ ስርዓት",
    tabShock: "የአየር ንብረት አደጋ መከላከያ",
    tabVoucher: "የግብርና ግብዓት ቫውቸር",
    tabMobile: "ካርድ እና የሞባይል ገንዘብ",
    batchTitle: "የእርዳታ መረጃ ማስገቢያ",
    batchDesc: "ከገንዘብ ሚኒስቴር (ለ5,000 ገበሬዎች)",
    ndviTitle: "AgriTrust ሳተላይት ማረጋገጫ",
    ndviDesc: "የሳተላይት መረጃ እና ከመስመር ውጭ ስርጭት (GhostSync)",
    executeRouter: "ዲጂታል ክፍያዎችን ይላኩ",
    parseBtn: "የG2P መዝገብ ይጫኑ",
    payload: "አጠቃላይ በጀት",
    settled: "ክፍያዎች ተጠናቀዋል",
    predictiveMsg: "AI ለአካባቢው ወኪሎች ቅድመ ጥሬ-ገንዘብ ዝግጅት አድርጓል።",
    voucherTitle: "የታለመ የወጪ ቁጥጥር",
    voucherDesc: "ገንዘቡ ለተፈቀዱ የግብርና ግብዓቶች ብቻ እንዲውል የተገደበ የቫውቸር ስርዓት።",
    issueVoucherBtn: "የማዳበሪያ ቫውቸሮችን አውጣ",
    whitelistInfo: "የተፈቀዱ: የተመዘገቡ ነጋዴዎች ብቻ",
    transportCash: "ጥሬ ገንዘብ: 20% የትራንስፖርት ድጋፍ",
    mobileTitle: "የሞባይል ካርድ እና የገንዘብ ስርጭት",
    mobileDesc: "በአንድ ማዕከላዊ ስርዓት የሞባይል ካርድ እና ገንዘብ በቀጥታ ይላኩ።",
    telebirrBtn: "የቴሌብር ካርድ ይላኩ",
    mpesaBtn: "የኤም-ፔሳ (M-PESA) ካርድ ይላኩ",
    processing: "በማስላት ላይ...",
    statusActive: "ንቁ"
  },
  OR: {
    title: "Qindeessaa PSNP-Plus",
    subtitle: "Kaffaltiiwwan G2P fi P2G Karaa Sovereign Switch tiin",
    tabShock: "Gargarsa Balaa Qilleensaa",
    tabVoucher: "Vaawucharii Galfata Qonnaa",
    tabMobile: "Kaardii Moobaayilaa fi Faayinaansii",
    batchTitle: "Sanada Gargarsaa Galchuu",
    batchDesc: "Ministeera Maallaqaa Irraa (Qonnaan bultoota 5,000)",
    ndviTitle: "Mirkaneessa Saatalaaytii AgriTrust",
    ndviDesc: "Odeeffannoo saatalaaytii fi raabsaa toora-ala (GhostSync)",
    executeRouter: "Kaffaltii Dijiitaalaa Raawwadhu",
    parseBtn: "Sanada G2P Ol-fe'i",
    payload: "Baajata Waliigalaa",
    settled: "Kaffaltiin Xumurameera",
    predictiveMsg: "Liquidity AI bakka bu'oota naannoof maallaqa qopheesseera.",
    voucherTitle: "To'annoo Baasii Daangeffame",
    voucherDesc: "Maallaqichi galfata qonnaa hayyamameef qofaa akka oolu sirna vaawucharii daangeffame.",
    issueVoucherBtn: "Vaawucharii Xaa'oo Kennaa",
    whitelistInfo: "Hayyamame: Daldaltoota galmaa'an qofaa",
    transportCash: "Callaa: 20% deeggarsa geejjibaa",
    mobileTitle: "Tajaajila Kaardii fi Maallaqa Moobaayilaa",
    mobileDesc: "Kaardii bilbilaa fi maallaqa karaa sirna wiirtuu tokkoon kallattiin raabsi.",
    telebirrBtn: "Kaardii Telebirr Ergi",
    mpesaBtn: "Kaardii M-PESA Ergi",
    processing: "Hojjetaa Jira...",
    statusActive: "Hojjetaa"
  }
};

type LangKey = 'EN' | 'AM' | 'OR';
type Tab = 'SHOCK_RELIEF' | 'VOUCHERS' | 'MOBILE_ASSETS';

export default function PsnpPlus() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const [activeTab, setActiveTab] = useState<Tab>('SHOCK_RELIEF');
  const [step, setStep] = useState(0); 
  const [progress, setProgress] = useState(0);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);

  const processBatch = () => {
    setStep(1);
    toast.info("Ingesting Ministry of Finance JSON/CSV...");
    let p = 0;
    const int = setInterval(() => {
      p += 10;
      setProgress(p);
      if(p >= 100) {
        clearInterval(int);
        setStep(2);
        toast.success("Batch parsed. AgriTrust NDVI confirmed 5,000 eligible records.");
      }
    }, 200);
  };

  const executeSplit = () => {
    toast.loading("Executing Multi-Rail Routing via Sovereign Switch...", { id: 'split' });
    setTimeout(() => {
      toast.success("Disbursement Complete. 0 Exceptions. 4.5M ETB Distributed.", { id: 'split' });
      setStep(3);
    }, 3000);
  };

  const handleVoucherIssue = () => {
    setIsProcessingLocal(true);
    toast.loading("Generating Smart Contracts for Vouchers...", { id: 'voucher' });
    setTimeout(() => {
      setIsProcessingLocal(false);
      toast.success("Vouchers cryptographically minted and bound to Fayda IDs.", { id: 'voucher' });
    }, 2000);
  };

  const handleMobileTopup = (provider: string) => {
    setIsProcessingLocal(true);
    toast.loading(`Routing B2C Airtime purchase through ${provider}...`, { id: 'topup' });
    setTimeout(() => {
      setIsProcessingLocal(false);
      toast.success(`${provider} payload successfully pushed to Sovereign Switch.`, { id: 'topup' });
    }, 2500);
  };

  const getLanguageLabel = (l: LangKey) => {
    if(l === 'EN') return 'English';
    if(l === 'AM') return 'አማርኛ (Amharic)';
    if(l === 'OR') return 'Afaan Oromoo';
    return l;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
             <Landmark className="w-8 h-8 mr-3 text-indigo-400" />
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
            Router: {t.statusActive}
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <Button onClick={() => setActiveTab('SHOCK_RELIEF')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'SHOCK_RELIEF' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <CloudLightning className="w-4 h-4 mr-2" /> {t.tabShock}
        </Button>
        <Button onClick={() => setActiveTab('VOUCHERS')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'VOUCHERS' ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <QrCode className="w-4 h-4 mr-2" /> {t.tabVoucher}
        </Button>
        <Button onClick={() => setActiveTab('MOBILE_ASSETS')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'MOBILE_ASSETS' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <Smartphone className="w-4 h-4 mr-2" /> {t.tabMobile}
        </Button>
      </div>

      <div className="mt-6">
        
        {/* TAB 1: Climate Shock Rapid Relief (G2P) */}
        {activeTab === 'SHOCK_RELIEF' && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Step 1: Ingestion */}
            <Card className={`bg-slate-900 border-slate-800 shadow-xl transition-all ${step >= 0 ? "opacity-100" : "opacity-40 grayscale"}`}>
              <CardHeader>
                 <CardTitle className="flex items-center text-slate-200">
                   <FileText className="w-5 h-5 mr-3 text-indigo-400" />
                   {t.batchTitle}
                 </CardTitle>
                 <CardDescription className="text-slate-500">{t.batchDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                 <div className="bg-slate-800 border border-slate-700/50 p-6 rounded-xl hover:border-slate-600 transition-colors">
                   <span className="font-mono text-2xl font-black text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.4)]">4.5M ETB</span>
                   <p className="text-xs text-slate-500 uppercase mt-2 font-bold tracking-widest">{t.payload}</p>
                 </div>
                 {step === 0 && <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={processBatch}>{t.parseBtn}</Button>}
                 {step > 0 && <Progress value={progress} className="h-2 bg-slate-800 [&>div]:bg-indigo-500" />}
              </CardContent>
            </Card>

            {/* Step 2: NDVI Identity & Rail Match */}
            <Card className={`bg-slate-900 border-slate-800 shadow-xl transition-all ${step >= 2 ? "opacity-100" : "opacity-40 grayscale"}`}>
              <CardHeader>
                 <CardTitle className="flex items-center text-slate-200">
                   <CloudLightning className="w-5 h-5 mr-3 text-amber-500" />
                   {t.ndviTitle}
                 </CardTitle>
                 <CardDescription className="text-slate-500">{t.ndviDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex justify-between p-4 border border-indigo-500/20 rounded-lg text-sm bg-indigo-500/10 backdrop-blur-sm">
                    <span className="font-medium text-slate-300 flex items-center">
                       <WifiOff className="w-4 h-4 mr-2 text-indigo-400" /> Deep-Rural (GhostSync)
                    </span>
                    <span className="font-mono font-black text-indigo-300">62%</span>
                 </div>
                 <div className="flex justify-between p-4 border border-emerald-500/20 rounded-lg text-sm bg-emerald-500/10 backdrop-blur-sm">
                    <span className="font-medium text-slate-300 flex items-center">
                       <Smartphone className="w-4 h-4 mr-2 text-emerald-400" /> M-PESA & Telebirr 
                    </span>
                    <span className="font-mono font-black text-emerald-300">38%</span>
                 </div>
                 {step === 2 && <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-[0_0_15px_rgba(217,119,6,0.4)]" onClick={executeSplit}>{t.executeRouter}</Button>}
              </CardContent>
            </Card>

            {/* Step 3: Multi-Rail Split Settlement */}
            <Card className={`transition-all shadow-2xl overflow-hidden relative ${step === 3 ? "border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]" : "border-slate-800 bg-slate-900 opacity-40 grayscale"}`}>
              {step === 3 && <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]"></div>}
              <CardHeader className="relative z-10">
                 <CardTitle className="flex items-center text-emerald-400">
                   <SplitSquareHorizontal className="w-5 h-5 mr-3" />
                   Sovereign Settlement
                 </CardTitle>
                 <CardDescription className="text-slate-500">Multi-Rail Core Execution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center relative z-10">
                 <Landmark className={`w-14 h-14 mx-auto my-6 ${step === 3 ? "text-emerald-400" : "text-slate-600"}`} />
                 {step === 3 ? (
                   <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                     <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-xs py-2 px-6 font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        {t.settled}
                     </Badge>
                     <p className="text-xs text-slate-400 font-medium leading-relaxed mt-6 border-t border-slate-800 pt-4">
                        <Zap className="w-3 h-3 inline mr-1 text-amber-500" />
                        {t.predictiveMsg}
                     </p>
                   </div>
                 ) : (
                   <p className="text-slate-600 font-mono text-sm tracking-widest uppercase">Awaiting Core...</p>
                 )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: Smart Input Vouchers */}
        {activeTab === 'VOUCHERS' && (
          <div className="max-w-3xl mx-auto">
             <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <QrCode className="w-32 h-32 text-amber-500" />
                </div>
                <CardHeader>
                   <CardTitle className="flex items-center text-slate-200 text-2xl">
                     <Sprout className="w-6 h-6 mr-3 text-emerald-400" />
                     {t.voucherTitle}
                   </CardTitle>
                   <CardDescription className="text-slate-400 text-md mt-2">{t.voucherDesc}</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 mt-4 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                         <ShieldCheck className="w-6 h-6 text-amber-500 mb-3" />
                         <p className="text-amber-400 font-bold uppercase tracking-widest text-[10px] mb-1">Constraints</p>
                         <p className="text-slate-300 text-sm font-medium">{t.whitelistInfo}</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
                         <SendToBack className="w-6 h-6 text-emerald-500 mb-3" />
                         <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Liquidity Exception</p>
                         <p className="text-slate-300 text-sm font-medium">{t.transportCash}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-slate-800">
                      <Button onClick={handleVoucherIssue} disabled={isProcessingLocal} className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-bold text-lg shadow-[0_0_20px_rgba(217,119,6,0.3)]">
                         {isProcessingLocal ? t.processing : t.issueVoucherBtn}
                      </Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        )}

        {/* TAB 3: Telebirr & M-PESA Card Sales */}
        {activeTab === 'MOBILE_ASSETS' && (
          <div className="max-w-4xl mx-auto">
             <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <Smartphone className="w-32 h-32 text-indigo-500" />
                </div>
                <CardHeader>
                   <CardTitle className="flex items-center text-slate-200 text-2xl">
                     <Database className="w-6 h-6 mr-3 text-indigo-400" />
                     {t.mobileTitle}
                   </CardTitle>
                   <CardDescription className="text-slate-400 text-md mt-2 max-w-xl">{t.mobileDesc}</CardDescription>
                </CardHeader>
                <CardContent className="relative z-10 mt-6 grid md:grid-cols-2 gap-6">
                   
                   <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 group hover:border-slate-500 transition-colors">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center mb-6 shadow-inner">
                         <span className="font-black text-xl text-emerald-400">tb</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-200 mb-2">Telebirr E-Topup</h3>
                      <p className="text-sm text-slate-500 mb-8 h-10">Push digital airtime assets directly to registered Fayda IDs via Ethio Telecom rails.</p>
                      <Button onClick={() => handleMobileTopup('Telebirr')} disabled={isProcessingLocal} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                         {t.telebirrBtn}
                      </Button>
                   </div>

                   <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 group hover:border-slate-500 transition-colors">
                      <div className="w-16 h-16 bg-red-500/10 rounded-xl border border-red-500/20 flex items-center justify-center mb-6 shadow-inner">
                         <span className="font-black text-xl text-red-500 uppercase tracking-tighter">m-pe</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-200 mb-2">M-PESA E-Topup</h3>
                      <p className="text-sm text-slate-500 mb-8 h-10">Distribute Safaricom Ethiopia airtime and mobile payloads instantly over the Switch.</p>
                      <Button onClick={() => handleMobileTopup('M-PESA')} disabled={isProcessingLocal} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                         {t.mpesaBtn}
                      </Button>
                   </div>

                </CardContent>
             </Card>
          </div>
        )}

      </div>
    </div>
  );
}
