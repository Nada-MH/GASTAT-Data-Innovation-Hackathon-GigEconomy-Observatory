import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Activity,
  Download,
  ShoppingCart,
  Truck,
  Eye,
  Settings2,
  Calculator,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Home,
  Globe
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../contexts/LanguageContext';
import { useLinkedInAnalytics } from '../contexts/LinkedInAnalyticsContext';
import { useSallaAnalytics } from '../contexts/SallaAnalyticsContext';
import { useMapAnalytics } from '../contexts/MapAnalyticsContext';
import { useAppStore } from '../contexts/AppStoreContext';
import { useGoogleTrends } from '../contexts/GoogleTrendsContext';
import { useMaroofAnalytics } from '../contexts/MaroofAnalyticsContext';
import { useAqarIntelligence } from '../contexts/AqarIntelligenceContext';

// ====== OFFICIAL GOVERNMENT STATISTICS (Saudi Arabia) ======
// Sources: HRSD 2025, TGA 2025, Min. Commerce 2025
const GOV_STATS = {
  rideHailing: { official: 263000, source: 'TGA 2025', label: 'Ride-Hailing' },
  delivery: { official: 310000, source: 'TGA 2025', label: 'Delivery' },
  ecommerce: { official: 43854, source: 'Min. Commerce 2025', label: 'E-Commerce' },
  freelance: { official: 2250000, source: 'HRSD 2025', label: 'Freelance' },
};
const TOTAL_GOV_OFFICIAL = 2866854; // Total of the four specific sectors for 2025

// App classification for ride-hailing vs delivery
const RIDE_HAILING_APPS = ['Uber Driver', 'Jeeny Driver', 'Bolt Driver', 'Hemam Partner', 'Kaiian Driver'];
const DELIVERY_APPS = ['HungerStation', 'Jahez Driver', 'The Chefz', 'Keeta Rider', 'ToYou Rep', 'Maraseel', 'Noon Food Partner'];

// Helper: extract city from location (string or object)
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

// Helper: infer sector from job title
function inferSector(jobTitle: string): string {
  const t = (jobTitle || '').toLowerCase();
  if (t.includes('design') || t.includes('graphic') || t.includes('brand') || t.includes('creative') || t.includes('art') || t.includes('illustrat') || t.includes('visual') || t.includes('ui') || t.includes('ux')) return 'Design & Creative';
  if (t.includes('develop') || t.includes('engineer') || t.includes('software') || t.includes('web') || t.includes('programming') || t.includes('code') || t.includes('tech') || t.includes('data') || t.includes('ai') || t.includes('digital')) return 'Technology & Programming';
  if (t.includes('market') || t.includes('seo') || t.includes('content') || t.includes('social media')) return 'Marketing & Content';
  if (t.includes('consult') || t.includes('strategy') || t.includes('manage') || t.includes('founder') || t.includes('ceo') || t.includes('coo')) return 'Business & Consulting';
  if (t.includes('translat') || t.includes('writ') || t.includes('edit')) return 'Writing & Translation';
  if (t.includes('video') || t.includes('motion') || t.includes('animat') || t.includes('photo')) return 'Media & Production';
  return 'General Professional';
}

// City coordinates for the Saudi map
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Riyadh': { lat: 24.7136, lng: 46.6753 },
  'Jeddah': { lat: 21.4858, lng: 39.1925 },
  'Khobar': { lat: 26.2172, lng: 50.1971 },
  'Al Khobar': { lat: 26.2172, lng: 50.1971 },
  'Mecca': { lat: 21.3891, lng: 39.8579 },
  'Medina': { lat: 24.5247, lng: 39.5692 },
  'Dammam': { lat: 26.4207, lng: 50.0888 },
  'Tabuk': { lat: 28.3835, lng: 36.5662 },
  'Abha': { lat: 18.2164, lng: 42.5053 },
  'Al-Qassim Region': { lat: 26.3260, lng: 43.9390 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  'Unknown': { lat: 23.8859, lng: 45.0792 },
};

function getCityCoords(city: string) {
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  for (const [key, val] of Object.entries(CITY_COORDS)) {
    if (city.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(city.toLowerCase())) return val;
  }
  return CITY_COORDS['Saudi Arabia'];
}

