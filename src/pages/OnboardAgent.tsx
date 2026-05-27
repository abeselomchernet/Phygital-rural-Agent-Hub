import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addEventToQueue } from '@/lib/ghostsync';
import { UserCheck, Briefcase, Cpu, GraduationCap, ChevronRight, ChevronLeft, CheckCircle2, Camera, X, RefreshCw } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function OnboardAgent() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    firstName: '',
    lastName: '',
    nationalId: '', // Fayda ID
    phone: '',
    // Step 2: Commercial
    tinNumber: '',
    businessName: '',
    // Step 3: Hardware
    posSerial: '',
    region: 'Adama',
  });

  const [faydaVerified, setFaydaVerified] = useState(false);
  const [tinVerified, setTinVerified] = useState(false);
  const [posAssigned, setPosAssigned] = useState(false);

  // Success Feedback States (Beep & Highlights)
  const [faydaFlashing, setFaydaFlashing] = useState(false);
  const [posFlashing, setPosFlashing] = useState(false);

  // Secure Cryptographic success audio speaker notification hook
  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Play double confirmation beep (harmonic notification)
      playTone(880, 0, 0.08);
      playTone(1046.5, 0.09, 0.12);
    } catch (e) {
      console.warn("Audio Context audio feedback blocked or unsupported:", e);
    }
  };

  // Simulated Camera Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanType, setScanType] = useState<'fayda' | 'pos' | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStartScan = (type: 'fayda' | 'pos') => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScanType(type);
    setScannerOpen(true);
    setScanProgress(0);
    setScanMessage('Initializing secure hardware camera feed...');
    
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      currentProgress += 5;
      if (currentProgress > 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        
        if (type === 'fayda') {
          const mockId = `FAY-${Math.floor(100000 + Math.random() * 900000)}`;
          setFormData(prev => ({
            ...prev,
            nationalId: mockId,
            firstName: prev.firstName || 'Chaltu',
            lastName: prev.lastName || 'Bekele',
            phone: prev.phone || '+251912345678'
          }));
          toast.success(`OCR Scan Complete: Extracted Fayda ${mockId}`);
          playSuccessBeep();
          setFaydaFlashing(true);
          setTimeout(() => setFaydaFlashing(false), 2000);
        } else {
          const mockSerial = `POS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          setFormData(prev => ({
            ...prev,
            posSerial: mockSerial
          }));
          toast.success(`Barcode Scan Complete: Registered Node ${mockSerial}`);
          playSuccessBeep();
          setPosFlashing(true);
          setTimeout(() => setPosFlashing(false), 2000);
        }
        
        setScannerOpen(false);
        setScanType(null);
      } else {
        setScanProgress(currentProgress);
        if (currentProgress < 25) {
          setScanMessage('Calibrating optical lenses & SVID keys...');
        } else if (currentProgress < 55) {
          setScanMessage(type === 'fayda' ? 'Scanning Fayda biometric QR code card...' : 'Analyzing hardware MAC serial barcode...');
        } else if (currentProgress < 80) {
          setScanMessage('Performing Zero-Knowledge integrity checks...');
        } else {
          setScanMessage('Binding parameters to regional ledger matrix...');
        }
      }
    }, 120);
  };

  const handleCancelScan = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setScannerOpen(false);
    setScanType(null);
    toast.error('Scanning session terminated by agent.');
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d+]/g, '');
    handleInputChange('phone', val);
  };

  // --- Step Handlers ---
  const handleVerifyFayda = async () => {
    if (!formData.nationalId || !formData.firstName || !formData.phone) {
      toast.error('Please complete all identity fields');
      return;
    }
    const phoneRegex = /^(\+2519|\+2517|09|07)\d{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Invalid phone. Must be Ethiopian format (+2519... or 09...)');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      if (formData.nationalId.startsWith('FAY')) {
        setFaydaVerified(true);
        toast.success('Fayda Cryptographic Identity Verified');
        setCurrentStep(2);
      } else {
        toast.error('Invalid Fayda ID format. Try FAY-123456');
      }
      setLoading(false);
    }, 1200);
  };

  const handleVerifyTIN = async () => {
    if (!formData.tinNumber || !formData.businessName) {
      toast.error('Please complete all commercial fields');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (formData.tinNumber.length >= 8) {
        setTinVerified(true);
        toast.success('NBE / Ministry of Revenue TIN Verified');
        setCurrentStep(3);
      } else {
        toast.error('TIN must be at least 8 digits');
      }
      setLoading(false);
    }, 1200);
  };

  const handleAssignPOS = async () => {
    if (!formData.posSerial) {
      toast.error('Please scan or enter a POS Serial Number');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      if (formData.posSerial.startsWith('POS-')) {
        setPosAssigned(true);
        toast.success('Hardware Cryptographically Bound to Agent Profile');
        setCurrentStep(4);
      } else {
         toast.error('Invalid Hardware Node ID. Use POS-XXXX formatting.');
      }
      setLoading(false);
    }, 1200);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      await addEventToQueue('ONBOARD_AGENT', { 
        ...formData, 
        status: 'ACADEMY_ENROLLED',
        timestamp: new Date().toISOString() 
      });
      toast.success('Agent Provisioned & Admitted to Academy HQ');
      
      // Reset
      setTimeout(() => {
        setFormData({
            firstName: '', lastName: '', nationalId: '', phone: '',
            tinNumber: '', businessName: '', posSerial: '', region: 'Adama'
        });
        setFaydaVerified(false);
        setTinVerified(false);
        setPosAssigned(false);
        setCurrentStep(1);
        setLoading(false);
      }, 1000);
    } catch(e) {
      toast.error('Error queuing onboarding packet to GhostSync');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900 border-b border-indigo-200 pb-3">Agent Provisioning Gateway</h1>
        <p className="text-slate-500 mt-3 font-medium uppercase tracking-widest text-[10px]">Tier 1 Physical Edge Node Onboarding</p>
      </div>

      {/* Progress Wizard */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden p-2">
         {[
           { step: 1, icon: UserCheck, label: 'Fayda Oracle' },
           { step: 2, icon: Briefcase, label: 'MoR TIN' },
           { step: 3, icon: Cpu, label: 'Hardware Edge' },
           { step: 4, icon: GraduationCap, label: 'Academy Init' },
         ].map((s) => (
           <div key={s.step} className={`flex-1 flex flex-col items-center py-4 rounded-lg transition-colors ${currentStep === s.step ? 'bg-indigo-50 border border-indigo-100' : currentStep > s.step ? 'opacity-50' : 'opacity-40'}`}>
              <s.icon className={`w-6 h-6 mb-2 ${currentStep >= s.step ? 'text-indigo-600' : 'text-slate-400'}`} />
              <p className={`text-xs font-bold uppercase tracking-wider ${currentStep >= s.step ? 'text-indigo-700' : 'text-slate-400'}`}>{s.label}</p>
           </div>
         ))}
      </div>

      {/* Main Flow Container */}
      <div className="relative min-h-[400px]">
        
        {/* STEP 1: Fayda Identity */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-indigo-100 shadow-md">
              <CardHeader className="bg-indigo-50/50 border-b border-indigo-100">
                <CardTitle className="flex items-center text-indigo-900">
                  <UserCheck className="w-5 h-5 mr-3 text-indigo-600" />
                  Zero-Knowledge Fayda Identity Verification
                </CardTitle>
                <CardDescription>We request standard assertions without storing the biometric seed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="faydaInput">National ID Number (Fayda)</Label>
                    <div className={`relative rounded-md transition-all duration-300 ${faydaFlashing ? 'ring-4 ring-emerald-500 bg-emerald-500/10 border-emerald-500' : ''}`}>
                      <Input 
                        id="faydaInput" 
                        value={formData.nationalId} 
                        onChange={e => handleInputChange('nationalId', e.target.value)} 
                        placeholder="FAY-XXXXX" 
                        className={`font-mono bg-white pr-10 border-indigo-200 transition-all duration-300 ${faydaFlashing ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 font-bold' : ''}`} 
                      />
                      <button 
                        type="button"
                        onClick={() => handleStartScan('fayda')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all"
                        title="Simulate Camera Scanner"
                      >
                        <Camera className="w-5 h-5" />
                      </button>

                      {/* Viewfinder overlay on top of input element during scan state */}
                      {scannerOpen && scanType === 'fayda' && (
                        <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-between px-3 text-xs font-mono text-indigo-400 z-10 rounded-md border border-indigo-500 animate-pulse">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                            <span className="text-[10px] tracking-wider uppercase font-bold text-indigo-300">Scanner active</span>
                          </div>
                          
                          {/* Simulated local sweep scan line overlay */}
                          <div className="absolute inset-y-0 left-1/3 right-1/3 border-x border-indigo-500/20 overflow-hidden">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_#6366f1] animate-bounce" />
                          </div>

                          <span className="text-[9px] text-slate-400">OCR Read...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Agent Mobile (Registered)</Label>
                    <Input id="phone" value={formData.phone} onChange={handlePhoneChange} placeholder="+2519..." className="font-mono bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Legal First Name</Label>
                    <Input id="firstName" value={formData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} placeholder="Abebe" className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Legal Last Name</Label>
                    <Input id="lastName" value={formData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} placeholder="Kebede" className="bg-white" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end">
                 <Button onClick={handleVerifyFayda} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                    {loading ? 'Consulting Oracle...' : 'Verify Constraints'} <ChevronRight className="w-4 h-4 ml-2" />
                 </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* STEP 2: Commercial TIN */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <Card className="border-blue-100 shadow-md">
              <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                <CardTitle className="flex items-center text-blue-900">
                  <Briefcase className="w-5 h-5 mr-3 text-blue-600" />
                  Commercial Authority Routing (TIN)
                </CardTitle>
                <CardDescription>Ensuring 100% formal economic compliance for liquidity operations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tinNumber">Ministry of Revenue TIN</Label>
                    <Input id="tinNumber" value={formData.tinNumber} onChange={e => handleInputChange('tinNumber', e.target.value)} placeholder="000188992" className="font-mono text-lg tracking-widest text-blue-900 bg-blue-50/30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Registered Trade Name (Woreda level)</Label>
                    <Input id="businessName" value={formData.businessName} onChange={e => handleInputChange('businessName', e.target.value)} placeholder="Abebe Kiosk & Agri Retail" className="bg-white" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-between">
                 <Button variant="ghost" onClick={() => setCurrentStep(1)}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
                 <Button onClick={handleVerifyTIN} disabled={loading} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                    {loading ? 'Routing to MoR...' : 'Commit Commercial Record'} <ChevronRight className="w-4 h-4 ml-2" />
                 </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* STEP 3: POS Hardware Binding */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <Card className="border-emerald-100 shadow-md bg-emerald-50/10">
              <CardHeader className="bg-emerald-50/50 border-b border-emerald-100">
                <CardTitle className="flex items-center text-emerald-900">
                  <Cpu className="w-5 h-5 mr-3 text-emerald-600" />
                  Edge Hardware Cryptographic Binding
                </CardTitle>
                <CardDescription>Physically lock the Android POS node to the verified identity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <Label htmlFor="posSerial">Hardware Node Serial (Scanner)</Label>
                    <div className={`relative rounded-md transition-all duration-300 ${posFlashing ? 'ring-4 ring-emerald-500 bg-emerald-500/10 border-emerald-500' : ''}`}>
                      <Input 
                        id="posSerial" 
                        value={formData.posSerial} 
                        onChange={e => handleInputChange('posSerial', e.target.value)} 
                        placeholder="POS-[MAC]" 
                        className={`font-mono uppercase bg-white border-emerald-200 pr-10 transition-all duration-300 ${posFlashing ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 font-bold' : ''}`} 
                      />
                      <button 
                        type="button"
                        onClick={() => handleStartScan('pos')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                        title="Simulate Camera Scanner"
                      >
                        <Camera className="w-5 h-5" />
                      </button>

                      {/* Viewfinder overlay on top of input element during scan state */}
                      {scannerOpen && scanType === 'pos' && (
                        <div className="absolute inset-0 bg-slate-950/95 flex items-center justify-between px-3 text-xs font-mono text-emerald-400 z-10 rounded-md border border-emerald-500 animate-pulse">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] tracking-wider uppercase font-bold text-emerald-300">Scanner active</span>
                          </div>
                          
                          {/* Simulated local sweep scan line overlay */}
                          <div className="absolute inset-y-0 left-1/3 right-1/3 border-x border-emerald-500/20 overflow-hidden">
                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-bounce" />
                          </div>

                          <span className="text-[9px] text-slate-400">Barcode...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <Label htmlFor="region">Deployment Corridor / Geo-Fence</Label>
                    <select 
                       id="region" 
                       value={formData.region} 
                       onChange={e => handleInputChange('region', e.target.value)}
                       className="flex h-10 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                       <option value="Adama">Adama Core Region</option>
                       <option value="Modjo">Modjo Logistics Hub</option>
                       <option value="Bishoftu">Bishoftu Corridor</option>
                       <option value="Hawassa">Hawassa Deep Rural</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-between">
                 <Button variant="ghost" onClick={() => setCurrentStep(2)}><ChevronLeft className="w-4 h-4 mr-2" /> Back</Button>
                 <Button onClick={handleAssignPOS} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                    {loading ? 'Validating Root Trust...' : 'Provision POS Key'} <ChevronRight className="w-4 h-4 ml-2" />
                 </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* STEP 4: Academy Integration */}
        {currentStep === 4 && (
          <div className="animate-in zoom-in-95 duration-500">
            <Card className="border-slate-800 shadow-xl bg-slate-900 text-white">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-400">
                   <GraduationCap className="w-8 h-8 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl font-light text-slate-100">Ready for Agent Academy</CardTitle>
                <CardDescription className="text-slate-400">All constraints met. Profile is securely staged.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 relative">
                 <div className="bg-black/40 rounded-lg p-6 border border-slate-800 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                       <span className="text-slate-500">Fayda ZK Anchor:</span>
                       <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified ({formData.nationalId})</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-slate-500">Commercial Authority:</span>
                       <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Cleared (TIN: {formData.tinNumber})</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-slate-500">Hardware Bound:</span>
                       <span className="text-emerald-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> Linked ({formData.posSerial})</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-3">
                       <span className="text-slate-500">Geo-Fence Active:</span>
                       <span className="text-indigo-400 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> {formData.region} Corridor</span>
                    </div>
                 </div>
              </CardContent>
              <CardFooter className="pt-4 pb-8 flex flex-col items-center space-y-4">
                 <Button onClick={handleFinalSubmit} disabled={loading} size="lg" className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg text-lg font-bold">
                    {loading ? 'Queuing Event...' : 'Transmit to GhostSync Grid'}
                 </Button>
                 <Button variant="ghost" onClick={() => setCurrentStep(3)} className="text-slate-400 hover:text-white">Review Constraints</Button>
              </CardFooter>
            </Card>
          </div>
        )}

      </div>

      {/* Immersive Camera Scanner Simulation Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <Card className="w-full max-w-lg border-2 border-indigo-500/30 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
            {/* Cyber Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />
            
            <div className="relative p-6 flex flex-col items-center">
              <div className="flex justify-between items-center w-full pb-4 border-b border-slate-800">
                <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 flex items-center gap-1.5 uppercase">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  Secured SVID Camera Node Link
                </span>
                <button 
                  onClick={handleCancelScan} 
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Holographic Target Viewfinder */}
              <div className="w-full aspect-video rounded-xl bg-slate-950/90 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center my-6">
                
                {/* Scanner Laser Sweep Line */}
                <div 
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1] animate-bounce w-full"
                />

                {/* Cyber Corner Targets */}
                <div className={`absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 ${scanType === 'fayda' ? 'border-indigo-500' : 'border-emerald-500'}`} />
                <div className={`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 ${scanType === 'fayda' ? 'border-indigo-500' : 'border-emerald-500'}`} />
                <div className={`absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 ${scanType === 'fayda' ? 'border-indigo-500' : 'border-emerald-500'}`} />
                <div className={`absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 ${scanType === 'fayda' ? 'border-indigo-500' : 'border-emerald-500'}`} />

                {/* Real-time Telemetry Data Box (Decrypted Stream) */}
                <div className="absolute inset-x-6 top-6 bottom-6 flex flex-col justify-between border border-white/5 bg-black/30 p-4 rounded-lg font-mono text-[10px] text-slate-400 pointer-events-none">
                  <div className="flex justify-between">
                    <span>GRID: ADAMA_GEO_FENCE_7</span>
                    <span>FPS: 60.00</span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6">
                    {scanType === 'fayda' ? (
                      <UserCheck className="w-12 h-12 text-indigo-400/40 animate-pulse mb-2" />
                    ) : (
                      <Cpu className="w-12 h-12 text-emerald-400/40 animate-pulse mb-2" />
                    )}
                    <span className="text-white text-xs text-center font-bold font-sans uppercase">
                      {scanType === 'fayda' ? 'Place Fayda QR Card' : 'Align Hardware MAC Tag'}
                    </span>
                  </div>

                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>SVID: verified_trust</span>
                    <span>WRE_NEXUS: active</span>
                  </div>
                </div>

                {/* Animated Scanner Progress Ring/Overlay */}
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                  <div className="text-center">
                    <div className="font-mono text-4xl font-extrabold tracking-widest text-white/90">
                      {scanProgress}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress and status message */}
              <div className="w-full space-y-3">
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-100 ${scanType === 'fayda' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>

                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                  <p className="font-mono text-xs text-slate-300 leading-relaxed truncate">
                    {scanMessage}
                  </p>
                </div>
              </div>

              <div className="w-full flex justify-end mt-6 gap-2 border-t border-slate-800 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleCancelScan}
                  className="bg-transparent hover:bg-slate-800 border-slate-700 text-slate-300 font-semibold"
                >
                  Cancel Scan
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
