/**
 * App Store Analytics Types
 * Matches the data structures from dashboardv2.py
 */

export interface AppConfig {
  name: string;
  ios: string | null;
  android: string | null;
}

export const APPS_CONFIG: AppConfig[] = [
  { name: 'Uber Driver',   ios: '1131342792', android: 'com.ubercab.driver' },
  { name: 'HungerStation', ios: '1417971080', android: 'com.logistics.rider.hungerstation' },
  { name: 'Jahez Driver',  ios: '1533853878', android: 'com.jahez.drivers' },
  { name: 'Jeeny Driver',  ios: '1456609782', android: 'me.com.easytaxista' },
  { name: 'Bolt Driver',   ios: '1218410932', android: 'ee.mtakso.driver' },
  { name: 'The Chefz',     ios: '1509399994', android: 'com.thechefz.drivers' },
  { name: 'Keeta Rider',   ios: '1673738231', android: 'com.sankuai.sailor.courier' },
  { name: 'ToYou Rep',     ios: '1616631880', android: 'com.arammeem.android.apps.driver' },
  { name: 'Maraseel',      ios: '6746419135', android: 'com.mrsool.courier' },
  { name: 'Noon Food Partner', ios: '6475007255', android: null },
];

export interface RawAppReviews {
  app: string;
  iosReviews: number;
  androidReviews: number;
}

export interface AppAnalyticsRow {
  app: string;
  iosReviews: number;
  androidReviews: number;
  totalReviews: number;
  estimatedTransactions: number;
  estimatedDriversTotal: number;
  estimatedActiveDrivers: number;
  iosSharePercent: number;
}

export interface EstimationParams {
  reviewRate: number;      // e.g. 0.02 = 2%
  ordersPerDriver: number; // e.g. 15
  activeRatio: number;     // e.g. 0.10 = 10%
}

export interface AppStoreAnalytics {
  rows: AppAnalyticsRow[];
  totals: {
    totalReviews: number;
    totalActiveDrivers: number;
    topApp: string;
    avgIosShare: number;
  };
  params: EstimationParams;
  fetchedAt: string;
}
