import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getPendingEvents, syncEvents, clearEvent } from '@/lib/ghostsync';
import { Button } from '@/components/ui/button';
import { 
  HardDriveDownload, AlertCircle, RefreshCcw, Trash2, 
  Split, GitMerge, Check, X, AlertTriangle, ArrowRight, 
  Database, Calendar, Hash, ShieldAlert, Cpu, Layers, 
  FileCheck, Shield, HelpCircle, Undo2
} from 'lucide-react';
import { toast } from 'sonner';

// Type definitions for collisions
interface ConflictEvent {
  id: string;
  type: 'timestamp_collision' | 'sequence_mismatch' | 'dual_fayda_handshake';
  kioskA: string;
  kioskB: string;
  muleA: string;
  muleB: string;
  timestampA: string;
  timestampB: string;
  amountA: number;
  amountB: number;
  nonceA: number;
  nonceB: number;
  signatureA: string;
  signatureB: string;
  description: string;
  status: 'unresolved' | 'resolved' | 'rejected';
  resolvedWith?: string; // 'A' | 'B' | 'merged' | 'rejected'
  mergedPayload?: {
    amount: number;
    timestamp: string;
    nonce: number;
    notes: string;
    strategy: string;
    txHash: string;
    approver: string;
  };
}

// Initial Seeding for Timestamp/Sequence Conflicts
const SEED_CONFLICTS: ConflictEvent[] = [
  {
    id: 'conflict-01',
    type: 'timestamp_collision',
    kioskA: 'Zinash Corn Dealer (Adama-01)',
    kioskB: 'Awash Arable Cooperatives (Adama-02)',
    muleA: 'Adama Logistics Truck (Mule-01)',
    muleB: 'Mojo Rural Moto (Mule-02)',
    timestampA: '2026-05-27T12:00:00.005Z',
    timestampB: '2026-05-27T12:00:00.005Z',
    amountA: 4500,
    amountB: 4500,
    nonceA: 4102,
    nonceB: 4102,
    signatureA: '0x8f12a9deca3c12a77f98...',
    signatureB: '0xb23e41deca3c9b456e34...',
    description: 'Timestamp match at exact millisecond! Both Kiosks submitted transactions using duplicate sequence nonce #4102 over overlapping Data Mule routes. Double-spend or desynchronized clock risk detected.',
    status: 'unresolved'
  },
  {
    id: 'conflict-02',
    type: 'sequence_mismatch',
    kioskA: 'Bekele T. Grain Storage (Adama-03)',
    kioskB: 'Bekele T. Grain Storage (Adama-03)',
    muleA: 'Adama Logistics Truck (Mule-01)',
    muleB: 'Mojo Rural Moto (Mule-02)',
    timestampA: '2026-05-27T09:44:12.000Z',
    timestampB: '2026-05-27T09:44:20.000Z',
    amountA: 12500,
    amountB: 12000,
    nonceA: 817,
    nonceB: 817,
    signatureA: '0xcc19142f3a5eb1bf984c...',
    signatureB: '0xda39a3ee5e6b4b0d3255...',
    description: 'Divergent ledger state amounts detected for Sequence #817 from Bekele T. Storage via different mules. This indicates a remote write-race or packet modification.',
    status: 'unresolved'
  },
  {
    id: 'conflict-03',
    type: 'dual_fayda_handshake',
    kioskA: 'Alemu Mill & Sift (Mojo-01)',
    kioskB: 'Meki South Agri Depot (Mojo-02)',
    muleA: 'Mojo Rural Moto (Mule-02)',
    muleB: 'Adama Logistics Truck (Mule-01)',
    timestampA: '2026-05-27T10:15:30.120Z',
    timestampB: '2026-05-27T10:15:34.900Z',
    amountA: 800,
    amountB: 850,
    nonceA: 1045,
    nonceB: 1045,
    signatureA: '0xfayda_sha256_ab41d3...',
    signatureB: '0xfayda_sha256_8f91c9...',
    description: 'Fayda ZKP ID verification collision: Two separate merchants checked out using identical seed session nonces at overlapping times. Cryptographic identity desync or network mutation overlap.',
    status: 'unresolved'
  }
];

