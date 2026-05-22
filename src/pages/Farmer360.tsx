import React, { useState } from 'react';
import { 
  Search, ShieldCheck, Activity, ArrowRight, FileText, 
  AlertTriangle, Building, Smartphone, Send, Wallet, Globe,
  Scan, Sprout, CloudLightning, Leaf, PiggyBank, QrCode, Zap, CheckCircle2,
  LockKeyhole
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

const dict = {
  EN: {
    searchTitle: "Farmer 360",
    searchDesc: "Enter Fayda Identification Number (FIN) to begin.",
    searchPlaceholder: "e.g. 892-771-445",
    lookupBtn: "Lookup Profile",
    otpTitle: "OTP Verification",
    otpDesc: "Ask the farmer to provide the 6-digit physical verification code sent to their feature phone.",
    verifyBtn: "Verify Identity",
    faydaVerified: "Fayda Root Verified",
    ardiScore: "Ardi Fleet Score",
    excellent: "Excellent",
    dfiTitle: "Digital Finance Array",
    noAccount: "No Primary Ledger Bound",
    noAccountDesc: "Farmer requires a tiered DFI or Mobile Money account to transact. Provision instantly.",
    exploreEkyc: "Explore Ecosystem & eKYC",
    primaryLedger: "Core Ledger",
    active: "Active",
    cashIn: "Cash In",
    cashOut: "Cash Out",
    pushUssd: "(Push USSD)",
    telcoProxy: "Mobile & Airtime Proxy",
    privacyShield: "Zero-Trust Privacy Shield:",
    privacyDesc: "Agents cannot view exact savings balances. Withdrawals strictly require mobile SMS/USSD confirmation by the farmer.",
    servicesTitle: "G2P / P2G Policy Portfolio",
    shockTitle: "Climate Shock Relief (G2P)",
    shockDesc: "Pre-positioned rapid cash payload from PSNP-Plus.",
    shockAction: "Disburse Emergency Funds",
    shockActive: "Relief Disbursed",
    voucherTitle: "Smart Input Vouchers",
    voucherDesc: "Crypto-locked tokens for Urea/NPS at GS1 merchants.",
    voucherAction: "Redeem Fertilizer Voucher",
    voucherActive: "Voucher Redeemed",
    carbonTitle: "Carbon & Regenerative Farming",
    carbonDesc: "Soil verification payouts from institutional buyers.",
    carbonAction: "Capture NDVI & Claim",
    carbonActive: "NDVI Synced. Payout Pending.",
    diasporaTitle: "Diaspora-Matched Savings",
    diasporaDesc: "P2G remitted capital, matched for micro-loans.",
    diasporaAction: "Open Matched Vault",
    kentiqTitle: "KentiQ Solar Engine",
    kentiqDesc: "Pay-as-you-go IoT Irrigation Pump Tokenization.",
    kentiqAction: "Apply for Hardware",
    openAccountTitle: "Provision Core Ledger",
    openAccountDesc: "Use Fayda eKYC to open a tier-1 account. Secures G2P mapping.",
    ecoBenefits: "Ecosystem Access",
    ecoBenefitsDesc: "Opening this account provides access to PAYG Solar Pump loans, Carbon Payouts, and PSNP-Plus relief logic.",
    withdrawTitle: "Cash Out (USSD Push)",
    withdrawDesc: "A cryptographic signature request will be pushed to the farmer's mobile phone.",
    amountLabel: "Amount (ETB)",
    pushToMobileBtn: "Deploy Multi-Rail Push",
    depositTitle: "Cash In",
    depositDesc: "Process physical cash insertion into the digital ledger.",
    acceptCashBtn: "Authenticate & Accept Cash"
  },
  AM: {
    searchTitle: "ገበሬ 360",
    searchDesc: "ለመጀመር የፋይዳ መታወቂያ ቁጥር (FIN) ያስገቡ።",
    searchPlaceholder: "ምሳሌ፡ 892-771-445",
    lookupBtn: "ፕሮፋይል ፈልግ",
    otpTitle: "የማረጋገጫ ኮድ (OTP)",
    otpDesc: "በፋይዳ በኩል ወደ ገበሬው ሞባይል የተላከውን ባለ 6 አሃዝ የማረጋገጫ ኮድ እንዲሰጡዎት ይጠይቁ።",
    verifyBtn: "ማንነትን አረጋግጥ",
    faydaVerified: "የፋይዳ ማንነት የተረጋገጠ",
    ardiScore: "የአርዲ ውጤት",
    excellent: "በጣም ጥሩ",
    dfiTitle: "ዲጂታል ፋይናንስ ማዕከል",
    noAccount: "ምንም የባንክ ሂሳብ የለም",
    noAccountDesc: "ገበሬው ግብይት ለመፈጸም የሞባይል ገንዘብ ወይም የባንክ ሂሳብ ያስፈልገዋል።",
    exploreEkyc: "eKYCን አስጀምር",
    primaryLedger: "ዋና የባንክ ሂሳብ",
    active: "ንቁ",
    cashIn: "ገንዘብ አስገባ",
    cashOut: "ገንዘብ አውጣ",
    pushUssd: "(በUSSD አረጋግጥ)",
    telcoProxy: "የሞባይል ካርድ ግብይት",
    privacyShield: "የግላዊነት ጥበቃ:",
    privacyDesc: "ወኪሎች ትክክለኛውን የቁጠባ መጠን ማየት አይችሉም። ብር ለማውጣት በገበሬው ጠንካራ ማረጋገጫ ያስፈልጋል።",
    servicesTitle: "ፖሊሲ እና የድጋፍ ስራዎች",
    shockTitle: "የአየር ንብረት አደጋ እርዳታ (G2P)",
    shockDesc: "በPSNP-Plus በኩል አስቀድሞ የተዘጋጀ የገንዘብ እገዛ።",
    shockAction: "የእርዳታ ገንዘብ ክፈል",
    shockActive: "እርዳታ ተከፍሏል",
    voucherTitle: "የግብዓት ቫውቸር",
    voucherDesc: "ለማዳበሪያ (Urea/NPS) የተፈቀደ ዲጂታል ቫውቸር።",
    voucherAction: "ቫውቸርን መንዝር",
    voucherActive: "ቫውቸር ተመንዝሯል",
    carbonTitle: "የካርበን እርሻ ክፍያ",
    carbonDesc: "የአፈር ጥበቃ ስራዎችን በማረጋገጥ ለገበሬው የሚሰጥ ክፍያ።",
    carbonAction: "NDVI ፍተሻ እና ክፍያ ጠይቅ",
    carbonActive: "ተረጋግጧል. ክፍያ በመጠባበቅ ላይ.",
    diasporaTitle: "የዲያስፖራ ቁጠባ (ማቻ)",
    diasporaDesc: "ከውጭ የሚላክ ገንዘብን ለመስኖ ብድር ማዋሃድ።",
    diasporaAction: "የቁጠባ ሂሳብ ክፈት",
    kentiqTitle: "ኬንቲኪው የፀሐይ ሞተር",
    kentiqDesc: "በክፍያ የሚሰራ የIoT የመስኖ ፓምፕ",
    kentiqAction: "ለፓምፕ ያመልክቱ",
    openAccountTitle: "የባንክ ሂሳብ ክፈት",
    openAccountDesc: "በቅጽበት ደረጃ 1 ሂሳብ ለመክፈት የፋይዳ eKYCን ይጠቀሙ።",
    ecoBenefits: "የስርዓቱ ጥቅሞች",
    ecoBenefitsDesc: "ይህን ሂሳብ መክፈት ለፀሐይ ፓምፕ፣ የካርበን ክፍያ እና የእርዳታ ፍሰት ቀላል ያደርገዋል።",
    withdrawTitle: "ገንዘብ አውጣ (Push)",
    withdrawDesc: "ለማጽደቅ የዲጂታል ማረጋገጫ ወደ ገበሬው ሞባይል ስልክ ይላካል።",
    amountLabel: "መጠን (በብር)",
    pushToMobileBtn: "ወደ ሞባይል ላክ",
    depositTitle: "ገንዘብ አስገባ",
    depositDesc: "ጥሬ ገንዘብ ወደ ዲጂታል ሂሳብ የማስገባት ሂደትን ያጠናቅቁ።",
    acceptCashBtn: "ገንዘብ ተቀበል"
  },
  OR: {
    searchTitle: "Qonnaan Bulaa 360",
    searchDesc: "Eegaluuf Lakkoofsa Eenyummaa Fayda (FIN) galchi.",
    searchPlaceholder: "Fknf. 892-771-445",
    lookupBtn: "Odeeffannoo Barbaadi",
    otpTitle: "Mirkaneessa OTP",
    otpDesc: "Koodii mirkaneessaa dijiitii 6 gara bilbila qonnaan bulaatti ergame gaafadhu.",
    verifyBtn: "Eenyummaa Mirkaneessi",
    faydaVerified: "Fayda Mirkanaa'eera",
    ardiScore: "Qabxii Ardi",
    excellent: "Baay'ee Gaarii",
    dfiTitle: "Faayinaansii Dijiitaalaa",
    noAccount: "Herregni Hin Qabatu",
    noAccountDesc: "Qonnaan bulaan dalagaa jalqabuuf herrega Moobaayil Maanii/baankii barbaada.",
    exploreEkyc: "eKYC Sakatta'i",
    primaryLedger: "Herrega Bu'uuraa",
    active: "Hojjetaa Jira",
    cashIn: "Maallaqa Galchi",
    cashOut: "Maallaqa Baasi",
    pushUssd: "(USSD Mirkaneessi)",
    telcoProxy: "Tajaajila Moobaayilaa",
    privacyShield: "Nageenya Iccitii Eegame:",
    privacyDesc: "Bakka bu'oonni qusannoo sirriitti hin argan. Maallaqa baasuuf qonnaan bulaan bilbilaan mirkaneessuu qaba.",
    servicesTitle: "Imaammataa fi Tajaajiloota",
    shockTitle: "Gargarsa Balaa Qilleensaa",
    shockDesc: "Ragaa PSNP-Plus irraa maallaqa saffisaa qophaa'e.",
    shockAction: "Maallaqa Gargarsaa Kenni",
    shockActive: "Gargarsi Kennameera",
    voucherTitle: "Vaawucharii Galfata Qonnaa",
    voucherDesc: "Xaa'oo fi sanyii bituuf vaawucharii dijiitaalaa.",
    voucherAction: "Vaawucharii Raawwadhu",
    voucherActive: "Vaawuchariin Fudhatameera",
    carbonTitle: "Kaffaltii Qonnaa Kaarbonii",
    carbonDesc: "Qulqullina biyyeef kaffaltii dhaabbilee addunyaa irraa dhufu.",
    carbonAction: "Ragaa NDVI Fudhadhu",
    carbonActive: "Ragaan Ergameera. Kaffaltii Eegaa Jira.",
    diasporaTitle: "Qusannoo Diyaasporaa",
    diasporaDesc: "Maallaqa alaa dhufu liqiidhaan walitti hidhuu.",
    diasporaAction: "Herrega Qusannoo Bani",
    kentiqTitle: "KentiQ Motora Aduu",
    kentiqDesc: "Paampii Jallisii IoT Kaffalanii Fayyadamuu",
    kentiqAction: "Liqii Paampiif Iyyadhu",
    openAccountTitle: "Herrega Baankii Bani",
    openAccountDesc: "Akkuma battalatti herrega eKYC Fayda fayyadami.",
    ecoBenefits: "Faayidaalee Sirnichaa",
    ecoBenefitsDesc: "Herrega kana banuun kaffaltii kaarbonii fi paampii aduuf carraa uuma.",
    withdrawTitle: "Maallaqa Baasi (Push)",
    withdrawDesc: "Gaaffiin mirkaneessaa dijiitaalaa gara bilbila qonnaan bulaatti ni ergama.",
    amountLabel: "Hamma (ETB)",
    pushToMobileBtn: "Gara Moobaayilaatti Ergi",
    depositTitle: "Maallaqa Galchi",
    depositDesc: "Maallaqa callaa gara herrega dijiitaalaatti galchuu raawwadhu.",
    acceptCashBtn: "Maallaqa Fudhadhu"
  }
};

type LangKey = 'EN' | 'AM' | 'OR';
type FlowStep = 'SEARCH' | 'OTP' | 'DASHBOARD';

export default function Farmer360() {
  const [lang, setLang] = useState<LangKey>('EN');
  const t = dict[lang];

  const [step, setStep] = useState<FlowStep>('SEARCH');
  const [searchQuery, setSearchQuery] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Farmer Data States
  const [bankAccount, setBankAccount] = useState<string | null>(null);
  const [shockStatus, setShockStatus] = useState<'NONE' | 'ACTIVE'>('NONE');
  const [voucherStatus, setVoucherStatus] = useState<'NONE' | 'ACTIVE'>('NONE');
  const [carbonStatus, setCarbonStatus] = useState<'NONE' | 'ACTIVE'>('NONE');
  const [diasporaStatus, setDiasporaStatus] = useState<'NONE' | 'ACTIVE'>('NONE');

  // Dialog States
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setIsProcessing(true);
    toast.loading("Locating FIN on Sovereign Datastore...", { id: 'search' });
    setTimeout(() => {
      setIsProcessing(false);
      setStep('OTP');
      toast.success("Identity Match. Challenge OTP pushed to linked device.", { id: 'search' });
    }, 2000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setIsProcessing(true);
    toast.loading("Verifying Cryptographic Proof...", { id: 'otp' });
    setTimeout(() => {
      setIsProcessing(false);
      setStep('DASHBOARD');
      toast.success("Identity Verified! Farmer 360 profile loaded securely.", { id: 'otp' });
    }, 1500);
  };

  const handleOpenAccount = (bankName: string) => {
    toast.loading(`Deploying Smart Contract for ${bankName} account via eKYC...`, { id: 'bank' });
    setShowBankDialog(false);
    setTimeout(() => {
      setBankAccount(bankName);
      toast.success(`Account successfully provisioned! Ledger active.`, { id: 'bank' });
    }, 3000);
  };

  const handlePushWithdrawal = () => {
    if (!transactionAmount) return;
    toast.loading(`Orchestrating USSD/SMS block for ${transactionAmount} ETB...`, { id: 'withdraw' });
    setShowWithdrawDialog(false);
    
    // Simulate waiting for farmer USSD confirmation
    setTimeout(() => {
      toast.success("Farmer cryptographically confirmed receipt. Safely dispense fiat.", { id: 'withdraw', duration: 5000 });
      setTransactionAmount('');
    }, 4000);
  };

  const handleDeposit = () => {
    if (!transactionAmount) return;
    toast.loading(`Anchoring deposit of ${transactionAmount} ETB to ledger...`, { id: 'deposit' });
    setShowDepositDialog(false);
    setTimeout(() => {
      toast.success("Deposit indexed and synchronized.", { id: 'deposit' });
      setTransactionAmount('');
    }, 2000);
  };

  const getLanguageLabel = (l: LangKey) => {
    if(l === 'EN') return 'English';
    if(l === 'AM') return 'አማርኛ (Amharic)';
    if(l === 'OR') return 'Afaan Oromoo';
    return l;
  };

  const renderSearch = () => (
    <div className="max-w-2xl mx-auto mt-24 px-4">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(79,70,229,0.15)]">
           <Scan className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-light text-white tracking-tight">{t.searchTitle}</h1>
        <p className="text-slate-400 mt-3 text-lg font-medium">{t.searchDesc}</p>
      </div>
      <Card className="bg-slate-900 border-slate-800 shadow-2xl p-2 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3 p-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder} 
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-14 pr-4 py-5 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-600 font-mono text-xl transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <Button 
            type="submit"
            disabled={isProcessing}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-8 rounded-xl font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
          >
            {t.lookupBtn}
          </Button>
        </form>
      </Card>
    </div>
  );

  const renderOtp = () => (
    <div className="max-w-xl mx-auto mt-24 text-center px-4">
      <div className="w-24 h-24 bg-slate-900 border border-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl relative">
        <div className="absolute inset-0 bg-indigo-500/20 rounded-3xl animate-pulse"></div>
        <Smartphone className="w-10 h-10 text-indigo-400 relative z-10" />
      </div>
      <h2 className="text-3xl font-light text-white mb-3 tracking-tight">{t.otpTitle}</h2>
      <p className="text-slate-400 mb-10 max-w-sm mx-auto leading-relaxed">{t.otpDesc}</p>
      
      <form onSubmit={handleVerifyOtp} className="space-y-6 max-w-sm mx-auto">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <Input 
            type="text" 
            placeholder="• • • • • •" 
            className="relative text-center text-4xl tracking-[0.6em] font-mono py-8 bg-slate-950 border border-slate-800 text-indigo-300 rounded-xl uppercase focus:ring-1 focus:ring-indigo-500"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={isProcessing}
          />
        </div>
        <Button 
          type="submit"
          disabled={isProcessing || otp.length < 6}
          className="w-full bg-slate-100 hover:bg-white text-slate-900 py-6 rounded-xl text-md font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <LockKeyhole className="w-5 h-5 mr-3 text-slate-700" />
          {t.verifyBtn}
        </Button>
      </form>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Identity Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-2xl gap-6">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-slate-950 rounded-2xl border-2 border-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10"></div>
             <img src="https://picsum.photos/seed/farmer_eti/200/200" alt="Farmer Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1.5">
              <h1 className="text-3xl font-black text-white tracking-tight">Chaltu Bekele</h1>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 font-medium"><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> {t.faydaVerified}</Badge>
            </div>
            <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">FIN: 892-771-445 • Modjo Corridor</p>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1.5">{t.ardiScore}</p>
          <div className="flex items-baseline md:justify-end gap-3">
             <p className="text-5xl font-light text-white tracking-tighter">740</p>
             <span className="text-[10px] uppercase font-bold text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 rounded-md tracking-widest">{t.excellent}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Core Financial Operations (Push Model) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Wallet className="w-32 h-32 text-indigo-500" />
            </div>
            <CardHeader className="bg-slate-800/30 border-b border-slate-800 pb-4 relative z-10">
              <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-300 flex items-center">
                <Wallet className="w-4 h-4 mr-2 text-indigo-400" /> {t.dfiTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6 relative z-10">
              {!bankAccount ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-xl text-center">
                  <div className="bg-amber-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
                     <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="font-bold text-amber-300 mb-2 text-lg">{t.noAccount}</p>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">{t.noAccountDesc}</p>
                  <Button onClick={() => setShowBankDialog(true)} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold tracking-wide shadow-[0_0_15px_rgba(217,119,6,0.3)] border-none">
                     {t.exploreEkyc}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-xl flex items-center justify-between shadow-inner">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">{t.primaryLedger}</p>
                      <p className="font-black text-white text-xl tracking-tight">{bankAccount}</p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{t.active}</Badge>
                  </div>

                  <div className="grid gap-3">
                    <Button onClick={() => setShowDepositDialog(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 font-bold text-md shadow-[0_0_15px_rgba(16,185,129,0.2)] rounded-xl transition-all">
                       <Wallet className="w-4 h-4 mr-2" /> {t.cashIn}
                    </Button>
                    <Button onClick={() => setShowWithdrawDialog(true)} variant="outline" className="w-full border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-200 h-14 font-bold text-md rounded-xl transition-all">
                      <Send className="w-4 h-4 mr-2 text-indigo-400" /> {t.cashOut} <span className="text-slate-500 font-normal ml-2">{t.pushUssd}</span>
                    </Button>
                  </div>
                  
                  {/* Airtime Proxy */}
                  <div className="pt-4 border-t border-slate-800/50">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">{t.telcoProxy}</p>
                     <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300">
                           <Smartphone className="w-4 h-4 mr-2 text-emerald-500" /> Telebirr Topup
                        </Button>
                        <Button variant="outline" className="flex-1 bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300">
                           <Smartphone className="w-4 h-4 mr-2 text-red-500" /> M-PESA Send
                        </Button>
                     </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex gap-3 mt-4">
                     <ShieldCheck className="w-5 h-5 shrink-0 text-slate-600 mt-0.5" />
                     <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        <strong className="text-indigo-400/80 uppercase tracking-widest block mb-1">{t.privacyShield}</strong> {t.privacyDesc}
                     </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Wealth & Services Portfolio */}
        <div className="lg:col-span-8">
          <Card className="bg-slate-900 border-slate-800 shadow-xl h-full overflow-hidden">
            <CardHeader className="bg-slate-800/30 border-b border-slate-800 pb-4">
              <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-300 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-amber-500" /> {t.servicesTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800/50">
                
                {/* Climate Shock Rapid Relief */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 shrink-0">
                      <CloudLightning className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-bold text-lg leading-none mb-1.5">{t.shockTitle}</h4>
                      <p className="text-slate-500 text-sm">{t.shockDesc}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
                    {shockStatus === 'NONE' ? (
                      <Button onClick={() => { setShockStatus('ACTIVE'); toast.success('G2P Relief Payload Settled.') }} className="bg-slate-800 hover:bg-amber-600 text-amber-500 hover:text-white font-bold w-full sm:w-auto shadow-none border border-slate-700 hover:border-amber-500">
                         {t.shockAction}
                      </Button>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 py-2 px-4 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                         <CheckCircle2 className="w-4 h-4 mr-2" /> {t.shockActive}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Smart Input Vouchers */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shrink-0">
                      <QrCode className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-bold text-lg leading-none mb-1.5">{t.voucherTitle}</h4>
                      <p className="text-slate-500 text-sm">{t.voucherDesc}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
                    {voucherStatus === 'NONE' ? (
                      <Button onClick={() => { setVoucherStatus('ACTIVE'); toast.success('Voucher Authenticated & Redeemed.') }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto border-none shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                         <Scan className="w-4 h-4 mr-2" /> {t.voucherAction}
                      </Button>
                    ) : (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 py-2 px-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                         <CheckCircle2 className="w-4 h-4 mr-2" /> {t.voucherActive}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Carbon & Regenerative Farming */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 shrink-0">
                      <Leaf className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-bold text-lg leading-none mb-1.5">{t.carbonTitle}</h4>
                      <p className="text-slate-500 text-sm">{t.carbonDesc}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
                     {carbonStatus === 'NONE' ? (
                        <Button onClick={() => { setCarbonStatus('ACTIVE'); toast.success('NDVI Baseline Transmitted.') }} className="bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold w-full sm:w-auto shadow-none border border-slate-700 hover:border-indigo-500">
                           {t.carbonAction}
                        </Button>
                     ) : (
                        <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 py-2 px-4 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
                           <CloudLightning className="w-4 h-4 mr-2 text-indigo-400" /> {t.carbonActive}
                        </Badge>
                     )}
                  </div>
                </div>

                {/* Diaspora-Matched Savings */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 shrink-0">
                      <Globe className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-bold text-lg leading-none mb-1.5">{t.diasporaTitle}</h4>
                      <p className="text-slate-500 text-sm">{t.diasporaDesc}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
                     {diasporaStatus === 'NONE' ? (
                        <Button onClick={() => { setDiasporaStatus('ACTIVE'); toast.success('Matched Vault provisioned.') }} className="bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white font-bold w-full sm:w-auto shadow-none border border-slate-700 hover:border-blue-500">
                           {t.diasporaAction}
                        </Button>
                     ) : (
                        <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40 py-2 px-4">
                           <PiggyBank className="w-4 h-4 mr-2" /> Vault Active
                        </Badge>
                     )}
                  </div>
                </div>

                {/* KentiQ Solar IoT */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 shrink-0">
                      <Zap className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-200 font-bold text-lg leading-none mb-1.5">{t.kentiqTitle}</h4>
                      <p className="text-slate-500 text-sm">{t.kentiqDesc}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto shrink-0">
                    <Button variant="outline" className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 font-bold w-full sm:w-auto bg-transparent">
                       {t.kentiqAction}
                    </Button>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );

  return (
    <div className="min-h-[calc(100vh-6.5rem)] bg-slate-950 md:p-8 p-4 font-sans selection:bg-indigo-500/30">
      
      {/* Top Language Switcher Bar */}
      <div className="flex justify-end mb-6 max-w-7xl mx-auto">
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
      </div>

      {step === 'SEARCH' && renderSearch()}
      {step === 'OTP' && renderOtp()}
      {step === 'DASHBOARD' && renderDashboard()}

      {/* DFI Account Opening Dialog */}
      <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light tracking-tight">{t.openAccountTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
               {t.openAccountDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-xs bg-indigo-500/10 text-indigo-200 p-4 rounded-xl mb-6 border border-indigo-500/30 leading-relaxed shadow-inner">
              <strong className="block uppercase tracking-widest font-black mb-1 text-indigo-400">{t.ecoBenefits}</strong> 
              {t.ecoBenefitsDesc}
            </div>
            <Button onClick={() => handleOpenAccount('Coop Bank of Oromia')} variant="outline" className="w-full justify-start h-16 font-bold text-lg bg-slate-950 border-slate-800 hover:border-indigo-500 hover:bg-slate-900 transition-all rounded-xl text-slate-200">
               <Building className="mr-4 w-6 h-6 text-indigo-500" /> Cooperative Bank
            </Button>
            <Button onClick={() => handleOpenAccount('Telebirr')} variant="outline" className="w-full justify-start h-16 font-bold text-lg bg-slate-950 border-slate-800 hover:border-emerald-500 hover:bg-slate-900 transition-all rounded-xl text-slate-200">
               <Smartphone className="mr-4 w-6 h-6 text-emerald-500" /> Telebirr Mobile
            </Button>
            <Button onClick={() => handleOpenAccount('M-PESA')} variant="outline" className="w-full justify-start h-16 font-bold text-lg bg-slate-950 border-slate-800 hover:border-red-500 hover:bg-slate-900 transition-all rounded-xl text-slate-200">
               <Smartphone className="mr-4 w-6 h-6 text-red-500" /> M-PESA
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light tracking-tight">{t.withdrawTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t.withdrawDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="amount" className="font-bold text-slate-500 uppercase tracking-widest text-xs">{t.amountLabel}</Label>
                <Input 
                   id="amount" 
                   type="number" 
                   placeholder="0" 
                   className="text-4xl py-8 font-mono bg-slate-950 border-slate-800 text-white rounded-xl focus-visible:ring-indigo-500"
                   value={transactionAmount}
                   onChange={(e) => setTransactionAmount(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter>
             <Button onClick={handlePushWithdrawal} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-14 text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">{t.pushToMobileBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light tracking-tight">{t.depositTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t.depositDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="amount_dep" className="font-bold text-slate-500 uppercase tracking-widest text-xs">{t.amountLabel}</Label>
                <Input 
                   id="amount_dep" 
                   type="number" 
                   placeholder="0" 
                   className="text-4xl py-8 font-mono bg-slate-950 border-slate-800 text-white rounded-xl focus-visible:ring-emerald-500"
                   value={transactionAmount}
                   onChange={(e) => setTransactionAmount(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter>
             <Button onClick={handleDeposit} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-sm font-bold uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">{t.acceptCashBtn}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
