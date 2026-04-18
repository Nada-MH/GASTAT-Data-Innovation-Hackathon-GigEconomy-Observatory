import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Aqar Intelligence Data Types
 */
export interface AqarListing {
  listingId: string;
  title: string;
  neighborhood: string | null;
  city: string;
  propertyType: string;
  price: number;
  reviewsCount: number;
  rating: string;
  hostType: string;
  url: string;
  hostName?: string;
}

export interface CityStats {
  listings: number;
  hosts: number;
  superhosts: number;
}

export interface AqarAnalyticsData {
  lastUpdated: string;
  totalListings: number;
  totalHosts: number;
  uniqueHosts: number;
  superhosts: number;
  cityBreakdown: Record<string, CityStats>;
  listings: AqarListing[];
}

interface AqarIntelligenceContextType {
  data: AqarAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const AqarIntelligenceContext = createContext<AqarIntelligenceContextType | undefined>(undefined);

export function AqarIntelligenceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AqarAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use relative path to leverage Vite proxy
      const response = await fetch('/api/aqar/cached');
      if (!response.ok) {
        throw new Error('Failed to load cached Aqar intelligence data');
      }
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err: any) {
      console.error("Error loading Aqar data:", err);
      setError(err.message || 'An error occurred while loading data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/aqar/sync', {
        method: 'POST'
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to sync Aqar data');
      }
      const jsonData = await response.json();
      setData(jsonData);
      console.log("✅ Aqar Intelligence synced successfully");
    } catch (err: any) {
      console.error("Error syncing Aqar data:", err);
      setError(err.message || 'An error occurred during synchronization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AqarIntelligenceContext.Provider value={{ data, isLoading, error, refreshData }}>
      {children}
    </AqarIntelligenceContext.Provider>
  );
}

export function useAqarIntelligence() {
  const context = useContext(AqarIntelligenceContext);
  if (context === undefined) {
    throw new Error('useAqarIntelligence must be used within an AqarIntelligenceProvider');
  }
  return context;
}
