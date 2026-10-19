# RAMP Mobile Concept: manual device acceptance checklist

This is an **unexecuted test plan**, not a report of passing device tests.
Record date, tester, OS, device, build ID and pass/fail for each item.

## iOS and Android exploratory test matrix

| Area | Test | Pass condition |
| --- | --- | --- |
| Cold launch | Launch offline from a clean install | No crash; sample notice is obvious |
| Directory | Search by place, city, accessibility note | Accurate matching; no false "guaranteed accessible" labels |
| Filters | Combine city/category/topic then clear | Explore list and map list agree |
| Favorites | Save, close app, reopen, unsave | Local saved list is persistent and reversible |
| Visit checklist | Mark each question and restart | Questions persist only for the relevant venue |
| Map | Open the map with unverified sample records | No fabricated pins, accessible list present |
| Map navigation | Switch map/list-only repeatedly | No blank screen or trapped focus |
| Venue directions | Open venue using system maps | Correct address transmitted; failed links handled |
| Sharing | Open native share sheet then cancel | No crash; no private visit checklist shared |
| Source state | No approved feed configured | Sample mode clearly labeled |
| Source failure | Simulate network error | Offline fallback clearly labeled, not represented as live |
| Source unpublish | Return published=false | Withdrawn item removed from browse/map |
| VoiceOver | Swipe through screens and landmarks | Correct labels, state and reading order |
| TalkBack | Browse Map, List and place details | All controls reachable and correctly labeled |
| Text scaling | Set maximum OS text size | No important text or controls truncated |
| Zoom and orientation | Test supported phone/tablet sizes | Screen remains navigable |
| Contrast | Inspect states and chip selection | Text and controls remain perceivable |
| No location permission | Refuse any location request | App does not depend on GPS permission |
| Android standalone | Test signed APK maps | Provider/key configured, map tiles load |
| iOS internal | Test physical device install | Ad hoc registration and signature succeed |

## Build checks

GitHub Actions is configured to run data validation, unit tests, TypeScript,
Expo dependency compatibility and iOS/Android Metro export checks after push.
Inspect the real workflow results before claiming a build passes.

### Local commands

```bash
git clone https://github.com/BTheCoderr/rampmobile.git
cd rampmobile
npm install
npm run validate-data
npm run test:unit
npm run typecheck
npm run check:expo-compatibility
npm run check:bundle:ios
npm run check:bundle:android
```

### EAS internal previews (not store submissions)

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview-android
npx eas-cli@latest build --platform ios --profile preview-ios-simulator
# Requires Apple credentials and registered devices:
npx eas-cli@latest build --platform ios --profile preview-ios-device
```

Temporary concept identifiers: `com.bthecoderr.rampmobileconcept` (iOS/Android).
Never submit this unofficial app to stores without agreement on licensing,
RAMP branding, developer ownership and privacy.

SDK 54 uses react-native-maps 1.20.1. Native Android maps may require a
restricted Google Maps SDK key in a standalone build; do not commit an
unrestricted key to this repository.

## Sign-off record

- Date:
- Tester:
- Device / OS:
- Build ID:
- CI workflow result:
- Screenshots / findings:
- Blockers:
- Client approval status:
