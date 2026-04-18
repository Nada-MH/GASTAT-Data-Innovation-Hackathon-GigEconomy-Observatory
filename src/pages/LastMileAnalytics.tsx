/// <reference types="vite/client" />
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  MapPin, 
  Activity, 
  Navigation, 
  Store, 
  Truck,
  TrendingUp,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Mock data for Traffic & POI activity
const trafficActivityData = [
  { time: '06:00', trafficLevel: 20, activeDrivers: 150 },
  { time: '09:00', trafficLevel: 65, activeDrivers: 450 },
  { time: '12:00', trafficLevel: 85, activeDrivers: 800 },
  { time: '15:00', trafficLevel: 70, activeDrivers: 650 },
  { time: '18:00', trafficLevel: 95, activeDrivers: 1100 },
  { time: '21:00', trafficLevel: 60, activeDrivers: 900 },
  { time: '00:00', trafficLevel: 15, activeDrivers: 200 },
];

// Mock data for Workforce Density by Zone
const zoneDensityData = [
  { zone: 'North District', density: 850, capacity: 1000 },
  { zone: 'South District', density: 420, capacity: 600 },
  { zone: 'East District', density: 1100, capacity: 1200 },
  { zone: 'West District', density: 650, capacity: 800 },
  { zone: 'Central Business', density: 1800, capacity: 1500 },
];

const movementPaths = [
  { id: 1, positions: [[24.7136, 46.6753], [24.7500, 46.7000]], weight: 5 },
  { id: 2, positions: [[24.7136, 46.6753], [24.6800, 46.6500]], weight: 3 },
  { id: 3, positions: [[21.4858, 39.1925], [21.5500, 39.1500]], weight: 6 },
];

const getPoiColor = (type: string) => {
  switch(type) {
    case 'Cloud Kitchen': return '#f59e0b'; // amber-500
    case 'Logistics Hub': return '#3b82f6'; // blue-500
    default: return '#94a3b8';
  }
};

