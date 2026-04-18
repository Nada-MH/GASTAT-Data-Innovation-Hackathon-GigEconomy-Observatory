import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LastMileResponse, MapLocation } from '../types/mapAnalytics';
import { fetchLastMileData, getCachedLastMileData } from '../services/mapApi';

interface MapAnalyticsContextType {
  data: MapLocation[];
  timestamp: string | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const MapAnalyticsContext = createContext<MapAnalyticsContextType | undefined>(undefined);

export function MapAnalyticsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MapLocation[]>([]);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cached = await getCachedLastMileData();
      setData(cached.data);
      setTimestamp(cached.timestamp);
    } catch {
      // If no cached data, just leave it empty. Don't trigger expensive live fetch.
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fresh = await fetchLastMileData();
      setData(fresh.data);
      setTimestamp(fresh.timestamp);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh map data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  return (
    <MapAnalyticsContext.Provider value={{ data, timestamp, isLoading, error, refreshData }}>
      {children}
    </MapAnalyticsContext.Provider>
  );
}

export function useMapAnalytics() {
  const context = useContext(MapAnalyticsContext);
  if (context === undefined) {
    throw new Error('useMapAnalytics must be used within a MapAnalyticsProvider');
  }
  return context;
}
