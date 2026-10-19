import type { Place, VerifiedCoordinates } from './directory';

export const DIRECTORY_SCHEMA_VERSION = 1;
export const DEMO_NOTICE = 'Sample public listings only. No live RAMP data connection.';
export type DirectoryMode = 'sample' | 'live' | 'fallback';
export type DirectoryResult = {
  places: Place[];
  mode: DirectoryMode;
  updatedAt?: string;
  notice: string;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
  return value as Record<string, unknown>;
}
function str(record: Record<string, unknown>, key: string, max: number): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new Error('Invalid field: ' + key);
  }
  return value.trim();
}
function isoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) &&
    !Number.isNaN(Date.parse(value));
}
function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
export function isApprovedDirectoryEndpoint(endpoint: string): boolean {
  if (!httpsUrl(endpoint)) return false;
  const url = new URL(endpoint);
  // Never fetch an arbitrary externally-configured host until RAMP authorizes it.
  return url.hostname === 'rampapproved.com' || url.hostname.endsWith('.rampapproved.com');
}
function coordinates(raw: unknown): VerifiedCoordinates | undefined {
  if (raw === undefined || raw === null) return undefined;
  const value = object(raw);
  const latitude = value.latitude;
  const longitude = value.longitude;
  const verifiedAt = str(value, 'verifiedAt', 48);
  const sourceUrl = str(value, 'sourceUrl', 2048);
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
      !isoDate(verifiedAt) || !httpsUrl(sourceUrl)) {
    throw new Error('Invalid verified coordinates');
  }
  return { latitude, longitude, verifiedAt, sourceUrl };
}

export function parseDirectoryResponse(input: unknown): { places: Place[]; updatedAt: string } {
  const root = object(input);
  if (root.schemaVersion !== DIRECTORY_SCHEMA_VERSION) throw new Error('Unsupported directory schema');
  const updatedAt = str(root, 'updatedAt', 48);
  if (!isoDate(updatedAt)) throw new Error('Invalid directory update time');
  if (!Array.isArray(root.locations) || root.locations.length > 5000) {
    throw new Error('Invalid locations array');
  }
  const ids = new Set<string>();
  const places: Place[] = [];
  for (const item of root.locations) {
    const row = object(item);
    const id = str(row, 'id', 100);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ['__proto__','constructor','prototype'].includes(id.toLowerCase()) || ids.has(id)) throw new Error('Duplicate/unsafe id: ' + id);
    ids.add(id);
    if (typeof row.published !== 'boolean') throw new Error('published must be explicit');
    if (!row.published) continue;
    const name = str(row, 'name', 200);
    const type = str(row, 'type', 80);
    const city = str(row, 'city', 100);
    const state = str(row, 'state', 20);
    const address = str(row, 'address', 350);
    const certified = str(row, 'certified', 120);
    const accessibility = str(row, 'accessibility', 6000);
    const source = str(row, 'source', 2048);
    if (!httpsUrl(source)) throw new Error('Unsafe location source URL');
    const verified = coordinates(row.coordinates);
    places.push({ id, name, type, city, state, address, certified, accessibility, source,
      ...(verified ? { coordinates: verified } : {}) });
  }
  return { places, updatedAt };
}
export type FetchDirectory = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export async function loadDirectory(
  endpoint: string | undefined,
  fallbackPlaces: readonly Place[],
  fetcher: FetchDirectory = fetch,
  timeoutMs = 10000,
): Promise<DirectoryResult> {
  const fallback = [...fallbackPlaces];
  if (!endpoint) return { places: fallback, mode: 'sample', notice: DEMO_NOTICE };
  if (!isApprovedDirectoryEndpoint(endpoint)) {
    return { places: fallback, mode: 'fallback',
      notice: 'Unapproved directory endpoint. Showing offline sample places.' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const parsed = parseDirectoryResponse(await response.json());
    // Successful empty response is authoritative: do not resurrect unpublished records.
    return { places: parsed.places, mode: 'live', updatedAt: parsed.updatedAt,
      notice: 'Directory data loaded from the configured RAMP endpoint.' };
  } catch {
    return { places: fallback, mode: 'fallback',
      notice: 'Live directory unavailable. Showing an offline sample, not current results.' };
  } finally {
    clearTimeout(timeout);
  }
}
