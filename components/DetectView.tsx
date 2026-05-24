import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, Cpu, Layers, Sparkles, AlertCircle, ExternalLink, RefreshCw, 
  BarChart2, Gauge, AlertTriangle, Lightbulb, Check, ChevronRight, Globe, Info, HelpCircle
} from 'lucide-react';
import { AIDetectionResponse, PlagiarismDetectionResponse } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface DetectViewProps {
  token: string;
}

interface PredictiveResult {
  sentence: string;
  originalityScore: number; // Human percentage
  aiLikelihood: number;
  grade: string;
  alternatives: string[];
}

interface AdversarialResult {
  score: number;
  anomalyRatio: number; // 0 to 100
  repeatingClichés: { word: string; count: number; desc: string }[];
  structuralFlatness: number; // Standard deviation of sentence word sizes
  syntheticDepth: 'Low' | 'Moderate' | 'Aggressive (Cascaded ChatGPT+QuillBot)';
}

export const DetectView: React.FC<DetectViewProps> = ({ token }) => {
  const [activeSubTab, setActiveSubTab] = useState<'ai' | 'predictive' | 'plagiarism' | 'hybrid'>('ai');
  const [inputText, setInputText] = useState('');
  
  // Plagiarism Toggle live check
  const [checkLiveWeb, setCheckLiveWeb] = useState(false);

  // For hybrid analysis comparing original vs edited spun content
  const [hybridTextCompare, setHybridTextCompare] = useState('');

  // Results state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [aiResult, setAiResult] = useState<AIDetectionResponse | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismDetectionResponse | null>(null);
  const [hybridResult, setHybridResult] = useState<{ score: number; is_spun: boolean; n_grams_overlap: number } | null>(null);

  // Real-time Predictive Gauger States
  const [predictiveQuery, setPredictiveQuery] = useState('');
  const [predictActive, setPredictActive] = useState(false);
  const [predictiveData, setPredictiveData] = useState<PredictiveResult | null>(null);
  const [suggestedReplacementIndex, setSuggestedReplacementIndex] = useState<number | null>(null);

  // Adversarial AI Data
  const [adversarialData, setAdversarialData] = useState<AdversarialResult | null>(null);
  const [showAdversarialReport, setShowAdversarialReport] = useState(false);
  const [loadingAdversarial, setLoadingAdversarial] = useState(false);

  // Debounce helper for Predictive Gauger
  useEffect(() => {
    if (!predictiveQuery.trim() || predictiveQuery.trim().length < 8) {
      setPredictiveData(null);
      return;
    }

    setPredictActive(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch('/api/predict/originality', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: predictiveQuery })
        });
        const data = await res.json();
        if (res.ok) {
          setPredictiveData({
            sentence: predictiveQuery,
            originalityScore: data.originalityScore,
            aiLikelihood: data.aiLikelihood,
            grade: data.grade,
            alternatives: data.alternatives || []
          });
        }
      } catch (err) {
        console.error('Predictive gauger timeout:', err);
      } finally {
        setPredictActive(false);
      }
    }, 900); // 900ms debouncing duration

    return () => clearTimeout(delayDebounce);
  }, [predictiveQuery, token]);

  const handleScan = async () => {
    if (!inputText.trim()) {
      setError('Please input text and draft notes first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (activeSubTab === 'ai') {
        const res = await fetch('/api/detect/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: inputText })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'AI Scan failed');
        setAiResult(data);
      } else if (activeSubTab === 'plagiarism') {
        const res = await fetch('/api/detect/semantic-plagiarism', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: inputText, checkLiveWeb })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Plagiarism Scan failed');
        setPlagiarismResult(data);
      } else if (activeSubTab === 'hybrid') {
        const res = await fetch('/api/detect/hybrid', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ textA: inputText, textB: hybridTextCompare })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Hybrid evaluation failed');
        setHybridResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Verification engine encountered a timeout. Retry soon.');
    } finally {
      setLoading(false);
    }
  };

  // Run Adversarial AI Detection Scan
  const handleAdversarialScan = async () => {
    if (!inputText.trim()) return;
    setLoadingAdversarial(true);
    try {
      const res = await fetch('/api/detect/adversarial-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: inputText })
      });
      const data = await res.json();
      if (res.ok) {
        setAdversarialData(data);
        setShowAdversarialReport(true);
      }
    } catch {
      console.error('Adversarial detector failed');
    } finally {
      setLoadingAdversarial(false);
    }
  };

  const applyAlternativeString = (alt: string) => {
    setPredictiveQuery(alt);
    setPredictiveData(null);
  };

  // Sentences Heatmap Renderer for AI Detection using Purple color grade
  const renderSentenceHeatmap = () => {
    if (!aiResult || !aiResult.sentences || aiResult.sentences.length === 0) return null;

    return (
      <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl shadow-inner space-y-4 max-h-[380px] overflow-y-auto mt-4 select-text">
        <h4 className="text-xs font-mono uppercase text-stone-400 tracking-wider font-semibold">Line-By-Line Heatmap Spectrum</h4>
        <div className="leading-relaxed text-sm text-stone-800 space-y-2 font-serif">
          {aiResult.sentences.map((sentence, idx) => {
            // Purple gradient based on AI score (0 -> opacity 0%, 100 -> opacity 35%)
            const opacity = (sentence.score / 100) * 0.35 + (sentence.score > 20 ? 0.05 : 0);
            const purpleBg = sentence.score > 15 ? `rgba(147, 51, 234, ${opacity})` : 'transparent';
            const purpleBorder = sentence.score > 50 ? 'border-b border-purple-400' : '';
            
            return (
              <span
                key={idx}
                style={{ backgroundColor: purpleBg }}
                className={`inline px-1 py-0.5 mx-0.5 rounded cursor-help transition-all duration-300 hover:bg-purple-300/40 ${purpleBorder}`}
                title={`AI Likelihood Score: ${sentence.score}%`}
              >
                {sentence.sentence}.{' '}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in text-stone-800">
      
      {/* Header Info */}
      <div className="border-b border-stone-200 pb-4">
        <h2 className="font-serif text-3xl font-medium tracking-tight text-stone-900">Authenticity Forensic Core</h2>
        <p className="text-sm text-stone-500 font-light mt-1">
          Perform high-fidelity AI probabilities, real-time gaugers, synonym-aware plagiarism search, and secondary adversarial scans.
        </p>
      </div>

      {/* Internal Sub Navigation tabs */}
      <div className="flex border-b border-stone-200 gap-1 overflow-x-auto text-[11px] font-mono tracking-widest uppercase font-bold text-stone-500">
        <button
          onClick={() => { setActiveSubTab('ai'); setError(''); }}
          className={`pb-3.5 px-4.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === 'ai' ? 'border-purple-600 text-purple-600 font-bold' : 'border-transparent text-stone-500 hover:text-stone-950'}`}
        >
          <Cpu size={14} /> AI Likelihood
        </button>
        <button
          onClick={() => { setActiveSubTab('predictive'); setError(''); }}
          className={`pb-3.5 px-4.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === 'predictive' ? 'border-[#C5A059] text-[#c0994f] font-bold' : 'border-transparent text-stone-500 hover:text-stone-950'}`}
          title="Typed sentence level check with tooltip recommendations"
        >
          <Gauge size={14} className="text-[#C5A059]" /> Predictive Originality ⚡
        </button>
        <button
          onClick={() => { setActiveSubTab('plagiarism'); setError(''); }}
          className={`pb-3.5 px-4.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === 'plagiarism' ? 'border-orange-500 text-orange-600 font-bold' : 'border-transparent text-stone-500 hover:text-stone-950'}`}
        >
          <ShieldAlert size={14} /> Plagiarism 2.0
        </button>
        <button
          onClick={() => { setActiveSubTab('hybrid'); setError(''); }}
          className={`pb-3.5 px-4.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${activeSubTab === 'hybrid' ? 'border-blue-500 text-blue-600 font-bold' : 'border-transparent text-stone-500 hover:text-stone-950'}`}
        >
          <Layers size={14} /> Dynamic Twist Check
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Input Field */}
        <div className="lg:col-span-7 space-y-4">
          
          {activeSubTab === 'predictive' ? (
            /* Predictive originality gauger real-time typing panel */
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#C5A059]/30 shadow-sm overflow-hidden flex flex-col h-[320px]">
                <div className="bg-stone-50 border-b border-stone-100 p-3.5 px-4 flex justify-between items-center">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#C5A059] font-bold flex items-center gap-1.5">
                    <Sparkles size={12} /> Live Originality Real-time Typing Gauger
                  </span>
                  {predictActive && (
                    <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" /> recalculating...
                    </span>
                  )}
                </div>
                <textarea
                  value={predictiveQuery}
                  onChange={(e) => setPredictiveQuery(e.target.value)}
                  placeholder="Draft your thoughts sentence-by-sentence. Typing triggers real-time debounced audits to suggest alternative vocabulary styles popups..."
                  className="w-full flex-grow p-4 focus:outline-none resize-none font-serif text-[14.5px] text-stone-850 bg-transparent leading-relaxed"
                />
              </div>

              {/* Dynamic feedback popped cards */}
              <AnimatePresence>
                {predictiveQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    className="p-5 bg-white border border-stone-200 rounded-xl space-y-4 relative"
                  >
                    {!predictiveData ? (
                      <div className="text-stone-400 text-xs font-mono py-2 italic flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-ping"></span>
                        Aputting sentence models analytics ... continue typing
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3 gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg font-mono font-bold text-center text-sm ${predictiveData.originalityScore > 70 ? 'bg-green-50 text-green-700' : predictiveData.originalityScore > 40 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'}`}>
                              {predictiveData.originalityScore}% Human
                            </div>
                            <div>
                              <div className="text-xs font-bold font-serif text-stone-900"> Likeliness: {predictiveData.grade}</div>
                              <div className="text-[10px] text-stone-400 font-mono">Word structure and burstiness coefficient</div>
                            </div>
                          </div>
                        </div>

                        {/* Tooltip alternatives popover if AI likelihood is high */}
                        {predictiveData.aiLikelihood > 60 ? (
                          <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 space-y-3">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-red-700 font-bold flex items-center gap-1.5">
                              <AlertTriangle size={13} /> Original Alternatives Recommendation (AI likelihood {predictiveData.aiLikelihood}%)
                            </span>
                            <p className="text-xs text-stone-600 leading-relaxed">
                              This segment is extremely repetitive or highly regular (which triggers AI checkers). Click any high-burst alternative phrasing to instantly apply:
                            </p>

                            <div className="space-y-2 mt-1.5">
                              {predictiveData.alternatives.map((alt, index) => (
                                <button
                                  key={index}
                                  onClick={() => applyAlternativeString(alt)}
                                  className="w-full p-2.5 bg-white hover:bg-[#C5A059]/5 border border-stone-200 hover:border-[#C5A059]/40 text-left text-xs text-stone-850 rounded-lg transition-all flex items-start gap-2 group cursor-pointer"
                                >
                                  <Lightbulb size={12} className="text-[#C5A059] shrink-0 mt-0.5" />
                                  <span className="flex-grow group-hover:text-stone-950 font-serif leading-relaxed">{alt}</span>
                                  <ChevronRight size={12} className="text-stone-300 shrink-0 mt-0.5" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-green-50/50 rounded-xl p-3 border border-green-150 text-xs text-stone-600 flex items-start gap-2">
                            <Check size={14} className="text-green-600 shrink-0 mt-0.5" />
                            <span>This passage patterns naturally! High sentence complexity variances make it robust against LLM detectors.</span>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Normal visual fields for other tabs */
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[380px]">
                <div className="bg-stone-50 border-b border-stone-100 p-3 px-4 flex justify-between items-center">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
                    {activeSubTab === 'hybrid' ? 'Target Version B (Edited Document)' : 'Verification Target Content'}
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono italic">
                    {inputText.split(/\s+/).filter(Boolean).length} Words
                  </span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeSubTab === 'ai' 
                      ? "Paste papers or paragraphs to inspect for synthetic model weights and dual-cascade signatures..." 
                      : "Input research draft text to compare with synaptic Wikipedia error codes and local journals index..."
                  }
                  className="w-full flex-grow p-4 focus:outline-none resize-none font-sans text-sm text-stone-850 leading-relaxed bg-transparent"
                />
              </div>

              {activeSubTab === 'plagiarism' && (
                /* Deep semantic fingerprinting checkLiveWeb Toggle */
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-stone-200 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Globe size={18} className="text-[#C5A059] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Deep Semantic Fingerprinting (Plagiarism 2.0)</span>
                      <span className="text-[10px] text-stone-400 leading-normal block">Synchronize scanning against live web domains, simulating hourly RSS news seed crawlers.</span>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setCheckLiveWeb(!checkLiveWeb)}
                    className={`w-11 h-6 rounded-full p-1 transition-colors grow-0 shrink-0 cursor-pointer ${checkLiveWeb ? 'bg-[#C5A059]' : 'bg-stone-200'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${checkLiveWeb ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              )}

              {/* Hybrid compare input */}
              {activeSubTab === 'hybrid' && (
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[200px]">
                  <div className="bg-stone-50 border-b border-stone-100 p-3 px-4 flex justify-between items-center">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500">Version A (Original Source Text)</span>
                  </div>
                  <textarea
                    value={hybridTextCompare}
                    onChange={(e) => setHybridTextCompare(e.target.value)}
                    placeholder="Paste original source text here to compare vocabulary modifications..."
                    className="w-full flex-grow p-4 focus:outline-none resize-none font-sans text-xs text-stone-850 leading-relaxed bg-transparent"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {error && (
                  <div className="text-red-600 text-xs py-2 px-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-1.5 max-w-lg">
                    <AlertCircle size={12} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                {/* Secondary Adversarial AI Panel trigger */}
                {activeSubTab === 'ai' && inputText.trim() && (
                  <button
                    onClick={handleAdversarialScan}
                    disabled={loadingAdversarial}
                    className="py-2.5 px-4 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 text-[10.5px] font-mono uppercase font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                     <HelpCircle size={13} /> Adversarial Deep Scan
                  </button>
                )}

                <div className="flex-grow"></div>
                
                <button
                  onClick={handleScan}
                  disabled={loading || !inputText.trim() || (activeSubTab === 'hybrid' && !hybridTextCompare.trim())}
                  className={`py-3 px-8 text-white text-xs font-mono tracking-widest uppercase rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-transparent ${activeSubTab === 'ai' ? 'bg-purple-600 hover:bg-purple-500' : activeSubTab === 'plagiarism' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      Verify Authenticity <Sparkles size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Right Dashboard Results Reports */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-spinner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-stone-200 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 h-[380px]"
              >
                <div className={`w-12 h-12 rounded-full border-4 border-stone-100 animate-spin border-t-2 ${activeSubTab === 'ai' ? 'border-t-purple-500' : activeSubTab === 'plagiarism' ? 'border-t-orange-500' : 'border-t-blue-500'}`}></div>
                <div className="space-y-1">
                  <h4 className="font-serif text-lg font-medium text-stone-850">Processing Corpus Sequence</h4>
                  <p className="text-xs text-stone-400 font-mono">Comparing token burstiness, lexical flatlines, and synonym overlaps...</p>
                </div>
              </motion.div>
            ) : activeSubTab === 'ai' && aiResult ? (
              <motion.div
                key="ai-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                
                {/* AI Overview Card - Purple style */}
                <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-serif text-lg font-medium text-stone-900 flex items-center gap-2">
                      <Cpu size={16} className="text-purple-600" /> AI Classification Report
                    </h3>
                    <span className="font-mono text-[9px] bg-purple-50 border border-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                      SYNAPSE METRICS
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center bg-purple-50 border border-purple-150 py-4 px-6 rounded-lg relative overflow-hidden flex-shrink-0">
                      <div className="text-4xl font-mono font-bold text-purple-700">{aiResult.overall_score}%</div>
                      <div className="text-[10px] text-purple-500 uppercase tracking-wider font-mono mt-1">AI Chance</div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <span className="text-xs text-stone-400 font-mono uppercase tracking-wider block">Verdict Conclusion</span>
                      <h4 className="font-serif text-lg font-bold text-stone-900">{aiResult.classification}</h4>
                      <p className="text-xs text-stone-550 leading-relaxed font-sans">
                        {aiResult.overall_score > 60 
                          ? "This text contains high densities of repetitive linguistic structures typical of large language generators."
                          : aiResult.overall_score > 30 
                          ? "Fleshed with mixed patterns. Noticeable sentences show computer-generated markers interspersed together."
                          : "Strong presence of complex human structural cadence. High lexical depth."}
                      </p>
                    </div>
                  </div>

                  {renderSentenceHeatmap()}
                </div>

                {/* Adversarial AI Report Output Accordion */}
                {showAdversarialReport && adversarialData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-stone-950 text-stone-300 rounded-xl border border-purple-500 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-stone-850 pb-2">
                      <span className="text-purple-400 font-mono text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Terminal size={12} /> Second-order Adversarial Report
                      </span>
                      <button 
                        onClick={() => setShowAdversarialReport(false)}
                        className="text-stone-500 hover:text-white font-mono"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-stone-500 block text-[9.5px]">Synth Cascade Intensity</span>
                        <span className="text-white block font-bold">{adversarialData.syntheticDepth}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[9.5px]">Sequence Flatness Ratio</span>
                        <span className="text-white block font-bold">{adversarialData.structuralFlatness} std dev</span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <h5 className="text-[9.5px] font-mono uppercase tracking-wider text-purple-400 font-bold">Anomalous LLM Markers Count</h5>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {adversarialData.repeatingClichés.map((cliché, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-900 border border-stone-800 text-[10px]"
                            title={cliché.desc}
                          >
                            <span className="text-red-400 font-bold">"{cliché.word}"</span> 
                            <span className="bg-stone-800 text-stone-300 font-mono text-[9px] px-1 rounded">{cliché.count}x</span>
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-[10px] text-stone-400 leading-normal font-sans pt-2">
                        💡 Cascaded translation tools leave dynamic flatness anomalies. Typical sentence lengths do not vary, creating a distinct algorithmic footprint.
                      </p>
                    </div>
                  </motion.div>
                )}

              </motion.div>
            ) : activeSubTab === 'plagiarism' && plagiarismResult ? (
              <motion.div
                key="plagiarism-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Plagiarism Similarity Card - Orange */}
                <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="font-serif text-base font-medium text-stone-900 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-orange-600" /> Web Similarity Core
                    </h3>
                    <span className="font-mono text-[10px] bg-orange-100 border border-orange-200 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                      DEEP FINGERPRINT
                    </span>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center bg-orange-50 border border-orange-150 py-4 px-6 rounded-lg flex-shrink-0">
                      <div className="text-4xl font-mono font-bold text-orange-700">{plagiarismResult.overall_similarity}%</div>
                      <div className="text-[10px] text-orange-500 uppercase tracking-wider font-mono mt-1">Similarity</div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <span className="text-xs text-stone-400 font-mono uppercase tracking-wider block">Overlapping Index</span>
                      <h4 className="font-serif text-lg font-bold text-stone-900">
                        {plagiarismResult.overall_similarity > 40 
                          ? "Significant Context Match"
                          : plagiarismResult.overall_similarity > 15 
                          ? "Minor Context Match"
                          : "Fully Authentic Structure"}
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed font-sans">
                        {plagiarismResult.overall_similarity > 15 
                          ? "Our semantic index identified matching arguments and structure rephrasing within registered journals." 
                          : "No meaningful text reuse matches found. Your paragraphs compare originally with standard reference materials."}
                      </p>
                    </div>
                  </div>

                  {/* Sources Match List - Orange markup */}
                  {plagiarismResult.matches.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-xs font-mono uppercase text-[#c0994f] tracking-wider font-semibold">Identified Semantic Domain Matches</h4>
                      
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {plagiarismResult.matches.map((match, idx) => {
                          const mla = `Saeedullah, A. "${match.source_title}." OmniArchive Academic Review, 2026, pp. 24-29.`;
                          const apa = `Saeedullah, A. (2026). ${match.source_title}. Journal of Digital Writing Forensic, 8(2), 114-119.`;
                          const harvard = `Saeedullah, A., 2026. ${match.source_title}. Journal of Digital Writing Forensic, 8(2), pp.114-119.`;

                          return (
                            <div key={idx} className="p-3 bg-stone-50 border border-stone-150 rounded-lg text-xs space-y-2">
                              <div className="flex justify-between items-start gap-3">
                                <span className="font-semibold text-stone-850 line-clamp-1">{match.source_title}</span>
                                <span className="text-orange-600 font-mono font-bold shrink-0">{match.similarity_score}% share</span>
                              </div>
                              <p className="text-[11px] text-stone-500 italic leading-relaxed bg-[#C5A059]/5 border-l border-[#C5A059]/40 pl-2">
                                {match.matched_text}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-stone-200">
                                <a
                                  href={match.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-[#C5A059] hover:underline"
                                >
                                  Inspect Source Document <ExternalLink size={8} />
                                </a>

                                <div className="flex gap-1 items-center">
                                  <span className="text-[8.5px] uppercase font-mono text-stone-400 font-bold mr-1">Cite:</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(apa);
                                    }}
                                    className="bg-white hover:bg-stone-100 active:bg-stone-200 border border-stone-200 text-stone-600 text-[9px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    title="Copy APA bibliography"
                                  >
                                    APA
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(mla);
                                    }}
                                    className="bg-white hover:bg-stone-100 active:bg-stone-200 border border-stone-200 text-stone-600 text-[9px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    title="Copy MLA bibliography"
                                  >
                                    MLA
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(harvard);
                                    }}
                                    className="bg-white hover:bg-stone-100 active:bg-stone-200 border border-stone-200 text-stone-600 text-[9px] font-mono px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    title="Copy Harvard bibliography"
                                  >
                                    Harvard
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeSubTab === 'hybrid' && hybridResult ? (
              <motion.div
                key="hybrid-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm space-y-5"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-serif text-lg font-medium text-stone-900 flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" /> Hybrid Overlap Index
                  </h3>
                  <span className="font-mono text-[10px] bg-blue-50 border border-blue-150 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                    3-GRAM CODES
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 border border-stone-150 rounded-lg text-center">
                    <div className="text-2xl font-mono font-bold text-stone-800">{hybridResult.n_grams_overlap}%</div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono mt-1">N-Gram Reuse</p>
                  </div>
                  <div className="p-4 bg-stone-50 border border-stone-155 rounded-lg text-center">
                    <div className={`text-[10px] font-bold uppercase mt-1 px-2.5 py-1 rounded inline-block ${hybridResult.is_spun ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-green-50 text-green-600 border border-green-150'}`}>
                      {hybridResult.is_spun ? 'Highly Spun (AI)' : 'Sufficient Twist'}
                    </div>
                    <p className="text-[10px] text-stone-500 uppercase tracking-widest font-mono mt-2">Structure Twist</p>
                  </div>
                </div>

                <div className="text-xs text-stone-600 leading-relaxed bg-blue-50/50 border border-blue-100 p-4 rounded-lg space-y-2">
                  <span className="font-bold text-blue-850 flex items-center gap-1.5 uppercase tracking-wide text-[10px] font-mono">
                    <BarChart2 size={12} /> Analytical Footnote
                  </span>
                  <p>
                    {hybridResult.is_spun 
                      ? "Warning: Severe synonymous replacement patterns found. Overlapping 3-grams confirm a structured machine paraphrase from the source."
                      : "Sufficient semantic distance exists. The structural and syntactic footprint compares naturally."
                    }
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="bg-stone-50/50 border border-stone-200 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3 h-[380px]">
                <Layers size={36} className="text-stone-300 mb-1" />
                <div className="space-y-1">
                  <h4 className="font-serif text-sm font-medium text-stone-700">Awaiting Analysis Parameters</h4>
                  <p className="text-xs text-stone-400 font-sans max-w-xs leading-normal">
                    Enter target content or typing query streams on the left, then trigger scan nodes to initialize audits.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
