import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isApprovedDirectoryEndpoint, parseDirectoryResponse, loadDirectory } from '../src/directory-source.ts';
import { initialMapRegion, RHODE_ISLAND_REGION } from '../src/map-model.ts';
import { placesWithVerifiedCoordinates, safeStoredFavoriteIds } from '../src/directory.ts';

const samples = JSON.parse(readFileSync(new URL('../src/places.json', import.meta.url), 'utf8'));
const location = {
  id: 'sample-record', name: 'Example location', type: 'Community',
  city: 'Providence', state: 'RI', address: '12 Example St, Providence, RI',
  certified: '2026-10', accessibility: 'Door and elevator information to confirm.',
  source: 'https://rampapproved.com/accessible-locations/', published: true,
};
const verified = {
  latitude: 41.824, longitude: -71.412,
  verifiedAt: '2026-10-19T18:00:00Z',
  sourceUrl: 'https://rampapproved.com/accessible-locations/',
};
const payload = locations => ({
  schemaVersion: 1, updatedAt: '2026-10-19T18:00:00Z', locations,
});
const mockFetcher = document => async (_url, opts) => {
  assert.equal(opts.headers.Accept,'application/json');
  return { ok:true,status:200,json:async()=>document };
};

test('explicitly published records are included, withdrawn ones removed', () => {
  const parsed = parseDirectoryResponse(payload([location,{...location,id:'withdrawn',published:false}]));
  assert.equal(parsed.places.length,1);
  assert.equal(parsed.places[0].id,'sample-record');
});
test('rejects future-dated directory updates without showing them as current', () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  assert.throws(() => parseDirectoryResponse({ ...payload([location]), updatedAt: future }), /Future directory update time/);
});
test('authoritative empty response remains empty rather than restoring old listings', () => {
  assert.deepEqual(parseDirectoryResponse(payload([])).places,[]);
});
test('strict version and publication-state checks prevent stale or malformed feeds', () => {
  assert.throws(()=>parseDirectoryResponse({...payload([location]),schemaVersion:5}),/schema/);
  assert.throws(()=>parseDirectoryResponse(payload([{...location,published:undefined}])),/published/);
  assert.throws(()=>parseDirectoryResponse(payload([location,{...location}])),/Duplicate/);
});
test('rejects unsafe source URL and impossible coordinates', () => {
  assert.throws(()=>parseDirectoryResponse(payload([{...location,source:'javascript:alert(1)'}])),/Unsafe/);
  assert.throws(()=>parseDirectoryResponse(payload([{...location,coordinates:{...verified,latitude:110}}])),/Invalid/);
  assert.throws(()=>parseDirectoryResponse(payload([{...location,coordinates:{...verified,sourceUrl:'http://example.com'}}])),/Invalid/);
});
test('valid verified coordinates produce map pins while sample data never creates guessed pins', () => {
  const withGeo=parseDirectoryResponse(payload([{...location,coordinates:verified}])).places;
  assert.equal(placesWithVerifiedCoordinates(withGeo).length,1);
  assert.equal(placesWithVerifiedCoordinates(samples).length,0);
  assert.deepEqual(initialMapRegion(samples),RHODE_ISLAND_REGION);
  assert.equal(initialMapRegion(withGeo).latitude,verified.latitude);
});
test('two verified records produce a viewport that contains both', () => {
  const other={...location,id:'second',coordinates:{...verified,latitude:41.70,longitude:-71.50}};
  const withGeo=parseDirectoryResponse(payload([{...location,coordinates:verified},other])).places;
  const region=initialMapRegion(withGeo);
  assert.ok(region.latitudeDelta > 0.12);
  assert.ok(region.longitudeDelta > 0.08);
});
test('only HTTPS RAMP-owned endpoints may be opted in', () => {
  assert.equal(isApprovedDirectoryEndpoint('https://api.rampapproved.com/mobile/locations.json'),true);
  assert.equal(isApprovedDirectoryEndpoint('https://rampapproved.com/api/directory'),true);
  assert.equal(isApprovedDirectoryEndpoint('http://rampapproved.com/api/directory'),false);
  assert.equal(isApprovedDirectoryEndpoint('https://rampapproved.com.evil.test/feed'),false);
  assert.equal(isApprovedDirectoryEndpoint('https://evil.test/feed'),false);
});
test('no endpoint does not make a network call', async () => {
  const result=await loadDirectory(undefined,samples,async()=>{throw Error('should never request');});
  assert.equal(result.mode,'sample');
  assert.equal(result.places.length,9);
});
test('unapproved endpoint returns sample instead of making a request', async () => {
  const result=await loadDirectory('https://example.com/locations',samples,async()=>{throw Error('should never request');});
  assert.equal(result.mode,'fallback');
});
test('configured HTTPS feed uses the published data', async () => {
  const result=await loadDirectory('https://api.rampapproved.com/feed',samples,mockFetcher(payload([location])));
  assert.equal(result.mode,'live');
  assert.deepEqual(result.places.map(p=>p.id),['sample-record']);
});
test('empty live feed does not resurrect the demo', async () => {
  const result=await loadDirectory('https://rampapproved.com/feed',samples,mockFetcher(payload([])));
  assert.equal(result.mode,'live');
  assert.equal(result.places.length,0);
});
test('broken response and network failure return explicitly labeled offline samples', async () => {
  const error=await loadDirectory('https://rampapproved.com/feed',samples,async()=>{throw Error('offline');});
  assert.equal(error.mode,'fallback');
  assert.match(error.notice,/offline/i);
  const bad=await loadDirectory('https://rampapproved.com/feed',samples,mockFetcher({hi:'bad'}));
  assert.equal(bad.mode,'fallback');
});
test('saved ids retain plausible keys across offline, never arbitrary payloads', () => {
  assert.deepEqual(safeStoredFavoriteIds(['sample-record','sample-record','../bad',42]),['sample-record']);
});

import { reconcileDirectoryRefresh } from '../src/directory-source.ts';

test('a failed refresh retains loaded live records and marks them stale', () => {
  const live = { places: [{ ...location, id:'live-venue' }], mode:'live', updatedAt:'2026-10-19T18:00:00Z', notice:'live' };
  const fallback = { places:samples, mode:'fallback', notice:'offline' };
  const result = reconcileDirectoryRefresh(live, fallback);
  assert.equal(result.mode,'stale');
  assert.deepEqual(result.places.map(place => place.id),['live-venue']);
  assert.match(result.notice,/outdated or withdrawn/);
  assert.equal(result.updatedAt,live.updatedAt);
});
test('successful empty live response deletes previously listed places', () => {
  const live = { places:[location], mode:'live', notice:'live' };
  const empty = { places:[], mode:'live', updatedAt:'2026-10-20T12:00:00Z', notice:'updated' };
  assert.deepEqual(reconcileDirectoryRefresh(live,empty),empty);
});
test('stale state stays stale on repeated failures but recovers on success', () => {
  const stale = { places:[location], mode:'stale', notice:'outdated' };
  const fallback = { places:samples, mode:'fallback', notice:'offline' };
  assert.equal(reconcileDirectoryRefresh(stale,fallback).mode,'stale');
  const recovered = { places:[], mode:'live', notice:'new' };
  assert.deepEqual(reconcileDirectoryRefresh(stale,recovered),recovered);
});
test('ordinary demo and initial failure keep their explicit offline sample', () => {
  const sample = { places:samples, mode:'sample', notice:'sample' };
  const fallback = { places:samples, mode:'fallback', notice:'offline' };
  assert.deepEqual(reconcileDirectoryRefresh(sample,fallback),fallback);
});
