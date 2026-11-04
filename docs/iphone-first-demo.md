# RAMP Mobile — iPhone-first demo checklist

**Goal:** test and present the existing independent RAMP Mobile concept on a **physical iPhone**, before any Android work. This is not a client-approved app or a completed iOS release.

## Shortest route: Expo Go (no Apple developer signing)

This repository uses **Expo SDK 54**. As of November 2026, the **Apple App Store version of Expo Go supports SDK 54**. Do **not** upgrade the project to SDK 55+ just for this demo: newer Expo Go builds are not currently available in the App Store.

1. On the iPhone, install **Expo Go** from the Apple App Store and sign in with your Expo account (not your Apple Developer account).
2. On the Mac, from your local copy of the repo, run:

   ```bash
   cd rampmobile
   npm install
   npx expo login
   npm run validate-data
   npm run typecheck
   npx expo start
   ```

3. Use the iPhone's regular Camera app to scan the QR code shown in the terminal. Sign in to Expo Go and Expo CLI with the **same** Expo account. The phone and Mac should be on the same Wi-Fi network.
4. If LAN access fails, stop the server and try `npx expo start --tunnel`. You may need an additional tunnel dependency. Keep the server running for the duration of the demo.
5. Expo Go is for the **live prototype**, not a standalone RAMP app installed from TestFlight. A QR code shown on someone else's screen does nothing unless the development server is still running.

### If Expo Go refuses to open the app

- Verify Expo Go's SDK is 54 and `package.json` still has `"expo": "~54.0.0"`.
- Run `npx expo-doctor@latest` and `npx expo install --check` before changing dependencies. Do not blindly upgrade to the latest SDK.
- Check that the iPhone and the CLI use the same Expo account, then try tunnel mode.
- If the error is a native-module/runtime incompatibility, record the error and fix/test it before claiming readiness.

## iPhone acceptance checklist — mark only after testing

- [ ] Physical iPhone opens the app through Expo Go and cold-launches without a red screen
- [ ] Offline **sample** directory notice is visible and honest
- [ ] Search and city/category/topic filters work; clearing filters works
- [ ] Venue detail notes and source attribution are readable
- [ ] Save/remove favorites and checklist answers persist after relaunch
- [ ] Open iOS directions and native share sheet safely
- [ ] Map tab opens; switching to List only works; **unverified sample places do not get fabricated pins**
- [ ] VoiceOver reading order, labels and touch targets checked
- [ ] Larger iPhone text sizes do not obscure controls
- [ ] External RAMP resource links open correctly
- [ ] No sensitive personal or medical details entered into sample checklists

## Demo to Tina and Autumn

Run the app on your iPhone, not just a screenshot. For a remote Google Meet demonstration, join from the **Google Meet iPhone app** and select **More > Share screen > Start Sharing** (availability subject to meeting controls). Open Expo Go and walk through:

1. Explore nine sample places and search for Providence.
2. Open a place and explain accessibility notes are not certifications or guarantees.
3. Save a place and complete part of the private pre-visit checklist.
4. Show the Map/List toggle and explain that valid real map pins need RAMP-approved coordinates.
5. Show Resources and ask what functionality matters most for v1.

**Prepare a backup video of the successful iPhone run after it has actually been tested.** Before the demo, enable Do Not Disturb on the iPhone to prevent notification exposure when screen sharing.

## Boundaries

No live directory feed, RAMP approval, iOS TestFlight build, Apple signing, or physical-device accessibility audit is confirmed. Do not promise those capabilities. The immediate objective is a clear and working iPhone concept demo, then discovery of scope, data access, budget, launch timeline, and ownership.
