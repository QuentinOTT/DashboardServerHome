import { Server, Cpu, MemoryStick, HardDrive, Zap, TrendingUp, Thermometer } from 'lucide-react';
import { formatBytes, formatPercent } from '../utils';

function StatCard({ icon: Icon, label, value, subValue, trend, color, delay, secondaryValue }) {
  return (
    <div
      className="glass-card p-8 rounded-[2rem] relative overflow-hidden group animate-enter border border-white/5"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Accent Glow */}
      <div 
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-10 transition-opacity group-hover:opacity-30"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `${color}10`, border: `1px solid ${color}30` }}
          >
            <Icon size={28} style={{ color }} />
          </div>
          {trend && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
              style={{ background: `${color}05`, borderColor: `${color}20`, color }}
            >
              <TrendingUp size={12} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mb-2">{label}</p>
        <div className="flex items-baseline gap-3">
          <h3 className="text-4xl font-black text-white tracking-tighter">{value}</h3>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-600 font-mono">{subValue}</span>
            {secondaryValue && (
              <span className="text-xs font-black text-brand-cyan flex items-center gap-1.5 mt-2 animate-pulse">
                {secondaryValue}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatsCards({ vms, nodeStatus, powerSettings }) {
  const running = vms.filter(v => v.status === 'running').length;
  const totalCpu = nodeStatus?.cpu || 0;
  const memUsed = nodeStatus?.memory?.used || 0;
  const memTotal = nodeStatus?.memory?.total || 0;
  const cpuTemp = nodeStatus?.cpuTemp;

  // Calculs Energie Précis
  const isPowerEnabled = powerSettings?.enabled;
  const idleWatts = powerSettings?.idleWatts || 0;
  const maxWatts = powerSettings?.maxWatts || 0;
  const kwhPrice = powerSettings?.kwhPrice || 0;
  const currency = powerSettings?.currency || '€';
  
  // Formule : Conso = Idle + (Charge * Delta)
  // On sature à 100% pour éviter les aberrations
  const loadFactor = Math.min(Math.max(totalCpu, 0), 1);
  const currentWatts = Math.round(idleWatts + (maxWatts - idleWatts) * loadFactor);
  
  // Coût mensuel basé sur la conso instantanée (estimation lissée)
  const monthlyCost = ((currentWatts * 24 * 30.5) / 1000) * kwhPrice;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
      <StatCard
        icon={Server}
        label="Instances Totales"
        value={vms.length}
        subValue={`${vms.filter(v => v.type === 'qemu').length} VM | ${vms.filter(v => v.type === 'lxc').length} LXC`}
        trend="Fleet"
        color="#00D1FF"
        delay={0.1}
      />
      <StatCard
        icon={Cpu}
        label="Charge Processeur"
        value={formatPercent(totalCpu)}
        subValue="Global"
        secondaryValue={cpuTemp ? <><Thermometer size={10} /> {Math.round(cpuTemp)}°C</> : null}
        trend={nodeStatus?.cpuinfo ? `${nodeStatus.cpuinfo.cores} Coeurs` : ''}
        color="#00FF94"
        delay={0.2}
      />
      <StatCard
        icon={MemoryStick}
        label="Mémoire Cluster"
        value={formatBytes(memUsed)}
        subValue={`/ ${formatBytes(memTotal)}`}
        trend={`${Math.round((memUsed / (memTotal || 1)) * 100)}%`}
        color="#00D1FF"
        delay={0.3}
      />
      
      {isPowerEnabled ? (
        <StatCard
          icon={Zap}
          label="Consommation Est."
          value={`${currentWatts} W`}
          subValue={`~${monthlyCost.toFixed(2)}${currency}/mois`}
          trend="Energie"
          color="#f59e0b"
          delay={0.4}
        />
      ) : (
        <StatCard
          icon={HardDrive}
          label="État des Noeuds"
          value={running}
          subValue="En ligne"
          trend={`${vms.length - running} Arrêts`}
          color="#00FF94"
          delay={0.4}
        />
      )}
    </div>
  );
}
