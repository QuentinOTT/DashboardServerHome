import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Cpu, MemoryStick, Activity, Clock, Container, 
  Terminal, Shield, Play, Square, RotateCcw, 
  Settings, ExternalLink, AlertCircle, CheckCircle2,
  TrendingUp, BarChart3, Database, Globe, Folder, Search, Loader2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { formatBytes, formatUptime, formatPercent } from '../utils';

export default function VMDetails({ vm, healthData, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dockerContainers, setDockerContainers] = useState([]);
  const [systemLogs, setSystemLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // Mock historical data
  useEffect(() => {
    const data = Array.from({ length: 20 }).map((_, i) => ({
      time: i,
      cpu: Math.random() * 40 + 10,
      ram: Math.random() * 20 + 60
    }));
    setHistory(data);
  }, []);

  useEffect(() => {
    if (activeTab === 'docker') fetchDocker();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchDocker = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vms/${vm.vmid}/docker`);
      const data = await res.json();
      if (data.success) setDockerContainers(data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vms/${vm.vmid}/logs`);
      const data = await res.json();
      if (data.success) setSystemLogs(data.data);
    } finally {
      setLoading(false);
    }
  };

  const handlePower = async (command) => {
    if (!window.confirm(`Confirmer ${command} sur ${vm.name} ?`)) return;
    setActionLoading(command);
    try {
      const res = await fetch(`/api/vms/${vm.vmid}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });
      if (res.ok) onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-6 bg-black/95 backdrop-blur-3xl animate-enter">
      <div className="w-full max-w-6xl h-full max-h-full md:max-h-[900px] modal-full-mobile glass rounded-none md:rounded-[3.5rem] overflow-hidden flex flex-col border-0 md:border border-white/10 shadow-2xl">
        
        {/* Header Section */}
        <div className="p-6 md:p-12 border-b border-white/5 bg-slate-900/40 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6 md:gap-10">
              <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[2rem] flex items-center justify-center border-2 ${
                vm.status === 'running' ? 'bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan shadow-[0_0_30px_rgba(0,209,255,0.1)]' : 'bg-slate-900 border-white/10 text-slate-600'
              }`}>
                <Activity size={window.innerWidth < 768 ? 32 : 48} />
              </div>
              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                  <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter uppercase truncate max-w-[200px] md:max-w-none">{vm.name}</h2>
                  <div className={`w-fit px-3 py-1 rounded-full text-[8px] md:text-[10px] font-black tracking-[0.2em] border ${
                    vm.status === 'running' ? 'bg-brand-mint/10 border-brand-mint/20 text-brand-mint' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  }`}>
                    {vm.status === 'running' ? 'SYSTÈME ON' : 'SYSTÈME OFF'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-8 mt-3 md:mt-5">
                  <div className="flex items-center gap-2 text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    <Terminal size={14} className="text-brand-cyan" />
                    ID {vm.vmid}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                    <Globe size={14} className="text-brand-mint" />
                    {vm.ip || 'PAS D\'IP'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest hide-mobile">
                    <Clock size={14} className="text-brand-cyan" />
                    DURÉE: {formatUptime(vm.uptime)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 md:gap-5">
              <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl md:rounded-[2rem] border border-white/5">
                <button 
                  onClick={() => handlePower('start')}
                  disabled={vm.status === 'running' || actionLoading}
                  className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-brand-mint/10 text-brand-mint hover:bg-brand-mint hover:text-slate-950 disabled:opacity-10 transition-all cursor-pointer"
                >
                  <Play size={20} md:size={24} />
                </button>
                <button 
                  onClick={() => handlePower('reboot')}
                  disabled={vm.status !== 'running' || actionLoading}
                  className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white disabled:opacity-10 transition-all cursor-pointer"
                >
                  <RotateCcw size={20} md:size={24} />
                </button>
                <button 
                  onClick={() => handlePower('shutdown')}
                  disabled={vm.status !== 'running' || actionLoading}
                  className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white disabled:opacity-10 transition-all cursor-pointer"
                >
                  <Square size={20} md:size={24} />
                </button>
              </div>
              <button onClick={onClose} className="p-3 md:p-5 rounded-xl md:rounded-[2rem] bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5">
                <X size={24} md:size={32} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 bg-slate-950/40 px-4 md:px-12 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Monitor', icon: Activity },
            { id: 'docker', label: 'Docker', icon: Container },
            { id: 'logs', label: 'Logs', icon: Terminal },
            { id: 'network', label: 'Services', icon: Shield },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 md:gap-4 px-6 md:px-10 py-5 md:py-8 text-[9px] md:text-[11px] font-black uppercase tracking-[0.25em] transition-all relative cursor-pointer whitespace-nowrap ${
                activeTab === tab.id ? 'text-brand-cyan' : 'text-slate-600 hover:text-white'
              }`}
            >
              <tab.icon size={16} md:size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 md:h-1.5 bg-brand-cyan" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="space-y-10 md:space-y-12 animate-enter">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                  <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                     <TrendingUp className="text-brand-cyan" size={20} md:size={24} />
                     Analyse Temps Réel
                  </h3>
                  <div className="h-64 md:h-80 w-full bg-slate-900/30 rounded-3xl md:rounded-[3rem] border border-white/5 p-4 md:p-8 min-h-[250px] md:min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00D1FF" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#00D1FF" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00FF94" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="5 5" stroke="#ffffff03" vertical={false} />
                        <XAxis hide dataKey="time" />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#020617', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                        />
                        <Area type="monotone" dataKey="cpu" stroke="#00D1FF" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={3} md:strokeWidth={4} />
                        <Area type="monotone" dataKey="ram" stroke="#00FF94" fillOpacity={1} fill="url(#colorRam)" strokeWidth={3} md:strokeWidth={4} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                  <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                     <Database className="text-brand-cyan" size={20} md:size={24} />
                     Hardware
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-6">
                    <div className="p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-slate-900/50 border border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">vCPU</span>
                        <span className="text-lg md:text-2xl font-black text-white">{vm.cpus} Cores</span>
                      </div>
                      <div className="h-1.5 md:h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-cyan w-[40%]" />
                      </div>
                    </div>
                    <div className="p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] bg-slate-900/50 border border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest">RAM</span>
                        <span className="text-lg md:text-2xl font-black text-white">{formatBytes(vm.maxmem)}</span>
                      </div>
                      <div className="h-1.5 md:h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-mint w-[60%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'docker' && (
            <div className="space-y-10 animate-enter">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                      <Container size={28} />
                   </div>
                   Docker Containers
                </h3>
                <button onClick={fetchDocker} className="px-6 py-2 rounded-xl bg-slate-900 border border-white/5 text-[11px] font-black text-brand-cyan hover:bg-brand-cyan hover:text-slate-950 transition-all cursor-pointer">
                  Actualiser
                </button>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-600 gap-6">
                   <Loader2 size={48} className="animate-spin text-brand-cyan" />
                   <span className="text-xs font-black uppercase tracking-widest">Interrogation...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(dockerContainers || []).map((container, i) => (
                    <div key={i} className="p-8 rounded-[3rem] bg-slate-900/30 border border-white/5 hover:border-brand-cyan/30 transition-all flex items-center justify-between">
                       <div className="flex items-center gap-8">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                            container.Status?.includes('Up') ? 'bg-brand-mint/10 border-brand-mint/20 text-brand-mint' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          }`}>
                             <Container size={32} />
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-white uppercase tracking-tight">{container.Names?.replace(/^\//, '')}</h4>
                             <div className="flex items-center gap-4 mt-2">
                                <span className="text-[10px] font-mono text-slate-500">{container.Image}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                <span className={`text-[10px] font-black uppercase ${container.Status?.includes('Up') ? 'text-brand-mint' : 'text-rose-500'}`}>{container.Status}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="h-full flex flex-col space-y-8 animate-enter">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-5 px-2">
                 <Terminal size={28} className="text-brand-cyan" />
                 Journal Système
              </h3>
              <div className="flex-1 bg-slate-950 border border-white/10 rounded-[2.5rem] p-10 font-mono text-[11px] overflow-y-auto custom-scrollbar relative">
                 {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm rounded-[2.5rem]">
                       <Loader2 size={40} className="animate-spin text-brand-cyan" />
                    </div>
                 ) : (
                    <pre className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {systemLogs || 'Aucun log trouvé.'}
                    </pre>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-12 animate-enter">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-5">
                 <Shield size={28} className="text-brand-cyan" />
                 Infrastructure Mapping
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {healthData.map((service, i) => (
                  <div key={i} className="p-8 rounded-[3rem] bg-slate-900/40 border border-white/5 hover:border-brand-cyan/20 transition-all flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${service.status === 'up' ? 'bg-brand-mint/10 text-brand-mint' : 'bg-rose-500/10 text-rose-500'}`}>
                          <Globe size={32} />
                       </div>
                       <div>
                          <p className="text-xl font-black text-white uppercase tracking-tight">{service.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-2">{service.url || `Port ${service.port}`}</p>
                       </div>
                    </div>
                    <div className={`status-pill ${service.status === 'up' ? 'status-online' : 'status-offline'}`}>
                       {service.status === 'up' ? 'UP' : 'DOWN'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
