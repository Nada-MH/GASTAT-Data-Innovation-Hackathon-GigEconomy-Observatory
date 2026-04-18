import React, { useState, useEffect } from 'react';
import { useLinkedInAnalytics } from '../contexts/LinkedInAnalyticsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAI } from '../contexts/AIContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell
} from 'recharts';
import { 
  Users, MapPin, Download, Link as LinkIcon, Cpu, Sparkles, 
  Search, CheckCircle2, Zap, User, Briefcase, RefreshCw,
  LayoutGrid, List, Filter, ArrowRight, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

export function LinkedInAnalytics() {
  const { freelancers, metrics, isLoading, error, syncApify } = useLinkedInAnalytics();
  const { language } = useLanguage();
  const { getBriefing } = useAI();
  
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  
  // Search State
  const [keywords, setKeywords] = useState('freelance graphic designer Saudi Arabia');
  const [limit, setLimit] = useState(15);
  const [sessionResults, setSessionResults] = useState<any[]>([]);
  const [sessionSavedCount, setSessionSavedCount] = useState<number | null>(null);

  // Generate Strategic Summary on Data Load
  useEffect(() => {
    if (freelancers.length > 0 && !aiSummary && !isAIThinking) {
      const generateSummary = async () => {
        setIsAIThinking(true);
        const topField = metrics?.topField || 'Unknown';
        const prompt = `Based on our repository of ${freelancers.length} Saudi freelancers (${topField} being most common), provide a 3-sentence executive summary. Return ONLY the text.`;
        try {
          const briefing = await getBriefing(prompt);
          setAiSummary(briefing);
        } catch (err) {
          console.error("AI Briefing failed", err);
        } finally {
          setIsAIThinking(false);
        }
      };
      generateSummary();
    }
  }, [freelancers.length, metrics, getBriefing]);

  const handleGlobalSync = async () => {
    setSessionResults([]);
    setSessionSavedCount(null);
    const result = await syncApify(keywords, limit);
    if (result.success) {
      setSessionResults(result.items || []);
      setSessionSavedCount(result.savedCount);
    }
  };

  // Helper to safely render values
  const safeStr = (val: any, fallback: string = 'N/A'): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if (val.linkedinText) return val.linkedinText;
      if (val.text) return val.text;
      if (val.name) return val.name;
      return JSON.stringify(val);
    }
    return String(val);
  };

  const [showAllRecords, setShowAllRecords] = useState(false);

  const handleExportCSV = () => {
    if (freelancers.length === 0) return;
    
    // Create CSV content
    const headers = ["Full Name", "Job Title", "Location", "Field", "Profile URL", "Scraped At"];
    const rows = freelancers.map(f => [
      `"${safeStr(f.fullName).replace(/"/g, '""')}"`,
      `"${safeStr(f.jobTitle).replace(/"/g, '""')}"`,
      `"${safeStr(f.location).replace(/"/g, '""')}"`,
      `"${f.field}"`,
      `"${f.profileUrl}"`,
      `"${new Date(f.lastScrapedAt).toLocaleString()}"`
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `saudi_freelancers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedFreelancers = showAllRecords ? freelancers : freelancers.slice(0, 10);

  const COLORS = ['#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#2563eb', '#0891b2'];

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* Header & Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            LinkedIn Professional Pulse
            <Zap className="text-indigo-600 fill-indigo-600" size={32} />
          </h1>
          <p className="text-slate-500 font-medium mt-1">High-fidelity mapping powered by Apify Cloud Engine</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleExportCSV}
             className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
           >
             <Download size={16} className="text-indigo-600" />
             Export Dataset
           </button>
           <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
             isLoading ? 'bg-amber-50 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
           }`}>
             {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
             {isLoading ? 'System Sync Active' : 'System Ready'}
           </div>
        </div>
      </div>

      {/* --- LEVEL 1: SEARCH & EXTRACTION (THE CORE) --- */}
      <Card className="border-none bg-white shadow-2xl shadow-indigo-100/50 rounded-[40px] overflow-hidden">
        <div className="p-1 sm:p-2">
            {error && (
              <div className="mx-8 mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-4">
                <span className="shrink-0 bg-red-500 text-white rounded-full p-1"><Filter size={12}/></span>
                {error}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-[36px] p-8 lg:p-12 text-slate-900 relative overflow-hidden shadow-xl shadow-indigo-100/50">
              <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 text-indigo-900">
                <Search size={200} />
              </div>
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                <div className="lg:col-span-12">
                  <h3 className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-xs mb-4">Strategic Investigation</h3>
                  <h2 className="text-3xl font-black mb-8 text-slate-900">Target New Talent Pools</h2>
                </div>

                <div className="lg:col-span-10">
                  <div className="relative">
                    <input 
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="e.g. freelance software engineer Saudi Arabia"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-6 px-8 text-xl font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <Search className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400" size={28} />
                  </div>
                </div>

                <div className="lg:col-span-2">
                   <button 
                    onClick={handleGlobalSync}
                    disabled={isLoading}
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {isLoading ? (
                       <RefreshCw className="animate-spin" size={20} />
                     ) : (
                       <ArrowRight size={20} />
                     )}
                     {isLoading ? 'Active' : 'Deploy'}
                   </button>
                </div>

                <div className="lg:col-span-12 mt-4 flex items-center justify-between gap-6">
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between items-center px-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Extraction Depth (Limit)</span>
                       <span className="text-xl font-black text-indigo-600 tabular-nums">{limit}</span>
                     </div>
                     <input 
                      type="range"
                      min="1"
                      max="50"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                      className="w-full accent-indigo-500"
                     />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl">
                     <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Adaptive Discovery & Exclusion Active</span>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </Card>

      {/* --- LEVEL 2: LIVE DISCOVERY & AI --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Discovery Stream */}
        <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden min-h-[500px] bg-white/80 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100/50 pb-6">
               <div>
                 <CardTitle className="text-2xl font-black text-slate-900">Current Session Discovery</CardTitle>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Live feed from the latest industry sync</p>
               </div>
               <div className="flex items-center gap-3">
                  {isLoading && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black animate-pulse">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping"></div>
                      LIVE SCANNING
                    </div>
                  )}
                  <div className="bg-indigo-600/10 text-indigo-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    +{sessionSavedCount || 0} New Records Committed
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-6">
                {sessionResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sessionResults.map((p, idx) => {
                      const name = safeStr(p.fullName || p.name || 'Member');
                      const title = safeStr(p.jobTitle || p.headline || 'Professional');
                      const url = p.profileUrl || p.linkedin_url || '#';
                      const loc = safeStr(p.location || p.locationName || 'Saudi Arabia');
                      const img = p.profilePicUrl || p.profile_pic || p.avatar;

                      return (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-start gap-4 p-5 rounded-3xl bg-slate-50/50 border border-transparent hover:border-indigo-100 hover:bg-white transition-all group shadow-sm hover:shadow-md"
                        >
                           <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                              {img ? <img src={img} alt={name} className="w-full h-full object-cover" /> : <User size={24} />}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className="font-black text-slate-900 text-sm truncate uppercase tracking-tighter group-hover:text-indigo-600 transition-colors">{safeStr(name)}</h4>
                                <a href={url === '#' ? undefined : url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-indigo-500 transition-colors"><LinkIcon size={14} /></a>
                              </div>
                              <p className="text-xs text-slate-500 font-bold line-clamp-2 mt-1 leading-snug">{safeStr(title)}</p>
                              <div className="flex items-center gap-2 mt-3">
                                 <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase">
                                   <MapPin size={10} /> {safeStr(loc)}
                                 </div>
                              </div>
                           </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                       <Users size={40} />
                    </div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                      {isLoading ? 'Scanning LinkedIn Talent Clusters...' : 'Waiting for deployment instructions'}
                    </p>
                  </div>
                )}
            </CardContent>
        </Card>

        {/* AI & Metrics Column */}
        <div className="space-y-8">
          <Card className="border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white text-slate-900 shadow-xl shadow-indigo-100/50 rounded-[32px] overflow-hidden relative min-h-[300px]">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-200/40 rounded-full blur-3xl"></div>
             <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-indigo-600 uppercase tracking-[0.2em] text-[10px] font-black">
                  <Sparkles size={16} className="text-amber-500" />
                  Executive Insight
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-4">
                {isAIThinking || isLoading ? (
                  <div className="space-y-3">
                     <div className="h-4 bg-slate-200 rounded w-full animate-pulse"></div>
                     <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse"></div>
                     <div className="h-4 bg-slate-200 rounded w-4/6 animate-pulse"></div>
                  </div>
                ) : (
                  <p className="text-lg font-bold leading-relaxed italic text-slate-700">
                     "{aiSummary || 'Analysis engine warming up based on local repository data...'}"
                  </p>
                )}
                <div className="mt-12 flex items-center justify-between opacity-60 text-slate-500">
                   <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Cpu size={12}/> Analysis L3</span>
                   <TrendingUp size={16} />
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[32px]">
             <CardHeader className="pb-2">
                <CardTitle className="text-slate-900 font-black tracking-tight text-xl">Global Intelligence</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6">
                <div>
                   <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Talent Pool</span>
                      <span className="text-2xl font-black text-indigo-600 tabular-nums">
                        {freelancers.length + sessionResults.length}
                      </span>
                   </div>
                   <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                   </div>
                </div>
                <div className="pt-4 grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Discovery</p>
                      <p className="text-xl font-black text-indigo-600">+{sessionResults.length}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Market Focal Point</p>
                      <p className="text-[10px] font-black text-slate-800">Saudi Arabia (KSA)</p>
                   </div>
                </div>
             </CardContent>
          </Card>
        </div>
      </div>

      {/* --- LEVEL 3: HISTORICAL REPOSITORY ANALYTICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        {/* Sector Analytics */}
        <Card className="lg:col-span-1 border-none shadow-xl shadow-slate-200/50 rounded-[32px]">
          <CardHeader>
             <CardTitle className="text-slate-900 font-black truncate">Sector Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {metrics?.fieldsDistribution && metrics.fieldsDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.fieldsDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={12}>
                      {metrics.fieldsDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">Awaiting sufficient data mapping</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Global Record Feed */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 rounded-[32px]">
          <CardHeader className="flex flex-row items-center justify-between">
             <CardTitle className="text-slate-900 font-black tracking-tight">Global Repository Feed</CardTitle>
             <div className="flex gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  title="Export to CSV"
                >
                  <Download size={16} />
                </button>
                <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors">
                  <Filter size={16} />
                </button>
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <tr>
                     <th className="px-8 py-4">Professional</th>
                     <th className="px-8 py-4">Industry Sector</th>
                     <th className="px-8 py-4">Extraction Date</th>
                     <th className="px-8 py-4">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {displayedFreelancers.map((f) => (
                     <tr key={f.profileUrl} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <User size={14} />
                            </div>
                            <div>
                               <p className="font-bold text-slate-900 text-sm truncate max-w-[150px]">{safeStr(f.fullName)}</p>
                               <p className="text-[10px] text-slate-400 italic truncate max-w-[150px]">{safeStr(f.jobTitle)}</p>
                            </div>
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase">
                            {f.field}
                          </span>
                       </td>
                       <td className="px-8 py-5 text-[10px] font-medium text-slate-400 tabular-nums">
                          {new Date(f.lastScrapedAt).toLocaleDateString()}
                       </td>
                       <td className="px-8 py-5">
                          <a href={f.profileUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm flex items-center justify-center w-max">
                            <LinkIcon size={14} />
                          </a>
                       </td>
                     </tr>
                   ))}
                   {freelancers.length === 0 && (
                     <tr>
                       <td colSpan={4} className="py-20 text-center text-slate-300 italic">No historical records available. Deploy a pulse to populate.</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
             {freelancers.length > 10 && (
               <div className="p-6 border-t border-slate-50 text-center">
                  <button 
                    onClick={() => setShowAllRecords(!showAllRecords)}
                    className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:text-indigo-700 transition-colors"
                  >
                    {showAllRecords ? 'Collapse Dashboard' : `Access Full Audit Trail (${freelancers.length} Records)`}
                  </button>
               </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

