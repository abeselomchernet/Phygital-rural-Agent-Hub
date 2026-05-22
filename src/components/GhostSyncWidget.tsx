import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, HardDriveDownload } from 'lucide-react';
import { syncEvents, getPendingEvents } from '@/lib/ghostsync';
import { useSyncStatus } from './layout/AppLayout';

export function GhostSyncWidget() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastSync = useSyncStatus();

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
    const interval = setInterval(checkPending, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline || pendingCount === 0) return;
    setIsSyncing(true);
    await syncEvents();
    setIsSyncing(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm mt-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center font-semibold text-sm text-slate-800">
          <HardDriveDownload className="w-4 h-4 mr-1.5 text-primary" />
          GhostSync Status
        </div>
        <div className="flex items-center text-xs">
          {isOnline ? (
            <span className="flex items-center text-emerald-600 font-medium">
              <Wifi className="w-3.5 h-3.5 mr-1" />
              Online
            </span>
          ) : (
            <span className="flex items-center text-rose-500 font-medium">
              <WifiOff className="w-3.5 h-3.5 mr-1" />
              Offline
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Pending TXs:</span>
        <span className={`font-mono font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
          {pendingCount}
        </span>
      </div>

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