const getDensityColor = (count: number) => {
  if (count >= 10) return '#f43f5e';
  if (count >= 4) return '#f59e0b';
  return '#14b8a6';
};
const getDensityLabel = (count: number) => {
  if (count >= 10) return 'high';
  if (count >= 4) return 'medium';
  return 'low';
};
const getDensityRadius = (count: number) => {
  if (count >= 10) return 24;
  if (count >= 4) return 16;
  return 10;
};

const SECTOR_COLORS = ['#0d9488', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

// Source badge component
function SourceBadge({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colorMap[color] || colorMap.slate}`}>
      {label}
    </span>
  );
}

export function ExecutiveOverview() {
  const { t } = useLanguage();
  const { freelancers } = useLinkedInAnalytics();
  const { stores } = useSallaAnalytics();
  const { data: lastMileData } = useMapAnalytics();
  const { analytics: appStoreAnalytics } = useAppStore();
  const { trendsData } = useGoogleTrends();
  const { data: maroofData } = useMaroofAnalytics();
  const { data: aqarData } = useAqarIntelligence();

  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [workerTypesExpanded, setWorkerTypesExpanded] = useState<boolean>(true);

  const computed = useMemo(() => {
    const totalFreelancers = freelancers.length;
    const totalStores = stores.length;
    const totalMaroofStores = maroofData?.totalStores || 0;
    const totalLastMileDrivers = lastMileData.reduce((acc, poi) => acc + poi.activeDrivers, 0);
    const totalLastMilePOIs = lastMileData.length;
    const totalDataPoints = totalFreelancers + totalStores + totalLastMilePOIs;

    // ====== AQAR (Real Estate / Short-term Rental Hosts) ======
    const aqarHosts = aqarData?.uniqueHosts || 0;
    const aqarSuperhosts = aqarData?.superhosts || 0;
    const aqarListings = aqarData?.totalListings || 0;

    // ====== APP STORE DRIVER ESTIMATES ======
    // Split by ride-hailing vs delivery apps
    const rideHailingAppEst = appStoreAnalytics?.rows
      .filter(r => RIDE_HAILING_APPS.includes(r.app))
      .reduce((sum, r) => sum + r.estimatedActiveDrivers, 0) || 0;

    const deliveryAppEst = appStoreAnalytics?.rows
      .filter(r => DELIVERY_APPS.includes(r.app))
      .reduce((sum, r) => sum + r.estimatedActiveDrivers, 0) || 0;

    const totalAppDrivers = appStoreAnalytics?.totals?.totalActiveDrivers || 0;

    // Freelancer sector distribution
    const sectorMap: Record<string, number> = {};
    freelancers.forEach(f => {
      const sector = inferSector(f.jobTitle || '');
      sectorMap[sector] = (sectorMap[sector] || 0) + 1;
    });
    const sectorData = Object.entries(sectorMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Salla store category distribution
    const categoryMap: Record<string, number> = {};
    stores.forEach(s => {
      const cat = s.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Salla document type breakdown
    const freelanceDoc = stores.filter(s => s.documentType === 'freelance').length;
    const commercialDoc = stores.filter(s => s.documentType === 'commercial').length;
    const noDoc = stores.filter(s => !s.documentType).length;
    const activeStores = stores.filter(s => !s.storeName.includes('مغلق') && !s.storeName.includes('إطلاق')).length;
    const inactiveStores = stores.length - activeStores;

    // City distribution for map (from LinkedIn data)
    const cityMap: Record<string, number> = {};
    freelancers.forEach(f => {
      const city = extractCity(f.location);
      cityMap[city] = (cityMap[city] || 0) + 1;
    });
    const mapPoints = Object.entries(cityMap).map(([city, count], idx) => {
      const coords = getCityCoords(city);
      return {
        id: idx + 1, city,
        lat: coords.lat + (Math.random() * 0.05 - 0.025),
        lng: coords.lng + (Math.random() * 0.05 - 0.025),
        density: getDensityLabel(count), workers: count, sector: 'Freelancer',
      };
    });

    // ====== SCALE METRICS ======
    const ecommerceRawSignal = totalStores + totalMaroofStores;
    const totalRawCollected =
      totalFreelancers +
      totalStores +
      totalMaroofStores +
      aqarHosts +
      totalLastMilePOIs +
      totalAppDrivers;

    const populationPenetrationPct = parseFloat(
      ((totalRawCollected / TOTAL_GOV_OFFICIAL) * 100).toFixed(4)
    );

    // ====== REAL-TIME DATA (Observed Scraped Values) ======
    const rideHailingEstimate = rideHailingAppEst;
    const deliveryEstimate = deliveryAppEst + totalLastMileDrivers;
    const ecommerceEstimate = ecommerceRawSignal;
    const freelanceEstimate = totalFreelancers;
    const aqarEstimate = aqarHosts;

    const totalDigitalEstimate = totalRawCollected; // Total observed data vs. government target

    // ====== WORKER TYPE BREAKDOWN (for hero section) ======
    const gigWorkerTypes = [
      {
        type: 'Ride-Hailing Drivers',
        rawSample: rideHailingAppEst,
        estimate: rideHailingEstimate,
        gov: GOV_STATS.rideHailing.official,
        govSource: GOV_STATS.rideHailing.source,
        dataSource: 'App Store (iTunes + Google Play)',
        sourceColor: 'orange',
        apps: RIDE_HAILING_APPS,
        icon: 'RH',
        color: 'teal',
      },
      {
        type: 'Delivery Workers',
        rawSample: deliveryAppEst + totalLastMileDrivers,
        estimate: deliveryEstimate,
        gov: GOV_STATS.delivery.official,
        govSource: GOV_STATS.delivery.source,
        dataSource: 'App Store + Google Maps POIs',
        sourceColor: 'green',
        apps: DELIVERY_APPS,
        icon: 'DL',
        color: 'blue',
      },
      {
        type: 'E-Commerce Operators',
        rawSample: ecommerceRawSignal,
        estimate: ecommerceEstimate,
        gov: GOV_STATS.ecommerce.official,
        govSource: GOV_STATS.ecommerce.source,
        dataSource: 'Salla Platform + Maroof Registry',
        sourceColor: 'teal',
        apps: [],
        icon: 'EC',
        color: 'amber',
      },
      {
        type: 'Freelance Professionals',
        rawSample: totalFreelancers,
        estimate: freelanceEstimate,
        gov: GOV_STATS.freelance.official,
        govSource: GOV_STATS.freelance.source,
        dataSource: 'LinkedIn via Apify',
        sourceColor: 'blue',
        apps: [],
        icon: 'FL',
        color: 'indigo',
      },
      {
        type: 'Real Estate Hosts',
        rawSample: aqarHosts,
        estimate: aqarEstimate,
        gov: null,
        govSource: 'Not officially tracked',
        dataSource: 'Aqar Platform',
        sourceColor: 'purple',
        apps: [],
        icon: 'RE',
        color: 'rose',
        note: `${aqarSuperhosts} superhosts · ${aqarListings} listings`,
      },
    ];

    // Gov vs Digital comparison data
    const blindSpotData = [
      {
        sector: GOV_STATS.rideHailing.label,
        official: GOV_STATS.rideHailing.official,
        digital: rideHailingEstimate,
        blindSpot: Math.round(((rideHailingEstimate - GOV_STATS.rideHailing.official) / GOV_STATS.rideHailing.official) * 100),
        source: GOV_STATS.rideHailing.source,
        digitalSource: 'App Store',
      },
      {
        sector: GOV_STATS.delivery.label,
        official: GOV_STATS.delivery.official,
        digital: deliveryEstimate,
        blindSpot: Math.round(((deliveryEstimate - GOV_STATS.delivery.official) / GOV_STATS.delivery.official) * 100),
        source: GOV_STATS.delivery.source,
        digitalSource: 'App Store + Maps',
      },
      {
        sector: GOV_STATS.ecommerce.label,
        official: GOV_STATS.ecommerce.official,
        digital: ecommerceEstimate,
        blindSpot: Math.round(((ecommerceEstimate - GOV_STATS.ecommerce.official) / GOV_STATS.ecommerce.official) * 100),
        source: GOV_STATS.ecommerce.source,
        digitalSource: 'Salla + Maroof',
      },
      {
        sector: GOV_STATS.freelance.label,
        official: GOV_STATS.freelance.official,
        digital: freelanceEstimate,
        blindSpot: Math.round(((freelanceEstimate - GOV_STATS.freelance.official) / GOV_STATS.freelance.official) * 100),
        source: GOV_STATS.freelance.source,
        digitalSource: 'LinkedIn',
      },
    ];

    const totalBlindSpotGap = totalDigitalEstimate - TOTAL_GOV_OFFICIAL;
    const totalBlindSpotPercent = Math.round((totalBlindSpotGap / TOTAL_GOV_OFFICIAL) * 100);

    return {
      totalFreelancers, totalStores, totalMaroofStores, totalDataPoints,
      totalLastMileDrivers, totalLastMilePOIs,
      aqarHosts, aqarSuperhosts, aqarListings,
      rideHailingAppEst, deliveryAppEst, totalAppDrivers,
      sectorData, categoryData, mapPoints,
      freelanceDoc, commercialDoc, noDoc, activeStores, inactiveStores,
      totalDigitalEstimate, totalBlindSpotGap, totalBlindSpotPercent, blindSpotData,
      rideHailingEstimate, deliveryEstimate, ecommerceEstimate, freelanceEstimate, aqarEstimate,
      gigWorkerTypes,
      totalRawCollected, populationPenetrationPct,
    };
  }, [freelancers, stores, lastMileData, appStoreAnalytics, maroofData, aqarData]);

  const filteredMapData = sectorFilter === 'All'
    ? computed.mapPoints
    : computed.mapPoints.filter(point => point.city === sectorFilter);

  // Google Trends: build multi-keyword chart data (one line per keyword)
  const { trendsChartData, trendsKeywords } = useMemo(() => {
    if (!trendsData?.rawData || trendsData.rawData.length === 0) {
      return { trendsChartData: [], trendsKeywords: [] };
    }

    // Only keep keywords that actually have timeline entries
    const keywordsWithData = trendsData.rawData.filter(
      kw => kw.interestOverTime_timelineData && kw.interestOverTime_timelineData.length > 0
    );

    if (keywordsWithData.length === 0) return { trendsChartData: [], trendsKeywords: [] };

    // Shorten Arabic keyword labels for chart readability
    const shortLabel = (s: string) => s.length > 20 ? s.slice(0, 20) + '…' : s;
    const keywords = keywordsWithData.map(kw => shortLabel(kw.searchTerm));

    // Use the reference timeline from the first keyword with data
    const refTimeline = keywordsWithData[0].interestOverTime_timelineData;

    const merged = refTimeline.map((pt, idx) => {
      // Real JSON key is `formattedTime`, not `formattedDate`
      const label = pt.formattedTime || pt.formattedDate || '';
      const entry: Record<string, any> = { date: label };
      keywordsWithData.forEach(kw => {
        const point = kw.interestOverTime_timelineData[idx];
        entry[shortLabel(kw.searchTerm)] = point?.value[0] ?? 0;
      });
      return entry;
    });

    return { trendsChartData: merged, trendsKeywords: keywords };
  }, [trendsData]);
  const allCities = [...new Set(computed.mapPoints.map(p => p.city))].sort();

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Smart Observatory — Gov vs Digital Reality\n\n";
    csvContent += "Sector,Official Gov Records,Digital Estimate,Blind Spot %,Gov Source,Digital Source\n";
    computed.blindSpotData.forEach(row => {
      csvContent += `${row.sector},${row.official},${row.digital},+${row.blindSpot}%,${row.source},${row.digitalSource}\n`;
    });
    csvContent += `\nTotal,${TOTAL_GOV_OFFICIAL},${computed.totalDigitalEstimate},+${computed.totalBlindSpotPercent}%,Combined,All Sources\n`;

    csvContent += "\n\nLinkedIn Freelancers by Sector (Source: LinkedIn via Apify)\n";
    csvContent += "Sector,Count\n";
    computed.sectorData.forEach(row => { csvContent += `${row.name},${row.value}\n`; });

    csvContent += "\n\nSalla Stores by Category (Source: Salla Platform)\n";
    csvContent += "Category,Count\n";
    computed.categoryData.forEach(row => { csvContent += `${row.name},${row.value}\n`; });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "observatory_overview_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const workerTypeColorMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('overview.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('overview.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-sm px-4 py-2.5 transition-colors">
            <Download size={16} />
            {t('export.report')}
          </button>
        </div>
      </div>

      {/* ====== TOTAL GIG WORKERS HERO ====== */}
      <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50/40 to-white">
        <CardContent className="p-6">
          {/* Top row: Digital estimate vs Gov */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-1">Total Calculation of Government Records</p>
              <h3 className="text-4xl font-black text-slate-900">
                {TOTAL_GOV_OFFICIAL.toLocaleString()}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Official consolidated records for platform gig workers
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-slate-400">vs. Total Digital Estimate</span>
              <span className="text-2xl font-bold text-slate-400">{computed.totalDigitalEstimate.toLocaleString()}</span>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                {computed.totalBlindSpotPercent > 0 ? '+' : ''}{computed.totalBlindSpotPercent}% gap
              </span>
            </div>
          </div>

          {/* ── Observatory Scale ── */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={15} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Government Records Coverage</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
              <span className="text-3xl font-black text-teal-700">{computed.totalRawCollected.toLocaleString()}</span>
              <span className="text-sm text-slate-500">gig workers &amp; operators collected</span>
              <span className="text-sm text-slate-400">out of</span>
              <span className="text-3xl font-black text-slate-400">{TOTAL_GOV_OFFICIAL.toLocaleString()}</span>
              <span className="text-sm text-slate-400">Official 2025 Target</span>
            </div>

            <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(computed.populationPenetrationPct * 250, 0.4)}%` }}
              />
            </div>

            {/* Source breakdown */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span><strong className="text-slate-700">{computed.totalFreelancers}</strong> LinkedIn profiles</span>
              <span><strong className="text-slate-700">{computed.totalStores.toLocaleString()}</strong> Salla stores</span>
              <span><strong className="text-slate-700">{computed.totalMaroofStores.toLocaleString()}</strong> Maroof businesses</span>
              <span><strong className="text-slate-700">{computed.aqarHosts}</strong> Aqar hosts</span>
              <span><strong className="text-slate-700">{computed.totalLastMilePOIs}</strong> delivery POIs</span>
              <span><strong className="text-slate-700">{computed.totalAppDrivers.toLocaleString()}</strong> est. app-based drivers</span>
            </div>
          </div>

          {/* Worker Type Breakdown */}
          <button
            onClick={() => setWorkerTypesExpanded(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-3 transition-colors"
          >
            {workerTypesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Breakdown by gig worker type
          </button>

          {workerTypesExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {computed.gigWorkerTypes.map((wt: any, idx: number) => {
                const colors = workerTypeColorMap[wt.color] || workerTypeColorMap.teal;
                return (
                  <div key={idx} className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${colors.icon}`}>
                        {wt.icon}
                      </div>
                      <p className={`text-xs font-semibold ${colors.text} leading-tight`}>{wt.type}</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-500">Raw Sample</span>
                        <span className="text-sm font-bold text-slate-800">{wt.rawSample.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] text-slate-500">Market Est.</span>
                        <span className={`text-sm font-bold ${colors.text}`}>
                          {wt.estimate > 0 ? wt.estimate.toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1 border-t border-slate-200/80">
                        <span className="text-[10px] text-slate-400">Gov. Records</span>
                        <span className="text-xs text-slate-500">
                          {wt.gov != null ? wt.gov.toLocaleString() : <span className="italic text-slate-400">Not tracked</span>}
                        </span>
                      </div>
                      {wt.note && (
                        <p className="text-[10px] text-slate-400 pt-0.5">{wt.note}</p>
                      )}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200/80">
                      <SourceBadge label={wt.dataSource} color={wt.sourceColor} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== KPI CARDS ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">LinkedIn Freelancers</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{computed.totalFreelancers}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg"><Users className="text-blue-600" size={22} /></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">Profiles scraped via Apify</p>
              <SourceBadge label="LinkedIn" color="blue" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Salla + Maroof Stores</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">
                  {(computed.totalStores + computed.totalMaroofStores).toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg"><ShoppingCart className="text-amber-600" size={22} /></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">{computed.totalStores} Salla · {computed.totalMaroofStores} Maroof</p>
              <SourceBadge label="Salla + Maroof" color="teal" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Last-Mile Drivers</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{computed.totalLastMileDrivers.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-lg"><Truck className="text-green-600" size={22} /></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">{computed.totalLastMilePOIs} POIs tracked</p>
              <SourceBadge label="Google Maps" color="green" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">App-Based Workers</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{computed.totalAppDrivers.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg"><Smartphone className="text-orange-600" size={22} /></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">Estimated active across 10 apps</p>
              <SourceBadge label="App Store" color="orange" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Real Estate Hosts</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{computed.aqarHosts.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg"><Home className="text-rose-600" size={22} /></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">{computed.aqarSuperhosts} superhosts · {computed.aqarListings} listings</p>
              <SourceBadge label="Aqar" color="purple" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ====== THE STATISTICAL BLIND SPOT — Gov vs Digital Reality ====== */}
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50/30">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Eye className="text-amber-600" size={22} />
              </div>
              <div>
                <CardTitle className="text-lg">the total of government data vs. Digital Reality</CardTitle>
                <CardDescription>Government administrative data compared with multi-source digital footprint estimates</CardDescription>
              </div>
            </div>


          </div>
        </CardHeader>
        <CardContent>
          {/* Source Legend */}
          <div className="bg-white border border-slate-100 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <div className="flex gap-3 flex-wrap flex-1">
              <span><strong>Gov Sources:</strong></span>
              <SourceBadge label="TGA 2025" color="slate" />
              <SourceBadge label="HRSD Sep 2025" color="slate" />
              <SourceBadge label="Min. Commerce" color="slate" />
            </div>
            <div className="flex gap-3 flex-wrap">
              <span><strong>Digital Sources:</strong></span>
              <SourceBadge label="LinkedIn" color="blue" />
              <SourceBadge label="Salla + Maroof" color="teal" />
              <SourceBadge label="App Store" color="orange" />
              <SourceBadge label="Google Maps" color="green" />
            </div>

          </div>

          <div className="h-80 w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={computed.blindSpotData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="sector" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string, props: any) => {
                    const source = name === 'Official Gov. Records' ? props.payload.source : props.payload.digitalSource;
                    return [value.toLocaleString() + ' workers', `${name} (${source})`];
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="digital" name="Digital Estimate (Observatory)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={55} />
                <Bar dataKey="official" name="the total of government data" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={55} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Blind Spot Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {computed.blindSpotData.map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-md transition-shadow">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{item.sector}</p>
                <p className="text-2xl font-black text-amber-600">+{item.blindSpot}%</p>
                <p className="text-xs text-slate-400 mt-1">blind spot</p>
                <div className="mt-2 flex flex-col items-center gap-1">
                  <SourceBadge label={`Gov: ${item.source}`} color="slate" />
                  <SourceBadge label={item.digitalSource} color={idx === 0 ? 'orange' : idx === 1 ? 'green' : idx === 2 ? 'teal' : 'blue'} />
                </div>
              </div>
            ))}
          </div>

          {/* The Blind Spot Callout */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
            <div className="p-2.5 bg-amber-100 rounded-full text-amber-700 mt-0.5 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-base">The Statistical Blind Spot</h4>
              <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                Official government records capture <strong>{TOTAL_GOV_OFFICIAL.toLocaleString()}</strong> workers across all platform sectors.
                Our multi-source digital analysis (LinkedIn · Salla · Maroof · App Store · Google Maps) estimates the true figure is closer to <strong>{computed.totalDigitalEstimate.toLocaleString()}</strong> —
                a gap of <strong>{computed.totalBlindSpotGap.toLocaleString()}</strong> workers (<strong>{computed.totalBlindSpotPercent}%</strong>) invisible to traditional administrative records.
                E-Commerce shows the largest gap: only {Math.round((GOV_STATS.ecommerce.official / (computed.ecommerceEstimate || 1)) * 100)}% of operators appear in official registrations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== CHARTS ROW ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Freelancer Sector Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Freelancer Sector Distribution</CardTitle>
                <CardDescription>Professional fields inferred from {computed.totalFreelancers} LinkedIn profiles</CardDescription>
              </div>
              <SourceBadge label="LinkedIn via Apify" color="blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-2">
              {computed.sectorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computed.sectorData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={130} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value} freelancers`, 'LinkedIn']}
                    />
                    <Bar dataKey="value" name="Freelancers" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {computed.sectorData.map((_, idx) => (
                        <Cell key={idx} fill={SECTOR_COLORS[idx % SECTOR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">No data available yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Salla Store Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>E-Commerce Category Mix</CardTitle>
                <CardDescription>{computed.totalStores} Salla stores + {computed.totalMaroofStores} Maroof businesses</CardDescription>
              </div>
              <SourceBadge label="Salla + Maroof" color="teal" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full mt-2">
              {computed.categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={computed.categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                      paddingAngle={3} dataKey="value" stroke="none" cornerRadius={4}>
                      {computed.categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number, name: string) => [`${value} stores`, name]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">No data available yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ====== GEOGRAPHIC HEATMAP ====== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <CardTitle>{t('map.title')}</CardTitle>
              <SourceBadge label="LinkedIn + Google Maps" color="green" />
            </div>
            <CardDescription>Freelancer concentration from LinkedIn profiles — city-level density</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <select className="text-xs border border-slate-200 rounded-md text-slate-700 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-teal-500"
              value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)}>
              <option value="All">All Cities</option>
              {allCities.map(city => (<option key={city} value={city}>{city}</option>))}
            </select>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              {computed.mapPoints.length} Clusters
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full bg-slate-100 rounded-lg border border-slate-200 relative overflow-hidden">
            <MapContainer center={[23.8859, 45.0792]} zoom={5} style={{ height: '100%', width: '100%', zIndex: 0 }} scrollWheelZoom={false}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              <MarkerClusterGroup chunkedLoading>
                {filteredMapData.map((point) => (
                  <CircleMarker key={point.id} center={[point.lat, point.lng]}
                    radius={getDensityRadius(point.workers)}
                    pathOptions={{ fillColor: getDensityColor(point.workers), color: getDensityColor(point.workers), weight: 1, fillOpacity: 0.4 }}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{point.city}</p>
                        <p className="text-slate-600">Freelancers: <span className="font-medium">{point.workers}</span></p>
                        <p className="text-slate-500 text-xs mt-1 capitalize">Density: {point.density}</p>
                        <p className="text-slate-400 text-xs mt-1">Source: LinkedIn via Apify</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-sm border border-slate-200 text-xs z-[1000]">
              <div className="font-medium text-slate-700 mb-2">Density</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div> High (10+)</div>
              <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Medium (4-9)</div>
              <div className="flex items-center gap-2 mt-1"><div className="w-3 h-3 rounded-full bg-teal-500"></div> Low (1-3)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== GOOGLE TRENDS SEARCH DEMAND ====== */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="text-blue-500" size={20} />
                Gig Economy Search Demand
              </CardTitle>
              <CardDescription>
                Google Search interest over time for gig economy keywords in Saudi Arabia
                {trendsKeywords.length > 0 && (
                  <span className="ml-2 text-teal-600 font-medium">— {trendsKeywords.length} keyword{trendsKeywords.length > 1 ? 's' : ''} tracked</span>
                )}
              </CardDescription>
            </div>
            <SourceBadge label="Google Trends (Apify)" color="blue" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full mt-4">
            {trendsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsChartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} dy={10} minTickGap={30} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [value, `"${name}" (Google Trends)`]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }} />
                  {trendsKeywords.map((kw, idx) => (
                    <Line
                      key={kw}
                      type="monotone"
                      dataKey={kw}
                      stroke={SECTOR_COLORS[idx % SECTOR_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                <Activity size={32} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-600 mb-1">No Demand Data Available</p>
                <p className="text-xs">Navigate to the Search Trends (Google) tab to run a live analysis and populate this chart.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
