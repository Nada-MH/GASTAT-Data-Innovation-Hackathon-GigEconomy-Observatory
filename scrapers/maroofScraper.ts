/**
 * Maroof Store Scraper — Native TypeScript implementation
 * Uses Playwright to bootstrap session, then paginated API calls
 * Self-contained: no external Python dependencies
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_PAGE_URL = "https://maroof.sa/businesses";
const API_BASE = "https://api.thiqah.sa/maroof/public/api/app";
const SEARCH_ENDPOINT = `${API_BASE}/business/search`;
const BUSINESS_TYPES_ENDPOINT = `${API_BASE}/business-type/types?isActive=true`;
const REGIONS_ENDPOINT = `${API_BASE}/regions`;
const DEFAULT_API_KEY = process.env.MAROOF_API_KEY || "";

export interface MaroofStoreRaw {
  id: number;
  user_id: string;
  sub: string;
  name: string | null;
  name_ar: string | null;
  localized_name: string;
  display_name: string;
  image_url: string | null;
  business_type_id: number;
  business_type_key: string;
  business_type_name: string;
  business_sub_type_id: number | null;
  business_sub_type_key: string | null;
  business_sub_type_name: string | null;
  other_type_name: string | null;
  rating: number;
  total_reviews: number;
  certification_status: number;
  active_status: number;
  admin_active_status: number;
  owner_allow_status: number;
  is_popular_business: boolean;
  store_url: string;
}

function normalizeStore(item: any): MaroofStoreRaw {
  const businessType = item.businessType || {};
  const businessSubType = item.businessSubType || {};
  return {
    id: item.id,
    user_id: item.userId,
    sub: item.sub,
    name: item.name,
    name_ar: item.nameAr,
    localized_name: item.localizedName,
    display_name: item.localizedName || item.nameAr || item.name,
    image_url: item.imageUrl,
    business_type_id: businessType.id,
    business_type_key: businessType.key,
    business_type_name: businessType.name,
    business_sub_type_id: businessSubType.id || null,
    business_sub_type_key: businessSubType.key || null,
    business_sub_type_name: businessSubType.name || null,
    other_type_name: item.otherTypeName || null,
    rating: item.rating,
    total_reviews: item.totalReviews,
    certification_status: item.certificationStatus,
    active_status: item.activeStatus,
    admin_active_status: item.adminActiveStatus,
    owner_allow_status: item.ownerAllowStatus,
    is_popular_business: item.isPopularBusiness,
    store_url: item.id != null ? `https://maroof.sa/${item.id}` : "",
  };
}

/**
 * Bootstrap Playwright browser session, capture the live API key from Maroof's network requests.
 * Retries up to 3 times before falling back to the hardcoded default key.
 */
