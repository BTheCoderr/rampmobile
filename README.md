# RAMP Mobile Concept

Independent, unofficial Expo/React Native prototype informed by public listings on [RAMP Approved](https://rampapproved.com/).

**Not authorized or endorsed by RAMP. Do not publish or submit as an official RAMP app without approval.**

## What's implemented
- iOS and Android native directory screens
- Search by name, city, type, address and accessibility notes
- Accessible category filters, place-detail screens and touch targets
- Save places locally on a device, no login required
- Open mapping directions using a device's existing apps
- Link to RAMP's official self-assessment, Roll Through booking form and privacy policy
- Nine **sample** public directory listings, with source URLs; not a live or complete database

## Run locally

Requires Node/npm and a mobile device with Expo Go or iOS/Android simulator:

```bash
npm install
npx expo install --fix
npm run validate-data
npm run typecheck
npm run start
```

The prototype has not yet been installed or tested on a physical device or built via EAS; passing source checks does not establish store readiness.

## Before shipping
1. Get written permission from RAMP, agree ownership, scope and app store accounts.
2. Get authorized API/export access to the live RAMP directory; do not treat the current seed as live.
3. Agree which public location, certification and accessibility fields can be reused.
4. Design a real, user-permission-based native map/nearby experience and data update/unpublish flow.
5. Agree scope for self-assessment, Roll Through submissions and any business/admin accounts.
6. Run accessibility QA for VoiceOver, TalkBack, Dynamic Type, contrast, touch targets and disability-user testing.
7. Finalize branding, privacy disclosures, security, TestFlight/Android testing and store review.

**Accuracy note:** accessibility conditions change; users should confirm specific needs directly with a venue. The prototype does not make new accessibility or legal compliance determinations.

## Prototype v0.2: field-visit experience

- Filter sample public-directory locations by name, category, city and *topics mentioned in their notes*.
- Cautious topic labels: a restroom, elevator or parking mention is not a guarantee of adequacy or access.
- View place details and open an external map for directions; the app does not request your location.
- Save a four-question pre-visit checklist per venue on your device without a login or backend.
- Use the native iOS/Android share sheet to share the name, address and directory source.
- Separate, reusable TypeScript catalog logic with eight Node unit tests and CI checks.

Run `npm run test:unit` with Node 22+, `npm run validate-data`, and `npm run typecheck`. GitHub Actions is configured to attempt all three after pushes.

## Remaining before production

This is a prototype with nine public sample listings, not an authorized live data feed. For the next phase, obtain RAMP's written go-ahead, website data access and verified coordinates before adding map pins, nearby-distance sorting or managed directory updates. Conduct VoiceOver/TalkBack and physical-device QA; confirm all outgoing service URLs. Do not submit the unofficial concept under RAMP's name.

## v0.3: native map and approval-gated directory adapter

- A fourth bottom tab, **Map**, uses `react-native-maps@1.20.1` for the existing Expo SDK 54.
- The default map shows Rhode Island without placing fake venue pins. The text-based
  place list under the map supports screen-reader and non-map navigation.
- A map marker is rendered **only** when an authorized directory record supplies
  coordinates, a timestamp, and an HTTPS provenance URL. Those fields are structurally
  validated; venue accuracy must still be verified by RAMP.
- Map respects Explore search, category, city and feature-mention filters.
- Authorized directory client: `src/directory-source.ts`. No endpoint is configured
  by default, and it cannot fetch arbitrary domains.
- Requires `schemaVersion: 1`, explicit `published: true`, safe identifiers,
  valid source URLs and valid latitude/longitude for mapped entries.
- Successful empty feeds and unpublished records do **not** trigger display of old sample data.
- Failed/unavailable/unapproved feeds are clearly labeled as **offline samples**.
- The Refresh directory action reloads the chosen source.
- Saved favorites and personal visit checklists remain local-only.

See [the proposed integration contract](docs/directory-contract.md), including JSON
schema, deletion behavior, map provenance requirements, security boundaries and
the steps RAMP must approve before a real feed is enabled.

### Running / verification

```bash
npm install
npm run validate-data
npm run test:unit
npm run typecheck
npx expo start
```

`npm run test:unit` runs the eight existing directory tests plus the new
live-directory and map source tests. GitHub Actions attempts all checks after
pushes. These automated tests do not establish device compatibility.

**Not completed:** production Google Maps key/configuration for Android,
verified live venue coordinates, RAMP data access, native iOS/Android device QA,
privacy/branding approval, EAS distribution, Apple or Google store submission.
