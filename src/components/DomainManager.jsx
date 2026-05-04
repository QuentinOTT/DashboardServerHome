import { useState, useEffect } from 'react';
import { Globe, Plus, ExternalLink, Edit2, Trash2, X, Save, Server, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DomainManager({ onClose }) {
  const [domains, setDomains] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    site: ''
  });

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = () => {
    const savedDomains = localStorage.getItem('domains');
    if (savedDomains) {
      setDomains(JSON.parse(savedDomains));
    }
  };

  const saveDomains = (updatedDomains) => {
    localStorage.setItem('domains', JSON.stringify(updatedDomains));
    setDomains(updatedDomains);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.url) {
      toast.error('Le nom de domaine et l\'URL sont requis');
      return;
    }

    if (editingDomain) {
      const updatedDomains = domains.map(domain => 
        domain.id === editingDomain.id 
          ? { ...domain, ...formData, updatedAt: new Date().toISOString() }
          : domain
      );
      saveDomains(updatedDomains);
      toast.success('Domaine mis à jour avec succès');
      setEditingDomain(null);
    } else {
      const newDomain = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updatedDomains = [...domains, newDomain];
      saveDomains(updatedDomains);
      toast.success('Domaine ajouté avec succès');
    }

    setFormData({ name: '', url: '', description: '', site: '' });
    setShowAddForm(false);
  };

  const handleEdit = (domain) => {
    setEditingDomain(domain);
    setFormData({
      name: domain.name,
      url: domain.url,
      description: domain.description,
      site: domain.site
    });
    setShowAddForm(true);
  };

  const handleDelete = (domainId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce domaine ?')) {
      const updatedDomains = domains.filter(domain => domain.id !== domainId);
      saveDomains(updatedDomains);
      toast.success('Domaine supprimé avec succès');
    }
  };

  const cancelForm = () => {
    setFormData({ name: '', url: '', description: '', site: '' });
    setShowAddForm(false);
    setEditingDomain(null);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(0,209,255,0.1)]">
        <div className="flex items-center justify-between p-8 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 flex items-center justify-center">
              <Globe size={24} className="text-brand-cyan" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Gestionnaire de Domaines</h2>
              <p className="text-sm text-slate-500 mt-1">Répertoriez et gérez tous vos noms de domaine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-xl bg-slate-800 text-brand-cyan font-bold text-[10px] border border-brand-cyan/20 uppercase tracking-widest">
                {domains.length} Domaine{domains.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-cyan text-slate-950 font-black hover:bg-white transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)]"
            >
              <Plus size={18} />
              AJOUTER UN DOMAINE
            </button>
          </div>

          {showAddForm && (
            <div className="mb-8 p-6 rounded-2xl bg-slate-800/50 border border-white/5">
              <h3 className="text-lg font-black text-white mb-6 uppercase tracking-tighter">
                {editingDomain ? 'Modifier le domaine' : 'Ajouter un nouveau domaine'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
                      Nom de domaine *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-600 focus:border-brand-cyan transition-all"
                      placeholder="example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
                      URL du site *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-600 focus:border-brand-cyan transition-all"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
                    Site/Service
                  </label>
                  <input
                    type="text"
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-600 focus:border-brand-cyan transition-all"
                    placeholder="Site web principal, API, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-600 focus:border-brand-cyan transition-all resize-none"
                    placeholder="Description du domaine, utilisation, etc."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-cyan text-slate-950 font-black hover:bg-white transition-all"
                  >
                    <Save size={18} />
                    {editingDomain ? 'METTRE À JOUR' : 'AJOUTER'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-6 py-3 rounded-xl bg-slate-800 text-slate-400 font-black hover:text-white transition-all"
                  >
                    ANNULER
                  </button>
                </div>
              </form>
            </div>
          )}

          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-brand-cyan/20 flex items-center justify-center mb-8 text-brand-cyan">
                <Globe size={40} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tighter mb-4 uppercase">Aucun domaine enregistré</h3>
              <p className="text-sm text-slate-500 mb-8">Commencez par ajouter votre premier domaine pour le répertorier</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {domains.map((domain) => (
                <div key={domain.id} className="p-6 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-brand-cyan/20 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center">
                        <Globe size={20} className="text-brand-cyan" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">{domain.name}</h4>
                        {domain.site && (
                          <div className="flex items-center gap-2 mt-1">
                            <Server size={12} className="text-slate-500" />
                            <span className="text-xs text-slate-500">{domain.site}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.open(domain.url, '_blank')}
                        className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-brand-cyan transition-all"
                        title="Visiter le site"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(domain)}
                        className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-brand-cyan transition-all"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(domain.id)}
                        className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-rose-500 transition-all"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {domain.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{domain.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <a
                      href={domain.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-cyan hover:text-white transition-all truncate flex-1 mr-4"
                    >
                      {domain.url}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Calendar size={12} />
                      <span>{new Date(domain.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
