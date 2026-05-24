import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Users, Eye, Sparkles, MessageSquare, History, Check, Save, 
  Trash2, Send, AlertTriangle, Play, ChevronRight, BarChart2, BookOpen, AlertCircle
} from 'lucide-react';
import { Document, Comment, VersionSnapshot, WritingAnalysis } from 'types';
import { motion, AnimatePresence } from 'framer-motion';

interface EditorViewProps {
  token: string;
  docId: string;
  userId: string;
  userName: string;
  onClose: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  token,
  docId,
  userId,
  userName,
  onClose
}) => {
  const [doc, setDoc] = useState<Document | null>(null);
  const [editorText, setEditorText] = useState('');
  const [title, setTitle] = useState('');
  
  // Real-time synchronization state
  const [activePeers, setActivePeers] = useState<{ id: string; name: string }[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);

  // Analysis & ColorGrade states
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedHighlightCode, setSelectedHighlightCode] = useState<'grammar' | 'style' | 'all' | 'none'>('all');

  // Interactive comments states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Revisions & Version History states
  const [activeSnapshots, setActiveSnapshots] = useState<VersionSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVersionText, setSelectedVersionText] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Fetch document payload on mount
  useEffect(() => {
    fetchDocument();
  }, [docId]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch document');

      setDoc(data.document);
      setEditorText(data.document.content);
      setTitle(data.document.title);
      setComments(data.document.comments || []);
      setActiveSnapshots(data.document.snapshots || []);

      // Run initial formatting analysis
      triggerLinguisticAnalysis(data.document.content);
    } catch (e) {
      console.error(e);
      setConnectionStatus('error');
    }
  };

  // ---------------------------------------------------------
  // WEBSOCKETS COLLABORATIVE BROADCAST handler
  // ---------------------------------------------------------
  useEffect(() => {
    if (!docId) return;

    setConnectionStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}/ws/${docId}?token=${token}`;

    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      console.log('WS Connection activated to server stream');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'user_joined':
            setActivePeers(msg.active_users.filter((u: any) => u.id !== userId));
            break;

          case 'user_left':
            setActivePeers(msg.active_users.filter((u: any) => u.id !== userId));
            break;

          case 'edit':
            // Receive editing updates in real-time from active editor peer
            setEditorText(msg.content);
            setSaveStatus('saved');
            break;

          case 'cursor_update':
            // Can be expanded to render multi-user selection indicators
            break;

          case 'comment_added':
            // Sync comments list
            setComments(prev => [...prev, msg.comment]);
            break;

          case 'error':
            setConnectionStatus('error');
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('WS stream message parse failed:', err);
      }
    };

    ws.onerror = (e) => {
      console.error('WS Error:', e);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [docId, token]);

  // Handle local edits and broadcast
  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorText(val);
    setSaveStatus('saving');

    // Broadcast change
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        content: val,
        cursor: e.target.selectionStart
      }));
    }

    // Auto save debouncing simulated locally
    debounceSave(val);
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceSave = (contentVal: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveDocumentContent(contentVal);
    }, 1500);
  };

  const saveDocumentContent = async (contentVal: string, manualTitle?: string) => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: contentVal,
          title: manualTitle || title,
          autoSave: true
        })
      });

      if (!res.ok) throw new Error();
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
    }
  };

  // Run detailed tone and grammar analysis via proxy endpoints
  const triggerLinguisticAnalysis = async (contentStr: string) => {
    if (!contentStr.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/assistant/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: contentStr })
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Manual trigger for version snapshot saves
  const triggerManualSnapshot = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}/snapshot`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSnapshots(prev => [data.snapshot, ...prev]);
        alert('Document snapshot saved successfully in version list!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Restores standard historic version texts
  const restoreVersionContent = (verText: string) => {
    setEditorText(verText);
    saveDocumentContent(verText);
    
    // Broadcast restore to peers
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'edit',
        content: verText
      }));
    }
    
    setSelectedVersionText(null);
    setShowHistory(false);
    triggerLinguisticAnalysis(verText);
  };

  // Range selections highlights to comment
  const handleTextSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const area = e.currentTarget;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = area.value.substring(start, end).trim();

    if (start !== end && selected.length > 0) {
      setSelectionRange({ start, end, text: selected });
      setShowCommentForm(true);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectionRange) return;

    try {
      const res = await fetch(`/api/documents/${docId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          range_start: selectionRange.start,
          range_end: selectionRange.end,
          text: newCommentText,
          selectedText: selectionRange.text
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      // Sync websocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'comment',
          comment: data.comment
        }));
      } else {
        // Fallback local update
        setComments(prev => [...prev, data.comment]);
      }

      setNewCommentText('');
      setShowCommentForm(false);
      setSelectionRange(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/comment/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (e) {
      console.line(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Upper Status Workspace Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        
        {/* Document details */}
        <div className="space-y-1">
          <button 
            onClick={onClose} 
            className="text-xs text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 font-mono uppercase tracking-widest cursor-pointer"
          >
            ← Back to Desk
          </button>
          
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                saveDocumentContent(editorText, e.target.value);
              }}
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-[#C5A059] focus:outline-none transition-all py-0.5"
            />
            
            {saveStatus === 'saving' ? (
              <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 font-mono px-2 py-0.5 rounded uppercase">Saving</span>
            ) : saveStatus === 'error' ? (
              <span className="text-[10px] bg-red-50 text-red-600 border border-red-100 font-mono px-2 py-0.5 rounded uppercase">Err Synching</span>
            ) : (
              <span className="text-[10px] bg-green-50 text-green-600 border border-green-150 font-mono px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <Check size={8} /> Synced
              </span>
            )}
          </div>
        </div>

        {/* Real-time multi user status block */}
        <div className="flex items-center gap-3">
          
          {/* Peer connection logs */}
          <div className="flex items-center -space-x-1.5 mr-2">
            <div className="w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] border border-white" title="You">
              {userName.substring(0, 1).toUpperCase()}
            </div>
            {activePeers.map(peer => (
              <div 
                key={peer.id} 
                className="w-6 h-6 rounded-full bg-[#C5A059] text-white flex items-center justify-center font-bold text-[10px] border border-white cursor-help"
                title={`${peer.name} (Active Collaborator)`}
              >
                {peer.name.substring(0, 1).toUpperCase()}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-stone-500 font-mono uppercase tracking-wider">
              {connectionStatus === 'connected' ? `${activePeers.length + 1} active users` : 'Network Offline'}
            </span>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 border border-stone-200 hover:border-stone-900 rounded-lg text-stone-600 cursor-pointer transition-colors"
            title="Toggle Version Snapshots"
          >
            <History size={16} />
          </button>

          <button
            onClick={triggerManualSnapshot}
            disabled={saving}
            className="py-2 px-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-mono tracking-widest uppercase rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={12} /> Save Revision
          </button>
        </div>
      </div>

      {/* Main Splitscreen Layout Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Real-time Editor Card */}
        <div className="xl:col-span-8 space-y-4">
          
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[500px] h-[600px] relative">
            
            {/* Toolbar */}
            <div className="bg-stone-50 border-b border-stone-150 p-2.5 px-4 flex justify-between items-center text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <FileText size={12} /> Collaborative Draft Space
              </span>

              {/* Highlight Toggles */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-stone-400 font-mono">Feedback Filters:</span>
                <select
                  value={selectedHighlightCode}
                  onChange={(e) => setSelectedHighlightCode(e.target.value as any)}
                  className="bg-transparent border border-stone-200 rounded p-1 text-[10px] font-mono focus:outline-none"
                >
                  <option value="all">ColorGrade™ Highlights (On)</option>
                  <option value="grammar">Grammar Only (Red)</option>
                  <option value="style">Style Suggestions (Blue)</option>
                  <option value="none">Clear Markup</option>
                </select>
              </div>
            </div>

            {/* Editable Text Area with Select Event */}
            <textarea
              value={editorText}
              onChange={handleEditorChange}
              onSelect={handleTextSelection}
              placeholder="Begin writing your research, assignments, essays or articles here. Highlighting a passage opens Comment attachments..."
              className="w-full flex-grow p-6 focus:outline-none resize-none font-sans text-sm text-stone-800 leading-relaxed bg-transparent"
            />

            {/* Word counters at the bottom shelf */}
            <div className="bg-stone-50 border-t border-stone-100 p-2.5 px-4 flex justify-between items-center text-[10px] font-mono tracking-wide text-stone-400 flex-shrink-0">
              <span>{editorText.split(/\s+/).filter(Boolean).length} Words</span>
              <button
                onClick={() => triggerLinguisticAnalysis(editorText)}
                disabled={analyzing}
                className="text-[#C5A059] hover:underline flex items-center gap-1 uppercase tracking-widest"
              >
                {analyzing ? 'Evaluating...' : 'Re-Run ColorGrade Diagnostics ⚡'}
              </button>
            </div>
          </div>
          
          {/* Version snapshot review viewer */}
          {showHistory && (
            <div className="bg-stone-900 text-white rounded-xl border border-stone-800 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <h3 className="font-serif text-lg text-white font-medium flex items-center gap-2">
                  <History size={16} className="text-[#C5A059]" /> Snapshot Revision Timeline
                </h3>
                <button onClick={() => setShowHistory(false)} className="text-stone-400 hover:text-white font-mono text-xs uppercase cursor-pointer">Close</button>
              </div>

              {activeSnapshots.length === 0 ? (
                <p className="text-xs text-stone-500 font-light italic text-center py-6">No snapshots saved for this document yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[220px] overflow-y-auto pr-2">
                  {activeSnapshots.map((snap) => (
                    <div 
                      key={snap.id} 
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${selectedVersionText === snap.content ? 'bg-stone-800 border-[#C5A059]' : 'bg-stone-950 border-stone-800 hover:border-stone-700'}`}
                      onClick={() => {
                        setSelectedVersionText(snap.content);
                      }}
                    >
                      <div className="flex justify-between font-mono text-[9px] text-[#C5A059] uppercase mb-1">
                        <span>v{snap.version}</span>
                        <span>{new Date(snap.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="font-serif font-bold text-stone-200 line-clamp-1 mb-1">Snapshot Revision</p>
                      <p className="text-[10px] text-stone-400 font-sans line-clamp-2">{snap.content}</p>
                      <div className="text-[9px] text-stone-500 text-right mt-1.5 italic font-mono">By {snap.author_name}</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedVersionText && (
                <div className="space-y-3 pt-3 border-t border-stone-800">
                  <h4 className="text-xs font-mono uppercase text-[#C5A059] tracking-widest font-bold">Snapshot Preview Content</h4>
                  <div className="p-4 bg-stone-950 border border-stone-850 rounded-lg text-xs leading-relaxed max-h-[140px] overflow-y-auto max-w-full text-stone-300">
                    {selectedVersionText}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedVersionText(null)}
                      className="py-1.5 px-3 bg-stone-800 hover:bg-stone-700 font-mono text-[10px] rounded uppercase text-white cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => restoreVersionContent(selectedVersionText)}
                      className="py-1.5 px-4 bg-[#C5A059] hover:bg-[#b05d44] hover:bg-opacity-80 font-mono text-[10px] rounded uppercase text-white cursor-pointer font-bold"
                    >
                      Revert Draft to This Snapshot
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline Selection comment prompt */}
          {showCommentForm && selectionRange && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-stone-200 rounded-xl p-4 shadow-md space-y-3"
            >
              <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A059] font-bold">Attach Comment to Highlights</span>
                <button onClick={() => { setShowCommentForm(false); setSelectionRange(null); }} className="text-xs text-stone-400 hover:text-stone-900 cursor-pointer">Cancel</button>
              </div>
              <p className="text-xs text-stone-500 italic bg-stone-50 p-2 rounded line-clamp-1 border-l-2 border-[#C5A059]">
                "{selectionRange.text}"
              </p>
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ask a question, propose edits, or leave feedback..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-grow p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#C5A059]"
                />
                <button
                  type="submit"
                  className="bg-stone-900 border border-transparent hover:bg-stone-800 text-white rounded-lg px-4 text-xs font-mono uppercase cursor-pointer"
                >
                  Pin Comment
                </button>
              </form>
            </motion.div>
          )}
        </div>

        {/* Right Side: Grammar Advisor Center & Comments Sidebar */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Live ColorGrade Diagnostic Insights */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Sparkles size={16} className="text-[#C5A059]" /> ColorGrade™ Advisor</span>
              <AnimatePresence>
                {analyzing && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-[#C5A059] animate-pulse uppercase tracking-wider font-mono font-bold"
                  >
                    Diagnosing...
                  </motion.span>
                )}
              </AnimatePresence>
            </h3>

            {analysis ? (
              <div className="space-y-6">
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-stone-50 rounded-lg text-center border border-stone-100">
                    <div className="text-xs text-stone-400 font-mono uppercase leading-none mb-1">Readability Index</div>
                    <div className="text-lg font-serif font-bold text-stone-800">{analysis.seo.readability_score || 0}</div>
                    <p className="text-[10px] text-stone-500 mt-1">{analysis.seo.readability_label}</p>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-lg text-center border border-stone-100">
                    <div className="text-xs text-stone-400 font-mono uppercase leading-none mb-1">Target Audience</div>
                    <div className="text-xs font-bold text-stone-800 line-clamp-1 mt-0.5">{analysis.audience.predicted_grade}</div>
                    <p className="text-[10px] text-stone-500 mt-1">{analysis.audience.suitability}</p>
                  </div>
                </div>

                {/* Lists Grammar & style issues - RED markup */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-stone-400 tracking-wider">Grammatical Anomalies (Red)</h4>
                  
                  {analysis.grammar_issues.length === 0 ? (
                    <div className="p-3 bg-green-50/50 border border-green-150 rounded-lg text-xs text-green-700 flex items-center gap-2">
                      <Check size={14} /> Clear of grammatical warnings. High readability.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                      {analysis.grammar_issues.slice(0, 10).map((issue, idx) => (
                        <div key={idx} className="p-3 bg-red-50/40 border border-red-100 rounded-lg text-xs space-y-1">
                          <p className="font-semibold text-red-700 flex items-center gap-1.5">
                            <AlertCircle size={10} className="shrink-0" /> {issue.shortMessage || 'Typo Match'}
                          </p>
                          <p className="text-stone-700 leading-normal">{issue.message}</p>
                          {issue.replacements.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center mt-1">
                              <span className="text-[10px] font-mono text-stone-400">Suggestions:</span>
                              {issue.replacements.slice(0, 3).map((rep, rIdx) => (
                                <button
                                  key={rIdx}
                                  onClick={() => {
                                    // Quick replace logic
                                    const updatedText = editorText.substring(0, issue.offset) + rep.value + editorText.substring(issue.offset + issue.length);
                                    setEditorText(updatedText);
                                    saveDocumentContent(updatedText);
                                    alert(`Replaced with: "${rep.value}". Click Diagonal Evaluator to refresh diagnostics!`);
                                  }}
                                  className="font-mono text-[10px] bg-white border border-red-200 text-red-700 px-1.5 py-0.5 rounded shadow-sm hover:bg-red-50 transition-colors"
                                >
                                  {rep.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aesthetic style tweaks - BLUE markup */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-stone-400 tracking-wider">Structural Consistency (Blue)</h4>
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                    {analysis.style_suggestions.map((style, idx) => (
                      <div key={idx} className="p-3 bg-blue-50/40 border border-blue-100 rounded-lg text-xs space-y-1">
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono uppercase inline-block mb-1 font-bold">
                          {style.type}
                        </span>
                        <p className="text-stone-700 line-clamp-2 italic leading-relaxed">
                          "{style.sentence}"
                        </p>
                        <p className="text-blue-800 leading-normal font-medium">
                          {style.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 border border-stone-100 rounded-lg space-y-2">
                <BookOpen size={24} className="text-stone-300 mx-auto animate-pulse" />
                <p className="text-xs text-stone-400 max-w-xs mx-auto">
                  Advisor compiles metrics and active warnings as you types content inputs.
                </p>
              </div>
            )}
          </div>

          {/* Connected comments attachment logs sidebar */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h3 className="font-serif text-lg font-medium text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-1.5">
              <MessageSquare size={16} className="text-[#C5A059]" /> Peer Comments ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <p className="text-xs text-stone-400 italic text-center py-4">No comments active in draft. Highlight text to attach.</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {comments.map(c => (
                  <div key={c.id} className="p-3 bg-stone-50 border border-stone-150 rounded-lg text-xs relative group-hover:bg-white transition-all space-y-1">
                    <div className="flex justify-between items-start font-mono text-[9px] uppercase text-stone-400 mb-1">
                      <span className="font-bold text-stone-700">{c.user_name}</span>
                      <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[10px] text-[#C5A059] italic line-clamp-1 border-l border-[#C5A059] pl-1.5 mb-1 bg-stone-150/30">
                      "{c.selectedText}"
                    </p>
                    <p className="text-stone-800 leading-relaxed font-sans">{c.text}</p>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-[9px] text-stone-400 hover:text-red-600 transition-colors uppercase font-mono cursor-pointer"
                        title="Delete comment thread"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
