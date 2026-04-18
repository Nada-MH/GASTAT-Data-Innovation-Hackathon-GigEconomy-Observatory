import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAqarIntelligence, AqarListing, CityStats } from '../contexts/AqarIntelligenceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import {
  Home, Building2, Users, Star, 
  MapPin, Search, Filter, Download,
  RefreshCw, Loader2, Sparkles, TrendingUp,
  LayoutGrid, List, ArrowRight, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CITY_COLORS: Record<string, string> = {
  'Riyadh': '#4f46e5',
  'Jeddah': '#0ea5e9',
  'Dammam': '#10b981',
};

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

export function AqarIntelligence() {
  const { t, language } = useLanguage();
  const { data, isLoading, error, refreshData } = useAqarIntelligence();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredListings = useMemo(() => {
    if (!data) return [];
    return data.listings.filter(listing => {
      const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (listing.neighborhood?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      const matchesCity = cityFilter === 'All' || listing.city === cityFilter;
      return matchesSearch && matchesCity;
    });
  }, [data, searchTerm, cityFilter]);

  const cityChartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.cityBreakdown).map(([name, stats]) => {
      const cityStats = stats as CityStats;
      return {
        name,
        listings: cityStats.listings,
        hosts: cityStats.hosts,
        fill: CITY_COLORS[name] || '#64748b'
      };
    });
  }, [data]);

  const propertyTypeData = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.listings.forEach(l => {
      counts[l.propertyType] = (counts[l.propertyType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  const avgPrice = useMemo(() => {
    if (!data || data.listings.length === 0) return 0;
    const total = data.listings.reduce((sum, l) => sum + l.price, 0);
    return Math.round(total / data.listings.length);
  }, [data]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="bg-red-50 text-red-500 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <RefreshCw size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Data Synchronization Failed</h2>
          <p className="text-slate-500 max-w-xs mx-auto">{error}</p>
          <button 
            onClick={() => refreshData()}
            className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Building2 size={24} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              {t('aqar.title')}
            </h1>
          </div>
          <p className="text-slate-500 font-medium">{t('aqar.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button 
            onClick={() => refreshData()}
            disabled={isLoading}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            {t('aqar.sync')}
          </button>
          <button className="p-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: t('aqar.kpi.listings'), value: data?.totalListings || 0, icon: LayoutGrid, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: t('aqar.kpi.hosts'), value: data?.uniqueHosts || 0, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: t('aqar.kpi.superhosts'), value: data?.superhosts || 0, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: t('aqar.kpi.avgPrice'), value: `${avgPrice} SAR`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, idx) => (
          <Card key={idx} className="border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-transform">
            <CardContent className="p-8">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {isLoading ? <Loader2 className="animate-spin text-slate-200" /> : stat.value}
                  </h3>
                </div>
                <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl group-hover:rotate-12 transition-transform`}>
                  <stat.icon size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visualizations row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* City Distribution */}
        <Card className="lg:col-span-2 border-none shadow-2xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white">
          <CardHeader className="border-b border-slate-50 pb-6 px-8 pt-8">
            <CardTitle className="text-2xl font-black text-slate-900">Regional Footprint</CardTitle>
            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Supply distribution across key Saudi hubs</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-500" size={40} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityChartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                    />
                    <Bar dataKey="listings" radius={[12, 12, 0, 0]} maxBarSize={60}>
                      {cityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI Insight Card */}
        <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-2xl shadow-indigo-200 rounded-[40px] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
            <Sparkles size={180} />
          </div>
          <CardHeader className="border-none p-8">
            <CardTitle className="flex items-center gap-2 text-indigo-100 uppercase tracking-[0.2em] text-[10px] font-black">
              <Sparkles size={16} className="text-amber-400" />
              Strategic Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-0 relative z-10 flex flex-col h-full">
            <p className="text-xl font-bold leading-relaxed mb-8">
              "The short-term rental market in <span className="text-amber-300">Riyadh</span> is showing aggressive expansion near the Boulevard and North districts. Supply is outpacing hotel keys by <span className="text-indigo-200">2.4x</span> in premium zones."
            </p>
            
            <div className="mt-auto space-y-4">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Growth Leader</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Hittin District</span>
                  <span className="text-emerald-400 font-black">+18% MoM</span>
                </div>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Market Sentiment</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold">High Demand</span>
                  <TrendingUp className="text-indigo-200" size={16} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Listing Explorer */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Market Explorer</h2>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search neighborhood or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            
            <select 
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            >
              <option value="All">All Cities</option>
              <option value="Riyadh">Riyadh</option>
              <option value="Jeddah">Jeddah</option>
              <option value="Dammam">Dammam</option>
            </select>

            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredListings.slice(0, 15).map((listing, idx) => (
                // @ts-ignore - React key prop is reserved but linter is strict here
                <ListingCard key={listing.listingId} listing={listing} idx={idx} />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="table"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5">Property</th>
                      <th className="px-8 py-5">Location</th>
                      <th className="px-8 py-5">Price / Night</th>
                      <th className="px-8 py-5">Performance</th>
                      <th className="px-8 py-5">Host</th>
                      <th className="px-8 py-5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredListings.slice(0, 20).map((listing) => (
                      <tr key={listing.listingId} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{listing.title}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{listing.propertyType}</p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <MapPin size={12} className="text-slate-300" />
                            {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-slate-900 tabular-nums">{listing.price} SAR</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                             <span className="flex items-center gap-1 text-xs font-black text-amber-500">
                               <Star size={12} className="fill-amber-500" /> {listing.rating}
                             </span>
                             <span className="text-[10px] font-bold text-slate-400">({listing.reviewsCount} reviews)</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${listing.hostType === 'superhost' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                            {listing.hostType}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <a href={listing.url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm block w-max">
                            <ExternalLink size={14} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredListings.length === 0 && !isLoading && (
          <div className="py-24 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
              <Search size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900">No signals found</h3>
            <p className="text-slate-400 font-medium">Try adjusting your filters or search keywords.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const ListingCard: React.FC<{ listing: AqarListing; idx: number }> = ({ listing, idx }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden group hover:-translate-y-2 transition-all duration-500"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${listing.hostType === 'superhost' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            {listing.hostType}
          </div>
          <div className="flex items-center gap-1 text-xs font-black text-amber-500">
            <Star size={14} className="fill-amber-500" />
            {listing.rating}
          </div>
        </div>

        <h4 className="font-black text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 h-10">
          {listing.title}
        </h4>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6">
          <MapPin size={12} />
          {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}
        </div>

        <div className="flex items-end justify-between pt-6 border-t border-slate-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Starting From</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900">{listing.price}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">SAR</span>
            </div>
          </div>
          
          <a 
            href={listing.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10"
          >
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
