import React, { useState } from 'react';
import { Users, Plus, ShieldAlert, Mail, UserMinus, FileText, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Team, Document } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceViewProps {
  token: string;
  teams: Team[];
  documents: Document[];
  userId: string;
  onRefreshTeams: () => void;
  onSelectDoc: (id: string) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  token,
  teams,
  documents,
  userId,
  onRefreshTeams,
  onSelectDoc
}) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams[0]?.id || null);
  const [inviteEmail, setInviteEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0] || null;
  const isOwner = activeTeam?.owner_id === userId;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTeamName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to establish research team');

      setNewTeamName('');
      onRefreshTeams();
      setSelectedTeamId(data.team.id);
      setSuccess(`Team ${data.team.name} established successfully.`);
      setTimeout(() => setSuccess(''), 4000);

    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeTeam) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/teams/${activeTeam.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invitation mapping failed');

      setInviteEmail('');
      onRefreshTeams();
      setSuccess(`User invited successfully to ${activeTeam.name}!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeTeam) return;
    if (!confirm('Are you sure you want to dismiss this member from the team?')) return;

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/teams/${activeTeam.id}/member/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss member');

      onRefreshTeams();
      setSuccess('Member dismissed from active workspace.');
      setTimeout(() => setSuccess(''), 3050);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Get documents shared within this team
  const teamDocs = documents.filter(doc => doc.team_id === activeTeam?.id);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-stone-200 pb-4">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900">Collaborative Workspaces</h2>
        <p className="text-sm text-stone-500 font-light mt-1">
          Unify peers, invite scholars, and partition shared research manuscripts using real-time synchronized directories.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left teams bar selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-5">
            <h3 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-100 pb-2.5 flex items-center gap-1.5">
              <Users size={16} className="text-[#C5A059]" /> Active Workspaces
            </h3>

            {/* List */}
            {teams.length === 0 ? (
              <p className="text-xs text-stone-400 font-light italic text-center py-4">No joint workspaces established. Start one below!</p>
            ) : (
              <div className="space-y-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { setSelectedTeamId(team.id); setError(''); setSuccess(''); }}
                    className={`w-full p-3.5 rounded-lg text-left text-xs transition-all border flex items-center justify-between ${selectedTeamId === team.id || (!selectedTeamId && activeTeam?.id === team.id) ? 'bg-stone-900 border-stone-900 text-white shadow-sm' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'}`}
                  >
                    <span className="font-semibold block truncate pr-2">{team.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono tracking-wide flex-shrink-0 ${selectedTeamId === team.id ? 'bg-[#C5A059] text-white' : 'bg-stone-200 text-stone-600'}`}>
                      {team.members.length} peers
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Build Team form info */}
            <form onSubmit={handleCreateTeam} className="pt-4 border-t border-stone-100 space-y-3">
              <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block">Form New Workspace</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g., Quantum Physics Dept"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="flex-grow text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#C5A059] p-3 transition-all text-stone-850"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="p-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-all cursor-pointer flex-shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Active Team Workspace details */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeTeam ? (
              <motion.div
                key={activeTeam.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Upper banner info */}
                <div className="bg-stone-900 text-white p-6 rounded-xl border border-stone-800 space-y-2 relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#C5A059]/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20"></div>
                  <h3 className="font-serif text-2xl font-bold tracking-normal text-white">{activeTeam.name}</h3>
                  <p className="text-xs text-stone-400 font-mono uppercase tracking-widest leading-none">
                    Admin Workspace ID: <span className="text-[#C5A059]">{activeTeam.id}</span>
                  </p>
                </div>

                {/* Status prompts notification alerts */}
                {success && (
                  <div className="p-3.5 bg-green-50 text-green-700 border border-green-250 rounded-lg text-xs font-sans flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
                {error && (
                  <div className="p-3.5 bg-red-50 text-red-700 border border-red-250 rounded-lg text-xs font-sans flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Admin Member Administration Dashboard Panel */}
                  <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm space-y-4">
                    <h3 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-100 pb-2.5 flex items-center justify-between">
                      <span>Peer Board</span>
                      <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-500 px-2 py-0.5 rounded">
                        {isOwner ? 'Owner rights active' : 'Read Member view'}
                      </span>
                    </h3>

                    {/* Renders member list */}
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {activeTeam.members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-100 text-xs">
                          <div className="space-y-0.5 max-w-[70%]">
                            <span className="font-semibold text-stone-850 block truncate">{member.name}</span>
                            <span className="text-[10px] text-stone-500 font-sans block truncate">{member.email}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase shrink-0 ${member.role === 'owner' ? 'bg-[#C5A059]/10 text-[#C5A059] font-bold border border-[#C5A059]/20' : 'bg-stone-200 text-stone-600'}`}>
                              {member.role}
                            </span>
                            
                            {/* Dismiss user options */}
                            {isOwner && member.id !== userId && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                title="Dismiss Member"
                              >
                                <UserMinus size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Invite Member form - only for owners */}
                    {isOwner && (
                      <form onSubmit={handleInvite} className="pt-3 border-t border-stone-100 space-y-3">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-stone-500 block flex items-center gap-1">
                          <Mail size={10} /> Invite Registered Peer
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            required
                            placeholder="collaborator@omniscribe.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="flex-grow text-xs p-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#C5A059]"
                          />
                          <button
                            type="submit"
                            disabled={loading}
                            className="py-2 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-mono uppercase cursor-pointer flex items-center justify-center font-bold"
                          >
                            Invite
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Team manuscript storage shared documents list */}
                  <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm space-y-4">
                    <h3 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-100 pb-2.5 flex items-center justify-between">
                      <span>Shared Manuscripts</span>
                      <span className="text-[10px] font-mono uppercase bg-stone-150 text-stone-500 px-2 rounded font-bold">
                        {teamDocs.length} Drafts
                      </span>
                    </h3>

                    {teamDocs.length === 0 ? (
                      <div className="text-center py-10 border border-stone-100 rounded-lg space-y-2">
                        <FileText size={24} className="text-stone-300 mx-auto" />
                        <p className="text-xs text-stone-400 font-light">No documents added to this team desk yet. Establish some on the main desk!</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {teamDocs.map(doc => {
                          const words = doc.content.split(/\s+/).filter(Boolean).length;
                          return (
                            <div
                              key={doc.id}
                              onClick={() => onSelectDoc(doc.id)}
                              className="p-3 rounded-lg border border-stone-150 bg-stone-50/40 hover:bg-white hover:border-[#C5A059]/40 transition-all cursor-pointer text-xs space-y-1 group"
                            >
                              <div className="font-semibold text-stone-850 group-hover:text-[#C5A059] transition-colors truncate">
                                {doc.title}
                              </div>
                              <p className="text-[10px] text-stone-500 font-sans line-clamp-1">{doc.content || 'Blank draft content'}</p>
                              <div className="text-[9px] text-stone-400 text-right mt-1 font-mono">
                                {words} words • Version {doc.version}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            ) : (
              <div className="text-center py-24 border border-dashed border-stone-200 rounded-xl space-y-3">
                <Users size={48} className="text-stone-300 mx-auto animate-pulse" />
                <h3 className="font-serif text-lg font-medium text-stone-700">Ready to Collaborate?</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto font-sans leading-relaxed">
                  Join forces with colleague reviewers. Create a workspace division on the left, then invite registered members to begin co-writing.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
