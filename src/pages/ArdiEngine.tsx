import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  BrainCircuit, Coins, Target, TrendingUp, ShieldCheck, 
  Activity, Globe, SlidersHorizontal, Calculator, Database, KeySquare, 
  BarChart4, ArrowRightLeft, CreditCard, Wallet
} from 'lucide-react';
import { Slider } from "@/components/ui/slider";

const dict = {
  EN: {
    title: "Ardi Intelligence Engine",
    subtitle: "AI Credit Decisioning & Ecosystem Scoring Algorithm",
    tabGeneral: "Technical Schema",
    tabFarmer: "Farmer Scoring",
    tabAgent: "Agent Liquidity",
    tabMatrix: "Revenue Matrix",
    
    // Farmer Tab
    f_title: "Farmer Ardi Score (300-900)",
    f_tx: "Tx Consistency (w1)",
    f_tx_desc: "Normalized frequency & balance stability",
    f_equb: "Equb Trust (w2)",
    f_equb_desc: "Timeliness & peer participation",
    f_payg: "PAYG Repayment (w3)",
    f_payg_desc: "On-time IoT loan installments",
    f_ins: "Insurance Coverage (w4)",
    f_ins_desc: "Boosts baseline resilience",
    f_sub: "Subsidy Reliance (-w5)",
    f_sub_desc: "Inverse dependency weighting",
    
    // Agent Tab
    a_title: "Agent LCR & Grade",
    a_vault: "Vault Physical Fiat (ETB)",
    a_float: "Digital Float (ETB)",
    a_vol: "Predicted Daily Volume",
    a_lcr: "Liquidity Coverage Ratio (LCR)",
    a_swaps: "Successful Swaps",
    a_total: "Total Swap Requests",
    a_rap: "Risk-Adjusted Performance (RAP)",
    calcScore: "Compute Neural Score",
    
    // Revenue Tab
    r_service: "Service",
    r_agent: "Agent Split",
    r_super: "Super Agent Split",
    r_os: "Enawuga OS Split",
    r_desc: "Global System Commission Parameters"
  },
  AM: {
    title: "አርዲ አርቴፊሻል ኢንተለጀንስ",
    subtitle: "የብድር ውሳኔ እና የስርዓት ግምገማ አልጎሪዝም",
    tabGeneral: "ቴክኒካዊ መዋቅር",
    tabFarmer: "የገበሬው ግምገማ",
    tabAgent: "የወኪል ፈሳሽነት",
    tabMatrix: "የገቢ ክፍፍል ማትሪክስ",
    
    f_title: "የገበሬ አርዲ ውጤት (300-900)",
    f_tx: "የግብይት ተከታታይነት (w1)",
    f_tx_desc: "የግብይት ብዛት እና የሂሳብ መረጋጋት",
    f_equb: "የእቁብ ታማኝነት (w2)",
    f_equb_desc: "ዕዳ በጊዜ መክፈል እና ተሳትፎ",
    f_payg: "ክፍያ-የሚሰራ ብድር (w3)",
    f_payg_desc: "በጊዜ የተከፈሉ የፓምፕ/ሶላር ዕዳዎች",
    f_ins: "የመድን ሽፋን (w4)",
    f_ins_desc: "አጠቃላይ ድጋፍን ይጨምራል",
    f_sub: "በድጎማ ላይ የተመሰረተ (-w5)",
    f_sub_desc: "ተቀናሽ የሚደረግ ጥገኝነት",
    
    a_title: "የወኪል ፈሳሽነት (LCR) እና ደረጃ",
    a_vault: "ካዝና ውስጥ ጥሬ ገንዘብ (ብር)",
    a_float: "ዲጂታል ገንዘብ (ብር)",
    a_vol: "የሚጠበቅ የእለቱ ስራ",
    a_lcr: "የፈሳሽነት ሽፋን መጠን (LCR)",
    a_swaps: "የተሳኩ ቅያሬዎች",
    a_total: "አጠቃላይ የቅያሬ ጥያቄዎች",
    a_rap: "ስጋት-የተስተካከለ አፈጻጸም (RAP)",
    calcScore: "አልጎሪዝሙን አስላ",
    
    r_service: "አገልግሎት",
    r_agent: "የወኪል ድርሻ",
    r_super: "የሱፐር ወኪል ድርሻ",
    r_os: "የእንአውጋ (OS) ድርሻ",
    r_desc: "ዓለም አቀፍ የስርዓት ኮሚሽን መለኪያዎች"
  },
  OR: {
    title: "Injiinii Ardi",
    subtitle: "Murtoo Liqii AI fi Madaallii Sirnicha",
    tabGeneral: "Akkaataa Teeknikaa",
    tabFarmer: "Madaallii Qonnaan Bulaa",
    tabAgent: "Dhangala'aa Bakka Bu'aa (LCR)",
    tabMatrix: "Qooda Galii",
    
    f_title: "Qabxii Ardi Qonnaan Bulaa (300-900)",
    f_tx: "Walitti fufiinsa Darbaa (w1)",
    f_tx_desc: "Baay'ina darbaa fi tasgabbii herregaa",
    f_equb: "Amanamummaa Iquubii (w2)",
    f_equb_desc: "Yeroon kaffaluu fi hirmaannaa",
    f_payg: "Kaffaltii PAYG (w3)",
    f_payg_desc: "Kaffaltii liqii meeshaa yeroon kaffalamuu",
    f_ins: "Inshuraansii (w4)",
    f_ins_desc: "Madaallii deeggarsaa dabala",
    f_sub: "Hirkattummaa Deeggarsaa (-w5)",
    f_sub_desc: "Madaallii irraa hir'atu",
    
    a_title: "Dhangala'aa Bakka Bu'aa fi Sadarkaa",
    a_vault: "Maallaqa Callaa Kaazinaa (ETB)",
    a_float: "Maallaqa Dijiitaalaa (ETB)",
    a_vol: "Tilmaama Hujii Guyyaa",
    a_lcr: "Madaallii Qabiinsa Maallaqaa (LCR)",
    a_swaps: "Jijjiirraa Milkaa'e",
    a_total: "Ida'ama Gaaffii Jijjiirraa",
    a_rap: "Raawwii Rakkoof Sirraa'e (RAP)",
    calcScore: "Algeerizimii Shallagi",
    
    r_service: "Tajaajila",
    r_agent: "Qooda Bakka Bu'aa",
    r_super: "Qooda Bakka Bu'aa Ol-aanaa",
    r_os: "Qooda Enawuga OS",
    r_desc: "Ulaagaalee Koomishinii Sirna Waliigalaa"
  }
};

