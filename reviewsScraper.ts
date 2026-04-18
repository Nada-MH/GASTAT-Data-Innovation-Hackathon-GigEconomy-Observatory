import fs from 'fs';
import path from 'path';

// Target apps — Saudi gig economy platforms
export const GIG_APPS: Record<string, { name: string, android_id: string | null, ios_id: string | null }> = {
    chefz: {
        name: "The Chefz",
        android_id: "com.thechefz.drivers",
        ios_id: "1509399994",
    },
    toyou: {
        name: "ToYou Rep",
        android_id: "com.arammeem.android.apps.driver",
        ios_id: "1616631880",
    },
    jeeny: {
        name: "Jeeny Driver",
        android_id: "me.com.easytaxista",
        ios_id: "1456609782",
    },
    hungerstation: {
        name: "HungerStation",
        android_id: "com.logistics.rider.hungerstation",
        ios_id: "1417971080",
    }
};

const TIME_PATTERNS = [
    /(\d+)\s*(?:دقيقة|دقائق|min(?:ute)?s?)/i,
    /(\d+)\s*(?:ساعة|ساعات|hour?s?)/i,
    /waited?\s+(\d+)/i,
    /wait\s+(?:time\s+)?(?:of\s+)?(\d+)/i,
    /انتظرت\s+(\d+)/i,
    /استغرق\s+(\d+)/i,
];

const NEGATIVE_KW = [
    'بطيء', 'تأخير', 'انتظار طويل', 'ما وصل', 'مشكلة', 'سيء', 'awful',
    'terrible', 'slow', 'late', 'cancel', 'رديء', 'غلط', 'لم يصل',
    'worst', 'horrible', 'waiting', 'too long', 'delayed', 'ضغط',
];
const POSITIVE_KW = [
    'سريع', 'ممتاز', 'رائع', 'جيد', 'great', 'fast', 'excellent',
    'good', 'perfect', 'amazing', 'شكراً', 'ولله', 'راضي', 'مريح',
];

export function extractWaitMinutes(text: string): number | null {
    if (!text) return null;
    const t = text.toLowerCase();
    for (const pattern of TIME_PATTERNS) {
        const match = t.match(pattern);
        if (match) {
            const val = parseInt(match[1], 10);
            if (pattern.source.includes('hour') || pattern.source.includes('ساعة') || pattern.source.includes('ساعات')) {
                return val * 60;
            }
            return val;
        }
    }
    return null;
}

export function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    if (!text) return 'neutral';
    const t = text.toLowerCase();
    let pos = 0, neg = 0;
    POSITIVE_KW.forEach(kw => { if (t.includes(kw)) pos++; });
    NEGATIVE_KW.forEach(kw => { if (t.includes(kw)) neg++; });

    if (pos > neg) return 'positive';
    if (neg > pos) return 'negative';
    return 'neutral';
}

export function computePressure(reviews: any[]) {
    if (!reviews || reviews.length === 0) {
        return {
            pressure_index: 0,
            details: { total_reviews: 0, positive: 0, negative: 0, neutral: 0, neg_pct: 0, avg_rating: 0, time_mentions: 0, avg_wait_min: 0, wait_score: 0, rating_score: 0 }
        };
    }

    const times: number[] = [];
    reviews.forEach(r => {
        const t = extractWaitMinutes(r.text);
        if (t !== null) times.push(t);
    });

    const avg_wait = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

    let pos_n = 0, neg_n = 0, neu_n = 0;
    let total_rating = 0;

    reviews.forEach(r => {
        const sent = r.sentiment || analyzeSentiment(r.text);
        if (sent === 'positive') pos_n++;
        else if (sent === 'negative') neg_n++;
        else neu_n++;

        total_rating += (r.rating || 3);
    });

    const n = reviews.length;
    const neg_pct = n ? neg_n / n : 0;
    const avg_rating = n ? total_rating / n : 3;

    let wait_score = Math.min(avg_wait / 120, 1.0) * 10;
    let rating_score = ((5 - avg_rating) / 4) * 10;

    let pressure = (neg_pct * 10) * 0.60 + wait_score * 0.25 + rating_score * 0.15;
    pressure = Math.max(0, Math.min(10, pressure));

    return {
        pressure_index: Number(pressure.toFixed(1)),
        details: {
            total_reviews: n,
            positive: pos_n,
            negative: neg_n,
            neutral: neu_n,
            neg_pct: Number((neg_pct * 100).toFixed(1)),
            avg_rating: Number(avg_rating.toFixed(2)),
            time_mentions: times.length,
            avg_wait_min: Number(avg_wait.toFixed(1)),
            wait_score: Number(wait_score.toFixed(1)),
            rating_score: Number(rating_score.toFixed(1))
        }
    };
}

