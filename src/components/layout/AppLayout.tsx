import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  BarChart, 
  Users, 
  Repeat, 
  HardDriveDownload, 
  ShieldCheck,
  Server,
  Wifi,
  WifiOff,
  Activity,
  Truck,
  Database,
  FileText,
  Sun,
  Sprout,
  Landmark,
  Coins,
  CloudRain,
  Scale,
  GraduationCap,
  Wallet,
  PlayCircle,
  Mic
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { syncEvents, getPendingEvents } from '@/lib/ghostsync';

export function AppLayout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncEvents();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync
    syncEvents();

    const interval = setInterval(async () => {
      const events = await getPendingEvents();
      setPendingCount(events.length);
    }, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: BarChart },
    { name: 'Agent Onboarding', path: '/onboard', icon: Users },
    { name: 'Agent Academy', path: '/academy', icon: GraduationCap },
    { name: 'Farmer 360 Wealth', path: '/farmer-360', icon: Wallet },
    { name: 'Swaps & Liquidity', path: '/swaps', icon: Repeat },
    { name: 'Inventory Mgmt', path: '/inventory', icon: Truck },
    { name: 'Partner Bank Racing', path: '/bank-racing', icon: Landmark },
    { name: 'FMCG Virtual ATM', path: '/fmcg-liquidity', icon: Truck },
    { name: 'GhostSync Queue', path: '/queue', icon: HardDriveDownload },
    { name: 'Data Mule Protocol', path: '/data-mule', icon: Database },
    { name: 'PSNP-Plus G2P', path: '/psnp-plus', icon: FileText },
    { name: 'KentiQ Solar PAYG', path: '/kentiq-payg', icon: Sun },
    { name: 'Ardi Scoring Engine', path: '/ardi-engine', icon: Activity },
    { name: 'Live Transcription', path: '/transcription', icon: Mic },
    { name: 'SmartCycle Equb', path: '/smartcycle', icon: Coins },
    { name: 'Agri-Connect Market', path: '/agri-connect', icon: Sprout },
    { name: 'AgriTrust Insurance', path: '/agritrust', icon: CloudRain },
    { name: 'Governance DAO', path: '/governance', icon: Scale },
    { name: 'Securitization SPV', path: '/securitization', icon: Landmark },
    { name: 'Audit & Compliance', path: '/audit', icon: ShieldCheck },
    { name: 'Sovereign Node', path: '/node-status', icon: Server },
    { name: 'Settlement Sandbox', path: '/sandbox', icon: PlayCircle },
  ];

  return (
    <div className="flex h-screen bg-[#f5f5f5] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Activity className="w-6 h-6 mr-2 text-primary" />
          <span className="font-bold text-lg tracking-tight">NAGA-NODE PULSE</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-slate-100 text-primary' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* UNCDF Judges Side Ticker */}
        <div className="bg-slate-900 text-slate-300 mx-4 mb-4 rounded-lg overflow-hidden border border-slate-800 flex flex-col p-3 shadow-inner relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black tracking-widest uppercase text-emerald-400 flex items-center">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Live Ticker
            </span>
            <span className="text-[9px] text-slate-500">UNCDF</span>
          </div>
          <div className="h-16 overflow-hidden relative">
            <div className="absolute inset-x-0 w-full animate-[slideUp_8s_linear_infinite] flex flex-col space-y-2">
               <p className="text-[10px] font-mono leading-tight">› TX: {Math.random().toString(36).substring(2,8).toUpperCase()} | CashIn</p>
               <p className="text-[10px] font-mono leading-tight text-emerald-500">› SUCCESS: GhostSync Buff.</p>
               <p className="text-[10px] font-mono leading-tight">› FMCG Swap Auth Initiated</p>
               <p className="text-[10px] font-mono leading-tight">› LCR Status: Optimal (92%)</p>
               <p className="text-[10px] font-mono leading-tight text-blue-400">› P2G School Order Settled</p>
               <p className="text-[10px] font-mono leading-tight">› TX: {Math.random().toString(36).substring(2,8).toUpperCase()} | Equb</p>
               <p className="text-[10px] font-mono leading-tight">› Climate Relief Auth OK</p>
               <p className="text-[10px] font-mono leading-tight text-amber-500">› Ardi Engine Triggered</p>
            </div>
            {/* CSS Animation defined in globals.css or injected inline */}
            <style>{`
              @keyframes slideUp {
                0% { transform: translateY(0); }
                100% { transform: translateY(-70%); }
              }
            `}</style>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <Link
            to="/judge-ticker"
            target="_blank"
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-bold text-emerald-500 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors uppercase tracking-widest mb-2"
          >
            UNCDF Judge Ticker
          </Link>
          <Link
            to="/kiosk"
            target="_blank"
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors uppercase tracking-widest mb-2"
          >
            Launch POS Kiosk
          </Link>
          <Link
            to="/supervisor"
            target="_blank"
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors uppercase tracking-widest"
          >
            Super Agent Portal
          </Link>
          <div className="flex items-center justify-between text-sm mt-4">
            <span className="flex items-center text-slate-600">
              {isOnline ? (
                <><Wifi className="w-4 h-4 mr-2 text-green-500" /> Online</>
              ) : (
                <><WifiOff className="w-4 h-4 mr-2 text-red-500" /> Offline</>
              )}
            </span>
            {pendingCount > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {pendingCount} Pending
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
