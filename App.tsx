import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Keyboard, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import seedLocations from './src/places.json';
import { ACCESS_TOPICS, VISIT_QUESTIONS, buildDirectionsUrl, filterPlaces, listCities, safeStoredFavoriteIds, safeStoredVisitPlans, topicsMentioned } from './src/directory';
import DirectoryMap from './src/DirectoryMap';
import { buildVenueQuestionMessage, visitPlanProgress } from './src/visit-plan';
import { DEMO_NOTICE, loadDirectory, reconcileDirectoryRefresh } from './src/directory-source';
import type { DirectoryResult } from './src/directory-source';
import type { Place, TopicFilter, VisitPlans, VisitQuestionId } from './src/directory';

type Tab = 'discover' | 'map' | 'saved' | 'resources';
const SAMPLE_PLACES: Place[] = seedLocations;
const STORAGE_KEY = 'rampmobile:concept:saved:v1';
const PLAN_STORAGE_KEY = 'rampmobile:concept:visit-plans:v1';
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
    Alert.alert('Link unavailable', 'This destination could not be opened. Please try your browser or maps app.');
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
  const [places, setPlaces] = useState<Place[]>(SAMPLE_PLACES);
  const [directoryMode, setDirectoryMode] = useState<DirectoryResult['mode']>('sample');
  const [directoryNotice, setDirectoryNotice] = useState(DEMO_NOTICE);
  const [directoryUpdatedAt, setDirectoryUpdatedAt] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  // A refresh can finish after initial loading; discard the older response.
  const directoryRequestId = useRef(0);
  const lastDirectory = useRef<DirectoryResult>({ places: SAMPLE_PLACES, mode: 'sample', notice: DEMO_NOTICE });
  const applyDirectory = useCallback((incoming: DirectoryResult) => {
    const next = reconcileDirectoryRefresh(lastDirectory.current, incoming);
    lastDirectory.current = next;
    setPlaces(next.places);
    setDirectoryMode(next.mode);
    setDirectoryNotice(next.notice);
    setDirectoryUpdatedAt(next.updatedAt);
  }, []);
  const CATEGORIES = useMemo(() => ['All', ...new Set(places.map(p => p.type))].sort((a,b) => a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)), [places]);
  const CITIES = useMemo(() => ['All', ...listCities(places)], [places]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [city, setCity] = useState('All');
  const [topic, setTopic] = useState<TopicFilter>('any');
  const [visitPlans, setVisitPlans] = useState<VisitPlans>({});
  const [plansReady, setPlansReady] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedReady, setSavedReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!mounted) return;
        const parsed: unknown = value ? JSON.parse(value) : [];
        setSaved(safeStoredFavoriteIds(parsed));
      })
      .catch(() => {})
      .finally(() => { if (mounted) setSavedReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (savedReady) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => {});
  }, [saved, savedReady]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(PLAN_STORAGE_KEY)
      .then(value => { if (mounted) setVisitPlans(safeStoredVisitPlans(value ? JSON.parse(value) : {})); })
      .catch(() => {})
      .finally(() => { if (mounted) setPlansReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (plansReady) AsyncStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(visitPlans)).catch(() => {});
  }, [visitPlans, plansReady]);

  useEffect(() => {
    const requestId = ++directoryRequestId.current;
    loadDirectory(process.env.EXPO_PUBLIC_RAMP_DIRECTORY_URL, SAMPLE_PLACES)
      .then(result => {
        if (requestId === directoryRequestId.current) applyDirectory(result);
      })
      .catch(() => {});
    return () => { directoryRequestId.current++; };
  }, [applyDirectory]);

  const refreshDirectory = useCallback(async () => {
    if (refreshing) return;
    const requestId = ++directoryRequestId.current;
    setRefreshing(true);
    try {
      const result = await loadDirectory(process.env.EXPO_PUBLIC_RAMP_DIRECTORY_URL, SAMPLE_PLACES);
      if (requestId === directoryRequestId.current) applyDirectory(result);
    } catch {
      Alert.alert('Directory refresh failed', 'Please try again later.');
    } finally {
      if (requestId === directoryRequestId.current) setRefreshing(false);
    }
  }, [applyDirectory, refreshing]);

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedId) { setSelectedId(null); return true; }
      if (tab !== 'discover') { setTab('discover'); return true; }
      return false;
    });
    return () => listener.remove();
  }, [selectedId, tab]);

  const toggleVisitQuestion = useCallback((placeId: string, questionId: VisitQuestionId) => {
    setVisitPlans(current => {
      const before = current[placeId] ?? [];
      return { ...current, [placeId]: before.includes(questionId)
        ? before.filter(id => id !== questionId) : [...before, questionId] };
    });
  }, []);

  const resetFilters = () => { setQuery(''); setCategory('All'); setCity('All'); setTopic('any'); };

  const toggleSaved = useCallback((id: string) => {
    setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }, []);

  const filtered = useMemo(
    () => filterPlaces(places, { query, category, city, topic }),
    [places, query, category, city, topic],
  );
  const selected = places.find(place => place.id === selectedId);
  const visible = tab === 'saved' ? places.filter(place => saved.includes(place.id)) : filtered;

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
        <Text style={s.mini}>{directoryMode === 'live' ? 'Live directory record' : directoryMode === 'stale' ? 'Potentially outdated directory record' : 'Public RAMP directory sample'} · {place.certified}</Text>
        {tab === 'saved' && (
          <Text style={s.topics}>Visit checklist: {visitPlanProgress(visitPlans[place.id] ?? []).complete} of {VISIT_QUESTIONS.length} marked</Text>
        )}
        <Text style={s.topics}>Notes mention: {topicsMentioned(place).map(id => ACCESS_TOPICS.find(t => t.id === id)?.label).filter(Boolean).join(', ') || 'See details'}</Text>
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
            <Text style={s.note}>These are public directory notes, not a guarantee of suitability. Conditions may change. Confirm your needs directly with the venue.</Text>
            <Text style={s.mini}>TOPICS MENTIONED IN THE NOTES</Text>
            <View style={s.topicWrap}>
              {topicsMentioned(selected).map(id => (
                <View key={id} style={s.topicChip}>
                  <Text style={s.topicChipText}>{ACCESS_TOPICS.find(t => t.id === id)?.label}</Text>
                </View>
              ))}
            </View>
            <Text style={s.note}>A topic label does not mean the feature is currently available or adequate.</Text>
          </View>
          <View style={s.panel}>
            <Text style={s.sectionTitle} accessibilityRole="header">My visit checklist</Text>
            <Text style={s.body}>Prepare questions to verify with the venue. A checked item records your action, not a RAMP guarantee.</Text>
            <Text style={s.mini}>{visitPlanProgress(visitPlans[selected.id] ?? []).complete} of {VISIT_QUESTIONS.length} marked</Text>
            {VISIT_QUESTIONS.map(question => {
              const checked = (visitPlans[selected.id] ?? []).includes(question.id);
              return (
                <Pressable
                  key={question.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={question.title}
                  accessibilityState={{ checked }}
                  onPress={() => toggleVisitQuestion(selected.id, question.id)}
                  style={({ pressed }) => [s.visitCheck, pressed && s.pressed]}
                >
                  <Text style={s.visitSymbol} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{checked ? '☑' : '□'}</Text>
                  <Text style={s.visitCheckText}>{question.title}</Text>
                </Pressable>
              );
            })}
            <Text style={s.note}>Your checklist stays on this device. No login, GPS or health information is required.</Text>
            {visitPlanProgress(visitPlans[selected.id] ?? []).complete > 0 && (
              <Action label="Reset this visit checklist" secondary onPress={() => {
                const placeId = selected.id;
                Alert.alert(
                  'Reset checklist?',
                  'This clears all checked questions for this place on this device. You can check them again at any time.',
                  [
                    { text: 'Keep checklist', style: 'cancel' },
                    { text: 'Reset checklist', style: 'destructive', onPress: () => {
                      setVisitPlans(current => {
                        if (!current[placeId]?.length) return current;
                        const next = { ...current };
                        delete next[placeId];
                        return next;
                      });
                    } },
                  ],
                );
              }} />
            )}
            <Action label="Share questions to ask this venue" secondary onPress={() => {
              Share.share({ message: buildVenueQuestionMessage(selected, visitPlans[selected.id] ?? []) })
                .catch(() => Alert.alert('Unable to share', 'Please try again.'));
            }} />
            <Text style={s.note}>Only the venue's public details and general unanswered questions are shared. Your saved checklist and personal data are not included.</Text>
          </View>
          <View style={s.panel}>
            <Text style={s.sectionTitle} accessibilityRole="header">Plan your visit</Text>
            <Text style={s.body}>{selected.address}</Text>
            <Action label="Open map and directions ↗" onPress={() => openExternal(buildDirectionsUrl(selected.address))} />
            <Action label="Share this place" secondary onPress={() => {
              Share.share({ message: [selected.name, selected.address, 'RAMP directory: ' + selected.source].join(' | ') })
                .catch(() => Alert.alert('Unable to share', 'Please try again.'));
            }} />
            <Action label="Open source directory ↗" secondary onPress={() => openExternal(selected.source)} />
            <Action label="Report changed or incorrect accessibility information ↗" secondary onPress={() => openExternal(ROOT + '/contact-us/')} />
            <Text style={s.note}>This opens RAMP's official contact form. Include the location name when reporting a change. No report is submitted by this app.</Text>
            <Action label={saved.includes(selected.id) ? 'Remove from saved' : 'Save this place'} secondary onPress={() => toggleSaved(selected.id)} />
          </View>
        </ScrollView>
      ) : (
        <>
          {tab === 'map' ? (
            <DirectoryMap
              places={filtered}
              onOpenPlace={setSelectedId}
              onClearFilters={resetFilters}
              directoryMode={directoryMode}
              filterSummary={query || category !== 'All' || city !== 'All' || topic !== 'any'
                ? 'Map follows your Explore search and filters'
                : 'All places'}
            />
          ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            {tab === 'discover' && (
              <>
                <View style={s.sourcePanel}>
                  <Text style={s.sourceTitle}>Directory: {directoryMode === 'live' ? 'Live connection' : directoryMode === 'stale' ? 'Connection lost' : 'Offline prototype'}</Text>
                  <Text style={s.note}>{directoryNotice}{directoryUpdatedAt ? ' Last updated: ' + directoryUpdatedAt : ''}</Text>
                  <Action label={refreshing ? 'Refreshing…' : 'Refresh directory'} secondary onPress={() => { void refreshDirectory(); }} />
                </View>
              </> 
            )}
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
                {query.length > 0 && (
                  <Action label="Clear search" secondary onPress={() => setQuery('')} />
                )}
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
                <Text style={s.label} accessibilityRole="header">Filter by city</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
                  {CITIES.map(item => (
                    <Pressable key={item} accessibilityRole="button" accessibilityLabel={'City: ' + item}
                      accessibilityState={{ selected: item === city }} onPress={() => setCity(item)}
                      style={({ pressed }) => [s.filter, item === city && s.activeFilter, pressed && s.pressed]}>
                      <Text style={[s.filterLabel, item === city && s.activeFilterLabel]}>{item}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={s.label} accessibilityRole="header">Accessibility topics mentioned</Text>
                <Text style={s.note}>These filters search the public notes. They do not verify if a feature meets your needs.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
                  {([{ id: 'any', label: 'Any topic' }, ...ACCESS_TOPICS] as { id: TopicFilter; label: string }[]).map(item => (
                    <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={'Notes mention: ' + item.label}
                      accessibilityState={{ selected: topic === item.id }} onPress={() => setTopic(item.id)}
                      style={({ pressed }) => [s.filter, topic === item.id && s.activeFilter, pressed && s.pressed]}>
                      <Text style={[s.filterLabel, topic === item.id && s.activeFilterLabel]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={s.note} accessibilityLiveRegion="polite">
                  {filtered.length} {filtered.length === 1 ? 'location' : 'locations'} match your current search and filters.
                </Text>
                {(query !== '' || category !== 'All' || city !== 'All' || topic !== 'any') && (
                  <Action label="Clear all filters" secondary onPress={resetFilters} />
                )}
              </>
            )}
            {tab === 'saved' && (
              <>
                <Text style={s.pageTitle} accessibilityRole="header">Saved places</Text>
                <Text style={s.body}>Places you save are stored only on this device.</Text>
                <Text style={s.note} accessibilityLiveRegion="polite">
                  {places.filter(place => saved.includes(place.id)).length} saved places · {places.filter(place => saved.includes(place.id) && visitPlanProgress(visitPlans[place.id] ?? []).complete === VISIT_QUESTIONS.length).length} checklists completed
                </Text>
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
                    <Text style={s.sectionTitle} accessibilityRole="header">{tab === 'saved' ? 'Nothing saved yet' : directoryMode === 'live' && places.length === 0 ? 'No published places available' : 'No matches found'}</Text>
                    <Text style={s.body}>{tab === 'saved'
                      ? 'Explore the directory and save a place to plan your next visit.'
                      : directoryMode === 'live' && places.length === 0
                        ? 'The current directory source returned no published locations. Sample places will not be substituted for withdrawn or unavailable listings.'
                        : 'Try changing your search or clearing the filters to see more locations.'}</Text>
                    {!(tab === 'discover' && directoryMode === 'live' && places.length === 0) && (
                      <Action label={tab === 'saved' ? 'Explore places' : 'Clear filters'} onPress={() => { setTab('discover'); resetFilters(); }} />
                    )}
                    {tab === 'discover' && directoryMode === 'live' && places.length === 0 && (
                      <Action label={refreshing ? 'Refreshing…' : 'Refresh directory'} secondary onPress={() => { void refreshDirectory(); }} />
                    )}
                  </View>
                )}
                <Text style={s.note}>{directoryMode === 'live' ? 'Live directory response.' : directoryMode === 'stale' ? 'CONNECTION LOST: previously loaded records may now be outdated or withdrawn.' : 'Preview only: offline sample listings, not the complete RAMP directory.'} {places.length} records shown.</Text>
              </>
            )}
            {tab === 'resources' && (
              <>
                <Text style={s.pageTitle} accessibilityRole="header">Resources</Text>
                <Text style={s.body}>Learn about RAMP and explore the organization's current accessibility services.</Text>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Understanding the RAMP Stamp</Text>
                  <Text style={s.body}>The RAMP Stamp recognizes a location's work toward accessibility and inclusion. It does not guarantee ADA compliance or that every visitor's needs will be met.</Text>
                  <Text style={s.body}>The stamp relates to a particular location. Conditions can change, so contact a venue before visiting when you have specific access questions.</Text>
                  <Action label="Read RAMP's official FAQs ↗" secondary onPress={() => openExternal(ROOT + '/faqs/')} />
                </View>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Self-assessment</Text>
                  <Text style={s.body}>RAMP's self-assessment helps organizations think about access before a Roll Through. It is optional and does not establish certification or legal compliance.</Text>
                  <Action label="Open RAMP self-assessment ↗" onPress={() => openExternal(ROOT + '/self-assessment/')} />
                </View>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Schedule a Roll Through</Text>
                  <Text style={s.body}>Request an accessibility visit using the official RAMP website.</Text>
                  <Action label="Open Roll Through request ↗" onPress={() => openExternal(ROOT + '/schedule-a-roll-through/')} />
                </View>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Report a directory change</Text>
                  <Text style={s.body}>Accessibility conditions, location details, and RAMP Stamp status can change. Contact RAMP if a listing needs attention.</Text>
                  <Action label="Open RAMP's official contact form ↗" secondary onPress={() => openExternal(ROOT + '/contact-us/')} />
                </View>
                <View style={s.panel}>
                  <Text style={s.sectionTitle} accessibilityRole="header">Your privacy and device data</Text>
                  <Text style={s.body}>Saved places, checklist answers and your map display preference are stored on this device. This prototype does not require an account or collect precise location.</Text>
                  <Action label="Clear my saved places and checklists" secondary onPress={() => {
                    Alert.alert(
                      'Clear your device data?',
                      'This permanently clears all saved places and visit checklist answers on this device. It will not affect RAMP directory listings.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Clear device data', style: 'destructive', onPress: () => {
                          setSaved([]);
                          setVisitPlans({});
                          // Saving empty collections through existing persistence effects
                          // removes the user's app data without changing directory content.
                          Alert.alert('Device data cleared', 'Your saved places and visit checklists have been cleared.');
                        } },
                      ],
                    );
                  }} />
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
          )}
          <View style={s.tabs}>
            {([['discover','Explore'], ['map','Map'], ['saved','Saved'], ['resources','Resources']] as [Tab,string][]).map(([key,label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === key }}
                accessibilityLabel={label}
                onPress={() => { Keyboard.dismiss(); setTab(key); }}
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
  sourcePanel: { borderRadius: 16, borderColor: C.border, borderWidth: 1, backgroundColor: C.white, padding: 14, gap: 8 },
  sourceTitle: { color: C.navy, fontSize: 16, fontWeight: '900' },
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
  topics: { color: C.muted, fontWeight: '600', fontSize: 13, lineHeight: 20 },
  topicWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: { backgroundColor: C.mint, borderColor: C.border, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 8 },
  topicChipText: { color: C.navy, fontWeight: '700', fontSize: 14 },
  visitCheck: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  visitSymbol: { color: C.teal, fontSize: 28, width: 34 },
  visitCheckText: { flex: 1, color: C.ink, fontSize: 16, lineHeight: 23 },
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
