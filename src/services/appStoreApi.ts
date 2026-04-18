/**
 * App Store Analytics Service
 * Frontend service for App Store & Google Play data
 * Mirrors dashboardv2.py estimation logic
 */

import type {
  RawAppReviews,
  AppAnalyticsRow,
  AppStoreAnalytics,
  EstimationParams,
} from '../types/appStore';

// ---- API Calls ----

export async function fetchAppStoreData(): Promise<{ data: RawAppReviews[]; timestamp: string }> {
  const response = await fetch('/api/apps/fetch');
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch app store data');
  }
  return response.json();
}

export async function getCachedAppData(): Promise<{ data: RawAppReviews[]; timestamp: string } | null> {
  try {
    const response = await fetch('/api/apps/cached');
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// ---- Estimation Logic (mirrors dashboardv2.py compute_df) ----

export function computeAnalytics(
  rawData: RawAppReviews[],
  params: EstimationParams,
  fetchedAt: string
): AppStoreAnalytics {
  const rows: AppAnalyticsRow[] = rawData.map((item) => {
    const totalReviews = item.iosReviews + item.androidReviews;
    const estimatedTransactions =
      params.reviewRate > 0 ? Math.round(totalReviews / params.reviewRate) : 0;
    const estimatedDriversTotal =
      params.ordersPerDriver > 0 ? Math.round(estimatedTransactions / params.ordersPerDriver) : 0;
    const estimatedActiveDrivers = Math.round(estimatedDriversTotal * params.activeRatio);
    const iosSharePercent =
      totalReviews > 0
        ? Math.round((item.iosReviews / totalReviews) * 1000) / 10
        : 0;

    return {
      app: item.app,
      iosReviews: item.iosReviews,
      androidReviews: item.androidReviews,
      totalReviews,
      estimatedTransactions,
      estimatedDriversTotal,
      estimatedActiveDrivers,
      iosSharePercent,
    };
  });

  const totalReviews = rows.reduce((s, r) => s + r.totalReviews, 0);
  const totalActiveDrivers = rows.reduce((s, r) => s + r.estimatedActiveDrivers, 0);
  const topApp =
    totalReviews > 0
      ? rows.reduce((max, r) => (r.totalReviews > max.totalReviews ? r : max), rows[0]).app
      : '—';
  const iosRows = rows.filter((r) => r.iosSharePercent > 0);
  const avgIosShare =
    iosRows.length > 0
      ? Math.round((iosRows.reduce((s, r) => s + r.iosSharePercent, 0) / iosRows.length) * 10) / 10
      : 0;

  return {
    rows,
    totals: { totalReviews, totalActiveDrivers, topApp, avgIosShare },
    params,
    fetchedAt,
  };
}

// ---- CSV Export ----

export function exportAppDataCSV(rows: AppAnalyticsRow[]): void {
  if (rows.length === 0) return;

  const headers = [
    'App',
    'iOS Reviews',
    'Android Reviews',
    'Total Reviews',
    'Estimated Transactions',
    'Estimated Drivers (Total)',
    'Estimated Active Drivers',
    'iOS Share (%)',
  ];

  const csvContent =
    '\uFEFF' +
    headers.join(',') +
    '\n' +
    rows
      .map(
        (r) =>
          `${r.app},${r.iosReviews},${r.androidReviews},${r.totalReviews},${r.estimatedTransactions},${r.estimatedDriversTotal},${r.estimatedActiveDrivers},${r.iosSharePercent}`
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'gig_market_dataset.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
