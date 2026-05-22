import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Truck, MapPin, ShieldCheck, ArrowRightLeft, 
  Settings, AlertOctagon, CheckCircle2, Lock,
  Radar, ScanFace, Globe, Coins, Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const dict = {
  EN: {
    title: "FMCG Virtual ATM",
    subtitle: "B2B Liquidity Offload & Route Securitization",
    lcrBreach: "Critical LCR Deficit",
    lcrDesc: "Agent physical cash is critically low. Digital float is stranded.",
    physicalCash: "Vault Physical Fiat",
    digitalFloat: "Agent Digital Float",
    scanBtn: "Ping Local FMCG Routes",
    scanning: "Triangulating B2B Corridors...",
    partnerFound: "Logistics Partner Locked",
    partnerDesc: "BGI Ethiopia Delivery Unit (Route: Modjo-Adama)",
    cashCapacity: "Driver Physical Cash Capacity",
    swapTerms: "Escrow Swap Terms",
    initiateBtn: "Initiate Dual-Sign Handshake",
    successMsg: "Swap Secured. Liquidity Rebalanced.",
    securityNote: "Dual-sign reduces driver highway-robbery risk while recapitalizing the Agent kiosk for G2P Farmer payouts.",
    statusPending: "Awaiting Handshake",
    statusCompleted: "Ledger Synchronized",
  },
  AM: {
    title: "የFMCG ቨርቹዋል ATM",
    subtitle: "ከአከፋፋዮች ጋር ጥሬ ገንዘብ የመቀያየር ስርዓት",
    lcrBreach: "ከፍተኛ የጥሬ ገንዘብ እጥረት (LCR)",
    lcrDesc: "ከፋይዳ ወኪሉ ጋር ያለው ጥሬ ገንዘብ አልቋል። የዲጂታል ገንዘብ ግን አለ።",
    physicalCash: "ካዝና ውስጥ ጥሬ ገንዘብ",
    digitalFloat: "በወኪሉ ዲጂታል ሂሳብ (Float)",
    scanBtn: "በአቅራቢያ ያሉ አከፋፋይ መኪናዎችን ፈልግ",
    scanning: "የአከፋፋይ መስመሮችን በማሰስ ላይ...",
    partnerFound: "አከፋፋይ ተገኝቷል",
    partnerDesc: "BGI ኢትዮጵያ ስርጭት (መስመር፡ ሞጆ - አዳማ)",
    cashCapacity: "በአሽከርካሪው እጅ ያለ ጥሬ ገንዘብ",
    swapTerms: "የውል እና የቅያሬ ስምምነት",
    initiateBtn: "የጋራ ማረጋገጫ (Handshake) ጀምር",
    successMsg: "ገንዘቡ በተሳካ ሁኔታ ተለዋውጧል!",
    securityNote: "ይህ ሂደት የአሽከርካሪውን የዘረፋ ስጋት የሚቀንስ ሲሆን ለወኪሉ ደግሞ ለገበሬዎች መክፈያ የሚሆን ጥሬ ገንዘብ ያቀርባል።",
    statusPending: "ማረጋገጫ በመጠባበቅ ላይ",
    statusCompleted: "ሂሳብ ተስተካክሏል",
  },
  OR: {
    title: "ATM Daandii FMCG",
    subtitle: "Jijjiirraa Maallaqaa Raabsitootaa Waliin",
    lcrBreach: "Hanqina Callaa Guddaa (LCR)",
    lcrDesc: "Maallaqi callaan bakka bu'aa xiqqaateera. Maallaqi dijiitaalaa garuu jira.",
    physicalCash: "Maallaqa Callaa Kaazinaa",
    digitalFloat: "Maallaqa Dijiitaalaa Bakka Bu'aa",
    scanBtn: "Konkolaattota Raabsan Naannoo Barbaadi",
    scanning: "Daandiiwwan sakatta'uu...",
    partnerFound: "Raabsaan Argameera",
    partnerDesc: "BGI Ityoophiyaa (Daandii: Mojoo - Adaamaa)",
    cashCapacity: "Callaa Konkolaachisaan Qabu",
    swapTerms: "Haala Jijjiirraa",
    initiateBtn: "Mirkaneessa Waloo (Handshake) Eegali",
    successMsg: "Maallaqi milkaa'inaan jijjiirameera!",
    securityNote: "Kun balaa saaminsaa konkolaachisaa ni hir'isa, bakka bu'aaf immoo callaa maallaqaa qonnaan bulaaf kaffalamu dhiyeessa.",
    statusPending: "Mirkaneessa Eegaa Jira",
    statusCompleted: "Herregni Sirraa'eera",
  }
};

type LangKey = 'EN' | 'AM' | 'OR';

