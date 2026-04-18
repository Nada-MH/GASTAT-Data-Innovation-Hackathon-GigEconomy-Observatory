/**
 * Express Backend Server
 * Proxies Apify Google Trends Scraper API calls
 * Keeps API token secure on server-side
 */

import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { runNativeSallaScraper } from './sallaScraper';
import { runNativeLinkedInScraper } from './linkedinScraper';
import { runGigReviewsScraper } from './reviewsScraper';
import { runAqarSync } from './scrapers/aqarScraper';
import { runMaroofSync } from './scrapers/maroofScraper';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_TOKEN = process.env.APIFY_API_TOKEN || '';
const BASE_URL = 'https://api.apify.com/v2';

// In-memory cache of last analysis results
let cachedResults: any = null;
let cachedTimestamp: string | null = null;



// Helper to persist Google Trends data
function saveTrendsData(data: any, timestamp: string) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const trendsDbPath = path.join(dataDir, 'google_trends.json');
    fs.writeFileSync(trendsDbPath, JSON.stringify({ data, timestamp }, null, 2), 'utf-8');
    console.log(`✅ Saved Google Trends data to ${trendsDbPath}`);
  } catch (e) {
    console.error('❌ Failed to save Google Trends data:', e);
  }
}

// Initial load on startup
(function loadTrendsData() {
  const trendsDbPath = path.join(process.cwd(), 'data', 'google_trends.json');
  if (fs.existsSync(trendsDbPath)) {
    try {
      const { data, timestamp } = JSON.parse(fs.readFileSync(trendsDbPath, 'utf-8'));
      cachedResults = data;
      cachedTimestamp = timestamp;
      console.log('✅ Loaded Google Trends analytics from disk');
    } catch (e) {
      console.error('Failed to load Google Trends analytics during startup', e);
    }
  }
})();

// ---- Health Check ----
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiToken: !!API_TOKEN,
    cachedResults: !!cachedResults,
    cachedTimestamp,
  });
});

// ---- Force Git Sync (Overrides Persistent Disk) ----
app.get('/api/admin/sync-git', (_req, res) => {
  try {
    const { execSync } = require('child_process');
    // Force git to overwrite the persistent disk data/ folder with the latest commit from GitHub
    execSync('git checkout HEAD -- data/twitter_analytics.json', { stdio: 'ignore' });
    
    // Reload the file into memory
    const dbPath = path.join(process.cwd(), 'data', 'twitter_analytics.json');
    if (fs.existsSync(dbPath)) {
      const { data, timestamp } = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      cachedTwitterData = data;
      cachedTwitterTimestamp = timestamp;
    }
    
    res.json({ message: '✅ Success: Forced synced twitter_analytics.json from GitHub to persistent disk!' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to sync git: ' + error.message });
  }
});

// ---- Start a new Apify Google Trends Scraper run ----
app.post('/api/trends/run', async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'APIFY_API_TOKEN not configured in .env.local' });
    }

    const { searchTerms, geo, timeRange } = req.body;

    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      return res.status(400).json({ error: 'searchTerms must be a non-empty array' });
    }

    const runUrl = `${BASE_URL}/acts/apify~google-trends-scraper/runs?token=${API_TOKEN}`;

    const response = await fetch(runUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchTerms,
        geo: geo || 'SA',
        timeRange: timeRange || 'today 3-m',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Apify run start failed:', errorText);
      return res.status(response.status).json({ error: `Apify API error: ${errorText}` });
    }

    const data = await response.json();

    res.json({
      runId: data.data.id,
      datasetId: data.data.defaultDatasetId,
    });
  } catch (error: any) {
    console.error('Error starting run:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---- Check status of a running actor ----
app.get('/api/trends/status/:runId', async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'APIFY_API_TOKEN not configured' });
    }

    const { runId } = req.params;
    const statusUrl = `${BASE_URL}/acts/apify~google-trends-scraper/runs/${runId}?token=${API_TOKEN}`;

    const response = await fetch(statusUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to check run status' });
    }

    const data = await response.json();

    res.json({
      status: data.data.status,
      startedAt: data.data.startedAt,
      finishedAt: data.data.finishedAt,
    });
  } catch (error: any) {
    console.error('Error checking status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---- Fetch results from completed dataset ----
app.get('/api/trends/results/:datasetId', async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'APIFY_API_TOKEN not configured' });
    }

    const { datasetId } = req.params;
    const datasetUrl = `${BASE_URL}/datasets/${datasetId}/items?token=${API_TOKEN}`;

    const response = await fetch(datasetUrl);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch dataset' });
    }

    const data = await response.json();

    // Cache the raw results
    cachedResults = data;
    cachedTimestamp = new Date().toISOString();

    // Persist to local JSON file
    saveTrendsData(data, cachedTimestamp);

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching results:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---- Get cached results ----
app.get('/api/trends/cached', (_req, res) => {
  if (!cachedResults) {
    return res.status(404).json({ error: 'No cached results available. Run an analysis first.' });
  }

  res.json({
    data: cachedResults,
    timestamp: cachedTimestamp,
  });
});

// ═══════════════════════════════════════════
// APP STORE & GOOGLE PLAY ANALYTICS
// ═══════════════════════════════════════════

