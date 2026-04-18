import { LastMileResponse } from '../types/mapAnalytics';

export async function fetchLastMileData(): Promise<LastMileResponse> {
  const response = await fetch('/api/last-mile/analyze');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze last-mile operations');
  }
  
  return response.json();
}

export async function getCachedLastMileData(): Promise<LastMileResponse> {
  const response = await fetch('/api/last-mile/cached');
  
  if (!response.ok) {
    throw new Error('No cached data');
  }
  
  return response.json();
}
