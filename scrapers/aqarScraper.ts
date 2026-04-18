/**
 * Airbnb Scraper — Native to the Smart Observatory project
 * Scrapes Airbnb listings across Saudi neighborhoods using Playwright
 */
import { chromium, Browser, Page, BrowserContext } from "playwright";
import fs from "fs";
import path from "path";

export const SAUDI_LOCATIONS: Record<string, string[]> = {
  Riyadh: [
    "Hittin", "Olaya", "Al Sahafa", "Al Malqa", "Al Yasmin",
    "Al Sulaimaniya", "Al Aqeeq", "Al Murooj", "Al Ghadeer",
  ],
  Jeddah: [
    "Al Safa", "Al Rawdah", "Al Hamra", "Al Shate",
    "Al Naeem", "Al Zahra", "Obhur",
  ],
  Dammam: ["Al Faisaliyah", "Al Shati", "Al Jalawiyah"],
};

export interface AirbnbListing {
  listingId: string;
  title: string;
  neighborhood: string | null;
  city: string;
  propertyType?: string;
  price?: number;
  reviewsCount: number;
  rating: string;
  hostName?: string;
  hostType: "superhost" | "regular";
  url?: string;
}

class AirbnbScraper {
  private browser: Browser | null = null;
  private headless: boolean;
  private timeout: number;
  private delay_ms: number;
  private maxDetailVisits: number;

