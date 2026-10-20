import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { initialMapRegion, resolveMapDisplayMode } from './map-model';
import type { MapDisplayMode } from './map-model';
import { buildDirectionsUrl, placesWithVerifiedCoordinates } from './directory';
import type { Place } from './directory';
import type { DirectoryMode } from './directory-source';

type Props = {
  places: readonly Place[];
  onOpenPlace: (id: string) => void;
  filterSummary: string;
  onClearFilters: () => void;
  directoryMode: DirectoryMode;
};

const theme = { ink: '#153346', teal: '#006D60', navy: '#123648', muted: '#45616B', border: '#CCDEDE' };
const MAP_DISPLAY_STORAGE_KEY = 'rampmobile:map-display:v1';
async function openDirections(place: Place) {
  const url = buildDirectionsUrl(place.address);
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Maps unavailable', 'Your map app could not open this address. You can copy it from the location details.');
  }
}
function ModeSwitch({ mode, setMode }: { mode: 'map' | 'list'; setMode: (mode: 'map' | 'list') => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.modes}>
      {([['map', 'Map and list'], ['list', 'List only']] as const).map(([value, label]) => (
        <Pressable
          key={value} accessibilityRole="tab" accessibilityLabel={label}
          accessibilityState={{ selected: mode === value }}
          onPress={() => setMode(value)}
          style={({ pressed }) => [styles.mode, mode === value && styles.modeSelected, pressed && styles.pressed]}
        >
          <Text style={[styles.modeLabel, mode === value && styles.modeLabelSelected]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The visual map is optional: a complete, keyboard/screen-reader-friendly list
 * is always available. GPS permission is never requested. Pins are not shown
 * for public sample addresses without source-verified coordinates.
 */
export default function DirectoryMap({ places, onOpenPlace, filterSummary, onClearFilters, directoryMode }: Props) {
  const mapped = useMemo(() => placesWithVerifiedCoordinates(places), [places]);
  const region = useMemo(() => initialMapRegion(mapped), [mapped]);
  const [mode, setMode] = useState<MapDisplayMode>('list');
  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(MAP_DISPLAY_STORAGE_KEY),
      AccessibilityInfo.isScreenReaderEnabled().catch(() => false),
    ]).then(([savedMode, screenReaderEnabled]) => {
      if (mounted) setMode(resolveMapDisplayMode(savedMode, screenReaderEnabled, mapped.length > 0));
    }).catch(() => { /* The accessible list is already available. */ });
    return () => { mounted = false; };
  }, [mapped.length]);
  const chooseMode = useCallback((nextMode: MapDisplayMode) => {
    setMode(nextMode);
    AsyncStorage.setItem(MAP_DISPLAY_STORAGE_KEY, nextMode).catch(() => {});
  }, []);
  const mapRef = useRef<MapView>(null);
  const mappedIds = useMemo(() => new Set(mapped.map(p => p.id)), [mapped]);

  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Explore locations</Text>
        <Text style={styles.helper}>{places.length} results · {mapped.length} verified map pins</Text>
        <Text style={styles.sourceStatus}>{directoryMode === 'live' ? 'Live directory feed' :
          directoryMode === 'stale' ? 'Connection lost: these listings may now be outdated or withdrawn' :
          'Offline prototype: sample records, not a current directory'}</Text>
        <Text style={styles.helper}>{filterSummary}</Text>
        <ModeSwitch mode={mode} setMode={chooseMode} />
        {filterSummary !== 'All places' && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear all directory search filters"
            onPress={onClearFilters} style={styles.clear}>
            <Text style={styles.clearText}>Clear search filters</Text>
          </Pressable>
        )}
      </View>
      {mode === 'map' && (
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            key={mapped.map(p => p.id + ':' + p.coordinates.latitude + ':' + p.coordinates.longitude).join('|') || 'empty-map'}
            style={styles.map}
            initialRegion={region}
            mapType="standard"
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation={false}
            showsMyLocationButton={false}
            accessibilityLabel={'Map showing ' + mapped.length + ' verified location pins. An accessible place list appears below.'}
          >
            {mapped.map(place => (
              <Marker
                key={place.id}
                coordinate={{ latitude: place.coordinates.latitude, longitude: place.coordinates.longitude }}
                title={place.name}
                description={place.address}
                onCalloutPress={() => onOpenPlace(place.id)}
              />
            ))}
          </MapView>
          {mapped.length > 0 && (
            <Pressable style={({ pressed }) => [styles.resetMap, pressed && styles.pressed]}
              accessibilityRole="button" accessibilityLabel="Reset map to show all verified pins"
              onPress={() => mapRef.current?.animateToRegion(region, 300)}>
              <Text style={styles.resetText}>Reset map</Text>
            </Pressable>
          )}
        </View>
      )}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {mapped.length === 0 && places.length > 0 && (
          <View style={styles.notice}>
            <Text accessibilityRole="header" style={styles.noticeTitle}>Address listings are available, but verified pins are not yet.</Text>
            <Text style={styles.helper}>These listings do not include source-verified coordinates. We will not guess pin locations. Select a venue below to view its notes or open directions.</Text>
          </View>
        )}
        <Text accessibilityRole="header" style={styles.section}>Accessible location list</Text>
        {places.length === 0 && (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>No matching locations</Text>
            <Text style={styles.helper}>Return to Explore to adjust your search, or clear active filters.</Text>
          </View>
        )}
        {places.map(place => (
          <View key={place.id} style={styles.place}>
            <Text accessibilityRole="header" style={styles.placeTitle}>{place.name}</Text>
            <Text style={styles.helper}>{place.city}, {place.state} · {place.type}</Text>
            <Text style={styles.helper}>{mappedIds.has(place.id) ? 'Source-verified map pin available' : 'Address available; map pin awaiting verification'}</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button"
                accessibilityLabel={'Read accessibility details for ' + place.name}
                onPress={() => onOpenPlace(place.id)}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
                <Text style={styles.primaryText}>View details</Text>
              </Pressable>
              <Pressable accessibilityRole="button"
                accessibilityLabel={'Open directions to ' + place.name}
                onPress={() => { void openDirections(place); }}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
                <Text style={styles.secondaryText}>Directions ↗</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <Text style={styles.disclaimer}>Directory notes and map pin presence do not establish accessibility suitability or legal compliance. Contact each venue to confirm your requirements. This app does not use your GPS location.</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8F8' },
  heading: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, gap: 6 },
  title: { color: theme.ink, fontSize: 26, lineHeight: 33, fontWeight: '900' },
  helper: { color: theme.muted, fontSize: 14, lineHeight: 21 },
  sourceStatus: { color: theme.teal, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  modes: { flexDirection: 'row', gap: 10, marginTop: 9, marginBottom: 5 },
  mode: { flex: 1, minHeight: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 8 },
  modeSelected: { backgroundColor: theme.navy, borderColor: theme.navy },
  modeLabel: { fontSize: 14, fontWeight: '800', color: theme.ink, textAlign: 'center' },
  modeLabelSelected: { color: '#FFFFFF' },
  mapWrapper: { position: 'relative' },
  map: { width: '100%', height: 232, backgroundColor: '#E3ECED' },
  resetMap: { position: 'absolute', right: 12, bottom: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, minHeight: 44, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  resetText: { fontSize: 15, fontWeight: '800', color: theme.navy },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 26 },
  section: { color: theme.ink, fontSize: 19, lineHeight: 26, fontWeight: '800', marginVertical: 5 },
  notice: { borderRadius: 14, borderColor: '#B6D0D0', borderWidth: 1, backgroundColor: '#FFFFFF', padding: 14, gap: 7 },
  noticeTitle: { color: theme.ink, fontSize: 16, lineHeight: 23, fontWeight: '800' },
  place: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: theme.border, gap: 7, padding: 15 },
  placeTitle: { color: theme.ink, fontSize: 17, lineHeight: 24, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  primary: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.teal, borderRadius: 10, paddingHorizontal: 8 },
  primaryText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  secondary: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: theme.teal, backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 8 },
  secondaryText: { fontSize: 14, fontWeight: '800', color: theme.navy },
  clear: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderColor: theme.teal, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  clearText: { color: theme.teal, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.7 },
  disclaimer: { color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 9 },
});
