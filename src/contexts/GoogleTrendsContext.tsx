/**
 * Google Trends Context
 * Global state management for Google Trends analysis data
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ProcessedTrendsData, GeoOption, TimeRangeOption } from '../types/googleTrends';
import { DEFAULT_KEYWORDS } from '../types/googleTrends';
import { runFullAnalysis, fetchCachedTrends, processResults } from '../services/googleTrendsApi';

interface GoogleTrendsContextType {
  // Data
  trendsData: ProcessedTrendsData | null;
  lastUpdated: string | null;

  // Loading state
  isLoading: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;

  // Actions
  runAnalysis: (keywords: string[], geo: GeoOption, timeRange: TimeRangeOption) => Promise<void>;
  clearData: () => void;
  clearError: () => void;
}

const GoogleTrendsContext = createContext<GoogleTrendsContextType | undefined>(undefined);

export function GoogleTrendsProvider({ children }: { children: React.ReactNode }) {
  const [trendsData, setTrendsData] = useState<ProcessedTrendsData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(
    async (keywords: string[], geo: GeoOption, timeRange: TimeRangeOption) => {
      setIsLoading(true);
      setProgress(0);
      setProgressMessage('Initializing...');
      setError(null);

      try {
        const result = await runFullAnalysis(keywords, geo, timeRange, (p, msg) => {
          setProgress(p);
          setProgressMessage(msg);
        });

        setTrendsData(result);
        setLastUpdated(new Date().toISOString());
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadCachedData = useCallback(async () => {
    try {
      const cached = await fetchCachedTrends();
      if (cached && cached.data) {
        setTrendsData(processResults(cached.data));
        setLastUpdated(cached.timestamp);
      }
    } catch (err) {
      console.error('Failed to load cached trends:', err);
    }
  }, []);

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  const clearData = useCallback(() => {
    setTrendsData(null);
    setLastUpdated(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <GoogleTrendsContext.Provider
      value={{
        trendsData,
        lastUpdated,
        isLoading,
        progress,
        progressMessage,
        error,
        runAnalysis,
        clearData,
        clearError,
      }}
    >
      {children}
    </GoogleTrendsContext.Provider>
  );
}

export function useGoogleTrends() {
  const context = useContext(GoogleTrendsContext);
  if (context === undefined) {
    throw new Error('useGoogleTrends must be used within a GoogleTrendsProvider');
  }
  return context;
}
