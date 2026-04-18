import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Database, 
  ShieldAlert, 
  Settings, 
  Bell, 
  Search,
  Menu,
  X,
  MapPin,
  Globe,
  TrendingUp,
  Smartphone,
  Bot,
  ShoppingCart,
  Users,
  MessageSquare,
  Gauge,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { AIChatWidget } from './AIChatWidget';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard },
    { id: 'sectoral', label: t('nav.sectoral'), icon: Briefcase },
    { id: 'lastmile', label: t('nav.lastmile'), icon: MapPin },
    { id: 'trends', label: t('nav.trends'), icon: TrendingUp },
    { id: 'appstore', label: t('nav.appstore'), icon: Smartphone },
    { id: 'salla', label: t('nav.salla') || 'E-Commerce', icon: ShoppingCart },
    { id: 'linkedin', label: 'Freelancers (LinkedIn)', icon: Users },
    { id: 'twitter', label: 'X / Twitter Analyzer', icon: MessageSquare },
    { id: 'pressure', label: 'Driver Pressure Index', icon: Gauge },
    { id: 'aqar', label: t('nav.aqar'), icon: Building2 },
    { id: 'maroof', label: t('nav.maroof'), icon: ShoppingCart },
    { id: 'aianalyst', label: t('nav.aianalyst'), icon: Bot },
    { id: 'transparency', label: t('nav.transparency'), icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-e border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white leading-tight">
            {t('app.title')}
            <span className="block text-xs font-normal text-teal-400 mt-1">{t('app.subtitle')}</span>
          </h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive 
                    ? 'bg-teal-500/10 text-teal-400' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium hover:bg-slate-800 hover:text-white">
            <Settings size={18} className="text-slate-400" />
            {t('settings')}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside 
            initial={{ x: language === 'ar' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: language === 'ar' ? '100%' : '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="fixed inset-y-0 start-0 w-64 bg-slate-900 text-slate-300 z-50 flex flex-col md:hidden"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h1 className="text-lg font-bold text-white leading-tight">
                {t('app.title')}
              </h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 py-6 px-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                      isActive 
                        ? 'bg-teal-500/10 text-teal-400' 
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700"
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder={t('search.placeholder')} 
                className="ps-9 pe-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all w-64"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Globe size={16} />
              {language === 'en' ? 'العربية' : 'English'}
            </button>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-coral-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-medium text-sm">
              PA
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Global AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
