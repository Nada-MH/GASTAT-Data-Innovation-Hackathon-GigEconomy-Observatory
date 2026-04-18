import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useLinkedInAnalytics } from '../contexts/LinkedInAnalyticsContext';
import { useSallaAnalytics } from '../contexts/SallaAnalyticsContext';
import { useMapAnalytics } from '../contexts/MapAnalyticsContext';
import { useAppStore } from '../contexts/AppStoreContext';
import { useMaroofAnalytics } from '../contexts/MaroofAnalyticsContext';
import { useAqarIntelligence } from '../contexts/AqarIntelligenceContext';
import { useTwitterAnalytics } from '../contexts/TwitterAnalyticsContext';
import { useReviewAnalytics } from '../contexts/ReviewAnalyticsContext';
import { useGoogleTrends } from '../contexts/GoogleTrendsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Code,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface DataSource {
  id: number;
  name: string;
  status: 'healthy' | 'warning' | 'inactive';
  lastSync: string;
  type: string;
  records: string;
  description: string;
  cachedEndpoint: string;
  liveEndpoint: string;
  dataFile: string;
}

export function DataTransparency() {
  const [showFormula, setShowFormula] = useState(false);
  const { t } = useLanguage();

  // All data contexts
  const { freelancers, isLoading: linkedinLoading } = useLinkedInAnalytics();
  const { stores, isLoading: sallaLoading } = useSallaAnalytics();
  const { data: lastMileData, isLoading: mapLoading, timestamp: mapTimestamp } = useMapAnalytics();
  const { analytics: appStoreAnalytics, isLoading: appLoading } = useAppStore();
  const { data: maroofData, isLoading: maroofLoading } = useMaroofAnalytics();
  const { data: aqarData, isLoading: aqarLoading } = useAqarIntelligence();
  const { data: twitterData, isLoading: twitterLoading } = useTwitterAnalytics();
  const { data: reviewData, isLoading: reviewLoading } = useReviewAnalytics();
  const { trendsData, isLoading: trendsLoading } = useGoogleTrends();

  const anyLoading = linkedinLoading || sallaLoading || mapLoading || appLoading ||
    maroofLoading || aqarLoading || twitterLoading || reviewLoading || trendsLoading;

  const formatTimeAgo = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return 'Never synced';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const sources = useMemo((): DataSource[] => {
    // LinkedIn last-scraped timestamp
    const linkedinDates = freelancers
      .map(f => new Date((f as any).lastScrapedAt).getTime())
      .filter(d => !isNaN(d));
    const linkedinLastSync = linkedinDates.length > 0
      ? formatTimeAgo(new Date(Math.max(...linkedinDates))) : 'Never synced';

    // Salla last-scraped timestamp
    const sallaDates = stores
      .map(s => new Date((s as any).lastScrapedAt).getTime())
      .filter(d => !isNaN(d));
    const sallaLastSync = sallaDates.length > 0
      ? formatTimeAgo(new Date(Math.max(...sallaDates))) : 'Never synced';

    // Google Trends — from context lastUpdated
    const trendsLastSync = trendsData
      ? 'Cached' : 'Never synced';

    // App Store — from analytics fetchedAt
    const appLastSync = appStoreAnalytics?.fetchedAt
      ? formatTimeAgo(new Date(appStoreAnalytics.fetchedAt)) : 'Never synced';

    // Last-mile — from mapTimestamp
    const mapsLastSync = mapTimestamp
      ? formatTimeAgo(new Date(mapTimestamp)) : 'Never synced';

    // Twitter — from context timestamp (handled inline)
    const twitterTweets = twitterData?.tweets?.length || 0;
    const twitterStatus = twitterData?.stats ? 'healthy' : 'warning';

    // Reviews
    const reviewStatus = reviewData ? 'healthy' : 'warning';
    const reviewCount = (reviewData as any)?.totalReviews || (reviewData as any)?.reviews?.length || 0;

    // Maroof
    const maroofStatus = (maroofData?.totalStores || 0) > 0 ? 'healthy' : 'warning';
    const maroofLastSync = maroofData?.lastUpdated
      ? formatTimeAgo(new Date(maroofData.lastUpdated)) : 'Never synced';

    // Aqar
    const aqarStatus = (aqarData?.totalListings || 0) > 0 ? 'healthy' : 'warning';
    const aqarLastSync = aqarData?.lastUpdated
      ? formatTimeAgo(new Date((aqarData as any).lastUpdated)) : 'Never synced';

    return [
      {
        id: 1,
        name: 'LinkedIn Profile Scraper',
        status: freelancers.length > 0 ? 'healthy' : 'warning',
        lastSync: linkedinLastSync,
        type: 'Freelancer Profiles',
        records: `${freelancers.length.toLocaleString()} profiles`,
        description: 'Scrapes Saudi LinkedIn profiles of gig/freelance workers via Apify cloud actor. Deduplicates by profileUrl.',
        cachedEndpoint: 'GET /api/linkedin/freelancers',
        liveEndpoint: 'POST /api/linkedin/apify/run',
        dataFile: 'data/linkedin_freelancers.json',
      },
      {
        id: 2,
        name: 'Salla E-Commerce Platform',
        status: stores.length > 0 ? 'healthy' : 'warning',
        lastSync: sallaLastSync,
        type: 'E-Commerce Stores',
        records: `${stores.length.toLocaleString()} stores`,
        description: 'Catalogs freelance-operated stores on the Salla platform via Mahally API. Tracks category, document type, and store status.',
        cachedEndpoint: 'GET /api/salla/stores',
        liveEndpoint: 'POST /api/salla/sync',
        dataFile: 'data/salla_stores.json',
      },
      {
        id: 3,
        name: 'Maroof Business Registry',
        status: maroofStatus,
        lastSync: maroofLastSync,
        type: 'Certified Businesses',
        records: `${(maroofData?.totalStores || 0).toLocaleString()} businesses`,
        description: 'Saudi government-linked commercial registry. Tracks Gold (Commercial Reg.) and Silver (Freelance Lic.) certified operators.',
        cachedEndpoint: 'GET /api/maroof/cached',
        liveEndpoint: 'POST /api/maroof/sync',
        dataFile: 'data/maroof_stores.json',
      },
      {
        id: 4,
        name: 'Google Trends (Apify)',
        status: trendsData ? 'healthy' : 'warning',
        lastSync: trendsLastSync,
        type: 'Search Volume Trends',
        records: trendsData
          ? `${trendsData.rawData.length} keywords · ${trendsData.rawData[0]?.interestOverTime_timelineData?.length || 0} data points each`
          : 'No data',
        description: 'Fetches Google Trends interest-over-time for gig economy Arabic keywords in Saudi Arabia. Returns formattedTime timeline data per keyword.',
        cachedEndpoint: 'GET /api/trends/cached',
        liveEndpoint: 'POST /api/trends/run → GET /api/trends/status/:runId → GET /api/trends/results/:datasetId',
        dataFile: 'data/google_trends.json',
      },
      {
        id: 5,
        name: 'App Store Intelligence',
        status: appStoreAnalytics ? 'healthy' : 'warning',
        lastSync: appLastSync,
        type: 'App Reviews → Driver Estimates',
        records: appStoreAnalytics
          ? `${appStoreAnalytics.totals.totalReviews.toLocaleString()} reviews · ${appStoreAnalytics.totals.totalActiveDrivers.toLocaleString()} est. drivers`
          : 'No data',
        description: 'Fetches review counts from iTunes API and Google Play for 10 Saudi gig apps. Estimates active drivers via: (reviews ÷ 2%) ÷ 15 orders × 10% active ratio.',
        cachedEndpoint: 'GET /api/apps/cached',
        liveEndpoint: 'GET /api/apps/fetch',
        dataFile: 'data/apps_analytics.json',
      },
      {
        id: 6,
        name: 'Last-Mile Analytics (Google Maps)',
        status: lastMileData.length > 0 ? 'healthy' : 'warning',
        lastSync: mapsLastSync,
        type: 'POI & Fleet Inference',
        records: `${lastMileData.length} POIs · ${lastMileData.reduce((a, p) => a + p.activeDrivers, 0).toLocaleString()} inferred drivers`,
        description: 'Queries Google Maps API for Cloud Kitchens and Logistics Hubs. Infers active delivery fleet from busyness signals and traffic data.',
        cachedEndpoint: 'GET /api/last-mile/cached',
        liveEndpoint: 'GET /api/last-mile/analyze',
        dataFile: 'data/last_mile_analytics.json',
      },
      {
        id: 7,
        name: 'Twitter / Social Analytics',
        status: twitterStatus,
        lastSync: twitterData?.stats ? 'Cached' : 'Never synced',
        type: 'Social Sentiment',
        records: twitterData?.stats
          ? `${twitterTweets} tweets · ${twitterData.stats.pos_pct}% positive`
          : 'No data',
        description: 'Scrapes Arabic gig economy hashtags via Apify Twitter scraper. Computes sentiment (positive/negative/neutral) and pressure index across 6 gig-related hashtags.',
        cachedEndpoint: 'GET /api/twitter/cached',
        liveEndpoint: 'POST /api/twitter/analyze',
        dataFile: 'data/twitter_analytics.json',
      },
      {
        id: 8,
        name: 'Gig Worker Reviews',
        status: reviewStatus,
        lastSync: reviewData ? 'Cached' : 'Never synced',
        type: 'Platform Reviews',
        records: reviewCount > 0 ? `${reviewCount.toLocaleString()} reviews` : 'No data',
        description: 'Aggregates worker-side reviews from Saudi gig platforms. Captures driver/worker experience, complaint patterns, and platform satisfaction signals.',
        cachedEndpoint: 'GET /api/reviews/cached',
        liveEndpoint: 'POST /api/reviews/sync',
        dataFile: 'data/saudi_gig_reviews.json',
      },
      {
        id: 9,
        name: 'Aqar Real Estate Intelligence',
        status: aqarStatus,
        lastSync: aqarLastSync,
        type: 'Short-Term Rental Hosts',
        records: aqarData
          ? `${aqarData.totalListings.toLocaleString()} listings · ${aqarData.uniqueHosts.toLocaleString()} hosts`
          : 'No data',
        description: 'Scrapes property listings from the Aqar platform. Tracks unique hosts, superhosts, city distribution, and property types — a sector entirely absent from government records.',
        cachedEndpoint: 'GET /api/aqar/cached',
        liveEndpoint: 'POST /api/aqar/sync',
        dataFile: 'data/aqar_intelligence.json',
      },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freelancers, stores, lastMileData, appStoreAnalytics, maroofData, aqarData, twitterData, reviewData, trendsData, mapTimestamp]);

  const healthyCount = sources.filter(s => s.status === 'healthy').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('transparency.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('transparency.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {healthyCount}/{sources.length} sources active
          </span>
          <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            anyLoading
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : healthyCount === sources.length
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {anyLoading ? (
              <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
            ) : healthyCount === sources.length ? (
              <><CheckCircle2 size={14} /> All Systems Active</>
            ) : (
              <><AlertCircle size={14} /> {sources.length - healthyCount} Sources Pending</>
            )}
          </span>
        </div>
      </div>

      {/* ====== SOURCE INTEGRATION TABLE ====== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Source Integration Status</CardTitle>
              <CardDescription>All 9 data pipelines powering the observatory — real-time health and record counts</CardDescription>
            </div>
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              title="Toggle Technical View"
            >
              <Code size={20} />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Sync</th>
                  <th className="px-4 py-3 font-medium">Data Type</th>
                  <th className="px-4 py-3 font-medium text-right">Records</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Database size={15} className="text-slate-400 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-900 leading-tight">{source.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{source.dataFile}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {source.status === 'healthy' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Wifi size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <WifiOff size={11} /> No Data
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span className="text-xs">{source.lastSync}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{source.type}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700">{source.records}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ====== TECHNICAL VIEW / METHODOLOGY ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint Map */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server size={18} className="text-teal-600" />
              API Endpoint Map
            </CardTitle>
            <CardDescription>Cached vs live endpoints for every data source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sources.map(s => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 mb-1">{s.name}</p>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{s.cachedEndpoint}</p>
                    <p className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{s.liveEndpoint}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Architecture + Methodology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code size={18} className="text-teal-600" />
              {showFormula ? 'Pipeline Architecture' : t('methodology.title')}
            </CardTitle>
            <CardDescription>{t('methodology.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {showFormula ? (
              <div className="p-4 bg-slate-900 rounded-lg font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed" dir="ltr">
                <p className="text-slate-500 mb-2">// Observatory Data Pipeline — 9 Sources</p>
                {[
                  ['LinkedIn', 'POST /api/linkedin/apify/run', 'GET /api/linkedin/freelancers', 'linkedin_freelancers.json'],
                  ['Salla', 'POST /api/salla/sync', 'GET /api/salla/stores', 'salla_stores.json'],
                  ['Maroof', 'POST /api/maroof/sync', 'GET /api/maroof/cached', 'maroof_stores.json'],
                  ['Google Trends', 'POST /api/trends/run', 'GET /api/trends/cached', 'google_trends.json'],
                  ['App Store', 'GET /api/apps/fetch', 'GET /api/apps/cached', 'apps_analytics.json'],
                  ['Last-Mile Maps', 'GET /api/last-mile/analyze', 'GET /api/last-mile/cached', 'last_mile_analytics.json'],
                  ['Twitter', 'POST /api/twitter/analyze', 'GET /api/twitter/cached', 'twitter_analytics.json'],
                  ['Reviews', 'POST /api/reviews/sync', 'GET /api/reviews/cached', 'saudi_gig_reviews.json'],
                  ['Aqar', 'POST /api/aqar/sync', 'GET /api/aqar/cached', 'aqar_intelligence.json'],
                ].map(([name, live, cached, file], i) => (
                  <div key={i} className="mb-3">
                    <p><span className="text-pink-400">Source {i + 1}:</span> {name}</p>
                    <p className="pl-4 text-blue-300">live  → {live}</p>
                    <p className="pl-4 text-teal-400">cache → {cached}</p>
                    <p className="pl-4 text-slate-500">file  → data/{file}</p>
                  </div>
                ))}
                <p className="text-slate-500 mt-2">// App Store driver estimation formula:</p>
                <p className="text-yellow-300">activeDrivers = (reviews / 0.02) / 15 * 0.10</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                    <Server size={15} className="text-teal-600" />
                    {t('formula.title')}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    The observatory runs a Node.js/Express backend that caches data from 9 sources:
                    LinkedIn (Apify), Salla (Mahally API), Maroof registry, Google Trends (Apify),
                    App Store + Google Play (iTunes API), Google Maps POIs, Twitter (Apify),
                    Gig reviews, and Aqar real estate listings.
                    All data is persisted as JSON files and served via REST endpoints to the React frontend.
                  </p>
                </div>
                {sources.map(s => (
                  <div key={s.id} className="p-3 bg-white rounded-lg border border-slate-100 hover:border-teal-200 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        s.status === 'healthy' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>{s.records}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">{s.description}</p>
                  </div>
                ))}
                <button
                  onClick={() => setShowFormula(true)}
                  className="w-full py-2 text-sm font-medium text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-teal-100"
                >
                  {t('button.viewformula')}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
