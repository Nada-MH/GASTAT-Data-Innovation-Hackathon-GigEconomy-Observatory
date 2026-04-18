/**
 * App Store Insights Page — Executive Decision-Maker View
 * App Store & Google Play analytics for gig economy platforms
 * Mirrors dashboardv2.py logic with executive-grade presentation
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppStore } from '../contexts/AppStoreContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Smartphone, Store, Users,
  Loader2, AlertCircle, X, Sparkles, ChevronDown, ChevronUp,
  Settings2, RefreshCw, FileDown, Apple, Crown, Activity,
} from 'lucide-react';
import type { EstimationParams } from '../types/appStore';
import { exportAppDataCSV } from '../services/appStoreApi';

const APP_COLORS: Record<string, string> = {
  'Uber Driver': '#276EF1', // Uber Blue
  'HungerStation': '#FFC244', // HungerStation Yellow
  'Jahez Driver': '#E41D2C', // Jahez Red
  'Jeeny Driver': '#F24949', // Jeeny Red/Orange
  'Bolt Driver': '#34D186', // Bolt Green
  'The Chefz': '#8E44AD', // Chefz Purple
  'Keeta Rider': '#FFB800', // Keeta Gold
  'ToYou Rep': '#6C5CE7', // ToYou Purple
  'Maraseel': '#00B894', // Maraseel/Mrsool Green
  'Noon Food Partner': '#FFE100', // Noon Yellow
  'Hemam Partner': '#0D9488', // Hemam Teal
  'Kaiian Driver': '#D946EF', // Kaiian Fuchsia 
};

const PIE_COLORS = [
  '#276EF1', '#FFC244', '#E41D2C', '#F24949', '#34D186', 
  '#8E44AD', '#FFB800', '#6C5CE7', '#00B894', '#FFE100'
];

export function AppStoreInsights() {
  const { t, language } = useLanguage();
  const { analytics, isLoading, error, params, fetchData, updateParams, clearError } = useAppStore();
  const [showConfig, setShowConfig] = useState(false);

  // Local slider state for live recalculation
  const [reviewRate, setReviewRate] = useState(params.reviewRate * 100);
  const [ordersPerDriver, setOrdersPerDriver] = useState(params.ordersPerDriver);
  const [activeRatio, setActiveRatio] = useState(params.activeRatio * 100);

  const handleParamChange = (field: string, value: number) => {
    let newParams: EstimationParams;
    switch (field) {
      case 'reviewRate':
        setReviewRate(value);
        newParams = { ...params, reviewRate: value / 100 };
        break;
      case 'ordersPerDriver':
        setOrdersPerDriver(value);
        newParams = { ...params, ordersPerDriver: value };
        break;
      case 'activeRatio':
        setActiveRatio(value);
        newParams = { ...params, activeRatio: value / 100 };
        break;
      default:
        return;
    }
    updateParams(newParams);
  };

  // Chart data
  const barChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.rows.map(r => ({
      app: r.app,
      'iOS Reviews': r.iosReviews,
      'Android Reviews': r.androidReviews,
    }));
  }, [analytics]);

  const activeDriversData = useMemo(() => {
    if (!analytics) return [];
    return analytics.rows.map(r => ({
      app: r.app,
      drivers: r.estimatedActiveDrivers,
      fill: APP_COLORS[r.app] || '#64748b',
    }));
  }, [analytics]);

  const pieData = useMemo(() => {
    if (!analytics) return [];
    return analytics.rows
      .filter(r => r.totalReviews > 0)
      .map((r, i) => ({
        name: r.app,
        value: r.totalReviews,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
  }, [analytics]);

  const scatterData = useMemo(() => {
    if (!analytics) return [];
    return analytics.rows
      .filter(r => r.totalReviews > 0)
      .map(r => ({
        app: r.app,
        iosShare: r.iosSharePercent,
        activeDrivers: r.estimatedActiveDrivers,
        totalReviews: r.totalReviews,
        fill: APP_COLORS[r.app] || '#64748b',
      }));
  }, [analytics]);

  // Auto-generated insights
  const insights = useMemo(() => {
    if (!analytics) return null;
    const sorted = [...analytics.rows].sort((a, b) => b.totalReviews - a.totalReviews);
    const topPlatform = sorted[0];
    const androidDominant = analytics.rows.filter(r => r.androidReviews > r.iosReviews);
    const iosOnlyApps = analytics.rows.filter(r => r.iosReviews > 0);

    return {
      topPlatform,
      androidDominant: androidDominant.length,
      totalPlatforms: analytics.rows.length,
      iosOnlyApps: iosOnlyApps.length,
      marketLeaderShare: analytics.totals.totalReviews > 0
        ? Math.round((topPlatform.totalReviews / analytics.totals.totalReviews) * 100)
        : 0,
    };
  }, [analytics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('apps.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('apps.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {analytics && (
            <>
              <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                <Activity size={12} className="text-teal-500" />
                {new Date(analytics.fetchedAt).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </span>
              <button onClick={() => exportAppDataCSV(analytics.rows)}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">
                <FileDown size={15} />
                CSV
              </button>
            </>
          )}
          <button onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all border ${showConfig ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
            <Settings2 size={15} />
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={fetchData} disabled={isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm px-5 py-2 transition-all shadow-sm shadow-blue-200">
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {isLoading ? t('apps.fetching') : t('apps.fetch')}
          </button>
        </div>
      </div>

      {/* Config Panel: Estimation Parameters */}
      {showConfig && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{t('apps.params.title')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-slate-700 font-medium">{t('apps.params.reviewRate')}</label>
                  <span className="text-sm font-bold text-blue-600">{reviewRate}%</span>
                </div>
                <input type="range" min="0.5" max="5" step="0.5" value={reviewRate}
                  onChange={(e) => handleParamChange('reviewRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>0.5%</span><span>5%</span></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-slate-700 font-medium">{t('apps.params.ordersPerDriver')}</label>
                  <span className="text-sm font-bold text-blue-600">{ordersPerDriver}</span>
                </div>
                <input type="range" min="5" max="30" step="1" value={ordersPerDriver}
                  onChange={(e) => handleParamChange('ordersPerDriver', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>5</span><span>30</span></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-slate-700 font-medium">{t('apps.params.activeRatio')}</label>
                  <span className="text-sm font-bold text-blue-600">{activeRatio}%</span>
                </div>
                <input type="range" min="5" max="30" step="1" value={activeRatio}
                  onChange={(e) => handleParamChange('activeRatio', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>5%</span><span>30%</span></div>
              </div>
            </div>
            <p className="text-[10px] text-amber-600 mt-4 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
              ⚠️ {t('apps.params.disclaimer')}
            </p>
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

      {/* Loading */}
      {isLoading && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-5 flex items-center gap-3">
            <Loader2 size={20} className="text-blue-600 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{t('apps.loading')}</p>
              <p className="text-xs text-slate-500">{t('apps.loadingDesc')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!analytics && !isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          {[
            { icon: Apple, color: 'bg-blue-50 text-blue-500', title: 'App Store', desc: t('apps.empty.ios') },
            { icon: Store, color: 'bg-green-50 text-green-500', title: 'Google Play', desc: t('apps.empty.android') },
            { icon: Users, color: 'bg-amber-50 text-amber-500', title: t('apps.empty.estimation'), desc: t('apps.empty.estimationDesc') },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-dashed border-slate-200 bg-slate-50/30">
                <CardContent className="p-8 text-center">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={22} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
          <div className="md:col-span-3 text-center py-4">
            <p className="text-sm text-slate-400 mb-3">{t('apps.empty.desc')}</p>
            <button onClick={fetchData}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm px-6 py-2.5 transition-all shadow-sm">
              <Sparkles size={16} />
              {t('apps.fetch')}
            </button>
          </div>
        </div>
      )}

      {/* ═══ INSIGHTS DASHBOARD ═══ */}
      {analytics && insights && !isLoading && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('apps.kpi.totalReviews')}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{analytics.totals.totalReviews.toLocaleString()}</h3>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-lg shrink-0"><Smartphone className="text-blue-600" size={20} /></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{t('apps.kpi.acrossStores')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('apps.kpi.activeDrivers')}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{analytics.totals.totalActiveDrivers.toLocaleString()}</h3>
                  </div>
                  <div className="p-2.5 bg-teal-50 rounded-lg shrink-0"><Users className="text-teal-600" size={20} /></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{t('apps.kpi.atRatio')} {Math.round(params.activeRatio * 100)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('apps.kpi.topPlatform')}</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1.5">{analytics.totals.topApp}</h3>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-lg shrink-0"><Crown className="text-amber-600" size={20} /></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  <span className="text-amber-600 font-semibold">{insights.marketLeaderShare}%</span> {t('apps.kpi.marketShare')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{t('apps.kpi.iosShare')}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">{analytics.totals.avgIosShare}%</h3>
                  </div>
                  <div className="p-2.5 bg-indigo-50 rounded-lg shrink-0"><Apple className="text-indigo-600" size={20} /></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{t('apps.kpi.iosDesc')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Reviews by Platform + Key Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('apps.chart.reviewsByPlatform')}</CardTitle>
                <CardDescription>{t('apps.chart.reviewsByPlatformDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="app" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }} formatter={(v: number) => v.toLocaleString()} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                      <Bar dataKey="iOS Reviews" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="Android Reviews" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles size={16} className="text-amber-500" />{t('apps.keyInsights')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown size={13} className="text-blue-600" />
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{t('apps.insight.leader')}</span>
                    </div>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <strong>{insights.topPlatform.app}</strong> {t('apps.insight.leaderDesc')} <strong>{insights.topPlatform.totalReviews.toLocaleString()}</strong> {t('apps.insight.reviews')} ({insights.marketLeaderShare}% {t('apps.insight.share')})
                    </p>
                  </div>

                  <div className="p-3 bg-green-50/70 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Store size={13} className="text-green-600" />
                      <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{t('apps.insight.android')}</span>
                    </div>
                    <p className="text-xs text-green-800 leading-relaxed">
                      {insights.androidDominant}/{insights.totalPlatforms} {t('apps.insight.androidDesc')}
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Apple size={13} className="text-indigo-600" />
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">{t('apps.insight.ios')}</span>
                    </div>
                    <p className="text-xs text-indigo-800 leading-relaxed">
                      {t('apps.insight.iosDesc')} <strong>{analytics.totals.avgIosShare}%</strong>. {insights.iosOnlyApps}/{insights.totalPlatforms} {t('apps.insight.iosApps')}
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50/70 rounded-lg border border-teal-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={13} className="text-teal-600" />
                      <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">{t('apps.insight.workforce')}</span>
                    </div>
                    <p className="text-xs text-teal-800 leading-relaxed">
                      {t('apps.insight.workforceDesc')} <strong>{analytics.totals.totalActiveDrivers.toLocaleString()}</strong> {t('apps.insight.activeDrivers')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Active Drivers + Review Distribution Pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('apps.chart.activeDrivers')}</CardTitle>
                <CardDescription>{t('apps.chart.activeDriversDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activeDriversData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="app" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }} formatter={(v: number) => v.toLocaleString()} />
                      <Bar dataKey="drivers" name={t('apps.chart.activeDrivers')} radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {activeDriversData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('apps.chart.reviewDist')}</CardTitle>
                <CardDescription>{t('apps.chart.reviewDistDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)', fontSize: '12px' }} formatter={(v: number) => v.toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center space-y-3">
                    {pieData.map((entry, i) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-slate-700 flex-1">{entry.name}</span>
                        <span className="text-xs font-bold text-slate-900 tabular-nums">{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 4: Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('apps.table.title')}</CardTitle>
              <CardDescription>{t('apps.table.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('apps.table.app')}</th>
                      <th className="px-4 py-3 font-medium text-right">iOS</th>
                      <th className="px-4 py-3 font-medium text-right">Android</th>
                      <th className="px-4 py-3 font-medium text-right">{t('apps.table.total')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('apps.table.transactions')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('apps.table.drivers')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('apps.table.active')}</th>
                      <th className="px-4 py-3 font-medium text-right">iOS %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.rows.map((row, i) => (
                      <tr key={row.app} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: APP_COLORS[row.app] || '#64748b' }} />
                            <span className="font-medium text-slate-900">{row.app}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{row.iosReviews.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{row.androidReviews.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{row.totalReviews.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{row.estimatedTransactions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{row.estimatedDriversTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            {row.estimatedActiveDrivers.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{row.iosSharePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3 font-bold text-slate-800">{t('apps.table.totals')}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{analytics.rows.reduce((s, r) => s + r.iosReviews, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{analytics.rows.reduce((s, r) => s + r.androidReviews, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{analytics.totals.totalReviews.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{analytics.rows.reduce((s, r) => s + r.estimatedTransactions, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{analytics.rows.reduce((s, r) => s + r.estimatedDriversTotal, 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-teal-700">{analytics.totals.totalActiveDrivers.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">{analytics.totals.avgIosShare}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
