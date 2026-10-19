/** Conservative, text-only queries; mentions are not accessibility guarantees. */
export type Place = {
  id: string; name: string; type: string; city: string; state: string;
  address: string; certified: string; accessibility: string; source: string;
  // Only authorized, source-verified geographic coordinates produce map pins.
  coordinates?: VerifiedCoordinates;
};

export type VerifiedCoordinates = {
  latitude: number;
  longitude: number;
  verifiedAt: string;
  sourceUrl: string;
};

export function hasVerifiedCoordinates(place: Place): place is Place & { coordinates: VerifiedCoordinates } {
  const value = place.coordinates;
  return Boolean(value &&
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 && value.latitude <= 90 &&
    value.longitude >= -180 && value.longitude <= 180 &&
    typeof value.verifiedAt === 'string' && !Number.isNaN(Date.parse(value.verifiedAt)) &&
    typeof value.sourceUrl === 'string' && /^https:\/\//i.test(value.sourceUrl));
}

export function placesWithVerifiedCoordinates(places: readonly Place[]): Array<Place & { coordinates: VerifiedCoordinates }> {
  return places.filter(hasVerifiedCoordinates);
}

export const ACCESS_TOPICS = [
  { id: 'parking', label: 'Parking', test: /parking|accessible spaces/i },
  { id: 'entrance', label: 'Entrances', test: /entrance|entry|doors?/i },
  { id: 'restrooms', label: 'Restrooms', test: /restroom|bathroom|locker room/i },
  { id: 'elevators', label: 'Elevators', test: /elevator/i },
  { id: 'transit', label: 'Transit', test: /RIPTA|bus|transit/i },
  { id: 'outdoors', label: 'Outdoor areas', test: /garden|patio|outdoor|seasonal/i },
] as const;
export type AccessTopic = (typeof ACCESS_TOPICS)[number]['id'];
export type TopicFilter = AccessTopic | 'any';

export const VISIT_QUESTIONS = [
  { id: 'entry', title: 'Confirm entrance and accessible route' },
  { id: 'restroom', title: 'Confirm restroom dimensions and features' },
  { id: 'parking', title: 'Confirm parking or transit options' },
  { id: 'contact', title: 'Contact the venue about my requirements' },
] as const;
export type VisitQuestionId = (typeof VISIT_QUESTIONS)[number]['id'];
export type VisitPlans = Record<string, VisitQuestionId[]>;

export function topicsMentioned(place: Place): AccessTopic[] {
  return ACCESS_TOPICS.filter(item => item.test.test(place.accessibility)).map(item => item.id);
}

export type DirectoryFilters = { query: string; category: string; city: string; topic: TopicFilter };

export function filterPlaces(places: readonly Place[], filters: DirectoryFilters): Place[] {
  const term = filters.query.trim().replace(/\s+/g,' ').toLocaleLowerCase();
  return places.filter(place => {
    if (filters.category !== 'All' && place.type !== filters.category) return false;
    if (filters.city !== 'All' && place.city !== filters.city) return false;
    if (filters.topic !== 'any' && !topicsMentioned(place).includes(filters.topic)) return false;
    if (!term) return true;
    return [place.name,place.type,place.city,place.state,place.address,place.accessibility]
      .join(' ').toLocaleLowerCase().includes(term);
  });
}
export function listCities(places: readonly Place[]): string[] {
  return [...new Set(places.map(p => p.city))].sort((a,b) => a.localeCompare(b));
}
export function buildDirectionsUrl(address: string): string {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}
export function safeSavedIds(input: unknown, validIds: readonly string[]): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(validIds);
  return [...new Set(input.filter((id): id is string => typeof id === 'string' && allowed.has(id)))];
}
export function safeVisitPlans(input: unknown, validIds: readonly string[]): VisitPlans {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return {};
  const allowed = new Set(validIds);
  const answers = new Set<string>(VISIT_QUESTIONS.map(q => q.id));
  const output: VisitPlans = {};
  for (const [id, value] of Object.entries(input)) {
    if (!allowed.has(id) || !Array.isArray(value)) continue;
    output[id] = [...new Set(value.filter((q): q is VisitQuestionId => typeof q === 'string' && answers.has(q)))];
  }
  return output;
}
