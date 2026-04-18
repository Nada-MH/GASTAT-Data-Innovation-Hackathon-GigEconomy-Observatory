/**
 * LinkedIn Freelancer Scraper — Apify-backed only.
 * Uses harvestapi~linkedin-profile-search via a single synchronous Apify run.
 * No browser / DuckDuckGo dependency.
 */
import fs from 'fs';
import path from 'path';

export interface LinkedInFreelancer {
    profileUrl: string;
    fullName: string;
    jobTitle: string;
    location: string;
    field: string;
    lastScrapedAt: string;
}

// ── Classification helpers (kept identical to server.ts processing logic) ──

const SAUDI_KEYWORDS = [
    "saudi", "ksa", "riyadh", "jeddah", "dammam", "mecca", "medina",
    "الرياض", "جدة", "الدمام", "السعودية", "مكة", "المدينة", "khobar", "الخبر",
];
const FREELANCE_KEYWORDS = [
    "freelance", "freelancer", "self-employed", "self employed", "independent",
    "contractor", "consultant", "مستقل", "فريلانسر", "عمل حر", "owner",
    "founder", "specialist", "creative", "remote", "part-time", "متعاون", "صاحب",
];
const IRRELEVANT_KEYWORDS = [
    "student", "intern", "volunteer", "unemployed", "seeking", "open to work",
    "طالب", "متدرب", "جامعة", "university",
];

