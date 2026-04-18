export interface MapLocation {
  id: number;
  type: string;  // e.g. 'Cloud Kitchen', 'Logistics Hub'
  name: string;
  lat: number;
  lng: number;
  trafficIndex: number;
  isPeakTime: boolean;
  activeDrivers: number;
  capacity: number;
  busynessIndex: number;
  delayCoefficient: number;
}

export interface LastMileResponse {
  data: MapLocation[];
  timestamp: string;
}
