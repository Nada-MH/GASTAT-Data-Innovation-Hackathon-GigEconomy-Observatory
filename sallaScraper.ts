import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface SallaStore {
    id: string;
    storeName: string;
    storeUrl: string;
    storeSlug: string;
    category: string;
    documentType?: 'freelance' | 'commercial' | null;
    documentNumber?: string;
    maroofUrl?: string | null;
    lastScrapedAt: string;
}

const ALGOLIA_URL = "https://l41y35uonw-3.algolianet.com/1/indexes/stores/query";
const ALGOLIA_PARAMS = "?x-algolia-agent=Algolia%20for%20JavaScript%20(4.22.1)%3B%20Browser&x-algolia-application-id=L41Y35UONW&x-algolia-api-key=ccc9490de8160382395ae82c7a96d8b0";

function generateId(name: string, url: string): string {
    const cleanStr = (name + url).toLowerCase().replace(/[^a-z0-9]/gi, '');
    return crypto.createHash('md5').update(cleanStr).digest('hex');
}

export async function runNativeSallaScraper(limit: number): Promise<void> {
    const arabicAlphabet = ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"];
    const englishAlphabet = "abcdefghijklmnopqrstuvwxyz".split('');
    const queries = [...arabicAlphabet, ...englishAlphabet, ""];

    // 0. Load Existing Stores for Deduplication
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'salla_stores.json');
    let existingStores: SallaStore[] = [];
    if (fs.existsSync(dbPath)) {
        try {
            existingStores = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        } catch (e) {
            console.error('Failed to parse existing salla JSON', e);
        }
    }
    const existingUrls = new Set(existingStores.map(s => s.storeUrl));

    // 1. Discover Stores via Algolia API
    console.log(`[Native Scraper] Starting fast autonomous discovery (Target New: ${limit})...`);
    console.log(`[Native Scraper] Current database has ${existingStores.length} stores.`);

    const discovered: Record<string, Partial<SallaStore>> = {};
    let newDiscoveredCount = 0;

    for (const query of queries) {
        if (newDiscoveredCount >= limit) break;

        for (let page = 0; page < 5; page++) {
            if (newDiscoveredCount >= limit) break;
            try {
                const response = await fetch(ALGOLIA_URL + ALGOLIA_PARAMS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, hitsPerPage: 30, page })
                });

                if (!response.ok) break;

                const data = await response.json();
                const hits = data.hits || [];
                if (hits.length === 0) break;

                for (const hit of hits) {
                    const name = hit.name?.ar || hit.name?.en || 'Unknown';
                    const username = hit.user_name;
                    const custom_domain = hit.custom_domain;
                    const category = hit.activities?.[0]?.name || 'Other';

                    if (!username && !custom_domain) continue;

                    const website = custom_domain ? `https://${custom_domain}` : `https://salla.sa/${username}`;
                    
                    // DEDUPLICATION: Skip if already in database
                    if (existingUrls.has(website)) continue;

                    const storeSlug = username || (custom_domain ? custom_domain.split('.')[0] : 'store');
                    const storeId = generateId(name, website);

                    if (!discovered[storeId]) {
                        discovered[storeId] = {
                            id: storeId,
                            storeName: name,
                            storeUrl: website,
                            storeSlug: storeSlug,
                            category: category
                        };
                        newDiscoveredCount++;
                        if (newDiscoveredCount >= limit) break;
                    }
                }
            } catch (err) {
                console.error(`Algolia fetch error on query ${query}:`, err);
                break;
            }
        }
    }

    if (newDiscoveredCount === 0) {
        console.log('[Native Scraper] No new stores found to reach the limit.');
        return;
    }

    // 2. Fast HTTP Verify
    console.log(`[Native Scraper] Blazing-fast HTTP verification for ${newDiscoveredCount} NEW stores...`);
    const activeNewStores: SallaStore[] = [];
    const inactiveKeywords = ['متجر مغلق', 'store is closed', 'تحت الصيانة', 'maintenance', 'غير متاح حاليا'];

    const storesToVerify = Object.values(discovered);
    const BATCH_SIZE = 5;
    const COOLDOWN_MS = 1500;

    for (let i = 0; i < storesToVerify.length; i += BATCH_SIZE) {
        const batch = storesToVerify.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (store) => {
            try {
                const res = await fetch(store.storeUrl as string, {
                    signal: AbortSignal.timeout(6000),
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                if (res.ok) {
                    const html = await res.text();
                    const textLower = html.toLowerCase();

                    const isInactive = inactiveKeywords.some(kw => textLower.includes(kw));
                    let documentType: 'commercial' | 'freelance' | null = null;
                    let documentNumber: string | undefined;
                    let maroofUrl: string | null = null;

                    let finalCategory = store.category || 'Other';
                    if (finalCategory === 'Other' || finalCategory === 'أخرى') {
                        if (textLower.match(/عطور|مكياج|تجميل|عناية|بديل العطر/)) finalCategory = 'Perfumes & Beauty';
                        else if (textLower.match(/ملابس|أزياء|عبايات|فساتين|قماش|خياطة|حقائب|أحذية/)) finalCategory = 'Fashion & Apparel';
                        else if (textLower.match(/جوالات|إلكترونيات|سماعات|حاسب|ايفون|شواحن|اتصالات/)) finalCategory = 'Electronics & Gadgets';
                        else if (textLower.match(/قهوة|بهارات|عسل|غذاء|تمور|تمر|حلويات|مخبوزات/)) finalCategory = 'Food & Beverages';
                        else if (textLower.match(/ديكور|اثاث|مفروشات|مستلزمات المنزل|مطبخ/)) finalCategory = 'Home & Decor';
                        else if (textLower.match(/رقمية|تصميم|تسويق|خدمات|اشتراكات/)) finalCategory = 'Digital Services';
                    }

                    const crMatch = textLower.match(/(?:سجل تجاري|رقم السجل|cr number|commercial registration)[^\d]*(\d{10})/i);
                    if (crMatch) {
                        documentType = 'commercial';
                        documentNumber = crMatch[1];
                    } else {
                        const flMatch = textLower.match(/(?:وثيقة عمل حر|رقم الوثيقة|freelance)[^\d]*([a-z0-9]{8,})/i);
                        if (flMatch) {
                            documentType = 'freelance';
                            documentNumber = flMatch[1];
                        }
                    }

                    const sbcMatch = textLower.match(/(https?:\/\/(?:www\.)?(?:e-maroof\.sa|maroof\.sa|business\.sa|eec\.gov\.sa)[^\s"'>]*)/i);
                    if (sbcMatch) {
                        maroofUrl = sbcMatch[1];
                    } else {
                        const maroofIdMatch = textLower.match(/(?:معروف|maroof)[^\d]*(\d{5,8})/i);
                        if (maroofIdMatch) {
                            maroofUrl = `https://maroof.sa/${maroofIdMatch[1]}`;
                        }
                    }

                    activeNewStores.push({
                        ...store as SallaStore,
                        storeName: isInactive ? `${store.storeName} (مغلق)` : store.storeName,
                        documentType,
                        documentNumber,
                        maroofUrl,
                        category: finalCategory,
                        lastScrapedAt: new Date().toISOString()
                    });
                } else {
                    console.log(`[Native Scraper] Store ${store.storeUrl} unavailable (Status: ${res.status})`);
                }
            } catch (err) {
                console.log(`[Native Scraper] Timeout verifying ${store.storeUrl}`);
            }
        }));

        // Anti-ban cooldown between batches
        if (i + BATCH_SIZE < storesToVerify.length) {
            await new Promise(resolve => setTimeout(resolve, COOLDOWN_MS));
        }
    }

    // 3. Save Data locally using upsert merge
    const existingMap = new Map<string, SallaStore>();
    existingStores.forEach(s => existingMap.set(s.storeUrl, s));
    activeNewStores.forEach(s => existingMap.set(s.storeUrl, s));

    const finalStores = Array.from(existingMap.values())
        .sort((a, b) => new Date(b.lastScrapedAt).getTime() - new Date(a.lastScrapedAt).getTime());

    fs.writeFileSync(dbPath, JSON.stringify(finalStores, null, 2), 'utf-8');
    console.log(`[Native Scraper] Merged and Saved successfully! Total records: ${finalStores.length} (${activeNewStores.length} new)`);
}
