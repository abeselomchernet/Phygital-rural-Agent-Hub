import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Landmark, ArrowRight, TrendingDown, Target, Building, AlertTriangle, Globe, ShieldCheck, Activity, Zap, Cpu } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

const dict = {
  EN: {
    title: "Algorithmic Capital Racing",
    subtitle: "High-Frequency Bidding on Farmer Ardi Scores for Agri-Input Assets",
    simBtn: "Inject Test Request",
    simulating: "Simulating high-frequency credit bidding...",
    resolved: "Bidding round resolved. Winner deployed to Agent Kiosk.",
    targetTitle: "Current Bid Target",
    requestedInput: "Requested Asset",
    inputVal: "Urea Fertilizer (x2)",
    principalTitle: "Principal Required",
    principalVal: "10,400 ETB",
    scoreTitle: "Ardi Score",
    scoreVal: "740",
    disclaimer: "Partner Institutions connect their proprietary risk APIs. Once an agent assesses a farmer's Ardi score, banking algorithms sub-second bid custom interest rates & duration limits.",
    riskThreshold: "Risk Threshold met: >",
    offeredRate: "Offered Rate",
    wonBid: "Won Bid",
    lost: "Lost",
    bidding: "Bidding...",
    latency: "Latency:",
    cycle: "Duration:",
    sysStatus: "API Router",
    synced: "Active"
  },
  AM: {
    title: "የካፒታል ጨረታ ስርዓት",
    subtitle: "በገበሬው አርዲ ውጤት ላይ የተመሰረተ ፈጣን የብድር ወለድ ጨረታ",
    simBtn: "አዲስ ጥያቄ አስገባ",
    simulating: "የብድር ጨረታ በማስላት ላይ...",
    resolved: "ጨረታው ተጠናቋል። አሸናፊው ወደ ወኪሉ ተልኳል።",
    targetTitle: "የአሁኑ የብድር ፈላጊ",
    requestedInput: "የተጠየቀው ንብረት",
    inputVal: "ዩሪያ ማዳበሪያ (x2)",
    principalTitle: "አጠቃላይ የብድር መጠን",
    principalVal: "10,400 ብር",
    scoreTitle: "የአርዲ ውጤት (Ardi Score)",
    scoreVal: "740",
    disclaimer: "አጋር ባንኮች የራሳቸውን የብድር አደጋ መገምገሚያ ስርዓት ይጠቀማሉ። ወኪሉ የገበሬውን የአርዲ ውጤት ሲጠይቅ፣ የባንክ አልጎሪዝሞች በሰከንድ ውስጥ የወለድ መጠንና ጊዜ ይጫረታሉ።",
    riskThreshold: "የአደጋ መነሻ ደረሰ: >",
    offeredRate: "የቀረበው የወለድ መጠን",
    wonBid: "አሸናፊ",
    lost: "ተሸናፊ",
    bidding: "በመጫረት ላይ...",
    latency: "ፍጥነት:",
    cycle: "የቆይታ ጊዜ:",
    sysStatus: "API ራውተር",
    synced: "ንቁ (Active)"
  },
  OR: {
    title: "Dorgommii Kaappitaalaa Algeerizimii",
    subtitle: "Dorgommii Saffisa Olaanaa Qabxii Ardi Qonnaan Bulaa Irraatti Filachuuf",
    simBtn: "Gaaffii Haaraa Galchi",
    simulating: "Dorgommii liqii saffisaa shallagaa jira...",
    resolved: "Dorgommiin xumurameera. Mo'ataan gara bakka bu'aatti ergameera.",
    targetTitle: "Barbaadaa Liqii Yeroo Ammaa",
    requestedInput: "Qabeenya Gaafatame",
    inputVal: "Xaa'oo Yuuriyaa (x2)",
    principalTitle: "Mallaqa Liqii Waliigalaa",
    principalVal: "10,400 ETB",
    scoreTitle: "Qabxii Ardi",
    scoreVal: "740",
    disclaimer: "Baankonni michuu tahan sirna of eeggannoo isaanii itti fidu. Yeroo bakka bu'aan qabxii Ardi qonnaan bulaa sakatta'u, baankonni saffisa sekoondiin gadiin dhalafi yeroo liqaa dorgomu.",
    riskThreshold: "Sadarkaa Balaa guutame: >",
    offeredRate: "Dhala Dhiyaate",
    wonBid: "Mo'ataa",
    lost: "Mo'atameera",
    bidding: "Dorgomaa Jira...",
    latency: "Saffisa:",
    cycle: "Yeroo:",
    sysStatus: "API Router",
    synced: "Hojjetaa"
  }
};

