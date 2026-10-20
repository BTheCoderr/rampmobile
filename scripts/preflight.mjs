import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = filename => JSON.parse(readFileSync(new URL('../' + filename, import.meta.url), 'utf8'));
const app = readJson('app.json').expo;
const pkg = readJson('package.json');
const eas = readJson('eas.json');

assert.ok(app.extra?.conceptOnly === true, 'Prototype must remain clearly marked concept-only');
assert.ok(/concept/i.test(app.name), 'Internal build must display concept status');
assert.ok(app.ios?.bundleIdentifier?.endsWith('.rampmobileconcept'), 'Use a nonofficial iOS bundle identifier');
assert.ok(app.android?.package?.endsWith('.rampmobileconcept'), 'Use a nonofficial Android package identifier');
assert.equal(app.version, pkg.version, 'Keep display and source versions in sync');
assert.ok(pkg.dependencies.expo.startsWith('~54.'), 'Expo SDK update requires a new compatibility audit');
assert.ok(pkg.dependencies['react-native-maps'], 'Native map dependency must be installed');

for (const [name, config] of Object.entries(eas.build)) {
  assert.equal(config.distribution, 'internal', name + ' must not be a store distribution profile');
  assert.equal(config.env?.EXPO_PUBLIC_RAMP_DIRECTORY_URL ?? '', '',
    name + ' must use offline demo data until RAMP approves live integration');
}
assert.ok(eas.build['preview-android']?.android?.buildType === 'apk', 'Android preview needs installable APK');
assert.ok(eas.build['preview-ios-simulator']?.ios?.simulator === true, 'Simulator preview needs simulator mode');
assert.ok(eas.build['preview-ios-device']?.ios?.simulator === false, 'iPhone preview must target physical device');

console.log('RAMP mobile internal-build configuration checks passed (concept-only).');
console.log('EAS project link and Apple signing are separate requirements for native builds.');
