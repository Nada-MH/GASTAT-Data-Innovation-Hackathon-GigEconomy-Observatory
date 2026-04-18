import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useReviewAnalytics } from '../contexts/ReviewAnalyticsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { RefreshCw, Activity, AlertTriangle, MessageCircle, Clock, Zap, Target } from 'lucide-react';
import type { AppReviewNode } from '../types/reviews';

const COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500
  neutral: '#cbd5e1', // slate-300
  wait: '#f59e0b', // amber-500
  pressure: '#6366f1' // indigo-500
};

export function DriverPressureInsights() {
  const { t } = useLanguage();
  const { data, isLoading, error, refreshData } = useReviewAnalytics();
  const [selectedApp, setSelectedApp] = useState<string>('all');

  const appsList: AppReviewNode[] = data?.apps ? Object.values(data.apps) : [];
  const currentApp: AppReviewNode | null = selectedApp === 'all' ? null : (appsList.find(a => a.name === selectedApp) || null);
  
  // Aggregate stats
  const totalReviews = appsList.reduce((sum, app) => sum + app.total_reviews, 0);
  const avgPressure = appsList.length > 0 
    ? (appsList.reduce((sum, app) => sum + app.pressure.pressure_index, 0) / appsList.length).toFixed(1) 
    : 0;

  // Chart Data: Pressure Comparison
  const pressureChartData = appsList.map(app => ({
    name: app.name,
    pressure: app.pressure.pressure_index,
    wait: app.pressure.details.avg_wait_min
  })).sort((a, b) => b.pressure - a.pressure);

  // Chart Data: Sentiment Donut (Contextual based on selected app or aggregate)
  let sentimentData = [];
  if (currentApp) {
    sentimentData = [
      { name: 'Positive', value: currentApp.pressure.details.positive, fill: COLORS.positive },
      { name: 'Negative', value: currentApp.pressure.details.negative, fill: COLORS.negative },
      { name: 'Neutral', value: currentApp.pressure.details.neutral, fill: COLORS.neutral }
    ];
  } else {
    const aggPos = appsList.reduce((sum, app) => sum + app.pressure.details.positive, 0);
    const aggNeg = appsList.reduce((sum, app) => sum + app.pressure.details.negative, 0);
    const aggNeu = appsList.reduce((sum, app) => sum + app.pressure.details.neutral, 0);
    sentimentData = [
      { name: 'Positive', value: aggPos, fill: COLORS.positive },
      { name: 'Negative', value: aggNeg, fill: COLORS.negative },
      { name: 'Neutral', value: aggNeu, fill: COLORS.neutral }
    ];
  }

  const handleLiveSync = () => {
    refreshData(true);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Driver Pressure Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Deep NLP sentiment analysis of App Store and Google Play reviews</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
           <span className="text-xs text-slate-500 px-2">Data Source: <strong className="text-slate-700">iOS & Android (Saudi Arabia)</strong></span>
           <button 
             onClick={handleLiveSync} 
             disabled={isLoading}
             className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded text-sm px-3 py-1.5 transition-colors disabled:opacity-50"
           >
             <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
             Live Scrape
           </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!data && !isLoading && (
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50 items-center justify-center py-20 flex flex-col">
          <Activity size={40} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600">No Review Data Found</h3>
          <p className="text-sm text-slate-400 mt-2 mb-6 text-center max-w-sm">Click "Live Scrape" above to fetch the latest App Store reviews using the Apify proxy engine.</p>
          <button onClick={handleLiveSync} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm px-5 py-2.5 transition-colors">
            Run Initial Scrape
          </button>
        </Card>
      )}

      {data && (
        <>
          {/* KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Analyzed Reviews</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{totalReviews.toLocaleString()}</h3>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg"><MessageCircle className="text-blue-600" size={22} /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Avg. Pressure Index (0-10)</p>
                    <h3 className="text-3xl font-bold text-indigo-600 mt-1">{avgPressure}</h3>
                  </div>
                  <div className="p-2.5 bg-indigo-50 rounded-lg"><Zap className="text-indigo-600" size={22} /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Apps Monitored</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{appsList.length}</h3>
                  </div>
                  <div className="p-2.5 bg-slate-100 rounded-lg"><Target className="text-slate-600" size={22} /></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Global Sentiment</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">
                       {sentimentData[0].value > sentimentData[1].value ? <span className="text-emerald-500">Positive</span> : <span className="text-red-500">Negative</span>}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg"><Activity className="text-emerald-600" size={22} /></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
             <button
               onClick={() => setSelectedApp('all')}
               className={"px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (selectedApp === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}
             >
               Global Aggregation
             </button>
             {appsList.map(app => (
               <button
                 key={app.name}
                 onClick={() => setSelectedApp(app.name)}
                 className={"px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors " + (selectedApp === app.name ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}
               >
                 {app.name}
               </button>
             ))}
          </div>

          {/* MAIN PANELS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pressure Index Leaderboard */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle>Pressure Index Matrix</CardTitle>
                <CardDescription>A compound algorithm measuring negative sentiment, wait times, and poor ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pressureChartData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      <Bar yAxisId="left" dataKey="pressure" name="Pressure Index (0-10)" fill={COLORS.pressure} radius={[4, 4, 0, 0]} maxBarSize={50} />
                      <Bar yAxisId="right" dataKey="wait" name="Avg. Wait Mentions (min)" fill={COLORS.wait} radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sentiment Donut */}
            <Card className="col-span-1">
               <CardHeader>
                 <CardTitle>Sentiment Breakdown</CardTitle>
                 <CardDescription>{selectedApp === 'all' ? 'All Applications' : selectedApp}</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="h-72 w-full mt-2">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={sentimentData}
                         cx="50%"
                         cy="50%"
                         innerRadius={60}
                         outerRadius={95}
                         paddingAngle={5}
                         dataKey="value"
                         stroke="none"
                         cornerRadius={5}
                       >
                         {sentimentData.map((entry, index) => (
                           <Cell key={index} fill={entry.fill} />
                         ))}
                       </Pie>
                       <Tooltip 
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       />
                       <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
               </CardContent>
            </Card>

            {/* GROQ AI REPORTING AREA */}
            <Card className="col-span-1 lg:col-span-3 border-2 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50">
              <CardHeader className="pb-3 border-b border-indigo-100/50">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
                         <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                         <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                         <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                   </div>
                   <div>
                     <CardTitle className="text-lg text-indigo-950">Executive Groq AI Synthesis</CardTitle>
                     <CardDescription>Deep NLP evaluation of raw review semantics</CardDescription>
                   </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedApp === 'all' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {appsList.map(app => (
                        <div key={app.name} className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm hover:shadow-md transition-shadow">
                           <h4 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">{app.name} — LP Index: {app.pressure.pressure_index}/10</h4>
                           <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-arabic" dir="rtl">
                             {app.ai_report === '[Groq key missing — set GROQ_API_KEY in .env]' || app.ai_report.startsWith('[Groq API Error') || app.ai_report.startsWith('[Groq Network Error') ? (
                               <span className="text-rose-500 font-medium italic text-left" dir="ltr">
                                 {app.ai_report.includes('429') ? '⚠️ LLaMA 3.3 Rate Limited — Try again in a few minutes' : '⚠️ LLaMA 3.3 Offline: Missing or Expired GROQ API Key'}
                               </span>
                             ) : app.ai_report}
                           </div>
                        </div>
                     ))}
                  </div>
                ) : currentApp && (
                  <div className="bg-white p-6 rounded-xl border border-indigo-50 shadow-sm max-w-4xl mx-auto">
                     <h4 className="font-bold text-xl text-slate-800 mb-4 border-b border-slate-100 pb-4">{currentApp.name} Analysis Report</h4>
                     <div className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed font-arabic" dir="rtl">
                        {currentApp.ai_report === '[Groq key missing — set GROQ_API_KEY in .env]' || currentApp.ai_report.startsWith('[Groq API Error') || currentApp.ai_report.startsWith('[Groq Network Error') ? (
                           <span className="text-rose-500 font-medium italic text-left block" dir="ltr">
                             {currentApp.ai_report.includes('429') ? '⚠️ LLaMA 3.3 Rate Limited — Try again in a few minutes' : '⚠️ LLaMA 3.3 Offline: Missing or Expired GROQ API Key'}
                           </span>
                        ) : currentApp.ai_report}
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RAW DATA LOG (Optional detail view) */}
            {currentApp && (
              <Card className="col-span-1 lg:col-span-3">
                 <CardHeader>
                   <CardTitle>Semantic Review Samples</CardTitle>
                   <CardDescription>Latest {currentApp.name} reviews driving the pressure index</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                       {currentApp.reviews.map((rev, idx) => (
                         <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                               <div className="flex gap-2 items-center">
                                  <span className="font-semibold text-slate-800 text-sm">{rev.author}</span>
                                  <span className="text-amber-500 text-xs">{'★'.repeat(rev.rating)}{'☆'.repeat(5-rev.rating)}</span>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700 capitalize">{rev.platform}</span>
                               </div>
                               <span className={"px-2 py-1 rounded text-xs font-medium " + (
                                 rev.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
                                 rev.sentiment === 'negative' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-800'
                               )}>
                                 {rev.sentiment}
                               </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1" dir="rtl">{rev.text}</p>
                            {rev.wait_minutes !== null && rev.wait_minutes > 0 ? (
                               <div className="mt-2 text-xs font-medium text-amber-700 flex items-center gap-1">
                                  <Clock size={12} /> Detected Wait Time: {rev.wait_minutes} mins
                               </div>
                            ) : null}
                         </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>
            )}

          </div>
        </>
      )}
    </div>
  );
}
