/**
 * Google Trends API Types
 * Matches the data structures from the Apify Google Trends Scraper
 */

// --- Raw Apify Response Types ---

export interface ApifyTimelinePoint {
  time: string;
  formattedTime: string;
  formattedAxisTime: string;
  value: number[];
  hasData: boolean[];
  formattedValue: string[];
  // legacy alias (kept for type compatibility)
  formattedDate?: string;
}

export interface ApifySubregion {
  geoName: string;
  geoCode: string;
  value: number[];
  hasData: boolean[];
  formattedValue: string[];
  maxValueIndex: number;
}

export interface ApifyRelatedQuery {
  query: string;
  value: number;
  formattedValue: string;
  hasData: boolean[];
  link: string;
}

export interface ApifyTrendsResult {
  searchTerm: string;
  geo: string;
  interestOverTime_timelineData: ApifyTimelinePoint[];
  interestBySubregion: ApifySubregion[];
  relatedQueries_top: ApifyRelatedQuery[];
  relatedQueries_rising: ApifyRelatedQuery[];
}

// --- Processed Data Types ---

export interface TrendScore {
  keyword: string;
  trend_score: number;
}

export interface RegionInterest {
  keyword: string;
  region: string;
  score: number;
}

export interface TopQuery {
  keyword: string;
  query: string;
  score: number;
}

export interface RisingQuery {
  keyword: string;
  rising_query: string;
  growth: string;
}

export interface WorkIntentAnalysis {
  Keyword: string;
  Total_Search_Results: number;
  Related_Query_Count: number;
  Intent_Score: number;
  Top_Related_Queries: string;
}

export interface IntentScore {
  keyword: string;
  intent_score: number;
}

export interface ProcessedTrendsData {
  trendScores: TrendScore[];
  regions: RegionInterest[];
  topQueries: TopQuery[];
  risingQueries: RisingQuery[];
  intentScores: IntentScore[];
  workIntentAnalysis: WorkIntentAnalysis[];
  rawData: ApifyTrendsResult[];
}

// --- API Request/Response Types ---

export interface TrendsRunRequest {
  searchTerms: string[];
  geo: string;
  timeRange: string;
}

export interface TrendsRunResponse {
  runId: string;
  datasetId: string;
}

export interface TrendsStatusResponse {
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTED' | 'TIMED-OUT';
  startedAt?: string;
  finishedAt?: string;
}

// --- UI State Types ---

export type GeoOption = 'SA' | 'AE' | 'KW' | 'BH' | 'QA' | 'OM';
export type TimeRangeOption = 'today 1-m' | 'today 3-m' | 'today 12-m';

export interface AnalysisConfig {
  keywords: string[];
  geo: GeoOption;
  timeRange: TimeRangeOption;
}

export const DEFAULT_KEYWORDS = [
  'التسجيل كابتن',
  'وظائف توصيل',
];

export const GEO_OPTIONS: { value: GeoOption; label: string; labelAr: string }[] = [
  { value: 'SA', label: 'Saudi Arabia', labelAr: 'المملكة العربية السعودية' },
  { value: 'AE', label: 'UAE', labelAr: 'الإمارات' },
  { value: 'KW', label: 'Kuwait', labelAr: 'الكويت' },
  { value: 'BH', label: 'Bahrain', labelAr: 'البحرين' },
  { value: 'QA', label: 'Qatar', labelAr: 'قطر' },
  { value: 'OM', label: 'Oman', labelAr: 'عمان' },
];

export const TIME_RANGE_OPTIONS: { value: TimeRangeOption; label: string; labelAr: string }[] = [
  { value: 'today 1-m', label: 'Last Month', labelAr: 'آخر شهر' },
  { value: 'today 3-m', label: 'Last 3 Months', labelAr: 'آخر 3 أشهر' },
  { value: 'today 12-m', label: 'Last 12 Months', labelAr: 'آخر 12 شهر' },
];