async function bootstrapApiKey(): Promise<string> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[MaroofScraper] Bootstrap attempt ${attempt}/${MAX_ATTEMPTS} — launching browser...`);

    let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      const context = await browser.newContext({
        locale: "ar-SA",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        viewport: { width: 1440, height: 900 },
      });

      const page = await context.newPage();
      let capturedKey = "";

      page.on("request", (request) => {
        if (request.url().startsWith(SEARCH_ENDPOINT)) {
          const headers = request.headers();
          // Header names may be lowercased by Playwright
          const key = headers["apikey"] || headers["Apikey"] || headers["ApiKey"] || headers["api-key"];
          if (key) capturedKey = key;
        }
      });

      await page.goto(BASE_PAGE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
      // Wait for Angular app to bootstrap and fire API calls
      await page.waitForTimeout(18000);

      await browser.close();
      browser = null;

      if (capturedKey) {
        console.log(`[MaroofScraper] ✅ Captured live API key on attempt ${attempt}: ${capturedKey.substring(0, 8)}...`);
        return capturedKey;
      }

      console.warn(`[MaroofScraper] Attempt ${attempt}: No API key captured in network requests.`);
    } catch (err: any) {
      console.warn(`[MaroofScraper] Attempt ${attempt} error: ${err.message}`);
    } finally {
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      const waitMs = attempt * 3000;
      console.log(`[MaroofScraper] Waiting ${waitMs / 1000}s before retry...`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  console.warn("[MaroofScraper] ⚠️ All bootstrap attempts failed — using hardcoded fallback API key.");
  return DEFAULT_API_KEY;
}

/**
 * Fetch a single page of stores from the Maroof API directly via Node.js fetch
 */
async function fetchStorePage(apiKey: string, skipCount: number, maxResultCount: number): Promise<{ items: any[]; totalCount: number }> {
  const params = new URLSearchParams({
    keyword: "",
    businessTypeId: "",
    businessTypeSubCategoryId: "",
    regionId: "",
    cityId: "",
    certificationType: "",
    sortBy: "2",
    sortDirection: "2",
    sorting: "",
    skipCount: String(skipCount),
    maxResultCount: String(maxResultCount),
  });

  const url = `${SEARCH_ENDPOINT}?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        apiKey: apiKey,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Origin": "https://maroof.sa",
        "Referer": "https://maroof.sa/businesses",
        "Accept-Language": "ar-SA,ar;q=0.9,en;q=0.8",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${await response.text().catch(() => "")}`);
  }

  const data = await response.json();
  return {
    items: data.items || [],
    totalCount: data.totalCount || 0,
  };
}

/**
 * Main export: Scrape Maroof stores and return data for the dashboard.
 * Each sync fetches up to `newStoresLimit` NEW stores (skips duplicates already on disk).
 */
export async function runMaroofSync(newStoresLimit: number = 100): Promise<MaroofStoreRaw[]> {
  console.log(`[MaroofSync] Starting Maroof scraper (target ${newStoresLimit} NEW stores)...`);

  // Step 1: Load existing stores to skip duplicates
  const outputPath = path.join(process.cwd(), "data", "maroof_stores.json");
  let existingStores: MaroofStoreRaw[] = [];
  if (fs.existsSync(outputPath)) {
    try {
      existingStores = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    } catch (_) {}
  }
  const existingIds = new Set(existingStores.map(s => s.id));
  console.log(`[MaroofSync] Existing DB: ${existingStores.length} stores. Will collect ${newStoresLimit} new ones.`);

  // Step 2: Get API key
  const apiKey = await bootstrapApiKey();

  // Step 3: Paginate through the search API, collecting only NEW items
  const newItems: any[] = [];
  const pageSize = 100;
  let skipCount = 0;
  let totalCount: number | null = null;
  let pageNumber = 0;

  while (newItems.length < newStoresLimit) {
    pageNumber++;
    console.log(`[MaroofSync] Fetching page ${pageNumber} (skip=${skipCount}, size=${pageSize}, new so far=${newItems.length})...`);

    let pageResult: { items: any[]; totalCount: number } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        pageResult = await fetchStorePage(apiKey, skipCount, pageSize);
        break;
      } catch (err: any) {
        console.warn(`[MaroofSync] Page ${pageNumber} attempt ${attempt} failed: ${err.message}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
        else throw err;
      }
    }
    const { items, totalCount: tc } = pageResult!;

    if (totalCount === null) totalCount = tc;
    if (!items || items.length === 0) break;

    for (const item of items) {
      if (!existingIds.has(item.id)) {
        newItems.push(item);
        existingIds.add(item.id); // prevent re-adding within the same run
        if (newItems.length >= newStoresLimit) break;
      }
    }

    console.log(`[MaroofSync] Page ${pageNumber}: ${items.length} raw, ${newItems.length}/${newStoresLimit} new collected`);

    skipCount += items.length;
    if (totalCount !== null && skipCount >= totalCount) break;

    // Small delay between requests
    await new Promise(r => setTimeout(r, 300));
  }

  if (newItems.length === 0) {
    console.log("[MaroofSync] No new stores found — database is up to date.");
    return existingStores;
  }

  // Step 4: Normalize and merge
  const normalized = newItems.map(normalizeStore);
  const merged = [...existingStores, ...normalized];

  // Step 5: Write to data directory
  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
  console.log(`[MaroofSync] ✅ Added ${normalized.length} new stores. Total on disk: ${merged.length}`);

  return merged;
}