  constructor(opts: { headless?: boolean; timeout?: number; delay?: number; maxDetailVisits?: number } = {}) {
    this.headless = opts.headless !== false;
    this.timeout = opts.timeout || 60000;
    this.delay_ms = opts.delay || 3000;
    this.maxDetailVisits = opts.maxDetailVisits ?? 5;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.headless });
    console.log("[AirbnbScraper] Browser initialized");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("[AirbnbScraper] Browser closed");
    }
  }

  private sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  private parsePrice(priceStr: string): number | undefined {
    if (!priceStr) return undefined;
    const match = priceStr.match(/(?:SR|SAR)\s*([\d,]+)/);
    if (match) return parseInt(match[1].replace(/,/g, ""), 10);
    const fallback = priceStr.match(/[\d,]+/);
    return fallback ? parseInt(fallback[0].replace(/,/g, ""), 10) : undefined;
  }

  private async dismissModals(page: Page): Promise<void> {
    try {
      const gotIt = await page.$('button:has-text("Got it")');
      if (gotIt) { await gotIt.click(); await this.sleep(500); }
      const close = await page.$('button[aria-label="Close"], [data-testid="translation-announce-modal-close-btn"]');
      if (close) { await close.click(); await this.sleep(500); }
    } catch { /* modals are optional */ }
  }

  async scrapeNeighborhood(neighborhood: string, city: string): Promise<AirbnbListing[]> {
    if (!this.browser) throw new Error("Browser not initialized");

    const context = await this.browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
    });
    const page = await context.newPage();
    const listings: AirbnbListing[] = [];

    try {
      const searchUrl = `https://www.airbnb.com/s/${encodeURIComponent(neighborhood)}--${encodeURIComponent(city)}--Saudi-Arabia/homes`;
      console.log(`[AirbnbScraper] Navigating: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: this.timeout });
      await page.waitForSelector('div[itemprop="itemListElement"]', { timeout: 15000 }).catch(() => {
        console.warn(`[AirbnbScraper] No listing cards for ${neighborhood}`);
      });
      await this.sleep(4000);
      await this.dismissModals(page);

      // Extract listing data from search results
      const rawListings = await page.$$eval('div[itemprop="itemListElement"]', (elements) => {
        return elements.map((el) => {
          const titleEl = el.querySelector('[data-testid="listing-card-title"]');
          const nameEl = el.querySelector('[data-testid="listing-card-name"]');
          const metaName = el.querySelector('meta[itemprop="name"]');
          const metaUrl = el.querySelector('meta[itemprop="url"]');
          const priceRow = el.querySelector('[data-testid="price-availability-row"]');
          const ratingEl = el.querySelector('span[aria-label*="average rating"]') || el.querySelector('span[aria-label*="rating"]');
          const linkEl = el.querySelector('a[href*="/rooms/"]');
          const allText = el.textContent || "";
          return {
            title: titleEl?.textContent?.trim() || "",
            listingName: nameEl?.textContent?.trim() || metaName?.getAttribute("content") || "",
            price: priceRow?.textContent?.trim() || "",
            ratingLabel: ratingEl?.getAttribute("aria-label") || ratingEl?.textContent?.trim() || "",
            url: metaUrl?.getAttribute("content") || linkEl?.getAttribute("href") || "",
            allText: allText.substring(0, 500),
          };
        });
      }).catch(() => []);

      console.log(`[AirbnbScraper] Found ${rawListings.length} raw listings for ${neighborhood}`);

      for (const item of rawListings) {
        const name = item.listingName || item.title;
        if (!name || !item.url) continue;
        const listingIdMatch = item.url.match(/(?:\/rooms\/)?(\d+)/);
        if (!listingIdMatch) continue;

        let rating = "N/A";
        let reviewsCount = 0;
        if (item.ratingLabel) {
          const rm = item.ratingLabel.match(/([\d.]+)\s+out of/);
          if (rm) rating = rm[1];
          const rvm = item.ratingLabel.match(/(\d+)\s+review/);
          if (rvm) reviewsCount = parseInt(rvm[1], 10);
        }
        if (rating === "N/A" && item.allText) {
          const inline = item.allText.match(/(\d\.\d{1,2})\s*\((\d+)\)/);
          if (inline) { rating = inline[1]; reviewsCount = parseInt(inline[2], 10); }
        }

        let propertyType: string | undefined;
        const typeMatch = item.title.match(/^(\w+)\s+in\s+/);
        if (typeMatch) propertyType = typeMatch[1];

        listings.push({
          listingId: listingIdMatch[1],
          title: name,
          neighborhood,
          city,
          propertyType,
          price: this.parsePrice(item.price),
          reviewsCount,
          rating,
          hostType: "regular",
          url: item.url.startsWith("http") ? item.url : `https://www.airbnb.com${item.url}`,
        });
      }

      // Visit detail pages for host info
      const toVisit = listings.slice(0, this.maxDetailVisits);
      console.log(`[AirbnbScraper] Visiting ${toVisit.length} listings for host details...`);

      for (const listing of toVisit) {
        try {
          const hostInfo = await this.scrapeHostFromDetail(context, listing.url!);
          if (hostInfo) {
            listing.hostName = hostInfo.hostName;
            listing.hostType = hostInfo.isSuperhost ? "superhost" : "regular";
            console.log(`  ✓ ${listing.listingId}: Host="${listing.hostName}" (${listing.hostType})`);
          }
        } catch (err) {
          console.warn(`  ✗ ${listing.listingId}: ${(err as Error).message}`);
        }
        await this.sleep(this.delay_ms);
      }

      await this.sleep(this.delay_ms);
    } catch (error) {
      console.error(`[AirbnbScraper] Error scraping ${neighborhood}:`, error);
    } finally {
      await page.close();
      await context.close();
    }

    return listings;
  }

  private async scrapeHostFromDetail(context: BrowserContext, url: string): Promise<{ hostName: string; isSuperhost: boolean } | null> {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.timeout });
      await this.sleep(3000);
      await this.dismissModals(page);

      return await page.evaluate(() => {
        let hostName: string | null = null;
        const isSuperhost = (document.body.textContent || "").includes("Superhost");

        // Strategy 1: Find shortest "Hosted by" element
        const candidates: { text: string; len: number }[] = [];
        for (const el of document.querySelectorAll("div, span, h2, h3, p, section")) {
          const text = el.textContent?.trim() || "";
          if (text.startsWith("Hosted by") && text.length > 10) {
            candidates.push({ text, len: text.length });
          }
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => a.len - b.len);
          const match = candidates[0].text.match(/Hosted by\s+(.+)/);
          if (match) hostName = match[1].trim();
        }

        // Clean up name
        if (hostName) {
          hostName = hostName.replace(/Superhost.*$/i, "").replace(/\s*·\s*$/, "").replace(/\d+\s*(years?|months?)\s*hosting.*$/i, "").trim();
        }

        // Strategy 2: "Meet your host" section
        if (!hostName) {
          for (const h of document.querySelectorAll("h2, h3")) {
            if (h.textContent?.includes("Meet your host")) {
              const section = h.closest("section") || h.parentElement;
              if (section) {
                for (const link of section.querySelectorAll("a[aria-label]")) {
                  const label = link.getAttribute("aria-label") || "";
                  const nameMatch = label.match(/host,?\s+(.+?)\.?\s*$/i);
                  if (nameMatch) { hostName = nameMatch[1].trim(); break; }
                }
              }
              break;
            }
          }
        }

        return hostName ? { hostName, isSuperhost } : null;
      }).catch(() => null);
    } finally {
      await page.close();
    }
  }
}

