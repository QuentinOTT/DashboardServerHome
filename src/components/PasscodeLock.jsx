import { useState, useEffect } from 'react';
import { Lock, Delete, ArrowRight } from 'lucide-react';

export default function PasscodeLock({ onAuthorized }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const correctCode = '2511';

  useEffect(() => {
    if (code.length === 4) {
      if (code === correctCode) {
        localStorage.setItem('prox_auth', 'true');
        onAuthorized();
      } else {
        setError(true);
        setTimeout(() => {
          setCode('');
          setError(false);
        }, 600);
      }
    }
  }, [code, onAuthorized]);

  const handlePress = (num) => {
    if (code.length < 4) setCode(prev => prev + num);
  };

  const handleDelete = () => {
    setCode(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[20000] bg-[#0a0a0f] flex flex-col items-center justify-center p-6">
      <div className="bg-mesh opacity-20" />
      
      {/* App Logo */}
      <div className="mb-16 text-center animate-enter">
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
          <img src="/logo.png" alt="Logo" className="w-16 h-16 object-contain" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-[0.3em] uppercase">ProxDash</h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Infrastructure Sécurisée</p>
      </div>

      {/* Code Dots */}
      <div className={`flex gap-6 mb-16 ${error ? 'animate-bounce text-rose-500' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div 
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              code.length > i 
                ? 'bg-brand-cyan border-brand-cyan shadow-[0_0_15px_#00D1FF]' 
                : 'border-white/10'
            }`}
          />
        ))}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-6 max-w-[320px] w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            onClick={() => handlePress(num)}
            className="w-20 h-20 rounded-full bg-slate-900/50 border border-white/5 text-2xl font-black text-white hover:bg-white hover:text-black active:scale-90 transition-all flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          onClick={() => handlePress(0)}
          className="w-20 h-20 rounded-full bg-slate-900/50 border border-white/5 text-2xl font-black text-white hover:bg-white hover:text-black active:scale-90 transition-all flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-20 h-20 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-all"
        >
          <Delete size={28} />
        </button>
      </div>

      <div className="mt-16 flex items-center gap-2 text-slate-600">
        <Lock size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">Accès Restreint</span>
      </div>
    </div>
  );
}
