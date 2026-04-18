/**
 * Google Trends Insights Page — Executive Decision-Maker View
 * Presents analyzed Google Trends data as actionable insights
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useGoogleTrends } from '../contexts/GoogleTrendsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Search,
  MapPin,
  Rocket,
  Target,
  Play,
  Download,
  Settings2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Globe2,
  BarChart3,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileDown,
} from 'lucide-react';
import {
  DEFAULT_KEYWORDS,
  GEO_OPTIONS,
  TIME_RANGE_OPTIONS,
} from '../types/googleTrends';
import type { GeoOption, TimeRangeOption } from '../types/googleTrends';
import { exportToCSV } from '../services/googleTrendsApi';

const CHART_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const REGION_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

export function GoogleTrendsInsights() {
  const { t, language } = useLanguage();
  const {
    trendsData,
    lastUpdated,
    isLoading,
    progress,
    progressMessage,
    error,
    runAnalysis,
    clearError,
  } = useGoogleTrends();

  const [showConfig, setShowConfig] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([...DEFAULT_KEYWORDS]);
  const [newKeyword, setNewKeyword] = useState('');
  const [geo, setGeo] = useState<GeoOption>('SA');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('today 3-m');

  // Derived insights from data
  const insights = useMemo(() => {
    if (!trendsData) return null;

    const sortedTrends = [...trendsData.trendScores].sort((a, b) => b.trend_score - a.trend_score);
    const topKeyword = sortedTrends[0];
    const lowestKeyword = sortedTrends[sortedTrends.length - 1];

    const sortedIntent = [...trendsData.workIntentAnalysis].sort((a, b) => b.Intent_Score - a.Intent_Score);
    const topIntent = sortedIntent[0];

    const risingCount = trendsData.risingQueries.length;
    const breakoutCount = trendsData.risingQueries.filter(q => q.growth === 'Breakout').length;

    // Top region per keyword
    const regionsByKeyword: Record<string, { region: string; score: number }> = {};
    for (const r of trendsData.regions) {
      if (!regionsByKeyword[r.keyword] || r.score > regionsByKeyword[r.keyword].score) {
        regionsByKeyword[r.keyword] = { region: r.region, score: r.score };
      }
    }

    // Aggregate regions
    const regionAgg: Record<string, number> = {};
    for (const r of trendsData.regions) {
      regionAgg[r.region] = (regionAgg[r.region] || 0) + r.score;
    }
    const topRegions = Object.entries(regionAgg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([region, score]) => ({ region, score }));

    const dominantRegion = topRegions[0];

    // Average trend score
    const avgTrend = sortedTrends.reduce((sum, t) => sum + t.trend_score, 0) / sortedTrends.length;

    return {
      topKeyword,
      lowestKeyword,
      topIntent,
      risingCount,
      breakoutCount,
      regionsByKeyword,
      topRegions,
      dominantRegion,
      avgTrend: Math.round(avgTrend * 10) / 10,
      sortedTrends,
      sortedIntent,
      totalKeywords: sortedTrends.length,
      totalQueries: trendsData.topQueries.length,
    };
  }, [trendsData]);

  const handleRunAnalysis = () => {
    if (keywords.length === 0) return;
    runAnalysis(keywords, geo, timeRange);
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleExportAll = () => {
    if (!trendsData) return;
    exportToCSV(trendsData.trendScores, 'trend_scores.csv');
    setTimeout(() => exportToCSV(trendsData.regions, 'regions_interest.csv'), 200);
    setTimeout(() => exportToCSV(trendsData.topQueries, 'top_queries.csv'), 400);
    setTimeout(() => exportToCSV(trendsData.risingQueries, 'rising_queries.csv'), 600);
    setTimeout(() => exportToCSV(trendsData.workIntentAnalysis, 'work_intent_analysis.csv'), 800);
  };

  const geoLabel = GEO_OPTIONS.find(g => g.value === geo);
  const timeLabel = TIME_RANGE_OPTIONS.find(t => t.value === timeRange);

  // Radar chart data for intent
  const radarData = useMemo(() => {
    if (!trendsData) return [];
    return trendsData.workIntentAnalysis.map(item => ({
      keyword: item.Keyword.length > 12 ? item.Keyword.slice(0, 12) + '…' : item.Keyword,
      fullKeyword: item.Keyword,
      intentScore: item.Intent_Score,
      relatedQueries: item.Related_Query_Count * 10,
      searchDepth: item.Total_Search_Results,
    }));
  }, [trendsData]);

  // Pie chart data for region distribution
  const pieData = useMemo(() => {
    if (!insights) return [];
    return insights.topRegions.map((r, i) => ({
      name: r.region,
      value: r.score,
      color: REGION_COLORS[i % REGION_COLORS.length],
    }));
  }, [insights]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('trends.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('trends.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {lastUpdated && (
            <span className="text-xs text-slate-400 flex items-center gap-1 mr-2">
              <CheckCircle2 size={12} className="text-teal-500" />
              {new Date(lastUpdated).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
            </span>
          )}
          {trendsData && (
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <FileDown size={15} />
              {t('export.report')}
            </button>
          )}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all border ${
              showConfig
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings2 size={15} />
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={handleRunAnalysis}
            disabled={isLoading || keywords.length === 0}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm px-5 py-2 transition-all shadow-sm shadow-teal-200"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {isLoading ? t('trends.running') : t('trends.run')}
          </button>
        </div>
      </div>

      {/* Collapsible Config */}
      {showConfig && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {t('trends.keywords')}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-700 font-medium">
                      {kw}
                      <button onClick={() => handleRemoveKeyword(kw)} className="text-slate-300 hover:text-rose-500 transition-colors ml-0.5">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder={t('trends.addKeyword')} dir="auto"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
                  />
                  <button onClick={handleAddKeyword} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('trends.region')}</label>
                <select value={geo} onChange={(e) => setGeo(e.target.value as GeoOption)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-200 outline-none">
                  {GEO_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{language === 'ar' ? opt.labelAr : opt.label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t('trends.timeRange')}</label>
                <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRangeOption)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-teal-200 outline-none">
                  {TIME_RANGE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{language === 'ar' ? opt.labelAr : opt.label}</option>))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {isLoading && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-teal-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 size={16} className="text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{progressMessage}</p>
                <p className="text-xs text-slate-500">{t('trends.progressNote')}</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <p className="text-sm text-rose-700 flex-1">{error}</p>
            <button onClick={clearError} className="text-rose-400 hover:text-rose-600"><X size={16} /></button>
          </CardContent>
        </Card>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!trendsData && !isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          {[
            { icon: TrendingUp, color: 'teal', title: t('trends.tab.scores'), desc: t('trends.scores.desc') },
            { icon: Globe2, color: 'blue', title: t('trends.tab.regions'), desc: t('trends.regions.desc') },
            { icon: Target, color: 'amber', title: t('trends.tab.intent'), desc: t('trends.intent.desc') },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-dashed border-slate-200 bg-slate-50/30">
                <CardContent className="p-8 text-center">
                  <div className={`w-12 h-12 rounded-xl bg-${item.color}-50 flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={22} className={`text-${item.color}-500`} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
          <div className="md:col-span-3 text-center py-4">
            <p className="text-sm text-slate-400 mb-3">{t('trends.empty.desc')}</p>
            <button
              onClick={() => { setShowConfig(true); handleRunAnalysis(); }}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm px-6 py-2.5 transition-all shadow-sm"
            >
              <Sparkles size={16} />
              {t('trends.run')}
            </button>
          </div>
        </div>
      )}

      {/* ═══ INSIGHTS DASHBOARD ═══ */}
      {trendsData && insights && !isLoading && (
        <>
          {/* ── KPI Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Top Keyword */}
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('trends.kpi.topKeyword')}</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-1.5 truncate" dir="auto" title={insights.topKeyword?.keyword}>
                      {insights.topKeyword?.keyword || '—'}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-teal-50 rounded-lg shrink-0">
                    <TrendingUp className="text-teal-600" size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center text-sm">
                  <span className="flex items-center text-teal-600 font-semibold">
                    <ArrowUpRight size={14} className="mr-0.5" />
                    {insights.topKeyword?.trend_score}
                  </span>
                  <span className="text-slate-400 ml-2 text-xs">{t('trends.kpi.searchIndex')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dominant Region */}
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('trends.kpi.topRegion')}</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-1.5 truncate">
                      {insights.dominantRegion?.region || '—'}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
                    <Globe2 className="text-blue-600" size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center text-sm">
                  <span className="flex items-center text-blue-600 font-semibold">
                    {insights.dominantRegion?.score || 0}
                  </span>
                  <span className="text-slate-400 ml-2 text-xs">{t('trends.kpi.aggregateScore')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Rising Signals */}
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('trends.kpi.risingSignals')}</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-1.5">
                      {insights.risingCount}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-rose-50 rounded-lg shrink-0">
                    <Rocket className="text-rose-500" size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center text-sm">
                  {insights.breakoutCount > 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <Zap size={10} className="mr-1" />
                      {insights.breakoutCount} Breakout
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">{t('trends.kpi.noBreakout')}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Highest Intent */}
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('trends.kpi.highestIntent')}</p>
                    <h3 className="text-lg font-bold text-slate-900 mt-1.5 truncate" dir="auto" title={insights.topIntent?.Keyword}>
                      {insights.topIntent?.Keyword || '—'}
                    </h3>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-lg shrink-0">
                    <Target className="text-amber-600" size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center text-sm">
                  <span className="flex items-center text-amber-600 font-semibold">
                    {insights.topIntent?.Intent_Score || 0}
                  </span>
                  <span className="text-slate-400 ml-2 text-xs">{t('trends.kpi.intentScore')}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Trend Scores Bar + Key Insights Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Score Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('trends.scores.title')}</CardTitle>
                <CardDescription>{t('trends.scores.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.sortedTrends} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
                      <YAxis type="category" dataKey="keyword" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 11 }} width={130} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }}
                        formatter={(value: number) => [`${value} / 100`, t('trends.scores.label')]}
                      />
                      <Bar dataKey="trend_score" name={t('trends.scores.label')} radius={[0, 6, 6, 0]} maxBarSize={24}>
                        {insights.sortedTrends.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Key Insights Auto-Generated */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  {t('trends.keyInsights')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Insight 1: Top Keyword */}
                  <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={13} className="text-teal-600" />
                      <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">{t('trends.insight.dominant')}</span>
                    </div>
                    <p className="text-xs text-teal-800 leading-relaxed" dir="auto">
                      <strong>"{insights.topKeyword?.keyword}"</strong> {t('trends.insight.dominantDesc')} <strong>{insights.topKeyword?.trend_score}/100</strong>
                    </p>
                  </div>

                  {/* Insight 2: Rising */}
                  {insights.breakoutCount > 0 && (
                    <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={13} className="text-rose-500" />
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">{t('trends.insight.breakout')}</span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed" dir="auto">
                        {insights.breakoutCount} {t('trends.insight.breakoutDesc')}
                        {trendsData.risingQueries.filter(q => q.growth === 'Breakout').slice(0, 2).map((q, i) => (
                          <span key={i} className="inline-block mx-1 px-1.5 py-0.5 bg-white rounded text-[10px] font-semibold border border-rose-200">
                            {q.rising_query}
                          </span>
                        ))}
                      </p>
                    </div>
                  )}

                  {/* Insight 3: Regional Concentration */}
                  {insights.dominantRegion && (
                    <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe2 size={13} className="text-blue-600" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{t('trends.insight.regional')}</span>
                      </div>
                      <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>{insights.dominantRegion.region}</strong> {t('trends.insight.regionalDesc')}
                      </p>
                    </div>
                  )}

                  {/* Insight 4: Intent */}
                  <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={13} className="text-amber-600" />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{t('trends.insight.intent')}</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed" dir="auto">
                      <strong>"{insights.topIntent?.Keyword}"</strong> {t('trends.insight.intentDesc')} <strong>{insights.topIntent?.Intent_Score}</strong>
                    </p>
                  </div>

                  {/* Insight 5: Coverage */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 size={13} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{t('trends.insight.coverage')}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {insights.totalKeywords} {t('trends.insight.coverageDesc1')} · {insights.totalQueries} {t('trends.insight.coverageDesc2')} · {insights.topRegions.length} {t('trends.insight.coverageDesc3')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 3: Regional Distribution + Intent Radar ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regional Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('trends.regions.title')}</CardTitle>
                <CardDescription>{t('trends.regions.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center space-y-2">
                    {insights.topRegions.map((r, i) => (
                      <div key={r.region} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }} />
                        <span className="text-xs text-slate-700 flex-1 truncate">{r.region}</span>
                        <span className="text-xs font-semibold text-slate-900 tabular-nums">{r.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intent Score by Keyword */}
            <Card>
              <CardHeader>
                <CardTitle>{t('trends.intent.title')}</CardTitle>
                <CardDescription>{t('trends.intent.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="keyword" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Radar name={t('trends.intent.score')} dataKey="intentScore" stroke="#0d9488" fill="#0d9488" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name={t('trends.intent.searchResults')} dataKey="searchDepth" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 4: Rising Queries + Top Related ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rising Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket size={16} className="text-rose-500" />
                  {t('trends.rising.title')}
                </CardTitle>
                <CardDescription>{t('trends.rising.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsData.risingQueries.length > 0 ? (
                  <div className="space-y-2">
                    {trendsData.risingQueries.map((item, i) => (
                      <div key={`${item.keyword}-${item.rising_query}-${i}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/80 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate" dir="auto">{item.rising_query}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5" dir="auto">{item.keyword}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ml-3 ${
                          item.growth === 'Breakout'
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.growth === 'Breakout' && <Zap size={10} className="mr-1" />}
                          {item.growth}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">{t('trends.noData')}</div>
                )}
              </CardContent>
            </Card>

            {/* Top Related Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search size={16} className="text-blue-500" />
                  {t('trends.queries.title')}
                </CardTitle>
                <CardDescription>{t('trends.queries.desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsData.topQueries.length > 0 ? (
                  <div className="space-y-2">
                    {trendsData.topQueries.slice(0, 8).map((item, i) => (
                      <div key={`${item.keyword}-${item.query}-${i}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/80 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate" dir="auto">{item.query}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5" dir="auto">{item.keyword}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.score}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-6 text-right tabular-nums">{item.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-slate-400">{t('trends.noData')}</div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
