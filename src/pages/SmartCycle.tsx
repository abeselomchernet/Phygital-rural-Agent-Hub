import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Coins, Trophy, ShieldCheck, RefreshCw, Lock, AlertCircle, Send, Fingerprint, CheckCircle } from 'lucide-react';

const membersList = [
  { id: '1', name: 'Mulu A.', fayda: '***892', ardiScore: 780, rail: 'M-PESA', paid: true, previousWins: 0 },
  { id: '2', name: 'Alemu T.', fayda: '***104', ardiScore: 650, rail: 'Telebirr', paid: true, previousWins: 0 },
  { id: '3', name: 'Chaltu B.', fayda: '***551', ardiScore: 810, rail: 'M-PESA', paid: true, previousWins: 0 },
  { id: '4', name: 'Dawit S.', fayda: '***339', ardiScore: 590, rail: 'Telebirr', paid: false, previousWins: 0 },
  { id: '5', name: 'Fatuma M.', fayda: '***772', ardiScore: 720, rail: 'M-PESA', paid: true, previousWins: 1 },
];

export default function SmartCycleEqub() {
  const [members, setMembers] = useState(membersList);
  const [isDrawing, setIsDrawing] = useState(false);
  const [winner, setWinner] = useState<null | (typeof membersList[0] & { txHash?: string })>(null);

  const totalPot = members.reduce((acc, m) => acc + (m.paid ? 1000 : 0), 0);
  
  // Calculate weights for explicit UI transparency
  const eligibleMembers = members.filter(m => m.previousWins === 0);
  const totalEligibleArdi = eligibleMembers.reduce((acc, m) => acc + m.ardiScore, 0);

  const executeDraw = () => {
    setIsDrawing(true);
    setWinner(null);
    toast.loading("Executing Weighted Smart Contract Draw...", { id: 'draw' });
    
    setTimeout(() => {
      // Pick Chaltu for realistic demonstration
      const drawnWinner = members.find(m => m.id === '3'); 
      if (drawnWinner) {
        setWinner({ ...drawnWinner, txHash: '0x3f...8a1b' });
        setMembers(prev => prev.map(m => m.id === drawnWinner.id ? { ...m, previousWins: 1 } : m));
      }
      setIsDrawing(false);
      toast.success("Draw Complete! Payout routed to winner's wallet via Sovereign Switch.", { id: 'draw' });
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">SmartCycle Equb</h1>
        <p className="text-slate-500 mt-2">Decentralized, Ardi-weighted Rotating Savings and Credit Association</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-indigo-600" />
                  Active Cycle: Adama Agricultural Coop
                </CardTitle>
                <CardDescription>Cycle 4 of 12 • Contribution: 1,000 ETB/Round</CardDescription>
              </div>
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                <Lock className="w-3 h-3 mr-1" />
                Smart Contract Locked
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Fayda ID</TableHead>
                  <TableHead>Ardi Score</TableHead>
                  <TableHead>Draw Weight</TableHead>
                  <TableHead>Rail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => {
                  const weight = m.previousWins > 0 ? 0 : ((m.ardiScore / totalEligibleArdi) * 100);
                  
                  return (
                  <TableRow key={m.id} className={winner?.id === m.id ? "bg-emerald-50/50" : ""}>
                    <TableCell className="font-medium">
                      {m.name} {m.previousWins > 0 && winner?.id !== m.id && <Trophy className="w-3 h-3 inline ml-2 text-slate-300" title="Previous Winner" />}
                      {winner?.id === m.id && <Trophy className="w-4 h-4 inline ml-2 text-yellow-500 animate-pulse" title="Current Winner" />}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 flex items-center">
                      <Fingerprint className="w-3 h-3 mr-1 opacity-50" />
                      {m.fayda}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={m.ardiScore >= 700 ? "border-emerald-200 text-emerald-600" : "border-amber-200 text-amber-600"}>
                        {m.ardiScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                       {m.previousWins > 0 ? (
                         <span className="text-slate-400">0.0% (Won)</span>
                       ) : (
                         <span className="text-indigo-600 font-bold">{weight.toFixed(1)}%</span>
                       )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">{m.rail}</Badge>
                    </TableCell>
                    <TableCell>
                      {m.paid ? (
                        <span className="text-emerald-600 text-[10px] bg-emerald-50 px-2 py-1 rounded font-bold uppercase tracking-wider">Deposited</span>
                      ) : (
                        <button className="flex items-center text-rose-500 hover:text-rose-600 text-[10px] bg-rose-50 hover:bg-rose-100 transition-colors px-2 py-1 rounded font-bold uppercase tracking-wider">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pending
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-slate-200">Current Pot</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <Coins className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <div className="text-4xl font-black text-white">{totalPot.toLocaleString()} <span className="text-lg font-normal text-slate-400">ETB</span></div>
              <p className="text-xs text-slate-400 uppercase tracking-widest mt-2 font-bold">Ready for Disbursement</p>
            </CardContent>
            <CardFooter className="bg-slate-950 p-4 flex flex-col space-y-3">
              <Button 
                className={`w-full text-white ${winner ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`} 
                onClick={executeDraw}
                disabled={isDrawing || winner !== null}
              >
                {isDrawing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : (winner ? <CheckCircle className="w-4 h-4 mr-2" /> : <Trophy className="w-4 h-4 mr-2" />)}
                {isDrawing ? "Calculating Multi-Party Computation..." : (winner ? "Draw Settlement Confirmed" : "Execute Weighted Draw")}
              </Button>
              
              {winner && (
                <div className="w-full bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                   <div>
                     <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-0.5">Sovereign Switch Receipt</p>
                     <p className="text-xs text-emerald-500/70 font-mono">Hash: {winner.txHash}</p>
                   </div>
                   <Badge className="bg-emerald-500 text-white hover:bg-emerald-400">Settled</Badge>
                </div>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
               <CardTitle className="text-sm font-bold text-slate-700 flex items-center">
                 <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
                 SmartCycle Compliance
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
               <div className="flex justify-between border-b pb-2">
                 <span className="text-slate-500">Multi-Sig Slashing</span>
                 <span className="font-medium text-emerald-600">Active</span>
               </div>
               <div className="flex justify-between border-b pb-2">
                 <span className="text-slate-500">Equb-to-Asset (E2A)</span>
                 <span className="font-medium text-slate-700">Enabled</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-slate-500">Social Collateral</span>
                 <span className="font-medium text-slate-700">Enforced</span>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
