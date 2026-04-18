export interface LinkedInFreelancer {
  profileUrl: string;
  fullName: string;
  jobTitle: string;
  location: string;
  field: string;
  lastScrapedAt: string;
}

export interface LinkedInMetrics {
  total: number;
  topField: string;
  fieldsDistribution: { name: string; value: number }[];
}

export interface LinkedInAnalyticsContextType {
  freelancers: LinkedInFreelancer[];
  metrics: LinkedInMetrics | null;
  isLoading: boolean;
  error: string | null;
  refreshData: (liveSync?: boolean) => Promise<void>;
  syncApify: (keywords: string, limit?: number) => Promise<{ success: boolean; items: any[]; savedCount: number }>;
}
