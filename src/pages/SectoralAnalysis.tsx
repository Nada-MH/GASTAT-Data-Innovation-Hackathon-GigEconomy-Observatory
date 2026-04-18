import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useLinkedInAnalytics } from '../contexts/LinkedInAnalyticsContext';
import { useSallaAnalytics } from '../contexts/SallaAnalyticsContext';
import { useMapAnalytics } from '../contexts/MapAnalyticsContext';
import { useAppStore } from '../contexts/AppStoreContext';
import { useMaroofAnalytics } from '../contexts/MaroofAnalyticsContext';
import { useAqarIntelligence, type CityStats } from '../contexts/AqarIntelligenceContext';
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
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Briefcase, ShoppingCart, Users, ArrowRight, TrendingUp, Truck, Smartphone, Home, Star } from 'lucide-react';

// ====== OFFICIAL GOVERNMENT STATISTICS ======
const GOV_STATS = {
  rideHailing: { official: 350000, source: 'TGA 2024', label: 'Ride-Hailing' },
  delivery:    { official: 280000, source: 'TGA 2024', label: 'Delivery' },
  ecommerce:   { official: 45000,  source: 'Min. Commerce', label: 'E-Commerce' },
  freelance:   { official: 190000, source: 'HRSD Sep 2024', label: 'Freelance' },
};

// App classification
const RIDE_HAILING_APPS = ['Uber Driver', 'Jeeny Driver', 'Bolt Driver', 'Hemam Partner', 'Kaiian Driver'];
const DELIVERY_APPS = ['HungerStation', 'Jahez Driver', 'The Chefz', 'Keeta Rider', 'ToYou Rep', 'Maraseel', 'Noon Food Partner'];

// Helper: infer sector from job title
function inferSector(jobTitle: string): string {
  const t = (jobTitle || '').toLowerCase();
  if (t.includes('design') || t.includes('graphic') || t.includes('brand') || t.includes('creative') || t.includes('art') || t.includes('illustrat') || t.includes('visual') || t.includes('ui') || t.includes('ux')) return 'Design & Creative';
  if (t.includes('develop') || t.includes('engineer') || t.includes('software') || t.includes('web') || t.includes('programming') || t.includes('code') || t.includes('tech') || t.includes('data') || t.includes('ai') || t.includes('digital')) return 'Technology';
  if (t.includes('market') || t.includes('seo') || t.includes('content') || t.includes('social media')) return 'Marketing';
  if (t.includes('consult') || t.includes('strategy') || t.includes('manage') || t.includes('founder') || t.includes('ceo') || t.includes('coo')) return 'Business';
  if (t.includes('translat') || t.includes('writ') || t.includes('edit')) return 'Writing';
  if (t.includes('video') || t.includes('motion') || t.includes('animat') || t.includes('photo')) return 'Media';
  return 'General';
}

// Helper: extract city from location
function extractCity(location: any): string {
  if (!location) return 'Unknown';
  if (typeof location === 'string') {
    const parts = location.split(',').map((s: string) => s.trim());
    return parts[0] || 'Unknown';
  }
  if (typeof location === 'object') {
    if (location.parsed?.city) return location.parsed.city;
    if (location.linkedinText) {
      const parts = location.linkedinText.split(',').map((s: string) => s.trim());
      return parts[0] || 'Unknown';
    }
  }
  return 'Unknown';
}

const COLORS = ['#0d9488', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

// Source badge
function SourceBadge({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    teal:   'bg-teal-50 text-teal-700 border-teal-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green:  'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    slate:  'bg-slate-50 text-slate-600 border-slate-200',
    red:    'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colorMap[color] || colorMap.slate}`}>
      {label}
    </span>
  );
}

// Gov comparison mini-banner
function GovCompareBanner({ govLabel, govCount, govSource, digitalCount, digitalSource }: {
  govLabel: string; govCount: number; govSource: string; digitalCount: number; digitalSource: string;
}) {
  const gap = digitalCount > 0 ? Math.round(((digitalCount - govCount) / govCount) * 100) : 0;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-medium">Gov Records ({govSource}):</span>
        <span className="font-bold text-slate-700">{govCount.toLocaleString()}</span>
        <SourceBadge label={govSource} color="slate" />
      </div>
      <div className="text-slate-300">|</div>
      <div className="flex items-center gap-2">
        <span className="text-slate-500 font-medium">Digital Sample ({digitalSource}):</span>
        <span className="font-bold text-teal-700">{digitalCount.toLocaleString()}</span>
        <SourceBadge label={digitalSource} color="teal" />
      </div>
      {digitalCount > 0 && (
        <>
          <div className="text-slate-300">|</div>
          <span className="font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            {gap >= 0 ? `+${gap}%` : `${gap}%`} gap
          </span>
        </>
      )}
    </div>
  );
}

