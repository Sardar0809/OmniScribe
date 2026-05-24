import React, { useState } from 'react';
import { FileText, Users, Cpu, ShieldAlert, Sparkles, Plus, Search, Calendar, Landmark, ArrowRight } from 'lucide-react';
import { Document, Team, User } from '@/types';
import { motion } from 'framer-motion';

interface DashboardProps {
  user: User;
  documents: Document[];
  teams: Team[];
  onSelectDoc: (id: string) => void;
  onCreateDoc: (title: string, teamId: string | null) => void;
  onNavigateTab: (tab: 'write' | 'paraphrase' | 'detect' | 'workspace') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  documents,
  teams,
  onSelectDoc,
  onCreateDoc,
  onNavigateTab
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('private');
  const [searchQuery, setSearchQuery] = useState('');

  const creditsPercent = Math.min(100, (user.credits_used / user.total_credits) * 100);

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateDoc(newTitle, selectedTeam === 'private' ? null : selectedTeam);
    setNewTitle('');
  };

  return (
    <div className="space-y-10">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-8 md:p-10 rounded-2xl shadow-xl border border-stone-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20"></div>
        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#C5A059]/10 border border-[#C5A059]/30 rounded-full text-[#C5A059] text-xs font-mono font-bold tracking-widest uppercase">
            <Sparkles size={12} /> Live Workspace
          </div>
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight">
            Greetings, <span className="italic font-normal text-stone-300">{user.name}</span>
          </h1>
          <p className="text-stone-400 font-sans font-light max-w-lg leading-relaxed text-sm md:text-base">
            Draft scientific paper reviews, perform bulletproof paraphrasing checks, and scan for artificial content on the premier linguistic optimization layer.
          </p>
        </div>

        {/* Quick Stats Summary circle */}
        <div className="flex items-center gap-6 bg-stone-800/50 backdrop-blur-md p-6 rounded-xl border border-stone-700/50 max-w-sm relative z-10">
          <div className="relative w-20 h-20 flex-shrink-0">
            {/* Svg Circle Progress */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="40" cy="40" r="34" stroke="#2a2a2a" strokeWidth="6" fill="transparent" />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="#C5A059"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - creditsPercent / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono font-bold">{Math.round(creditsPercent)}%</span>
              <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Used</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-stone-400 font-mono tracking-wider uppercase block">Linguistic Balance</span>
            <div className="text-lg font-serif tracking-wide text-white font-medium">
              {(user.total_credits - user.credits_used).toLocaleString()} <span className="text-xs text-stone-400 font-sans font-normal">Words Left</span>
            </div>
            <p className="text-[10px] text-stone-500 font-sans">Quota refreshes automatically at months end.</p>
          </div>
        </div>
      </div>

      {/* Grid of Modules */}
      <h2 className="font-serif text-2xl tracking-tight text-stone-900 border-b border-stone-200 pb-3">Quick Engines Layout</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          onClick={() => onNavigateTab('paraphrase')}
          className="group cursor-pointer bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:border-[#C5A059]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-44"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-stone-50 rounded-lg text-stone-900 group-hover:bg-[#C5A059]/10 group-hover:text-[#C5A059] transition-colors">
              <Sparkles size={20} />
            </div>
            <ArrowRight size={16} className="text-stone-300 group-hover:text-[#C5A059] transform group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-900 group-hover:text-[#C5A059] transition-colors">Advanced Paraphraser</h3>
            <p className="text-xs text-stone-500 font-light mt-1">Spin, expand, or humanize essays in 10 custom fine-tuned modular modes.</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('detect')}
          className="group cursor-pointer bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:border-[#C5A059]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-44"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-stone-50 rounded-lg text-stone-900 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
              <Cpu size={20} />
            </div>
            <ArrowRight size={16} className="text-stone-300 group-hover:text-purple-600 transform group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-900 group-hover:text-purple-600 transition-colors">AI Likelihood Scan</h3>
            <p className="text-xs text-stone-500 font-light mt-1">Line-by-line smart grading heatmap assessing synthetic content percentage.</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('detect')}
          className="group cursor-pointer bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:border-[#C5A059]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-44"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-stone-50 rounded-lg text-stone-900 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
              <ShieldAlert size={20} />
            </div>
            <ArrowRight size={16} className="text-stone-300 group-hover:text-orange-600 transform group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">Plagiarism Fingerprint</h3>
            <p className="text-xs text-stone-500 font-light mt-1">Verify text patterns against index sources using cosine overlap methods.</p>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('workspace')}
          className="group cursor-pointer bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:border-[#C5A059]/50 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-44"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-stone-50 rounded-lg text-stone-900 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
              <Users size={20} />
            </div>
            <ArrowRight size={16} className="text-stone-300 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-all" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-stone-900 group-hover:text-blue-600 transition-colors">Team Workspaces</h3>
            <p className="text-xs text-stone-500 font-light mt-1">Manage collaborate peers, see metrics, and shared workspaces.</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Create Paper + Recent Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Document Form */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm self-start space-y-6">
          <h3 className="font-serif text-xl font-medium text-stone-900">Initiate Writing Project</h3>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">Document Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Quantum Computing Synthesizer Thesis"
                className="w-full text-sm p-3 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-[#C5A059] focus:bg-white transition-all font-sans text-stone-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-500 block">Workspace Scope</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full text-sm p-3 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-[#C5A059] focus:bg-white transition-all text-stone-800"
              >
                <option value="private">Private (Only You)</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>Shared Team: {team.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:bg-stone-990 text-white text-xs font-bold tracking-widest uppercase rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer border border-transparent"
            >
              <Plus size={14} /> Spark Document
            </button>
          </form>
        </div>

        {/* Recent Documents Board */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-serif text-xl font-medium text-stone-900">Your Document Ledger</h3>
            
            {/* Search inputs */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 focus:border-[#C5A059] focus:bg-white focus:outline-none rounded-lg text-stone-700 w-full sm:w-60 transition-all font-sans"
              />
              <Search size={14} className="text-stone-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {filteredDocs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
                <FileText size={40} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500 font-light">No documents match the active query.</p>
              </div>
            ) : (
              filteredDocs.map((doc, index) => {
                const docTeam = doc.team_id ? teams.find(t => t.id === doc.team_id) : null;
                const wordCount = doc.content.split(/\s+/).filter(Boolean).length;
                
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl border border-stone-200/80 hover:border-[#C5A059]/40 bg-stone-50/50 hover:bg-white hover:shadow-sm transition-all duration-200 flex items-center justify-between group cursor-pointer"
                    onClick={() => onSelectDoc(doc.id)}
                  >
                    <div className="space-y-1.5 max-w-[70%]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif text-base font-semibold text-stone-900 group-hover:text-[#C5A059] transition-colors truncate">
                          {doc.title}
                        </span>
                        {docTeam ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                            <Users size={8} /> {docTeam.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-500 px-2 py-0.5 rounded border border-stone-200">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-light line-clamp-1">
                        {doc.content || <span className="italic text-stone-400">Empty draft content</span>}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono uppercase">
                        <Calendar size={10} />
                        {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      <span className="text-[11px] text-stone-500 font-sans tracking-wide">
                        {wordCount} words • v{doc.version}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
