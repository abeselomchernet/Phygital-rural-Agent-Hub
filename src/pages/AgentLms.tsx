import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  GraduationCap, PlayCircle, CheckCircle2, Coins, BookOpen, 
  Award, Play, Globe, ShieldCheck, FileText, Satellite, Zap
} from 'lucide-react';

const dict = {
  EN: {
    title: "Naga-Node Academy",
    subtitle: "Certified Agent & Super Agent Training Hub",
    coinBal: "CommunityCoin Balance",
    certStatus: "Certification Status",
    fieldManual: "Tactical Field Manual V8.0",
    overallProg: "Overall Progress",
    reqs: "Requirements",
    req1: "Device Hardware PIN",
    req2: "VeriFayda Agent Identity",
    req3: "Core Modules 100%",
    cert: "Fully Certified",
    certDesc: "Ready for Field Deployment",
    curr: "Required Curriculum",
    start: "Compile Module",
    playing: "Processing...",
    completed: "Data Verified",
    duration: "Duration:",
    courses: [
      { id: 'c1', duration: '15 mins', reward: 500, icon: 'bank', title: 'The Sovereign Switch & LCR', desc: 'Managing M-PESA & Telebirr liquidity, understanding Nexus Swaps, and reacting to LCR alerts.' },
      { id: 'c2', duration: '20 mins', reward: 800, icon: 'wifi', title: 'Ghost-Sync Protocol 101', desc: 'Mastering offline transaction captures, establishing Data Mule handshakes, and conflict resolution.' },
      { id: 'c3', duration: '12 mins', reward: 350, icon: 'shield', title: 'VeriFayda eKYC & Privacy', desc: 'Biometric scanning best practices, hardware binding, and explaining Zero-Knowledge privacy to farmers.' },
      { id: 'c5', duration: '30 mins', reward: 1200, icon: 'file', title: 'Smart Input Vouchers & GS1', desc: 'Processing restricted fertilizer vouchers, whitelist routing, and the 20% logistics cash-unlock rule.' },
      { id: 'c6', duration: '25 mins', reward: 950, icon: 'sat', title: 'Carbon Farming & Ground Truth', desc: 'On-farm verification protocols, capturing baseline NDVI data, and routing payments for regenerative practices.' }
    ]
  },
  AM: {
    title: "ናጋ-ኖድ አካዳሚ",
    subtitle: "የተመሰከረላቸው ወኪሎች ማሰልጠኛ ማዕከል",
    coinBal: "የኮሚዩኒቲ ኮይን ቀሪ ሂሳብ",
    certStatus: "የምስክር ወረቀት ሁኔታ",
    fieldManual: "ታክቲካል የሜዳ ማኑዋል V8.0",
    overallProg: "አጠቃላይ ሂደት",
    reqs: "መስፈርቶች",
    req1: "የመሳሪያ ሃርድዌር የይለፍ ቃል",
    req2: "ቬሪፋይዳ የወኪል ማንነት",
    req3: "ዋና ሞጁሎች 100%",
    cert: "ሙሉ በሙሉ የተረጋገጠ",
    certDesc: "ለስራ ተልዕኮ ዝግጁ",
    curr: "መወሰድ ያለበት ትምህርት",
    start: "ሞጁል ጀምር",
    playing: "በማስኬድ ላይ...",
    completed: "ተረጋግጧል",
    duration: "ቆይታ:",
    courses: [
      { id: 'c1', duration: '15 ደቂቃ', reward: 500, icon: 'bank', title: 'ሉዓላዊ ስዊች እና LCR', desc: 'የኤም-ፔሳ እና ቴሌብር ፈሳሽነትን ማስተዳደር፣ የኔክሰስ ቅያሬዎችን መረዳት እና ለ LCR ማንቂያዎች ምላሽ መስጠት።' },
      { id: 'c2', duration: '20 ደቂቃ', reward: 800, icon: 'wifi', title: 'የጎስት-ሲንክ ፕሮቶኮል 101', desc: 'ከመስመር ውጭ ግብይቶችን መመዝገብ፣ ከዳታ በቅሎዎች ጋር ግንኙነት መፍጠር እና ግጭቶችን መፍታት።' },
      { id: 'c3', duration: '12 ደቂቃ', reward: 350, icon: 'shield', title: 'የቬሪፋይዳ eKYC እና ግላዊነት', desc: 'የጣት አሻራ አጠቃቀም ደንቦች፣ የመሳሪያ ትስስር እና ዜሮ-እውቀት ግላዊነትን ለአርሶ አደሮች ማስረዳት።' },
      { id: 'c5', duration: '30 ደቂቃ', reward: 1200, icon: 'file', title: 'ዘመናዊ የግብዓት ቫውቸር እና GS1', desc: 'የተገደቡ የማዳበሪያ ቫውቸሮችን ማስተናገድ እና የ20% የትራንስፖርት ጥሬ ገንዘብ ፍቃድ አሰራርን መረዳት።' },
      { id: 'c6', duration: '25 ደቂቃ', reward: 950, icon: 'sat', title: 'የካርበን እርሻ እና የሳተላይት መረጃ', desc: 'በእርሻ ላይ የሚደረግ ማረጋገጫ፣ የNDVI መረጃ አሰባሰብ እና ለካርበን ክፍያ መላክ አሰራር።' }
    ]
  },
  OR: {
    title: "Akkaadaamii Naga-Node",
    subtitle: "Wiirtuu Leenjii Bakka Bu'oota Mirkanaa'anii",
    coinBal: "Haftee CommunityCoin",
    certStatus: "Haala ragaa",
    fieldManual: "Qajeelfama Dirree Tooftaa V8.0",
    overallProg: "Guddina Waliigalaa",
    reqs: "Ulaagaalee",
    req1: "PIN Meeshaa Hardiweerii",
    req2: "Eenyummaa Bakka Bu'aa VeriFayda",
    req3: "Moojuloota Bu'uuraa 100%",
    cert: "Guutummaatti Mirkanaa'e",
    certDesc: "Hojii dirree tiif qophiidha",
    curr: "Sirna Barnootaa Dirqamaa",
    start: "Moojulii Eegali",
    playing: "Hojjetaa jira...",
    completed: "Mirkanaa'eera",
    duration: "Turtii:",
    courses: [
      { id: 'c1', duration: 'Daqiiqaa 15', reward: 500, icon: 'bank', title: 'Sovereign Switch fi LCR', desc: 'Liiquwiiditii M-PESA fi Telebirr to\'achuu, Nexus Swaps hubachuu fi akeekkachiisa LCR deebii kennuu.' },
      { id: 'c2', duration: 'Daqiiqaa 20', reward: 800, icon: 'wifi', title: 'Ghost-Sync Protocol 101', desc: 'Darbaawwan sarbaraa ala ta\'an to\'achuu, walqunnamtii Data Mule uumuu fi walitti bu\'iinsa hiikuu.' },
      { id: 'c3', duration: 'Daqiiqaa 12', reward: 350, icon: 'shield', title: 'VeriFayda eKYC fi Iccitii', desc: 'Qajeelfamoota scan biometrikii, walitti hidhamiinsa haardiweerii fi Zero-Knowledge iftoomina qonnaan gartokkoof ibsuu.' },
      { id: 'c5', duration: 'Daqiiqaa 30', reward: 1200, icon: 'file', title: 'Vaawucharii Qonnaa fi GS1', desc: 'Vaawucharii daangeffame keessummeessuu fi seera %20 qarshii geejjibaaf hayyamamu hubachuu.' },
      { id: 'c6', duration: 'Daqiiqaa 25', reward: 950, icon: 'sat', title: 'Qonnaa Kaarbonii fi Saatalaaytii', desc: 'Qulqullina lafaa mirkaneessuu, ragaa NDVI funyaanuu fi kaffaltii kaarboniif mijeessuu.' }
    ]
  }
};

