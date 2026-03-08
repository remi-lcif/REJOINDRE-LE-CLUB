import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Linkedin, 
  Instagram,
  ExternalLink, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  ChevronUp,
  ChevronDown,
  LogOut,
  MoreVertical,
  DoorOpen
} from 'lucide-react';

interface Link {
  id: number;
  title: string;
  url: string;
  image_url: string | null;
  order_index: number;
}

interface SettingsData {
  title: string;
  bio: string;
  profile_image: string;
  instagram_url: string;
}

export default function App() {
  const [links, setLinks] = useState<Link[]>([]);
  const [settings, setSettings] = useState<SettingsData>({
    title: 'le club immobilier français',
    bio: 'Découvrez le futur de l\'immobilier.',
    profile_image: 'https://res.cloudinary.com/dji8akleo/image/upload/v1772999427/3_quhn7t.png',
    instagram_url: 'https://www.instagram.com/leclubimmobilierfrancais/'
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin-token'));
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', url: '', image_url: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newLinkForm, setNewLinkForm] = useState({ title: '', url: '', image_url: '' });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsData>(settings);

  useEffect(() => {
    fetchData();
    if (token) setIsAdmin(true);
  }, [token]);

  const fetchData = async () => {
    try {
      const [linksRes, settingsRes] = await Promise.all([
        fetch('/api/links'),
        fetch('/api/settings')
      ]);
      const linksData = await linksRes.json();
      const settingsData = await settingsRes.json();
      
      setLinks(linksData);
      setSettings(settingsData);
      setSettingsForm(settingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('admin-token', data.token);
        setIsAdmin(true);
        setIsLoginModalOpen(false);
        setLoginForm({ username: '', password: '' });
      } else {
        setLoginError(data.message || 'Erreur de connexion');
      }
    } catch (error) {
      setLoginError('Erreur serveur');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin-token');
    setIsAdmin(false);
  };

  const handleAddLink = async () => {
    if (!newLinkForm.title || !newLinkForm.url) return;
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ ...newLinkForm, order_index: links.length })
      });
      if (res.ok) {
        setIsAdding(false);
        setNewLinkForm({ title: '', url: '', image_url: '' });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const handleUpdateLink = async (id: number) => {
    try {
      const link = links.find(l => l.id === id);
      if (!link) return;
      const res = await fetch(`/api/links/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({ ...link, ...editForm })
      });
      if (res.ok) {
        setIsEditing(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const handleDeleteLink = async (id: number) => {
    if (!confirm('Supprimer ce lien ?')) return;
    try {
      const res = await fetch(`/api/links/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': token || '' }
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        setIsEditingSettings(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const moveLink = async (id: number, direction: 'up' | 'down') => {
    const index = links.findIndex(l => l.id === id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === links.length - 1) return;

    const newLinks = [...links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];

    try {
      await Promise.all(newLinks.map((link, i) => 
        fetch(`/api/links/${link.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token || ''
          },
          body: JSON.stringify({ ...link, order_index: i })
        })
      ));
      fetchData();
    } catch (error) {
      console.error('Error reordering links:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#e8eff9] text-[#1a3a6c] font-sans selection:bg-[#1a3a6c] selection:text-white">
      {/* Admin Toggle */}
      <button 
        onClick={() => isAdmin ? handleLogout() : setIsLoginModalOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-white/80 backdrop-blur-md border border-black/5 rounded-full shadow-lg hover:bg-white transition-all z-50 text-[#1a3a6c]"
      >
        {isAdmin ? <LogOut className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
      </button>

      <main className="max-w-xl mx-auto px-6 py-12 flex flex-col items-center">
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 w-full flex flex-col items-center"
        >
          <div className="relative mb-6 group">
            <div className="w-48 h-24 flex items-center justify-center overflow-hidden">
              <img 
                src={settings.profile_image} 
                alt="Profile" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsEditingSettings(true)}
                className="absolute -inset-2 flex items-center justify-center bg-black/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-[#1a3a6c]"
              >
                <Edit2 className="w-6 h-6" />
              </button>
            )}
          </div>
          
          <h1 className="text-[22px] font-bold mb-1 tracking-tight text-[#1a3a6c]">
            {settings.title}
          </h1>
          <p className="text-[#1a3a6c] text-[15px] opacity-90 mb-6">
            {settings.bio}
          </p>

          {/* Social Icons */}
          <div className="flex gap-6 mb-10">
            <a href="https://www.linkedin.com/company/leclubimmobilierfran%C3%A7ais" target="_blank" rel="noopener noreferrer" className="text-[#1a3a6c] hover:scale-110 transition-transform">
              <Linkedin className="w-8 h-8" />
            </a>
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-[#1a3a6c] hover:scale-110 transition-transform">
                <Instagram className="w-8 h-8" />
              </a>
            )}
          </div>

          <h2 className="text-[13px] font-bold uppercase tracking-[0.05em] text-[#1a3a6c] mb-6">
            NOS PROCHAINS WEBINAIRES
          </h2>
        </motion.div>

        {/* Links Section */}
        <div className="w-full space-y-3 mb-16">
          <AnimatePresence mode="popLayout">
            {links.map((link, index) => (
              <motion.div
                key={link.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                {isEditing === link.id ? (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-black/5 space-y-3">
                    <input 
                      type="text" 
                      value={editForm.title}
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className="w-full px-3 py-2 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-1 ring-[#1a3a6c]"
                      placeholder="Nom du bouton"
                    />
                    <input 
                      type="text" 
                      value={editForm.url}
                      onChange={e => setEditForm({...editForm, url: e.target.value})}
                      className="w-full px-3 py-2 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-1 ring-[#1a3a6c]"
                      placeholder="URL de redirection"
                    />
                    <input 
                      type="text" 
                      value={editForm.image_url || ''}
                      onChange={e => setEditForm({...editForm, image_url: e.target.value})}
                      className="w-full px-3 py-2 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-1 ring-[#1a3a6c]"
                      placeholder="URL de l'image (optionnel)"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditing(null)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      <button onClick={() => handleUpdateLink(link.id)} className="p-2 text-[#1a3a6c] hover:text-[#0a2a5c]"><Save className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveLink(link.id, 'up')} className="p-1 text-gray-400 hover:text-[#1a3a6c]"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => moveLink(link.id, 'down')} className="p-1 text-gray-400 hover:text-[#1a3a6c]"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                    )}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-between px-4 py-3.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-all group/link"
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                          {link.image_url ? (
                            <img 
                              src={link.image_url} 
                              className="w-full h-full object-cover rounded-md"
                              alt="Thumbnail"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <DoorOpen className="w-6 h-6 text-[#1a3a6c]" />
                          )}
                        </div>
                        <span className="font-medium text-[15px] text-center flex-1 pr-10">{link.title}</span>
                      </div>
                      <MoreVertical className="w-4 h-4 text-gray-300 group-hover/link:text-[#1a3a6c] transition-colors" />
                    </a>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setIsEditing(link.id);
                            setEditForm({ title: link.title, url: link.url, image_url: link.image_url || '' });
                          }}
                          className="p-3 bg-white border border-black/5 rounded-lg text-gray-400 hover:text-[#1a3a6c] hover:shadow-sm transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-3 bg-white border border-black/5 rounded-lg text-gray-400 hover:text-red-500 hover:shadow-sm transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isAdmin && (
            <div className="pt-4">
              {isAdding ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-lg shadow-sm border-2 border-dashed border-[#1a3a6c]/20 space-y-4"
                >
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1a3a6c]">Nouveau Lien</h3>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={newLinkForm.title}
                      onChange={e => setNewLinkForm({...newLinkForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                      placeholder="Nom du bouton"
                    />
                    <input 
                      type="text" 
                      value={newLinkForm.url}
                      onChange={e => setNewLinkForm({...newLinkForm, url: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                      placeholder="URL"
                    />
                    <input 
                      type="text" 
                      value={newLinkForm.image_url}
                      onChange={e => setNewLinkForm({...newLinkForm, image_url: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                      placeholder="URL de l'image (optionnel)"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Annuler</button>
                    <button onClick={handleAddLink} className="px-6 py-2 bg-[#1a3a6c] text-white rounded-lg text-sm font-medium hover:bg-[#0a2a5c] transition-colors">Ajouter</button>
                  </div>
                </motion.div>
              ) : (
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full py-4 border-2 border-dashed border-[#1a3a6c]/20 rounded-lg flex items-center justify-center gap-2 text-[#1a3a6c] hover:bg-white/50 transition-all font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un lien
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">
            © {new Date().getFullYear()} Le Club Immobilier Français
          </p>
        </footer>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Connexion Admin</h2>
                <button onClick={() => setIsLoginModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-red-50 text-red-500 text-xs rounded-lg border border-red-100">
                    {loginError}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Identifiant</label>
                  <input 
                    type="text" 
                    required
                    value={loginForm.username}
                    onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Mot de passe</label>
                  <input 
                    type="password" 
                    required
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-[#1a3a6c] text-white rounded-xl font-bold hover:bg-[#0a2a5c] transition-all"
                >
                  Se connecter
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isEditingSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingSettings(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Paramètres du profil</h2>
                <button onClick={() => setIsEditingSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Nom du profil</label>
                  <input 
                    type="text" 
                    value={settingsForm.title}
                    onChange={e => setSettingsForm({...settingsForm, title: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Bio / Description</label>
                  <textarea 
                    value={settingsForm.bio}
                    onChange={e => setSettingsForm({...settingsForm, bio: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20 min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">URL de l'image de profil</label>
                  <input 
                    type="text" 
                    value={settingsForm.profile_image}
                    onChange={e => setSettingsForm({...settingsForm, profile_image: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Lien Instagram</label>
                  <input 
                    type="text" 
                    value={settingsForm.instagram_url}
                    onChange={e => setSettingsForm({...settingsForm, instagram_url: e.target.value})}
                    className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                    placeholder="https://www.instagram.com/votrecompte"
                  />
                </div>
              </div>

              <button 
                onClick={handleUpdateSettings}
                className="w-full py-4 bg-[#1a3a6c] text-white rounded-xl font-bold hover:bg-[#0a2a5c] transition-all"
              >
                Enregistrer les modifications
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