const APPS_CONFIG = [
  { name: 'Uber Driver', ios: '1131342792', android: 'com.ubercab.driver' },
  { name: 'HungerStation', ios: '1417971080', android: 'com.logistics.rider.hungerstation' },
  { name: 'Jahez Driver', ios: '1533853878', android: 'com.jahez.drivers' },
  { name: 'Jeeny Driver', ios: '1456609782', android: 'me.com.easytaxista' },
  { name: 'Bolt Driver', ios: '1218410932', android: 'ee.mtakso.driver' },
  { name: 'The Chefz', ios: '1509399994', android: 'com.thechefz.drivers' },
  { name: 'Keeta Rider', ios: '1673738231', android: 'com.sankuai.sailor.courier' },
  { name: 'ToYou Rep', ios: '1616631880', android: 'com.arammeem.android.apps.driver' },
  { name: 'Maraseel', ios: '6746419135', android: 'com.mrsool.courier' },
  { name: 'Noon Food Partner', ios: '6475007255', android: null as string | null },
  { name: 'Hemam Partner', ios: '6450216677', android: 'sa.com.hemam.transportation.riyadh.partner' },
  { name: 'Kaiian Driver', ios: '1308477204', android: 'com.multibrains.taxi.driver.kayantaxi' },
];

let cachedAppData: any = null;
let cachedAppTimestamp: string | null = null;

// Helper to persist App Store data
function saveAppData(data: any, timestamp: string) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const appDbPath = path.join(dataDir, 'apps_analytics.json');
  fs.writeFileSync(appDbPath, JSON.stringify({ data, timestamp }, null, 2), 'utf-8');
}

// Initial load on startup
(function loadAppData() {
  const appDbPath = path.join(process.cwd(), 'data', 'apps_analytics.json');
  if (fs.existsSync(appDbPath)) {
    try {
      const { data, timestamp } = JSON.parse(fs.readFileSync(appDbPath, 'utf-8'));
      cachedAppData = data;
      cachedAppTimestamp = timestamp;
      console.log('✅ Loaded App Store analytics from disk');
    } catch (e) {
      console.error('Failed to load App Store analytics during startup', e);
    }
  }
})();

// Fetch iOS review count from iTunes Lookup API
async function fetchIOSReviews(appId: string): Promise<number> {
  try {
    const url = `https://itunes.apple.com/lookup?id=${appId}&country=sa`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (data.resultCount > 0) {
      return data.results[0].userRatingCount || 0;
    }
  } catch (e: any) {
    console.error(`[iOS] Error fetching ${appId}:`, e.message);
  }
  return 0;
}

// Fetch Android review count via a scraping approach
async function fetchAndroidReviews(packageName: string): Promise<number> {
  try {
    // Use the Google Play store page to extract review count
    const url = `https://play.google.com/store/apps/details?id=${packageName}&hl=en&gl=sa`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en;q=0.9',
      },
    });
    const html = await response.text();

    // Try to extract review count from the HTML
    // Google Play embeds the review count in the page data
    // Look for patterns like "X,XXX reviews" or rating count data
    const ratingCountMatch = html.match(/(\d[\d,]*)\s*(?:ratings|reviews|تقييم)/i);
    if (ratingCountMatch) {
      return parseInt(ratingCountMatch[1].replace(/,/g, ''), 10);
    }

    // Alternative: extract from JSON-LD or structured data
    const jsonMatch = html.match(/"ratingCount"\s*:\s*"?(\d+)"?/);
    if (jsonMatch) {
      return parseInt(jsonMatch[1], 10);
    }

    // Fallback: try numeric pattern near rating indicators
    const numericMatch = html.match(/(\d{3,})\s*(?:review|rating)/i);
    if (numericMatch) {
      return parseInt(numericMatch[1].replace(/,/g, ''), 10);
    }
  } catch (e: any) {
    console.error(`[Android] Error fetching ${packageName}:`, e.message);
  }
  return 0;
}

