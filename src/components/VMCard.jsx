import { useState } from 'react';
import { 
  Monitor, Cpu, MemoryStick, Clock, Activity, 
  ExternalLink, ChevronDown, ChevronRight,
  Globe, LayoutDashboard, Server as ServerIcon, Database, 
  Zap, Table, Container, Shield, ShieldCheck, Cloud, Terminal, 
  Settings, CheckCircle2, AlertCircle, FolderTree,
  Play, Square, RotateCcw, Power
} from 'lucide-react';
import { formatBytes, formatUptime, formatPercent, cpuColor, ramColor } from '../utils';
import FileExplorer from './FileExplorer';
import toast from 'react-hot-toast';

const ICON_MAP = {
  globe: Globe,
  'layout-dashboard': LayoutDashboard,
  server: ServerIcon,
  database: Database,
  zap: Zap,
  table: Table,
  container: Container,
  shield: Shield,
  cloud: Cloud,
  terminal: Terminal,
};

function ServiceRow({ service }) {
  const isUp = service.status === 'up';
  const Icon = ICON_MAP[service.icon] || Globe;

  return (
    <div className="group relative flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-brand-cyan/30 hover:bg-slate-800/60 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${isUp ? 'bg-brand-mint/10 text-brand-mint' : 'bg-rose-500/10 text-rose-400'}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white group-hover:text-brand-cyan transition-colors truncate max-w-[140px]">{service.name}</h4>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/50 text-slate-500">:{service.port}</span>
          </div>
          <p className="text-[9px] text-slate-600 mt-0.5 font-mono truncate max-w-[180px]">{service.url || 'Port Interne'}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 status-pill ${isUp ? 'status-online' : 'status-offline'}`}>
          <div className={`w-1 h-1 rounded-full ${isUp ? 'bg-brand-mint animate-pulse' : 'bg-rose-400'}`} />
          {isUp ? 'EN LIGNE' : 'HORS LIGNE'}
        </div>
        
        {service.url && isUp && (
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-brand-cyan/10 text-brand-cyan opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-cyan hover:text-slate-950"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function VMCard({ vm, healthData, index, viewMode = 'grid', onClick }) {
  const [expanded, setExpanded] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const isRunning = vm.status === 'running';
  const cpuPct = vm.cpu || 0;
  const services = healthData || [];
  const servicesUp = services.filter(s => s.status === 'up').length;

  const handlePowerAction = async (command, e) => {
    e.stopPropagation(); // Empêcher l'ouverture des détails
    if (!window.confirm(`Confirmer l'action : ${command} sur ${vm.name} ?`)) return;
    setLoadingAction(command);
    try {
      const res = await fetch(`/api/vms/${vm.vmid}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error);
      } else {
        toast.success(`VM ${vm.name} : ${command.toUpperCase()} envoyé`);
      }
    } catch (err) {
      toast.error('Erreur lors de la commande');
    } finally {
      setLoadingAction(null);
    }
  };

  const PowerButtons = () => (
    <div className="flex items-center gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/5">
      {!isRunning ? (
        <button 
          onClick={(e) => handlePowerAction('start', e)}
          disabled={loadingAction === 'start'}
          className="p-2 rounded-lg bg-brand-mint/10 text-brand-mint hover:bg-brand-mint hover:text-slate-950 transition-all cursor-pointer"
          title="Démarrer"
        >
          <Play size={16} className={loadingAction === 'start' ? 'animate-spin' : ''} />
        </button>
      ) : (
        <>
          <button 
            onClick={(e) => handlePowerAction('shutdown', e)}
            disabled={loadingAction === 'shutdown'}
            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
            title="Éteindre"
          >
            <Square size={16} className={loadingAction === 'shutdown' ? 'animate-pulse' : ''} />
          </button>
          <button 
            onClick={(e) => handlePowerAction('reboot', e)}
            disabled={loadingAction === 'reboot'}
            className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all cursor-pointer"
            title="Redémarrer"
          >
            <RotateCcw size={16} className={loadingAction === 'reboot' ? 'animate-spin' : ''} />
          </button>
        </>
      )}
    </div>
  );

  if (viewMode === 'list') {
    return (
      <div 
        onClick={onClick}
        className="glass-card rounded-2xl p-4 flex items-center justify-between gap-6 hover:bg-slate-900/50 transition-all animate-enter cursor-pointer group"
      >
        <div className="flex items-center gap-4 w-1/5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRunning ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-slate-800 text-slate-500'}`}>
            <Monitor size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white tracking-tight truncate">{vm.name}</h3>
            <span className="text-[9px] font-mono text-slate-500">ID {vm.vmid}</span>
          </div>
        </div>

        <div className="flex items-center gap-8 flex-1">
          <div className="w-24">
             <div className="flex justify-between text-[10px] mb-1">
               <span className="text-slate-500 uppercase font-black tracking-widest">CPU</span>
               <span className="font-mono text-brand-cyan">{formatPercent(cpuPct)}</span>
             </div>
             <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan" style={{ width: `${cpuPct * 100}%` }} />
             </div>
          </div>
          <div className="w-24">
             <div className="flex justify-between text-[10px] mb-1">
               <span className="text-slate-500 uppercase font-black tracking-widest">RAM</span>
               <span className="font-mono text-brand-cyan">{formatBytes(vm.mem)}</span>
             </div>
             <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-cyan" style={{ width: `${(vm.mem / vm.maxmem) * 100}%` }} />
             </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`status-pill ${isRunning ? 'status-running' : 'status-offline'}`}>
              {isRunning ? 'ACTIF' : 'ARRÊTÉ'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">{vm.ip}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <PowerButtons />
          <div className="h-6 w-px bg-white/5" />
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); if(isRunning) setShowExplorer(true); }}
              disabled={!isRunning}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer"
              title="Fichiers"
            >
              <FolderTree size={18} />
            </button>
            <button 
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-brand-cyan transition-all cursor-pointer"
              title="Containers Docker"
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              <Container size={18} />
            </button>
          </div>
        </div>
        
        {showExplorer && <FileExplorer vmid={vm.vmid} onClose={() => setShowExplorer(false)} />}
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="glass-card rounded-[2rem] overflow-hidden animate-enter border border-white/5 cursor-pointer hover:border-brand-cyan/20 group transition-all"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Header */}
      <div className="p-5 sm:p-8 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 sm:gap-5 min-w-0">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border shrink-0 ${
              isRunning ? 'bg-brand-cyan/5 border-brand-cyan/20 text-brand-cyan shadow-[0_0_30px_rgba(0,209,255,0.1)]' : 'bg-slate-900 border-white/5 text-slate-600'
            }`}>
              <Monitor size={window.innerWidth < 640 ? 22 : 28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-black text-white tracking-tight truncate">{vm.name}</h3>
                {isRunning && <div className="w-1.5 h-1.5 rounded-full bg-brand-mint shadow-[0_0_10px_#00FF94] animate-pulse" />}
              </div>
              <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-white/5">ID {vm.vmid}</span>
                <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-brand-cyan truncate">{vm.type === 'lxc' ? 'Container' : 'VM'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0">
            <PowerButtons />
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-8 px-1">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity size={12} className="text-brand-cyan" />
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-tight truncate max-w-[100px]">{vm.ip || 'Pas d\'IP'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={12} className="text-brand-mint" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest">{isRunning ? formatUptime(vm.uptime) : 'ARRÊTÉ'}</span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-8 py-5 bg-slate-950/40 border-y border-white/5 space-y-5">
        <div>
          <div className="flex justify-between items-end mb-2.5">
            <div className="flex items-center gap-2 text-slate-400">
              <Cpu size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Charge CPU</span>
            </div>
            <span className="text-sm font-black font-mono text-brand-cyan">{formatPercent(cpuPct)}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000 ease-out rounded-full bg-brand-cyan shadow-[0_0_10px_rgba(0,209,255,0.4)]"
              style={{ width: `${cpuPct * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-2.5">
            <div className="flex items-center gap-2 text-slate-400">
              <MemoryStick size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Mémoire Vive</span>
            </div>
            <span className="text-sm font-black font-mono text-white">
              {formatBytes(vm.mem)} <span className="text-slate-600 font-bold text-[10px]">/ {formatBytes(vm.maxmem)}</span>
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000 ease-out rounded-full bg-brand-mint shadow-[0_0_10px_rgba(0,255,148,0.4)]"
              style={{ width: `${(vm.mem / vm.maxmem) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-cyan" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">Services & Sécurité</h4>
          </div>
          <span className={`status-pill ${servicesUp > 0 ? 'status-online' : 'status-offline'}`}>
            {servicesUp}/{services.length} ACTIFS
          </span>
        </div>

        {services.length > 0 ? (
          <div className="space-y-2.5">
            {services.slice(0, expanded ? undefined : 2).map((s, i) => (
              <ServiceRow key={i} service={s} />
            ))}
            
            {services.length > 2 && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="w-full py-2.5 mt-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-cyan transition-all bg-slate-900/50 rounded-xl border border-white/5 cursor-pointer"
              >
                {expanded ? 'MOINS D\'INFOS' : `VOIR ${services.length - 2} AUTRES`}
                {expanded ? <ChevronDown size={14} className="rotate-180" /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
        ) : (
          <div className="py-5 text-center border border-dashed border-white/10 rounded-2xl bg-slate-950/40">
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Aucun service configuré</p>
          </div>
        )}
      </div>

      {showExplorer && <FileExplorer vmid={vm.vmid} onClose={() => setShowExplorer(false)} />}
    </div>
  );
}
