import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Maroof Store Data Types
 */
export interface MaroofStore {
  id: number;
  user_id: string;
  sub: string;
  name: string | null;
  name_ar: string | null;
  localized_name: string;
  display_name: string;
  image_url: string | null;
  business_type_id: number;
  business_type_key: string;
  business_type_name: string;
  business_sub_type_id: number | null;
  business_sub_type_key: string | null;
  business_sub_type_name: string | null;
  other_type_name: string | null;
  rating: number;
  total_reviews: number;
  certification_status: number; // 1 = Silver (FL), 2 = Gold (CR)
  active_status: number;
  admin_active_status: number;
  owner_allow_status: number;
  is_popular_business: boolean;
  store_url: string;
}

export interface MaroofAnalytics {
  stores: MaroofStore[];
  totalStores: number;
  goldStores: number;   // certification_status === 2
  silverStores: number; // certification_status === 1
  avgRating: number;
  totalReviews: number;
  categoryBreakdown: Record<string, number>;
  topCategories: { name: string; count: number }[];
  lastUpdated: string;
}

interface MaroofAnalyticsContextType {
  data: MaroofAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const MaroofAnalyticsContext = createContext<MaroofAnalyticsContextType | undefined>(undefined);

function computeAnalytics(stores: MaroofStore[]): Omit<MaroofAnalytics, 'lastUpdated'> {
  const goldStores = stores.filter(s => s.certification_status === 2).length;
  const silverStores = stores.filter(s => s.certification_status === 1).length;
  const totalReviews = stores.reduce((sum, s) => sum + (s.total_reviews || 0), 0);
  const ratedStores = stores.filter(s => s.rating > 0);
  const avgRating = ratedStores.length > 0
    ? Math.round((ratedStores.reduce((sum, s) => sum + s.rating, 0) / ratedStores.length) * 100) / 100
    : 0;

  const categoryBreakdown: Record<string, number> = {};
  for (const store of stores) {
    const cat = store.business_type_name || 'Other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  const topCategories = Object.entries(categoryBreakdown)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    stores,
    totalStores: stores.length,
    goldStores,
    silverStores,
    avgRating,
    totalReviews,
    categoryBreakdown,
    topCategories,
  };
}

export function MaroofAnalyticsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MaroofAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/maroof/cached');
      if (!response.ok) {
        throw new Error('Failed to load cached Maroof data');
      }
      const jsonData = await response.json();
      const stores: MaroofStore[] = jsonData.stores || jsonData;
      const analytics = computeAnalytics(stores);
      setData({
        ...analytics,
        lastUpdated: jsonData.lastUpdated || new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Error loading Maroof data:", err);
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
      const response = await fetch('/api/maroof/sync', {
        method: 'POST'
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to sync Maroof data');
      }
      const jsonData = await response.json();
      const stores: MaroofStore[] = jsonData.stores || jsonData;
      const analytics = computeAnalytics(stores);
      setData({
        ...analytics,
        lastUpdated: jsonData.lastUpdated || new Date().toISOString(),
      });
      console.log("✅ Maroof data synced successfully");
    } catch (err: any) {
      console.error("Error syncing Maroof data:", err);
      setError(err.message || 'An error occurred during synchronization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MaroofAnalyticsContext.Provider value={{ data, isLoading, error, refreshData }}>
      {children}
    </MaroofAnalyticsContext.Provider>
  );
}

export function useMaroofAnalytics() {
  const context = useContext(MaroofAnalyticsContext);
  if (context === undefined) {
    throw new Error('useMaroofAnalytics must be used within a MaroofAnalyticsProvider');
  }
  return context;
}