// ---- Fetch all app store data ----
app.get('/api/apps/fetch', async (_req, res) => {
  try {
    console.log('📱 Fetching app store data...');
    const results = [];

    for (const appConfig of APPS_CONFIG) {
      let iosReviews = 0;
      let androidReviews = 0;

      if (appConfig.ios) {
        iosReviews = await fetchIOSReviews(appConfig.ios);
        console.log(`   [iOS] ${appConfig.name}: ${iosReviews.toLocaleString()} reviews`);
      }

      if (appConfig.android) {
        androidReviews = await fetchAndroidReviews(appConfig.android);
        console.log(`   [Android] ${appConfig.name}: ${androidReviews.toLocaleString()} reviews`);
      }

      results.push({
        app: appConfig.name,
        iosReviews,
        androidReviews,
      });
    }

    cachedAppData = results;
    cachedAppTimestamp = new Date().toISOString();

    // Persist to local JSON file
    saveAppData(results, cachedAppTimestamp);

    console.log('✅ App store data fetched and persisted successfully');
    res.json({ data: results, timestamp: cachedAppTimestamp });
  } catch (error: any) {
    console.error('Error fetching app data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---- Get cached app data ----
app.get('/api/apps/cached', (_req, res) => {
  if (!cachedAppData) {
    return res.status(404).json({ error: 'No cached app data. Click "Fetch Data" first.' });
  }
  res.json({ data: cachedAppData, timestamp: cachedAppTimestamp });
});

// ═══════════════════════════════════════════
// LAST-MILE ANALYSIS (Maps & Traffic)
// ═══════════════════════════════════════════

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

const LAST_MILE_POIS_FALLBACK = [
  { id: 1, lat: 24.7136, lng: 46.6753, type: 'Cloud Kitchen', name: 'Riyadh Central Kitchen' },
  { id: 2, lat: 24.7500, lng: 46.7000, type: 'Logistics Hub', name: 'North Sorting Center' },
  { id: 3, lat: 24.6800, lng: 46.6500, type: 'Cloud Kitchen', name: 'South Food Hub' },
  { id: 4, lat: 21.4858, lng: 39.1925, type: 'Logistics Hub', name: 'Jeddah Main Port' },
  { id: 5, lat: 21.5500, lng: 39.1500, type: 'Cloud Kitchen', name: 'Jeddah North Kitchens' },
  { id: 6, lat: 26.4207, lng: 50.0888, type: 'Logistics Hub', name: 'Dammam East Hub' },
  { id: 7, lat: 24.7200, lng: 46.6800, type: 'Cloud Kitchen', name: 'Olaya Kitchens' },
  { id: 8, lat: 24.7600, lng: 46.7100, type: 'Logistics Hub', name: 'Airport Road Hub' },
  { id: 9, lat: 24.6900, lng: 46.6600, type: 'Cloud Kitchen', name: 'Batha Food Center' },
  { id: 10, lat: 24.7800, lng: 46.7500, type: 'Logistics Hub', name: 'East Ring Hub' },
  { id: 11, lat: 24.6500, lng: 46.6200, type: 'Cloud Kitchen', name: 'Suwaidi Kitchen' },
  { id: 12, lat: 24.7300, lng: 46.6900, type: 'Cloud Kitchen', name: 'Malaz Kitchen' },
  { id: 13, lat: 21.5000, lng: 39.2000, type: 'Cloud Kitchen', name: 'Al Balad Kitchen' },
  { id: 14, lat: 21.5800, lng: 39.1600, type: 'Logistics Hub', name: 'King Abdulaziz Hub' },
  { id: 15, lat: 21.4500, lng: 39.2200, type: 'Cloud Kitchen', name: 'South Jeddah Kitchen' },
  { id: 16, lat: 21.6000, lng: 39.1400, type: 'Cloud Kitchen', name: 'Obhur Food Hub' },
  { id: 17, lat: 26.3000, lng: 50.2000, type: 'Logistics Hub', name: 'Khobar Main Hub' },
  { id: 18, lat: 26.3500, lng: 50.1500, type: 'Cloud Kitchen', name: 'Dhahran Kitchen' },
  { id: 19, lat: 26.4500, lng: 50.1000, type: 'Cloud Kitchen', name: 'Dammam North Kitchen' },
  { id: 20, lat: 26.2800, lng: 50.2100, type: 'Cloud Kitchen', name: 'Corniche Food Hub' }
];

interface DynamicPOI {
  id: number;
  lat: number;
  lng: number;
  type: string;
  name: string;
}

let cachedDynamicPOIs: DynamicPOI[] = [];
let dynamicPOIsTimestamp: number = 0;

async function ensurePOIsCached(API_KEY: string): Promise<DynamicPOI[]> {
  // Cache for 24 hours
  if (cachedDynamicPOIs.length > 0 && Date.now() - dynamicPOIsTimestamp < 24 * 60 * 60 * 1000) {
    return cachedDynamicPOIs;
  }

  console.log('🌍 Fetching REAL places from Google Places API...');
  const queries = [
    { q: 'Cloud Kitchen in Riyadh', type: 'Cloud Kitchen' },
    { q: 'Logistics Hub in Riyadh', type: 'Logistics Hub' },
    { q: 'Cloud Kitchen in Jeddah', type: 'Cloud Kitchen' },
    { q: 'Logistics Hub in Jeddah', type: 'Logistics Hub' },
    { q: 'Logistics Hub in Dammam', type: 'Logistics Hub' },
    { q: 'Cloud Kitchen in Dammam', type: 'Cloud Kitchen' }
  ];

  const newPOIs: DynamicPOI[] = [];
  let idCounter = 1;

  for (const { q, type } of queries) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.results) {
        // We can increase this limit up to 20 (max per Places API page), but 12 gives us around ~72 total locations across Saudi Arabia.
        const topResults = data.results.slice(0, 20);
        for (const place of topResults) {
          newPOIs.push({
            id: idCounter++,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            type: type,
            name: place.name || 'Unknown Hub'
          });
        }
      }
      // slight throttle to avoid Places API rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error('Error fetching places for query:', q, e);
    }
  }

  if (newPOIs.length > 0) {
    cachedDynamicPOIs = newPOIs;
    dynamicPOIsTimestamp = Date.now();
    console.log(`✅ Successfully mapped ${newPOIs.length} real locations!`);
  } else {
    console.log('⚠️ Failed to fetch from Google Places API, falling back to static points.');
    cachedDynamicPOIs = LAST_MILE_POIS_FALLBACK;
  }

  return cachedDynamicPOIs;
}

let cachedLastMileData: any = null;
let cachedLastMileTimestamp: string | null = null;

// Helper to persist Last Mile data
function saveLastMileData(data: any, timestamp: string) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'last_mile_analytics.json');
  fs.writeFileSync(dbPath, JSON.stringify({ data, timestamp }, null, 2), 'utf-8');
}

// Initial load on startup
(function loadLastMileData() {
  const dbPath = path.join(process.cwd(), 'data', 'last_mile_analytics.json');
  if (fs.existsSync(dbPath)) {
    try {
      const { data, timestamp } = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      cachedLastMileData = data;
      cachedLastMileTimestamp = timestamp;
      console.log('✅ Loaded Last-Mile analytics from disk');
    } catch (e) {
      console.error('Failed to load Last-Mile analytics during startup', e);
    }
  }
})();

