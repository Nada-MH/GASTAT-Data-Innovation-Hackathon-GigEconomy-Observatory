import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Minimize2, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAI } from '../contexts/AIContext';
import { motion, AnimatePresence } from 'motion/react';
import { useGoogleTrends } from '../contexts/GoogleTrendsContext';
import { useAppStore } from '../contexts/AppStoreContext';

/**
 * AIChatWidget
 * A floating AI assistant widget that provides analytical insights 
 * across any dashboard page. It can optionally capture the current context.
 */
export function AIChatWidget() {
  const { t, language } = useLanguage();
  const { messages, isLoading, isOpen, toggleWidget, sendMessage, clearChat } = useAI();
  const [input, setInput] = useState('');
  
  // Current dashboard hooks to inject data context to AI
  const trendsContext = useGoogleTrends();
  const storeContext = useAppStore();
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!input.trim() && !isLoading) return;

    // Collect whatever data we have on the current screen to make AI context-aware
    const currentContext = {
      timestamp: new Date().toISOString(),
      activeGoogleTrendsData: trendsContext.results ? { summary: 'User is viewing Google Trends data', metrics: trendsContext.results.summary } : null,
      activeAppStoreData: storeContext.analytics ? { summary: 'User is viewing App Store estimates', metrics: storeContext.analytics.totals } : null
    };

    sendMessage(input, currentContext);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center z-50 transition-colors focus:outline-none"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleWidget}
      >
        <MessageSquare size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[550px] max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-2xl shadow-indigo-100/50 flex flex-col overflow-hidden z-50 border border-slate-200 ${language === 'ar' ? 'font-arabic text-right' : 'font-sans text-left'}`}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-500/20 p-1.5 rounded-lg text-indigo-300">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t('ai.widget.title')}</h3>
                  <p className="text-[10px] text-slate-400">Powered by Groq LLaMA-3</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="p-1.5 hover:bg-white/10 rounded-md text-slate-300 transition-colors" title="Clear Chat">
                  <RefreshCw size={14} />
                </button>
                <button onClick={toggleWidget} className="p-1.5 hover:bg-white/10 rounded-md text-slate-300 transition-colors" title="Close">
                  <Minimize2 size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? (language === 'ar' ? 'flex-row-reverse' : '') : (language === 'ar' ? 'flex-row-reverse' : '')}`}>
                  <div className={`p-1.5 rounded-lg shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-white shadow-sm border border-slate-200 text-slate-700'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`text-sm py-2 px-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                      {msg.content.split('\n').map((line, idx) => (
                        <span key={idx} className="block min-h-[1em]">{line}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg shrink-0 bg-white shadow-sm border border-slate-200 text-slate-400">
                    <Bot size={16} />
                  </div>
                  <div className="text-sm py-2 px-3 rounded-2xl bg-white border border-slate-200 text-slate-500 rounded-tl-sm shadow-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span>{t('ai.chat.typing')}</span>
                  </div>
                </div>
              )}
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 shrink-0">
              <div className="relative flex items-end shadow-sm border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('ai.chat.placeholder')}
                  className="w-full max-h-32 min-h-11 resize-none bg-transparent py-3 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-3 text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:bg-slate-50 transition-colors shrink-0 bg-white"
                >
                  <Send size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                </button>
              </div>
              <p className="text-[9px] text-center text-slate-400 mt-2">
                AI can make mistakes. Consider verifying important information.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
