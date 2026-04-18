import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Store,
  RefreshCw,
  Download,
  Star,
  Award,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Grid3X3,
  List,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMaroofAnalytics, type MaroofStore } from '../contexts/MaroofAnalyticsContext';
import { useLanguage } from '../contexts/LanguageContext';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

function KpiCard({ label, value, icon: Icon, color, delay }: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white rounded-2xl p-5 border border-slate-200 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </motion.div>
  );
}

export function MaroofRegistryInsights() {
  const { data, isLoading, error, refreshData } = useMaroofAnalytics();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredStores = useMemo(() => {
    if (!data) return [];
    return data.stores.filter((store: MaroofStore) => {
      const matchesSearch = searchQuery === '' ||
        (store.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' ||
        store.business_type_name === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [data, searchQuery, categoryFilter]);

  const categoryChartData = useMemo(() => {
    if (!data) return [];
    return data.topCategories.slice(0, 8).map(c => ({
      name: c.name.length > 16 ? c.name.substring(0, 14) + '…' : c.name,
      fullName: c.name,
      count: c.count,
    }));
  }, [data]);

  const certPieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Gold (CR)', value: data.goldStores },
      { name: 'Silver (FL)', value: data.silverStores },
      { name: 'Other', value: data.totalStores - data.goldStores - data.silverStores },
    ].filter(d => d.value > 0);
  }, [data]);

  const handleSync = async () => {
    await refreshData();
  };

  const handleExport = () => {
    if (!data) return;
    const headers = ['ID', 'Name', 'Category', 'Rating', 'Reviews', 'Certification', 'URL'];
    const csv = '\uFEFF' + headers.join(',') + '\n' +
      data.stores.map(s =>
        `${s.id},"${s.display_name}","${s.business_type_name || ''}",${s.rating},${s.total_reviews},${s.certification_status === 2 ? 'Gold' : 'Silver'},${s.store_url}`
      ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'maroof_stores.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Failed to Load Maroof Data</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={handleSync} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Store size={24} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('maroof.title')}</h1>
            <p className="text-sm text-slate-500">{t('maroof.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSync}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium text-sm shadow-lg shadow-indigo-200"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Syncing…' : t('maroof.sync')}
          </motion.button>
          <button onClick={handleExport} disabled={!data} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50">
            <Download size={16} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !data && (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw size={36} className="text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Loading Maroof Registry data…</p>
          <p className="text-slate-400 text-sm mt-1">This may take a moment for large datasets.</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label={t('maroof.kpi.totalStores')} value={data.totalStores.toLocaleString()} icon={Store} color="bg-indigo-500" delay={0} />
            <KpiCard label={t('maroof.kpi.goldStores')} value={data.goldStores.toLocaleString()} icon={Award} color="bg-amber-500" delay={0.1} />
            <KpiCard label={t('maroof.kpi.silverStores')} value={data.silverStores.toLocaleString()} icon={ShieldCheck} color="bg-slate-500" delay={0.2} />
            <KpiCard label={t('maroof.kpi.avgRating')} value={data.avgRating.toFixed(1)} icon={Star} color="bg-emerald-500" delay={0.3} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200"
            >
              <h3 className="font-bold text-slate-900 mb-1">{t('maroof.chart.categories')}</h3>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">{t('maroof.chart.categoriesSub')}</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), 'Stores']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {categoryChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Certification breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 border border-slate-200"
            >
              <h3 className="font-bold text-slate-900 mb-1">{t('maroof.chart.certification')}</h3>
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">{t('maroof.chart.certificationSub')}</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={certPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {certPieData.map((_entry, index) => (
                        <Cell key={`cert-${index}`} fill={['#f59e0b', '#94a3b8', '#e2e8f0'][index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Strategic Intelligence Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white"
          >
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={18} className="text-indigo-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Strategic Intelligence</span>
            </div>
            <p className="text-lg leading-relaxed opacity-90">
              "The Saudi e-commerce ecosystem on Maroof features <span className="font-bold text-white">{data.totalStores.toLocaleString()}</span> registered stores with an average rating of <span className="font-bold text-amber-300">{data.avgRating.toFixed(1)}★</span>. {data.goldStores > data.silverStores
                ? `Commercial Register (Gold) certification dominates at ${Math.round((data.goldStores / data.totalStores) * 100)}%, reflecting a more formalized market.`
                : `Freelance (Silver) certification represents ${Math.round((data.silverStores / data.totalStores) * 100)}% of actors, indicating a vibrant informal micro-commerce layer.`}"
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white/10 rounded-xl p-3">
                <span className="text-xs uppercase font-semibold text-indigo-200">Top Category</span>
                <p className="font-bold text-sm mt-1">{data.topCategories[0]?.name || '—'}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <span className="text-xs uppercase font-semibold text-indigo-200">Total Reviews</span>
                <p className="font-bold text-sm mt-1">{data.totalReviews.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          {/* Listing Explorer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl border border-slate-200"
          >
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Store Explorer</h3>
                <p className="text-xs text-slate-400">
                  Showing {filteredStores.length} of {data.totalStores.toLocaleString()} registered stores
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search stores…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 w-48"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="all">All Categories</option>
                  {data.topCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name} ({cat.count})</option>
                  ))}
                </select>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <List size={16} />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <Grid3X3 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Store</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Category</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Rating</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Reviews</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Cert</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStores.slice(0, 50).map((store: MaroofStore) => (
                      <tr key={store.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {store.image_url ? (
                              <img src={store.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Store size={14} className="text-indigo-500" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{store.display_name}</p>
                              {store.name && store.name !== store.display_name && (
                                <p className="text-xs text-slate-400 truncate max-w-[200px]">{store.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{store.business_type_name || '—'}</td>
                        <td className="px-5 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            {store.rating}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-sm text-slate-600">{store.total_reviews}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${store.certification_status === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {store.certification_status === 2 ? 'Gold' : 'Silver'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <a href={store.store_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700">
                            <ExternalLink size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredStores.length > 50 && (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Showing 50 of {filteredStores.length} results. Use search to narrow down.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStores.slice(0, 30).map((store: MaroofStore) => (
                  <a
                    key={store.id}
                    href={store.store_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {store.image_url ? (
                        <img src={store.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Store size={18} className="text-indigo-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{store.display_name}</p>
                        <p className="text-xs text-slate-400">{store.business_type_name || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {store.rating} ({store.total_reviews})
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${store.certification_status === 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                        {store.certification_status === 2 ? 'Gold' : 'Silver'}
                      </span>
                    </div>
                  </a>
                ))}
                {filteredStores.length > 30 && (
                  <div className="col-span-full text-center text-xs text-slate-400 py-2">
                    Showing 30 of {filteredStores.length} results.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
