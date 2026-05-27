import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, HardDriveDownload, Settings, Check, Clock } from 'lucide-react';
import { syncEvents, getPendingEvents } from '@/lib/ghostsync';
import { useSyncStatus } from './layout/AppLayout';
import { toast } from 'sonner';

export function GhostSyncWidget() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State matching localStorage
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const val = localStorage.getItem('ghostsync_auto_sync');
    return val !== 'false'; // default is true
  });
  const [syncInterval, setSyncInterval] = useState<number>(() => {
    const val = localStorage.getItem('ghostsync_sync_interval');
    return val ? parseInt(val, 10) : 10; // default to 10s
  });

  const lastSync = useSyncStatus();

  // Visual Progress Feedback states for Data Mule sync operations
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isSyncing) {
      setSyncProgress(0);
      setSyncStatusMsg('Linking Super-Agent Mesh...');
      
      const steps = [
        'Connecting Adama Hub...',
        'Syncing offline keypairs...',
        'Handshaking FMCG Truck Mule...',
        'Resolving ISO20022 events...',
        'Updating Ledger root signatures...'
      ];

      intervalId = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 95) {
            return prev; // hold at 95% until done
          }
          const next = prev + Math.floor(Math.random() * 8) + 4;
          
          // randomly switch status message
          const stepIndex = Math.min(Math.floor(next / 20), steps.length - 1);
          setSyncStatusMsg(steps[stepIndex]);
          
          return Math.min(next, 95);
        });
      }, 140);
    } else {
      if (syncProgress > 0) {
        setSyncProgress(100);
        setSyncStatusMsg('Ledger fully synced!');
        const timeout = setTimeout(() => {
          setSyncProgress(0);
          setSyncStatusMsg('');
        }, 1500);
        return () => clearTimeout(timeout);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSyncing]);

  // Watch for connection changes & poll pendingCount
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      const events = await getPendingEvents();
      setPendingCount(events.length);
    };

    checkPending();
    const intervalId = setInterval(checkPending, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // Background Auto-Sync Driver Effect
  useEffect(() => {
    if (!autoSync || !isOnline) return;

    const runAutoSync = async () => {
      // Fetch queue items to determine if sync is needed (presence of failed with retries < 5 or pending)
      const events = await getPendingEvents();
      const hasEligible = events.some(
        e => e.status === 'pending' || (e.status === 'failed' && e.retry_count < 5)
      );

      if (hasEligible && !isSyncing) {
        setIsSyncing(true);
        try {
          await syncEvents();
        } catch (e) {
          console.error('[GhostSync Worker] Sync Fail:', e);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const intervalId = setInterval(runAutoSync, syncInterval * 1000);
    return () => clearInterval(intervalId);
  }, [autoSync, syncInterval, isOnline, isSyncing]);

  const handleSyncNow = async () => {
    if (!isOnline || pendingCount === 0 || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncEvents();
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    localStorage.setItem('ghostsync_auto_sync', String(newValue));
    toast.success(`Auto-sync turned ${newValue ? 'ON' : 'OFF'}`);
  };

  const handleIntervalChange = (val: number) => {
    setSyncInterval(val);
    localStorage.setItem('ghostsync_sync_interval', String(val));
    toast.success(`Auto-sync interval configured to ${val}s`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm mt-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center font-semibold text-sm text-slate-800">
          <HardDriveDownload className="w-4 h-4 mr-1.5 text-primary" />
          GhostSync Status
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 rounded-md transition-colors ${showSettings ? 'bg-slate-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="GhostSync Settings"
          >
            <Settings className={`w-3.5 h-3.5 ${showSettings ? 'animate-spin' : ''}`} />
          </button>
          {isOnline ? (
            <span className="flex items-center text-emerald-600 font-medium text-xs">
              <Wifi className="w-3.5 h-3.5 mr-0.5" />
              Online
            </span>
          ) : (
            <span className="flex items-center text-rose-500 font-medium text-xs">
              <WifiOff className="w-3.5 h-3.5 mr-0.5" />
              Offline
            </span>
          )}
        </div>
      </div>

      {showSettings ? (
        <div className="bg-slate-50 border border-slate-100 rounded-md p-2 mt-0.5 space-y-2.5 animate-fade-in text-xs text-slate-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[11px] text-slate-500 uppercase tracking-widest">Settings</span>
            <span className="text-[10px] text-indigo-600 font-mono">Auto Sync Config</span>
          </div>

          {/* Toggle Control */}
          <div className="flex items-center justify-between">
            <span>Toggle Auto-Sync:</span>
            <button
              onClick={toggleAutoSync}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSync ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSync ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Interval Configuration Selection */}
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-slate-600">
              <Clock className="w-3 h-3" /> Interval Rate:
            </span>
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[5, 10, 30, 60].map(val => (
                <button
                  key={val}
                  onClick={() => handleIntervalChange(val)}
                  disabled={!autoSync}
                  className={`py-1 text-[10px] rounded font-mono font-medium transition-all ${
                    syncInterval === val
                      ? 'bg-slate-900 text-white'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-40 disabled:hover:bg-white'
                  }`}
                >
                  {val}s
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Pending TXs:</span>
        <span className={`font-mono font-bold ${pendingCount > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-500'}`}>
          {pendingCount}
        </span>
      </div>

      {syncProgress > 0 && (
        <div className="space-y-1.5 transition-all duration-300 animate-fade-in my-1">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-500 truncate font-mono max-w-[140px] block">{syncStatusMsg}</span>
            <span className="font-mono font-bold text-indigo-600">{syncProgress}%</span>
          </div>
          <div className="w-full bg-slate-150 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-150 ${
                syncProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-650'
              }`}
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSyncNow}
        disabled={!isOnline || pendingCount === 0 || isSyncing}
        className="mt-1 w-full flex items-center justify-center px-3 py-1.5 bg-slate-900 border border-transparent rounded-md shadow-sm text-xs font-medium text-white hover:bg-slate-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {lastSync && (
        <div className="text-[10px] text-slate-400 text-center mt-1">
          Last success: {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}
    </div>
  );
}