type LangKey = 'EN' | 'AM' | 'OR';
type BidStatus = 'WINNER' | 'LOST' | 'PENDING';

interface Bid {
  id: string;
  bank: string;
  rate: number;
  status: BidStatus;
  duration: string;
  ardiThreshold: number;
  latencyMs: number;
}

export default function BankRacing() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const initialBids: Bid[] = [
    { id: '1', bank: 'Coop Bank of Oromia', rate: 1.2, status: 'WINNER', duration: '3 Months', ardiThreshold: 700, latencyMs: 42 },
    { id: '2', bank: 'Dashen Bank', rate: 1.5, status: 'LOST', duration: '6 Months', ardiThreshold: 720, latencyMs: 65 },
    { id: '3', bank: 'Awash Bank', rate: 1.8, status: 'LOST', duration: '6 Months', ardiThreshold: 680, latencyMs: 88 },
  ];

  const [bids, setBids] = useState<Bid[]>(initialBids);
  const [simulating, setSimulating] = useState(false);
  const [tick, setTick] = useState(0);

  // High-frequency jitter effect during simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulating) {
      interval = setInterval(() => {
        setBids(prev => prev.map(b => ({
          ...b,
          rate: parseFloat((Math.random() * (2.8 - 0.8) + 0.8).toFixed(1)),
          latencyMs: Math.floor(Math.random() * (120 - 20) + 20)
        })));
        setTick(t => t + 1);
      }, 150);
    }
    return () => clearInterval(interval);
  }, [simulating]);

  const simulateBidWar = () => {
    setSimulating(true);
    toast.info(t.simulating, { icon: <Activity className="w-5 h-5 text-indigo-400 animate-pulse" /> });
    
    // Set all to pending state explicitly
    setBids(bids.map(b => ({ ...b, status: 'PENDING' })));
    
    setTimeout(() => {
      setSimulating(false);
      setBids(prev => {
         // Final calculations after "volatility" ends
         const finalBids = prev.map(b => ({ 
           ...b, 
           rate: parseFloat((Math.random() * (2.0 - 0.9) + 0.9).toFixed(1)),
           latencyMs: Math.floor(Math.random() * (90 - 30) + 30)
         }));
         const lowestRate = Math.min(...finalBids.map(b => b.rate));
         
         return finalBids.map(b => ({
           ...b,
           status: b.rate === lowestRate ? 'WINNER' : 'LOST'
         }));
      });
      toast.success(t.resolved, { icon: <ShieldCheck className="w-5 h-5 text-emerald-400" /> });
    }, 4500); // 4.5 seconds of "racing"
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
             <Cpu className="w-8 h-8 mr-3 text-indigo-400" />
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

          <Button onClick={simulateBidWar} disabled={simulating} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">
            <Zap className="w-4 h-4 mr-2" />
            {t.simBtn}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 pt-4">
        
        {/* Current Active Farmer Context */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-indigo-500/30 shadow-2xl bg-indigo-950/20 relative overflow-hidden backdrop-blur-sm">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Target className="w-32 h-32 text-indigo-400" />
             </div>
             <CardHeader className="pb-2 relative z-10">
                <CardDescription className="text-indigo-400 font-bold uppercase tracking-widest text-xs flex items-center">
                   <Target className="w-4 h-4 mr-2" /> {t.targetTitle}
                </CardDescription>
                <CardTitle className="text-3xl text-indigo-50 font-black">Chaltu Bekele</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 relative z-10 mt-2">
                <div className="flex justify-between items-baseline border-b border-indigo-500/20 pb-3">
                   <p className="text-sm font-medium text-slate-300">{t.requestedInput}</p>
                   <p className="font-bold text-white uppercase tracking-wider text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">{t.inputVal}</p>
                </div>
                <div className="flex justify-between items-baseline border-b border-indigo-500/20 pb-3">
                   <p className="text-sm font-medium text-slate-300">{t.principalTitle}</p>
                   <p className="font-mono font-bold text-emerald-400 tracking-wider text-lg">{t.principalVal}</p>
                </div>
                <div className="pt-2">
                   <p className="text-sm text-slate-300 flex justify-between tracking-widest font-bold uppercase mb-2">
                      <span>{t.scoreTitle}</span> 
                      <span className="text-indigo-400 font-black text-lg bg-indigo-500/10 px-2 rounded">{t.scoreVal}<span className="text-xs text-indigo-500/50">/1000</span></span>
                   </p>
                   <Progress value={74} className="bg-slate-800 h-2 w-full [&>div]:bg-indigo-500 transition-all" />
                </div>
             </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border border-slate-800 shadow-xl">
             <CardContent className="p-5 flex gap-4 text-sm text-slate-400 leading-relaxed font-medium">
                <AlertTriangle className="w-8 h-8 text-amber-500/80 shrink-0 mt-1" />
                <p>{t.disclaimer}</p>
             </CardContent>
          </Card>
        </div>

        {/* Live Racing Log */}
        <div className="lg:col-span-2 space-y-4">
           {bids.map((bid) => (
             <Card key={bid.id} className={`transition-all duration-300 border backdrop-blur-sm shadow-xl overflow-hidden relative group
                ${simulating ? 'border-indigo-500/50 bg-indigo-950/20 shadow-[0_0_20px_rgba(79,70,229,0.15)]' 
                  : bid.status === 'WINNER' ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                  : 'border-slate-800 bg-slate-900/50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all'}
             `}>
               {/* Animated scanning line during simulation */}
               {simulating && <div className="absolute top-0 left-0 h-full w-1 bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(79,70,229,1)]"></div>}
               {bid.status === 'WINNER' && <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>}

               <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                 
                 <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border 
                      ${simulating ? 'bg-indigo-500/10 border-indigo-500/30' 
                        : bid.status === 'WINNER' ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-slate-800 border-slate-700'}`}>
                       <Building className={`w-7 h-7 
                         ${simulating ? 'text-indigo-400' 
                           : bid.status === 'WINNER' ? 'text-emerald-400' 
                           : 'text-slate-500'}`} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-100">{bid.bank}</h3>
                       <div className="text-slate-500 font-medium text-xs flex items-center mt-1.5 space-x-3 uppercase tracking-wider">
                         <span>{t.riskThreshold}{bid.ardiThreshold} Ardi</span>
                         <span className="text-slate-700">•</span>
                         <span className={`font-mono text-[10px] ${simulating ? 'text-indigo-400' : 'text-slate-500'}`}>
                           {t.latency} {bid.latencyMs}ms
                         </span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{t.offeredRate}</p>
                      <p className={`text-3xl font-black tabular-nums flex items-center md:justify-end font-mono
                        ${simulating ? 'text-indigo-300' 
                          : bid.status === 'WINNER' ? 'text-emerald-300' 
                          : 'text-slate-300'}`}>
                        {bid.rate.toFixed(1)}%
                        {simulating && <TrendingDown className="w-5 h-5 ml-2 text-indigo-500 animate-bounce" />}
                      </p>
                      <p className="text-xs text-slate-500 font-medium tracking-wide mt-1 uppercase">{t.cycle} <span className="text-slate-400">{bid.duration}</span></p>
                    </div>
                    
                    <div className="w-32 flex justify-end shrink-0">
                       {!simulating && bid.status === 'WINNER' && <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 py-2 px-5 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">{t.wonBid}</Badge>}
                       {!simulating && bid.status === 'LOST' && <Badge className="bg-slate-800 text-slate-500 border border-slate-700 py-2 px-5 text-xs font-bold uppercase tracking-widest">{t.lost}</Badge>}
                       {simulating && <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 animate-pulse py-2 px-5 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(79,70,229,0.3)]">{t.bidding}</Badge>}
                    </div>
                 </div>
               </CardContent>
             </Card>
           ))}
        </div>

      </div>
    </div>
  );
}
