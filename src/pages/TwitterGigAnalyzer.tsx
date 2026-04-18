import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTwitterAnalytics } from '../contexts/TwitterAnalyticsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  MessageSquare, 
  RefreshCw, 
  Loader2, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  BrainCircuit,
  MessageCircle
} from 'lucide-react';

const COLORS = ['#10b981', '#f43f5e', '#94a3b8']; // Green, Red, Gray

export function TwitterGigAnalyzer() {
  const { t } = useLanguage();
  const { data, isLoading, error, timestamp, refreshData } = useTwitterAnalytics();
  
  const [hashtagInput, setHashtagInput] = useState('سائق أوبر, هنقرستيشن, بولت السعودية');
  const [feedSort, setFeedSort] = useState<'latest' | 'engagement' | 'negative' | 'positive'>('latest');
  
  const handleRefresh = () => {
    const customTags = hashtagInput.split(',').map(s => s.trim()).filter(s => s);
    // Send top 50 items to keep requests fast and reliable
    refreshData(customTags.length > 0 ? customTags : undefined, 50);
  };

  const sentimentData = data.stats ? [
    { name: 'Positive', value: data.stats.pos_pct },
    { name: 'Negative', value: data.stats.neg_pct },
    { name: 'Neutral', value: data.stats.neu_pct }
  ] : [];

  const renderMarkdownText = (text: string) => {
    if (!text) return { __html: '' };
    let html = text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      .replace(/\n- (.*?)(?=\n|$)/g, '<br/>&bull; $1')
      // Numbered lists
      .replace(/\n\d+\. (.*?)(?=\n|$)/g, '<br/>&bull; $1')
      // Paragraphs
      .replace(/\n\n/g, '<br/><br/>')
      // Line breaks
      .replace(/\n/g, '<br/>');
    return { __html: html };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="text-blue-500" /> X / Twitter Gig Analyzer
          </h2>
          <p className="text-slate-500 text-sm mt-1">Real-time sentiment and workforce pressure extraction from social streams.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            className="flex-1 sm:w-64 bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            placeholder="Comma separated hashtags..."
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
          />
          <button 
            onClick={handleRefresh} 
            disabled={isLoading}
            className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 min-w-[140px]"
          >
            {isLoading ? (
              <><Loader2 size={16} className="mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><RefreshCw size={16} className="mr-2" /> Sync X Data</>
            )}
          </button>
        </div>
      </div>
      
      {timestamp && !isLoading && (
         <div className="text-xs text-slate-400 text-right">
           Last synced: {new Date(timestamp).toLocaleString()}
         </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          Failed to fetch Twitter data: {error}
        </div>
      )}

      {data.stats ? (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-500">Analyzed Tweets</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-slate-900">{data.stats.total}</h3>
                  <MessageCircle size={16} className="text-slate-400 mb-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-500">Workforce Pressure Index</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className={`text-3xl font-bold ${data.stats.pressure_idx >= 7 ? 'text-red-600' : 'text-amber-500'}`}>
                    {data.stats.pressure_idx}/10
                  </h3>
                  <AlertTriangle size={16} className={`${data.stats.pressure_idx >= 7 ? 'text-red-600' : 'text-amber-500'} mb-1`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-500">Average Engagement</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-slate-900">{data.stats.avg_likes}</h3>
                  <span className="text-sm text-slate-500 mb-1">Likes</span>
                  <TrendingUp size={16} className="text-emerald-500 mb-1 ml-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-5 flex flex-col justify-center">
                <p className="text-sm font-medium text-slate-500">Sentiment Skew</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-3xl font-bold text-slate-900">{data.stats.neg_pct}%</h3>
                  <span className="text-sm text-slate-500 mb-1">Negative</span>
                  <TrendingDown size={16} className="text-rose-500 mb-1 ml-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sentiment Pie Chart */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Sentiment Snapshot</CardTitle>
                <CardDescription>Automated sentiment parsing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Groq AI Analysis */}
            <Card className="col-span-1 lg:col-span-2 shadow-md border-blue-100">
              <CardHeader className="bg-blue-50/50 border-b border-blue-50 rounded-t-xl pb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="text-blue-600" size={20} />
                  <CardTitle className="text-blue-900 text-lg">Groq Generative Analysis</CardTitle>
                </div>
                <CardDescription className="text-blue-600/70 text-xs">Deep context extraction powered by Llama 3.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 h-[400px] overflow-y-auto custom-scrollbar">
                <div 
                  className="prose prose-sm prose-slate max-w-none 
                   prose-headings:text-slate-800 prose-headings:font-bold 
                   prose-h3:text-blue-800 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
                   prose-p:text-slate-600 prose-p:leading-relaxed
                   prose-li:text-slate-600 prose-strong:text-slate-800 text-right leading-relaxed" 
                  dir="rtl"
                  dangerouslySetInnerHTML={renderMarkdownText(data.ai_report || '*Processing AI Insights...*')}
                />
              </CardContent>
            </Card>
          </div>

          {/* Raw Feed Snippets */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Raw Gig Worker Feed</CardTitle>
                <CardDescription>Sampled X activity fueling the data above.</CardDescription>
              </div>
              <select 
                className="bg-white border border-slate-200 text-sm text-slate-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer"
                value={feedSort}
                onChange={(e) => setFeedSort(e.target.value as any)}
              >
                <option value="latest">Sort by: Latest Time</option>
                <option value="engagement">Sort by: Highest Engagement</option>
                <option value="negative">Sort by: Negative Sentiment first</option>
                <option value="positive">Sort by: Positive Sentiment first</option>
              </select>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {[...data.tweets].sort((a, b) => {
                  if (feedSort === 'engagement') return (b.likes + b.retweets + b.views) - (a.likes + a.retweets + a.views);
                  if (feedSort === 'negative') {
                    if (a.sentiment === 'negative' && b.sentiment !== 'negative') return -1;
                    if (b.sentiment === 'negative' && a.sentiment !== 'negative') return 1;
                    return 0;
                  }
                  if (feedSort === 'positive') {
                    if (a.sentiment === 'positive' && b.sentiment !== 'positive') return -1;
                    if (b.sentiment === 'positive' && a.sentiment !== 'positive') return 1;
                    return 0;
                  }
                  return 0; // 'latest' is the default server sort
                }).slice(0, 30).map((tweet, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors text-right" dir="rtl">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tweet.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                        tweet.sentiment === 'negative' ? 'bg-rose-100 text-rose-700' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {tweet.sentiment.toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-slate-800">@{tweet.author}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2 leading-relaxed">{tweet.text}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">♡ {tweet.likes.toLocaleString()}</span>
                      <span className="flex items-center gap-1">↺ {tweet.retweets.toLocaleString()}</span>
                      <span className="flex items-center gap-1">👁 {tweet.views.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-2 shadow-none bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center h-64 text-slate-400">
            <MessageSquare size={48} className="mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600 mb-1">No Data Mined Yet</h3>
            <p className="text-sm text-center max-w-sm mb-4">
              Enter your desired hashtags above and click Sync to dispatch the Apify Twitter actor and analyze the Saudi Gig Economy footprint.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
