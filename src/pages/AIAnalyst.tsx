import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useLanguage } from '../contexts/LanguageContext';
import { useAI } from '../contexts/AIContext';
import { useGoogleTrends } from '../contexts/GoogleTrendsContext';
import { useAppStore } from '../contexts/AppStoreContext';

/**
 * Dedicated Full-Page AI Analyst
 * Provides a larger canvas for in-depth conversations and policy generation.
 */
export function AIAnalyst() {
  const { t, language } = useLanguage();
  const { messages, isLoading, sendMessage, clearChat } = useAI();
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const trendsContext = useGoogleTrends();
  const storeContext = useAppStore();

  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() && !isLoading) return;

    // Attach contextual data if available on this specific page load. 
    // This allows the AI to "see" the same data the user fetched on other tabs.
    const currentContext = {
      timestamp: new Date().toISOString(),
      activeGoogleTrendsData: trendsContext.results ? { summary: 'User has Google Trends data loaded', metrics: trendsContext.results.summary } : null,
      activeAppStoreData: storeContext.analytics ? { summary: 'User has App Store estimates loaded', metrics: storeContext.analytics.totals } : null
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

  // Pre-defined prompts for the user
  const suggestions = language === 'ar' ? [
    "ما هي التوجهات الحالية في تقييمات تطبيقات التوصيل؟",
    "حلل الفجوة في التأمينات الاجتماعية لعمال العمل الحر.",
    "قم بصياغة مقترح سياسة لحماية سائقي الميل الأخير.",
    "اشرح نموذج حساب تقديرات البصمة الرقمية."
  ] : [
    "What are the current trends in delivery app reviews?",
    "Analyze the social insurance gap for gig workers.",
    "Draft a policy proposal to protect last-mile drivers.",
    "Explain the Digital Footprint estimation model."
  ];

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={24} />
            {t('ai.title')}
          </h2>
          <p className="text-slate-500 text-sm mt-1">{t('ai.subtitle')}</p>
        </div>
        <button 
          onClick={clearChat}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw size={14} />
          {language === 'ar' ? 'محادثة جديدة' : 'New Chat'}
        </button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-white/50 backdrop-blur-sm border-indigo-100/50 shadow-xl shadow-indigo-100/20">
        
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isLatest = i === messages.length - 1;
            
            return (
              <div key={i} className={`flex items-start gap-4 ${isUser ? (language === 'ar' ? 'flex-row-reverse' : '') : (language === 'ar' ? 'flex-row-reverse' : '')}`}>
                <div className={`p-2 rounded-xl shrink-0 mt-1 shadow-sm ${isUser ? 'bg-indigo-100 text-indigo-700' : 'bg-gradient-to-br from-slate-800 to-slate-900 text-indigo-300'}`}>
                  {isUser ? <User size={20} /> : <Bot size={20} />}
                </div>
                
                <div className={`flex flex-col max-w-[85%] ${isUser ? (language === 'ar' ? 'items-start' : 'items-end') : (language === 'ar' ? 'items-end' : 'items-start')}`}>
                  {/* The message bubble */}
                  <div className={`text-[15px] leading-relaxed py-3 px-5 rounded-3xl ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-200' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.content.split('\n').map((line, idx) => (
                      <span key={idx} className={`block ${line.trim().startsWith('-') || line.trim().startsWith('•') ? 'ml-4' : ''} ${line.trim() === '' ? 'h-4' : ''}`}>
                        {line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className={`flex items-start gap-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <div className="p-2 rounded-xl shrink-0 mt-1 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-indigo-300">
                <Bot size={20} />
              </div>
              <div className="text-[15px] leading-relaxed py-4 px-5 rounded-3xl bg-white border border-slate-200 text-slate-500 rounded-tl-sm shadow-sm flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span className="font-medium">{t('ai.chat.typing')}</span>
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          
          {/* Suggestions if chat is mostly empty */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              {suggestions.map((suggestion, idx) => (
                <button 
                  key={idx}
                  onClick={() => { setInput(suggestion); }}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <div className="relative flex items-end shadow-sm border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 ring-indigo-500/20 focus-within:border-indigo-400 transition-all bg-slate-50/50">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ai.chat.placeholder')}
              className="w-full max-h-48 min-h-14 resize-none bg-transparent py-4 px-5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-4 text-indigo-600 hover:text-indigo-800 disabled:text-slate-300 disabled:bg-slate-50/50 transition-colors shrink-0"
              title={t('ai.chat.send')}
            >
              <div className="bg-white rounded-full p-2 shadow-sm border border-slate-100">
                <Send size={20} className={language === 'ar' ? 'rotate-180' : ''} />
              </div>
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-3 px-2">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <AlertCircle size={12} />
              AI responses are generated by Groq (LLaMA-3 70B) and should be verified.
            </p>
            <div className="flex items-center gap-1.5 opacity-50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Groq Engine Active</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
