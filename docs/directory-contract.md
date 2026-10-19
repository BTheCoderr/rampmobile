# RAMP mobile directory integration contract (proposed)

**Status:** Prototype interface only. RAMP has not authorized a feed, API, credential, or app publication.

The app currently loads the nine-item `src/places.json` offline sample.
It does **not** scrape RAMPapproved.com or infer/guess coordinates.

## Activate an approved source

After RAMP approves a publicly readable mobile directory endpoint hosted on
`https://rampapproved.com` or a subdomain it controls:

```sh
EXPO_PUBLIC_RAMP_DIRECTORY_URL=https://api.rampapproved.com/mobile/locations.json
```

Set the variable locally or in a reviewed EAS environment. Do **not** paste API secrets in
an `EXPO_PUBLIC_` variable, embed private tokens in a mobile build, or assume the endpoint exists.
Authenticated feeds require a separately designed, server-mediated integration.

## Strict JSON response format (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-10-19T18:00:00Z",
  "locations": [
    {
      "id": "venue-123",
      "published": true,
      "name": "Example venue (fictional)",
      "type": "Community",
      "city": "Providence",
      "state": "RI",
      "address": "Example address supplied by RAMP",
      "certified": "Listing reviewed October 2026",
      "accessibility": "Example source text including limitations and caveats.",
      "source": "https://rampapproved.com/accessible-locations/",
      "coordinates": null
    }
  ]
}
```

The example is fictional: it is **not** a listing to publish.

For mapped entries the authorized backend may add a `coordinates` object:

```json
{
  "latitude": 41.0,
  "longitude": -71.0,
  "verifiedAt": "2026-10-19T18:00:00Z",
  "sourceUrl": "https://rampapproved.com/accessible-locations/"
}
```

The latitude/longitude above only illustrate the schema, **not a real venue location**.
Geographic positions must be checked against the exact venue address by RAMP's data
maintainer and retained with the underlying source and verification time.
The app rejects invalid numeric ranges, non-HTTPS source URLs, invalid time metadata,
and duplicate/unsafe IDs. Software validation does *not* independently certify that
coordinates, accessibility features or classification are accurate.

## Publication and refresh semantics

- `published` is required for **every** record. Only `true` is exposed.
- `published: false` records are omitted, including from the native map.
- An empty successful response is authoritative. The app must not republish withdrawn
  locations from local sample data.
- If the endpoint is absent, the app displays its explicitly labeled offline sample.
- If the endpoint errors, times out, returns malformed data, or uses an unapproved host,
  the app shows an explicitly labeled **fallback** offline sample and does not call it live.
- Favorites and visit checklists remain local to each device; stale saved IDs are not
  displayed unless an authorized published listing returns.
- The mobile app requests no precise user location. A future "near me" feature requires
  explicit device permission, privacy language and an alternative for users who opt out.

## Acceptance checklist before connecting production data

1. Tina/RAMP confirms in writing the app's scope, rights, approval display rules,
   deletion/unpublication authority, and source-of-truth owner.
2. Inventory the website's actual data source and agree a stable API/export contract.
3. Verify coordinates from address records; preserve their source and verification date.
4. Confirm whether assessments, Roll Through requests and account fields may be shown publicly.
5. Verify the endpoint's transport, rate limits, update schedule and depublication behavior.
6. Test iOS VoiceOver and Android TalkBack, keyboard/focus navigation, dynamic text,
   high contrast, alternate text-based map browsing and failure states on physical devices.
7. For Android production map builds, set up the required restricted Google Maps SDK key
   using the Expo SDK 54 compatible native configuration, rather than committing a key.
8. Agree App Store / Play Store developer account ownership, branding and privacy disclosures.

## Local verification

```bash
npm install
npm run validate-data
npm run test:unit
npm run typecheck
npx expo start
```

The map is rendered using the SDK 54 compatible `react-native-maps@1.20.1`.
In Expo Go, Apple/Google base maps should load without store-build API credentials.
Production Android map builds need additional Google Maps configuration.
Tests cover payload semantics, duplicate IDs, fallback mode, and coordinate validation;
they do not replace native device testing.
