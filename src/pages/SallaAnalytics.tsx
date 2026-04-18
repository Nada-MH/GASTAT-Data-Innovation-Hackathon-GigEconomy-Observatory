import React, { useMemo } from 'react';
import { RefreshCw, ShoppingBag, CheckCircle, XCircle, AlertTriangle, FileCheck, PieChart as PieChartIcon, BarChart as BarChartIcon, ShieldCheck, Download } from 'lucide-react';
import { useSallaAnalytics } from '../contexts/SallaAnalyticsContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

function Card({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 ${className}`}>{children}</div>;
}
function CardHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`px-6 pt-6 pb-2 ${className}`}>{children}</div>;
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">{children}</h3>;
}
function CardSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-slate-500 mt-1">{children}</p>;
}
function CardContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`px-6 pb-6 pt-2 ${className}`}>{children}</div>;
}

export function SallaAnalytics() {
  const { stores, isLoading, error, refreshData } = useSallaAnalytics();
  const { t } = useLanguage();

  const metrics = useMemo(() => {
    let total = stores.length;
    let active = 0;
    let inactive = 0;
    let maroofVerified = 0;
    let categoryMap: Record<string, number> = {};

    stores.forEach(store => {
      const isInactive = store.storeName.includes('مغلق') || store.storeName.includes('إطلاق');
      if (isInactive) {
         inactive++;
      } else {
         active++;
      }

      if (store.category) {
         categoryMap[store.category] = (categoryMap[store.category] || 0) + 1;
      }
      if (store.maroofUrl) {
         maroofVerified++;
      }
    });

    const categories = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const vitalityData = [
      { name: 'Active', count: active },
      { name: 'Inactive', count: inactive }
    ];

    return { total, active, inactive, categories, vitalityData, maroofVerified };
  }, [stores]);

  const exportToCSV = () => {
    const headers = ['Store Name,URL,Status,Category,Registration Type,Registration No,Maroof Verified'];
    const csvRows = stores.map(store => {
      const isInactive = store.storeName.includes('مغلق') || store.storeName.includes('إطلاق');
      const status = isInactive ? 'Inactive' : 'Active';
      const regType = store.documentType || 'None';
      const regNo = store.documentNumber || 'N/A';
      const isMaroof = store.maroofUrl ? 'Yes' : 'No';
      return `"${store.storeName}","${store.storeUrl}","${status}","${store.category}","${regType}","${regNo}","${isMaroof}"`;
    });
    
    const csvContent = headers.concat(csvRows).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'salla_stores_export.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const COLORS = ['#0f766e', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            E-Commerce Ecosystem
          </h2>
          <p className="text-slate-500 text-sm mt-1">Salla Platform Discovery & Vitality Observations</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportToCSV}
            disabled={stores.length === 0}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download size={16} className="text-slate-500" />
            <span className="text-sm font-medium">Export CSV</span>
          </button>
          
          <button 
            onClick={() => refreshData(true)}
            disabled={isLoading}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin opacity-80' : ''} />
            <span className="text-sm font-medium">{isLoading ? 'Running Scraper...' : 'Live Fetch Data'}</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-rose-500 mt-0.5" size={20} />
          <div>
            <h3 className="text-sm font-medium text-rose-800">Connection Error</h3>
            <p className="text-sm text-rose-600 mt-1">{error}</p>
            <p className="text-xs text-rose-500 mt-2">Error connecting to local DB. Please press "Live Fetch Data" to perform an initial sync!</p>
          </div>
        </div>
      ) : null}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <ShoppingBag className="text-teal-600 stroke-[1.5px]" size={24} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-500 mb-0.5">Total Discovered</p>
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{metrics.total}</h3>
          </div>
        </Card>
        
        <Card className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <CheckCircle className="text-blue-500 stroke-[1.5px]" size={24} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-500 mb-0.5">Active Stores</p>
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{metrics.active}</h3>
          </div>
        </Card>

        <Card className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <XCircle className="text-rose-500 stroke-[1.5px]" size={24} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-500 mb-0.5">Inactive/Closed</p>
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{metrics.inactive}</h3>
          </div>
        </Card>

        <Card className="px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="text-indigo-600 stroke-[1.5px]" size={24} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-slate-500 mb-0.5">Maroof Verified</p>
            <h3 className="text-2xl font-bold text-slate-900 leading-none">{metrics.maroofVerified}</h3>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <PieChartIcon size={18} className="text-teal-600" /> Top Categories
            </CardTitle>
            <CardSubtitle>Sector distribution of discovered stores</CardSubtitle>
          </CardHeader>
          <CardContent>
            {metrics.categories.length > 0 ? (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
                      {metrics.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 500, fontSize: '13px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '13px', color: '#64748b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-slate-400">
                Not enough category data
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <BarChartIcon size={18} className="text-blue-500" /> Platform Vitality
            </CardTitle>
            <CardSubtitle>Live vs Inactive stores count</CardSubtitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.vitalityData}
                  margin={{ top: 10, right: 30, left: -25, bottom: 0 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 13 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    tickCount={5}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 500 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {metrics.vitalityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Active' ? '#0ea5e9' : '#0ea5e9'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Table Row */}
      <Card>
          <CardHeader className="pb-4">
            <CardTitle>Recent Merchant Signups & Discovery</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] text-slate-400 font-medium bg-slate-50/50 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Store Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Registration</th>
                    <th className="px-6 py-4 text-right">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stores.slice(0, 8).map((store) => (
                    <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {store.storeName}
                          {store.maroofUrl && (
                            <a href={store.maroofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md text-[11px] font-bold border border-teal-200 transition-colors" title="Visit Maroof Page">
                              <ShieldCheck size={14} className="text-teal-600" />
                              <span>Maroof Page ↗</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         {(store.storeName.includes('مغلق') || store.storeName.includes('إطلاق')) 
                            ? <span className="inline-flex items-center text-xs font-medium text-slate-500">Inactive</span>
                            : <span className="inline-flex items-center text-xs font-medium text-slate-800">Active</span>
                         }
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {store.category || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {store.documentType === 'commercial' ? (
                          <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-max border border-indigo-100 font-medium">
                            <FileCheck size={14} /> CR: {store.documentNumber}
                          </span>
                        ) : store.documentType === 'freelance' ? (
                          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-max border border-amber-100 font-medium">
                            <FileCheck size={14} /> FL: {store.documentNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a href={store.storeUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 hover:underline text-xs">
                          Visit ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                  {stores.length === 0 && !isLoading && !error && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No stores locally synced yet. Press 'Live Fetch Data' above to fetch natively!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
