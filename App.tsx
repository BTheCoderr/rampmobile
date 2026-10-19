import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import seedLocations from './src/places.json';

type Place = {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  address: string;
  certified: string;
  accessibility: string;
  source: string;
};
type Tab = 'discover' | 'saved' | 'resources';
const LOCATIONS: Place[] = seedLocations;
const CATEGORIES = ['All', ...Array.from(new Set(LOCATIONS.map(place => place.type))).sort()];
const STORAGE_KEY = 'rampmobile:concept:saved:v1';
const ROOT = 'https://rampapproved.com';
const C = {
  background: '#F4F8F8', white: '#FFFFFF', navy: '#123648', teal: '#006D60',
  mint: '#DDF2EB', border: '#CCDEDE', muted: '#45616B', ink: '#153346',
};

async function openExternal(url: string) {
  try {
    if (!(await Linking.canOpenURL(url))) throw new Error('Unsupported URL');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Link unavailable', 'Please open the RAMP website in your browser.');
  }
}

function Action({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.action, secondary ? s.secondaryAction : s.primaryAction, pressed && s.pressed]}
    >
      <Text style={[s.actionText, secondary ? s.secondaryActionText : s.primaryActionText]}>{label}</Text>
    </Pressable>
  );
}

function Main() {
  const [tab, setTab] = useState<Tab>('discover');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [saved, setSaved] = useState<string[]>([]);
  const [savedReady, setSavedReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted) return;
        const parsed: unknown = value ? JSON.parse(value) : [];
        if (Array.isArray(parsed)) setSaved(parsed.filter((id): id is string => typeof id === 'string'));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setSavedReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (savedReady) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved, savedReady]);

  const toggleSaved = useCallback((id: string) => {
    setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }, []);

  const filtered = useMemo(() => LOCATIONS.filter(place => {
    const text = [place.name, place.type, place.city, place.address, place.accessibility].join(' ').toLowerCase();
    return (category === 'All' || category === place.type) && text.includes(query.trim().toLowerCase());
  }), [query, category]);
  const selected = LOCATIONS.find(place => place.id === selectedId);
  const visible = tab === 'saved' ? LOCATIONS.filter(place => saved.includes(place.id)) : filtered;

  function PlaceCard({ place }: { place: Place }) {
    const isSaved = saved.includes(place.id);
    return (
      <View style={s.card}>
        <View style={s.cardHeading}>
          <View style={s.grow}>
            <Text style={s.placeTitle} accessibilityRole="header">{place.name}</Text>
            <Text style={s.subtitle}>{place.city}, {place.state} · {place.type}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={(isSaved ? 'Remove ' : 'Save ') + place.name + (isSaved ? ' from saved places' : ' to saved places')}
            onPress={() => toggleSaved(place.id)}
            style={({ pressed }) => [s.favorite, pressed && s.pressed]}
          >
            <Text style={s.heart} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{isSaved ? '♥' : '♡'}</Text>
          </Pressable>
        </View>
        <Text style={s.mini}>RAMP directory listing · {place.certified}</Text>
        <Text style={s.body} numberOfLines={3}>{place.accessibility}</Text>
        <Action label="View accessibility details →" secondary onPress={() => setSelectedId(place.id)} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={s.topBar}>
        <View>
          <Text style={s.brand}>RAMP <Text style={s.brandAccent}>APPROVED</Text></Text>
          <Text style={s.subtitle}>Access belongs everywhere.</Text>
        </View>
        <View style={s.tag}><Text style={s.tagText}>CONCEPT</Text></View>
      </View>
      {selected ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to places" onPress={() => setSelectedId(null)} style={s.back}>
            <Text style={s.link}>← Back to places</Text>
          </Pressable>
          <View style={s.detailHero}>
            <Text style={s.mini}>RAMP PUBLIC DIRECTORY PROFILE</Text>
            <Text style={s.detailTitle} accessibilityRole="header">{selected.name}</Text>
            <Text style={s.subtitle}>{selected.city}, {selected.state}</Text>
            <Text style={s.mini}>Listing date: {selected.certified}</Text>
          </View>
          <View style={s.panel}>
            <Text style={s.sectionTitle} accessibilityRole="header">Accessibility details</Text>
            <Text style={s.body}>{selected.accessibility}</Text>
            <Text style={s.note}>Details may change. Confirm your specific access requirements directly with the venue before visiting.</Text>
          </View>
          <View style={s.panel}>
            <Text style={s.sectionTitle} accessibilityRole="header">Plan your visit</Text>
            <Text style={s.body}>{selected.address}</Text>
            <Action label="Get directions ↗" onPress={() => openExternal('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.address))} />
            <Action label="Open source directory ↗" secondary onPress={() => openExternal(selected.source)} />
            <Action label={saved.includes(selected.id) ? 'Remove from saved' : 'Save this place'} secondary onPress={() => toggleSaved(selected.id)} />
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            {tab === 'discover' && (
              <>
                <View style={s.hero}>
                  <Text style={s.overline}>EXPLORE ACCESSIBLE PLACES</Text>
                  <Text style={s.heroTitle} accessibilityRole="header">Find places that welcome everyone.</Text>
                  <Text style={s.heroSub}>Browse a preview of RAMP's public directory of accessible spaces.</Text>
                </View>
                <Text style={s.label}>Search places and accessibility features</Text>
                <TextInput
                  accessibilityLabel="Search locations"
                  placeholder="Try Providence, parking, or aquarium"
                  placeholderTextColor={C.muted}
                  autoCorrect={false}
                  returnKeyType="search"
                  value={query}
                  onChangeText={setQuery}
                  style={s.search}
                />
                <Text style={s.label} accessibilityRole="header">Filter by type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
                  {CATEGORIES.map(item => (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityLabel={'Filter ' + item}
                      accessibilityState={{ selected: item === category }}
                      onPress={() => setCategory(item)}
                      style={({ pressed }) => [s.filter, item === category && s.activeFilter, pressed && s.pressed]}
                    >
                      <Text style={[s.filterLabel, item === category && s.activeFilterLabel]}>{item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
            {tab === 'saved' && (
              <>
                <Text style={s.pageTitle} accessibilityRole="header">Saved places</Text>
                <Text style={s.body}>Places you save are stored only on this device.</Text>
              </>
            )}
            {tab !== 'resources' && (
              <>
                <View style={s.row}>
                  <Text style={s.sectionTitle} accessibilityRole="header">{tab === 'saved' ? 'Your places' : 'Explore locations'}</Text>
                  <Text style={s.subtitle}>{visible.length} shown</Text>
                </View>
                {visible.length ? visible.map(place => <PlaceCard key={place.id} place={place} />) : (
                  <View style={s.panel}>
                    <Text style={s.sectionTitle}>{tab === 'saved' ? 'Nothing saved yet' : 'No matches found'}</Text>
                    <Text style={s.body}>Try exploring all available sample places.</Text>
                    <Action label="Browse all places" onPress={() => { setTab('discover'); setCategory('All'); setQuery(''); }} />
                  </View>
                )}
                <Text style={s.note}>Preview only: {LOCATIONS.length} sampled public listings. Not RAMP's complete, automatically updated directory.</Text>
              </>
            )}
            {tab === 'resources' && (
              <>
                <Text style={s.pageTitle} accessibilityRole="header">Resources</Text>
                <Text style={s.body}>Learn about RAMP and explore the organization's current accessibility services.</Text>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Self-assessment</Text>
                  <Text style={s.body}>Start with RAMP's official accessibility questionnaire. This does not establish certification or legal compliance.</Text>
                  <Action label="Open RAMP self-assessment ↗" onPress={() => openExternal(ROOT + '/self-assessment/')} />
                </View>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Schedule a Roll Through</Text>
                  <Text style={s.body}>Request an accessibility visit using the official RAMP website.</Text>
                  <Action label="Open Roll Through request ↗" onPress={() => openExternal(ROOT + '/schedule-a-roll-through/')} />
                </View>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">About RAMP</Text>
                  <Text style={s.body}>Real Access Motivates Progress promotes accessible, inclusive spaces.</Text>
                  <Action label="Visit RAMP Approved ↗" secondary onPress={() => openExternal(ROOT)} />
                  <Action label="Privacy policy ↗" secondary onPress={() => openExternal(ROOT + '/privacy-policy/')} />
                </View>
                <Text style={s.note}>Independent, unofficial concept. RAMP authorization is required before publishing or using its brand officially.</Text>
              </>
            )}
          </ScrollView>
          <View style={s.tabs}>
            {([['discover','Explore'], ['saved','Saved'], ['resources','Resources']] as [Tab,string][]).map(([key,label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                accessibilityLabel={label}
                onPress={() => setTab(key)}
                style={({ pressed }) => [s.tab, tab === key && s.activeTab, pressed && s.pressed]}
              >
                <Text style={[s.tabText, tab === key && s.activeTabText]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  topBar: { backgroundColor: C.white, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: C.border, borderBottomWidth: 1 },
  brand: { fontSize: 23, fontWeight: '900', color: C.navy },
  brandAccent: { fontSize: 11, letterSpacing: 1.4, fontWeight: '900', color: C.teal },
  subtitle: { color: C.muted, fontSize: 14, lineHeight: 21 },
  tag: { backgroundColor: C.mint, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { color: C.navy, fontSize: 11, fontWeight: '800' },
  content: { gap: 13, padding: 18, paddingBottom: 36 },
  hero: { backgroundColor: C.navy, borderRadius: 22, padding: 24, gap: 12 },
  overline: { fontSize: 11, letterSpacing: 1.4, fontWeight: '900', color: '#ADE6D9' },
  heroTitle: { fontSize: 32, lineHeight: 40, fontWeight: '900', color: C.white },
  heroSub: { fontSize: 16, lineHeight: 24, color: '#E4F1F0' },
  label: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 8 },
  search: { borderWidth: 1.5, borderColor: '#86A5A6', borderRadius: 13, backgroundColor: C.white, padding: 15, minHeight: 56, fontSize: 16, color: C.ink },
  filters: { gap: 9, paddingVertical: 5 },
  filter: { backgroundColor: C.white, borderRadius: 99, borderColor: C.border, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 18, minHeight: 48, justifyContent: 'center' },
  activeFilter: { backgroundColor: C.teal, borderColor: C.teal },
  filterLabel: { color: C.navy, fontSize: 14, fontWeight: '700' },
  activeFilterLabel: { color: C.white },
  row: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 21, lineHeight: 28, color: C.ink, fontWeight: '900' },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 17, gap: 13 },
  cardHeading: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1 },
  placeTitle: { fontSize: 21, fontWeight: '800', lineHeight: 27, color: C.ink },
  favorite: { minWidth: 48, minHeight: 48, borderRadius: 13, backgroundColor: C.background, borderColor: C.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heart: { color: C.teal, fontSize: 26 },
  mini: { color: C.teal, fontWeight: '800', fontSize: 12, lineHeight: 18 },
  body: { color: C.ink, fontSize: 16, lineHeight: 24 },
  action: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 13 },
  primaryAction: { backgroundColor: C.teal },
  secondaryAction: { borderWidth: 1.5, borderColor: C.teal, backgroundColor: C.white },
  actionText: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  primaryActionText: { color: C.white },
  secondaryActionText: { color: C.navy },
  panel: { padding: 20, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, gap: 13 },
  pageTitle: { fontSize: 30, lineHeight: 37, fontWeight: '900', color: C.ink },
  note: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 8 },
  back: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center' },
  link: { color: C.teal, fontSize: 16, fontWeight: '800' },
  detailHero: { backgroundColor: C.mint, padding: 22, borderRadius: 20, gap: 11 },
  detailTitle: { color: C.navy, fontWeight: '900', fontSize: 30, lineHeight: 38 },
  tabs: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  tab: { flex: 1, minHeight: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activeTab: { backgroundColor: C.mint },
  tabText: { fontSize: 15, fontWeight: '800', color: C.muted },
  activeTabText: { color: C.navy },
  pressed: { opacity: 0.7 },
});
