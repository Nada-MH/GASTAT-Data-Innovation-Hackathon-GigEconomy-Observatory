import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { LinkedInFreelancer, LinkedInMetrics, LinkedInAnalyticsContextType } from '../types/linkedin';

const LinkedInAnalyticsContext = createContext<LinkedInAnalyticsContextType | undefined>(undefined);

export function LinkedInAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [freelancers, setFreelancers] = useState<LinkedInFreelancer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/linkedin/freelancers');

      if (!response.ok) {
        throw new Error(`Failed to fetch LinkedIn data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setFreelancers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching LinkedIn data');
    } finally {
      setIsLoading(false);
    }
  };

  const syncApify = async (keywords: string, limit: number = 30) => {
    setIsLoading(true);
    setError(null);
    try {
      const runResp = await fetch('/api/linkedin/apify/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, limit }),
      });
      const runData = await runResp.json();
      if (!runResp.ok) throw new Error(runData.error || 'Failed to start Apify run');
      
      const runId = runData.runId;

      let status = 'READY'; // Start with a default non-terminal state
      const terminalStates = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];
      
      while (!terminalStates.includes(status)) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const statusResp = await fetch(`/api/linkedin/apify/status/${runId}`);
        const statusData = await statusResp.json();
        status = statusData.status;
        
        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Apify run ended with status: ${status}`);
        }
      }

      const resResp = await fetch(`/api/linkedin/apify/results/${runId}`);
      const resData = await resResp.json();
      
      await refreshData();
      return { success: true, items: resData.data, savedCount: resData.savedCount };
    } catch (err: any) {
      setError(err.message || 'Apify sync failed');
      return { success: false, items: [], savedCount: 0 };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const metrics = useMemo(() => {
    if (freelancers.length === 0) return null;

    const total = freelancers.length;
    
    const fieldCounts = freelancers.reduce((acc, curr) => {
      acc[curr.field] = (acc[curr.field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedFields = Object.entries(fieldCounts).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    const topField = sortedFields.length > 0 ? sortedFields[0][0] : 'None';

    const fieldsDistribution = sortedFields.map(([name, value]) => ({ name, value }));

    return { total, topField, fieldsDistribution };
  }, [freelancers]);

  return (
    <LinkedInAnalyticsContext.Provider value={{ freelancers, metrics, isLoading, error, refreshData, syncApify }}>
      {children}
    </LinkedInAnalyticsContext.Provider>
  );
}

export function useLinkedInAnalytics() {
  const context = useContext(LinkedInAnalyticsContext);
  if (context === undefined) {
    throw new Error('useLinkedInAnalytics must be used within a LinkedInAnalyticsProvider');
  }
  return context;
}
