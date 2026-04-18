import React, { createContext, useContext, useState, useEffect } from 'react';
import { SallaStore, SallaApiResponse } from '../types/salla';

interface SallaAnalyticsContextType {
  stores: SallaStore[];
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
  refreshData: (liveSync?: boolean) => Promise<void>;
}

const SallaAnalyticsContext = createContext<SallaAnalyticsContextType | undefined>(undefined);

export function SallaAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<SallaStore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshData = async (liveSync = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = liveSync ? '/api/salla/sync' : '/api/salla/stores';
      const options = liveSync ? { method: 'POST' } : { method: 'GET' };
      const response = await fetch(url, options);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        let errMsg = errJson.error || 'Failed to fetch Salla data';
        if (errJson.stderr) {
            errMsg += ' | Details: ' + errJson.stderr;
        }
        throw new Error(errMsg);
      }
      const result: SallaApiResponse = await response.json();
      setStores(result.data);
      setLastSync(result.timestamp);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData(false);
  }, []);

  return (
    <SallaAnalyticsContext.Provider value={{ stores, isLoading, error, lastSync, refreshData }}>
      {children}
    </SallaAnalyticsContext.Provider>
  );
}

export function useSallaAnalytics() {
  const context = useContext(SallaAnalyticsContext);
  if (context === undefined) {
    throw new Error('useSallaAnalytics must be used within a SallaAnalyticsProvider');
  }
  return context;
}
