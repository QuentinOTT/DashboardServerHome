import { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Rocket, Leaf, RefreshCw, AlertTriangle, TrendingDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EnergyOptimizer({ nodeStatus, powerSettings }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/node/power-profile');
      const data = await res.json();
      if (data.success) {
        setProfileData(data.data);
      }
    } catch (err) {
      console.error("Erreur profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSwitch = async (profile) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/node/power-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Mode ${profile} activé !`);
        fetchProfile();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Erreur lors du changement de mode");
    } finally {
      setSwitching(false);
    }
  };

  const profiles = [
    { 
      id: 'powersave', 
      label: 'ÉCO-MODE', 
      desc: 'Réduit la fréquence au minimum. Idéal pour la nuit ou faible charge.',
      icon: Leaf,
      color: '#10b981'
    },
    { 
      id: 'ondemand', 
      label: 'ÉQUILIBRÉ', 
      desc: 'Ajuste la puissance selon le besoin réel. Le mode par défaut.',
      icon: ShieldCheck,
      color: '#00D1FF'
    },
    { 
      id: 'performance', 
      label: 'TURBO-MAX', 
      desc: 'Processeur à fond en permanence. Latence minimale pour les VM.',
      icon: Rocket,
      color: '#f59e0b'
    }
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
      <RefreshCw className="text-brand-cyan animate-spin mb-4" size={32} />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analyse des cœurs CPU...</span>
    </div>
  );

  const currentProfile = profileData?.current || 'unknown';

  return (
    <div className="space-y-10 animate-enter">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-10">
              <Zap size={120} className="text-brand-cyan" />
           </div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Optimisation Énergie</h2>
           <p className="text-slate-400 text-sm max-w-xl mb-10 leading-relaxed font-medium">
             Gérez la consommation électrique de votre ThinkStation en ajustant le profil de performance du processeur. 
             Moins de chaleur, moins de bruit, ou plus de puissance selon vos besoins.
           </p>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {profiles.map((p) => {
               const isActive = currentProfile === p.id;
               const isAvailable = profileData?.available?.includes(p.id);

               return (
                 <button
                   key={p.id}
                   disabled={switching || !isAvailable}
                   onClick={() => handleSwitch(p.id)}
                   className={`p-6 rounded-[2rem] border transition-all duration-500 text-left flex flex-col gap-4 relative group ${
                     isActive 
                     ? 'bg-slate-900 border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.05)]' 
                     : 'bg-slate-950/50 border-white/5 hover:border-white/10 opacity-60 hover:opacity-100'
                   } ${!isAvailable && 'hidden'}`}
                 >
                   {isActive && (
                     <div className="absolute top-4 right-4 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: p.color }} />
                   )}
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} style={{ backgroundColor: `${p.color}10`, color: p.color, border: `1px solid ${p.color}20` }}>
                      <p.icon size={24} />
                   </div>
                   <div>
                     <h4 className="text-xs font-black text-white uppercase tracking-widest">{p.label}</h4>
                     <p className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">{p.desc}</p>
                   </div>
                   {isActive && (
                      <div className="mt-2 py-1.5 px-3 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-white text-center uppercase tracking-[0.2em]">ACTIF</div>
                   )}
                 </button>
               );
             })}
           </div>
        </div>

        <div className="glass-card p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-6">
                 <TrendingDown className="text-brand-cyan" size={20} />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projection de Coût</span>
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight mb-2">
                ~{((nodeStatus?.cpu || 0.05) * (powerSettings?.maxWatts || 200) * 0.22 * 24 * 30 / 1000).toFixed(2)}€
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Par mois sur ce profil</p>
           </div>

           <div className="space-y-4 mt-10">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                 <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                    <span className="text-slate-500">Efficience</span>
                    <span className="text-brand-cyan">{currentProfile === 'powersave' ? '98%' : '75%'}</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-cyan transition-all duration-1000" style={{ width: currentProfile === 'powersave' ? '98%' : '75%' }} />
                 </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 text-rose-500/60">
                 <AlertTriangle size={16} />
                 <span className="text-[9px] font-black uppercase tracking-widest leading-tight">Attention : Le mode performance augmente la température.</span>
              </div>
           </div>
        </div>
      </div>

      {/* Optimization Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="p-8 rounded-[2rem] bg-slate-900/30 border border-white/5 flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan shrink-0">
               <Info size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">Pourquoi changer de profil ?</h4>
               <p className="text-xs text-slate-500 leading-relaxed">
                 Le mode <b>Powersave</b> force le processeur à sa fréquence minimale, réduisant drastiquement la consommation et la chauffe. 
                 C'est idéal si votre serveur ne fait que du stockage ou des petits services web. 
                 Le mode <b>Performance</b> empêche le processeur de "dormir", ce qui réduit la latence lors des pics de charge.
               </p>
            </div>
         </div>
         <div className="p-8 rounded-[2rem] bg-slate-900/30 border border-white/5 flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
               <AlertTriangle size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">Accès refusé ?</h4>
               <p className="text-xs text-slate-500 leading-relaxed">
                 Si vous recevez une erreur, c'est que le conteneur LXC n'a pas le droit d'écrire dans <code>/sys</code>. 
                 Il faut ajouter <code>lxc.mount.entry: /sys/devices/system/cpu sys/devices/system/cpu none bind,rw 0 0</code> dans le fichier de config de votre CT.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