type LangKey = 'EN' | 'AM' | 'OR';

export default function ArdiEngine() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const [activeTab, setActiveTab] = useState('FARMER');

  // Farmer Scoring State (Simulated scales 0-100 for simplicity)
  const [txScore, setTxScore] = useState(80);
  const [equbScore, setEqubScore] = useState(85);
  const [paygScore, setPaygScore] = useState(90);
  const [insScore, setInsScore] = useState(50);
  const [subScore, setSubScore] = useState(20);
  const [farmerFinal, setFarmerFinal] = useState(0);

  // Agent Scoring State
  const [vault, setVault] = useState(40000);
  const [floatVal, setFloatVal] = useState(60000);
  const [vol, setVol] = useState(110000); // predicted
  const [succSwaps, setSuccSwaps] = useState(75);
  const [totalSwaps, setTotalSwaps] = useState(100);
  const [agentVolume, setAgentVolume] = useState(80000); // Historical transaction volume factor
  const [agentGrade, setAgentGrade] = useState<{lcr: number, rap: number, grade: string, limit: string, volScore?: number, weightedScore?: number} | null>(null);

  const calculateFarmerScore = () => {
    // Simulated Baseline 300, max 900
    // w1=1.5, w2=2.0, w3=1.5, w4=1.0, w5=-2.0
    const raw = 300 + (txScore * 1.5) + (equbScore * 2.0) + (paygScore * 1.5) + (insScore * 1.0) - (subScore * 2.0);
    const bounded = Math.max(300, Math.min(900, Math.floor(raw)));
    
    setFarmerFinal(bounded);
    toast.success("AI Workflow Complete. Credit Eligibility Flags derived.", { icon: <BrainCircuit className="text-emerald-500 w-5 h-5"/> });
  };

  const calculateAgentGrade = () => {
    const lcr = (vault + floatVal) / (vol || 1);
    const rap = (succSwaps / (totalSwaps || 1)) * 100;
    
    // Normalize components
    const lcrScore = Math.min(100, (lcr / 0.8) * 100);
    const rapScore = rap; 
    // Benchmark 100k for volume max score
    const volScore = Math.min(100, (agentVolume / 100000) * 100);
    
    // Extract Grade via Weighted Math (40% LCR, 40% RAP, 20% Volume)
    const weightedScore = (lcrScore * 0.4) + (rapScore * 0.4) + (volScore * 0.2);

    let grade = 'D';
    let limit = 'None';
    if(weightedScore >= 80) { grade = 'A'; limit = 'ETB 200,000'; }
    else if(weightedScore >= 60) { grade = 'B'; limit = 'ETB 50,000'; }
    else if(weightedScore >= 40) { grade = 'C'; limit = 'ETB 10,000'; }
    else { grade = 'D'; limit = 'Suspended'; }

    setAgentGrade({ lcr: Number(lcr.toFixed(2)), rap: Number(rap.toFixed(0)), grade, limit, volScore: Number(volScore.toFixed(0)), weightedScore: Number(weightedScore.toFixed(0)) });
    toast.success("Liquidity Prediction Engine executed.", { icon: <BrainCircuit className="text-emerald-500 w-5 h-5"/> });
  };

  const getLanguageLabel = (l: LangKey) => {
    if(l === 'EN') return 'English';
    if(l === 'AM') return 'አማርኛ (Amharic)';
    if(l === 'OR') return 'Afaan Oromoo';
    return l;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
             <BrainCircuit className="w-8 h-8 mr-3 text-indigo-400" />
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

          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 flex items-center uppercase tracking-widest font-bold">
            <Database className="w-4 h-4 mr-1.5" /> Engine Active
          </Badge>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <Button onClick={() => setActiveTab('FARMER')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'FARMER' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <Target className="w-4 h-4 mr-2" /> {t.tabFarmer}
        </Button>
        <Button onClick={() => setActiveTab('AGENT')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'AGENT' ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <Activity className="w-4 h-4 mr-2" /> {t.tabAgent}
        </Button>
        <Button onClick={() => setActiveTab('MATRIX')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'MATRIX' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <Coins className="w-4 h-4 mr-2" /> {t.tabMatrix}
        </Button>
        <Button onClick={() => setActiveTab('SCHEMA')} variant="ghost" className={`rounded-none border-b-2 whitespace-nowrap ${activeTab === 'SCHEMA' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
          <KeySquare className="w-4 h-4 mr-2" /> {t.tabGeneral}
        </Button>
      </div>

      <div className="mt-6">
        
        {/* FARMER TAB */}
        {activeTab === 'FARMER' && (
          <div className="grid lg:grid-cols-2 gap-8">
             <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
                <CardHeader>
                   <CardTitle className="text-white flex items-center">
                      <SlidersHorizontal className="w-5 h-5 mr-3 text-indigo-400" />
                      Ardi Algorithm Weights
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 shadow-sm">
                        <div>
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-200">{t.f_tx}</span>
                              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs">{txScore}%</span>
                           </div>
                           <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">{t.f_tx_desc}</span>
                        </div>
                        <Slider value={[txScore]} onValueChange={(val) => setTxScore(val[0])} max={100} step={1} className="[&>span:first-child]:bg-slate-800 [&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500" />
                     </div>

                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 shadow-sm">
                        <div>
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-200">{t.f_equb}</span>
                              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs">{equbScore}%</span>
                           </div>
                           <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">{t.f_equb_desc}</span>
                        </div>
                        <Slider value={[equbScore]} onValueChange={(val) => setEqubScore(val[0])} max={100} step={1} className="[&>span:first-child]:bg-slate-800 [&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500" />
                     </div>

                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 shadow-sm">
                        <div>
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-200">{t.f_payg}</span>
                              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs">{paygScore}%</span>
                           </div>
                           <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">{t.f_payg_desc}</span>
                        </div>
                        <Slider value={[paygScore]} onValueChange={(val) => setPaygScore(val[0])} max={100} step={1} className="[&>span:first-child]:bg-slate-800 [&_[role=slider]]:bg-emerald-500 [&_[role=slider]]:border-emerald-500" />
                     </div>

                     <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 shadow-sm">
                        <div>
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-200">{t.f_ins}</span>
                              <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-xs">{insScore}%</span>
                           </div>
                           <span className="block text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">{t.f_ins_desc}</span>
                        </div>
                        <Slider value={[insScore]} onValueChange={(val) => setInsScore(val[0])} max={100} step={1} className="[&>span:first-child]:bg-slate-800 [&_[role=slider]]:bg-indigo-500 [&_[role=slider]]:border-indigo-500" />
                     </div>
                   </div>

                   <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/20 space-y-4">
                      <div>
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-200 flex items-center">{t.f_sub} <span className="ml-2 bg-rose-500/20 text-rose-400 text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest">Penalty</span></span>
                            <span className="font-mono text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-xs">-{subScore}%</span>
                         </div>
                         <span className="block text-[10px] text-rose-500 uppercase tracking-widest leading-relaxed">{t.f_sub_desc}</span>
                      </div>
                      <Slider value={[subScore]} onValueChange={(val) => setSubScore(val[0])} max={100} step={1} className="[&>span:first-child]:bg-slate-800 [&_[role=slider]]:bg-rose-500 [&_[role=slider]]:border-rose-500" />
                   </div>

                   <Button onClick={calculateFarmerScore} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 uppercase tracking-widest shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                      <Calculator className="w-5 h-5 mr-3" /> {t.calcScore}
                   </Button>
                </CardContent>
             </Card>

             <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/20 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Target className="w-48 h-48 text-indigo-400" />
                </div>
                <CardHeader className="text-center relative z-10 w-full">
                   <CardTitle className="text-slate-400 uppercase tracking-widest text-sm mb-4 font-bold">{t.f_title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center relative z-10">
                   <div className="bg-slate-950/50 w-48 h-48 rounded-full border-4 border-indigo-500/30 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(79,70,229,0.2)] mb-8">
                      {farmerFinal > 0 ? (
                         <span className="text-6xl font-light text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                            {farmerFinal}
                         </span>
                      ) : (
                         <span className="text-slate-600 font-mono text-sm tracking-widest uppercase">Null</span>
                      )}
                   </div>
                   
                   {farmerFinal > 700 && (
                      <div className="animate-in slide-in-from-bottom-4 fade-in duration-500 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl inline-block text-left w-full max-w-sm backdrop-blur-sm">
                         <p className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-1 flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-2" /> Credit Eligible
                         </p>
                         <p className="text-emerald-100 font-mono text-xl tracking-tight">ETB {(farmerFinal * 22).toLocaleString()} <span className="text-sm text-emerald-500 font-sans">Micro-Credit Line</span></p>
                      </div>
                   )}
                   {farmerFinal > 0 && farmerFinal <= 700 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl inline-block w-full max-w-sm">
                         <p className="text-xs text-amber-400 font-black uppercase tracking-widest mb-1 flex items-center justify-center">
                            <Activity className="w-4 h-4 mr-2" /> Tier 2 Scoring
                         </p>
                         <p className="text-amber-100 font-mono text-xl tracking-tight text-center">ETB {(farmerFinal * 10).toLocaleString()} <span className="text-sm text-amber-500 font-sans">Restricted Access</span></p>
                      </div>
                   )}

                </CardContent>
             </Card>
          </div>
        )}

        {/* AGENT TAB */}
        {activeTab === 'AGENT' && (
          <div className="grid lg:grid-cols-2 gap-8">
             <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
                <CardHeader>
                   <CardTitle className="text-white flex items-center">
                      <BarChart4 className="w-5 h-5 mr-3 text-amber-500" />
                      Liquidity Inputs
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="grid gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.a_vault}</label>
                         <input type="number" value={vault} onChange={(e)=>setVault(Number(e.target.value))} className="w-full bg-slate-900 border-slate-700 text-white rounded-lg p-3 font-mono text-lg mt-1" />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.a_float}</label>
                         <input type="number" value={floatVal} onChange={(e)=>setFloatVal(Number(e.target.value))} className="w-full bg-slate-900 border-slate-700 text-white rounded-lg p-3 font-mono text-lg mt-1" />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.a_vol}</label>
                         <input type="number" value={vol} onChange={(e)=>setVol(Number(e.target.value))} className="w-full bg-slate-900 border-slate-700 text-white rounded-lg p-3 font-mono text-lg mt-1" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.a_swaps}</label>
                         <input type="number" value={succSwaps} onChange={(e)=>setSuccSwaps(Number(e.target.value))} className="w-full bg-slate-900 border-slate-700 text-emerald-400 rounded-lg p-3 font-mono text-lg mt-1" />
                      </div>
                      <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.a_total}</label>
                         <input type="number" value={totalSwaps} onChange={(e)=>setTotalSwaps(Number(e.target.value))} className="w-full bg-slate-900 border-slate-700 text-white rounded-lg p-3 font-mono text-lg mt-1" />
                      </div>
                   </div>

                   <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/30">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Historical Transaction Volume (ETB)</label>
                      <input type="number" value={agentVolume} onChange={(e)=>setAgentVolume(Number(e.target.value))} className="w-full bg-slate-900 border-indigo-500/30 shadow-inner text-indigo-300 rounded-lg p-3 font-mono text-lg mt-1" />
                   </div>

                   <Button onClick={calculateAgentGrade} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12 uppercase tracking-widest shadow-[0_0_15px_rgba(217,119,6,0.3)]">
                      <TrendingUp className="w-5 h-5 mr-3" /> {t.calcScore}
                   </Button>
                </CardContent>
             </Card>

             <Card className="bg-gradient-to-tr from-slate-900 to-amber-950/20 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[400px]">
                <CardHeader className="text-center relative z-10 w-full mb-0">
                   <CardTitle className="text-slate-400 uppercase tracking-widest text-sm font-bold">{t.a_title}</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 px-8 pb-8 pt-4">
                   {agentGrade ? (
                      <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                         
                         {/* Visual LCR Gauge */}
                         <div className="flex flex-col items-center bg-slate-950/50 pt-6 pb-2 rounded-2xl border border-slate-800/50">
                            <div className="relative flex justify-center items-center h-24 w-full">
                              <svg className="w-40 h-24" viewBox="0 0 140 70">
                                 <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-800" strokeLinecap="round" />
                                 <path d="M 10 65 A 60 60 0 0 1 130 65" fill="none" stroke="currentColor" strokeWidth="12" className={agentGrade.lcr > 0.8 ? 'text-emerald-500' : 'text-amber-500'} strokeLinecap="round" strokeDasharray={188.5} strokeDashoffset={188.5 - (Math.min(100, (agentGrade.lcr / 1.5) * 100) / 100) * 188.5} style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                              </svg>
                              <div className="absolute flex flex-col items-center top-[40px] text-center">
                                <span className={`font-mono text-3xl font-black ${agentGrade.lcr > 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>{agentGrade.lcr.toFixed(2)}x</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">LCR</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">{t.a_lcr}</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col flex-1 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 items-center justify-center">
                              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-1">{t.a_rap}</span>
                              <span className={`font-mono text-2xl font-black ${agentGrade.rap > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{agentGrade.rap}%</span>
                           </div>
                           <div className="flex flex-col flex-1 bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20 items-center justify-center">
                              <span className="text-indigo-400/50 font-bold uppercase tracking-widest text-[10px] mb-1">Vol Score</span>
                              <span className={`font-mono text-2xl font-black text-indigo-400`}>{agentGrade.volScore}%</span>
                           </div>
                         </div>
                         
                         <div className={`mt-6 p-6 rounded-2xl border flex flex-col ${agentGrade.grade === 'A' ? 'bg-emerald-500/10 border-emerald-500/30' : agentGrade.grade === 'B' ? 'bg-indigo-500/10 border-indigo-500/30' : agentGrade.grade === 'C' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                            <div className="flex items-center justify-between mb-2">
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Grade ({agentGrade.weightedScore} pts)</span>
                               <span className={`text-5xl font-black uppercase ${agentGrade.grade === 'A' ? 'text-emerald-400' : agentGrade.grade === 'B' ? 'text-indigo-400' : agentGrade.grade === 'C' ? 'text-amber-400' : 'text-rose-400'}`}>{agentGrade.grade}</span>
                            </div>
                            <div className="text-left mt-4 border-t border-slate-700/50 pt-4">
                               <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Approved Float Credit</span>
                               <span className="font-mono text-2xl text-white tracking-tight">{agentGrade.limit}</span>
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div className="text-center py-12">
                         <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                         <span className="text-slate-600 font-mono text-sm tracking-widest uppercase">Awaiting Computation</span>
                      </div>
                   )}
                </CardContent>
             </Card>
          </div>
        )}

        {/* MATRIX TAB */}
        {activeTab === 'MATRIX' && (
           <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
              <CardHeader className="bg-slate-800/30 border-b border-slate-800 pb-6">
                 <CardTitle className="text-white flex items-center tracking-tight">
                    <ArrowRightLeft className="w-6 h-6 mr-3 text-emerald-500" /> Commission Limits
                 </CardTitle>
                 <CardDescription className="text-slate-400 mt-2 text-sm">{t.r_desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="bg-slate-950 border-b border-slate-800">
                             <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.r_service}</th>
                             <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.r_agent}</th>
                             <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.r_super}</th>
                             <th className="p-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.r_os}</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800">
                          <tr className="hover:bg-slate-800/30 transition-colors">
                             <td className="p-5 font-bold text-slate-200 flex items-center"><Wallet className="w-4 h-4 mr-3 text-indigo-400"/> Cash-In/Out</td>
                             <td className="p-5 font-mono text-emerald-400">0.7%</td>
                             <td className="p-5 font-mono text-slate-300">0.2%</td>
                             <td className="p-5 font-mono text-slate-500">0.1%</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30 transition-colors">
                             <td className="p-5 font-bold text-slate-200 flex items-center"><ArrowRightLeft className="w-4 h-4 mr-3 text-amber-400"/> FMCG Swap</td>
                             <td className="p-5 font-mono text-emerald-400">0.5%</td>
                             <td className="p-5 font-mono text-slate-300">0.25%</td>
                             <td className="p-5 font-mono text-slate-500">0.25%</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30 transition-colors">
                             <td className="p-5 font-bold text-slate-200 flex items-center"><ShieldCheck className="w-4 h-4 mr-3 text-blue-400"/> Equb/Insurance</td>
                             <td className="p-5 font-mono text-emerald-400">60% <span className="text-[10px] text-slate-500 ml-1 font-sans">of Premium</span></td>
                             <td className="p-5 font-mono text-slate-500">—</td>
                             <td className="p-5 font-mono text-slate-300">40%</td>
                          </tr>
                          <tr className="hover:bg-slate-800/30 transition-colors">
                             <td className="p-5 font-bold text-slate-200 flex items-center"><CreditCard className="w-4 h-4 mr-3 text-rose-400"/> Solar PAYG</td>
                             <td className="p-5 font-mono text-emerald-400">50%</td>
                             <td className="p-5 font-mono text-slate-500">—</td>
                             <td className="p-5 font-mono text-slate-300">50%</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        )}

        {/* SCHEMA TAB */}
        {activeTab === 'SCHEMA' && (
           <Card className="bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
              <CardHeader className="bg-slate-800/30 border-b border-slate-800 pb-6">
                 <CardTitle className="text-white flex items-center tracking-tight">
                    <Database className="w-6 h-6 mr-3 text-blue-400" /> AI Workflow Architecture
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="space-y-4">
                    {[
                       { step: 1, title: 'Data Capture', desc: 'Daily reconciliation from Kiosk transactions, GhostSync queues, and Fayda root records.' },
                       { step: 2, title: 'Normalization', desc: 'Inputs baselined against Super Agent Corridor metrics to eliminate geographical bias.' },
                       { step: 3, title: 'Scoring Engine', desc: 'Neural network computes Farmer Ardi (300-900) & Agent LCR/RAP heuristics.' },
                       { step: 4, title: 'Credit Decisioning', desc: 'Generates boolean flags for micro-credit line approvals and ledger bounds.' },
                       { step: 5, title: 'Liquidity Forecasting', desc: 'Simulates shock stress events locally via predictive cash provisioning.' },
                       { step: 6, title: 'Revenue Splitting', desc: 'Smart contracts allocate fees dynamically across Agent, Super Agent, and OS treasury.' }
                    ].map(st => (
                       <div key={st.step} className="flex items-start bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20 mr-4">
                             {st.step}
                          </div>
                          <div>
                             <h4 className="text-slate-200 font-bold mb-1">{st.title}</h4>
                             <p className="text-sm text-slate-500">{st.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
        )}

      </div>
    </div>
  );
}