/**
 * Main export: Scrape all Saudi neighborhoods and return structured data for the dashboard.
 * Skips listings already present in the saved data file to avoid wasting time on duplicates.
 */
export async function runAqarSync(): Promise<any> {
  console.log("[AqarSync] Starting Airbnb scraper across all Saudi cities...");

  // Load existing listings so we can skip already-fetched ones
  const outputPath = path.join(process.cwd(), "data", "aqar_intelligence.json");
  let existingListings: AirbnbListing[] = [];
  if (fs.existsSync(outputPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      existingListings = saved.listings || [];
      console.log(`[AqarSync] Loaded ${existingListings.length} existing listings — will skip duplicates.`);
    } catch (e) {
      console.warn("[AqarSync] Could not parse existing file, starting fresh.");
    }
  }
  const existingIds = new Set(existingListings.map(l => l.listingId));

  const scraper = new AirbnbScraper({ headless: true, maxDetailVisits: 3 });

  try {
    await scraper.initialize();

    const newListings: AirbnbListing[] = [];
    for (const [city, neighborhoods] of Object.entries(SAUDI_LOCATIONS)) {
      for (const neighborhood of neighborhoods) {
        try {
          const scraped = await scraper.scrapeNeighborhood(neighborhood, city);
          // Only keep listings not already in the saved file
          const fresh = scraped.filter(l => !existingIds.has(l.listingId));
          fresh.forEach(l => existingIds.add(l.listingId));
          console.log(`[AqarSync] ${city}/${neighborhood}: ${scraped.length} scraped, ${fresh.length} new (${scraped.length - fresh.length} skipped duplicates)`);
          newListings.push(...fresh);
        } catch (err) {
          console.error(`[AqarSync] Failed: ${city}/${neighborhood}:`, err);
        }
      }
    }

    // Merge new listings with existing ones
    const allListings: AirbnbListing[] = [...existingListings, ...newListings];
    console.log(`[AqarSync] Total after merge: ${allListings.length} listings (${newListings.length} newly added)`);

    const withHosts = allListings.filter(l => l.hostName);
    const superhosts = allListings.filter(l => l.hostType === "superhost");
    const uniqueHosts = new Set(allListings.map(l => l.hostName).filter(Boolean));

    const cityStats: Record<string, any> = {};
    for (const listing of allListings) {
      const c = listing.city || "Unknown";
      if (!cityStats[c]) cityStats[c] = { listings: 0, hosts: 0, superhosts: 0 };
      cityStats[c].listings++;
      if (listing.hostName) cityStats[c].hosts++;
      if (listing.hostType === "superhost") cityStats[c].superhosts++;
    }

    const dashboardData = {
      lastUpdated: new Date().toISOString(),
      totalListings: allListings.length,
      newListingsThisRun: newListings.length,
      totalHosts: withHosts.length,
      uniqueHosts: uniqueHosts.size,
      superhosts: superhosts.length,
      cityBreakdown: cityStats,
      listings: allListings,
    };

    fs.writeFileSync(outputPath, JSON.stringify(dashboardData, null, 2));
    console.log(`[AqarSync] ✅ Saved ${allListings.length} total listings to ${outputPath}`);

    return dashboardData;
  } finally {
    await scraper.close();
  }
}
