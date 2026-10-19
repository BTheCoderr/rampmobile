import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACCESS_TOPICS, VISIT_QUESTIONS, filterPlaces, listCities, topicsMentioned, buildDirectionsUrl, safeSavedIds, safeVisitPlans } from '../src/directory.ts';

const places = JSON.parse(readFileSync(new URL('../src/places.json', import.meta.url), 'utf8'));
const base = { query: '', category: 'All', city: 'All', topic: 'any' };
test('seed has unique locations and cities', () => {
  assert.equal(places.length, 9);
  assert.equal(new Set(places.map(p => p.id)).size, 9);
  assert.ok(listCities(places).includes('Providence'));
});
test('search ignores case and surrounding spaces', () => {
  assert.deepEqual(filterPlaces(places,{...base,query:' AQUARIUM '}).map(p => p.id),['aquarium']);
  assert.ok(filterPlaces(places,{...base,query:'wheelchair'}).length > 0);
  assert.equal(filterPlaces(places,{...base,query:'missingzzz'}).length,0);
});
test('city and category intersect', () => {
  assert.deepEqual(filterPlaces(places,{...base,category:'Healthcare',city:'Providence'}).map(p => p.id),['bcbsri']);
});
test('topic matching only detects mentions, including cautions', () => {
  const found=filterPlaces(places,{...base,topic:'elevators'});
  assert.ok(found.length>0);
  assert.ok(found.every(p=>/elevator/i.test(p.accessibility)));
  const place=places.find(p=>p.id==='save-the-bay');
  assert.ok(topicsMentioned(place).includes('restrooms'));
  assert.match(place.accessibility,/tight fit/i);
});
test('unknown topics match nothing', () => {
  assert.equal(filterPlaces(places,{...base,topic:'invented'}).length,0);
  assert.equal(ACCESS_TOPICS.length,6);
});
test('directions encode punctuation without using personal coordinates', () => {
  const url=buildDirectionsUrl("23 America's Cup Ave, Newport, RI 02840");
  assert.equal(new URL(url).protocol,'https:');
  assert.ok(url.includes('query='));
  assert.ok(!url.includes('undefined'));
});
test('favorites discard duplicates and unknown ids', () => {
  assert.deepEqual(safeSavedIds(['aquarium','aquarium','unknown',44],places.map(p=>p.id)),['aquarium']);
  assert.deepEqual(safeSavedIds({},places.map(p=>p.id)),[]);
});
test('visit plans reject invalid ids and answer keys', () => {
  const plans=safeVisitPlans({aquarium:['entry','entry','fake',{},'restroom'],fake:['entry']},places.map(p=>p.id));
  assert.deepEqual(plans,{aquarium:['entry','restroom']});
  assert.deepEqual(safeVisitPlans([],places.map(p=>p.id)),{});
  assert.equal(VISIT_QUESTIONS.length,4);
});