export default function GhostSyncQueue() {
  const [activeTab, setActiveTab] = useState<'queue' | 'conflicts'>('queue');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  
  // Conflict resolution states
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictEvent | null>(null);
  
  // Form values for active manual merge merging
  const [mergedAmount, setMergedAmount] = useState<number>(0);
  const [mergedTimestamp, setMergedTimestamp] = useState<string>('');
  const [mergedNonce, setMergedNonce] = useState<number>(0);
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');
  const [resolutionStrategy, setResolutionStrategy] = useState<string>('merge_combine');
  
  // Merge animation sequence
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveStep, setResolveStep] = useState<number>(0);

  // Load standard database events
  const loadEvents = async () => {
    const evts = await getPendingEvents();
    setEvents(evts);
  };

  // Load and initialize conflicts from storage
  const loadConflicts = () => {
    const saved = localStorage.getItem('ghostsync_conflicts_store');
    if (saved) {
      try {
        setConflicts(JSON.parse(saved));
      } catch (e) {
        setConflicts(SEED_CONFLICTS);
      }
    } else {
      setConflicts(SEED_CONFLICTS);
      localStorage.setItem('ghostsync_conflicts_store', JSON.stringify(SEED_CONFLICTS));
    }
  };

  useEffect(() => {
    loadEvents();
    loadConflicts();
    const int = setInterval(loadEvents, 2000); // UI poll for database events
    return () => clearInterval(int);
  }, []);

  // Update form defaults on conflict selection
  useEffect(() => {
    if (selectedConflict) {
      setMergedAmount(selectedConflict.amountA);
      setMergedTimestamp(selectedConflict.timestampA);
      setMergedNonce(selectedConflict.nonceA);
      setSupervisorNotes('');
      setResolutionStrategy(selectedConflict.type === 'timestamp_collision' ? 'merge_combine' : 'use_a');
    }
  }, [selectedConflict]);

  const handleForceSync = async () => {
    if (!navigator.onLine) {
      toast.error('You are currently offline.');
      return;
    }
    toast.info('Forcing GhostSync sync...');
    await syncEvents();
    loadEvents();
  };

  const handleClear = async (key: string) => {
    await clearEvent(key);
    setSelectedKeys(prev => prev.filter(k => k !== key));
    loadEvents();
    toast.success('Event cleared from queue');
  };

  const handleClearFailed = async () => {
    const failedEvents = events.filter((e) => e.status === 'failed');
    if (failedEvents.length === 0) {
      toast.info('No failed events to clear.');
      return;
    }
    for (const e of failedEvents) {
      await clearEvent(e.row_key);
    }
    setSelectedKeys(prev => prev.filter(k => !failedEvents.some(fe => fe.row_key === k)));
    loadEvents();
    toast.success(`Cleared ${failedEvents.length} failed events`);
  };

  const toggleSelect = (key: string) => {
    setSelectedKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    if (selectedKeys.length === events.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(events.map(e => e.row_key));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    try {
      for (const key of selectedKeys) {
        await clearEvent(key);
      }
      toast.success(`Successfully deleted ${selectedKeys.length} event(s) from the queue`);
      setSelectedKeys([]);
      loadEvents();
    } catch (error) {
      toast.error('Failed to perform bulk deletion');
    }
  };

  // Inject a new random timestamp collision event for real-time testing
  const handleInjectCollision = () => {
    const randomId = `conflict-${Math.floor(100 + Math.random() * 900)}`;
    const randomSec = Math.floor(1000 + Math.random() * 8000);
    const names = [
      'Bekele T. Grain Storage (Adama-03)', 
      'Zinash Corn Dealer (Adama-01)', 
      'Awash Arable Cooperatives (Adama-02)',
      'Alemu Mill & Sift (Mojo-01)',
      'Chala East Wheat Kiosk (Mojo-03)'
    ];
    const nameA = names[Math.floor(Math.random() * names.length)];
    let nameB = names[Math.floor(Math.random() * names.length)];
    while (nameB === nameA) {
      nameB = names[Math.floor(Math.random() * names.length)];
    }

    const t = new Date().toISOString();
    const newConflict: ConflictEvent = {
      id: randomId,
      type: Math.random() > 0.5 ? 'timestamp_collision' : 'sequence_mismatch',
      kioskA: nameA,
      kioskB: nameB,
      muleA: 'Adama Logistics Truck (Mule-01)',
      muleB: 'Mojo Rural Moto (Mule-02)',
      timestampA: t,
      timestampB: t,
      amountA: Math.floor(Math.random() * 10000) + 1200,
      amountB: Math.floor(Math.random() * 10000) + 1200,
      nonceA: randomSec,
      nonceB: randomSec,
      signatureA: `0x${Math.random().toString(16).substring(2, 10)}...`,
      signatureB: `0x${Math.random().toString(16).substring(2, 10)}...`,
      description: `Simulated live data harvester conflict. Overlapping Data Mule synchronization logged matching nonce #${randomSec} with potential timing packet desynchronization.`,
      status: 'unresolved'
    };

    const updated = [newConflict, ...conflicts];
    setConflicts(updated);
    localStorage.setItem('ghostsync_conflicts_store', JSON.stringify(updated));
    toast.success('⚠️ Telemetry Warning: Critical transaction packet collision injected in real-time!', {
      description: `New desync event: Nonce #${randomSec}`,
      icon: <AlertTriangle className="text-amber-500" />
    });
  };

  // Run the animated merge pipeline
  const executeMergeResolution = async (strategy: 'use_a' | 'use_b' | 'merge_combine' | 'reject') => {
    if (!selectedConflict) return;

    setIsResolving(true);
    setResolveStep(1);

    // Dynamic timeout sequencer representing the steps of cryptographic resolving
    await new Promise(r => setTimeout(r, 600));
    setResolveStep(2);
    await new Promise(r => setTimeout(r, 700));
    setResolveStep(3);
    await new Promise(r => setTimeout(r, 600));
    setResolveStep(4);
    await new Promise(r => setTimeout(r, 400));

    // Compile resolution values
    let finalAmount = mergedAmount;
    let finalTimestamp = mergedTimestamp;
    let finalNonce = mergedNonce;

    if (strategy === 'use_a') {
      finalAmount = selectedConflict.amountA;
      finalTimestamp = selectedConflict.timestampA;
      finalNonce = selectedConflict.nonceA;
    } else if (strategy === 'use_b') {
      finalAmount = selectedConflict.amountB;
      finalTimestamp = selectedConflict.timestampB;
      finalNonce = selectedConflict.nonceB;
    } else if (strategy === 'reject') {
      finalAmount = 0;
    }

    const txHash = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
    
    const updatedConflicts = conflicts.map(c => {
      if (c.id === selectedConflict.id) {
        return {
          ...c,
          status: strategy === 'reject' ? 'rejected' as const : 'resolved' as const,
          resolvedWith: strategy,
          mergedPayload: {
            amount: finalAmount,
            timestamp: finalTimestamp,
            nonce: finalNonce,
            notes: supervisorNotes || 'Manual audit override executed under national security protocols.',
            strategy,
            txHash,
            approver: 'Supervisor Root (Adama District)'
          }
        };
      }
      return c;
    });

    setConflicts(updatedConflicts);
    localStorage.setItem('ghostsync_conflicts_store', JSON.stringify(updatedConflicts));
    
    // Select the newly updated object to reflect values in details
    const newlyResolvedObj = updatedConflicts.find(c => c.id === selectedConflict.id) || null;
    setSelectedConflict(newlyResolvedObj);
    setIsResolving(false);
    
    toast.success(strategy === 'reject' ? 'Transaction voided & discarded' : 'Ledging status reconciled perfectly!', {
      description: `Committed Consensus Tx: ${txHash.substring(0, 10)}...`,
      icon: <Check className="text-emerald-500" />
    });
  };

  // Reset conflicts array back to seed defaults
  const handleResetConflicts = () => {
    localStorage.removeItem('ghostsync_conflicts_store');
    setConflicts(SEED_CONFLICTS);
    setSelectedConflict(null);
    toast.info('Conflict database reset to mock defaults.');
  };

  const unresolvedCount = conflicts.filter(c => c.status === 'unresolved').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center gap-2">
            GhostSync Queue
            {unresolvedCount > 0 && (
              <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold ml-2 animate-pulse text-[11px] h-6 flex items-center justify-center">
                {unresolvedCount} Active Collision{unresolvedCount > 1 ? 's' : ''}
              </Badge>
            )}
          </h1>
          <p className="text-slate-500 mt-2">Offline-first local buffering and compliance desk powered by IndexedDB</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Local Queue ({events.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 relative ${
              activeTab === 'conflicts'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <Split className="w-4 h-4" />
            <span>Conflict Desk</span>
            {unresolvedCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white">
                {unresolvedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        /* ================= QUEUE VIEW ================= */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-2xl">
            <span className="text-sm font-medium text-slate-600">Operations Control</span>
            <div className="flex space-x-2">
              <Button onClick={handleClearFailed} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 bg-white">
                <Trash2 className="w-4 h-4 mr-2" /> Clear All Failed
              </Button>
              <Button onClick={handleForceSync} variant="outline" className="bg-white hover:bg-slate-100">
                <RefreshCcw className="w-4 h-4 mr-2" /> Force Sync
              </Button>
            </div>
          </div>

          {selectedKeys.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-sm font-semibold text-rose-950">
                  Bulk Actions: {selectedKeys.length} of {events.length} event(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleBulkDelete} 
                  variant="destructive" 
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 font-bold px-4"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Bulk Delete Selected
                </Button>
                <Button 
                  onClick={() => setSelectedKeys([])} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                >
                  Deselect All
                </Button>
              </div>
            </div>
          )}

          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <HardDriveDownload className="w-5 h-5 text-indigo-500" />
                <div>
                  <CardTitle className="text-lg">Local Outbox Outpost Queue</CardTitle>
                  <CardDescription className="text-xs">Transactions buffered locally inside the device browser stage. Sync triggers automatically on network recovery.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {events.length === 0 ? (
                <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 mb-4">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-slate-800">Queue is empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">All local transactions are successfully sequenced & verified upstream with high-fidelity hashes.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[50px] pl-6">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          checked={events.length > 0 && selectedKeys.length === events.length}
                          onChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-bold text-slate-700">Event Class</TableHead>
                      <TableHead className="font-bold text-slate-700">Timestamp</TableHead>
                      <TableHead className="font-bold text-slate-700">Retry Outlets</TableHead>
                      <TableHead className="font-bold text-slate-700">Consensus Status</TableHead>
                      <TableHead className="text-right pr-6 font-bold text-slate-700 font-sans">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((e) => (
                      <TableRow 
                        key={e.row_key} 
                        className={`transition-colors duration-150 ${selectedKeys.includes(e.row_key) ? 'bg-indigo-50/50 hover:bg-indigo-100/40' : 'hover:bg-slate-50/40'}`}
                      >
                        <TableCell className="pl-6">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            checked={selectedKeys.includes(e.row_key)}
                            onChange={() => toggleSelect(e.row_key)}
                          />
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          <span className="flex items-center gap-2 font-sans text-xs uppercase tracking-wider text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {e.type.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 font-mono text-xs">
                          {new Date(e.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{e.retry_count} / 5</TableCell>
                        <TableCell>
                          {e.status === 'pending' && <Badge variant="secondary" className="bg-slate-100 text-slate-700 rounded-lg">Pending</Badge>}
                          {e.status === 'syncing' && <Badge className="bg-blue-100 text-blue-700 rounded-lg animate-pulse border border-blue-200">Harvesting</Badge>}
                          {e.status === 'failed' && (
                            <Badge variant="destructive" className="flex w-fit items-center rounded-lg">
                              <AlertCircle className="w-3 h-3 mr-1" /> Failed Retry
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" onClick={() => handleClear(e.row_key)} className="hover:bg-red-50 group rounded-xl">
                            <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================= CONFLICT RESOLUTION DESK ================= */
        <div className="space-y-6">
          {/* Critical Warnings Notice Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-start gap-4 shadow-sm">
            <div className="bg-amber-500/10 border border-amber-300/30 p-3 rounded-2xl text-amber-600 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase text-amber-950 tracking-widest leading-none flex items-center gap-2">
                Sovereign Anti-Collusion Desync Warning
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed max-w-4xl">
                Offline asynchronous ledgers rely on strict Fayda zero-knowledge digital signatures and hardware nanosecond nonces. Duplicated timestamps prevent automatic merging. Supervisors must resolve conflicts below to finalize country-corridor audits.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleInjectCollision}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 border border-amber-500/30 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>Simulate Custom Timestamp Collision</span>
                </button>
                
                <button
                  onClick={handleResetConflicts}
                  className="px-4 py-1.5 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-800 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Reset Conflict Database</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT SIDE: List of Collisions */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-100 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm uppercase tracking-widest font-black text-slate-700">Collision Manifest</CardTitle>
                      <CardDescription className="text-xs mt-1">Select transaction files to inspect</CardDescription>
                    </div>
                    <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200 font-bold">
                      {conflicts.length} Total
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {conflicts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p>No conflict vectors registered.</p>
                    </div>
                  ) : (
                    conflicts.map((c) => {
                      const isSelected = selectedConflict?.id === c.id;
                      const isUnresolved = c.status === 'unresolved';
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedConflict(c)}
                          className={`group p-3.5 border rounded-2xl cursor-pointer text-xs transition-all relative ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.01]' 
                              : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest leading-none ${
                              c.type === 'timestamp_collision' ? 'bg-red-500/15 text-red-500' :
                              c.type === 'sequence_mismatch' ? 'bg-orange-500/15 text-orange-500' :
                              'bg-indigo-500/15 text-indigo-500'
                            }`}>
                              {c.type.replace('_', ' ')}
                            </span>

                            <span className={`w-2 h-2 rounded-full ${
                              c.status === 'unresolved' ? 'bg-red-500 animate-pulse' :
                              c.status === 'rejected' ? 'bg-slate-400' : 'bg-emerald-500'
                            }`} />
                          </div>

                          <h4 className="font-bold text-sm leading-snug truncate font-sans">
                            {c.kioskA === c.kioskB ? c.kioskA : `${c.kioskA.split(' ')[0]} vs ${c.kioskB.split(' ')[0]}`}
                          </h4>
                          
                          <p className={`line-clamp-2 text-[11px] leading-relaxed mt-1 font-mono ${
                            isSelected ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {c.description}
                          </p>

                          <div className={`mt-3 pt-2.5 border-t flex justify-between items-center text-[10px] ${
                            isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'
                          }`}>
                            <span className="font-mono flex items-center gap-1">
                              <Hash className="w-3 h-3 shrink-0 text-slate-500" /> Nonce: {c.nonceA}
                            </span>
                            <span className="font-sans font-bold text-indigo-500">
                              {c.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT SIDE: Visual Diff comparison and compiler console */}
            <div className="lg:col-span-7">
              {!selectedConflict ? (
                <Card className="border-slate-200 shadow-sm rounded-3xl p-12 text-center text-slate-500 h-[500px] flex flex-col justify-center items-center bg-white border border-dashed border-slate-300">
                  <Split className="w-12 h-12 text-slate-300 mb-4 stroke-1 animate-pulse" />
                  <h4 className="font-black text-slate-700 uppercase tracking-widest text-sm">Select A Collision Block</h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                    Click any transaction package file on the left sidebar to load its transport logs and initiate localized cryptographic diff merging.
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* DIFF COMPARISON SCREEN */}
                  <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="border-b border-slate-100 py-4 bg-slate-50/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-sm uppercase tracking-widest font-black text-slate-800">
                            Ledger Diff Auditor
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Comparing source packages harvested by parallel Data Mules
                          </CardDescription>
                        </div>
                        <span className="font-mono text-xs bg-slate-100 border px-2.5 py-1 rounded-xl text-slate-600">
                          {selectedConflict.id.toUpperCase()}
                        </span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-6">
                      <p className="text-xs text-slate-600 bg-slate-50 pb-2.5 border-b border-dashed border-slate-200 leading-relaxed">
                        <span className="font-bold text-slate-700 block mb-1">Collision Log:</span>
                        {selectedConflict.description}
                      </p>

                      {/* SIDE BY SIDE DIFFS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* PACKAGE A */}
                        <div 
                          onClick={() => {
                            if (selectedConflict.status === 'unresolved') {
                              setMergedAmount(selectedConflict.amountA);
                              setMergedTimestamp(selectedConflict.timestampA);
                              setMergedNonce(selectedConflict.nonceA);
                              setResolutionStrategy('use_a');
                              toast.info('Copied values from Manifest A to the consensus builder.');
                            }
                          }}
                          className={`p-4 border rounded-2xl space-y-3 cursor-pointer transition-all ${
                            selectedConflict.status === 'unresolved' 
                              ? 'hover:border-slate-400 hover:bg-slate-50 border-slate-200 bg-white' 
                              : 'bg-slate-50/50 border-slate-100 opacity-80'
                          }`}
                        >
                          <div className="flex justify-between items-center border-b pb-1.5 border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Manifest A (Mule-01)</span>
                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 text-[9px] font-bold">Source ID</Badge>
                          </div>
                          
                          <div className="space-y-2 text-xs font-mono">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400">Merchant Kiosk</span>
                              <span className="font-sans font-bold text-slate-800 line-clamp-1">{selectedConflict.kioskA}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">Timestamp</span>
                              <span className="text-slate-700 font-semibold text-[11px]">{new Date(selectedConflict.timestampA).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">Transferred Amount</span>
                              <span className="text-red-600 font-black text-[13px]">{selectedConflict.amountA.toLocaleString()} ETB</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">Seq Sequence</span>
                              <span className="text-slate-800 font-bold">{selectedConflict.nonceA}</span>
                            </div>
                            <div className="flex flex-col pt-1.5 border-t border-slate-100">
                              <span className="text-[9px] text-slate-400">Fayda signature Hash</span>
                              <span className="text-[9px] text-slate-500 truncate">{selectedConflict.signatureA}</span>
                            </div>
                          </div>
                          {selectedConflict.status === 'unresolved' && (
                            <p className="text-[9px] font-sans font-bold text-[#6366f1] text-center pt-1 block">
                              › Click to load A values as consensus template
                            </p>
                          )}
                        </div>

                        {/* PACKAGE B */}
                        <div 
                          onClick={() => {
                            if (selectedConflict.status === 'unresolved') {
                              setMergedAmount(selectedConflict.amountB);
                              setMergedTimestamp(selectedConflict.timestampB);
                              setMergedNonce(selectedConflict.nonceB);
                              setResolutionStrategy('use_b');
                              toast.info('Copied values from Manifest B to the consensus builder.');
                            }
                          }}
                          className={`p-4 border rounded-2xl space-y-3 cursor-pointer transition-all ${
                            selectedConflict.status === 'unresolved' 
                              ? 'hover:border-slate-400 hover:bg-slate-50 border-slate-200 bg-white' 
                              : 'bg-slate-50/50 border-slate-100 opacity-80'
                          }`}
                        >
                          <div className="flex justify-between items-center border-b pb-1.5 border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Manifest B (Mule-02)</span>
                            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 text-[9px] font-bold">Source ID</Badge>
                          </div>
                          
                          <div className="space-y-2 text-xs font-mono">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400">Merchant Kiosk</span>
                              <span className="font-sans font-bold text-slate-800 line-clamp-1">{selectedConflict.kioskB}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">Timestamp</span>
                              <span className="text-slate-700 font-semibold text-[11px]">{new Date(selectedConflict.timestampB).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">Transferred Amount</span>
                              <span className="text-red-600 font-black text-[13px]">{selectedConflict.amountB.toLocaleString()} ETB</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[9px] text-slate-400">Seq Sequence</span>
                              <span className="text-slate-800 font-bold">{selectedConflict.nonceB}</span>
                            </div>
                            <div className="flex flex-col pt-1.5 border-t border-slate-100">
                              <span className="text-[9px] text-slate-400">Fayda signature Hash</span>
                              <span className="text-[9px] text-slate-500 truncate">{selectedConflict.signatureB}</span>
                            </div>
                          </div>
                          {selectedConflict.status === 'unresolved' && (
                            <p className="text-[9px] font-sans font-bold text-[#6366f1] text-center pt-1 block">
                              › Click to load B values as consensus template
                            </p>
                          )}
                        </div>
                      </div>

                      {/* STEP 2: MERGE CONFLICT WORKBENCH AND RESOLUTION FORM */}
                      {selectedConflict.status === 'unresolved' ? (
                        <div className="border-t border-slate-100 pt-6 space-y-4">
                          <h4 className="text-xs uppercase font-black tracking-widest text-[#6366f1] flex items-center gap-1.5">
                            <GitMerge className="w-4 h-4 shrink-0" /> Unified Consensus Constructor
                          </h4>
                          
                          <div className="bg-slate-900 border border-slate-950 p-5 rounded-2xl text-white space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="text-[9px] uppercase tracking-widest font-mono text-slate-400">Merged consensus block candidate preview</span>
                              <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase tracking-wider">
                                Draft Form
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Strategy Selector */}
                              <div className="flex flex-col space-y-1.5">
                                <label className="text-[9px] font-mono text-slate-400">RESOLUTION STRATEGY</label>
                                <select 
                                  value={resolutionStrategy}
                                  onChange={(e) => {
                                    setResolutionStrategy(e.target.value);
                                    if (e.target.value === 'use_a') {
                                      setMergedAmount(selectedConflict.amountA);
                                      setMergedTimestamp(selectedConflict.timestampA);
                                      setMergedNonce(selectedConflict.nonceA);
                                    } else if (e.target.value === 'use_b') {
                                      setMergedAmount(selectedConflict.amountB);
                                      setMergedTimestamp(selectedConflict.timestampB);
                                      setMergedNonce(selectedConflict.nonceB);
                                    } else if (e.target.value === 'merge_combine') {
                                      setMergedAmount(selectedConflict.amountA + selectedConflict.amountB);
                                      setMergedNonce(selectedConflict.nonceA);
                                    }
                                  }}
                                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-slate-600"
                                >
                                  <option value="merge_combine">Manual Merge (Aggregate Amounts)</option>
                                  <option value="use_a">Force Manifest A (Overwrite B)</option>
                                  <option value="use_b">Force Manifest B (Overwrite A)</option>
                                  <option value="custom">Custom Arbitrary Values Override</option>
                                  <option value="reject">Discard & Reject Both (Fraud / Dupe)</option>
                                </select>
                              </div>

                              {/* Unified Amount */}
                              <div className="flex flex-col space-y-1.5 animate-in fade-in">
                                <label className="text-[9px] font-mono text-slate-400">UNIFIED CONSENSUS AMOUNT (ETB)</label>
                                <input
                                  type="number"
                                  disabled={resolutionStrategy !== 'custom' && resolutionStrategy !== 'merge_combine'}
                                  value={mergedAmount}
                                  onChange={(e) => setMergedAmount(Number(e.target.value))}
                                  className="bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                                />
                              </div>

                              {/* Unified Timestamp */}
                              <div className="flex flex-col space-y-1.5">
                                <label className="text-[9px] font-mono text-slate-400">CHRONO-LEDGER TIMESTAMP</label>
                                <input
                                  type="text"
                                  disabled={resolutionStrategy !== 'custom'}
                                  value={mergedTimestamp}
                                  onChange={(e) => setMergedTimestamp(e.target.value)}
                                  className="bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                                />
                              </div>

                              {/* Unified Sequence Nonce */}
                              <div className="flex flex-col space-y-1.5">
                                <label className="text-[9px] font-mono text-slate-400">AUDIT NONCE CODE</label>
                                <input
                                  type="number"
                                  disabled={resolutionStrategy !== 'custom'}
                                  value={mergedNonce}
                                  onChange={(e) => setMergedNonce(Number(e.target.value))}
                                  className="bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                                />
                              </div>
                            </div>

                            {/* Supervisor explanations */}
                            <div className="flex flex-col space-y-1.5">
                              <label className="text-[9px] font-mono text-slate-400">SUPERVISOR RECONCILIATION NOTES</label>
                              <textarea
                                value={supervisorNotes}
                                onChange={(e) => setSupervisorNotes(e.target.value)}
                                placeholder="State exact cause for manual intervention. Note required for audits..."
                                className="bg-slate-950 placeholder-slate-700 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none h-16 resize-none font-sans"
                              />
                            </div>

                            {/* Merge Execution Trigger */}
                            <div className="pt-2 border-t border-slate-800 flex justify-between items-center gap-3">
                              <Button
                                onClick={() => executeMergeResolution('reject')}
                                variant="outline"
                                className="border-red-800 bg-red-950/20 text-red-400 hover:bg-red-900/10 font-bold px-3 text-[10px] uppercase tracking-wider rounded-xl h-10 border"
                              >
                                Reject Block
                              </Button>

                              <Button
                                onClick={() => executeMergeResolution(resolutionStrategy as any)}
                                className="bg-indigo-600 hover:bg-indigo-500 font-black text-white px-5 text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shrink-0 h-10 flex items-center justify-center gap-1.5"
                              >
                                <GitMerge className="w-4 h-4 shrink-0" />
                                <span>Commit Consensus Ledger</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* CURRENTLY RESOLVED HISTORY DISPLAY */
                        <div className="border-t border-slate-100 pt-6 space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200/60 p-5 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                              <span className="text-[10px] uppercase tracking-widest font-black text-emerald-800 flex items-center gap-1">
                                <FileCheck className="w-4 h-4" /> RECONCILED CONSENSUS RECORDED
                              </span>
                              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[8px] font-black uppercase tracking-wider rounded-lg leading-none">
                                Committed Block
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500">RESOLVEMENT STRATEGY</span>
                                <span className="font-bold text-slate-800 uppercase text-[11px]">{selectedConflict.resolvedWith?.replace('_', ' ')}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500">COMMITTED CONSENSUS AMOUNT</span>
                                <span className="font-sans font-black text-emerald-700 text-base">
                                  {selectedConflict.mergedPayload?.amount.toLocaleString()} ETB
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500">LEDGER AUDIT TIMESTAMP</span>
                                <span className="text-slate-700 font-semibold">{selectedConflict.mergedPayload ? new Date(selectedConflict.mergedPayload.timestamp).toLocaleString() : ''}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500">MERKLE consensus Nonce</span>
                                <span className="text-slate-800 font-bold">Block Nonce: #{selectedConflict.mergedPayload?.nonce}</span>
                              </div>
                              <div className="flex flex-col md:col-span-2 pt-2 border-t border-emerald-200/50">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Consensus Cryptographic Signature SHA-256</span>
                                <span className="text-[10px] text-indigo-900 break-all select-all font-semibold font-mono bg-indigo-50/50 p-2 rounded-xl mt-1 border border-indigo-100">
                                  {selectedConflict.mergedPayload?.txHash}
                                </span>
                              </div>
                              <div className="flex flex-col md:col-span-2">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">Supervisor Reconciliation Notes</span>
                                <p className="text-[11px] text-slate-700 bg-white p-3 rounded-xl mt-1 italic border border-emerald-100 font-sans leading-relaxed">
                                  "{selectedConflict.mergedPayload?.notes}"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MERGE COMPLIANCE EXECVERIFY POPUP MODAL OVERLAY */}
      {isResolving && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-400/20 rounded-full flex items-center justify-center text-indigo-400 animate-spin" style={{ animationDuration: '3s' }}>
                <Cpu className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                Consensus resolving loop active
              </h4>
              <p className="text-xs text-slate-400 font-mono">
                Synchronizing with Sovereign National Fayda Identity Server
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-slate-950/80 p-3 border border-slate-800/60 rounded-2xl text-left">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-indigo-500/20 text-indigo-400 shrink-0 font-bold">
                  {resolveStep > 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : '1'}
                </div>
                <div className="font-mono text-xs text-slate-300">
                  <p className="font-bold">ZKP Signature Re-Verification</p>
                  <p className="text-[10px] text-slate-500">Decrypting double-signed merchant transaction packet</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 bg-slate-950/80 p-3 border border-slate-800/60 rounded-2xl text-left transition-opacity duration-300 ${
                resolveStep < 2 ? 'opacity-40' : 'opacity-100'
              }`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-indigo-500/20 text-indigo-400 shrink-0 font-bold">
                  {resolveStep > 2 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : '2'}
                </div>
                <div className="font-mono text-xs text-slate-300">
                  <p className="font-bold">Chronology Sequence Recalculation</p>
                  <p className="text-[10px] text-slate-500">Assembling linear transaction nonces on root node</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 bg-slate-950/80 p-3 border border-slate-800/60 rounded-2xl text-left transition-opacity duration-300 ${
                resolveStep < 3 ? 'opacity-40' : 'opacity-100'
              }`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-indigo-500/20 text-indigo-400 shrink-0 font-bold">
                  {resolveStep > 3 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : '3'}
                </div>
                <div className="font-mono text-xs text-slate-300">
                  <p className="font-bold">Block Consensus Emission</p>
                  <p className="text-[10px] text-slate-500">Broadcasting updated Merkle Root state to BGI Mules</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 bg-slate-950/80 p-3 border border-slate-800/60 rounded-2xl text-left transition-opacity duration-300 ${
                resolveStep < 4 ? 'opacity-40' : 'opacity-100'
              }`}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-indigo-500/20 text-indigo-400 shrink-0 font-bold">
                  {resolveStep > 4 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : '4'}
                </div>
                <div className="font-mono text-xs text-slate-300">
                  <p className="font-bold">Securitized Ledger Commit</p>
                  <p className="text-[10px] text-slate-500">Storing state replica locally under zero trust compliance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