export function SectoralAnalysis() {
  const [activeView, setActiveView] = useState<'freelancers' | 'ecommerce' | 'lastmile' | 'appplatforms' | 'aqar' | 'combined'>('freelancers');
  const { t } = useLanguage();
  const { freelancers } = useLinkedInAnalytics();
  const { stores } = useSallaAnalytics();
  const { data: lastMileData } = useMapAnalytics();
  const { analytics: appStoreAnalytics } = useAppStore();
  const { data: maroofData } = useMaroofAnalytics();
  const { data: aqarData } = useAqarIntelligence();

  const computed = useMemo(() => {
    // ---- FREELANCER ANALYTICS (Source: LinkedIn via Apify) ----
    const sectorMap: Record<string, number> = {};
    const cityMap: Record<string, number> = {};
    freelancers.forEach(f => {
      const sector = inferSector(f.jobTitle || '');
      sectorMap[sector] = (sectorMap[sector] || 0) + 1;
      const city = extractCity(f.location);
      cityMap[city] = (cityMap[city] || 0) + 1;
    });

    const sectorData = Object.entries(sectorMap)
      .map(([name, value]) => ({ name, value, percentage: freelancers.length > 0 ? Math.round((value / freelancers.length) * 100) : 0 }))
      .sort((a, b) => b.value - a.value);

    const cityData = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ---- E-COMMERCE ANALYTICS (Source: Salla + Maroof) ----
    // Salla data
    const catMap: Record<string, number> = {};
    const docTypeMap: Record<string, number> = { freelance: 0, commercial: 0, none: 0 };
    let activeCount = 0;
    let inactiveCount = 0;

    stores.forEach(s => {
      const cat = s.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + 1;

      if (s.documentType === 'freelance') docTypeMap.freelance++;
      else if (s.documentType === 'commercial') docTypeMap.commercial++;
      else docTypeMap.none++;

      const isInactive = s.storeName.includes('مغلق') || s.storeName.includes('إطلاق');
      if (isInactive) inactiveCount++;
      else activeCount++;
    });

    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const registrationData = [
      { name: 'Freelance License', value: docTypeMap.freelance, source: 'Salla' },
      { name: 'Commercial Reg.', value: docTypeMap.commercial, source: 'Salla' },
      { name: 'No Document', value: docTypeMap.none, source: 'Salla' },
    ];

    // Maroof data
    const maroofGold = maroofData?.goldStores || 0;
    const maroofSilver = maroofData?.silverStores || 0;
    const maroofTotal = maroofData?.totalStores || 0;
    const maroofCertData = [
      { name: 'Gold (Commercial Reg.)', value: maroofGold },
      { name: 'Silver (Freelance Lic.)', value: maroofSilver },
      { name: 'Uncertified', value: maroofTotal - maroofGold - maroofSilver },
    ].filter(d => d.value > 0);

    const maroofCategories = (maroofData?.topCategories || []).slice(0, 6).map(c => ({ name: c.name, value: c.count }));

    // Combined e-commerce sample
    const totalEcommerceSample = stores.length + maroofTotal;

    // ---- LAST MILE ANALYTICS (Source: Google Maps API) ----
    const totalDrivers = lastMileData.reduce((acc, poi) => acc + poi.activeDrivers, 0);
    const totalPOIs = lastMileData.length;
    const poiTypeMap: Record<string, { count: number; drivers: number }> = {};
    lastMileData.forEach(poi => {
      const type = poi.type || 'Other';
      if (!poiTypeMap[type]) poiTypeMap[type] = { count: 0, drivers: 0 };
      poiTypeMap[type].count++;
      poiTypeMap[type].drivers += poi.activeDrivers;
    });
    const poiTypeData = Object.entries(poiTypeMap)
      .map(([name, val]) => ({ name, pois: val.count, drivers: val.drivers }))
      .sort((a, b) => b.drivers - a.drivers);

    // Zone density from last mile
    const getZone = (lat: number, lng: number) => {
      if (lat > 24 && lat < 25.5 && lng > 46 && lng < 47.5) return 'Riyadh';
      if (lat > 21 && lat < 22 && lng > 39 && lng < 40) return 'Jeddah';
      if (lat > 26 && lat < 27 && lng > 49.5 && lng < 51) return 'Eastern';
      return 'Other';
    };
    const zoneMap: Record<string, { drivers: number; capacity: number }> = {};
    lastMileData.forEach(poi => {
      const zone = getZone(poi.lat, poi.lng);
      if (!zoneMap[zone]) zoneMap[zone] = { drivers: 0, capacity: 0 };
      zoneMap[zone].drivers += poi.activeDrivers;
      zoneMap[zone].capacity += poi.capacity;
    });
    const zoneData = Object.entries(zoneMap)
      .map(([zone, val]) => ({ zone, drivers: val.drivers, capacity: val.capacity }))
      .sort((a, b) => b.drivers - a.drivers);

    // ---- APP PLATFORMS ANALYTICS (Source: iTunes + Google Play APIs) ----
    const appRows = appStoreAnalytics?.rows || [];

    const rideHailingRows = appRows.filter(r => RIDE_HAILING_APPS.includes(r.app));
    const deliveryRows = appRows.filter(r => DELIVERY_APPS.includes(r.app));

    const totalRideHailingEst = rideHailingRows.reduce((s, r) => s + r.estimatedActiveDrivers, 0);
    const totalDeliveryEst = deliveryRows.reduce((s, r) => s + r.estimatedActiveDrivers, 0);
    const totalAppEst = appStoreAnalytics?.totals?.totalActiveDrivers || 0;

    // Per-app chart data
    const appChartData = appRows
      .map(r => ({
        app: r.app.replace(' Driver', '').replace(' Rider', '').replace(' Rep', '').replace(' Partner', ''),
        fullName: r.app,
        estimatedDrivers: r.estimatedActiveDrivers,
        totalReviews: r.totalReviews,
        type: RIDE_HAILING_APPS.includes(r.app) ? 'Ride-Hailing' : 'Delivery',
      }))
      .sort((a, b) => b.estimatedDrivers - a.estimatedDrivers);

    // App type split pie
    const appTypeSplit = [
      { name: 'Ride-Hailing', value: totalRideHailingEst },
      { name: 'Delivery', value: totalDeliveryEst },
    ].filter(d => d.value > 0);

    // ---- AQAR REAL ESTATE ANALYTICS (Source: Aqar Platform) ----
    const aqarTotalListings = aqarData?.totalListings || 0;
    const aqarUniqueHosts = aqarData?.uniqueHosts || 0;
    const aqarSuperhosts = aqarData?.superhosts || 0;
    const aqarRegularHosts = aqarUniqueHosts - aqarSuperhosts;

    // City breakdown from Aqar
    const aqarCityData = aqarData?.cityBreakdown
      ? Object.entries(aqarData.cityBreakdown as Record<string, CityStats>)
          .map(([city, stats]) => ({
            city,
            listings: stats.listings,
            hosts: stats.hosts,
            superhosts: stats.superhosts,
          }))
          .filter(d => d.listings > 0)
          .sort((a, b) => b.listings - a.listings)
          .slice(0, 8)
      : [];

    // Host type split for pie
    const aqarHostSplit = [
      { name: 'Superhosts', value: aqarSuperhosts },
      { name: 'Regular Hosts', value: Math.max(aqarRegularHosts, 0) },
    ].filter(d => d.value > 0);

    // Property types from listings array
    const propTypeMap: Record<string, number> = {};
    (aqarData?.listings || []).forEach(l => {
      const pt = l.propertyType || 'Other';
      propTypeMap[pt] = (propTypeMap[pt] || 0) + 1;
    });
    const aqarPropertyTypes = Object.entries(propTypeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ---- COMBINED OVERVIEW ----
    const ecosystemData = [
      { metric: 'LinkedIn Profiles', value: freelancers.length, source: 'LinkedIn' },
      { metric: 'Salla Stores', value: stores.length, source: 'Salla' },
      { metric: 'Maroof Businesses', value: maroofTotal, source: 'Maroof' },
      { metric: 'Last-Mile Drivers', value: totalDrivers, source: 'Google Maps' },
      { metric: 'App-Based Workers', value: totalAppEst, source: 'App Store' },
      { metric: 'Last-Mile POIs', value: totalPOIs, source: 'Google Maps' },
    ];

    // Radar data for combined view
    const radarData = sectorData.slice(0, 6).map(s => ({
      subject: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
      freelancers: s.value,
      fullMark: Math.max(...sectorData.map(d => d.value)) + 5,
    }));

    // Top insights
    const topSector = sectorData[0];
    const topCategory = categoryData[0];
    const dominantCity = cityData[0];

    return {
      sectorData, cityData,
      categoryData, registrationData,
      maroofCertData, maroofCategories, maroofTotal, maroofGold, maroofSilver,
      totalEcommerceSample,
      poiTypeData, zoneData, totalDrivers, totalPOIs,
      appChartData, appTypeSplit, totalRideHailingEst, totalDeliveryEst, totalAppEst,
      aqarTotalListings, aqarUniqueHosts, aqarSuperhosts, aqarRegularHosts,
      aqarCityData, aqarHostSplit, aqarPropertyTypes,
      ecosystemData, radarData,
      topSector, topCategory, dominantCity,
      activeCount, inactiveCount,
    };
  }, [freelancers, stores, lastMileData, appStoreAnalytics, maroofData, aqarData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('sectoral.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('sectoral.subtitle')}</p>
        </div>
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-0.5">
          <button
            onClick={() => setActiveView('freelancers')}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeView === 'freelancers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={15} /> Freelancers
          </button>
          <button
            onClick={() => setActiveView('ecommerce')}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeView === 'ecommerce' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShoppingCart size={15} /> E-Commerce
          </button>
          <button
            onClick={() => setActiveView('lastmile')}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeView === 'lastmile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Truck size={15} /> Last-Mile
          </button>
          <button
            onClick={() => setActiveView('appplatforms')}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeView === 'appplatforms' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Smartphone size={15} /> App Platforms
          </button>
          <button
            onClick={() => setActiveView('aqar')}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeView === 'aqar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Home size={15} /> Real Estate
          </button>
          <button
            onClick={() => setActiveView('combined')}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${activeView === 'combined' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Briefcase size={15} /> Overview
          </button>
        </div>
      </div>

      {/* ====== FREELANCERS TAB ====== */}
      {activeView === 'freelancers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gov Comparison Banner */}
          <div className="col-span-1 lg:col-span-2">
            <GovCompareBanner
              govLabel="Freelance"
              govCount={GOV_STATS.freelance.official}
              govSource={GOV_STATS.freelance.source}
              digitalCount={freelancers.length}
              digitalSource="LinkedIn via Apify"
            />
          </div>

          {/* Sector Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Professional Sectors</CardTitle>
                  <CardDescription>Fields inferred from {freelancers.length} LinkedIn freelancer profiles</CardDescription>
                </div>
                <SourceBadge label="LinkedIn via Apify" color="blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.sectorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" height={65} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value} freelancers (${Math.round((value / (freelancers.length || 1)) * 100)}%)`, 'LinkedIn']}
                    />
                    <Bar dataKey="value" name="Freelancers" radius={[4, 4, 0, 0]} maxBarSize={45}>
                      {computed.sectorData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* City Distribution */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Geographic Concentration</CardTitle>
                  <CardDescription>Top cities by freelancer presence — LinkedIn profiles</CardDescription>
                </div>
                <SourceBadge label="LinkedIn" color="blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.cityData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [value, 'LinkedIn Profiles']}
                    />
                    <Bar dataKey="value" name="Freelancers" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Insight */}
          <Card className="col-span-1 lg:col-span-2">
            <CardContent className="p-6">
              <div className="p-4 bg-teal-50 rounded-lg border border-teal-100 flex items-start gap-3">
                <div className="p-2 bg-teal-100 rounded-full text-teal-700 mt-0.5">
                  <TrendingUp size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-teal-900">Freelance Sector Insight</h4>
                    <SourceBadge label="LinkedIn via Apify" color="blue" />
                  </div>
                  <p className="text-sm text-teal-700 mt-1">
                    {computed.topSector ? (
                      <>The <strong>{computed.topSector.name}</strong> sector dominates with <strong>{computed.topSector.value}</strong> professionals ({computed.topSector.percentage}% of total).
                      {computed.dominantCity && <> Most freelancers are concentrated in <strong>{computed.dominantCity.name}</strong> ({computed.dominantCity.value} profiles).</>}
                      {' '}Government records (HRSD Sep 2024) report <strong>{GOV_STATS.freelance.official.toLocaleString()}</strong> registered freelancers — our LinkedIn sample of <strong>{freelancers.length}</strong> represents ~{Math.round((freelancers.length / GOV_STATS.freelance.official) * 100)}% of that figure.</>
                    ) : (
                      'No data available yet. Run a LinkedIn scrape to populate insights.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== E-COMMERCE TAB ====== */}
      {activeView === 'ecommerce' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gov Comparison Banner */}
          <div className="col-span-1 lg:col-span-2">
            <GovCompareBanner
              govLabel="E-Commerce"
              govCount={GOV_STATS.ecommerce.official}
              govSource={GOV_STATS.ecommerce.source}
              digitalCount={computed.totalEcommerceSample}
              digitalSource="Salla + Maroof"
            />
          </div>

          {/* Salla Store Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Store Categories</CardTitle>
                  <CardDescription>Product categories across {stores.length} Salla e-commerce stores</CardDescription>
                </div>
                <SourceBadge label="Salla Platform" color="teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                {computed.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={computed.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {computed.categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [value, `${name} (Salla)`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Registration Types */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Salla Registration Types</CardTitle>
                  <CardDescription>Document types used by Salla store operators</CardDescription>
                </div>
                <SourceBadge label="Salla Platform" color="teal" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.registrationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [value, 'Stores (Salla)']}>
                    </Tooltip>
                    <Bar dataKey="value" name="Stores" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      <Cell fill="#0d9488" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Maroof Certification */}
          {computed.maroofTotal > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Maroof Business Certification</CardTitle>
                    <CardDescription>{computed.maroofTotal} businesses — Gov-verified Saudi registry</CardDescription>
                  </div>
                  <SourceBadge label="Maroof Registry" color="purple" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full mt-2">
                  {computed.maroofCertData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={computed.maroofCertData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={4}
                        >
                          <Cell fill="#f59e0b" />
                          <Cell fill="#94a3b8" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number, name: string) => [value, `${name} (Maroof)`]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 italic">No Maroof data loaded</div>
                  )}
                </div>
                <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Gold (CR): <strong className="text-amber-600">{computed.maroofGold}</strong></span>
                  <span>Silver (FL): <strong className="text-slate-500">{computed.maroofSilver}</strong></span>
                  <span>Total: <strong className="text-slate-700">{computed.maroofTotal}</strong></span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maroof Categories */}
          {computed.maroofCategories.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Maroof Business Types</CardTitle>
                    <CardDescription>Top business categories in the Maroof registry</CardDescription>
                  </div>
                  <SourceBadge label="Maroof Registry" color="purple" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.maroofCategories} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [value, 'Businesses (Maroof)']}
                      />
                      <Bar dataKey="value" name="Businesses" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* E-Commerce Insight */}
          <Card className="col-span-1 lg:col-span-2">
            <CardContent className="p-6">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-full text-amber-700 mt-0.5">
                  <ArrowRight size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-amber-900">E-Commerce Insight</h4>
                    <SourceBadge label="Salla Platform" color="teal" />
                    {computed.maroofTotal > 0 && <SourceBadge label="Maroof Registry" color="purple" />}
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    {computed.topCategory ? (
                      <>
                        The <strong>{computed.topCategory.name}</strong> category leads with <strong>{computed.topCategory.value}</strong> Salla stores.
                        Combined digital sample: <strong>{computed.totalEcommerceSample.toLocaleString()}</strong> operators
                        ({stores.length} from Salla{computed.maroofTotal > 0 ? ` + ${computed.maroofTotal} from Maroof` : ''}).
                        Government records (Min. Commerce) report <strong>{GOV_STATS.ecommerce.official.toLocaleString()}</strong> registered e-commerce businesses —
                        suggesting our digital footprint captures ~{Math.round((computed.totalEcommerceSample / GOV_STATS.ecommerce.official) * 100)}% of the official figure.
                      </>
                    ) : (
                      'No Salla data available yet. Fetch data to populate insights.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== LAST-MILE TAB ====== */}
      {activeView === 'lastmile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gov Comparison Banner */}
          <div className="col-span-1 lg:col-span-2">
            <GovCompareBanner
              govLabel="Delivery"
              govCount={GOV_STATS.delivery.official}
              govSource={GOV_STATS.delivery.source}
              digitalCount={computed.totalDrivers}
              digitalSource="Google Maps POIs"
            />
          </div>

          {/* POI Type Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>POI Type Breakdown</CardTitle>
                  <CardDescription>Cloud Kitchens vs Logistics Hubs — {computed.totalPOIs} POIs, {computed.totalDrivers.toLocaleString()} inferred drivers</CardDescription>
                </div>
                <SourceBadge label="Google Maps API" color="green" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                {computed.poiTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.poiTypeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [value, `${name} (Google Maps)`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      <Bar dataKey="pois" name="POI Count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      <Bar dataKey="drivers" name="Active Drivers (inferred)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No Last-Mile data available. Refresh the Last-Mile Analytics page first.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Zone Density */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Zone Density — Drivers vs Capacity</CardTitle>
                  <CardDescription>Regional distribution of delivery/transport drivers</CardDescription>
                </div>
                <SourceBadge label="Google Maps API" color="green" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                {computed.zoneData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.zoneData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [value, `${name} (Google Maps)`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                      <Bar dataKey="drivers" name="Active Drivers" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={45} />
                      <Bar dataKey="capacity" name="Zone Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No zone data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Last-Mile Insight */}
          <Card className="col-span-1 lg:col-span-2">
            <CardContent className="p-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-700 mt-0.5">
                  <Truck size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-blue-900">Last-Mile Delivery Insight</h4>
                    <SourceBadge label="Google Maps API" color="green" />
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    {computed.totalDrivers > 0 ? (
                      <>The observatory tracks <strong>{computed.totalPOIs}</strong> Points of Interest (Cloud Kitchens & Logistics Hubs) via Google Maps, with an inferred fleet of <strong>{computed.totalDrivers.toLocaleString()}</strong> delivery/transport drivers.
                      Government records (TGA 2024) report <strong>{GOV_STATS.delivery.official.toLocaleString()}</strong> delivery workers — this sample captures
                      ~{Math.round((computed.totalDrivers / GOV_STATS.delivery.official) * 100)}% of that figure and feeds directly into the delivery workforce extrapolations in the Executive Overview.</>
                    ) : (
                      'No Last-Mile data loaded yet. Visit the Last-Mile Analytics page and click "Refresh Live Data" to populate.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== APP PLATFORMS TAB ====== */}
      {activeView === 'appplatforms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gov Comparison Banner */}
          <div className="col-span-1 lg:col-span-2">
            <GovCompareBanner
              govLabel="Ride-Hailing"
              govCount={GOV_STATS.rideHailing.official + GOV_STATS.delivery.official}
              govSource="TGA 2024"
              digitalCount={computed.totalAppEst}
              digitalSource="iTunes + Google Play"
            />
          </div>

          {/* Per-App Driver Estimates */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Estimated Active Workers by App</CardTitle>
                  <CardDescription>Computed from app review counts — {(computed.totalAppEst || 0).toLocaleString()} total estimated active workers across 10 platforms</CardDescription>
                </div>
                <SourceBadge label="iTunes + Google Play" color="orange" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                {computed.appChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.appChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="app" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string, props: any) => [
                          value.toLocaleString() + ' workers',
                          `${props.payload.fullName} — ${props.payload.type} (App Store)`
                        ]}
                      />
                      <Bar dataKey="estimatedDrivers" name="Est. Active Workers" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {computed.appChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.type === 'Ride-Hailing' ? '#0d9488' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No app store data loaded. Go to App Store Insights and fetch data.</div>
                )}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-3 text-xs justify-center">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-teal-600"></span> Ride-Hailing (Uber, Jeeny, Bolt)</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-blue-500"></span> Delivery (HungerStation, Jahez & more)</span>
              </div>
            </CardContent>
          </Card>

          {/* Ride-Hailing vs Delivery Split */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Worker Type Split</CardTitle>
                  <CardDescription>Ride-Hailing vs Delivery — estimated active workers</CardDescription>
                </div>
                <SourceBadge label="App Store" color="orange" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full mt-4">
                {computed.appTypeSplit.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={computed.appTypeSplit}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        <Cell fill="#0d9488" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [value.toLocaleString() + ' workers', `${name} (App Store)`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No data yet</div>
                )}
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
                <span>Ride-Hailing: <strong className="text-teal-600">{computed.totalRideHailingEst.toLocaleString()}</strong></span>
                <span>Delivery: <strong className="text-blue-600">{computed.totalDeliveryEst.toLocaleString()}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* App Platforms Insight */}
          <Card>
            <CardContent className="p-6 h-full flex flex-col justify-center">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-full text-orange-700 mt-0.5">
                  <Smartphone size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-orange-900">App Platform Insight</h4>
                    <SourceBadge label="iTunes + Google Play" color="orange" />
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    {computed.totalAppEst > 0 ? (
                      <>
                        App Store analytics across <strong>10 gig platforms</strong> estimate <strong>{computed.totalAppEst.toLocaleString()}</strong> active workers —
                        <strong> {computed.totalRideHailingEst.toLocaleString()}</strong> in ride-hailing (Uber, Jeeny, Bolt) and
                        <strong> {computed.totalDeliveryEst.toLocaleString()}</strong> in delivery.
                        Government TGA 2024 records report <strong>{(GOV_STATS.rideHailing.official + GOV_STATS.delivery.official).toLocaleString()}</strong> combined.
                        Estimates are computed from app review counts using a 2% review rate and 10% active-worker ratio.
                      </>
                    ) : (
                      'No App Store data loaded yet. Visit the App Store Insights tab to fetch live data.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== AQAR REAL ESTATE TAB ====== */}
      {activeView === 'aqar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* No-gov banner */}
          <div className="col-span-1 lg:col-span-2">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Home size={14} className="text-rose-600" />
                <span className="font-semibold text-rose-700">Real Estate Platform Hosts</span>
              </div>
              <div className="text-rose-600">
                This sector is <strong>not officially tracked</strong> by any Saudi government registry.
                All data is sourced exclusively from the Aqar digital platform.
              </div>
              <SourceBadge label="Aqar Platform" color="purple" />
            </div>
          </div>

          {/* KPI row */}
          <div className="col-span-1 lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Listings',  value: computed.aqarTotalListings,  sub: 'active property listings', color: 'rose' },
              { label: 'Unique Hosts',    value: computed.aqarUniqueHosts,    sub: 'individual operators',     color: 'purple' },
              { label: 'Superhosts',      value: computed.aqarSuperhosts,     sub: 'top-rated hosts',          color: 'amber' },
              { label: 'Cities Covered',  value: computed.aqarCityData.length, sub: 'across Saudi Arabia',     color: 'teal' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {kpi.value > 0 ? kpi.value.toLocaleString() : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* City Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Listings by City</CardTitle>
                  <CardDescription>Top cities by number of Aqar property listings</CardDescription>
                </div>
                <SourceBadge label="Aqar Platform" color="purple" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full mt-2">
                {computed.aqarCityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={computed.aqarCityData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis dataKey="city" type="category" width={90} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => [value, `${name} (Aqar)`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                      <Bar dataKey="listings" name="Listings" fill="#f43f5e" radius={[0, 4, 4, 0]} maxBarSize={20} />
                      <Bar dataKey="hosts" name="Hosts" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                    No Aqar data loaded. Visit the Aqar Intelligence page and sync data.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Superhost vs Regular split */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Host Quality Distribution</CardTitle>
                  <CardDescription>Superhost vs regular host breakdown</CardDescription>
                </div>
                <SourceBadge label="Aqar Platform" color="purple" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-60 w-full mt-2">
                {computed.aqarHostSplit.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={computed.aqarHostSplit}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        <Cell fill="#f59e0b" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: number, name: string) => [v.toLocaleString(), `${name} (Aqar)`]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">No data</div>
                )}
              </div>
              <div className="flex justify-center gap-6 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-amber-500" />
                  Superhosts: <strong className="text-amber-600 ml-1">{computed.aqarSuperhosts.toLocaleString()}</strong>
                </span>
                <span>Regular: <strong className="text-purple-600">{Math.max(computed.aqarRegularHosts, 0).toLocaleString()}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Property Types */}
          {computed.aqarPropertyTypes.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Property Types</CardTitle>
                    <CardDescription>Types of properties listed on Aqar</CardDescription>
                  </div>
                  <SourceBadge label="Aqar Platform" color="purple" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.aqarPropertyTypes} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} angle={-15} textAnchor="end" height={45} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(v: number) => [v, 'Listings (Aqar)']}
                      />
                      <Bar dataKey="value" name="Listings" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        {computed.aqarPropertyTypes.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aqar Insight */}
          <Card className={computed.aqarPropertyTypes.length > 0 ? 'col-span-1' : 'col-span-1 lg:col-span-2'}>
            <CardContent className="p-6 h-full flex flex-col justify-center">
              <div className="p-4 bg-rose-50 rounded-lg border border-rose-100 flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-full text-rose-700 mt-0.5 shrink-0">
                  <Home size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="text-sm font-semibold text-rose-900">Aqar Real Estate Insight</h4>
                    <SourceBadge label="Aqar Platform" color="purple" />
                  </div>
                  <p className="text-sm text-rose-700 mt-1">
                    {computed.aqarUniqueHosts > 0 ? (
                      <>
                        The Aqar platform reveals <strong>{computed.aqarUniqueHosts.toLocaleString()}</strong> unique real estate hosts
                        operating <strong>{computed.aqarTotalListings.toLocaleString()}</strong> property listings across{' '}
                        <strong>{computed.aqarCityData.length}</strong> Saudi cities.
                        {' '}<strong>{computed.aqarSuperhosts}</strong> hosts hold Superhost status
                        ({computed.aqarUniqueHosts > 0 ? Math.round((computed.aqarSuperhosts / computed.aqarUniqueHosts) * 100) : 0}% of all hosts).
                        This sector is entirely absent from government labor statistics, making it a pure digital-only signal
                        for platform economy measurement.
                      </>
                    ) : (
                      'No Aqar data loaded yet. Navigate to the Aqar Intelligence page and sync data to populate this view.'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== COMBINED OVERVIEW TAB ====== */}
      {activeView === 'combined' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ecosystem Overview */}
          <Card className="col-span-1">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Platform Ecosystem — All Sources</CardTitle>
                  <CardDescription>Raw data points collected across every digital source</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.ecosystemData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} angle={-15} textAnchor="end" height={55} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string, props: any) => [value.toLocaleString(), `${props.payload.metric} (${props.payload.source})`]}
                    />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {computed.ecosystemData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Source Legend */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                <SourceBadge label="LinkedIn" color="blue" />
                <SourceBadge label="Salla" color="teal" />
                <SourceBadge label="Maroof" color="purple" />
                <SourceBadge label="Google Maps" color="green" />
                <SourceBadge label="App Store" color="orange" />
              </div>
            </CardContent>
          </Card>

          {/* Radar */}
          <Card className="col-span-1">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Freelancer Sector Radar</CardTitle>
                  <CardDescription>Relative strength of each professional sector</CardDescription>
                </div>
                <SourceBadge label="LinkedIn" color="blue" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full mt-4">
                {computed.radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={computed.radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <PolarRadiusAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Radar name="LinkedIn Freelancers" dataKey="freelancers" stroke="#0d9488" fill="#0d9488" fillOpacity={0.3} strokeWidth={2} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic">No data yet</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gov vs Digital Summary Table */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Cross-Source Summary — Gov Records vs Digital Sample</CardTitle>
              <CardDescription>Each sector's official government figure vs our digital footprint sample</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Sector</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600">Gov. Records</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600">Gov. Source</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600">Digital Sample</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600">Digital Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-700">Ride-Hailing</td>
                      <td className="py-3 px-4 text-right text-slate-600">{GOV_STATS.rideHailing.official.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="TGA 2024" color="slate" /></td>
                      <td className="py-3 px-4 text-right font-semibold text-teal-700">{computed.totalRideHailingEst.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="App Store" color="orange" /></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-700">Delivery</td>
                      <td className="py-3 px-4 text-right text-slate-600">{GOV_STATS.delivery.official.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="TGA 2024" color="slate" /></td>
                      <td className="py-3 px-4 text-right font-semibold text-teal-700">{(computed.totalDeliveryEst + computed.totalDrivers).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="App Store + Maps" color="green" /></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-700">E-Commerce</td>
                      <td className="py-3 px-4 text-right text-slate-600">{GOV_STATS.ecommerce.official.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="Min. Commerce" color="slate" /></td>
                      <td className="py-3 px-4 text-right font-semibold text-teal-700">{computed.totalEcommerceSample.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="Salla + Maroof" color="teal" /></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-700">Freelance</td>
                      <td className="py-3 px-4 text-right text-slate-600">{GOV_STATS.freelance.official.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="HRSD Sep 2024" color="slate" /></td>
                      <td className="py-3 px-4 text-right font-semibold text-teal-700">{freelancers.length.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right"><SourceBadge label="LinkedIn" color="blue" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Combined Insight */}
          <Card className="col-span-1 lg:col-span-2">
            <CardContent className="p-6">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-700 mt-0.5">
                  <TrendingUp size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-blue-900">Combined Ecosystem Insight</h4>
                    <SourceBadge label="LinkedIn" color="blue" />
                    <SourceBadge label="Salla" color="teal" />
                    <SourceBadge label="Maroof" color="purple" />
                    <SourceBadge label="App Store" color="orange" />
                    <SourceBadge label="Google Maps" color="green" />
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    The observatory aggregates <strong>{(freelancers.length + stores.length + computed.maroofTotal + computed.totalPOIs).toLocaleString()}</strong> total digital data points —
                    <strong> {freelancers.length}</strong> freelancer profiles (LinkedIn),
                    <strong> {stores.length}</strong> Salla stores,
                    <strong> {computed.maroofTotal}</strong> Maroof businesses,
                    <strong> {computed.totalPOIs}</strong> last-mile POIs (Google Maps),
                    and <strong>{computed.totalAppEst.toLocaleString()}</strong> estimated app-based workers (App Store).
                    This cross-platform digital fingerprint reveals the Saudi gig economy at a scale traditional surveys cannot capture.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
