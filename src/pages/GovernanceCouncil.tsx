import React, { useState } from 'react';
import { Scale, Timer, CheckCircle, XCircle, Users, Landmark, FileText, BarChart3, Fingerprint, Coins } from 'lucide-react';
import { toast } from 'sonner';

export default function GovernanceCouncil() {
  const [hasVoted, setHasVoted] = useState(false);
  const [votePower, setVotePower] = useState(1); // Quadratic voting power simulation

  const [activeProposal, setActiveProposal] = useState({
    id: "PROP-ADAMA-004",
    title: "Adjust AgriTrust Threshold (0.35 → 0.40 NDVI)",
    description: "Proposed due to early-onset heat stress in the corridor. Increasing the threshold allows for earlier parametric payouts to protect the Adama-Modjo teff yield.",
    proposer: "Super-Agent Zinash K. (Adama Hub)",
    votesFor: 642000,
    votesAgainst: 120500,
    endsIn: "22h 14m",
    status: "VOTING_ACTIVE",
    impact: ["Ardi Score Rules", "AgriTrust Oracles"]
  });

  const [pastProposals] = useState([
    { id: "PROP-MODJO-003", title: "Increase PSNP-Plus Fertilizer Subsidy Base by 15%", status: "PASSED", date: "2026-02-14", passedFor: 890000, passedAgainst: 45000 },
    { id: "PROP-NEXUS-002", title: "Expand KentiQ PayG to Solar Water Pumps", status: "PASSED", date: "2026-01-20", passedFor: 512000, passedAgainst: 320000 },
    { id: "PROP-SYS-001", title: "Reduce Agent Float Limit to ETB 200,000", status: "REJECTED", date: "2025-12-05", passedFor: 120000, passedAgainst: 950000 }
  ]);

  const totalVotes = activeProposal.votesFor + activeProposal.votesAgainst;
  const progressPercentage = (activeProposal.votesFor / totalVotes) * 100;

  const handleVote = (type: 'AYE' | 'NAY') => {
    toast.loading("Calculating Quadratic Vote Weight via Fayda Identity...", { id: "vote" });
    
    setTimeout(() => {
       toast.loading(`Committing ${votePower} Voice Credits to Sovereign Ledger...`, { id: "vote" });
       setHasVoted(true);
       
       setTimeout(() => {
         setActiveProposal(prev => ({
           ...prev,
           votesFor: type === 'AYE' ? prev.votesFor + (votePower * 1500) : prev.votesFor,
           votesAgainst: type === 'NAY' ? prev.votesAgainst + (votePower * 1500) : prev.votesAgainst,
         }));
         toast.success(`Vote ${type} successfully sealed in the ESX DAO pool.`, { id: "vote", icon: <CheckCircle className="text-emerald-500 w-4 h-4" /> });
       }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-slate-900">Governance DAO</h1>
        <p className="text-slate-500 mt-2">Symbolic Society & Community-Centric Oversight</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-white text-2xl font-black flex items-center">
              <Scale className="text-indigo-500 mr-3" size={28} />
              Sovereign Council Dashboard
            </h2>
            <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">
              Corridor: Adama-Modjo Nexus
            </p>
          </div>
          <div className="flex space-x-2">
            <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-black">Treasury Balance</p>
              <p className="text-emerald-400 font-mono text-sm font-bold">ETB 1,240,500.00</p>
            </div>
          </div>
        </div>

        {/* Active Proposal Card */}
        <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 p-4 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase flex items-center rounded-bl-2xl">
            <Timer size={12} className="mr-1" /> Ends in {activeProposal.endsIn}
          </div>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-indigo-500 font-bold mb-2 flex items-center">
                <FileText className="w-3 h-3 mr-1" /> {activeProposal.id}
              </p>
              <h3 className="text-white font-bold text-2xl mb-2 max-w-2xl">{activeProposal.title}</h3>
              <p className="text-xs text-slate-400 font-mono flex items-center">
                 Proposer: <span className="text-slate-300 ml-1">{activeProposal.proposer}</span>
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-3xl">
            {activeProposal.description}
          </p>

          <div className="flex space-x-2 mb-8">
            {activeProposal.impact.map((tag, idx) => (
               <span key={idx} className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-widest border border-slate-700">
                  Impacts: {tag}
               </span>
            ))}
          </div>

          {/* Voting Progress */}
          <div className="space-y-4 mb-8 max-w-3xl">
            <div className="flex justify-between text-xs uppercase font-black">
              <span className="text-emerald-500">Aye: {activeProposal.votesFor.toLocaleString()} Voice Credits</span>
              <span className="text-red-500">Nay: {activeProposal.votesAgainst.toLocaleString()} Voice Credits</span>
            </div>
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700">
              <div
                className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981] transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              />
              <div
                className="h-full bg-red-500/80 transition-all duration-1000"
                style={{ width: `${100 - progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Action Buttons & Quadratic Input */}
          <div className="max-w-3xl border-t border-slate-800 pt-6 mt-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                 <p className="text-white font-bold text-sm flex items-center"><Fingerprint className="w-4 h-4 mr-2 text-indigo-400" /> Quadratic Voting Panel</p>
                 <p className="text-[10px] text-slate-500">Costs square exponentially (e.g., 2 Power = 4 Credits). Verified via Fayda ID.</p>
              </div>
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-700 p-1.5 rounded-lg">
                 <button onClick={() => setVotePower(Math.max(1,votePower-1))} disabled={hasVoted} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded disabled:opacity-50">-</button>
                 <span className="font-black text-indigo-400 w-4 text-center">{votePower}</span>
                 <button onClick={() => setVotePower(Math.min(5,votePower+1))} disabled={hasVoted} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded disabled:opacity-50">+</button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleVote('AYE')}
                disabled={hasVoted}
                className="py-4 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <CheckCircle size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Sign Aye
              </button>
              <button 
                onClick={() => handleVote('NAY')}
                disabled={hasVoted}
                className="py-4 bg-red-600/10 hover:bg-red-600/20 border border-red-500/50 text-red-400 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <XCircle size={18} className="mr-2 group-hover:scale-110 transition-transform" /> Sign Nay
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-3 text-slate-400" />
              Past Executed Proposals
            </h3>
            <div className="space-y-3">
              {pastProposals.map(prop => (
                <div key={prop.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                  <div>
                     <p className="text-[10px] text-slate-500 font-mono mb-1">{prop.date} • {prop.id}</p>
                     <p className="text-sm font-bold text-slate-300">{prop.title}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                    prop.status === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {prop.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-6 h-fit">
            <h3 className="text-white font-bold text-sm mb-6 flex items-center uppercase tracking-widest">
              <Coins className="w-4 h-4 mr-2 text-yellow-500" />
              DAO Treasury Stats
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Active Voters (Last 30D)</p>
                <p className="text-white font-bold text-2xl flex items-center">4,281 <Users className="w-4 h-4 ml-2 text-indigo-400" /></p>
              </div>
              
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Current Quorum Target</p>
                <p className="text-emerald-500 font-bold text-2xl">82% <span className="text-[10px] text-slate-500 font-normal ml-1">of required weight</span></p>
              </div>
              
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Treasury Growth</p>
                <p className="text-emerald-400 font-bold text-lg">+14.2% <span className="text-[10px] text-slate-500 font-normal ml-1">MoM</span></p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