app.get('/api/last-mile/analyze', async (_req, res) => {
  try {
    if (!MAPS_API_KEY) {
      return res.status(500).json({ error: 'GOOGLE_MAPS_API_KEY not configured in .env.local' });
    }

    console.log('🗺️ Fetching last-mile traffic data from Google Maps API...');

    // Adjust time bounds using timezone robustly or just system local time
    const currentHour = new Date().getHours();
    const isPeakTime = (currentHour >= 12 && currentHour <= 15) || (currentHour >= 19 && currentHour <= 22);

    const results = [];

    const poisToAnalyze = await ensurePOIsCached(MAPS_API_KEY);

    for (const poi of poisToAnalyze) {
      // Fake destination 1km away east approx
      const destinationLat = poi.lat;
      const destinationLng = poi.lng + 0.01;

      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${poi.lat},${poi.lng}&destinations=${destinationLat},${destinationLng}&departure_time=now&traffic_model=best_guess&key=${MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      let trafficIndex = 0;
      if (data.status === 'OK' && data.rows && data.rows[0].elements[0].status === 'OK') {
        const element = data.rows[0].elements[0];
        const durationInTraffic = element.duration_in_traffic?.value || 0;
        const durationNormal = element.duration?.value || 0;
        if (durationInTraffic && durationNormal) {
          const delaySeconds = durationInTraffic - durationNormal;
          // convert delay to a 0-100 scale: roughly 10s delay = 1 point
          trafficIndex = Math.min(100, Math.max(0, Math.floor(delaySeconds / 10)));
        }
      }

      // Geospatial Intelligence Modeling
      // Active Fleet = (Traffic Delay Coefficient) * (Busyness Index) * (Hub Capacity)
      const capacity = poi.type === 'Logistics Hub' ? 850 : 300;

      // Busyness index driven by Google Popular Times (simulated via peak hours + baseline)
      const busynessIndex = isPeakTime ? (Math.random() * 0.4 + 0.6) : (Math.random() * 0.4 + 0.2);

      // Traffic Delay Coefficient (0.0 to 1.0) based on distance matrix live traffic vs baseline
      let delayCoefficient = trafficIndex > 0 ? Math.min(1.0, trafficIndex / 70) : 0.05;

      let estimatedDrivers = Math.floor(delayCoefficient * busynessIndex * capacity);

      // Baseline drivers even if no traffic
      estimatedDrivers = Math.max(5, estimatedDrivers);

      results.push({
        id: poi.id,
        type: poi.type,
        name: poi.name,
        lat: poi.lat,
        lng: poi.lng,
        trafficIndex,
        isPeakTime,
        activeDrivers: estimatedDrivers,
        capacity,
        busynessIndex: parseFloat(busynessIndex.toFixed(2)),
        delayCoefficient: parseFloat(delayCoefficient.toFixed(2))
      });

      // Minor throttle to avoid api spam within the loop
      await new Promise(r => setTimeout(r, 50));
    }

    cachedLastMileData = results;
    cachedLastMileTimestamp = new Date().toISOString();

    // Persist to local JSON file
    saveLastMileData(results, cachedLastMileTimestamp);

    console.log('✅ Last-mile data fetched successfully');
    res.json({ data: results, timestamp: cachedLastMileTimestamp });
  } catch (error: any) {
    console.error('Error fetching last mile data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/last-mile/cached', (_req, res) => {
  if (!cachedLastMileData) {
    return res.status(404).json({ error: 'No cached last-mile data' });
  }
  res.json({ data: cachedLastMileData, timestamp: cachedLastMileTimestamp });
});

// ═══════════════════════════════════════════
// X (TWITTER) GIG ANALYZER API
// ═══════════════════════════════════════════

let cachedTwitterData: any = null;
let cachedTwitterTimestamp: string | null = null;

function saveTwitterData(data: any, timestamp: string) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'twitter_analytics.json');
  fs.writeFileSync(dbPath, JSON.stringify({ data, timestamp }, null, 2), 'utf-8');
}

(function loadTwitterData() {
  const dbPath = path.join(process.cwd(), 'data', 'twitter_analytics.json');
  if (fs.existsSync(dbPath)) {
    try {
      const { data, timestamp } = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      cachedTwitterData = data;
      cachedTwitterTimestamp = timestamp;
      console.log('✅ Loaded Twitter Gig Analytics from disk');
    } catch (e) {
      console.error('Failed to load Twitter Gig Analytics during startup', e);
    }
  }
})();

const POSITIVE_WORDS = ["شكراً", "ممتاز", "رائع", "سريع", "أحسن", "جيد", "ولله", "بارك", "مريح", "فرصة", "ربح", "دخل", "ممتازة"];
const NEGATIVE_WORDS = ["شكوى", "سيء", "بطيء", "مشكلة", "تأخير", "غلط", "ظلم", "عمولة", "تعبان", "خسارة", "زبالة", "ما يمشي", "ضغط"];

function simpleSentiment(text: string) {
  const t = (text || "").toLowerCase();
  const pos = POSITIVE_WORDS.filter(w => t.includes(w)).length;
  const neg = NEGATIVE_WORDS.filter(w => t.includes(w)).length;
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

// Immoral/explicit content patterns — keeps the feed work-focused and clean
const IMMORAL_PATTERNS = [
  // Arabic explicit / profanity
  'كس ', 'طيز', 'زب ', 'شرموطة', 'عاهرة', 'منيوك', 'متناك', 'يلعن دين',
  'قحبة', 'نيك', 'بزاز', 'فرج',
  // Sexual / adult
  'سكس', 'إباحي', 'اباحي', 'جنسي', 'erotica', 'porn', 'xxx', 'nude',
  // English profanity
  'fuck', 'motherfuck', 'asshole', 'bitch', ' shit ',
  // Gambling
  'مقامرة', 'كازينو', 'casino', 'gambling',
];

function isImmoralTweet(text: string): boolean {
  const t = (text || "").toLowerCase();
  return IMMORAL_PATTERNS.some(p => t.includes(p));
}

app.post('/api/twitter/analyze', async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'APIFY_API_TOKEN not configured in .env.local' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured in .env.local' });
    }

    const { hashtags = ["سائق أوبر", "هنقرستيشن", "عمل حر السعودية", "بولت السعودية"], maxItems = 50 } = req.body;

    // Clean search terms (remove # symbols - Apify handles plain text better)
    const searchTerms = hashtags.map((h: string) => h.replace(/^#/, '').trim());

    console.log(`🔍 Starting TwitterAPI.io Search for: ${searchTerms.join(', ')}`);

    // 1. Fetch from TwitterAPI.io
    const twitterApiKey = process.env.TWITTER_API_IO_KEY || '';
    let rawTweets: any[] = [];
    let cursor = "";

    // Advanced Search string construction
    // Wrap terms with spaces in quotes for better accuracy
    const queryParts = searchTerms.map((t: string) => (t.includes(' ') ? `"${t}"` : t));
    const queryStr = queryParts.join(" OR ") + " lang:ar";

    try {
      const url = `https://api.twitterapi.io/twitter/tweet/advanced_search?query=${encodeURIComponent(queryStr)}&queryType=Latest`;

      const searchRes = await fetch(url, {
        headers: { 'X-API-Key': twitterApiKey }
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error(`TwitterAPI.io failed: ${searchRes.status} ${errText}`);
      } else {
        const data = await searchRes.json();
        if (data.tweets && Array.isArray(data.tweets)) {
          rawTweets.push(...data.tweets);
        }
      }
    } catch (err: any) {
      console.error('Error fetching from twitterapi.io:', err.message);
    }

    // Enforce reasonable single fetch limit
    rawTweets = rawTweets.slice(0, 50);
    console.log(`✅ Received ${rawTweets.length} real tweets from TwitterAPI.io`);

    if (rawTweets.length === 0 && (!cachedTwitterData || !cachedTwitterData.tweets || cachedTwitterData.tweets.length === 0)) {
      return res.status(404).json({ error: 'TwitterAPI.io returned zero tweets and cache is empty. Try again or use different search terms.' });
    }

    // 2. Normalize new tweets
    const newTweets = rawTweets.map(r => {
      const author = r.author || r.user || {};
      return {
        id: String(r.id || r.id_str || ""),
        text: r.text || r.full_text || "",
        author: author.userName || author.screen_name || "unknown",
        likes: r.likeCount || r.favorite_count || 0,
        retweets: r.retweetCount || r.retweet_count || 0,
        replies: r.replyCount || 0,
        views: r.viewCount || 0,
        sentiment: simpleSentiment(r.text || r.full_text || ""),
        created_at: r.createdAt || r.created_at || new Date().toISOString()
      };
    });

    // 3. Merge with existing cached tweets
    let allTweets = [...newTweets];
    if (cachedTwitterData && Array.isArray(cachedTwitterData.tweets)) {
      allTweets = [...allTweets, ...cachedTwitterData.tweets];
    }

    // Deduplicate by tweet id
    const uniqueTweetsMap = new Map();
    for (const t of allTweets) {
      if (!uniqueTweetsMap.has(t.id)) {
        uniqueTweetsMap.set(t.id, t);
      }
    }
    allTweets = Array.from(uniqueTweetsMap.values());

    // Filter out immoral / explicit content
    const beforeFilter = allTweets.length;
    allTweets = allTweets.filter(t => !isImmoralTweet(t.text));
    if (allTweets.length < beforeFilter) {
      console.log(`🚫 Filtered ${beforeFilter - allTweets.length} immoral/explicit tweets.`);
    }

    // Sort by created_at descending (newest first)
    allTweets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Cap at 100 max tweets so file doesn't grow huge
    const keepLimit = Math.max(100, maxItems || 50);
    const tweets = allTweets.slice(0, keepLimit);

    console.log(`✅ Merged, deduplicated, filtered and sorted. Keeping top ${tweets.length} tweets.`);

    let sentiments = { positive: 0, negative: 0, neutral: 0 };
    let totalLikes = 0, totalRts = 0;

    for (const t of tweets) {
      sentiments[t.sentiment as keyof typeof sentiments]++;
      totalLikes += t.likes;
      totalRts += t.retweets;
    }

    const n = tweets.length || 1;
    const posPct = Math.round((sentiments.positive / n) * 100);
    const negPct = Math.round((sentiments.negative / n) * 100);
    const neuPct = 100 - posPct - negPct;

    const avgEng = (totalLikes + totalRts) / n;
    const pressureIdx = Math.min(10, Math.round((negPct / 100) * 10 + Math.min(avgEng / 500, 2)));

    const stats = {
      total: n,
      pos_pct: posPct, neg_pct: negPct, neu_pct: neuPct,
      avg_likes: Math.round(totalLikes / n),
      avg_rts: Math.round(totalRts / n),
      pressure_idx: pressureIdx
    };

    // 3. Groq AI Inference
    const sample = tweets.slice(0, 30).map(t => `- @${t.author}: "${t.text.slice(0, 150)}" (♡${t.likes})`).join('\n');
    const prompt = `أنت محلل بيانات متخصص في اقتصاد المنصات في المملكة العربية السعودية.
تم جلب ${stats.total} تغريدة حقيقية.
إيجابية: ${stats.pos_pct}% | سلبية: ${stats.neg_pct}% | محايدة: ${stats.neu_pct}%
مؤشر الضغط: ${stats.pressure_idx}/10

عينة:
${sample}

قدّم تحليلاً يشمل:
1. تقدير حجم العمالة وكثافة النشاط.
2. المشاعر السائدة والسبب الجذري.
3. أبرز القضايا المتكررة (عمولات، تأخير...).
4. تفسير لمؤشر ضغط العمالة.
5. توصية لصانع القرار.
أجب بالعربية، بتنسيق Markdown.`;

    console.log("🤖 Groq يحلل التغريدات…");
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      })
    });

    let aiReport = "Analysis failed based on LLM response.";
    if (groqRes.ok) {
      const groqBody = await groqRes.json();
      aiReport = groqBody.choices?.[0]?.message?.content || aiReport;
    } else {
      console.error("Groq Error:", await groqRes.text());
    }

    const responseData = {
      stats,
      ai_report: aiReport,
      tweets
    };

    cachedTwitterData = responseData;
    cachedTwitterTimestamp = new Date().toISOString();
    saveTwitterData(responseData, cachedTwitterTimestamp);

    res.json({ data: responseData, timestamp: cachedTwitterTimestamp });
  } catch (err: any) {
    console.error("Twitter Analyze Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/twitter/cached', (_req, res) => {
  if (!cachedTwitterData) {
    return res.status(404).json({ error: 'No cached twitter analytics data' });
  }
  res.json({ data: cachedTwitterData, timestamp: cachedTwitterTimestamp });
});

// ═══════════════════════════════════════════
// E-COMMERCE SALLA API
// ═══════════════════════════════════════════

app.post('/api/salla/sync', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 200;
    console.log(`🔄 Running Native TS Salla Scraper (Limit ${limit})...`);

    // Run the native TS algorithm
    await runNativeSallaScraper(limit);

    const dbPath = path.join(process.cwd(), 'data', 'salla_stores.json');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'DB not found after live scrape.' });
    }

    const data = fs.readFileSync(dbPath, 'utf-8');
    const stores = JSON.parse(data);

    console.log('✅ Native live scrape finished and data served.');
    res.json({ data: stores, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('API Sync Error:', error.message);
    res.status(500).json({ error: 'Failed to complete native live sync: ' + error.message, stderr: error.stack });
  }
});