// ── GROQ AI ANALYSIS ──
export async function groqAnalysis(app_name: string, reviews: any[], pressure: any, apiKey: string): Promise<string> {
    if (!apiKey) return "[Groq key missing — set GROQ_API_KEY in .env]";

    const sample = reviews.slice(0, 40).map(r => "- (" + r.rating + "★) " + (r.text || '').slice(0, 150)).join('\n');
    const d = pressure.details;

    const prompt = `أنت محلل بيانات متخصص في اقتصاد المنصات في المملكة العربية السعودية — مشروع "المرصد الذكي".

تطبيق: ${app_name}
البلد: المملكة العربية السعودية فقط (sa)
عدد التقييمات: ${d.total_reviews}
التوزيع: إيجابية ${d.positive} | سلبية ${d.negative} | محايدة ${d.neutral}
متوسط التقييم: ${d.avg_rating}/5
متوسط وقت الانتظار المذكور: ${d.avg_wait_min} دقيقة (من ${d.time_mentions} تقييم ذكر الوقت)
مؤشر الضغط: ${pressure.pressure_index}/10

عينة من التقييمات السعودية:
${sample}

قدّم تحليلاً مختصراً للمرصد الذكي يشمل:
1. **أبرز شكاوى السائقين/المستخدمين السعوديين** (نقطتان أو ثلاث)
2. **تفسير مؤشر الضغط** ${pressure.pressure_index}/10 — ماذا يعني للسوق السعودي؟
3. **توصية واحدة** لصانع القرار بناءً على هذه البيانات

أجب بالعربية، موجزاً وبعناوين واضحة.`;

    try {
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                max_tokens: 700,
                temperature: 0.3,
                messages: [
                    { role: "system", content: "أنت محلل بيانات متخصص في سوق العمل الرقمي السعودي." },
                    { role: "user", content: prompt },
                ],
            })
        });

        if (!resp.ok) {
            console.error("Groq Error for " + app_name + ": " + resp.status);
            return generateLocalFallbackReport(app_name, pressure);
        }

        const data = await resp.json();
        return data.choices[0]?.message?.content || generateLocalFallbackReport(app_name, pressure);
    } catch (err: any) {
        console.error("Groq Network Error:", err);
        return generateLocalFallbackReport(app_name, pressure);
    }
}

