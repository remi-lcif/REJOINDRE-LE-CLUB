import * as React from 'react';
import { useState, useEffect } from 'react';
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
  DoorOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DEFAULT_LINKS, DEFAULT_SETTINGS, type Link, type SettingsData } from './constants';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';

// Error Boundary Component (Disabled due to lint issues)
/*
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message || String(error) };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
            <h2 className="text-xl font-bold text-red-600 mb-4">Oups ! Une erreur est survenue</h2>
            <p className="text-gray-600 mb-6">L'application a rencontré un problème inattendu.</p>
            <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto mb-6 max-h-40">
              {this.state.errorInfo}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
*/

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function App() {
  const [links, setLinks] = useState<Link[]>(DEFAULT_LINKS);
  const [settings, setSettings] = useState<SettingsData>(DEFAULT_SETTINGS);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isEditing, setIsEditing] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState({ title: '', url: '', image_url: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [newLinkForm, setNewLinkForm] = useState({ title: '', url: '', image_url: '' });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsData>(settings);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<string | number | boolean | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | number | null>(null);

  // Firestore Error Handler
  const handleFirestoreError = (error: any, operation: OperationType, path: string) => {
    const errInfo = {
      error: error.message || String(error),
      operationType: operation,
      path,
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName,
          email: p.email,
          photoUrl: p.photoURL
        })) || []
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo));
    setNotification({ 
      message: `Erreur (${operation}): ${error.message || 'Permission refusée'}`, 
      type: 'error' 
    });
    // Don't throw, just log and notify
  };

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      // Admin check: remi@leclubimmobilier.fr
      if (currentUser && currentUser.email === 'remi@leclubimmobilier.fr') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Links Listener
  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'links'), orderBy('order_index', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const linksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as Link[];
      
      setLinks(linksData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'links');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  // Real-time Settings Listener
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubscribe = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SettingsData;
        setSettings(data);
        setSettingsForm(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/config');
    });

    return () => unsubscribe();
  }, [isAuthReady]);

  const handleLogin = async () => {
    setLoginError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsLoginModalOpen(false);
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      // Show more descriptive error message
      if (error.code === 'auth/popup-blocked') {
        setLoginError("Le popup de connexion a été bloqué par votre navigateur.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Ce domaine n'est pas autorisé dans votre console Firebase.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError("La connexion Google n'est pas activée dans votre console Firebase.");
      } else {
        setLoginError(error.message || "Erreur lors de la connexion avec Google");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleAddLink = async () => {
    if (!newLinkForm.title || !newLinkForm.url) {
      setNotification({ message: 'Le titre et l\'URL sont obligatoires.', type: 'error' });
      return;
    }
    
    console.log('Attempting to add link:', newLinkForm);
    const path = 'links';
    setIsLoading(true);
    try {
      await addDoc(collection(db, path), {
        ...newLinkForm,
        order_index: links.length
      });
      console.log('Link added successfully');
      setIsAdding(false);
      setNewLinkForm({ title: '', url: '', image_url: '' });
      setNotification({ message: 'Lien ajouté avec succès !', type: 'success' });
    } catch (error) {
      console.error('Error adding link:', error);
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpdateLink = async (id: string | number) => {
    if (!editForm.title || !editForm.url) {
      setNotification({ message: 'Le titre et l\'URL sont obligatoires.', type: 'error' });
      return;
    }
    console.log('Attempting to update link:', id, editForm);
    const path = `links/${id}`;
    setIsLoading(id);
    try {
      await updateDoc(doc(db, 'links', String(id)), editForm);
      console.log('Link updated successfully');
      setIsEditing(null);
      setNotification({ message: 'Lien mis à jour !', type: 'success' });
    } catch (error) {
      console.error('Error updating link:', error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteLink = async (id: string | number) => {
    console.log('Attempting to delete link:', id);
    const path = `links/${id}`;
    setIsLoading(id);
    try {
      await deleteDoc(doc(db, 'links', String(id)));
      console.log('Link deleted successfully');
      setDeleteConfirmation(null);
      setNotification({ message: 'Lien supprimé !', type: 'success' });
    } catch (error) {
      console.error('Error deleting link:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpdateSettings = async () => {
    console.log('Attempting to update settings:', settingsForm);
    const path = 'settings/config';
    setIsLoading('settings');
    try {
      await setDoc(doc(db, 'settings', 'config'), settingsForm, { merge: true });
      console.log('Settings updated successfully');
      setIsEditingSettings(false);
      setNotification({ message: 'Paramètres enregistrés !', type: 'success' });
    } catch (error) {
      console.error('Error updating settings:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsLoading(null);
    }
  };

  const moveLink = async (id: string | number, direction: 'up' | 'down') => {
    const index = links.findIndex(l => l.id === id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === links.length - 1) return;

    const newLinks = [...links];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];
    
    try {
      await Promise.all(newLinks.map((link, i) => 
        updateDoc(doc(db, 'links', String(link.id)), { order_index: i })
      ));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'links (reorder)');
    }
  };

  return (
    <div className="min-h-screen bg-[#e8eff9] text-[#1a3a6c] font-sans selection:bg-[#1a3a6c] selection:text-white">
        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg text-white font-medium flex items-center gap-3 ${
                notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            >
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {notification.message}
              <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Toggle */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {isAdmin && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider"
            >
              Mode Admin Actif
            </motion.div>
          )}
          <button 
            onClick={() => isAdmin ? handleLogout() : setIsLoginModalOpen(true)}
            className={`p-4 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 ${
              isAdmin ? 'bg-red-500 text-white' : 'bg-white text-[#1a3a6c]'
            }`}
          >
            {isAdmin ? <LogOut className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
          </button>
        </div>

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
              {settings.linkedin_url && (
                <a href={settings.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[#1a3a6c] hover:scale-110 transition-transform">
                  <Linkedin className="w-8 h-8" />
                </a>
              )}
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
                        <button 
                          onClick={() => handleUpdateLink(link.id)} 
                          disabled={isLoading === link.id}
                          className="p-2 text-[#1a3a6c] hover:text-[#0a2a5c] disabled:opacity-50"
                        >
                          {isLoading === link.id ? (
                            <div className="w-4 h-4 border-2 border-[#1a3a6c] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
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
                            onClick={() => setDeleteConfirmation(link.id)}
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
                      <button 
                        onClick={handleAddLink} 
                        disabled={isLoading === true}
                        className="px-6 py-2 bg-[#1a3a6c] text-white rounded-lg text-sm font-medium hover:bg-[#0a2a5c] transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isLoading === true && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Ajouter
                      </button>
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

                <div className="space-y-6">
                  {loginError && (
                    <div className="p-3 bg-red-50 text-red-500 text-xs rounded-lg border border-red-100">
                      {loginError}
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    Connectez-vous avec votre compte Google pour accéder à l'administration.
                  </p>
                  <button 
                    onClick={handleLogin}
                    className="w-full py-4 bg-[#1a3a6c] text-white rounded-xl font-bold hover:bg-[#0a2a5c] transition-all flex items-center justify-center gap-3"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Se connecter avec Google
                  </button>
                </div>
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
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Lien LinkedIn</label>
                    <input 
                      type="text" 
                      value={settingsForm.linkedin_url}
                      onChange={e => setSettingsForm({...settingsForm, linkedin_url: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f5f5f0] rounded-lg text-sm outline-none focus:ring-2 ring-[#1a3a6c]/20"
                      placeholder="https://www.linkedin.com/company/votrecompte"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleUpdateSettings}
                  disabled={isLoading === 'settings'}
                  className="w-full py-4 bg-[#1a3a6c] text-white rounded-xl font-bold hover:bg-[#0a2a5c] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading === 'settings' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Enregistrer les modifications
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmation && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteConfirmation(null)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6 text-center"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Supprimer ce lien ?</h2>
                  <p className="text-sm text-gray-500 mt-2">Cette action est irréversible.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={() => handleDeleteLink(deleteConfirmation)}
                    disabled={isLoading === deleteConfirmation}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading === deleteConfirmation && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Supprimer
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  );
}

export default App;
