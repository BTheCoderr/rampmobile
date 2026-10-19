import { placesWithVerifiedCoordinates } from './directory.ts';
import type { Place } from './directory';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
export const RHODE_ISLAND_REGION: MapRegion = {
  latitude: 41.66, longitude: -71.46, latitudeDelta: 0.75, longitudeDelta: 0.75,
};

// Coordinates come only from records with verifiable provenance. No guessed pins.
export function initialMapRegion(places: readonly Place[]): MapRegion {
  const withCoordinates = placesWithVerifiedCoordinates(places);
  if (!withCoordinates.length) return { ...RHODE_ISLAND_REGION };
  const lats = withCoordinates.map(p => p.coordinates.latitude);
  const lons = withCoordinates.map(p => p.coordinates.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.min(90, Math.max(0.05, (maxLat - minLat) * 1.5)),
    longitudeDelta: Math.min(180, Math.max(0.05, (maxLon - minLon) * 1.5)),
  };
}