// ── LOCAL HEURISTIC FALLBACK (When Groq is rate-limited/banned) ──
function generateLocalFallbackReport(app_name: string, pressure: any): string {
    const d = pressure.details;
    let report = `### تحليل آلي محلي (نسخة احتياطية لتوقف واجهة برمجة التطبيقات)\n\n`;
    
    // 1. أبرز الشكاوى
    report += `**1. أبرز شكاوى السائقين/المستخدمين السعوديين:**\n`;
    if (d.avg_wait_min >= 15) {
        report += `- **تأخير طويل:** يعاني السائقون من أوقات انتظار طويلة تصل في المتوسط إلى ${d.avg_wait_min} دقيقة، وهو ما يؤثر على إنتاجيتهم.\n`;
    } else if (d.time_mentions > 3) {
        report += `- **مشاكل الانتظار:** تم رصد ${d.time_mentions} شكوى متعلقة بالوقت والانتظار.\n`;
    }
    
    if (d.neg_pct > 30) {
         report += `- **استياء عام:** نسبة التقييمات السلبية بلغت ${d.neg_pct}%، مما يدل على وجود خلل في تجربة الاستخدام أو الدعم الفني.\n`;
    } else {
         report += `- **استقرار نسبي:** معدل التقييمات السلبية ضمن الحدود المقبولة (${d.neg_pct}%).\n`;
    }

    // 2. تفسير مؤشر الضغط
    report += `\n**2. تفسير مؤشر الضغط (${pressure.pressure_index}/10):**\n`;
    if (pressure.pressure_index >= 7) {
        report += `بيئة العمل في منصة ${app_name} تشهد مستويات ضغط عالية جدًا. هذا المؤشر يعكس بيئة سلبية قد تؤدي إلى تسرب السائقين وانخفاض جودة الخدمة في السوق السعودي.\n`;
    } else if (pressure.pressure_index >= 4) {
        report += `مؤشر ضغط متوسط. توجد تحديات واضحة تواجه المتعاملين مع ${app_name} تتطلب اهتماماً إدارياً لتحسين الكفاءة التشغيلية.\n`;
    } else {
        report += `مستوى ضغط منخفض وطبيعي. تشير البيانات إلى بيئة مستقرة نسبياً في تطبيق ${app_name} مقارنة بالمنافسين.\n`;
    }

    // 3. التوصيات
    report += `\n**3. توصية مباشرة لصانع القرار:**\n`;
    if (d.avg_wait_min >= 15) {
        report += `يُوصى بإلزام المنصة شفافية أكبر في توزيع الطلبات ووضع سياسات تعويض مالي على أوقات الانتظار الطويلة في المطاعم.\n`;
    } else if (d.neg_pct > 40) {
        report += `يجب فتح قناة شكاوى مباشرة وفحص جودة الدعم الفني المُقدّم للسائقين والمستخدمين، وإعادة تقييم سياسات الإيقاف.\n`;
    } else {
        report += `الاستمرار في مراقبة الأداء وتفعيل برامج حوافز بسيطة للمحافظة على هذا الاستقرار في معدلات الرضا.\n`;
    }

    return report;
}

// ── ANDROID REVIEWS via Apify actor benthepythondev/google-play-reviews-scraper ──
async function fetchAndroidReviewsApify(appId: string, maxItems: number, apifyToken: string): Promise<any[]> {
    if (!apifyToken) {
        console.warn(`[Android] No Apify token — skipping ${appId}`);
        return [];
    }

    const url = `https://api.apify.com/v2/acts/benthepythondev~google-play-reviews-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`;

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appIds: [appId],
                countries: ['sa'],
                language: 'ar',
                maxReviews: maxItems,
                sortBy: 'newest',
            }),
            signal: AbortSignal.timeout(130_000),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`[Android Apify] ${appId} error ${resp.status}: ${errText}`);
            return [];
        }

        const items: any[] = await resp.json();
        if (!Array.isArray(items)) return [];

        return items.map((r: any) => ({
            author:   r.userName || r.author || r.reviewerName || 'مجهول',
            rating:   r.score ?? r.rating ?? r.stars ?? 0,
            text:     r.text || r.content || r.review || '',
            date:     r.at ? new Date(r.at).toISOString() : r.date || '',
            thumbsUp: r.thumbsUpCount ?? r.thumbsUp ?? r.thumbs ?? 0,
        })).filter((r: any) => r.text).slice(0, maxItems);
    } catch (err: any) {
        console.error(`[Android Apify] ${appId} failed: ${err.message}`);
        return [];
    }
}

/**
 * Fetch iOS reviews directly from iTunes RSS API — free, no Apify needed, no proxy restrictions.
 * Returns up to 50 most-recent reviews for the given app ID in Saudi Arabia.
 */
