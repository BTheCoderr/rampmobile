import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMapDisplayMode } from '../src/map-model.ts';

test('unconfigured screen-reader users start in accessible list-only mode', () => {
  assert.equal(resolveMapDisplayMode(null, true), 'list');
  assert.equal(resolveMapDisplayMode(undefined, true), 'list');
});
test('unconfigured visual browsing defaults to map view', () => {
  assert.equal(resolveMapDisplayMode(null, false), 'map');
});
test('a deliberate saved choice overrides the default on re-entry', () => {
  assert.equal(resolveMapDisplayMode('map', true), 'map');
  assert.equal(resolveMapDisplayMode('list', false), 'list');
});
test('invalid stored values fall back to the accessible default', () => {
  assert.equal(resolveMapDisplayMode('NOT-A-MODE', true), 'list');
  assert.equal(resolveMapDisplayMode({}, false), 'map');
});

test('unmapped demo opens the accessible list without an empty map', () => {
  assert.equal(resolveMapDisplayMode(null, false, false), 'list');
  assert.equal(resolveMapDisplayMode(null, true, false), 'list');
  // Explicit user choices remain respected.
  assert.equal(resolveMapDisplayMode('map', false, false), 'map');
  assert.equal(resolveMapDisplayMode(null, false, true), 'map');
});
