# Mobile internal testing / handoff

**This is an unofficial prototype, not an authorized RAMP publication.**
Do not submit it to Apple or Google or use RAMP's live data without written
approval from the organization's owner.

## Verified source checks

The October 20, 2026 GitHub Actions run #59 passed data validation, 35 unit
tests, TypeScript, Expo compatibility, and iOS + Android JavaScript bundle exports.
Those checks do **not** prove a signed native application installs or passes
screen-reader testing.

## Android: installable debug build

GitHub Actions → **Android internal debug APK** → choose a successful build →
**Artifacts** → `rampmobile-android-debug` → download/unzip `app-debug.apk`.

This APK is intended for internal Android testing only. It uses offline sample
listings and a concept-only application ID. To install it, a tester may need to
allow APK installation from the file manager they are using. Only install
artifacts from this repository's verified Actions runs.

If a workflow fails, inspect its failed step and logs. No APK exists until
**Build debug APK**, **Verify APK exists**, and **Upload APK for testers** all pass.

## iPhone: signed device preview via Expo EAS

The automated iOS JavaScript export is **not** a TestFlight build or IPA.
A manual **iOS Simulator preview** workflow is available for an unsigned
Simulator artifact; it cannot be installed on an ordinary iPhone.

A developer using the project from their computer can initiate signed
internal device distribution:

```sh
git clone https://github.com/BTheCoderr/rampmobile.git
cd rampmobile
npm install
npm run preflight
npm run validate-data
npm run test:unit
npm run typecheck
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform ios --profile preview-ios-device
```

Signing requires an Apple Developer account with appropriate permissions,
Apple provisioning, registered test devices or an alternative approved
distribution route, and the right to distribute the app as a concept.
Don't create a new Expo project automatically if an organization project is
later supplied by Tina.

## Native accessibility acceptance before calling it finished

1. iPhone VoiceOver and Android TalkBack: headers, tabs, checklist checkbox
   states, map list alternative, back buttons, focus order.
2. Very large system text, high contrast, and 200% zoom: navigation and
   text must remain usable without hiding critical information.
3. No network: search/saved locations/visit checklist work from local sample.
4. Live adapter (in a controlled test with authorized data): unpublishing
   removes a location immediately after a successful refresh; a refresh
   failure labels previously loaded data as outdated, not live.
5. Confirm official website links for assessment, booking, FAQs, contact,
   privacy policy; confirm directions to the actual street address.
6. Screen-reader users get a list-first alternative to unverified map pins.
7. Submit no sensitive disability or health information; generic checklist
   values remain local on the device.
8. Validate Android Back behavior and native crash-recovery flow.

The broader manual checklist is in [device-qa.md](device-qa.md).

## Next external approvals / release requirements

- Written approval of official RAMP brand and app ownership.
- Access to the website's authoritative directory, update/deletion policy, and
  coordinates verified by RAMP; do not scrape or guess locations.
- Decide first-release functionality, timeline, support contact, privacy
  disclosures and target users with Tina.
- App icons, splash artwork, RAMP-authorized copy, accessibility UX signoff.
- Apple/Google developer accounts, signing, beta testing and review.
