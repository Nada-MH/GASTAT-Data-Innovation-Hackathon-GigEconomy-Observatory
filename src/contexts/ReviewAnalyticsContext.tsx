import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GigReviewsData } from '../types/reviews';

interface ReviewAnalyticsContextType {
  data: GigReviewsData | null;
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
  refreshData: (liveSync?: boolean) => Promise<void>;
}

const ReviewAnalyticsContext = createContext<ReviewAnalyticsContextType | undefined>(undefined);

export function ReviewAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<GigReviewsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshData = useCallback(async (liveSync = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = liveSync ? '/api/reviews/sync' : '/api/reviews/cached';
      const options = liveSync ? { method: 'POST' } : { method: 'GET' };
      const response = await fetch(url, options);

      // 404 on the cached endpoint just means no data yet — not an error
      if (response.status === 404 && !liveSync) {
        setData(null);
        return;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch Gig Reviews data');
      }

      const result: GigReviewsData = await response.json();
      setData(result);
      setLastSync(result.generated_at);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(false);
  }, [refreshData]);

  return (
    <ReviewAnalyticsContext.Provider value={{ data, isLoading, error, lastSync, refreshData }}>
      {children}
    </ReviewAnalyticsContext.Provider>
  );
}

export function useReviewAnalytics() {
  const context = useContext(ReviewAnalyticsContext);
  if (!context) {
    throw new Error('useReviewAnalytics must be used within a ReviewAnalyticsProvider');
  }
  return context;
}
