import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Wifi, WifiOff, LayoutGrid, List, Settings as SettingsIcon, Terminal, Activity, TrendingUp } from 'lucide-react';
import Header from './Header';
import StatsCards from './StatsCards';
import VMCard from './VMCard';
import RegistryEditor from './RegistryEditor';
import VMDetails from './VMDetails';
import PasscodeLock from './PasscodeLock';
import { Toaster } from 'react-hot-toast';

const REFRESH_INTERVAL = 15000;

export default function Dashboard() {
  const [vms, setVms] = useState([]);
  const [nodeStatus, setNodeStatus] = useState(null);
  const [healthMap, setHealthMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVm, setSelectedVm] = useState(null);
  const [activeTab, setActiveTab] = useState('vms'); 
  const [isAuthorized, setIsAuthorized] = useState(localStorage.getItem('prox_auth') === 'true');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vmsRes, nodeRes] = await Promise.all([
        fetch('/api/vms'),
        fetch('/api/node/status'),
      ]);

      if (!vmsRes.ok || !nodeRes.ok) throw new Error('Échec de synchronisation backend');

      const vmsData = await vmsRes.json();
      const nodeData = await nodeRes.json();

      if (!vmsData.success) throw new Error(vmsData.error);

      setVms(vmsData.data);
      setNodeStatus(nodeData.data);
      setConnected(true);
      setLastUpdate(new Date());

      // Health checks
      const vmIdsWithServices = vmsData.data
        .filter(vm => vm.services && vm.services.length > 0)
        .map(vm => vm.vmid);

      const healthResults = await Promise.all(
        vmIdsWithServices.map(async (vmid) => {
          try {
            const res = await fetch(`/api/health/${vmid}`);
            const data = await res.json();
            return { vmid, services: data.data || [] };
          } catch {
            return { vmid, services: [] };
          }
        })
      );

      const newHealthMap = {};
      healthResults.forEach(({ vmid, services }) => {
        newHealthMap[vmid] = services;
      });
      setHealthMap(newHealthMap);
    } catch (err) {
      console.error('Erreur Sync:', err);
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && vms.length === 0) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="bg-mesh opacity-30" />
        <div className="relative">
          {/* Animated Rings */}
          <div className="w-32 h-32 rounded-full border-4 border-brand-cyan/20 border-t-brand-cyan animate-spin" />
          <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-brand-mint/10 border-b-brand-mint animate-spin-reverse" />
          
          {/* Central Icon */}
          <div className="absolute inset-0 flex items-center justify-center p-6">
             <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain animate-pulse" />
          </div>
        </div>
        
        <div className="mt-12 text-center space-y-4 animate-enter">
           <h1 className="text-3xl font-black text-white uppercase tracking-[0.5em] text-gradient">PROXDASH</h1>
           <div className="flex items-center gap-3 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-bounce" style={{ animationDelay: '0.4s' }} />
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">Initialisation du flux Proxmox...</p>
        </div>
      </div>
    );
  if (!isAuthorized) {
    return <PasscodeLock onAuthorized={() => setIsAuthorized(true)} />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="bg-mesh" />
      <div className="bg-grid fixed inset-0 pointer-events-none opacity-40" />

      <Header
        nodeStatus={nodeStatus}
        loading={loading}
        onRefresh={fetchData}
        onSettings={() => setShowSettings(true)}
        lastUpdate={lastUpdate}
      />

      <main className="max-w-[1800px] mx-auto px-4 sm:px-10 py-6 sm:py-12 main-container">
        {/* Error State */}
        {!connected && error && (
          <div className="mb-10 p-8 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl flex items-center gap-6 animate-enter">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white leading-none">Connexion Interrompue</h3>
              <p className="text-sm text-slate-500 mt-2">Impossible de joindre le serveur Proxmox. {error}</p>
            </div>
            <button
              onClick={fetchData}
              className="ml-auto px-8 py-3.5 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-400 transition-all active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              RÉESSAYER
            </button>
          </div>
        )}

        {vms.length > 0 && (
          <>
            <div className={`${activeTab === 'stats' ? 'block' : 'hidden sm:block'}`}>
               <StatsCards vms={vms} nodeStatus={nodeStatus} />
            </div>

            <div className={`${activeTab === 'vms' ? 'block' : 'hidden sm:block'}`}>

            {/* Content Control Bar */}
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Ma Flotte</h2>
                  <span className="px-3 py-1 rounded-xl bg-slate-900 text-brand-cyan font-bold text-[10px] border border-brand-cyan/20 uppercase tracking-widest">
                    {vms.length} Instances
                  </span>
                </div>
                
                <div className="h-8 w-px bg-white/5 hidden sm:block" />
                
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/5 hidden sm:flex">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-xl transition-all duration-300 ${viewMode === 'grid' ? 'bg-brand-cyan text-slate-950 shadow-[0_0_15px_rgba(0,209,255,0.4)]' : 'text-slate-500 hover:text-white'}`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-xl transition-all duration-300 ${viewMode === 'list' ? 'bg-brand-cyan text-slate-950 shadow-[0_0_15px_rgba(0,209,255,0.4)]' : 'text-slate-500 hover:text-white'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/5">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-mint animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {connected ? 'Sync Live' : 'Hors Ligne'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-3 rounded-2xl bg-slate-900 border border-white/5 text-slate-500 hover:text-white transition-all cursor-pointer"
                >
                  <SettingsIcon size={20} />
                </button>
              </div>
            </div>

            {/* VM Grid/List */}
            <div className={`mobile-stack ${viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10" 
              : "flex flex-col gap-4"
            }`}>
              {vms.map((vm, i) => (
                <VMCard
                  key={vm.vmid}
                  vm={vm}
                  healthData={healthMap[vm.vmid]}
                  index={i}
                  viewMode={viewMode}
                  onClick={() => setSelectedVm(vm)}
                />
              ))}
            </div>
            </div>
          </>
        )}

        {/* Mobile App Bottom Nav */}
        <div className="app-bottom-nav sm:hidden">
          <button 
            onClick={() => setActiveTab('vms')}
            className={`nav-item ${activeTab === 'vms' ? 'active' : ''}`}
          >
            <div className="nav-icon-container">
              <LayoutGrid size={24} />
            </div>
            <span>Ma Flotte</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('stats')}
            className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          >
            <div className="nav-icon-container">
              <TrendingUp size={24} />
            </div>
            <span>Stats</span>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="nav-item"
          >
            <div className="nav-icon-container">
              <SettingsIcon size={24} />
            </div>
            <span>Réglages</span>
          </button>
        </div>

        {/* Empty State / Loading */}
        {vms.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-40 text-center">
            <div className="w-24 h-24 rounded-[2rem] bg-slate-900 border border-brand-cyan/20 flex items-center justify-center mb-10 text-brand-cyan shadow-[0_0_50px_rgba(0,209,255,0.1)]">
              <Terminal size={48} />
            </div>
            <h3 className="text-3xl font-black text-white tracking-tighter mb-4 uppercase">Aucune Instance Détectée</h3>
            <p className="text-slate-500 max-w-sm mb-12 font-medium">
              Votre cluster semble vide ou la configuration API est incorrecte. Vérifiez vos réglages Proxmox.
            </p>
            <button 
              onClick={fetchData}
              className="px-10 py-4.5 rounded-2xl bg-brand-cyan text-slate-950 font-black hover:bg-white transition-all shadow-[0_0_30px_rgba(0,209,255,0.2)] active:scale-95"
            >
              RECONNECETER LE CLUSTER
            </button>
          </div>
        )}
      </main>

      {showSettings && (
        <RegistryEditor 
          onClose={() => setShowSettings(false)} 
          onSaveSuccess={() => fetchData()}
        />
      )}

      {selectedVM && (
        <VMDetails
          vm={selectedVM}
          healthData={healthMap[selectedVM.vmid] || []}
          onClose={() => setSelectedVM(null)}
          onRefresh={fetchData}
        />
      )}

      <footer className="max-w-[1800px] mx-auto px-10 py-16 mt-20 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-slate-900 border border-brand-cyan/20 flex items-center justify-center">
                <Layers size={20} className="text-brand-cyan" />
             </div>
             <span className="text-sm font-black text-slate-500 tracking-tight uppercase">ProxDash <span className="font-medium opacity-30">v1.2.0</span></span>
          </div>
          <div className="flex items-center gap-10 text-[10px] uppercase font-black tracking-[0.3em] text-slate-700">
            <a href="#" className="hover:text-brand-cyan transition-colors">Documentation</a>
            <a href="#" className="hover:text-brand-cyan transition-colors">Statut API</a>
            <a href="#" className="hover:text-brand-cyan transition-colors">Support</a>
          </div>
          <div className="text-[10px] font-mono text-slate-700 font-bold">
             DÉPLOYÉ PAR QUENTINOTT // {lastUpdate?.toLocaleTimeString()}
          </div>
        </div>
      </footer>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#020617',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)'
          },
          success: {
            iconTheme: {
              primary: '#00FF94',
              secondary: '#020617',
            },
          },
        }}
      />
    </div>
  );
}

function Layers({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