const createCustomIcon = (type: string, activeDrivers: number) => {
  const color = getPoiColor(type);
  const size = Math.max(20, activeDrivers / 8); // Scale size based on drivers
  
  return L.divIcon({
    className: 'custom-poi-icon',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; opacity: 0.8; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

import { useMapAnalytics } from '../contexts/MapAnalyticsContext';

export function LastMileAnalytics() {
  const { t } = useLanguage();
  const { data, isLoading, error, refreshData, timestamp } = useMapAnalytics();
  const [timeFilter, setTimeFilter] = useState('Peak Hours');
  const [showCloudKitchens, setShowCloudKitchens] = useState(true);
  const [showLogisticsHubs, setShowLogisticsHubs] = useState(true);
  const [showTraffic, setShowTraffic] = useState(false);

  const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY;

  const filteredPoiData = data.filter(point => {
    if (point.type === 'Cloud Kitchen' && !showCloudKitchens) return false;
    if (point.type === 'Logistics Hub' && !showLogisticsHubs) return false;
    return true;
  });

  // Calculate real Zone Densities from the live POI data
  const getZoneFromLatLng = (lat: number, lng: number) => {
    if (lat > 24 && lat < 25.5 && lng > 46 && lng < 47.5) return 'Riyadh Region';
    if (lat > 21 && lat < 22 && lng > 39 && lng < 40) return 'Jeddah Region';
    if (lat > 26 && lat < 27 && lng > 49.5 && lng < 51) return 'Eastern Province';
    return 'Other Regions';
  };

  const dynamicZoneData = Object.values(
    data.reduce((acc, poi) => {
      const zone = getZoneFromLatLng(poi.lat, poi.lng);
      if (!acc[zone]) {
        acc[zone] = { zone, density: 0, capacity: 0 };
      }
      acc[zone].density += poi.activeDrivers || 0;
      acc[zone].capacity += poi.capacity || 0;
      return acc;
    }, {} as Record<string, { zone: string; density: number; capacity: number }>)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('lastmile.title')}</h2>
          <p className="text-slate-500 text-sm mt-1">{t('lastmile.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2.5"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="All Day">{t('filter.allday')}</option>
            <option value="Peak Hours">{t('filter.peakhours')}</option>
            <option value="Off-Peak Hours">{t('filter.offpeakhours')}</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Fleet Size (Live)</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">
                   {isLoading ? <Loader2 className="animate-spin text-teal-500" /> : data.reduce((acc, poi) => acc + poi.activeDrivers, 0).toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Truck className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="flex items-center text-teal-600 font-medium">
                <TrendingUp size={16} className="mr-1" />
                +12%
              </span>
              <span className="text-slate-500 ml-2">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg. Hub Dwell Time</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">18 min</h3>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Store className="text-amber-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="flex items-center text-teal-600 font-medium">
                <TrendingUp size={16} className="mr-1" />
                -2 min
              </span>
              <span className="text-slate-500 ml-2">efficiency improved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">High Density Zones (Live)</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">
                   {isLoading ? <Loader2 className="animate-spin text-teal-500" /> : data.filter(poi => poi.activeDrivers > 20).length}
                </h3>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg">
                <MapPin className="text-rose-600" size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="flex items-center text-rose-600 font-medium">
                <Activity size={16} className="mr-1" />
                3 Over Capacity
              </span>
              <span className="text-slate-500 ml-2">requires rebalancing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Driver Cluster Movement Analysis</CardTitle>
              <CardDescription>Mobility patterns around Cloud Kitchens and Logistics Hubs.</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button 
                onClick={refreshData} 
                disabled={isLoading}
                className="inline-flex items-center px-3 py-1.5 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Fetching Maps API...' : 'Refresh Live Data'}
              </button>
              {timestamp && (
                 <span className="text-slate-500">
                   Last update: {new Date(timestamp).toLocaleString()}
                 </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full bg-slate-100 rounded-lg border border-slate-200 relative overflow-hidden">
            <MapContainer 
              center={[23.8859, 45.0792]} 
              zoom={5} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              
              {/* Real-Time Traffic Layer (TomTom) */}
              {showTraffic && TOMTOM_API_KEY && (
                <TileLayer
                  attribution='&copy; <a href="https://www.tomtom.com/">TomTom</a>'
                  url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`}
                  opacity={0.8}
                  maxZoom={22}
                />
              )}
              
              {/* Movement Paths */}
              {movementPaths.map((path) => (
                <Polyline 
                  key={`path-${path.id}`}
                  positions={path.positions as [number, number][]} 
                  color="#94a3b8" 
                  weight={path.weight}
                  opacity={0.6}
                  dashArray="5, 10"
                />
              ))}

              <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
                {filteredPoiData.map((point) => (
                  <Marker
                    key={point.id}
                    position={[point.lat, point.lng]}
                    icon={createCustomIcon(point.type, point.activeDrivers)}
                    // @ts-ignore custom marker property to aggregate clusters
                    activeDrivers={point.activeDrivers}
                  >
                    <Popup className="fleet-popup">
                      <div className="text-sm min-w-[150px]">
                        <p className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2">{point.name}</p>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500 text-xs">Type</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${getPoiColor(point.type)}20`, color: getPoiColor(point.type) }}>
                            {point.type}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500 text-xs">Capacity (<span className="italic text-[10px]">Max Drivers</span>)</span>
                          <span className="font-semibold text-slate-700 text-xs">{point.capacity}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500 text-xs">Traffic Delay Coeff</span>
                          <span className="font-semibold text-rose-600 text-xs">{point.delayCoefficient?.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500 text-xs">Popular Times Index</span>
                          <span className="font-semibold text-amber-600 text-xs">{point.busynessIndex?.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-slate-800 text-xs font-bold">Inferred Fleet</span>
                          <span className="font-bold text-teal-600 text-sm">{point.activeDrivers} Drivers</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                checked={showCloudKitchens}
                onChange={(e) => setShowCloudKitchens(e.target.checked)}
              />
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Cloud Kitchens
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                checked={showLogisticsHubs}
                onChange={(e) => setShowLogisticsHubs(e.target.checked)}
              />
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Logistics Hubs
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
                checked={showTraffic}
                onChange={(e) => setShowTraffic(e.target.checked)}
                disabled={!TOMTOM_API_KEY}
              />
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Live Traffic Feed
              {!TOMTOM_API_KEY && <span className="text-xs text-rose-500 ml-1">(Requires API Key)</span>}
            </label>
            <div className="flex items-center gap-2">
              <span className="w-8 h-1 border-t-2 border-dashed border-slate-400"></span>
              High Traffic Routes
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic & POI Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic & Active Drivers Correlation</CardTitle>
            <CardDescription>Google Maps traffic data vs active fleet size.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficActivityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDrivers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area yAxisId="left" type="monotone" dataKey="trafficLevel" name="Traffic Level Index" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTraffic)" />
                  <Area yAxisId="right" type="monotone" dataKey="activeDrivers" name="Active Drivers" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorDrivers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Workforce Density Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Last-Mile Workforce Density</CardTitle>
            <CardDescription>Current driver distribution vs zone capacity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicZoneData.length > 0 && !isLoading ? dynamicZoneData : zoneDensityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="density" name="Current Density" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capacity" name="Zone Capacity" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
