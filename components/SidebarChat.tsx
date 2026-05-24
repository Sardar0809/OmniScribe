import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Trash2, ArrowRight } from 'lucide-react';
import { ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarChatProps {
  token: string;
  documentText: string;
}

export const SidebarChat: React.FC<SidebarChatProps> = ({ token, documentText }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'assistant',
      text: "Hello! I am your OmniScribe Editor Copilot. ✍️\n\nI have direct access to your active document. You can ask me questions about your text, or select one of the helper prompts below to get started!",
      timestamp: new Date().toISOString()
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = [
    { label: 'Summarize', prompt: 'Please summarize the current document shortly and extract 3 core key findings.' },
    { label: 'Propose Titles', prompt: 'Propose 5 highly engaging, SEO-optimized academic title concepts for this document.' },
    { label: 'Enhance Flow', prompt: 'Analyze the tone of this document. Propose three structural adjustments to increase sentence flow.' },
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    if (!customPrompt) setInput('');

    // Append user message
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build simple history structure for Gemini
      const apiHistory = messages
        .filter(m => m.id !== 'init')
        .map(m => ({
          sender: m.sender,
          text: m.text
        }));

      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          document: documentText,
          history: apiHistory,
          message: textToSend
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server lost communication');

      const copilotMsg: ChatMessage = {
        id: 'msg_reply_' + Date.now(),
        sender: 'assistant',
        text: data.text,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, copilotMsg]);

    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: `⚠️ Copilot Error: ${e.message || 'Verification timed out. Check Google key configurations.'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChatHistory = () => {
    setMessages([
      {
        id: 'init',
        sender: 'assistant',
        text: "History cleared. How can I assist you with editing your text now?",
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xl flex flex-col h-[580px] w-full overflow-hidden">
      
      {/* Header */}
      <div className="bg-stone-900 text-white p-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#C5A059] flex items-center justify-center">
            <Bot size={12} className="text-white" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-semibold tracking-wide">Linguistic Copilot</h3>
            <p className="text-[9px] text-stone-400 font-mono uppercase tracking-widest leading-none">V3.5 FLASH ACTIVE</p>
          </div>
        </div>

        <button
          onClick={clearChatHistory}
          className="text-stone-400 hover:text-red-400 transition-colors p-1"
          title="Clear Chat History"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Quick Actions Shelf */}
      <div className="p-3 bg-stone-50 border-b border-stone-100 flex gap-1.5 overflow-x-auto flex-shrink-0">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.prompt)}
            disabled={loading}
            className="whitespace-nowrap bg-white border border-stone-200 hover:border-[#C5A059] text-stone-700 text-[10px] py-1 px-2.5 rounded-full transition-all cursor-pointer font-sans disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Sparkles size={10} className="text-[#C5A059]" /> {p.label} <ArrowRight size={8} />
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-stone-50/30">
        {messages.map((m) => {
          const isAI = m.sender === 'assistant';
          return (
            <div key={m.id} className={`flex gap-2.5 max-w-[85%] ${isAI ? 'self-start' : 'ml-auto flex-row-reverse'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isAI ? 'bg-stone-100' : 'bg-[#C5A059]'}`}>
                {isAI ? <Bot size={12} className="text-[#C5A059]" /> : <User size={12} className="text-white" />}
              </div>
              <div className={`p-3 rounded-xl text-xs leading-normal font-sans shadow-sm whitespace-pre-wrap ${isAI ? 'bg-white text-stone-850 border border-stone-150' : 'bg-stone-900 text-white'}`}>
                {m.text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 max-w-[85%] self-start animate-pulse">
            <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
              <Bot size={12} className="text-stone-400" />
            </div>
            <div className="p-3 rounded-xl text-xs bg-white text-stone-400 border border-stone-150 italic font-mono uppercase tracking-widest leading-none flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce [animation-delay:0.4s]"></div>
              <span>Formulating reply...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Lower Input Box */}
      <div className="p-3 bg-white border-t border-stone-200 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask Copilot to analyze document text..."
            className="flex-grow text-xs p-2.5 px-3 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-[#C5A059] font-sans text-stone-800 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg disabled:opacity-50 transition-all cursor-pointer flex-shrink-0"
          >
            <Send size={12} />
          </button>
        </form>
      </div>

    </div>
  );
};
