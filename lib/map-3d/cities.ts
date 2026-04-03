import type { CityConfig } from './types';

export const CITIES: CityConfig[] = [
  {
    id: 'pune',
    name: 'Pune',
    center: [73.8567, 18.5204],
    zoom: 11.5,
    pitch: 45,
    bearing: -17.6,
  }
];

export function getCityById(id: string): CityConfig | undefined {
  return CITIES.find((c) => c.id === id);
}
