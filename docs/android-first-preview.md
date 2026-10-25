# Android-first prototype verification (no Apple account required)

This remains an independent, unofficial RAMP Mobile concept. Do not submit it as an official RAMP app or enable a live feed without the organization's permission.

## Source checks
Use Node 22+ and run from the repository root:

```sh
npm install
npm run validate-data
npm run test:unit
npm run typecheck
npm run check:expo-compatibility
npm run check:bundle:android
npm run check:bundle:ios
```

Record the output and the Git commit SHA. A passing Metro export is not the same as a device installation.

## Android demo without Apple
1. Sign in to Expo/EAS separately from Apple: `npx eas-cli@latest login`.
2. Initialize the Expo project if not already associated: `npx eas-cli@latest init`. Verify the account, slug and ownership before accepting.
3. Run `npx eas-cli@latest build --platform android --profile preview-android`.
4. Install the signed APK on a physical Android device. Test launch, source disclaimer, search, search reset, filters, saved places, checklist reset, device data clearing, refresh, map/list behavior and external links.
5. Run TalkBack and maximum font scaling tests. Record any clipping, unreachable controls and inaccurate accessibility claims.

The Android profile is configured for an internal APK; it is not a Play Store submission. Do not enable an undocumented remote directory endpoint. Production Android maps may require a properly restricted Google Maps key.

## Before a demo to RAMP
- Confirm the visible concept/unofficial label and offline sample notice.
- Show that a successful empty authorized feed remains empty and never substitutes example listings.
- Confirm that map pins require valid source-provided coordinates. Never fabricate coordinates.
- Avoid entering personal health information in the checklists.
- Get written authorization before using official branding in distribution, publishing, or connecting production venue data.

## Still blocked
- iOS TestFlight / App Store distribution: Apple account recovery and signing access.
- Production directory feed: permission and integration details from RAMP.
- Official branding, privacy and app ownership: agreement with RAMP.

Record build IDs, Android OS and device model, test results and defects in `docs/device-qa.md`. Do not label any check passed unless actually executed.
