import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { initialMapRegion } from './map-model';
import { placesWithVerifiedCoordinates } from './directory';
import type { Place } from './directory';

type Props = {
  places: readonly Place[];
  onOpenPlace: (id: string) => void;
  filterSummary: string;
  onClearFilters: () => void;
};

/**
 * Map never asks for the user's GPS location.
 * A full textual list remains available for VoiceOver/TalkBack and users who
 * cannot interact with the visual map. Unverified places are not pinned.
 */
export default function DirectoryMap({ places, onOpenPlace, filterSummary, onClearFilters }: Props) {
  const mapped = useMemo(() => placesWithVerifiedCoordinates(places), [places]);
  const region = useMemo(() => initialMapRegion(mapped), [mapped]);
  return (
    <View style={styles.screen}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>Explore the map</Text>
        <Text style={styles.helper}>{mapped.length} mapped places · {places.length} listings shown</Text>
        <Text style={styles.helper}>{filterSummary}</Text>
        {filterSummary !== 'All places' && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear directory filters"
            onPress={onClearFilters} style={styles.clear}>
            <Text style={styles.clearText}>Clear filters</Text>
          </Pressable>
        )}
      </View>
      <MapView
        key={mapped.map(place => place.id + ':' + place.coordinates.latitude + ':' + place.coordinates.longitude).join('|') || 'empty-map'}
        style={styles.map}
        initialRegion={region}
        mapType="standard"
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        accessibilityLabel={'Map of locations. ' + mapped.length + ' verified pins. Use the location list below for an accessible alternative.'}
      >
        {mapped.map(place => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.coordinates.latitude, longitude: place.coordinates.longitude }}
            title={place.name}
            description={place.address}
            onPress={() => onOpenPlace(place.id)}
          />
        ))}
      </MapView>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        {mapped.length === 0 && (
          <View style={styles.notice} accessibilityRole="text">
            <Text style={styles.noticeTitle}>Verified map pins aren't available yet.</Text>
            <Text style={styles.helper}>The current sample listings include addresses but no verified coordinates. We won't guess where the pins belong. Use the directory list below to open details and directions.</Text>
          </View>
        )}
        <Text accessibilityRole="header" style={styles.section}>Locations as an accessible list</Text>
        {!places.length && <Text style={styles.helper}>No locations match the active directory filters.</Text>}
        {places.map(place => {
          const pinned = mapped.some(item => item.id === place.id);
          return (
            <Pressable key={place.id} accessibilityRole="button"
              accessibilityLabel={'View ' + place.name + ', ' + place.city + (pinned ? ', on map' : ', address not yet mapped')}
              onPress={() => onOpenPlace(place.id)} style={({ pressed }) => [styles.place, pressed && styles.pressed]}>
              <View style={styles.texts}>
                <Text style={styles.placeTitle}>{place.name}</Text>
                <Text style={styles.helper}>{place.city}, {place.state} · {place.type}</Text>
                <Text style={styles.helper}>{pinned ? 'Verified pin available' : 'Address listed · pin awaiting verification'}</Text>
              </View>
              <Text style={styles.arrow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">›</Text>
            </Pressable>
          );
        })}
        <Text style={styles.disclaimer}>Map pin presence does not guarantee suitability, accessible features, or compliance. Confirm directly with each venue.</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8F8' },
  heading: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, gap: 5 },
  title: { color: '#153346', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  helper: { color: '#45616B', fontSize: 14, lineHeight: 21 },
  map: { width: '100%', height: 282, backgroundColor: '#E3ECED' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 10, paddingBottom: 24 },
  section: { color: '#153346', fontSize: 19, fontWeight: '800', marginVertical: 5 },
  notice: { borderRadius: 14, borderColor: '#B6D0D0', borderWidth: 1, backgroundColor: '#FFFFFF', padding: 14, gap: 6 },
  noticeTitle: { color: '#153346', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  place: { minHeight: 75, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#CCDEDE', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  texts: { flex: 1, gap: 2 },
  placeTitle: { color: '#153346', fontSize: 16, lineHeight: 23, fontWeight: '800' },
  arrow: { color: '#006D60', fontSize: 30 },
  clear: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderColor: '#006D60', borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  clearText: { color: '#006D60', fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.7 },
  disclaimer: { color: '#45616B', fontSize: 12, lineHeight: 19 },
});
