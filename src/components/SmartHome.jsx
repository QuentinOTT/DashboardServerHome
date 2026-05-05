import { useState } from 'react';
import { Home, Battery, Bell, Clock, Info, Plus, Wifi, Power, Lightbulb, ThermometerSun, ShieldCheck } from 'lucide-react';

export default function SmartHome({ devices }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'Tous', icon: Home },
    { id: 'camera', label: 'Sécurité', icon: ShieldCheck },
    { id: 'light', label: 'Lumières', icon: Lightbulb },
    { id: 'climate', label: 'Confort', icon: ThermometerSun },
  ];

  return (
    <div className="space-y-10 animate-enter">
      {/* Header Domotique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Ma Maison</h2>
           <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">Contrôle des objets connectés</p>
        </div>
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/50 border border-white/5">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f.id ? 'bg-brand-cyan text-slate-950 shadow-[0_0_20px_rgba(0,209,255,0.3)]' : 'text-slate-500 hover:text-white'}`}
            >
              <f.icon size={14} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Carte Sonnette Spéciale */}
        {devices.map(device => {
          if (device.type === 'doorbell') {
            return (
              <div key={device.id} className="glass-card p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 group hover:border-brand-cyan/20 transition-all duration-500 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-cyan/5 rounded-full blur-3xl group-hover:bg-brand-cyan/10 transition-all" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
                    <Bell size={28} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black ${device.rssi < -70 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-brand-mint/10 border-brand-mint/20 text-brand-mint'}`}>
                      <Wifi size={10} /> {device.rssi} dBm
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black ${device.battery < 20 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-brand-mint/10 border-brand-mint/20 text-brand-mint'}`}>
                      <Battery size={10} /> {device.battery}%
                    </div>
                  </div>
                </div>

                <div>
                   <h3 className="text-xl font-black text-white uppercase tracking-tight">{device.name}</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{device.brand} Smart Doorbell</p>
                </div>

                <div className="space-y-3">
                   <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                      <div className="flex items-center gap-3 text-slate-400">
                         <Clock size={14} className="text-brand-cyan" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Dernier Événement</span>
                      </div>
                      <p className="text-xs text-white mt-2 font-medium">{device.lastEvent}</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-auto">
                   <button className="py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 border border-white/5 transition-all">Vignette</button>
                   <button className="py-3 rounded-xl bg-brand-cyan text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-white shadow-[0_0_20px_rgba(0,209,255,0.2)] transition-all">Carillon</button>
                </div>
              </div>
            );
          }
          return null;
        })}

        {/* Bouton Ajouter */}
        <button className="p-6 rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-slate-500 hover:text-brand-cyan hover:border-brand-cyan/30 hover:bg-brand-cyan/5 transition-all min-h-[300px] group">
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-all border border-white/5">
             <Plus size={32} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Ajouter un appareil</span>
        </button>
      </div>
    </div>
  );
}
