import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, Cpu, Users, Layers, LogOut, ShieldCheck, Mail, Lock, 
  UserPlus, LogIn, ChevronRight, Menu, X, ArrowRight, AlertTriangle 
} from 'lucide-react';
import { User, Document, Team } from './types';
import { Dashboard } from './components/Dashboard';
import { ParaphraseView } from './components/ParaphraseView';
import { DetectView } from './components/DetectView';
import { EditorView } from './components/EditorView';
import { SidebarChat } from './components/SidebarChat';
import { WorkspaceView } from './components/WorkspaceView';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  // Authentication & Session state
  const [token, setToken] = useState<string | null>(localStorage.getItem('omniscribe_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loadingMe, setLoadingMe] = useState(false);
  
  // App navigation state
  const [activeTab, setActiveTab] = useState<'write' | 'paraphrase' | 'detect' | 'workspace'>('write');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  // Data lists
  const [documents, setDocuments] = useState<Document[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Auth Form Toggling
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Responsive UI
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load user info & databases on token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('omniscribe_token', token);
      fetchMe();
      fetchDirectories();
    } else {
      localStorage.removeItem('omniscribe_token');
      setUser(null);
      setDocuments([]);
      setTeams([]);
    }
  }, [token]);

  const fetchMe = async () => {
    setLoadingMe(true);
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
      } else {
        // Token expired/invalid
        setToken(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMe(false);
    }
  };

  const fetchDirectories = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [docsRes, teamsRes] = await Promise.all([
        fetch('/api/documents', { headers }),
        fetch('/api/teams', { headers })
      ]);

      const docsData = await docsRes.json();
      const teamsData = await teamsRes.json();

      if (docsRes.ok) setDocuments(docsData.documents);
      if (teamsRes.ok) setTeams(teamsData.teams);
    } catch (e) {
      console.error('Failed to sync workspace directories:', e);
    }
  };

  // ---------------------------------------------------------
  // AUTH PROCEDURES
  // ---------------------------------------------------------
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const url = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = authTab === 'login' 
      ? { email: authEmail, password: authPassword }
      : { email: authEmail, password: authPassword, name: authName };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication error occurred');
      }

      setToken(data.token);
      setUser(data.user);
      
      // Reset forms
      setAuthPassword('');
      setAuthError('');
    } catch (err: any) {
      setAuthError(err.message || 'Operation failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setSelectedDocId(null);
    setActiveTab('write');
  };

  // ---------------------------------------------------------
  // DOCUMENT CREATING AND DIRECTING
  // ---------------------------------------------------------
  const handleCreateDocument = async (title: string, teamId: string | null) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content: '', team_id: teamId })
      });
      const data = await res.json();
      if (res.ok) {
        setDocuments(prev => [data.document, ...prev]);
        setSelectedDocId(data.document.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sync state credits on paraphrasing deductions
  const handleUpdateCreditsLocal = (wordsCount: number) => {
    if (user) {
      setUser(prev => prev ? {
        ...prev,
        credits_used: Math.min(prev.total_credits, prev.credits_used + wordsCount)
      } : null);
    }
  };

  const handleSelectDocId = (id: string) => {
    setSelectedDocId(id);
    setActiveTab('write');
  };

  // Refreshed teams list callback
  const handleRefreshTeamsList = async () => {
    try {
      const res = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeDoc = documents.find(d => d.id === selectedDocId) || null;

  return (
    <div className="min-h-screen bg-[#F9F8F4] text-stone-900 flex flex-col font-sans antialiased select-none">
      
      {/* Upper Navigation Row with authentic brand details */}
      <header className="sticky top-0 z-45 bg-[#F9F8F4]/80 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-6 h-18 flex justify-between items-center">
          
          <div 
            onClick={() => { setSelectedDocId(null); setActiveTab('write'); }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-9 h-9 bg-stone-950 text-white rounded-xl flex items-center justify-center font-serif font-extrabold text-lg shadow-md border border-stone-850">
              O
            </div>
            <div>
              <span className="font-serif font-bold text-lg tracking-wider text-stone-900 uppercase">
                OmniScribe
              </span>
              <span className="text-[9px] text-stone-400 font-mono tracking-widest uppercase block relative -top-0.5">Linguistic Layer</span>
            </div>
          </div>

          {/* Connected Navbar */}
          {user && (
            <>
              {/* Desktop links */}
              <nav className="hidden md:flex items-center gap-7 text-xs font-mono font-bold tracking-widest uppercase text-stone-500">
                <button
                  onClick={() => { setSelectedDocId(null); setActiveTab('write'); }}
                  className={`hover:text-stone-900 transition-colors cursor-pointer ${activeTab === 'write' ? 'text-stone-950 border-b border-stone-950 pb-1 mt-1' : ''}`}
                >
                  Write Desk
                </button>
                <button
                  onClick={() => { setActiveTab('paraphrase'); }}
                  className={`hover:text-[#C5A059] transition-colors cursor-pointer ${activeTab === 'paraphrase' ? 'text-[#C5A059] border-b border-[#C5A059] pb-1 mt-1' : ''}`}
                >
                  Paraphrase
                </button>
                <button
                  onClick={() => { setActiveTab('detect'); }}
                  className={`hover:text-purple-600 transition-colors cursor-pointer ${activeTab === 'detect' ? 'text-purple-600 border-b border-purple-600 pb-1 mt-1' : ''}`}
                >
                  Forensic Suite
                </button>
                <button
                  onClick={() => { setActiveTab('workspace'); }}
                  className={`hover:text-blue-600 transition-colors cursor-pointer ${activeTab === 'workspace' ? 'text-blue-600 border-b border-blue-600 pb-1 mt-1' : ''}`}
                >
                  Team Desk
                </button>
              </nav>

              <div className="hidden md:flex items-center gap-4">
                {/* User Info card */}
                <div className="text-right flex flex-col justify-center">
                  <span className="text-xs font-semibold text-stone-800">{user.name}</span>
                  <span className="text-[10px] text-stone-400 font-mono">{(user.total_credits - user.credits_used).toLocaleString()} words remaining</span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl border border-stone-200 hover:border-red-400 hover:text-red-600 bg-white transition-all cursor-pointer text-stone-500 shadow-sm"
                  title="Logout Session"
                >
                  <LogOut size={14} />
                </button>
              </div>

              {/* Mobile trigger */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="md:hidden text-stone-850 p-1 bg-white border border-stone-200 rounded-lg cursor-pointer"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          )}

        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-stone-200 font-mono text-xs tracking-wider uppercase flex flex-col overflow-hidden"
          >
            <div className="p-6 space-y-4 flex flex-col">
              <button
                onClick={() => { setSelectedDocId(null); setActiveTab('write'); setMobileMenuOpen(false); }}
                className="pb-2.5 text-left border-b border-stone-100 text-stone-700 hover:text-stone-900"
              >
                Write Desk
              </button>
              <button
                onClick={() => { setActiveTab('paraphrase'); setMobileMenuOpen(false); }}
                className="pb-2.5 text-left border-b border-stone-100 text-stone-700 hover:text-stone-900"
              >
                Paraphrase Mode
              </button>
              <button
                onClick={() => { setActiveTab('detect'); setMobileMenuOpen(false); }}
                className="pb-2.5 text-left border-b border-stone-100 text-stone-700 hover:text-stone-900"
              >
                Forensic Suite
              </button>
              <button
                onClick={() => { setActiveTab('workspace'); setMobileMenuOpen(false); }}
                className="pb-2.5 text-left border-b border-stone-100 text-stone-700 hover:text-stone-900"
              >
                Team Workspace
              </button>
              
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <div className="font-bold text-stone-800 text-[11px] font-sans">{user.name}</div>
                  <div className="text-[10px] text-stone-400">{(user.total_credits - user.credits_used).toLocaleString()} Credits left</div>
                </div>
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="p-2 border border-red-100 text-red-600 rounded bg-red-50/50 flex items-center gap-1 font-bold text-[10px]"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {!token ? (
            
            // Unlogged Guest Splash view with symmetric Luxury layouts
            <motion.div
              key="auth-canvas"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center py-8 md:py-16"
            >
              
              {/* Product Slogans Column */}
              <div className="md:col-span-7 space-y-6">
                <div className="inline-block px-3 py-1 border border-stone-800/20 text-[#C5A059] text-[10px] tracking-[0.2em] font-mono uppercase font-bold rounded-full bg-[#C5A059]/10">
                  OmniScribe Suite • v4.3 Live
                </div>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl leading-[1.05] text-stone-950 font-medium tracking-tight">
                  Premium Paraphrasing & <br/>
                  <span className="italic font-normal text-stone-600">Linguistic Authenticity</span>
                </h1>
                
                <p className="text-stone-500 font-sans font-light max-w-lg leading-relaxed text-sm sm:text-base">
                  Co-write research essays beautifully. Leverage state-of-the-art sentence model decoders directly through Gemini, check structures for Plagiarism n-grams, and visualize AI likelihood vectors through heatmaps.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-200 max-w-lg">
                  <div>
                    <h4 className="font-serif text-lg font-bold text-stone-900">10 Editing Modes</h4>
                    <p className="text-xs text-stone-500 font-light mt-0.5">Formal, Academic, SEO adjustments, and Humanizing synthesizers.</p>
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-stone-900">ColorGrade™ Highlights</h4>
                    <p className="text-xs text-stone-500 font-light mt-0.5">Spans spelling mismatches, passive voices, and forensic overlaps.</p>
                  </div>
                </div>
              </div>

              {/* Symmetric Login / Register Card */}
              <div className="md:col-span-5 bg-white p-8 rounded-2xl shadow-2xl border border-stone-200 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/15 blur-[50px] rounded-full pointer-events-none -mr-16 -mt-16"></div>
                
                <div className="flex border-b border-stone-100 gap-1.5 font-mono text-[10px] tracking-widest uppercase">
                  <button
                    onClick={() => { setAuthTab('login'); setAuthError(''); }}
                    className={`pb-2.5 px-3 border-b-2 text-stone-600 transition-all cursor-pointer ${authTab === 'login' ? 'border-[#C5A059] text-stone-950 font-bold' : 'border-transparent text-stone-400 hover:text-stone-950'}`}
                  >
                    Authenticate
                  </button>
                  <button
                    onClick={() => { setAuthTab('register'); setAuthError(''); }}
                    className={`pb-2.5 px-3 border-b-2 text-stone-600 transition-all cursor-pointer ${authTab === 'register' ? 'border-[#C5A059] text-stone-950 font-bold' : 'border-transparent text-stone-400 hover:text-stone-950'}`}
                  >
                    Register Desk
                  </button>
                </div>

                {authError && (
                  <div className="text-red-600 text-[11px] p-2.5 bg-red-50 rounded border border-red-100 font-sans flex items-start gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authTab === 'register' && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Full Name</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Saeedullah Bacha"
                          className="w-full text-xs p-3 pl-10 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-[#C5A059] focus:bg-white text-stone-850 transition-all font-sans"
                        />
                        <Users size={12} className="text-stone-400 absolute left-3.5 top-3.5" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Academic Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="saeedullahbacha049@gmail.com"
                        className="w-full text-xs p-3 pl-10 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-[#C5A059] focus:bg-white text-stone-850 transition-all font-sans"
                      />
                      <Mail size={12} className="text-stone-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">Workspace Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs p-3 pl-10 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:border-[#C5A059] focus:bg-white text-[#1a1a1a] transition-all"
                      />
                      <Lock size={12} className="text-stone-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-850 text-white rounded-xl text-xs font-mono font-bold tracking-widest uppercase shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 border border-transparent"
                  >
                    {authTab === 'login' ? 'Unlock Account' : 'Acquire Membership'} <ChevronRight size={14} />
                  </button>

                  <div className="text-[10px] text-stone-400 text-center font-sans tracking-wide">
                    Default bypass login email: <span className="text-[#C5A059] font-semibold font-mono">saeedullahbacha049@gmail.com</span> / password: <span className="text-[#C5A059] font-semibold font-mono">password123</span>
                  </div>
                </form>

              </div>

            </motion.div>

          ) : (
            
            // Connected Dashboard & Tab panels view
            <motion.div
              key="connected-mainframe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              
              {/* Write/Editor layout is special if selecting a document */}
              {activeTab === 'write' && selectedDocId ? (
                
                // Active draft double splitting canvas with Side Chat panel
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Co-writer Canvas split */}
                  <div className="lg:col-span-8">
                    <EditorView
                      token={token}
                      docId={selectedDocId}
                      userId={user?.id || ''}
                      userName={user?.name || ''}
                      onClose={() => { setSelectedDocId(null); fetchDirectories(); }}
                    />
                  </div>

                  {/* Sidebar Chat split */}
                  <div className="lg:col-span-4 sticky top-24">
                    <SidebarChat
                      token={token}
                      documentText={activeDoc?.content || ''}
                    />
                  </div>

                </div>

              ) : (
                
                // Normal Dashboard tabs
                <div>
                  {activeTab === 'write' && user && (
                    <Dashboard
                      user={user}
                      documents={documents}
                      teams={teams}
                      onSelectDoc={handleSelectDocId}
                      onCreateDoc={handleCreateDocument}
                      onNavigateTab={setActiveTab}
                    />
                  )}

                  {activeTab === 'paraphrase' && (
                    <ParaphraseView
                      token={token}
                      onUpdateCredits={handleUpdateCreditsLocal}
                    />
                  )}

                  {activeTab === 'detect' && (
                    <DetectView token={token} />
                  )}

                  {activeTab === 'workspace' && user && (
                    <WorkspaceView
                      token={token}
                      teams={teams}
                      documents={documents}
                      userId={user.id}
                      onRefreshTeams={handleRefreshTeamsList}
                      onSelectDoc={handleSelectDocId}
                    />
                  )}
                </div>

              )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer copyright shelf */}
      <footer className="bg-stone-50 border-t border-stone-200/80 py-6 text-center text-[10px] font-mono uppercase tracking-widest text-stone-400 flex-shrink-0 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>OMNISCRIBE CORP © {new Date().getFullYear()} — All rights reserved.</span>
          <span className="text-[#C5A059] font-bold">Nature-Grade Linguistic Layer</span>
        </div>
      </footer>

    </div>
  );
};

export default App;
