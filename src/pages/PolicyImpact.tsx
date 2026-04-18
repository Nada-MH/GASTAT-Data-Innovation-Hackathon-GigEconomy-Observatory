import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  TrendingDown, 
  ShieldCheck,
  Users
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const crisisData = [
  { week: 'W1', transport: 120, delivery: 80, freelance: 40 },
  { week: 'W2', transport: 110, delivery: 95, freelance: 45 },
  { week: 'W3', transport: 80, delivery: 130, freelance: 55 },
  { week: 'W4', transport: 60, delivery: 160, freelance: 70 },
  { week: 'W5', transport: 50, delivery: 180, freelance: 85 },
  { week: 'W6', transport: 45, delivery: 190, freelance: 90 },
];

const insuranceData = [
  { name: 'Insured (Official)', value: 245000, color: '#0d9488' },
  { name: 'Uninsured Gap', value: 495000, color: '#f59e0b' },
];

export function PolicyImpact() {
  const [simulationMode, setSimulationMode] = useState(false);
  const { t } = useLanguage();

  const insuranceData = [
    { name: t('chart.insurance.insured'), value: 245000, color: '#0d9488' },
    { name: t('chart.insurance.uninsured'), value: 495000, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('policy.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('policy.subtitle')}</p>
        </div>
        <button 
          onClick={() => setSimulationMode(!simulationMode)}
          className={`font-medium rounded-lg text-sm px-4 py-2.5 transition-colors flex items-center gap-2 ${
            simulationMode 
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300' 
              : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <Activity size={16} className={simulationMode ? 'text-amber-600 animate-pulse' : 'text-slate-400'} /> 
          {simulationMode ? t('button.exitcrisis') : t('button.entercrisis')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insurance Gap Tracker */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t('chart.insurance.title')}</CardTitle>
            <CardDescription>{t('chart.insurance.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={insuranceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {insuranceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('en-US').format(value as number)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-slate-900">67%</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{t('chart.insurance.gap')}</span>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">{t('alert.vulnerable')}</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('alert.vulnerable.desc')}
                  </p>
                </div>
              </div>
              <button className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <ShieldCheck size={16} /> {t('button.generateproposal')}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Crisis Response Mode */}
        <Card className={`col-span-1 lg:col-span-2 transition-all duration-500 ${simulationMode ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-100' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {simulationMode ? (
                  <><AlertTriangle className="text-amber-500" size={20} /> {t('crisis.pandemic')}</>
                ) : (
                  t('chart.crisis.title')
                )}
              </CardTitle>
              <CardDescription>
                {simulationMode 
                  ? t('crisis.simulated')
                  : t('crisis.historical')}
              </CardDescription>
            </div>
            {simulationMode && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">
                {t('crisis.active')}
              </span>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crisisData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTransport" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorDelivery" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorFreelance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="transport" name={t('sector.transport')} stroke="#94a3b8" fillOpacity={1} fill="url(#colorTransport)" />
                  <Area type="monotone" dataKey="delivery" name={t('sector.delivery')} stroke="#0d9488" fillOpacity={1} fill="url(#colorDelivery)" />
                  <Area type="monotone" dataKey="freelance" name={t('sector.freelance')} stroke="#3b82f6" fillOpacity={1} fill="url(#colorFreelance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {simulationMode && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <TrendingDown size={16} className="text-coral-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">{t('sector.transport')}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">-62%</div>
                  <div className="text-xs text-slate-500 mt-1">{t('crisis.transport.desc')}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Activity size={16} className="text-teal-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">{t('sector.delivery')}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">+137%</div>
                  <div className="text-xs text-slate-500 mt-1">{t('crisis.delivery.desc')}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Users size={16} className="text-blue-500" />
                    <span className="text-xs font-medium uppercase tracking-wider">{t('sector.freelance')}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">+125%</div>
                  <div className="text-xs text-slate-500 mt-1">{t('crisis.freelance.desc')}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