app.get('/api/salla/stores', async (_req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'salla_stores.json');

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Salla scraper DB not found. Ensure the scraper has run at least once.' });
    }

    const data = fs.readFileSync(dbPath, 'utf-8');
    const stores = JSON.parse(data);
    res.json({ data: stores, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error serving Salla DB:', error.message);
    res.status(500).json({ error: 'Failed to access Salla structured data' });
  }
});

// ═══════════════════════════════════════════
// AI ASSISTANT (Groq — llama-3.3-70b)
// ═══════════════════════════════════════════

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/api/ai/chat', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured in .env.local' });
    }

    const { messages, language } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const lang = language === 'ar' ? 'Respond in Arabic.' : 'Respond in English.';

    const systemPrompt = `${lang}
You are an expert market intelligence analyst specializing in the gig economy in Saudi Arabia.
You work for the Smart Observatory for Digital Platform Workers — a data-driven tool used by policy makers and decision makers.

Your knowledge includes:
- Saudi gig economy landscape: delivery (Jahez, HungerStation), ride-hailing (Uber, Careem), freelancing
- Labor market regulations in Saudi Arabia (Ajeer, Musaned, freelance documentation)
- App Store & Google Play review analytics for estimating workforce size
- Google Trends data for understanding search behavior and worker intent
- Regional dynamics across Saudi provinces (Makkah, Riyadh, Eastern Province, etc.)
- Policy implications: insurance gaps, worker protection, platform regulation

When given dashboard data, analyze it thoroughly and provide:
1. Key findings and actionable insights
2. Trend interpretation and what it means for policy
3. Specific recommendations for decision-makers
4. Risk factors and limitations of the data

Keep responses clear, structured, and executive-friendly. Use bullet points and headers for clarity.
If asked about methodology, explain the "Review Footprint" model: estimating workforce from app review counts using configurable multipliers.`;

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return res.status(response.status).json({ error: `Groq API error: ${errorText}` });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';

    res.json({ reply, model: data.model, usage: data.usage });
  } catch (error: any) {
    console.error('AI chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════════════
// LINKEDIN FREELANCERS API
// ═══════════════════════════════════════════

app.post('/api/linkedin/sync', async (req, res) => {
  try {
    if (!API_TOKEN) {
      return res.status(500).json({ error: 'APIFY_API_TOKEN not configured in .env.local' });
    }
    const runs = parseInt(req.query.pages as string) || 2;
    console.log(`🔄 Running Apify-backed LinkedIn Scraper (${runs} run(s))...`);

    await runNativeLinkedInScraper(runs, API_TOKEN);

    const dbPath = path.join(process.cwd(), 'data', 'linkedin_freelancers.json');
    let data = [];
    if (fs.existsSync(dbPath)) {
      data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }

    res.json({ success: true, count: data.length, data });
  } catch (error: any) {
    console.error('LinkedIn Scraper Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════
// LINKEDIN APIFY TEST API
// ═══════════════════════════════════════════

// Always use the single Apify token from .env.local — no hardcoded fallback
const APIFY_LINKEDIN_TOKEN = process.env.APIFY_API_TOKEN || '';
const LINKEDIN_ACTOR_ID = 'harvestapi~linkedin-profile-search';

app.post('/api/linkedin/apify/run', async (req, res) => {
  try {
    const { keywords, limit = 20 } = req.body;

    if (!keywords) {
      return res.status(400).json({ error: 'Keywords are required' });
    }

    const dbPath = path.join(process.cwd(), 'data', 'linkedin_freelancers.json');
    let existingData: any[] = [];
    if (fs.existsSync(dbPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      } catch (e) { }
    }

    // --- Dynamic Search Exclusion Strategy ---
    // Shuffle all known names to stochastically exclude different top results each time
    const allKnownNames = [...new Set(existingData.map(f => f.fullName))]
      .filter(name => name && name !== 'LinkedIn Member');
    const recentNames = allKnownNames.sort(() => 0.5 - Math.random()).slice(0, 15);

    let smartQuery = keywords;
    const MAX_QUERY_LEN = 270; // Strict limit to avoid Apify/LinkedIn errors

    if (recentNames.length > 0) {
      let currentExclusionCount = recentNames.length;
      while (currentExclusionCount > 0) {
        const namesToUse = recentNames.slice(0, currentExclusionCount);
        const exclusionString = namesToUse.map(name => `NOT "${name}"`).join(" ");
        const testQuery = `${keywords} ${exclusionString}`;

        if (testQuery.length <= MAX_QUERY_LEN) {
          smartQuery = testQuery;
          break;
        }
        currentExclusionCount--;
      }
    }

    // Double check final length
    if (smartQuery.length > 300) {
      smartQuery = smartQuery.substring(0, 290);
    }

    const adjustedLimit = existingData.length > 20 ? Math.min(limit + 10, 50) : limit;

    const SAUDI_LOCATIONS = ["Saudi Arabia", "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Dammam, Saudi Arabia", "Mecca, Saudi Arabia", "Medina, Saudi Arabia", "Khobar, Saudi Arabia"];
    const randomLocation = SAUDI_LOCATIONS[Math.floor(Math.random() * SAUDI_LOCATIONS.length)];

    console.log(`🤖 SMART QUERY: Len=${smartQuery.length} | NamesExcluded=${smartQuery.includes('NOT') ? smartQuery.split('NOT').length - 1 : 0}`);
    console.log(`📡 Final Outbound Query: ${smartQuery} | Loc: ${randomLocation}`);

    const response = await fetch(`https://api.apify.com/v2/acts/${LINKEDIN_ACTOR_ID}/runs?token=${APIFY_LINKEDIN_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchQuery: smartQuery,
        locations: [randomLocation],
        maxItems: adjustedLimit,
        minDelay: 3000, // Suggestion to slow down actor
        maxDelay: 7000  // Suggestion to slow down actor
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Apify Error: ${err}`);
    }

    const data = await response.json();
    res.json({ runId: data.data.id, status: data.data.status });
  } catch (error: any) {
    console.error('LinkedIn Apify Start Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/linkedin/apify/status/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_LINKEDIN_TOKEN}`);

    if (!response.ok) {
      throw new Error('Failed to fetch run status');
    }

    const data = await response.json();
    res.json({ status: data.data.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/linkedin/apify/results/:runId', async (req, res) => {
  try {
    const { runId } = req.params;
    const response = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_LINKEDIN_TOKEN}&format=json`);

    if (!response.ok) {
      throw new Error('Failed to fetch dataset items');
    }

    const rawData = await response.json();
    const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.results || []);

    console.log(`📊 Received ${items.length} raw items from Apify run ${runId}`);

    // --- Advanced Cleaning & Classification (Ported from data_processor.py) ---

    const SAUDI_KEYWORDS = ["saudi", "ksa", "riyadh", "jeddah", "dammam", "mecca", "medina", "الرياض", "جدة", "الدمام", "السعودية", "مكة", "المدينة", "khobar", "الخبر"];
    const FREELANCE_KEYWORDS = [
      "freelance", "freelancer", "self-employed", "self employed", "independent",
      "contractor", "consultant", "مستقل", "فريلانسر", "عمل حر", "owner",
      "founder", "specialist", "creative", "remote", "part-time", "متعاون", "صاحب"
    ];
    const IRRELEVANT_KEYWORDS = ["student", "intern", "volunteer", "unemployed", "seeking", "open to work", "طالب", "متدرب", "جامعة", "university"];

    const FIELD_RULES: { [key: string]: RegExp } = {
      "Technology & Programming": /(developer|programmer|engineer|software|backend|frontend|full.?stack|mobile|ios|android|flutter|react|node|python|data scientist|machine learning|ai |artificial intelligence|devops|cloud|cyber)/i,
      "Design & Creative": /(design|designer|ux|ui|graphic|illustrat|motion|visual|brand|figma|photoshop)/i,
      "Digital Marketing": /(market|seo|sem|ppc|social media|growth|ads|digital campaign|influencer|content strateg|brand strateg)/i,
      "Writing & Content": /(writer|editor|copywriter|content creator|journalist|blogger|translat|كاتب|مترجم|محتوى)/i
    };

    const isSaudi = (loc: string) => SAUDI_KEYWORDS.some(kw => loc.toLowerCase().includes(kw));
    const isFreelancer = (h: string) => FREELANCE_KEYWORDS.some(kw => h.toLowerCase().includes(kw));
    const isIrrelevant = (h: string) => IRRELEVANT_KEYWORDS.some(kw => h.toLowerCase().includes(kw));

    const classifyField = (headline: string) => {
      for (const [field, regex] of Object.entries(FIELD_RULES)) {
        if (regex.test(headline)) return field;
      }
      return "General Professional";
    };

    // --- Persistence Logic ---
    const dbPath = path.join(process.cwd(), 'data', 'linkedin_freelancers.json');
    let existingData: any[] = [];
    if (fs.existsSync(dbPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      } catch (e) {
        console.error('Error reading existing database:', e);
      }
    }

    // helper to sanitize LinkedIn URLs (remove tracking/params)
    const sanitizeUrl = (u: string) => {
      if (!u) return '';
      try {
        const parsed = new URL(u);
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, "");
      } catch (e) {
        return u.toLowerCase().replace(/\/$/, "");
      }
    };

    const existingUrlsSanitized = new Set(existingData.map((f: any) => sanitizeUrl(f.profileUrl)));

    const processedItems = (items || []).map((p: any) => {
      const fullName = p.fullName || p.full_name || p.name || p.publicIdentifier || 'LinkedIn Member';
      const headline = (p.headline || p.occupation || p.jobTitle || p.title || 'Professional').trim();
      const location = ((typeof p.location === 'object' ? p.location.linkedinText : p.location) || p.locationName || 'Saudi Arabia').trim();

      let rawUrl = p.url || p.link || p.linkedin_url || p.profileUrl || p.profile_url;
      if (!rawUrl && p.publicIdentifier) {
        rawUrl = `https://www.linkedin.com/in/${p.publicIdentifier}`;
      }

      const profileUrl = sanitizeUrl(rawUrl);

      return {
        profileUrl,
        fullName,
        jobTitle: headline,
        location,
        field: classifyField(headline),
        lastScrapedAt: new Date().toISOString()
      };
    }).filter((f: any) => {
      if (!f.profileUrl) return false;
      const isS = isSaudi(f.location) || f.location.toLowerCase().includes('saudi');
      const isF = isFreelancer(f.jobTitle);
      const isI = isIrrelevant(f.jobTitle);
      return isS && isF && !isI;
    });

    // Identify and isolate TRULY new items
    const newItems = processedItems.filter(f => !existingUrlsSanitized.has(f.profileUrl));
    const alreadyKnownCount = processedItems.length - newItems.length;

    if (newItems.length > 0) {
      const finalData = [...existingData, ...newItems];
      fs.writeFileSync(dbPath, JSON.stringify(finalData, null, 2));
      console.log(`✅ DISCOVERY: Found ${newItems.length} NEW professionals. Skipped ${alreadyKnownCount} duplicates.`);
    } else {
      console.log(`ℹ️ SYNC: 0 new items found. ${alreadyKnownCount} profiles analyzed were already known.`);
    }

    res.json({ data: newItems, savedCount: newItems.length, skippedCount: alreadyKnownCount });
  } catch (error: any) {
    console.error("Apify Result Processing Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/linkedin/freelancers', (req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'linkedin_freelancers.json');
    if (fs.existsSync(dbPath)) {
      const fileData = fs.readFileSync(dbPath, 'utf-8');
      const freelancers = JSON.parse(fileData);
      res.json(freelancers);
    } else {
      res.json([]);
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// ═══════════════════════════════════════════
// GIG REVIEWS API (Apify + Groq)
// ═══════════════════════════════════════════

app.post('/api/reviews/sync', async (req, res) => {
  try {
    console.log('🔄 Running Gig Reviews Scraper (App Store / Play Store)...');
    if (!API_TOKEN) console.warn('⚠️ APIFY_API_TOKEN not set — Android scraping will be skipped, iOS (iTunes RSS) will still run.');

    const data = await runGigReviewsScraper(API_TOKEN, GROQ_API_KEY);
    res.json(data);
  } catch (error: any) {
    console.error('Reviews API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reviews/cached', (req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'saudi_gig_reviews.json');
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No cached reviews data found. Please run a sync.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to read cached reviews data' });
  }
});

// ═══════════════════════════════════════════
// AQAR INTELLIGENCE API (Native Scraper)
// ═══════════════════════════════════════════

app.post('/api/aqar/sync', async (_req, res) => {
  try {
    console.log('🔄 Triggering native Aqar Intelligence Scraper...');
    const data = await runAqarSync();
    console.log('✅ Aqar sync completed.');
    res.json(data);
  } catch (error: any) {
    console.error('Aqar Sync Error:', error.message);
    res.status(500).json({ error: 'Failed to sync Aqar data: ' + error.message });
  }
});


app.get('/api/aqar/cached', (_req, res) => {
  try {
    const dbPath = path.join(process.cwd(), 'data', 'aqar_intelligence.json');
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      res.json(data);
    } else {
      res.status(404).json({ error: 'No cached Aqar data found. Please run a sync.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to read cached Aqar data' });
  }
});

// ---- Maroof Registry API ----

app.get('/api/maroof/cached', (_req, res) => {
  try {
    const storesPath = path.join(process.cwd(), 'data', 'maroof_stores.json');
    if (fs.existsSync(storesPath)) {
      const stores = JSON.parse(fs.readFileSync(storesPath, 'utf-8'));
      res.json({ stores, lastUpdated: new Date(fs.statSync(storesPath).mtime).toISOString() });
    } else {
      res.status(404).json({ error: 'No cached Maroof data found. Please run a sync.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to read cached Maroof data' });
  }
});

app.post('/api/maroof/sync', async (_req, res) => {
  try {
    console.log('🔄 Triggering native Maroof Scraper...');
    const stores = await runMaroofSync(100);
    console.log('✅ Maroof sync completed.');
    res.json({ stores, lastUpdated: new Date().toISOString() });
  } catch (error: any) {
    console.error('Maroof Sync Error:', error.message);
    res.status(500).json({ error: 'Failed to sync Maroof data: ' + error.message });
  }
});

// ---- Serve Frontend in Production ----
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log(`📦 Serving static frontend from: ${distPath}`);
  app.use(express.static(distPath));
  // Provide fallback for React Router (if any)
  app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.log(`⚠️ No dist/ folder found. Run 'npm run build' to serve frontend.`);
}

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Observatory API Server running on port ${PORT}`);
  console.log(`   Apify Token: ${API_TOKEN ? '✅' : '❌'} | Groq Key: ${GROQ_API_KEY ? '✅' : '❌'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
