/**
 * App Store Analytics Context
 * Global state for App Store & Google Play data
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { RawAppReviews, AppStoreAnalytics, EstimationParams } from '../types/appStore';
import { fetchAppStoreData, computeAnalytics } from '../services/appStoreApi';

interface AppStoreContextType {
  rawData: RawAppReviews[] | null;
  analytics: AppStoreAnalytics | null;
  isLoading: boolean;
  error: string | null;
  params: EstimationParams;

  fetchData: () => Promise<void>;
  updateParams: (params: EstimationParams) => void;
  clearError: () => void;
}

const DEFAULT_PARAMS: EstimationParams = {
  reviewRate: 0.02,
  ordersPerDriver: 15,
  activeRatio: 0.10,
};

const AppStoreContext = createContext<AppStoreContextType | undefined>(undefined);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [rawData, setRawData] = useState<RawAppReviews[] | null>(null);
  const [analytics, setAnalytics] = useState<AppStoreAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<EstimationParams>(DEFAULT_PARAMS);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAppStoreData();
      setRawData(result.data);
      setFetchedAt(result.timestamp);
      setAnalytics(computeAnalytics(result.data, params, result.timestamp));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch app store data');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  const fetchCachedData = useCallback(async () => {
    setIsLoading(true);
    try {
      const cached = await fetch('/api/apps/cached').then(r => r.ok ? r.json() : null);
      if (cached && cached.data) {
        setRawData(cached.data);
        setFetchedAt(cached.timestamp);
        setAnalytics(computeAnalytics(cached.data, params, cached.timestamp));
      }
    } catch (err) {
      console.warn('No cached app store data found');
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchCachedData();
  }, [fetchCachedData]);

  const updateParams = useCallback(
    (newParams: EstimationParams) => {
      setParams(newParams);
      if (rawData && fetchedAt) {
        setAnalytics(computeAnalytics(rawData, newParams, fetchedAt));
      }
    },
    [rawData, fetchedAt]
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AppStoreContext.Provider
      value={{ rawData, analytics, isLoading, error, params, fetchData, updateParams, clearError }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used within AppStoreProvider');
  return context;
}
