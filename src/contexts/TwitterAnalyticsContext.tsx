import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TwitterStats {
  total: number;
  pos_pct: number;
  neg_pct: number;
  neu_pct: number;
  avg_likes: number;
  avg_rts: number;
  pressure_idx: number;
}

interface Tweet {
  id: string;
  text: string;
  author: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  sentiment: string;
  created_at: string;
}

interface TwitterData {
  stats: TwitterStats | null;
  ai_report: string;
  tweets: Tweet[];
}

interface TwitterAnalyticsContextType {
  data: TwitterData;
  isLoading: boolean;
  error: string | null;
  timestamp: string | null;
  refreshData: (hashtags?: string[], maxItems?: number) => Promise<void>;
}

const TwitterAnalyticsContext = createContext<TwitterAnalyticsContextType | undefined>(undefined);

export function TwitterAnalyticsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TwitterData>({ stats: null, ai_report: '', tweets: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/twitter/cached');
      if (response.ok) {
        const json = await response.json();
        setData(json.data);
        setTimestamp(json.timestamp);
      }
    } catch (err: any) {
      console.error('Failed to load cached Twitter analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshData = async (hashtags?: string[], maxItems?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const body = {
        hashtags: hashtags || ["سائق أوبر", "هنقرستيشن", "عمل حر السعودية", "بولت السعودية", "جاهز ديليفري", "اقتصاد المنصات"],
        maxItems: maxItems || 50
      };

      const response = await fetch('/api/twitter/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch Twitter data');
      }

      setData(result.data);
      setTimestamp(result.timestamp);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TwitterAnalyticsContext.Provider value={{ data, isLoading, error, timestamp, refreshData }}>
      {children}
    </TwitterAnalyticsContext.Provider>
  );
}

export function useTwitterAnalytics() {
  const context = useContext(TwitterAnalyticsContext);
  if (context === undefined) {
    throw new Error('useTwitterAnalytics must be used within a TwitterAnalyticsProvider');
  }
  return context;
}
