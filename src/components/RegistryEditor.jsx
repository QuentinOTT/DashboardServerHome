import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Plus, Trash2, Globe, Server, Shield, Loader2, AlertCircle, Info, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegistryEditor({ onClose, onSaveSuccess }) {
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRegistry();
  }, []);

  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/registry');
      const data = await res.json();
      setRegistry(data.data);
    } catch (err) {
      setError("Impossible de charger les réglages");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registry)
      });
      if (res.ok) {
        toast.success("Infrastructure mise à jour !");
        onSaveSuccess();
        onClose();
      }
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const addService = (vmid) => {
    const newRegistry = { ...registry };
    newRegistry.vms[vmid].services.push({
      name: "Nouveau Service",
      port: 80,
      protocol: "http",
      icon: "globe",
      url: ""
    });
    setRegistry(newRegistry);
  };

  const removeService = (vmid, index) => {
    const newRegistry = { ...registry };
    newRegistry.vms[vmid].services.splice(index, 1);
    setRegistry(newRegistry);
  };

  const updateService = (vmid, index, field, value) => {
    const newRegistry = { ...registry };
    newRegistry.vms[vmid].services[index][field] = value;
    setRegistry(newRegistry);
  };

  const updateVM = (vmid, field, value) => {
    const newRegistry = { ...registry };
    newRegistry.vms[vmid][field] = value;
    setRegistry(newRegistry);
  };

  if (loading) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl animate-enter">
      <div className="w-full max-w-5xl h-full max-h-[850px] glass rounded-[3rem] overflow-hidden flex flex-col border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
              <Shield size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Configuration Infrastructure</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1.5 opacity-60">Mapping des services & domaines</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setRegistry(prev => ({
                  ...prev,
                  domotique: [...(prev.domotique || []), {
                    id: `device-${Date.now()}`,
                    type: 'light',
                    brand: 'Generic',
                    name: 'Nouvel Appareil',
                    ip: '192.168.1.X',
                    status: 'online'
                  }]
                }));
              }}
              className="px-6 py-3 rounded-2xl bg-brand-cyan/10 text-brand-cyan font-black text-xs hover:bg-brand-cyan hover:text-slate-950 transition-all flex items-center gap-2 cursor-pointer border border-brand-cyan/20"
            >
              <Plus size={16} /> AJOUTER APPAREIL DOMOTIQUE
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-slate-800 text-slate-400 font-bold text-xs hover:text-white transition-all cursor-pointer"
            >
              ANNULER
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-brand-cyan text-slate-950 font-black text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)] flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              SAUVEGARDER LES RÉGLAGES
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          {Object.entries(registry.vms).map(([vmid, vm]) => (
            <div key={vmid} className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded-xl bg-slate-900 text-brand-cyan font-mono text-xs border border-brand-cyan/20">VM {vmid}</span>
                  <input 
                    type="text" 
                    value={vm.label} 
                    onChange={(e) => updateVM(vmid, 'label', e.target.value)}
                    className="text-lg font-black text-white bg-transparent border-none focus:ring-0 w-64 placeholder:opacity-20"
                    placeholder="Nom du cluster..."
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IP Locale :</span>
                  <input 
                    type="text" 
                    value={vm.ip} 
                    onChange={(e) => updateVM(vmid, 'ip', e.target.value)}
                    className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 text-xs font-mono text-slate-300 w-40 focus:border-brand-cyan/50 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {vm.services.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-900/30 border border-white/5 group hover:border-white/10 transition-all">
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Nom du Service</span>
                        <input 
                          type="text" 
                          value={service.name} 
                          onChange={(e) => updateService(vmid, idx, 'name', e.target.value)}
                          className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:border-brand-cyan/50 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Port</span>
                        <input 
                          type="number" 
                          value={service.port} 
                          onChange={(e) => updateService(vmid, idx, 'port', parseInt(e.target.value))}
                          className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Protocole</span>
                        <select 
                          value={service.protocol} 
                          onChange={(e) => updateService(vmid, idx, 'protocol', e.target.value)}
                          className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                        >
                          <option value="http">HTTP</option>
                          <option value="https">HTTPS</option>
                          <option value="tcp">TCP (Ping)</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">URL / Domaine</span>
                        <input 
                          type="text" 
                          value={service.url} 
                          onChange={(e) => updateService(vmid, idx, 'url', e.target.value)}
                          className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-700"
                          placeholder="https://mon-site.fr"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removeService(vmid, idx)}
                      className="p-3 rounded-xl bg-rose-500/5 text-rose-500/40 hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => addService(vmid)}
                  className="w-full py-4 rounded-2xl border border-dashed border-white/10 text-slate-500 hover:text-brand-cyan hover:border-brand-cyan/30 hover:bg-brand-cyan/5 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3"
                >
                  <Plus size={18} />
                  Ajouter un service sur cette VM
                </button>
              </div>
            </div>
          ))}

          {/* Domotique Management */}
          <div className="space-y-6 pt-12 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                <Home size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Appareils Domotique</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gestion des objets connectés</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {registry.domotique?.map((device, idx) => (
                <div key={device.id} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-900/30 border border-white/5 group hover:border-white/10 transition-all">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Nom de l'Appareil</span>
                      <input 
                        type="text" 
                        value={device.name} 
                        onChange={(e) => {
                          const newRegistry = { ...registry };
                          newRegistry.domotique[idx].name = e.target.value;
                          setRegistry(newRegistry);
                        }}
                        className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:border-brand-cyan/50 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Type</span>
                      <select 
                        value={device.type} 
                        onChange={(e) => {
                          const newRegistry = { ...registry };
                          newRegistry.domotique[idx].type = e.target.value;
                          setRegistry(newRegistry);
                        }}
                        className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                      >
                        <option value="doorbell">Sonnette / Caméra</option>
                        <option value="light">Lumière / Prise</option>
                        <option value="climate">Capteur / Climat</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Marque</span>
                      <input 
                        type="text" 
                        value={device.brand} 
                        onChange={(e) => {
                          const newRegistry = { ...registry };
                          newRegistry.domotique[idx].brand = e.target.value;
                          setRegistry(newRegistry);
                        }}
                        className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">IP Locale</span>
                      <input 
                        type="text" 
                        value={device.ip} 
                        onChange={(e) => {
                          const newRegistry = { ...registry };
                          newRegistry.domotique[idx].ip = e.target.value;
                          setRegistry(newRegistry);
                        }}
                        className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newRegistry = { ...registry };
                      newRegistry.domotique.splice(idx, 1);
                      setRegistry(newRegistry);
                    }}
                    className="p-3 rounded-xl bg-rose-500/5 text-rose-500/40 hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Power Management Section */}
          <div className="space-y-6 pt-12 border-t border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase">Gestion de l'Énergie</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Estimation des coûts & consommation</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activer le suivi</span>
                 <button 
                  onClick={() => {
                    const newRegistry = { ...registry };
                    newRegistry.settings.power.enabled = !newRegistry.settings.power.enabled;
                    setRegistry(newRegistry);
                  }}
                  className={`w-12 h-6 rounded-full transition-all relative ${registry.settings?.power?.enabled ? 'bg-amber-500' : 'bg-slate-800'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${registry.settings?.power?.enabled ? 'right-1' : 'left-1'}`} />
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 rounded-[2rem] bg-slate-900/30 border border-white/5">
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Conso. Idle (Watts)</span>
                <input 
                  type="number" 
                  value={registry.settings?.power?.idleWatts || 0} 
                  onChange={(e) => {
                    const newRegistry = { ...registry };
                    newRegistry.settings.power.idleWatts = parseInt(e.target.value);
                    setRegistry(newRegistry);
                  }}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Conso. Max (Watts)</span>
                <input 
                  type="number" 
                  value={registry.settings?.power?.maxWatts || 0} 
                  onChange={(e) => {
                    const newRegistry = { ...registry };
                    newRegistry.settings.power.maxWatts = parseInt(e.target.value);
                    setRegistry(newRegistry);
                  }}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Prix du kWh (€)</span>
                <input 
                  type="number" 
                  step="0.001"
                  value={registry.settings?.power?.kwhPrice || 0} 
                  onChange={(e) => {
                    const newRegistry = { ...registry };
                    newRegistry.settings.power.kwhPrice = parseFloat(e.target.value);
                    setRegistry(newRegistry);
                  }}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Devise</span>
                <input 
                  type="text" 
                  value={registry.settings?.power?.currency || '€'} 
                  onChange={(e) => {
                    const newRegistry = { ...registry };
                    newRegistry.settings.power.currency = e.target.value;
                    setRegistry(newRegistry);
                  }}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-brand-cyan/5 border border-brand-cyan/10 flex items-start gap-5">
            <Info className="text-brand-cyan shrink-0" size={24} />
            <div>
               <h4 className="text-sm font-black text-white uppercase tracking-tight">À propos du Service Registry</h4>
               <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                 Ces réglages sont sauvegardés dans le fichier <code className="text-brand-cyan">service-registry.json</code> sur votre serveur. 
                 Ils permettent au dashboard de savoir quels ports tester et quels liens afficher pour vos sites web.
                 La section énergie permet d'estimer votre consommation électrique basée sur la charge CPU.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