type LangKey = 'EN' | 'AM' | 'OR';

export default function AgentLms() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({ c1: true });
  const [coins, setCoins] = useState(500);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);

  const completedCount = Object.keys(completedMap).length;
  const overallProgress = (completedCount / t.courses.length) * 100;

  const handleStartCourse = (id: string, reward: number) => {
    setActiveCourse(id);
    toast.info("Initializing Holographic Training Protocol...");
    
    setTimeout(() => {
      setCompletedMap(prev => ({ ...prev, [id]: true }));
      setCoins(prev => prev + reward);
      setActiveCourse(null);
      toast.success(`Module Authenticated. +${reward} CC Credited.`);
    }, 4500);
  };

  const getLanguageLabel = (l: LangKey) => {
    if(l === 'EN') return 'English';
    if(l === 'AM') return 'አማርኛ (Amharic)';
    if(l === 'OR') return 'Afaan Oromoo';
    return l;
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'file': return <FileText className="w-8 h-8 opacity-70" />;
      case 'sat': return <Satellite className="w-8 h-8 opacity-70" />;
      case 'shield': return <ShieldCheck className="w-8 h-8 opacity-70" />;
      default: return <PlayCircle className="w-8 h-8 opacity-50" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white flex items-center">
             <GraduationCap className="w-8 h-8 mr-3 text-indigo-400" />
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

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-xl flex items-center shadow-lg">
            <Coins className="w-5 h-5 mr-3 text-amber-400" />
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-500/70 leading-none mb-1">{t.coinBal}</p>
              <p className="font-mono font-black text-xl leading-none text-amber-300">{coins.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 pt-4">
        {/* Progress Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-slate-900 text-white border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
               <Award className="w-32 h-32 text-indigo-400" />
            </div>
            <CardHeader className="relative z-10 border-b border-slate-800 pb-4">
              <CardTitle className="text-slate-100 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-3 text-indigo-400" />
                {t.certStatus}
              </CardTitle>
              <CardDescription className="text-slate-500">{t.fieldManual}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10 pt-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-300">{t.overallProg}</span>
                  <span className="font-bold text-emerald-400">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2 bg-slate-800 [&>div]:bg-indigo-500" />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">{t.reqs}</h4>
                <div className="flex items-center text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <CheckCircle2 className="w-4 h-4 mr-3 text-emerald-500" />
                  <span className="text-slate-300">{t.req1}</span>
                </div>
                <div className="flex items-center text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <CheckCircle2 className="w-4 h-4 mr-3 text-emerald-500" />
                  <span className="text-slate-300">{t.req2}</span>
                </div>
                <div className={`flex items-center text-sm p-3 rounded-lg border ${overallProgress === 100 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
                  {overallProgress === 100 ? (
                    <CheckCircle2 className="w-4 h-4 mr-3 text-emerald-500" />
                  ) : (
                    <div className="w-4 h-4 mr-3 rounded-full border-2 border-slate-600" />
                  )}
                  <span className={overallProgress === 100 ? "text-emerald-400 font-bold" : "text-slate-400"}>{t.req3}</span>
                </div>
              </div>

              {overallProgress === 100 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-xl text-center shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-in fade-in duration-500">
                  <Award className="w-10 h-10 mx-auto text-emerald-400 mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <p className="text-sm font-bold text-emerald-300 uppercase tracking-widest">{t.cert}</p>
                  <p className="text-xs text-emerald-500/70 mt-2 font-medium">{t.certDesc}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
            <BookOpen className="w-4 h-4 mr-2 text-indigo-400" />
            {t.curr}
          </h2>
          
          <div className="grid gap-4">
            {t.courses.map((course) => {
              const isCompleted = completedMap[course.id];
              const isActive = activeCourse === course.id;

              return (
                <Card key={course.id} className={`overflow-hidden transition-all duration-300 bg-slate-900 border-slate-800 shadow-xl 
                  ${isActive ? 'ring-2 ring-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] scale-[1.01]' 
                    : isCompleted ? 'border-emerald-500/30' 
                    : 'hover:border-slate-600'}`}>
                  <div className="flex flex-col sm:flex-row h-full">
                    
                    {/* Visual Indicator Left Pane */}
                    <div className={`flex items-center justify-center sm:w-28 py-6 sm:py-0 transition-colors border-r
                      ${isCompleted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : isActive ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                        : 'bg-slate-800/50 text-slate-500 border-slate-800'}`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,1)]" />
                      ) : (
                        getIcon(course.icon)
                      )}
                    </div>
                    
                    {/* Content Right Pane */}
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={`font-bold text-lg leading-tight ${isCompleted ? 'text-emerald-50' : 'text-slate-100'}`}>
                          {course.title}
                        </h3>
                        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap ml-4 shadow-none">
                          +{course.reward} CC
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-6 leading-relaxed mt-1">{course.desc}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-800/50">
                        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">{t.duration} {course.duration}</span>
                        {!isCompleted ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleStartCourse(course.id, course.reward)}
                            disabled={activeCourse !== null && !isActive}
                            className={`font-bold transition-all px-6 tracking-wide shadow-none
                              ${isActive ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]" 
                                : "bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700 hover:text-white"}`}
                          >
                            {isActive ? (
                              <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-indigo-200 animate-pulse" /> {t.playing}</span>
                            ) : t.start}
                          </Button>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 font-bold uppercase tracking-widest text-[10px]">
                            {t.completed}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
