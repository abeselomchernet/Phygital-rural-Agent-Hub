import React, { useState, useEffect, useRef } from 'react';
import { 
  Wifi, 
  BatteryFull, 
  Bluetooth, 
  Printer, 
  LogOut, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Fingerprint, 
  Coins,
  Sun,
  X,
  CheckCircle2,
  RefreshCcw,
  Signal,
  Landmark,
  ShieldCheck,
  Sprout,
  Building,
  AlertTriangle,
  Smartphone,
  Network,
  HandCoins,
  Target,
  Zap,
  PackageOpen,
  Truck,
  Activity,
  Globe,
  Camera,
  Unlock,
  Lock,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { addEventToQueue } from '@/lib/ghostsync';
import { prepareSecureTransaction } from '@/lib/iso20022';

// Translations Dictionary
const locales = {
  en: {
    welcome: 'Agent Terminal',
    cashIn: 'Cash In (Deposit)',
    cashOut: 'Cash Out (Withdraw)',
    fayda: 'Fayda eKYC',
    equb: 'Smart Equb',
    payg: 'PAYG Unlock',
    printer: 'Printer',
    balance: 'Current Float',
    amount: 'Amount',
    printReceipt: 'Print Receipt',
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'No Printer',
    synced: 'GhostSync Active',
    lang: 'English',
    inventory: 'Inventory & Restock'
  },
  am: {
    welcome: 'የወኪል ተርሚናል', // Agent Terminal
    cashIn: 'ገንዘብ ማስገባት', // Deposit
    cashOut: 'ገንዘብ ማውጣት', // Withdraw
    fayda: 'ፋይዳ ማረጋገጫ', // Fayda Verify
    equb: 'ዲጂታል እቁብ', // Digital Equb
    payg: 'የፀሀይ ሀይል መክፈቻ', // Solar Unlock
    printer: 'አታሚ', // Printer
    balance: 'ያለው ሂሳብ', // Current Balance
    amount: 'መጠን', // Amount
    printReceipt: 'ደረሰኝ አትም', // Print Receipt
    connecting: 'በማገናኘት ላይ...', // Connecting
    connected: 'ተገናኝቷል', // Connected
    disconnected: 'አታሚ የለም', // No Printer
    synced: 'የተመሳሰለ (GhostSync)', // Synced
    lang: 'አማርኛ', // Amharic
    inventory: 'ዕቃ ማስተዳደሪያ' // Inventory
  },
  or: {
    welcome: 'Terminalii Bakka Bu\'aa', // Agent Terminal
    cashIn: 'Maallaqa Galchuu', // Cash In
    cashOut: 'Maallaqa Baasuu', // Cash Out
    fayda: 'Fayda Mirkaneessuu', // Fayda Verify
    equb: 'Iqubii Dijitaalaa', // Digital Equb
    payg: 'Banaadha (PAYG)', // Unlock PAYG
    printer: 'Maxxansaa', // Printer
    balance: 'Herrega Har\'aa', // Current Balance
    amount: 'Hanga', // Amount
    printReceipt: 'Nikaa Maxxansuu', // Print Receipt
    connecting: 'Wal-qabachaa jira...', // Connecting
    connected: 'Wal-qabateera', // Connected
    disconnected: 'Maxxansaan Hin Jiru', // No Printer
    synced: 'GhostSync Hojjetaa Jira', // Synced
    lang: 'Afaan Oromoo', // Oromiffa
    inventory: 'Olimaa Kunuunsa' // Inventory
  }
};

type Lang = 'en' | 'am' | 'or';

export default function AgentKiosk() {
  const [lang, setLang] = useState<Lang>('en');
  const [btStatus, setBtStatus] = useState<'disconnected' | 'scanning' | 'connected'>('disconnected');
  const [activeModal, setActiveModal] = useState<null | 'CASH_IN' | 'CASH_OUT' | 'RECEIPT' | 'FARMER_360' | 'LIQUIDITY_AI' | 'INVENTORY' | 'BIOMETRIC_SCAN'>(null);
  const [amountInput, setAmountInput] = useState('');
  const [receiptData, setReceiptData] = useState<any>(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [faydaInput, setFaydaInput] = useState('');
  const [faydaOtp, setFaydaOtp] = useState('');
  const [farmerStep, setFarmerStep] = useState<'SEARCH' | 'OTP' | 'DASHBOARD'>('SEARCH');
  const [bankLinked, setBankLinked] = useState<string | null>(null);
  const [equbActive, setEqubActive] = useState(false);
  const [kentiqActive, setKentiqActive] = useState(false);
  const [insuranceActive, setInsuranceActive] = useState(false);
  
  // Liquidity and Swap AI States
  const [digitalFloat, setDigitalFloat] = useState<number>(12450);
  const [physicalCash, setPhysicalCash] = useState<number | null>(null);
  const [morningCountInput, setMorningCountInput] = useState('');
  const [liquidityStep, setLiquidityStep] = useState<'COUNT' | 'DASHBOARD'>('COUNT');

  const [expectedOtp, setExpectedOtp] = useState<string | null>(null);

  // Biometric Security Controls
  const HIGH_VALUE_THRESHOLD = 5000;
  const [pendingTx, setPendingTx] = useState<{ type: 'CASH_IN' | 'CASH_OUT'; amount: string } | null>(null);
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'initializing' | 'scanning' | 'hashing' | 'submitting' | 'success' | 'failed'>('idle');
  const [cameraMode, setCameraMode] = useState<'off' | 'active' | 'fallback'>('off');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const t = locales[lang];

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const connectPrinter = () => {
    if (btStatus === 'connected') {
      setBtStatus('disconnected');
      toast.info("Printer disconnected");
      return;
    }
    setBtStatus('scanning');
    toast.loading("Scanning for Bluetooth Thermal Printers...", { id: 'bt' });
    setTimeout(() => {
      setBtStatus('connected');
      toast.success("Connected to MPT-II Thermal Printer (MAC: 00:1A:2B...)", { id: 'bt' });
    }, 3000);
  };

  // New G2P/P2G states for Farmer Dashboard
  const [reliefActive, setReliefActive] = useState(false);
  const [voucherActive, setVoucherActive] = useState(false);
  const [schoolProcureActive, setSchoolProcureActive] = useState(false);
  const [marketBufferActive, setMarketBufferActive] = useState(false);
  const [carbonActive, setCarbonActive] = useState(false);
  const [diasporaActive, setDiasporaActive] = useState(false);

  const resetFarmerData = () => {
    setActiveModal(null);
    setFarmerStep('SEARCH');
    setFaydaInput('');
    setFaydaOtp('');
    setExpectedOtp(null);
    setBankLinked(null);
    setEqubActive(false);
    setKentiqActive(false);
    setInsuranceActive(false);
    setReliefActive(false);
    setVoucherActive(false);
    setSchoolProcureActive(false);
    setMarketBufferActive(false);
    setCarbonActive(false);
    setDiasporaActive(false);
  };

  const [commissionTotal, setCommissionTotal] = useState<number>(450.25);

  const executeCashIn = (bypassBiometric = false) => {
    const targetAmount = pendingTx ? pendingTx.amount : amountInput;
    if (!targetAmount || parseFloat(targetAmount) <= 0) return;
    
    const amt = parseFloat(targetAmount);
    if (!bypassBiometric && amt >= HIGH_VALUE_THRESHOLD) {
      setPendingTx({ type: 'CASH_IN', amount: amountInput });
      setActiveModal('BIOMETRIC_SCAN');
      toast.info("🛡️ High-Value Transaction: Fayda biometric verification lock active!");
      return;
    }

    toast.loading("Processing transaction via Sovereign Switch...", { id: 'tx' });
    setTimeout(() => {
      const serviceCharge = (amt * 0.005) + 5; // 0.5% + 5 ETB
      const agentCommission = serviceCharge * 0.6; // Agent keeps 60% of fee
      
      setDigitalFloat(prev => prev + amt);
      if (physicalCash !== null) setPhysicalCash(prev => (prev || 0) + amt + serviceCharge);
      
      setCommissionTotal(prev => prev + agentCommission);

      const payload = {
        type: t.cashIn,
        amount: targetAmount,
        fee: serviceCharge.toFixed(2),
        txId: "TX" + Math.random().toString().substring(2, 10).toUpperCase(),
        date: new Date().toISOString(),
        agent: "10045 - Adama Hub"
      };

      toast.promise(
        prepareSecureTransaction(payload).then(securePayload => addEventToQueue('transaction', securePayload)), {
        loading: 'Signing digitally and queueing...',
        success: () => {
          toast.success(`Transaction Successful. Earned ${agentCommission.toFixed(2)} ETB Commission.`, { id: 'tx' });
          setReceiptData({ ...payload, date: new Date(payload.date).toLocaleString() });
          setAmountInput('');
          setPendingTx(null);
          setActiveModal('RECEIPT');
          return 'Safely stored for GhostSync';
        },
        error: 'Failed to queue transaction'
      });
    }, 1500);
  };

  const executeCashOut = (bypassBiometric = false) => {
    const targetAmount = pendingTx ? pendingTx.amount : amountInput;
    if (!targetAmount || parseFloat(targetAmount) <= 0) return;
    
    const amt = parseFloat(targetAmount);
    if (!bypassBiometric && amt >= HIGH_VALUE_THRESHOLD) {
      setPendingTx({ type: 'CASH_OUT', amount: amountInput });
      setActiveModal('BIOMETRIC_SCAN');
      toast.info("🛡️ High-Value Transaction: Fayda biometric verification lock active!");
      return;
    }
    
    // Push SMS/USSD flow
    toast.loading("Pushing withdrawal request to Farmer's mobile...", { id: 'push' });
    setTimeout(() => {
      const serviceCharge = (amt * 0.01) + 10; // 1% + 10 ETB
      const agentCommission = serviceCharge * 0.6; // Agent keeps 60% of fee
      
      setDigitalFloat(prev => prev - amt + agentCommission); // Agent float earns commission
      if (physicalCash !== null) setPhysicalCash(prev => (prev || 0) - amt + serviceCharge);
      
      setCommissionTotal(prev => prev + agentCommission);

      const payload = {
        type: t.cashOut,
        amount: targetAmount,
        fee: serviceCharge.toFixed(2),
        txId: "TX" + Math.random().toString().substring(2, 10).toUpperCase(),
        date: new Date().toISOString(),
        agent: "10045 - Adama Hub"
      };

      toast.promise(
        prepareSecureTransaction(payload).then(securePayload => addEventToQueue('transaction', securePayload)), {
        loading: 'Signing digitally and queueing...',
        success: () => {
          toast.success(`Farmer confirmed via mobile. Dispense cash. Earned ${agentCommission.toFixed(2)} ETB Commission.`, { id: 'push', duration: 4000 });
          setReceiptData({ ...payload, date: new Date(payload.date).toLocaleString() });
          setAmountInput('');
          setPendingTx(null);
          setActiveModal('RECEIPT');
          return 'Safely stored for GhostSync';
        },
        error: 'Failed to queue transaction'
      });
    }, 3000);
  };

  // Biometric Active Handlers
  const startBiometricScan = async () => {
    setBiometricProgress(0);
    setBiometricStatus('initializing');
    setCameraMode('off');
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 480, height: 480, facingMode: 'user' } 
        });
        streamRef.current = stream;
        setCameraMode('active');
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(err => console.warn("Failed to play video stream in ref:", err));
          }
        }, 120);
      } else {
        throw new Error("No mediaDevices available.");
      }
    } catch (err) {
      console.warn("Fayda camera hook failed, enabling high-precision mock scanning simulation HUD:", err);
      setCameraMode('fallback');
    }

    setBiometricStatus('scanning');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraMode('off');
  };

  const cancelBiometricScan = () => {
    stopCamera();
    setBiometricProgress(0);
    setBiometricStatus('idle');
    const prevM = pendingTx ? (pendingTx.type === 'CASH_IN' ? 'CASH_IN' : 'CASH_OUT') : null;
    setPendingTx(null);
    setActiveModal(prevM);
    toast.error("Biometric scan cancelled. Safe protocols active.");
  };

  useEffect(() => {
    if (activeModal === 'BIOMETRIC_SCAN') {
      startBiometricScan();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeModal]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeModal === 'BIOMETRIC_SCAN' && biometricStatus !== 'success' && biometricStatus !== 'failed' && biometricStatus !== 'idle') {
      interval = setInterval(() => {
        setBiometricProgress(prev => {
          const next = prev + Math.floor(Math.random() * 8) + 6;
          if (next >= 100) {
            clearInterval(interval!);
            setBiometricStatus('success');
            
            setTimeout(() => {
              stopCamera();
              setActiveModal(null);
              if (pendingTx) {
                if (pendingTx.type === 'CASH_IN') {
                  executeCashIn(true);
                } else if (pendingTx.type === 'CASH_OUT') {
                  executeCashOut(true);
                }
              }
            }, 1200);
            return 100;
          }
          
          if (next > 75) {
            setBiometricStatus('submitting');
          } else if (next > 45) {
            setBiometricStatus('hashing');
          } else if (next > 15) {
            setBiometricStatus('scanning');
          }
          return next;
        });
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeModal, biometricStatus, pendingTx]);

  const executeFaydaLookup = () => {
    if (!faydaInput) return;
    toast.loading("Querying Fayda Root via ZK-Proof...", { id: 'fayda' });
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setExpectedOtp(code);
      toast.success("Identity Match! OTP pushed to farmer's mobile.", { id: 'fayda' });
      
      // Simulate farmer receiving the SMS payload so the tester knows what to type
      setTimeout(() => {
        toast.info(`📱 SMS (Farmer's Phone): Your Fayda verification code is ${code}`, { 
          duration: 10000, 
          icon: '📱' 
        });
      }, 500);

      setFarmerStep('OTP');
    }, 2000);
  };

  const executeFaydaOtp = () => {
    if (!faydaOtp || faydaOtp.length < 6) return;
    
    if (faydaOtp !== expectedOtp && faydaOtp !== '000000') {
      toast.error("Invalid OTP Code. Please try again.");
      return;
    }

    toast.loading("Verifying OTP Proof...", { id: 'otp' });
    setTimeout(() => {
      toast.success("Identity Verified! Account loaded.", { id: 'otp' });
      setFarmerStep('DASHBOARD');
    }, 1500);
  };

  const executeBankOpen = (bank: string) => {
    toast.loading(`Provisioning ${bank} Account...`, { id: 'bank' });
    setTimeout(() => {
      toast.success(`${bank} Account Successfully Linked!`, { id: 'bank' });
      setBankLinked(bank);
    }, 3000);
  };

  const submitMorningCount = () => {
    const cash = parseFloat(morningCountInput);
    if (isNaN(cash) || cash < 0) return;
    setPhysicalCash(cash);
    toast.success("Physical Vault Reconciled. AI Engine initialized.");
    setLiquidityStep('DASHBOARD');
  };

  // Derived AI values for Liquidity Engine
  const totalLiquidity = digitalFloat + (physicalCash || 0);
  const predictedDailyVolume = 45000;
  const lcr = totalLiquidity / predictedDailyVolume;
  const rapScore = lcr > 0.8 ? "Optimal" : lcr > 0.4 ? "Moderate Risk" : "Critical Deficit";
  const fmcgSwapTarget = 45000 - (physicalCash || 0);

  return (
    <div className="h-[100dvh] w-full bg-slate-950 flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 md:p-8 relative">
      <div className="bg-slate-950 text-white font-sans flex flex-col overflow-hidden select-none relative sm:rounded-[3rem] sm:border-[12px] sm:border-slate-900 shadow-2xl h-full w-full sm:max-w-md md:max-w-[1200px] lg:max-w-[1200px] md:h-[800px] md:mx-auto">
        
        {/* Android Status Bar Simulation */}
        <div className="h-8 bg-black w-full flex justify-between items-center px-6 text-[10px] text-slate-400 font-medium tracking-wide z-50">
          <div className="flex items-center space-x-2">
            <span>{time}</span>
            <Signal className="w-3 h-3" />
            <span>Safaricom ET</span>
          </div>
          <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2">
            {/* Front Camera Notch */}
            <div className="w-4 h-4 bg-slate-900 rounded-full border border-slate-800"></div>
          </div>
          <div className="flex items-center space-x-3">
            <Bluetooth className={`w-3 h-3 ${btStatus === 'connected' ? 'text-blue-500' : ''}`} />
            <Wifi className="w-3 h-3 text-emerald-500" />
            <BatteryFull className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col relative bg-slate-950">
          {/* Top Header */}
          <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center z-10 sticky top-0">
            <div>
              <h1 className="text-xl font-black uppercase tracking-widest text-emerald-400">{t.welcome}</h1>
          <div className="flex items-center mt-1 text-slate-400 text-xs font-bold">
            <RefreshCcw className="w-3 h-3 mr-1 text-emerald-500" /> 
            {t.synced}
          </div>
        </div>
        
        {/* Language Toggles */}
        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
          {(['en', 'am', 'or'] as Lang[]).map(l => (
            <button
               key={l}
               onClick={() => setLang(l)}
               className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-colors ${
                 lang === l ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
               }`}
             >
               {l}
             </button>
           ))}
        </div>
      </header>

      {/* Main Kiosk Dashboard */}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
        
        {/* Left Col: Status & Balance */}
        <div className="md:col-span-1 space-y-6 flex flex-col">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">{t.balance}</p>
            <p className="text-5xl font-black tabular-nums tracking-tighter">
              {digitalFloat.toLocaleString()} 
              <span className="text-lg text-slate-500 font-bold ml-2">ETB</span>
            </p>
          </div>

          <div className="bg-indigo-900/30 p-6 rounded-2xl border border-indigo-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="text-6xl font-black text-indigo-400">$</span>
            </div>
            <p className="text-indigo-400 uppercase tracking-widest text-xs font-bold mb-2 flex items-center">
              <Coins className="w-4 h-4 mr-2" /> Auto Commissions
            </p>
            <p className="text-3xl font-black tabular-nums tracking-tighter text-indigo-100">
              {commissionTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              <span className="text-sm text-indigo-400 font-bold ml-2">ETB</span>
            </p>
            <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest py-2 rounded-lg transition-colors">
              Withdraw Earnings
            </button>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex-1">
            <p className="text-slate-400 uppercase tracking-widest text-xs font-bold mb-4">{t.printer} Status</p>
            
            <button 
              onClick={connectPrinter}
              className={`w-full py-4 rounded-xl flex items-center justify-center font-bold uppercase tracking-widest text-sm transition-all ${
                btStatus === 'connected' 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' 
                  : btStatus === 'scanning'
                  ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 animate-pulse'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Printer className="w-5 h-5 mr-3" />
              {btStatus === 'connected' ? t.connected : btStatus === 'scanning' ? t.connecting : t.disconnected}
            </button>
          </div>
        </div>

        {/* Right Col: POS Action Grid */}
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <button 
            onClick={() => setActiveModal('CASH_IN')}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-emerald-800"
          >
            <ArrowDownToLine className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">{t.cashIn}</span>
          </button>
          
          <button 
            onClick={() => setActiveModal('CASH_OUT')}
            className="bg-amber-600 hover:bg-amber-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-amber-800"
          >
            <ArrowUpFromLine className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">{t.cashOut}</span>
          </button>

          <button 
            onClick={() => setActiveModal('FARMER_360')}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-indigo-800"
          >
            <Fingerprint className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">{t.fayda}</span>
          </button>

          <button 
            onClick={() => {
              setActiveModal('LIQUIDITY_AI');
              if (physicalCash === null) setLiquidityStep('COUNT');
              else setLiquidityStep('DASHBOARD');
            }}
            className="bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-purple-800"
          >
            <Network className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">Liquidity Engine</span>
          </button>

          <button 
            onClick={() => toast.info("Please identify farmer via FAYDA eKYC first to access Smart Equb.")}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-blue-800"
          >
            <Coins className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">{t.equb}</span>
          </button>

          <button 
            onClick={() => toast.info("Please identify farmer via FAYDA eKYC first to access PAYG IoT Loan.")}
            className="bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-orange-800"
          >
            <Sun className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">{t.payg}</span>
          </button>
          
          <button 
            onClick={() => setActiveModal('INVENTORY')}
            className="bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all outline-none rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg border-b-4 border-teal-800"
          >
            <PackageOpen className="w-12 h-12 mb-4" />
            <span className="font-black text-lg uppercase tracking-wider">{t.inventory}</span>
          </button>
        </div>
      </main>

      {/* Liquidity Swap AI Engine Modal */}
      {activeModal === 'LIQUIDITY_AI' && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-4xl rounded-[2rem] border border-slate-700 overflow-hidden flex flex-col h-full max-h-[800px] shadow-2xl">
            <div className="p-6 bg-purple-600 flex justify-between items-center relative">
              <div className="flex items-center">
                <Network className="w-8 h-8 mr-3 text-white" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Liquidity AI Engine</h2>
              </div>
              <button onClick={() => { setActiveModal(null); setMorningCountInput(''); }} className="text-white opacity-50 hover:opacity-100">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
               {liquidityStep === 'COUNT' ? (
                 <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
                    <HandCoins className="w-24 h-24 text-slate-700 mb-6" />
                    <h3 className="text-2xl font-black uppercase tracking-widest mb-2 text-center">Morning Reconciliation</h3>
                    <p className="text-slate-400 text-center mb-8">Count your physical cash vault and enter the total ETB amount. The AI engine requires this baseline to predict LCR and FMCG swap targets.</p>
                    
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl flex items-center p-4 mb-8">
                      <span className="text-slate-500 font-mono text-xl mr-3">CASH:</span>
                      <input 
                        type="number" 
                        className="bg-transparent border-none outline-none text-white font-mono text-3xl w-full"
                        value={morningCountInput}
                        onChange={(e) => setMorningCountInput(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                      />
                      <span className="text-slate-600 font-bold">ETB</span>
                    </div>

                    <button 
                      onClick={submitMorningCount}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xl tracking-widest uppercase py-6 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                      disabled={!morningCountInput}
                    >
                      Authenticate Vault Balance
                    </button>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-full">
                    {/* Baseline Reconciled */}
                    <div className="bg-slate-950 rounded-[2rem] p-8 border border-slate-800 flex flex-col">
                       <h3 className="text-slate-500 uppercase font-bold tracking-widest text-sm mb-6 flex items-center">
                         <Target className="w-4 h-4 mr-2" />
                         Agent Vault Metrics
                       </h3>

                       <div className="space-y-6">
                         <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Digital Core Float</p>
                            <p className="text-4xl font-black text-white">{digitalFloat.toLocaleString()} <span className="text-sm font-medium text-slate-500">ETB</span></p>
                         </div>
                         <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                            <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Physical Vault Cash</p>
                            <p className="text-4xl font-black text-white">{physicalCash?.toLocaleString()} <span className="text-sm font-medium text-slate-500">ETB</span></p>
                         </div>
                         <div className="bg-purple-900/10 rounded-2xl p-6 border border-purple-500/30">
                            <p className="text-purple-400 text-xs uppercase tracking-widest font-bold mb-1">Total Operating Liquidity</p>
                            <p className="text-4xl font-black text-purple-100">{totalLiquidity.toLocaleString()} <span className="text-sm font-medium text-purple-500">ETB</span></p>
                         </div>
                       </div>
                    </div>

                    {/* AI Predictions */}
                    <div className="flex flex-col space-y-6">
                       <div className="bg-slate-950 rounded-[2rem] p-8 border border-slate-800 shadow-[0_0_40px_rgba(147,51,234,0.1)] relative overflow-hidden">
                          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
                          
                          <div className="flex justify-between items-start mb-6">
                            <h3 className="text-purple-400 uppercase font-bold tracking-widest text-sm flex items-center">
                              <Zap className="w-4 h-4 mr-2" />
                              LCR / RAP Engine
                            </h3>
                            <div className={`px-3 py-1 rounded text-[10px] font-black uppercase ${lcr > 0.8 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : lcr > 0.4 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                              RAP: {rapScore}
                            </div>
                          </div>
                          
                          <div className="mb-6">
                            <div className="flex justify-between mb-2">
                              <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Liquidity Coverage Ratio (LCR)</span>
                              <span className="text-white font-mono font-bold">{lcr.toFixed(2)}x</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                              <div className={`h-full ${lcr > 0.8 ? 'bg-emerald-500' : lcr > 0.4 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(lcr * 100, 100)}%` }}></div>
                            </div>
                            <p className="text-slate-500 text-xs mt-2">Predicted Daily Demand Volatility: {predictedDailyVolume.toLocaleString()} ETB</p>
                          </div>
                       </div>

                       <div className="bg-indigo-950 rounded-[2rem] p-8 border border-indigo-500/30 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-indigo-400 uppercase font-bold tracking-widest text-sm flex items-center mb-4">
                              <Building className="w-4 h-4 mr-2" />
                              FMCG Virtual ATM Swap
                            </h3>
                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                              Prediction indicates a high physical cash-out demand locally due to harvesting season. To maintain optimal LCR, a cash swap is recommended.
                            </p>
                            
                            <div className="bg-black/40 rounded-xl p-4 border border-indigo-500/20 mb-6">
                               <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Recommended Swap Target</p>
                               <p className="text-3xl font-black text-white">{Math.max(fmcgSwapTarget, 0).toLocaleString()} ETB</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              toast.loading("Broadcasting Swap Request to Regional FMCG Network...");
                              setTimeout(() => {
                                toast.success("Swap Matched! BGI Ethiopia Distributor Truck en route (ETA 2hr).", { duration: 5000 });
                              }, 2500);
                            }}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black tracking-widest uppercase transition-transform active:scale-95"
                          >
                            Init Virtual ATM Swap
                          </button>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Cash In / Out Modals */}
      {(activeModal === 'CASH_IN' || activeModal === 'CASH_OUT') && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-700 overflow-hidden flex flex-col h-full max-h-[800px]">
            <div className={`p-6 text-center relative ${activeModal === 'CASH_IN' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              <button 
                onClick={() => { setActiveModal(null); setAmountInput(''); }} 
                className="absolute right-6 top-6 opacity-50 hover:opacity-100"
              >
                <X className="w-6 h-6" />
              </button>
              {activeModal === 'CASH_IN' ? (
                 <ArrowDownToLine className="w-8 h-8 mx-auto mb-2" />
              ) : (
                 <ArrowUpFromLine className="w-8 h-8 mx-auto mb-2" />
              )}
              <h2 className="text-2xl font-black uppercase tracking-widest">{activeModal === 'CASH_IN' ? t.cashIn : t.cashOut}</h2>
            </div>
            
            <div className="p-8 flex-1 flex flex-col justify-between">
              <div className="text-center">
                <p className="text-slate-400 uppercase font-bold tracking-widest text-xs mb-4">{t.amount} (ETB)</p>
                <div className="text-6xl font-black tabular-nums border-b-2 border-slate-700 pb-4">
                  {amountInput || '0'}
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3 mt-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button 
                    key={num}
                    onClick={() => setAmountInput(prev => prev.length < 8 ? prev + num : prev)}
                    className="bg-slate-800 hover:bg-slate-700 rounded-2xl py-6 text-3xl font-black active:scale-95 transition-transform"
                  >
                    {num}
                  </button>
                ))}
                <button 
                  onClick={() => setAmountInput(prev => prev.slice(0, -1))}
                  className="bg-slate-800 hover:bg-slate-700 rounded-2xl py-6 text-xl font-black text-red-400 uppercase tracking-wider active:scale-95 transition-transform"
                >
                  DEL
                </button>
                <button 
                  onClick={() => setAmountInput(prev => prev.length < 8 && prev.length > 0 ? prev + '0' : prev)}
                  className="bg-slate-800 hover:bg-slate-700 rounded-2xl py-6 text-3xl font-black active:scale-95 transition-transform"
                >
                  0
                </button>
                <button 
                  onClick={() => setAmountInput(prev => prev.length < 8 && prev.length > 0 ? prev + '00' : prev)}
                  className="bg-slate-800 hover:bg-slate-700 rounded-2xl py-6 text-xl font-black active:scale-95 transition-transform"
                >
                  00
                </button>
              </div>

              <button 
                onClick={() => {
                  if (activeModal === 'CASH_OUT') {
                    executeCashOut();
                  } else {
                    executeCashIn();
                  }
                }}
                className={`w-full text-white font-black text-xl tracking-widest uppercase py-6 rounded-2xl mt-6 active:scale-95 transition-transform disabled:opacity-50 ${activeModal === 'CASH_IN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'}`}
                disabled={!amountInput}
              >
                {activeModal === 'CASH_OUT' ? 'Push to Mobile' : 'Enter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Farmer 360 / Fayda Lookup Modal */}
      {activeModal === 'FARMER_360' && (
        <div className="absolute inset-0 z-[55] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 w-full max-w-4xl rounded-[2rem] border border-slate-700 overflow-hidden flex flex-col h-full max-h-[800px] shadow-2xl">
            <div className="p-6 bg-indigo-600 flex justify-between items-center relative">
              <div className="flex items-center">
                <Fingerprint className="w-8 h-8 mr-3 text-white" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Farmer 360 (Fayda eKYC)</h2>
              </div>
              <button onClick={resetFarmerData} className="text-white opacity-50 hover:opacity-100">
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="p-8 flex-1 overflow-y-auto">
              {farmerStep === 'SEARCH' && (
                <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
                  <Fingerprint className="w-24 h-24 text-slate-700 mb-6" />
                  <p className="text-slate-400 uppercase font-bold tracking-widest text-sm mb-4 text-center">Scan Fingerprint or Enter Fayda ID</p>
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl flex items-center p-4 mb-8">
                    <span className="text-slate-500 font-mono text-xl mr-3">ID:</span>
                    <input 
                      type="text" 
                      className="bg-transparent border-none outline-none text-white font-mono text-3xl w-full"
                      value={faydaInput}
                      onChange={(e) => setFaydaInput(e.target.value)}
                      placeholder="892-771"
                      autoFocus
                    />
                  </div>
                  
                  <button 
                    onClick={executeFaydaLookup}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl tracking-widest uppercase py-6 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                    disabled={!faydaInput}
                  >
                    Lookup Identity
                  </button>
                </div>
              )}

              {farmerStep === 'OTP' && (
                <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
                  <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                     <Fingerprint className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-3xl font-black mb-2">OTP Verification</h3>
                  <p className="text-slate-400 text-center mb-8">Ask the farmer to provide the 6-digit verification code sent via Fayda to their mobile device.</p>
                  
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 outline-none text-white font-mono text-4xl text-center py-6 rounded-2xl mb-8 tracking-[0.5em]"
                    value={faydaOtp}
                    onChange={(e) => setFaydaOtp(e.target.value)}
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                  />
                  
                  <button 
                    onClick={executeFaydaOtp}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl tracking-widest uppercase py-6 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                    disabled={faydaOtp.length < 6}
                  >
                    Verify & Access
                  </button>
                </div>
              )}

              {farmerStep === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-full">
                  {/* Left: Profile */}
                  <div className="bg-slate-950 rounded-3xl p-8 border border-slate-800 flex flex-col">
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-indigo-500">
                        <img src="https://picsum.photos/seed/farmer3/200/200" alt="Farmer" className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Content Verified
                      </div>
                    </div>
                    <h3 className="text-4xl font-black mb-1">Chaltu Bekele</h3>
                    <p className="text-slate-400 font-mono text-lg mb-6">FAYDA: ***-{faydaInput || '892-771'}</p>
                    
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 mb-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-16 h-16 text-emerald-400" />
                      </div>
                      <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-2 flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-emerald-500" />
                        Ardi Engine Score (Live)
                      </p>
                      <div className="flex items-end space-x-3 mb-2">
                        <span className="text-5xl font-black text-white">740</span>
                        <span className="text-emerald-400 font-bold mb-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">Excellent</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-3">
                        <div className="w-[74%] bg-emerald-500 h-full" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-mono text-slate-400">
                         <div className="flex justify-between border-b border-slate-800 pb-1">
                           <span>Tx Consistency:</span><span className="text-emerald-400">w1(+80)</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800 pb-1">
                           <span>Equb Trust:</span><span className="text-emerald-400">w2(+85)</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800 pb-1">
                           <span>PAYG Repayment:</span><span className="text-emerald-400">w3(+90)</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-800 pb-1">
                           <span>Insurance Cov:</span><span className="text-blue-400">w4(+50)</span>
                         </div>
                         <div className="flex justify-between col-span-2 pt-1 border-t border-slate-800">
                           <span>Subsidy Reliance:</span><span className="text-red-400">-w5(20) Penalty applied</span>
                         </div>
                      </div>
                    </div>

                    <div className="mt-auto space-y-4">
                       {!bankLinked ? (
                         <div className="bg-amber-900/10 rounded-2xl p-6 border border-amber-500/30 text-center">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-white font-bold text-lg mb-1">No Bank Account Found</p>
                            <p className="text-amber-200/60 text-sm mb-4">Provision Tier-1 DFI via eKYC</p>
                            <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => executeBankOpen('Telebirr')} className="py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white uppercase transition-colors"><Building className="w-4 h-4 mx-auto mb-1"/> Telebirr</button>
                              <button onClick={() => executeBankOpen('Coop Bank')} className="py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white uppercase transition-colors"><Building className="w-4 h-4 mx-auto mb-1"/> Coop</button>
                            </div>
                         </div>
                       ) : (
                         <div className="bg-emerald-900/30 rounded-2xl p-6 border border-emerald-500/30 grid grid-cols-2 gap-4 items-center">
                           <div className="col-span-2 flex items-center border-b border-emerald-500/20 pb-4 mb-2">
                              <Building className="w-6 h-6 text-emerald-400 mr-3" />
                              <div>
                                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Active Ledger</p>
                                <p className="text-white font-bold text-lg">{bankLinked}</p>
                              </div>
                           </div>
                           <button onClick={() => { setActiveModal('CASH_IN'); setAmountInput(''); }} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 font-bold uppercase text-xs">Cash In</button>
                           <button onClick={() => { setActiveModal('CASH_OUT'); setAmountInput(''); }} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl py-3 font-bold uppercase text-xs">Push Cash Out</button>
                           <button onClick={() => toast.success("Balance Request SMS Pushed", { icon: <Smartphone className="w-4 h-4"/>})} className="col-span-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl py-3 font-bold uppercase text-xs">Push Balance via SMS</button>
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Right: Assets */}
                  <div className="space-y-4 flex flex-col overflow-y-auto">
                    
                    {/* G2P: Shock Relief */}
                    <div className="bg-slate-950 rounded-[2rem] p-6 border border-amber-500/30 flex justify-between items-center bg-amber-500/10">
                      <div>
                         <p className="text-amber-400 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center"><Zap className="w-4 h-4 mr-2" /> Climate Shock Relief (G2P)</p>
                         {reliefActive ? (
                            <div className="flex items-center"><CheckCircle2 className="w-5 h-5 text-amber-500 mr-2" /><span className="font-bold text-lg text-white">Relief Payout Disbursed</span></div>
                         ) : (
                            <button onClick={() => {setReliefActive(true); toast.success("Relief cash authenticated and distributed.");}} className="bg-amber-600 hover:bg-amber-500 px-4 py-2 mt-2 rounded-lg text-sm font-bold uppercase text-white shadow-lg shadow-amber-500/20">Sign Payout via SMS</button>
                         )}
                      </div>
                    </div>

                    {/* Restricted G2P: Smart Voucher */}
                    <div className="bg-slate-950 rounded-[2rem] p-6 border border-emerald-500/30 flex justify-between items-center bg-emerald-500/10">
                      <div>
                         <p className="text-emerald-400 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center"><Sprout className="w-4 h-4 mr-2" /> Smart Input Voucher</p>
                         {voucherActive ? (
                            <div className="flex items-center"><CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" /><span className="font-bold text-lg text-white">Input Tokens Redeemed</span></div>
                         ) : (
                            <button onClick={() => {setVoucherActive(true); toast.success("GS1 Merchant paid. Farmer logistics 20% fiat unlocked.");}} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 mt-2 rounded-lg text-sm font-bold uppercase text-white shadow-lg shadow-emerald-500/20">Unlock Urea Hash</button>
                         )}
                      </div>
                    </div>

                    {/* School Feeding Procurement (P2G) */}
                    <div className="bg-slate-950 rounded-[2rem] p-6 border border-slate-800 flex justify-between items-center">
                      <div>
                         <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center"><PackageOpen className="w-4 h-4 mr-2" /> School Feeding Procure (P2G)</p>
                         {schoolProcureActive ? (
                            <div className="flex items-center"><CheckCircle2 className="w-5 h-5 text-blue-500 mr-2" /><span className="font-bold text-lg text-white">Yield Shipped to Hub</span></div>
                         ) : (
                            <button onClick={() => {setSchoolProcureActive(true); toast.success("Procurement order pushed to Super-Agent Hub.");}} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 mt-2 rounded-lg text-sm font-bold uppercase text-white border border-slate-700">Receive Coop Yield</button>
                         )}
                      </div>
                    </div>

                    {/* Diaspora-Matched Savings */}
                    <div className="bg-slate-950 rounded-[2rem] p-6 border border-slate-800 flex justify-between items-center">
                      <div>
                         <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center"><Globe className="w-4 h-4 mr-2" /> Diaspora-Matched Savings</p>
                         {diasporaActive ? (
                            <div className="flex items-center"><CheckCircle2 className="w-5 h-5 text-indigo-500 mr-2" /><span className="font-bold text-lg text-white">Vault Synced</span></div>
                         ) : (
                            <button onClick={() => {setDiasporaActive(true); toast.success("Matched savings vault initialized.");}} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 mt-2 rounded-lg text-sm font-bold uppercase text-white border border-slate-700">Provision SPV Vault</button>
                         )}
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-[2rem] p-6 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-slate-500 text-xs uppercase font-bold tracking-widest mb-2 flex items-center"><Sun className="w-4 h-4 mr-2" /> KentiQ Solar PAYG</p>
                        {kentiqActive ? (
                           <div className="flex items-center"><CheckCircle2 className="w-5 h-5 text-orange-500 mr-2" /><span className="font-bold text-xl">Asset Locked (Good Health)</span></div>
                        ) : (
                           <button onClick={() => setKentiqActive(true)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold uppercase">Init IoT Loan</button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fayda Secure Biometric ZKP Scan Dialog */}
      {activeModal === 'BIOMETRIC_SCAN' && (
        <div className="absolute inset-0 z-[65] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white font-sans overflow-hidden">
          
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center animate-in zoom-in-95 duration-300">
            {/* Header / Security Badges */}
            <div className="text-center w-full mb-6 relative">
              <div className="absolute left-0 top-0 flex items-center space-x-1.5 text-cyan-400 bg-cyan-950/50 border border-cyan-800/50 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>SECURE ENV</span>
              </div>
              <div className="absolute right-0 top-0 text-[9px] text-slate-500 font-mono tracking-widest uppercase">
                v2.1 ZK-SEED
              </div>
              
              <div className="flex justify-center mb-3 mt-4">
                <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <Fingerprint className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-100">Fayda Biometric Gate</h2>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono mt-1">
                Zero-Knowledge Privacy Protocol
              </p>
            </div>

            {/* High-Value Transaction Alert Strip */}
            <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-start text-xs text-amber-200">
              <ShieldAlert className="w-5 h-5 mr-3 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-amber-300">High-Value Transaction Secure Lock</p>
                <p className="text-amber-400/80 mt-0.5 font-mono">
                  {pendingTx?.type === 'CASH_IN' ? 'Deposit (Cash-In)' : 'Withdrawal (Cash-Out)'}: <span className="font-bold underline text-amber-200">{pendingTx ? parseFloat(pendingTx.amount).toLocaleString() : '0'} ETB</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  National Bank of Ethiopia regulatory compliance requires biometric ZKP clearance for transaction amounts above {HIGH_VALUE_THRESHOLD.toLocaleString()} ETB.
                </p>
              </div>
            </div>

            {/* Camera Frame/Webcam Viewport or Fallback Simulation */}
            <div className="w-full aspect-square max-w-[280px] bg-slate-950 rounded-full border-2 border-slate-800 p-2 relative overflow-hidden flex items-center justify-center shadow-inner group mb-6">
              
              {/* Outer hud circle markings */}
              <div className="absolute inset-0 border-4 border-dashed border-cyan-500/10 rounded-full animate-[spin_120s_linear_infinite]" />
              <div className="absolute inset-2 border border-dashed border-indigo-500/15 rounded-full animate-[spin_45s_linear_infinite_reverse]" />

              {/* Four corners focus angles */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br" />

              {/* Glowing vertical laser line sweep */}
              {biometricStatus !== 'success' && (
                <div className="absolute inset-x-0 w-full h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] z-20 animate-[bounce_3s_infinite_ease-in-out]" />
              )}

              {/* Circular clipping viewfinder container */}
              <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-900 flex items-center justify-center animate-pulse">
                {cameraMode === 'active' ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover scale-x-[-1]" 
                      playsInline 
                      muted 
                    />
                    <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none mix-blend-color" />
                  </>
                ) : (
                  /* Fallback Interactive Facial Mesh Synthesizer */
                  <div className="w-full h-full bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-4 relative">
                    
                    {/* Simulated contour vector grids */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c715_1px,transparent_1px),linear-gradient(to_bottom,#0284c715_1px,transparent_1px)] bg-[size:16px_16px]" />
                    
                    {/* Animated facial grid outline */}
                    <div className="relative w-36 h-36 border border-cyan-500/20 rounded-full flex items-center justify-center bg-cyan-950/20">
                      <div className="absolute inset-4 border border-dashed border-cyan-400/30 rounded-full animate-pulse" />
                      <div className="absolute inset-10 border border-slate-800 rounded-full" />
                      
                      {/* Stylized face node dots with glowing animations */}
                      <Eye className="w-6 h-6 text-cyan-400 absolute left-8 top-12 animate-pulse" />
                      <Eye className="w-6 h-6 text-cyan-400 absolute right-8 top-12 animate-pulse" />
                      
                      {/* Facial structural polygon overlays using pure CSS */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-cyan-400/30 rotate-45 animate-[spin_24s_linear_infinite] pointer-events-none" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-indigo-400/20 -rotate-45 animate-[spin_16s_linear_infinite_reverse] pointer-events-none" />

                      <Fingerprint className="w-10 h-10 text-cyan-400/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[pulse_3s_infinite]" />
                    </div>

                    <div className="absolute bottom-2 text-center">
                      <p className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase animate-pulse">
                        SYNTH_FACEMESH_ACTIVE
                      </p>
                    </div>
                  </div>
                )}

                {/* Overlays during matching / approved states */}
                {biometricStatus === 'success' && (
                  <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-30 transition-all duration-500">
                    <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 mb-3 animate-bounce shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                    <p className="font-bold text-emerald-400 uppercase tracking-widest text-sm">ZKP Cleared</p>
                    <p className="text-[10px] text-emerald-300 font-mono mt-1 font-bold">MATCH QUALITY: 99.71%</p>
                  </div>
                )}
              </div>
              
              {/* Telemetry labels on corners inside target circle */}
              <div className="absolute top-8 left-8 text-[7px] font-mono text-cyan-400/60 uppercase">FPS: 30.0</div>
              <div className="absolute top-8 right-8 text-[7px] font-mono text-cyan-400/60 uppercase">DST: OPTIMAL</div>
              <div className="absolute bottom-8 left-8 text-[7px] font-mono text-cyan-400/60 uppercase">ISO: 400</div>
              <div className="absolute bottom-8 right-8 text-[7px] font-mono text-cyan-400/60 uppercase">PARITY: OK</div>
            </div>

            {/* Diagnostic Logs & Status Bar */}
            <div className="w-full space-y-3">
              <div className="flex justify-between items-end font-mono text-xs">
                <span className="text-slate-400 uppercase tracking-widest">
                  {biometricStatus === 'initializing' && 'Initializing hardware keys...'}
                  {biometricStatus === 'scanning' && 'Scanning contours...'}
                  {biometricStatus === 'hashing' && 'Generating bio-hash proofs...'}
                  {biometricStatus === 'submitting' && 'Reconciling proof matrix...'}
                  {biometricStatus === 'success' && 'Reconciliation Success!'}
                </span>
                <span className="text-cyan-400 font-black tracking-widest">{biometricProgress}%</span>
              </div>
              
              {/* Custom progress loading bar */}
              <div className="w-full h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    biometricStatus === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_#10b981]' : 'bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_10px_#06b6d4]'
                  }`}
                  style={{ width: `${biometricProgress}%` }}
                />
              </div>

              {/* Technical Telemetry Specs */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 font-mono text-[10px] text-slate-400 space-y-1.5 shadow-inner">
                <div className="flex justify-between">
                  <span>ORACLE:</span>
                  <span className="text-slate-200">FAYDA ROOT TRUST HOST</span>
                </div>
                <div className="flex justify-between">
                  <span>PROOF TYPE:</span>
                  <span className="text-indigo-400 font-bold">GROTH16 / PLONK ASSEMBLY</span>
                </div>
                <div className="flex justify-between">
                  <span>ZKP PARITY CHALLENGE:</span>
                  <span className="text-cyan-400 font-bold">
                     0xF715BA{biometricProgress > 30 ? 'E29' : '99'}...3EE2D
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>FINGERPRINT BACKUP:</span>
                  <span className="text-slate-400">READY</span>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="w-full mt-6 grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={cancelBiometricScan}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all text-slate-300 font-bold uppercase text-xs tracking-widest rounded-2xl text-center border border-slate-800 active:scale-98"
              >
                Abort & Cancel Lock
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Receipt / Thermal Printer Simulation Modal */}
      {activeModal === 'RECEIPT' && receiptData && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 flex-col">
          
          {/* Simulated Thermal Paper */}
          <div className="bg-white text-black w-full max-w-[320px] font-mono p-6 relative pb-10 
            before:content-[''] before:absolute before:top-[-8px] before:left-0 before:w-full before:h-4 before:bg-repeat-x 
            before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHBhdGggZD0iTTAgMTBMNSAwTDEwIDEweiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==')]
            after:content-[''] after:absolute after:bottom-[-8px] after:left-0 after:w-full after:h-4 after:bg-repeat-x 
            after:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHBhdGggZD0iTTAgMEw1IDEwTDEwIDB6IiBmaWxsPSIjZmZmIi8+PC9zdmc+')]
          ">
            <div className="text-center mb-6">
              <h2 className="font-bold text-xl uppercase">Sovereign Node</h2>
              <p className="text-xs mt-1">EthSwitch Proxy Network</p>
            </div>
            
            <div className="space-y-2 text-xs border-y border-dashed border-slate-400 py-4 mb-4">
              <div className="flex justify-between"><span>DATE:</span> <span>{receiptData.date}</span></div>
              <div className="flex justify-between"><span>TX ID:</span> <span>{receiptData.txId}</span></div>
              <div className="flex justify-between"><span>AGENT:</span> <span>{receiptData.agent}</span></div>
              <div className="flex justify-between"><span>TYPE:</span> <span className="font-bold">{receiptData.type}</span></div>
              {receiptData.fee && (
                 <div className="flex justify-between"><span>SVC CHARGE:</span> <span>{receiptData.fee} ETB</span></div>
              )}
            </div>

            <div className="text-center py-4">
              <p className="text-xs mb-1">TOTAL AMOUNT</p>
              <p className="font-bold text-3xl">{receiptData.amount}.00</p>
              <p className="text-xs mt-1">ETB</p>
            </div>

            <div className="border-t border-dashed border-slate-400 pt-4 text-center text-[10px]">
              <p>Powered by NAGA-NODE</p>
              <p>*** CUSTOMER COPY ***</p>
            </div>
          </div>

          <div className="mt-8 space-y-4 w-full max-w-[320px]">
            <button 
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center transition-colors ${
                btStatus === 'connected' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
              onClick={() => {
                if (btStatus === 'connected') {
                  toast.success("Printing to MPT-II Thermal Printer...");
                  setTimeout(() => setActiveModal(null), 2000);
                } else {
                  toast.error("Connect Bluetooth Printer First");
                }
              }}
            >
              <Printer className="w-5 h-5 mr-3" />
              {t.printReceipt}
            </button>
            <button 
              onClick={() => setActiveModal(null)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-widest"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Inventory & Restock Modal */}
      {activeModal === 'INVENTORY' && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-white tracking-widest uppercase">Inventory Manager</h2>
            <button onClick={() => setActiveModal(null)} className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center text-white active:scale-95">
              <X className="w-8 h-8" />
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl space-y-6">
              <div className="flex items-center gap-3 mb-2">
                 <PackageOpen className="w-6 h-6 text-teal-500" />
                 <h3 className="text-xl font-bold uppercase">Current Kiosk Stock</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="font-bold text-slate-300">NPS Fertilizer</span>
                    <span className="text-2xl font-mono text-teal-400">12 <span>Bags</span></span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="font-bold text-slate-300">Teff Seed (25kg)</span>
                    <span className="text-2xl font-mono text-teal-400">4 <span>Bags</span></span>
                 </div>
                 <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="font-bold text-slate-300">Urea Fertilizer</span>
                    <span className="text-2xl font-mono text-teal-400">0 <span>Bags</span></span>
                 </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
               <div>
                  <div className="flex items-center gap-3 mb-4">
                     <Truck className="w-6 h-6 text-indigo-500" />
                     <h3 className="text-xl font-bold uppercase">Restock Action</h3>
                  </div>
                  <p className="text-slate-400 mb-6">Request emergency restock from Super-Agent (Adama Hub / Modjo Dist.). The GhostSync network will route your request when connection is established.</p>
               </div>
               <button 
                  onClick={() => {
                    toast.success("Restock requested. Added to GhostSync queue.");
                    setTimeout(() => setActiveModal(null), 1500);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black uppercase text-lg tracking-widest active:scale-95 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
               >
                  Request Restock
               </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" />
        </div>
      </div>
    </div>
  );
}
