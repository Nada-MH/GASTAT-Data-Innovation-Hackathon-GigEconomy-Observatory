import React, { createContext, useContext, useState, useCallback } from 'react';
import { sendChatMessage, ChatMessage } from '../services/aiApi';
import { useLanguage } from './LanguageContext';

interface AIContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  isOpen: boolean;
  toggleWidget: () => void;
  sendMessage: (text: string, contextData?: any) => Promise<void>;
  getBriefing: (prompt: string) => Promise<string>;
  clearChat: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

const INIT_MSG_EN: ChatMessage = { role: 'assistant', content: 'Hello! I am the Smart Observatory AI Analyst. Ask me about the Saudi gig economy, or share some dashboard data with me to analyze.' };
const INIT_MSG_AR: ChatMessage = { role: 'assistant', content: 'مرحباً! أنا محلل الذكاء الاصطناعي للمرصد الذكي. اسألني عن اقتصاد العمل الحر في السعودية، أو شارك بيانات من لوحة القيادة وسأقوم بتحليلها.' };

export function AIProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with proper language greeting
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([language === 'ar' ? INIT_MSG_AR : INIT_MSG_EN]);
    }
  }, [language, messages.length]);

  const toggleWidget = useCallback(() => setIsOpen(p => !p), []);

  const sendMessage = useCallback(async (text: string, contextData?: any) => {
    if (!text.trim() && !contextData) return;

    let userContent = text;
    if (contextData) {
      userContent += `\n\n[CONTEXT DATA: ${JSON.stringify(contextData)}]`;
    }

    const newUserMsg: ChatMessage = { role: 'user', content: userContent };
    
    // Add user message to UI immediately (stripping raw JSON for display)
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      // Send the actual message sequence with system/context included
      const sequenceToSend = [...messages, newUserMsg];
      const res = await sendChatMessage(sequenceToSend, language);
      
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'ar' ? 'عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.' : 'Sorry, an error occurred while connecting to the AI.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, language]);

  const getBriefing = useCallback(async (prompt: string) => {
    try {
      const res = await sendChatMessage([{ role: 'user', content: prompt }], language);
      return res.reply;
    } catch (error) {
      console.error('Briefing Error:', error);
      return "";
    }
  }, [language]);

  const clearChat = useCallback(() => {
    setMessages([language === 'ar' ? INIT_MSG_AR : INIT_MSG_EN]);
  }, [language]);

  return (
    <AIContext.Provider value={{ messages, isLoading, isOpen, toggleWidget, sendMessage, getBriefing, clearChat }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI must be used within AIProvider');
  return context;
}
