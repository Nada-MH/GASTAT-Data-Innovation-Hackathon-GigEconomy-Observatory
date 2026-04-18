/**
 * Google Trends API Service
 * Frontend service layer for communicating with the Express backend
 * Processes raw Apify data into structured analysis (matching dashboard.py logic)
 */

import type {
  ApifyTrendsResult,
  TrendScore,
  RegionInterest,
  TopQuery,
  RisingQuery,
  IntentScore,
  WorkIntentAnalysis,
  ProcessedTrendsData,
  TrendsRunResponse,
  TrendsStatusResponse,
} from '../types/googleTrends';

// ---- API Calls ----

export async function startTrendsAnalysis(
  searchTerms: string[],
  geo: string,
  timeRange: string
): Promise<TrendsRunResponse> {
  const response = await fetch('/api/trends/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ searchTerms, geo, timeRange }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start analysis');
  }

  return response.json();
}

export async function checkRunStatus(runId: string): Promise<TrendsStatusResponse> {
  const response = await fetch(`/api/trends/status/${runId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check status');
  }

  return response.json();
}

export async function getResults(datasetId: string): Promise<ApifyTrendsResult[]> {
  const response = await fetch(`/api/trends/results/${datasetId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch results');
  }

  return response.json();
}

export async function fetchCachedTrends(): Promise<{ data: ApifyTrendsResult[]; timestamp: string } | null> {
  const response = await fetch('/api/trends/cached');
  if (!response.ok) return null;
  return response.json();
}

// ---- Data Processing (mirrors dashboard.py logic) ----

/**
 * Calculate trend scores - average search interest per keyword
 * Matches Python: avg_interest = sum(values) / len(values)
 */
function calculateTrendScores(data: ApifyTrendsResult[]): TrendScore[] {
  return data.map((item) => {
    const timeline = item.interestOverTime_timelineData || [];
    const values = timeline
      .filter((p) => p.hasData[0])
      .map((p) => p.value[0]);
    const avgInterest = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
      keyword: item.searchTerm,
      trend_score: Math.round(avgInterest * 100) / 100,
    };
  });
}

/**
 * Extract region interest data
 * Matches Python: regions by subregion with score
 */
function extractRegions(data: ApifyTrendsResult[]): RegionInterest[] {
  const regions: RegionInterest[] = [];
  for (const item of data) {
    for (const r of item.interestBySubregion || []) {
      if (r.hasData[0]) {
        regions.push({
          keyword: item.searchTerm,
          region: r.geoName,
          score: r.value[0],
        });
      }
    }
  }
  return regions;
}

/**
 * Extract top related queries
 * Matches Python: relatedQueries_top
 */
function extractTopQueries(data: ApifyTrendsResult[]): TopQuery[] {
  const queries: TopQuery[] = [];
  for (const item of data) {
    for (const q of item.relatedQueries_top || []) {
      queries.push({
        keyword: item.searchTerm,
        query: q.query,
        score: q.value,
      });
    }
  }
  return queries;
}

/**
 * Extract rising/breakout queries
 * Matches Python: relatedQueries_rising
 */
function extractRisingQueries(data: ApifyTrendsResult[]): RisingQuery[] {
  const rising: RisingQuery[] = [];
  for (const item of data) {
    for (const q of item.relatedQueries_rising || []) {
      rising.push({
        keyword: item.searchTerm,
        rising_query: q.query,
        growth: q.formattedValue,
      });
    }
  }
  return rising;
}

/**
 * Calculate intent scores
 * Matches Python: intent_score = avg_interest + (rising_count * 10)
 */
function calculateIntentScores(data: ApifyTrendsResult[]): IntentScore[] {
  return data.map((item) => {
    const timeline = item.interestOverTime_timelineData || [];
    const values = timeline
      .filter((p) => p.hasData[0])
      .map((p) => p.value[0]);
    const avgInterest = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const risingCount = (item.relatedQueries_rising || []).length;
    const intentScore = avgInterest + risingCount * 10;
    return {
      keyword: item.searchTerm,
      intent_score: Math.round(intentScore * 100) / 100,
    };
  });
}

/**
 * Work Intent Analysis
 * Matches Python: Total_Search_Results + Related_Query_Count = Intent_Score
 */
function calculateWorkIntentAnalysis(data: ApifyTrendsResult[]): WorkIntentAnalysis[] {
  return data.map((item) => {
    const timeline = item.interestOverTime_timelineData || [];
    const relatedQueries = item.relatedQueries_top || [];
    const topRelated = relatedQueries.slice(0, 3).map((q) => q.query);
    return {
      Keyword: item.searchTerm,
      Total_Search_Results: timeline.length,
      Related_Query_Count: relatedQueries.length,
      Intent_Score: timeline.length + relatedQueries.length,
      Top_Related_Queries: topRelated.join(', '),
    };
  });
}

/**
 * Process all raw Apify data into structured analysis
 */
export function processResults(rawData: ApifyTrendsResult[]): ProcessedTrendsData {
  return {
    trendScores: calculateTrendScores(rawData),
    regions: extractRegions(rawData),
    topQueries: extractTopQueries(rawData),
    risingQueries: extractRisingQueries(rawData),
    intentScores: calculateIntentScores(rawData),
    workIntentAnalysis: calculateWorkIntentAnalysis(rawData),
    rawData,
  };
}

// ---- CSV Export Helpers ----

export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Arabic support
    headers.join(',') +
    '\n' +
    data
      .map((row) =>
        headers
          .map((h) => {
            const val = String(row[h] ?? '');
            return val.includes(',') || val.includes('"') || val.includes('\n')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Full analysis flow: start → poll → process
 * Returns processed data or throws on failure
 */
export async function runFullAnalysis(
  searchTerms: string[],
  geo: string,
  timeRange: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ProcessedTrendsData> {
  // Step 1: Start the run
  onProgress?.(5, 'Starting Apify Google Trends Scraper...');
  const { runId, datasetId } = await startTrendsAnalysis(searchTerms, geo, timeRange);

  // Step 2: Poll for completion
  let elapsed = 0;
  const pollInterval = 10; // seconds

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
    elapsed += pollInterval;

    const progress = Math.min(Math.floor((elapsed / 300) * 90), 90);
    onProgress?.(progress, `Processing... (${elapsed}s elapsed)`);

    const { status } = await checkRunStatus(runId);

    if (status === 'SUCCEEDED') {
      onProgress?.(92, 'Fetching results...');
      break;
    }

    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
      throw new Error(`Analysis failed with status: ${status}`);
    }
  }

  // Step 3: Fetch results
  onProgress?.(95, 'Processing data...');
  const rawData = await getResults(datasetId);

  // Step 4: Process
  onProgress?.(100, 'Analysis complete!');
  return processResults(rawData);
}
