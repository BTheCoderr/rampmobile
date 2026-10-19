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
