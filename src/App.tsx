/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { ExecutiveOverview } from './pages/ExecutiveOverview';
import { SectoralAnalysis } from './pages/SectoralAnalysis';
import { DataTransparency } from './pages/DataTransparency';

import { LastMileAnalytics } from './pages/LastMileAnalytics';
import { GoogleTrendsInsights } from './pages/GoogleTrendsInsights';
import { AppStoreInsights } from './pages/AppStoreInsights';
import { AIAnalyst } from './pages/AIAnalyst';
import { LanguageProvider } from './contexts/LanguageContext';
import { GoogleTrendsProvider } from './contexts/GoogleTrendsContext';
import { AppStoreProvider } from './contexts/AppStoreContext';
import { AIProvider } from './contexts/AIContext';
import { MapAnalyticsProvider } from './contexts/MapAnalyticsContext';
import { SallaAnalyticsProvider } from './contexts/SallaAnalyticsContext';
import { LinkedInAnalyticsProvider } from './contexts/LinkedInAnalyticsContext';
import { SallaAnalytics } from './pages/SallaAnalytics';
import { LinkedInAnalytics } from './pages/LinkedInAnalytics';
import { TwitterAnalyticsProvider } from './contexts/TwitterAnalyticsContext';
import { ReviewAnalyticsProvider } from './contexts/ReviewAnalyticsContext';
import { TwitterGigAnalyzer } from './pages/TwitterGigAnalyzer';
import { DriverPressureInsights } from './pages/DriverPressureInsights';
import { AqarIntelligence } from './pages/AqarIntelligence';
import { AqarIntelligenceProvider } from './contexts/AqarIntelligenceContext';
import { MaroofRegistryInsights } from './pages/MaroofRegistryInsights';
import { MaroofAnalyticsProvider } from './contexts/MaroofAnalyticsContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ExecutiveOverview />;
      case 'sectoral':
        return <SectoralAnalysis />;
      case 'lastmile':
        return <LastMileAnalytics />;
      case 'transparency':
        return <DataTransparency />;

      case 'trends':
        return <GoogleTrendsInsights />;
      case 'appstore':
        return <AppStoreInsights />;
      case 'salla':
        return <SallaAnalytics />;
      case 'linkedin':
        return <LinkedInAnalytics />;
      case 'twitter':
        return <TwitterGigAnalyzer />;
      case 'pressure':
        return <DriverPressureInsights />;
      case 'aqar':
        return <AqarIntelligence />;
      case 'maroof':
        return <MaroofRegistryInsights />;
      case 'aianalyst':
        return <AIAnalyst />;
      default:
        return <ExecutiveOverview />;
    }
  };

  return (
    <LanguageProvider>
      <GoogleTrendsProvider>
        <AppStoreProvider>
          <MapAnalyticsProvider>
            <SallaAnalyticsProvider>
              <LinkedInAnalyticsProvider>
                <TwitterAnalyticsProvider>
                  <ReviewAnalyticsProvider>
                    <AqarIntelligenceProvider>
                      <MaroofAnalyticsProvider>
                        <AIProvider>
                          <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
                            {renderContent()}
                          </Layout>
                        </AIProvider>
                      </MaroofAnalyticsProvider>
                    </AqarIntelligenceProvider>
                  </ReviewAnalyticsProvider>
                </TwitterAnalyticsProvider>
              </LinkedInAnalyticsProvider>
            </SallaAnalyticsProvider>
          </MapAnalyticsProvider>
        </AppStoreProvider>
      </GoogleTrendsProvider>
    </LanguageProvider>
  );
}

