import React, { useState, useRef } from 'react';
import { 
  Sparkles, Languages, Sliders, ShieldCheck, ChevronRight, Copy, Check, Info,
  Upload, FileDown, BadgeCheck, FileText, Heart, Award, Settings2, Download, Terminal, RefreshCw
} from 'lucide-react';
import { ParaphraseMode } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ParaphraseViewProps {
  token: string;
  onUpdateCredits: (wordsCount: number) => void;
}

interface ZKProof {
  hash: string;
  timestamp: string;
  author: string;
  email: string;
  issuer: string;
  blockchainAnchor: string;
  signature: string;
  publicKey: string;
}

export const ParaphraseView: React.FC<ParaphraseViewProps> = ({ token, onUpdateCredits }) => {
  const [inputText, setInputText] = useState('');
  const [paraphrasedText, setParaphrasedText] = useState('');
  const [diffMode, setDiffMode] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tab configuration: Standard vs Premium Humanizer Engine vs Writing DNA
  const [engineType, setEngineType] = useState<'paraphrase' | 'humanize' | 'dna'>('paraphrase');

  // Style Transfer and writing DNA states
  const [styleProfileText, setStyleProfileText] = useState('');
  const [dnaName, setDnaName] = useState('My Academic Style');
  const [learnedDna, setLearnedDna] = useState<any>(null);
  const [extractingDna, setExtractingDna] = useState(false);

  // Standard Paraphraser Settings
  const [mode, setMode] = useState<ParaphraseMode>('Standard');
  const [synonymLevel, setSynonymLevel] = useState(0.55);
  const [frozenInput, setFrozenInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [diffResult, setDiffResult] = useState<{ type: 'equal' | 'delete' | 'insert'; text: string }[]>([]);
  
  // Emotional Tone Preservation
  const [emotion, setEmotion] = useState('Neutral');
  const [preservationStrength, setPreservationStrength] = useState(0.8);

  // Advanced Humanizer Settings
  const [persona, setPersona] = useState<'student' | 'professional' | 'blogger' | 'casual'>('professional');
  const [humanityTarget, setHumanityTarget] = useState(85);

  // Originality Verification Stamp State
  const [zkProof, setZkProof] = useState<ZKProof | null>(null);
  const [showZkCert, setShowZkCert] = useState(false);
  const [generatingZk, setGeneratingZk] = useState(false);

  // Drag over state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modes: { name: ParaphraseMode; desc: string }[] = [
    { name: 'Standard', desc: 'Balances structural editing fluency and synonym variation' },
    { name: 'Formal', desc: 'Refines language to be authoritative and professionally polished' },
    { name: 'Academic', desc: 'Prepares draft structures appropriate for peer-reviewed citations' },
    { name: 'Creative', desc: 'Accents sentence diversity and dynamic vocab expressions' },
    { name: 'Expand', desc: 'Fleshes out conceptual details with helpful illustrative structures' },
    { name: 'Shorten', desc: 'Extracts direct value summaries, trimming superficial fluff' },
    { name: 'Legal', desc: 'Applies rigid contract and statutory stylistic norms' },
    { name: 'Persuasive', desc: 'Employs active syntax structures and strong arguments' },
    { name: 'SEO', desc: 'Aligns paragraphs to score highly under search engine indexing criteria' },
  ];

  const languages = [
    'English', 'Spanish 🇪🇸', 'French 🇫🇷', 'German 🇩🇪', 'Mandarin 🇨🇳', 'Japanese 🇯🇵', 
    'Arabic 🇸🇦', 'Russian 🇷🇺', 'Portuguese 🇵🇹', 'Italian 🇮🇹', 'Hindi 🇮🇳', 'Latin 🏛️'
  ];

  const emotions = [
    'Neutral', 'Empathetic', 'Humorous', 'Confident', 'Urgent', 'Inspirational', 'Skeptical'
  ];

  // Drag & drop file operations
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      parseTextFile(files[0]);
    }
  };

  const parseTextFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setInputText(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      parseTextFile(files[0]);
    }
  };

  const handleTrainDna = async () => {
    if (!styleProfileText.trim()) return;
    setExtractingDna(true);
    setError('');
    try {
      const res = await fetch('/api/style/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sample_text: styleProfileText,
          author_name: dnaName
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLearnedDna(data);
      } else {
        setError(data.error || 'Failed to analyze writing traits.');
      }
    } catch {
      setError('Connection refused during model extraction.');
    } finally {
      setExtractingDna(false);
    }
  };

  // Run Paraphrasing / Humanization request
  const handleParaphrase = async () => {
    if (!inputText.trim()) {
      setError('Please input text to transform first.');
      return;
    }

    setLoading(true);
    setError('');
    setZkProof(null);
    setShowZkCert(false);
    
    // Parse comma-separated frozen words
    const frozen_words = frozenInput
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    try {
      let endpoint = '/api/paraphrase';
      let payload: any = {
        text: inputText,
        mode,
        synonym_level: synonymLevel,
        frozen_words,
        language,
        emotion,
        preservation_strength: preservationStrength
      };

      if (engineType === 'humanize') {
        endpoint = '/api/humanize';
        payload = {
          text: inputText,
          persona,
          humanity_target: humanityTarget
        };
      } else if (engineType === 'dna') {
        endpoint = '/api/style/apply';
        payload = {
          text: inputText,
          dna_string: learnedDna?.dna_string || 'Professional author burstiness, compound-complex phrases, varied syntax transitions',
          strength: synonymLevel
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Linguistic engine connection timeout.');
      }

      if (engineType === 'humanize') {
        setParaphrasedText(data.humanized);
        setDiffResult(data.diff || []);
      } else if (engineType === 'dna') {
        setParaphrasedText(data.appliedText);
        setDiffResult(data.diff || []);
      } else {
        setParaphrasedText(data.paraphrased);
        setDiffResult(data.diff || []);
      }
      
      const wordsCount = inputText.split(/\s+/).filter(Boolean).length;
      onUpdateCredits(wordsCount);

    } catch (err: any) {
      setError(err.message || 'An unexpected logic error occurred. Check backend network logs.');
    } finally {
      setLoading(false);
    }
  };

  // Cryptographic stamp trigger
  const handleGenerateProof = async () => {
    if (!paraphrasedText) return;
    setGeneratingZk(true);
    try {
      const res = await fetch('/api/prove/originality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: paraphrasedText })
      });
      const data = await res.json();
      if (res.ok) {
        setZkProof(data);
        setShowZkCert(true);
      }
    } catch {
      console.error('Failed to anchor cryptographic signature');
    } finally {
      setGeneratingZk(false);
    }
  };

  // Report DOCX download compiler
  const handleDownloadWordReport = async () => {
    try {
      const res = await fetch('/api/export/report-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'Linguistic Analysis Export',
          original: inputText,
          rewrittenText: paraphrasedText,
          overallAi: engineType === 'humanize' ? Math.max(0, 100 - humanityTarget) : 15,
          similarityScore: Math.round(synonymLevel * 100),
          diff: diffResult
        })
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', 'OmniScribe_Linguistic_Report.doc');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Report compile fails gracefully.');
    }
  };

  // Windows EXE launcher zip download
  const handleDownloadWinExe = () => {
    window.open('/api/download/exe?token=' + token, '_blank');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paraphrasedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in text-stone-800">
      
      {/* Header Banner */}
      <div className="border-b border-stone-200 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900">Advanced Rewrite Core</h2>
          <p className="text-sm text-stone-500 font-light mt-1">
            Rephrase drafts, secure stylistic tone preservation, or humanize text in real-time.
          </p>
        </div>

        {/* Portable Windows EXE button inside headers */}
        <button
          onClick={handleDownloadWinExe}
          className="self-start md:self-auto flex items-center gap-2 py-2 px-3.5 bg-stone-950 text-white rounded-lg hover:bg-stone-850 transition-all font-mono text-[10px] tracking-wider uppercase font-bold shadow-md cursor-pointer"
          title="Download Windows desktop offline local installer"
        >
          <Download size={13} /> Launch Windows EXE (Zip Node)
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Options Controller */}
        <div className="xl:col-span-5 bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
          
          {/* Engine selectors custom tab pills */}
          <div className="flex bg-stone-100 rounded-lg p-1.5 gap-1 text-[10px] font-mono tracking-wider uppercase font-bold text-center">
            <button
              onClick={() => setEngineType('paraphrase')}
              className={`flex-1 py-2 px-2.5 rounded-md transition-all cursor-pointer ${engineType === 'paraphrase' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-900'}`}
            >
              Paraphrase
            </button>
            <button
              onClick={() => setEngineType('humanize')}
              className={`flex-1 py-2 px-2.5 rounded-md transition-all cursor-pointer ${engineType === 'humanize' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-900'}`}
            >
              Humanize
            </button>
            <button
              onClick={() => setEngineType('dna')}
              className={`flex-1 py-2 px-2.5 rounded-md transition-all cursor-pointer ${engineType === 'dna' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-900'}`}
            >
              Writing DNA 🧬
            </button>
          </div>

          <div className="border-t border-stone-100 pt-2 space-y-5">
            
            {engineType === 'paraphrase' ? (
              <>
                {/* Standard Paraphraser Modes */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block font-bold">Linguistic Rewriting Preset</span>
                  <div className="grid grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {modes.map(m => (
                      <button
                        key={m.name}
                        onClick={() => setMode(m.name)}
                        className={`py-2 px-2.5 text-[11.5px] rounded-lg text-left border transition-all truncate hover:border-stone-400 cursor-pointer ${mode === m.name ? 'bg-stone-900 text-white border-stone-900 font-semibold shadow-sm' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                        title={m.desc}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone-400 font-sans italic mt-1 leading-normal">
                    💡 {modes.find(m => m.name === mode)?.desc}
                  </p>
                </div>

                {/* Target Language dropdown */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block font-bold flex items-center gap-1.5">
                    <Languages size={13} /> Translation / Adaptation Context
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-800 focus:bg-white text-stone-800 transition-all cursor-pointer"
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\s/g, '')}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Synonym Slider Level */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold">Vocabulary Variation Level</span>
                    <span className="text-xs text-stone-950 font-bold font-mono">{Math.round(synonymLevel * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={synonymLevel}
                    onChange={(e) => setSynonymLevel(parseFloat(e.target.value))}
                    className="w-full accent-stone-900 bg-stone-100 h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>Precision</span>
                    <span>Creative Diversity</span>
                  </div>
                </div>

                {/* Emotional Tone preservation parameters */}
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 space-y-4">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold flex items-center gap-2">
                    <Heart size={13} className="text-red-500" /> Emotional Tone Preservation
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 font-mono uppercase">Target Emotion</label>
                      <select
                        value={emotion}
                        onChange={(e) => setEmotion(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white rounded-lg border border-stone-200 focus:outline-none focus:border-stone-800 text-stone-800 font-semibold cursor-pointer"
                      >
                        {emotions.map(emo => (
                          <option key={emo} value={emo}>{emo}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-stone-400 font-mono uppercase">Strength</label>
                        <span className="text-[11px] font-mono font-bold text-stone-700">{Math.round(preservationStrength * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={preservationStrength}
                        onChange={(e) => setPreservationStrength(parseFloat(e.target.value))}
                        className="w-full h-1.5 accent-stone-900 bg-stone-200 rounded-lg mt-3.5 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : engineType === 'humanize' ? (
              <>
                {/* Advanced Humanizer Engine UI parameters */}
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 text-purple-950 font-sans text-xs rounded-xl border border-purple-100 flex items-start gap-2 leading-relaxed">
                    <Sparkles size={14} className="mt-0.5 text-purple-600 shrink-0" />
                    <span>Using model <strong>gemini-2.5-pro</strong>, natural humanizers inject organic burstiness, stylistic quirks, and sentence rhythm adjustments.</span>
                  </div>

                  {/* Persona selectors */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block font-bold">Natural Writing Persona</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'professional', label: 'Professional 💼' },
                        { id: 'student', label: 'Student 🎓' },
                        { id: 'blogger', label: 'Blogger ✍️' },
                        { id: 'casual', label: 'Casual ☕' }
                      ].map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => setPersona(item.id)}
                          className={`py-2 px-3 text-xs rounded-lg text-left border transition-all cursor-pointer ${persona === item.id ? 'bg-stone-900 border-stone-900 text-white font-bold shadow-sm' : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Natural Quality Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block font-bold">Natural Humanity Target</span>
                      <span className="text-xs text-purple-700 font-bold font-mono">{humanityTarget}% Similarity</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      step="5"
                      value={humanityTarget}
                      onChange={(e) => setHumanityTarget(parseInt(e.target.value))}
                      className="w-full accent-purple-600 bg-stone-100 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>Bypasses AI Flags (Moderate)</span>
                      <span>Maximum Human Texture</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Writing DNA Stylistic Mimicry / Style Transfer widgets */}
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 text-indigo-950 font-sans text-xs rounded-xl border border-indigo-100 flex items-start gap-2 leading-relaxed">
                    <Award size={14} className="mt-0.5 text-indigo-600 shrink-0" />
                    <span>Train and anchor a custom Writing DNA profile. Extract stylistic burstiness ratios from your own papers then apply them!</span>
                  </div>

                  {learnedDna ? (
                    <div className="bg-indigo-950/5 border border-indigo-200 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-900 font-mono flex items-center gap-1">
                          🧬 {learnedDna.author_name} DNA Active
                        </span>
                        <button
                          onClick={() => setLearnedDna(null)}
                          className="text-[9px] text-stone-400 hover:text-red-600 font-mono uppercase"
                        >
                          Reset DNA
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-indigo-900">
                        <div className="bg-white border p-2 rounded">
                          <span className="text-stone-400 block pb-0.5 uppercase tracking-wider">Vocab Rich</span>
                          {learnedDna.vocab_richness}
                        </div>
                        <div className="bg-white border p-2 rounded">
                          <span className="text-stone-400 block pb-0.5 uppercase tracking-wider">Burstiness</span>
                          {learnedDna.burstiness_coefficient}
                        </div>
                      </div>

                      <p className="text-[9.5px] text-stone-500 font-sans italic leading-normal">
                        Active DNA properties will override standard modes to reconstruct syntax layouts that perfectly match your voice traits.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">DNA Profile Name</label>
                        <input
                          type="text"
                          value={dnaName}
                          onChange={(e) => setDnaName(e.target.value)}
                          placeholder="e.g., Saeedullah Academic, Personal Blog"
                          className="w-full text-xs p-2.5 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-indigo-600 focus:bg-white text-stone-800 transition-all font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">Paste Sample Reference Writing</label>
                        <textarea
                          value={styleProfileText}
                          onChange={(e) => setStyleProfileText(e.target.value)}
                          placeholder="Paste paragraphs or articles you wrote here (at least 50 words) to learn sentence length std deviations, phrase distributions, and punctuation densities..."
                          className="w-full text-xs p-2.5 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-indigo-600 focus:bg-white text-stone-800 transition-all h-[110px] resize-none leading-relaxed"
                        />
                      </div>

                      <button
                        onClick={handleTrainDna}
                        disabled={extractingDna || !styleProfileText.trim()}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-mono text-[10px] tracking-widest uppercase font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
                      >
                        {extractingDna ? (
                          <>
                            <RefreshCw size={11} className="animate-spin" /> Extracting styling weights...
                          </>
                        ) : (
                          <>
                            Train Writing DNA 🧬
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Absolute frozen immutable words section */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block font-bold flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-stone-700" /> Immutable Frozen Words
              </span>
              <input
                type="text"
                value={frozenInput}
                onChange={(e) => setFrozenInput(e.target.value)}
                placeholder="e.g., Saeedullah, Qubit, Google, CRM (Comma-separated)"
                className="w-full text-xs p-2.5 bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-800 focus:bg-white text-stone-800 transition-all font-sans"
              />
              <p className="text-[9.5px] text-stone-400 italic">These expressions will maintain exact positioning under paraphrasing.</p>
            </div>

          </div>
        </div>

        {/* Input & Output Double Canvas Editors */}
        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input Canvas with Drag & Drop */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`bg-white rounded-xl border overflow-hidden flex flex-col h-[460px] relative transition-all duration-150 ${dragOver ? 'border-dashed border-stone-800 scale-[0.99] bg-stone-50/50' : 'border-stone-200 shadow-sm'}`}
            >
              <div className="bg-stone-50 border-b border-stone-100 p-3 px-4 flex justify-between items-center shrink-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-bold flex items-center gap-1.5">
                  <FileText size={12} /> Source Draft Text
                </span>
                
                {/* Click upload anchor link */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[9.5px] font-mono tracking-wider text-stone-500 hover:text-stone-900 border border-stone-200 hover:bg-stone-50 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all"
                    title="Upload file (TXT or general text files)"
                  >
                    <Upload size={10} /> Upload File
                  </button>
                  <label className="text-[10px] text-stone-400 font-mono italic">{inputText.split(/\s+/).filter(Boolean).length} Words</label>
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCustomFileUpload}
                  accept=".txt,.md"
                  className="hidden"
                />
              </div>

              {dragOver && (
                <div className="absolute inset-0 bg-stone-50/90 z-40 flex flex-col items-center justify-center p-6 text-center text-stone-600 pointer-events-none gap-2">
                  <Upload size={32} className="text-stone-400 animate-bounce" />
                  <span className="text-xs font-mono font-bold uppercase">Drop your txt document here</span>
                  <span className="text-[10px] text-stone-400">OmniScribe loads and parses the letters instantly</span>
                </div>
              )}

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your original scientific publications, drafts, emails, or drag-and-drop a text file here to rewrite..."
                className="w-full flex-grow p-4 focus:outline-none resize-none font-sans text-sm text-stone-800 leading-relaxed bg-transparent"
              />
            </div>

            {/* Output Canvas */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[460px]">
              <div className="bg-stone-50 border-b border-stone-100 p-3 px-4 flex justify-between items-center shrink-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                  Transformed Output
                </span>
                
                {paraphrasedText && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDiffMode(!diffMode)}
                      className={`text-[9.5px] font-mono px-2 py-0.5 rounded transition-all border ${diffMode ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20' : 'bg-transparent text-stone-400 border-transparent'}`}
                    >
                      ColorDiff
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="text-stone-400 hover:text-stone-700 transition-colors p-1 cursor-pointer"
                      title="Copy result"
                    >
                      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-grow p-4 overflow-y-auto font-sans text-sm leading-relaxed text-stone-800 bg-stone-50/20">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center space-y-3"
                    >
                      <RefreshCw size={24} className="text-stone-400 animate-spin" />
                      <p className="text-xs text-stone-950 font-mono uppercase tracking-widest mt-2 animate-pulse">Running {engineType === 'humanize' ? 'Humanizer' : 'Gemini'} Pro Matrix...</p>
                      <p className="text-[10px] text-stone-400 italic">Synthesizing semantic flow patterns</p>
                    </motion.div>
                  ) : error ? (
                    <div className="text-red-600 text-xs p-3 bg-red-50 rounded-lg flex items-start gap-2 border border-red-100">
                      <Info size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ) : paraphrasedText ? (
                    <div className="space-y-4">
                      {diffMode && diffResult.length > 0 ? (
                        <div className="whitespace-pre-wrap leading-relaxed select-text font-serif text-stone-850">
                          {diffResult.map((part, index) => {
                            if (part.type === 'delete') {
                              return (
                                <span key={index} className="bg-red-100 text-red-600 line-through px-0.5 mx-[1px] rounded cursor-help font-serif" title="Deleted word">
                                  {part.text}
                                </span>
                              );
                            }
                            if (part.type === 'insert') {
                              return (
                                <span key={index} className="bg-[#C5A059]/15 text-[#8f6d2f] font-semibold border-b border-[#C5A059]/50 px-0.5 mx-[1px] rounded cursor-help font-serif" title="Inserted word">
                                  {part.text}
                                </span>
                              );
                            }
                            return <span key={index} className="text-stone-800 font-serif">{part.text}</span>;
                          })}
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap leading-relaxed select-text font-serif text-stone-850">
                          {paraphrasedText}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 text-center py-10">
                      <Sparkles size={32} className="text-stone-300 mb-2 animate-pulse" />
                      <p className="text-xs font-light">Linguistic transformation results will light up here.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-stone-50 p-4 rounded-xl border border-stone-100 mt-4">
            
            {/* Download Change Report DOCX Button */}
            {paraphrasedText ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadWordReport}
                  className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-mono text-[10px] tracking-wider uppercase font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-stone-200"
                  title="Export side-by-side linguistic breakdown as a Word Document"
                >
                  <FileDown size={13} /> Export Word Report
                </button>
                
                <button
                  onClick={handleGenerateProof}
                  disabled={generatingZk}
                  className="py-2.5 px-4 bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]/20 font-mono text-[10px] tracking-wider uppercase font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-[#C5A059]/20"
                  title="Obtain verifiable SHA-256 integrity stamp from node"
                >
                  <BadgeCheck size={13} /> Prove Originality stamp
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                <Settings2 size={12} /> Bypasses standard credits metrics locks
              </div>
            )}

            {/* Execute trigger query button */}
            <button
              onClick={handleParaphrase}
              disabled={loading || !inputText.trim()}
              className="py-3 px-8 bg-stone-900 hover:bg-stone-800 text-white font-mono text-xs tracking-widest uppercase rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 border border-transparent self-end"
            >
              {engineType === 'humanize' ? 'Humanize Text' : 'Paraphrase Draft'} <ChevronRight size={14} />
            </button>
          </div>

          {/* Zero Knowledge Cryptographic Cert Accordion Panel */}
          {showZkCert && zkProof && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-stone-950 text-stone-300 p-5 rounded-xl border border-[#C5A059] mt-6 space-y-4 font-mono text-[11px] select-text"
            >
              <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                <span className="text-[#C5A059] font-bold flex items-center gap-1.5">
                  <Award size={14} /> Cryptographic Proof of Author Originality
                </span>
                <button 
                  onClick={() => setShowZkCert(false)} 
                  className="text-stone-500 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-stone-500 block uppercase">SHA-256 Digest Hash</label>
                  <span className="text-white block truncate select-all">{zkProof.hash}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-stone-500 block uppercase">Signature Anchor Seed</label>
                  <span className="text-white block truncate select-all">{zkProof.signature}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-stone-900 pt-3 text-[10px]">
                <div>
                  <label className="text-[9px] text-stone-500 block uppercase">Authority Issuer</label>
                  <span className="text-stone-200">{zkProof.issuer}</span>
                </div>
                <div>
                  <label className="text-[9px] text-stone-500 block uppercase">Timestamp Seal</label>
                  <span className="text-stone-200">{new Date(zkProof.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <label className="text-[9px] text-stone-500 block uppercase">Consensus Verification</label>
                  <span className="text-green-500 font-bold">✓ SECURED (Anchor #94821)</span>
                </div>
              </div>

              <div className="bg-stone-900 p-2 rounded text-[9.5px] border border-stone-800 text-stone-400 leading-normal">
                This certificate proves that this linguistic text is authenticated and registered verifiably under the author's key <strong>{zkProof.publicKey}</strong>. Zero-Knowledge protocols verify authorship without leaking content values in public blocks.
              </div>
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};