const FIELD_RULES: { [key: string]: RegExp } = {
    "Technology & Programming": /(developer|programmer|engineer|software|backend|frontend|full.?stack|mobile|ios|android|flutter|react|node|python|data scientist|machine learning|ai |artificial intelligence|devops|cloud|cyber)/i,
    "Design & Creative": /(design|designer|ux|ui|graphic|illustrat|motion|visual|brand|figma|photoshop)/i,
    "Digital Marketing": /(market|seo|sem|ppc|social media|growth|ads|digital campaign|influencer|content strateg|brand strateg)/i,
    "Writing & Content": /(writer|editor|copywriter|content creator|journalist|blogger|translat|كاتب|مترجم|محتوى)/i,
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

const sanitizeUrl = (u: string) => {
    if (!u) return '';
    try {
        const parsed = new URL(u);
        return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`.toLowerCase().replace(/\/$/, "");
    } catch {
        return u.toLowerCase().replace(/\/$/, "");
    }
};

// ── Search niches cycled per call ──
const SEARCH_NICHES = [
    "Graphic Designer freelancer",
    "Software Developer freelancer",
    "Digital Marketing freelancer",
    "Translator freelancer",
    "UI UX Designer freelancer",
    "Content Writer freelancer",
    "Data Analyst freelancer",
    "Web Developer freelancer",
    "Mobile App Developer freelancer",
    "SEO Specialist freelancer",
    "Video Editor freelancer",
    "Business Analyst freelancer",
    "Copywriter freelancer",
    "Project Manager freelancer",
    "Data Scientist freelancer",
];

const SAUDI_LOCATIONS = [
    "Saudi Arabia",
    "Riyadh, Saudi Arabia",
    "Jeddah, Saudi Arabia",
    "Dammam, Saudi Arabia",
    "Mecca, Saudi Arabia",
    "Medina, Saudi Arabia",
    "Khobar, Saudi Arabia",
];

/**
 * Run the LinkedIn scraper backed by Apify (harvestapi~linkedin-profile-search).
 *
 * @param maxRuns   Number of Apify runs to execute (each targets a different niche). Capped at 3 to avoid long HTTP timeouts.
 * @param apifyToken  Apify API token from env.
 */
export async function runNativeLinkedInScraper(
    maxRuns: number = 2,
    apifyToken: string,
): Promise<LinkedInFreelancer[]> {
    if (!apifyToken) {
        console.error('[LinkedIn Scraper] No Apify token provided — aborting.');
        return [];
    }

    // Cap at 3 to keep the endpoint from timing out
    const runsToExec = Math.min(Math.max(maxRuns, 1), 3);
    console.log(`[LinkedIn Scraper] Starting Apify-backed scraper (${runsToExec} run(s))...`);

    // ── Load existing data ──
    const dbPath = path.join(process.cwd(), 'data', 'linkedin_freelancers.json');
    let existingData: LinkedInFreelancer[] = [];
    if (fs.existsSync(dbPath)) {
        try { existingData = JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (_) {}
    }
    const existingUrls = new Set(existingData.map(f => sanitizeUrl(f.profileUrl)));

    // Build exclusion list from already-known names (stochastic to vary each run)
    const knownNames = [...new Set(existingData.map(f => f.fullName))]
        .filter(n => n && n !== 'LinkedIn Member')
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);

    const allNewItems: LinkedInFreelancer[] = [];
    const randomLocation = SAUDI_LOCATIONS[Math.floor(Math.random() * SAUDI_LOCATIONS.length)];

    // Rotate niches based on how many we already have, so each run targets fresh niches
    const nicheOffset = existingData.length % SEARCH_NICHES.length;

    for (let i = 0; i < runsToExec; i++) {
        const niche = SEARCH_NICHES[(nicheOffset + i) % SEARCH_NICHES.length];

        // Build smart query with name exclusions
        let query = `${niche} "Saudi Arabia"`;
        const MAX_QUERY_LEN = 270;
        for (let cnt = knownNames.length; cnt > 0; cnt--) {
            const excl = knownNames.slice(0, cnt).map(n => `NOT "${n}"`).join(' ');
            const test = `${query} ${excl}`;
            if (test.length <= MAX_QUERY_LEN) { query = test; break; }
        }

        console.log(`[LinkedIn Scraper] Run ${i + 1}/${runsToExec} | Niche: "${niche}" | Location: ${randomLocation}`);

        try {
            // Start Apify run
            const startResp = await fetch(
                `https://api.apify.com/v2/acts/harvestapi~linkedin-profile-search/runs?token=${apifyToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        searchQuery: query,
                        locations: [randomLocation],
                        maxItems: 30,
                        minDelay: 2000,
                        maxDelay: 5000,
                    }),
                },
            );

            if (!startResp.ok) {
                const err = await startResp.text();
                console.warn(`[LinkedIn Scraper] Run start failed: ${err}`);
                continue;
            }

            const startData = await startResp.json();
            const runId: string | undefined = startData.data?.id;
            if (!runId) { console.warn('[LinkedIn Scraper] No runId returned.'); continue; }

            console.log(`[LinkedIn Scraper] Run ${runId} started — polling for completion...`);

            // Poll status (max 3 minutes per run)
            let status = 'RUNNING';
            const deadline = Date.now() + 3 * 60 * 1000;
            while (status === 'RUNNING' || status === 'READY') {
                await new Promise(r => setTimeout(r, 8000));
                if (Date.now() > deadline) {
                    console.warn(`[LinkedIn Scraper] Run ${runId} timed out after 3 min.`);
                    status = 'TIMED-OUT';
                    break;
                }
                const pollResp = await fetch(
                    `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
                );
                const pollData = await pollResp.json();
                status = pollData.data?.status || 'FAILED';
                console.log(`[LinkedIn Scraper]   status=${status}`);
            }

            if (status !== 'SUCCEEDED') {
                console.warn(`[LinkedIn Scraper] Run ${runId} ended with: ${status} — skipping results.`);
                continue;
            }

            // Fetch results
            const itemsResp = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&format=json`
            );
            const rawData = await itemsResp.json();
            const items: any[] = Array.isArray(rawData) ? rawData : (rawData.items || []);

            console.log(`[LinkedIn Scraper] Run ${runId}: ${items.length} raw items received.`);

            // Process & filter
            const processed = items.map((p: any) => {
                const fullName = p.fullName || p.full_name || p.name || p.publicIdentifier || 'LinkedIn Member';
                const headline = (p.headline || p.occupation || p.jobTitle || p.title || 'Professional').trim();
                const location = (
                    (typeof p.location === 'object' ? p.location?.linkedinText : p.location)
                    || p.locationName
                    || 'Saudi Arabia'
                ).trim();

                let rawUrl = p.url || p.link || p.linkedin_url || p.profileUrl || p.profile_url || '';
                if (!rawUrl && p.publicIdentifier) {
                    rawUrl = `https://www.linkedin.com/in/${p.publicIdentifier}`;
                }

                return {
                    profileUrl: sanitizeUrl(rawUrl),
                    fullName,
                    jobTitle: headline,
                    location,
                    field: classifyField(headline),
                    lastScrapedAt: new Date().toISOString(),
                };
            }).filter((f: any) => {
                if (!f.profileUrl) return false;
                return isSaudi(f.location) && isFreelancer(f.jobTitle) && !isIrrelevant(f.jobTitle);
            });

            const newItems = processed.filter((f: any) => !existingUrls.has(f.profileUrl));
            newItems.forEach((f: any) => existingUrls.add(f.profileUrl));
            allNewItems.push(...newItems);

            console.log(`[LinkedIn Scraper] Run ${runId}: ${newItems.length} new profiles (${processed.length - newItems.length} duplicates skipped).`);

        } catch (err: any) {
            console.error(`[LinkedIn Scraper] Error on run ${i + 1}:`, err.message);
        }

        // Small gap between runs
        if (i < runsToExec - 1) await new Promise(r => setTimeout(r, 3000));
    }

    // Merge new items into existing and save
    const finalData = [...existingData, ...allNewItems];
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(finalData, null, 2));

    console.log(`[LinkedIn Scraper] ✅ Done. ${allNewItems.length} new profiles added. Total: ${finalData.length}`);
    return finalData;
}
