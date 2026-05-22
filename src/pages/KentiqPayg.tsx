import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sun, CheckCircle, Lock, Unlock, Key } from 'lucide-react';

export default function KentiqPayg() {
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PROCESSING' | 'PAID'>('IDLE');
  const [deviceStatus, setDeviceStatus] = useState<'LOCKED' | 'UNLOCKED'>('LOCKED');

  const handlePayment = () => {
    setPaymentStatus('PROCESSING');
    toast.loading("Processing 120 ETB via Sovereign Switch...", { id: 'payment' });
    
    setTimeout(() => {
      setPaymentStatus('PAID');
      toast.success("Payment Received in Settlement Account.", { id: 'payment' });
      triggerHSM();
    }, 2000);
  };

  const triggerHSM = () => {
    toast.loading("Cloud HSM Generating JWS Unlock Token...", { id: 'hsm' });
    setTimeout(() => {
      setDeviceStatus('UNLOCKED');
      toast.success("JWS Token Transmitted & Verified Locally. Pump Unlocked for 180 Mins.", { id: 'hsm' });
    }, 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">KentiQ PAYG & IoT</h1>
        <p className="text-slate-500 mt-2">Decentralized asset financing via HSM-signed JWS tokens</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
               <Sun className="w-5 h-5 mr-2 text-orange-500" />
               Solar Irrigation Pump
            </CardTitle>
            <CardDescription>Device: PUMP-ADAMA-09</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex border rounded-xl overflow-hidden text-center items-center">
               <div className={`p-6 flex-1 flex flex-col items-center border-r ${deviceStatus === 'LOCKED' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                 {deviceStatus === 'LOCKED' ? <Lock className="w-12 h-12 mb-2"/> : <Unlock className="w-12 h-12 mb-2"/>}
                 <span className="font-black uppercase tracking-widest">{deviceStatus}</span>
               </div>
               <div className="p-6 flex-1 flex flex-col items-center bg-slate-50">
                 <Key className="w-8 h-8 text-slate-400 mb-2" />
                 <span className="text-xs uppercase text-slate-500 font-bold">Ed25519 Validated</span>
               </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl text-emerald-400 font-mono text-xs overflow-x-auto shadow-inner">
               <p className="text-slate-500 mb-2">// JWS Payload Schema (RFC 7515)</p>
               <pre>
{`{
  "sub": "PUMP-ADAMA-09",
  "units": 180,
  "unitType": "minutes",
  "txRef": "TB-2026-X123",
  "sigAlg": "RS256"
}`}
               </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Farmer Transaction</CardTitle>
            <CardDescription>M-PESA / Telebirr Multi-Rail Switch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2 mb-8">
               <p className="text-sm font-medium text-slate-600">Farmer Profiles</p>
               <div className="p-3 border rounded-lg border-slate-200 flex justify-between items-center">
                 <span className="font-bold">Mulu (Fayda Verified)</span>
                 <span className="text-blue-600 font-medium">Ardi Score: 740</span>
               </div>
             </div>
             
             <div className="bg-slate-50 border rounded-xl p-6 text-center space-y-4">
               <h4 className="text-slate-500 uppercase tracking-widest text-xs font-bold">Amount Due</h4>
               <p className="text-4xl font-black">120 <span className="text-lg font-normal text-slate-500">ETB</span></p>
               
               <Button 
                 className="w-full h-12 text-lg font-bold" 
                 onClick={handlePayment}
                 disabled={paymentStatus !== 'IDLE'}
               >
                 {paymentStatus === 'IDLE' ? 'Pay via M-PESA' : (
                   paymentStatus === 'PAID' ? <><CheckCircle className="w-5 h-5 mr-2" /> Payment Success</> : 'Processing...'
                 )}
               </Button>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