async function fetchIosReviewsRSS(appId: string, maxItems: number): Promise<any[]> {
    const url = `https://itunes.apple.com/rss/customerreviews/id=${appId}/sortBy=mostRecent/json?cc=sa`;
    const resp = await fetch(url, {
        headers: { "User-Agent": "SmartObservatory/1.0" },
        signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) throw new Error(`iTunes RSS ${resp.status}`);

    const data = await resp.json();
    const entries: any[] = data?.feed?.entry || [];
    // First entry is app metadata, not a review — skip it
    return entries.slice(1, maxItems + 1).map((e: any) => ({
        author:  e?.author?.name?.label || "مجهول",
        rating:  parseInt(e?.["im:rating"]?.label || "0", 10),
        title:   e?.title?.label || "",
        review:  e?.content?.label || "",
        date:    e?.updated?.label || "",
        voteCount: parseInt(e?.["im:voteCount"]?.label || "0", 10),
    }));
}

export async function runGigReviewsScraper(apifyToken: string, groqKey: string) {
    const all_results: any = {
        generated_at: new Date().toISOString(),
        country: 'sa',
        platform: 'both',
        apps: {}
    };

    const MAX_ITEMS = 20;

    for (const [key, app] of Object.entries(GIG_APPS)) {
        console.log("[Gig Reviews] Loading 🇸🇦 " + app.name + "...");
        const reviews: any[] = [];

        // ── Android: Apify benthepythondev/google-play-reviews-scraper ──
        if (app.android_id) {
            try {
                const rawAndroid = await fetchAndroidReviewsApify(app.android_id, MAX_ITEMS, apifyToken);

                rawAndroid.forEach((r: any) => {
                    const text = r.text || "";
                    reviews.push({
                        platform: "android",
                        app: app.name,
                        author: r.author || "مجهول",
                        rating: r.rating || 0,
                        text,
                        date: r.date || "",
                        thumbs_up: r.thumbsUp || 0,
                        reply: "",
                        country: "sa",
                        lang: "ar",
                        sentiment: analyzeSentiment(text),
                        wait_minutes: extractWaitMinutes(text),
                    });
                });
                console.log("  > Android " + app.name + ": " + rawAndroid.length + " reviews (Apify actor)");
            } catch (e: any) {
                console.error("  > Android " + app.name + " Apify actor failed: " + e.message);
            }
        }

        // ── iOS: iTunes RSS API (free, no Apify, no proxy restrictions) ──
        if (app.ios_id) {
            try {
                const rawIos = await fetchIosReviewsRSS(app.ios_id, MAX_ITEMS);
                rawIos.forEach((r: any) => {
                    const text = ((r.title || "") + " " + (r.review || "")).trim();
                    reviews.push({
                        platform: "ios",
                        app: app.name,
                        author: r.author || "مجهول",
                        rating: r.rating || 0,
                        text,
                        date: r.date || "",
                        thumbs_up: r.voteCount || 0,
                        reply: "",
                        country: "sa",
                        lang: "ar",
                        sentiment: analyzeSentiment(text),
                        wait_minutes: extractWaitMinutes(text),
                    });
                });
                console.log("  > iOS " + app.name + ": " + rawIos.length + " reviews (iTunes RSS)");
            } catch (e: any) {
                console.error("  > iOS " + app.name + " failed: " + e.message);
            }
        }

        const pressure = computePressure(reviews);
        const ai_report = await groqAnalysis(app.name, reviews, pressure, groqKey);

        all_results.apps[key] = {
            name: app.name,
            total_reviews: reviews.length,
            pressure: pressure,
            ai_report: ai_report,
            reviews: reviews,
        };
    }

    // Save to disk
    const dbPath = path.join(process.cwd(), 'data', 'saudi_gig_reviews.json');
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(all_results, null, 2), 'utf-8');
    console.log("[Gig Reviews] Saved fully processed dashboard data to " + dbPath);

    return all_results;
}
