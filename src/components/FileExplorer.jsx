import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Folder, File, ChevronRight, X, Loader2, ArrowLeft, Search, AlertTriangle } from 'lucide-react';

export default function FileExplorer({ vmid, onClose }) {
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(['/']);

  const fetchFiles = async (targetPath) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vms/${vmid}/files?path=${encodeURIComponent(targetPath)}`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.data);
        setPath(targetPath);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles('/');
  }, [vmid]);

  const navigateTo = (newPath) => {
    setHistory([...history, newPath]);
    fetchFiles(newPath);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      fetchFiles(newHistory[newHistory.length - 1]);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-20 bg-black/80 backdrop-blur-xl animate-enter">
      <div className="w-full max-w-4xl h-full max-h-[800px] glass rounded-[2.5rem] overflow-hidden flex flex-col border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan border border-brand-cyan/20">
              <Folder size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Explorateur de Fichiers</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">VM ID: {vmid} — {path}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Path bar */}
        <div className="px-8 py-4 bg-slate-950/50 flex items-center gap-4">
          <button 
            onClick={goBack}
            disabled={history.length <= 1}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-white/5 text-xs font-mono text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
            {path}
          </div>
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input 
              type="text" 
              placeholder="Rechercher..." 
              className="bg-slate-900 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-cyan/50 transition-all"
             />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 size={40} className="animate-spin text-brand-cyan" />
              <p className="text-sm font-bold uppercase tracking-widest">Lecture du système de fichiers...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-rose-500 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertTriangle size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">Erreur Guest Agent</p>
                <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
                  Le QEMU Guest Agent n'est pas activé sur cette VM ou ne répond pas. 
                </p>
                <div className="mt-6 p-4 rounded-xl bg-slate-900 border border-white/5 text-left">
                   <p className="text-[10px] uppercase font-black tracking-widest text-brand-cyan mb-2">Solution :</p>
                   <code className="text-xs text-slate-300 block bg-black/50 p-2 rounded">sudo apt install qemu-guest-agent</code>
                   <p className="text-[10px] text-slate-500 mt-2 italic">Activez aussi l'option 'QEMU Guest Agent' dans Proxmox → VM → Options.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file, i) => (
                <div 
                  key={i}
                  onClick={() => file.isDir && navigateTo(file.path)}
                  className={`
                    group p-4 rounded-2xl border border-white/5 transition-all duration-300
                    ${file.isDir ? 'bg-slate-900/40 hover:bg-brand-cyan/5 hover:border-brand-cyan/20 cursor-pointer' : 'bg-slate-950/20 cursor-default opacity-80'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${file.isDir ? 'bg-brand-cyan/10 text-brand-cyan' : 'bg-slate-800 text-slate-500'}`}>
                      {file.isDir ? <Folder size={20} /> : <File size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                        {file.isDir ? 'Dossier' : 'Fichier'}
                      </p>
                    </div>
                    {file.isDir && (
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-brand-cyan transition-colors" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
