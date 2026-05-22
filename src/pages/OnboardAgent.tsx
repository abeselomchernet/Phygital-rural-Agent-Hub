import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { addEventToQueue } from '@/lib/ghostsync';
import { UserCheck, Briefcase, Cpu, GraduationCap, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

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
                    <Label htmlFor="nationalId">National ID Number (Fayda)</Label>
                    <Input id="nationalId" value={formData.nationalId} onChange={e => handleInputChange('nationalId', e.target.value)} placeholder="FAY-XXXXX" className="font-mono bg-white" />
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
                    <Input id="posSerial" value={formData.posSerial} onChange={e => handleInputChange('posSerial', e.target.value)} placeholder="POS-[MAC]" className="font-mono uppercase bg-white border-emerald-200" />
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
    </div>
  );
}