export default function FmcgLiquidity() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const [step, setStep] = useState(0); // 0: Alert, 1: Scanning, 2: Partner Found, 3: Completed

  const handleScan = () => {
    setStep(1);
    toast.info("Geofencing 5km radius via Sovereign Node...", { id: 'scan' });
    setTimeout(() => {
      setStep(2);
      toast.success("B2B Supply Corridor matched. FMCG driver alerted.", { id: 'scan' });
    }, 3000);
  };

  const handleHandshake = () => {
    toast.loading("Verifying Biometric Driver ID and Escrowing Digital Fiat...", { id: 'swap' });
    setTimeout(() => {
      setStep(3);
      toast.success(t.successMsg, { id: 'swap' });
    }, 3500);
  };

  const getLanguageLabel = (l: LangKey) => {
    if(l === 'EN') return 'English';
    if(l === 'AM') return 'አማርኛ (Amharic)';
    if(l === 'OR') return 'Afaan Oromoo';
    return l;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
             <Truck className="w-8 h-8 mr-3 text-indigo-400" />
             {t.title}
          </h1>
          <p className="text-slate-400 mt-2 uppercase tracking-widest text-[10px] font-bold shadow-indigo-500/20 drop-shadow-sm">{t.subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-3">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                <Globe className="w-4 h-4 mr-2 text-indigo-400" />
                {getLanguageLabel(lang)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700 text-slate-200">
              <DropdownMenuItem onClick={() => setLang('EN')} className="cursor-pointer focus:bg-slate-700 focus:text-white">English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('AM')} className="cursor-pointer focus:bg-slate-700 focus:text-white">አማርኛ (Amharic)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('OR')} className="cursor-pointer focus:bg-slate-700 focus:text-white">Afaan Oromoo (Oromiffa)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 flex items-center uppercase tracking-widest font-bold">
            <AlertOctagon className="w-4 h-4 mr-1.5" /> Core Deficit
          </Badge>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 pt-4">
        {/* Agent Node Panel */}
        <Card className={`border-l-4 shadow-xl relative overflow-hidden transition-all duration-500 bg-slate-900 border-t-slate-800 border-r-slate-800 border-b-slate-800 
          ${step === 3 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Settings className="w-32 h-32 text-rose-400" />
          </div>
          <CardHeader className="border-b border-slate-800/50 pb-4 relative z-10">
            <CardTitle className={`flex items-center ${step === 3 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <MapPin className="w-5 h-5 mr-3" />
              {step === 3 ? t.statusCompleted : t.lcrBreach}
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              {step === 3 ? "Vault recapitalized. Ready for G2P payouts." : t.lcrDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 relative z-10">
            <div className={`p-5 rounded-xl border flex justify-between items-center transition-colors duration-1000 ${step === 3 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 3 ? 'text-emerald-500' : 'text-rose-500'}`}>{t.physicalCash}:</span>
              <span className={`font-mono text-2xl font-black ${step === 3 ? 'text-emerald-400' : 'text-rose-400'}`}>{step === 3 ? '21,200 ETB' : '1,200 ETB'}</span>
            </div>
            <div className={`p-5 rounded-xl border flex justify-between items-center transition-colors duration-1000 ${step === 3 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step === 3 ? 'text-indigo-400' : 'text-emerald-500'}`}>{t.digitalFloat}:</span>
              <span className={`font-mono text-2xl font-black ${step === 3 ? 'text-indigo-300' : 'text-emerald-400'}`}>{step === 3 ? '25,000 ETB' : '45,000 ETB'}</span>
            </div>

            {step < 2 && (
              <Button 
                className="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all" 
                onClick={handleScan} 
                disabled={step === 1}
              >
                {step === 1 ? (
                  <span className="flex items-center"><Radar className="w-5 h-5 mr-3 animate-spin" /> {t.scanning}</span>
                ) : (
                  <span className="flex items-center"><ScanFace className="w-5 h-5 mr-3" /> {t.scanBtn}</span>
                )}
              </Button>
            )}

            {step >= 2 && (
              <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between opacity-50">
                 <span className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> Match Found</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* FMCG Partner Panel */}
        {step >= 2 && (
          <Card className={`animate-in fade-in slide-in-from-right-8 duration-700 shadow-2xl relative overflow-hidden bg-slate-900 border-slate-800
            border-l-4 ${step === 3 ? 'border-l-indigo-500' : 'border-l-amber-500'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
               <Truck className="w-32 h-32 text-amber-500" />
            </div>
            <CardHeader className="border-b border-slate-800/50 pb-4 relative z-10">
              <CardTitle className={`flex items-center ${step === 3 ? 'text-indigo-400' : 'text-amber-500'}`}>
                <Truck className="w-5 h-5 mr-3" />
                {t.partnerFound}
              </CardTitle>
              <CardDescription className="text-slate-400 font-mono mt-2">
                {t.partnerDesc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 relative z-10">
              
              <div className="flex items-center justify-between text-sm p-5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <span className="font-bold uppercase tracking-widest text-[10px]">{t.cashCapacity}:</span>
                <span className="font-mono text-xl text-amber-300 font-black">20,000 ETB</span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                    <Lock className="w-3 h-3 mr-2" /> {t.swapTerms}
                 </p>
                 <div className="flex space-x-2 items-center justify-center">
                   <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-3 py-2">
                     +20,000 Physical ETB
                   </Badge>
                   <ArrowRightLeft className="w-5 h-5 text-slate-600 animate-pulse" />
                   <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 px-3 py-2">
                     -20,000 Digital Float
                   </Badge>
                 </div>
                 <p className="text-[10px] text-slate-500 mt-5 text-center leading-relaxed">
                   {t.securityNote}
                 </p>
              </div>

              {step === 2 ? (
                 <Button 
                   className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all" 
                   onClick={handleHandshake} 
                 >
                   <ShieldCheck className="w-5 h-5 mr-3" /> {t.initiateBtn}
                 </Button>
              ) : (
                 <div className="h-14 flex items-center justify-center border-2 border-dashed border-emerald-500/50 bg-emerald-500/10 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Escrow Completed</span>
                 </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
