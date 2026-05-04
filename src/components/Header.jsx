import { Server, Activity, RefreshCw, Layers, Bell, ShieldCheck, Settings } from 'lucide-react';
import { formatBytes, formatUptime, formatPercent } from '../utils';

export default function Header({ nodeStatus, loading, onRefresh, onSettings, lastUpdate }) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5 py-3 sm:py-5 px-4 sm:px-10" style={{ paddingTop: 'calc(var(--safe-area-top, 0px) + 0.75rem)' }}>
      <div className="max-w-[1800px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden">
            <img src="/logoserver.png" alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-none">
              Prox<span className="text-brand-cyan">Dash</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-brand-mint animate-pulse" />
              <span className="text-[8px] sm:text-[9px] uppercase font-black tracking-widest text-slate-500">Live Infrastructure</span>
            </div>
          </div>
        </div>

        {nodeStatus && (
          <div className="hidden lg:flex items-center gap-16">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-500 mb-1.5">Charge Cluster</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white font-mono">{formatPercent(nodeStatus.cpu)}</span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-cyan shadow-[0_0_8px_#00D1FF]" 
                    style={{ width: `${nodeStatus.cpu * 100}%` }} 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-500 mb-1.5">Mémoire Totale</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white font-mono">{formatBytes(nodeStatus.memory?.used)}</span>
                <span className="text-xs text-slate-500 font-medium">/ {formatBytes(nodeStatus.memory?.total)}</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-500 mb-1.5">Disponibilité Node</span>
              <span className="text-sm font-bold text-brand-mint">{formatUptime(nodeStatus.uptime)}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 sm:gap-5">
          <button 
            onClick={onRefresh}
            disabled={loading}
            className={`
              flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-black transition-all duration-500 tracking-tight
              ${loading 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-brand-cyan text-slate-950 hover:bg-white shadow-[0_0_30px_rgba(0,209,255,0.2)] active:scale-95 cursor-pointer'
              }
            `}
          >
            <RefreshCw size={window.innerWidth < 640 ? 14 : 18} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'SYNCHRONISATION...' : 'RAFRAÎCHIR'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
