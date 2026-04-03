import type { CityConfig } from './types';

export const CITIES: CityConfig[] = [
  {
    id: 'pune',
    name: 'Pune',
    center: [73.8567, 18.5204],
    zoom: 11.5,
    pitch: 45,
    bearing: -17.6,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    center: [72.8777, 19.0760],
    zoom: 11,
    pitch: 45,
    bearing: -10,
  },
  {
    id: 'nagpur',
    name: 'Nagpur',
    center: [79.0882, 21.1458],
    zoom: 11,
    pitch: 45,
    bearing: 0,
  },
];

export function getCityById(id: string): CityConfig | undefined {
  return CITIES.find((c) => c.id === id);
}
