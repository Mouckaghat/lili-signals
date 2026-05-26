import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StadiumMap from '../components/StadiumMap';
import {
  ATMOSPHERE_COLOR,
  STADIUMS,
  type StadiumInfo,
} from '../lib/stadiumData';
import { STADIUM_IDENTITY_I18N } from '../lib/stadiumIdentityI18n';
import FeatureIntro from '../components/FeatureIntro';
import { playerByPath } from '../lib/playerXI';
import { useLanguage } from '../contexts/LanguageContext';

// ─── Design tokens ────────────────────────────────────────────────────────────

const D = {
  bg:          '#070B14',
  surface:     '#0C1428',
  card:        '#0F1C38',
  cardBorder:  'rgba(80,140,255,0.11)',
  blue:        '#4A9EFF',
  blueDim:     'rgba(74,158,255,0.15)',
  orange:      '#FF7B35',
  text1:       '#EEF2FF',
  text2:       '#7A90B8',
  text3:       '#374F7A',
  green:       '#34D399',
  separator:   'rgba(80,140,255,0.18)',
};

type CountryFilter = 'All' | 'USA' | 'Canada' | 'Mexico';

const FILTERS: CountryFilter[] = ['Mexico', 'Canada', 'USA', 'All'];

const COUNTRY_FLAG: Record<string, string> = {
  USA: '🇺🇸',
  Canada: '🇨🇦',
  Mexico: '🇲🇽',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AtmosphereChip({ tag }: { tag: StadiumInfo['atmosphereTag'] }) {
  const color = ATMOSPHERE_COLOR[tag];
  return (
    <View style={[sc.atmosChip, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
      <View style={[sc.atmosDot, { backgroundColor: color }]} />
      <Text style={[sc.atmosText, { color }]}>{tag}</Text>
    </View>
  );
}

function CapacityBar({ capacity, max = 87523 }: { capacity: number; max?: number }) {
  const pct = capacity / max;
  const barColor = pct > 0.8 ? D.orange : pct > 0.6 ? D.blue : D.green;
  return (
    <View style={sc.capRow}>
      <View style={sc.capTrack}>
        <View
          style={[
            sc.capFill,
            { width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={sc.capLabel}>{(capacity / 1000).toFixed(1)}k</Text>
    </View>
  );
}

function GroupPill({ group }: { group: string }) {
  return (
    <View style={sc.groupPill}>
      <Text style={sc.groupText}>Grp {group}</Text>
    </View>
  );
}

// ─── Featured card (large, hero) ─────────────────────────────────────────────

function FeaturedCard({ stadium }: { stadium: StadiumInfo }) {
  const { i18n, lang } = useLanguage();
  const acColor = ATMOSPHERE_COLOR[stadium.atmosphereTag];
  return (
    <View style={[sc.featuredCard, { borderColor: `${acColor}30`, shadowColor: acColor }]}>
      {/* Top bar */}
      <View style={sc.featuredTop}>
        <View>
          <Text style={sc.featuredFlag}>{stadium.flag}</Text>
          {stadium.specialMatch && (
            <View style={[sc.specialBadge, { backgroundColor: `${acColor}20`, borderColor: `${acColor}50` }]}>
              <Text style={[sc.specialText, { color: acColor }]}>
                {stadium.specialMatch === 'Final' ? '🏆 FINAL' : '⚡ OPENING'}
              </Text>
            </View>
          )}
        </View>
        <AtmosphereChip tag={stadium.atmosphereTag} />
      </View>

      {/* Name & location */}
      <Text style={sc.featuredName}>{stadium.name}</Text>
      <Text style={sc.featuredCity}>
        {stadium.city}, {stadium.state} · {stadium.country}
      </Text>

      {/* Capacity */}
      <View style={sc.featuredCapRow}>
        <Text style={sc.featuredCapLabel}>{i18n.capacityLabel.toUpperCase()}</Text>
        <Text style={[sc.featuredCapValue, { color: acColor }]}>
          {stadium.capacity.toLocaleString()}
        </Text>
      </View>
      <CapacityBar capacity={stadium.capacity} />

      {/* Identity text */}
      <Text style={sc.featuredIdentity}>{STADIUM_IDENTITY_I18N[lang][stadium.id] ?? stadium.identity}</Text>

      {/* Groups */}
      <View style={sc.groupsRow}>
        <Text style={sc.groupsLabel}>{i18n.hosts}</Text>
        <View style={sc.groupsList}>
          {stadium.groups.map((g) => <GroupPill key={g} group={g} />)}
        </View>
      </View>

      {/* Pressure */}
      <View style={sc.presMeter}>
        <Text style={sc.presLabel}>{i18n.pressureIndex}</Text>
        <View style={sc.presBarRow}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={i}
              style={[
                sc.presSegment,
                i < stadium.pressureIndex && {
                  backgroundColor:
                    i >= 8 ? D.orange : i >= 6 ? '#FFD60A' : acColor,
                },
              ]}
            />
          ))}
          <Text style={[sc.presValue, { color: acColor }]}>{stadium.pressureIndex}/10</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Compact list card ────────────────────────────────────────────────────────

function StadiumCard({
  stadium,
  isFav,
  onToggleFav,
  onSelect,
  isSelected,
}: {
  stadium: StadiumInfo;
  isFav: boolean;
  onToggleFav: () => void;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const { i18n, lang } = useLanguage();
  const acColor = ATMOSPHERE_COLOR[stadium.atmosphereTag];
  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.75}
      style={[
        sc.card,
        isSelected && { borderColor: acColor, shadowColor: acColor, shadowOpacity: 0.25 },
      ]}
    >
      {/* ── Compact header row ── */}
      <View style={sc.cardRow}>
        <View style={sc.cardLeft}>
          <Text style={sc.cardFlag}>{stadium.flag}</Text>
          {stadium.specialMatch && (
            <Text style={sc.cardSpecialIcon}>
              {stadium.specialMatch === 'Final' ? '🏆' : '⚡'}
            </Text>
          )}
        </View>

        <View style={sc.cardCenter}>
          <View style={sc.cardNameRow}>
            <Text style={sc.cardName} numberOfLines={1}>{stadium.shortName}</Text>
            <AtmosphereChip tag={stadium.atmosphereTag} />
          </View>
          <Text style={sc.cardCity}>{stadium.city} · {stadium.country}</Text>
          <CapacityBar capacity={stadium.capacity} />
          <View style={sc.cardGroupsRow}>
            {stadium.groups.slice(0, 5).map((g) => <GroupPill key={g} group={g} />)}
            {stadium.groups.length > 5 && (
              <Text style={sc.cardMoreGroups}>+{stadium.groups.length - 5}</Text>
            )}
          </View>
        </View>

        <View style={sc.cardRight}>
          <TouchableOpacity onPress={onToggleFav} hitSlop={12} style={sc.favBtn}>
            <Text style={[sc.favIcon, isFav && sc.favActive]}>{isFav ? '♥' : '♡'}</Text>
          </TouchableOpacity>
          <Text style={[sc.cardPressure, { color: stadium.pressureIndex >= 8 ? D.orange : D.text3 }]}>
            {stadium.pressureIndex}/10
          </Text>
          <Text style={sc.cardPressureLabel}>{i18n.pressure}</Text>
        </View>
      </View>

      {/* ── Expanded detail ── */}
      {isSelected && (
        <View style={[sc.expanded, { borderTopColor: `${acColor}25` }]}>

          {/* Special match badge */}
          {stadium.specialMatch && (
            <View style={[sc.specialBadge, { backgroundColor: `${acColor}20`, borderColor: `${acColor}50`, alignSelf: 'flex-start' }]}>
              <Text style={[sc.specialText, { color: acColor }]}>
                {stadium.specialMatch === 'Final' ? '🏆 FINAL' : '⚡ OPENING MATCH'}
              </Text>
            </View>
          )}

          {/* Meta row: opened, surface, full capacity */}
          <View style={sc.expandedMeta}>
            <View style={sc.expandedMetaCell}>
              <Text style={sc.expandedMetaValue}>{stadium.opened}</Text>
              <Text style={sc.expandedMetaLabel}>{i18n.opened}</Text>
            </View>
            <View style={sc.expandedMetaDivider} />
            <View style={sc.expandedMetaCell}>
              <Text style={sc.expandedMetaValue}>{stadium.surface}</Text>
              <Text style={sc.expandedMetaLabel}>{i18n.surface}</Text>
            </View>
            <View style={sc.expandedMetaDivider} />
            <View style={sc.expandedMetaCell}>
              <Text style={[sc.expandedMetaValue, { color: acColor }]}>
                {stadium.capacity.toLocaleString()}
              </Text>
              <Text style={sc.expandedMetaLabel}>{i18n.capacityLabel.toUpperCase()}</Text>
            </View>
          </View>

          {/* All groups */}
          <View style={sc.expandedGroupsRow}>
            <Text style={sc.expandedGroupsLabel}>{i18n.hosts}</Text>
            <View style={sc.groupsList}>
              {stadium.groups.map((g) => <GroupPill key={g} group={g} />)}
            </View>
          </View>

          {/* Pressure meter */}
          <View style={sc.expandedPressure}>
            <Text style={sc.presLabel}>{i18n.pressureIndex}</Text>
            <View style={sc.presBarRow}>
              {Array.from({ length: 10 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    sc.presSegment,
                    i < stadium.pressureIndex && {
                      backgroundColor: i >= 8 ? D.orange : i >= 6 ? '#FFD60A' : acColor,
                    },
                  ]}
                />
              ))}
              <Text style={[sc.presValue, { color: acColor }]}>{stadium.pressureIndex}/10</Text>
            </View>
          </View>

          {/* OpenStreetMap */}
          <View style={sc.mapContainer}>
            <StadiumMap
              uri={`https://www.openstreetmap.org/export/embed.html?bbox=${stadium.coords[1] - 0.005},${stadium.coords[0] - 0.004},${stadium.coords[1] + 0.005},${stadium.coords[0] + 0.004}&layer=mapnik&marker=${stadium.coords[0]},${stadium.coords[1]}`}
            />
          </View>

          {/* Lili intelligence */}
          <View style={[sc.expandedInsight, { borderLeftColor: acColor }]}>
            <View style={sc.insightHeader}>
              <Image source={require('../assets/blue_lobster.png')} style={sc.lobsterIcon as any} resizeMode="contain" />
              <Text style={sc.insightTitle}>{i18n.liliStadiumIntel}</Text>
            </View>
            <Text style={sc.insightText}>{STADIUM_IDENTITY_I18N[lang][stadium.id] ?? stadium.identity}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Lili stadium insight ─────────────────────────────────────────────────────

function LiliStadiumInsight({ stadium }: { stadium: StadiumInfo }) {
  const { i18n, lang } = useLanguage();
  return (
    <View style={[sc.insightBox, { borderLeftColor: ATMOSPHERE_COLOR[stadium.atmosphereTag] }]}>
      <View style={sc.insightHeader}>
        <Image
          source={require('../assets/blue_lobster.png')}
          style={sc.lobsterIcon as any}
          resizeMode="contain"
        />
        <Text style={sc.insightTitle}>{i18n.liliStadiumIntel}</Text>
      </View>
      <Text style={sc.insightSubject}>{stadium.name}</Text>
      <Text style={sc.insightText}>{STADIUM_IDENTITY_I18N[lang][stadium.id] ?? stadium.identity}</Text>
    </View>
  );
}

// ─── Comparison bar (all stadiums by capacity) ───────────────────────────────

function CapacityComparison({ stadiums }: { stadiums: StadiumInfo[] }) {
  const { i18n } = useLanguage();
  const sorted = [...stadiums].sort((a, b) => b.capacity - a.capacity);
  const max = sorted[0]?.capacity ?? 87523;
  return (
    <View style={sc.comparisonCard}>
      <Text style={sc.comparisonTitle}>{i18n.capacityComparison}</Text>
      {sorted.map((s) => {
        const pct = s.capacity / max;
        const color = pct > 0.85 ? D.orange : pct > 0.7 ? D.blue : D.green;
        return (
          <View key={s.id} style={sc.compRow}>
            <Text style={sc.compName} numberOfLines={1}>{s.shortName}</Text>
            <View style={sc.compBarWrap}>
              <View style={[sc.compBar, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={[sc.compCap, { color }]}>{(s.capacity / 1000).toFixed(0)}k</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StadiumIntelligenceScreen() {
  const [launched, setLaunched] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [filter, setFilter]           = useState<CountryFilter>('Mexico');
  const [favourites, setFavourites]   = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId]   = useState<string>('');

  const filteredStadiums = filter === 'All'
    ? STADIUMS
    : STADIUMS.filter((s) => s.country === filter);

  const handleFilterChange = useCallback((f: CountryFilter) => {
    setFilter(f);
    setSelectedId('');
  }, []);

  const toggleFav = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Stats — reactive to current filter
  const totalCapacity = filteredStadiums.reduce((a, s) => a + s.capacity, 0);
  const avgPressure   = Math.round(filteredStadiums.reduce((a, s) => a + s.pressureIndex, 0) / filteredStadiums.length * 10) / 10;

  const { i18n } = useLanguage();

  if (!launched) return <FeatureIntro player={playerByPath('/stadium-intelligence')!} onLaunch={() => setLaunched(true)} />;

  return (
    <View style={sc.root}>
      {/* ── Fixed header area ── */}
      <View style={[sc.fixedHeader, { paddingTop: insets.top + 8 }]}>

        {/* Screen header */}
        <View style={sc.screenHeader}>
          <Text style={sc.screenTitle}>{i18n.titleStadium}</Text>
          <Text style={sc.screenSub}>WC 2026 · 15 Venues · USA · Canada · Mexico</Text>
        </View>

        {/* Global stats strip */}
        <View style={sc.statsStrip}>
          <View style={sc.statCell}>
            <Text style={sc.statValue}>{filteredStadiums.length}</Text>
            <Text style={sc.statLabel}>{i18n.venues}</Text>
          </View>
          <View style={sc.statDivider} />
          <View style={sc.statCell}>
            <Text style={sc.statValue}>{(totalCapacity / 1000).toFixed(0)}k</Text>
            <Text style={sc.statLabel}>{i18n.totalSeats}</Text>
          </View>
          <View style={sc.statDivider} />
          <View style={sc.statCell}>
            <Text style={[sc.statValue, { color: D.orange }]}>{avgPressure}</Text>
            <Text style={sc.statLabel}>{i18n.avgPressure}</Text>
          </View>
          <View style={sc.statDivider} />
          <View style={sc.statCell}>
            <Text style={[sc.statValue, { color: D.green }]}>{favourites.size}</Text>
            <Text style={sc.statLabel}>{i18n.favourites.toUpperCase()}</Text>
          </View>
        </View>

        {/* Country filter */}
        <View style={sc.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => handleFilterChange(f)}
              style={[
                sc.filterPill,
                filter === f && { borderColor: D.blue, backgroundColor: D.blueDim },
              ]}
            >
              {f !== 'All' && <Text style={sc.filterFlag}>{COUNTRY_FLAG[f]}</Text>}
              <Text style={[sc.filterText, filter === f && { color: D.blue, fontWeight: '700' }]}>
                {f === 'All' ? i18n.all : f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capacity comparison — fixed, does not scroll */}
        <CapacityComparison stadiums={filteredStadiums} />
      </View>

      {/* ── Scrollable stadium list ── */}
      <ScrollView
        style={sc.scroll}
        contentContainerStyle={[sc.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={sc.listWrap}>
          {filteredStadiums.map((s) => (
            <StadiumCard
              key={s.id}
              stadium={s}
              isFav={favourites.has(s.id)}
              onToggleFav={() => toggleFav(s.id)}
              onSelect={() => setSelectedId((prev) => prev === s.id ? '' : s.id)}
              isSelected={s.id === selectedId}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  fixedHeader: { paddingHorizontal: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

  // ── Screen header
  screenHeader: { marginBottom: 12 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: D.text1, letterSpacing: -0.4 },
  screenSub:   { fontSize: 12, color: D.text2, marginTop: 2 },

  // ── Stats strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: D.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.cardBorder,
    marginBottom: 16,
    paddingVertical: 14,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: D.separator },
  statValue: { fontSize: 18, fontWeight: '700', color: D.blue },
  statLabel: { fontSize: 8, color: D.text3, fontWeight: '600', letterSpacing: 0.8 },

  // ── Featured card
  featuredCard: {
    backgroundColor: D.card,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featuredFlag: { fontSize: 32, marginBottom: 4 },
  specialBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  specialText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  featuredName: { fontSize: 22, fontWeight: '800', color: D.text1, letterSpacing: -0.3, marginBottom: 4 },
  featuredCity: { fontSize: 13, color: D.text2, marginBottom: 12 },
  featuredCapRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  featuredCapLabel: { fontSize: 9, color: D.text3, fontWeight: '700', letterSpacing: 1 },
  featuredCapValue: { fontSize: 14, fontWeight: '700' },
  featuredIdentity: { fontSize: 13, color: D.text2, lineHeight: 20, marginTop: 12, marginBottom: 14 },
  groupsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  groupsLabel: { fontSize: 9, color: D.text3, fontWeight: '700', letterSpacing: 1 },
  groupsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },

  // ── Pressure meter
  presMeter: { gap: 6 },
  presLabel: { fontSize: 9, color: D.text3, fontWeight: '700', letterSpacing: 1 },
  presBarRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  presSegment: {
    flex: 1,
    height: 5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  presValue: { fontSize: 12, fontWeight: '700', marginLeft: 8, width: 36 },

  // ── Atmosphere chip
  atmosChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  atmosDot: { width: 5, height: 5, borderRadius: 2.5 },
  atmosText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // ── Capacity bar
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  capFill: { height: 3, borderRadius: 2 },
  capLabel: { fontSize: 10, color: D.text3, width: 34, textAlign: 'right' },

  // ── Group pill
  groupPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(80,140,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(80,140,255,0.2)',
  },
  groupText: { fontSize: 9, color: D.blue, fontWeight: '600' },

  // ── Lili insight
  insightBox: {
    marginBottom: 16,
    backgroundColor: D.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.cardBorder,
    borderLeftWidth: 3,
    padding: 16,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lobsterIcon: { width: 28, height: 28, borderRadius: 14 },
  insightTitle: { fontSize: 11, fontWeight: '700', color: D.text2, letterSpacing: 0.3 },
  insightSubject: { fontSize: 15, fontWeight: '700', color: D.text1, marginBottom: 6 },
  insightText: { fontSize: 13, color: D.text2, lineHeight: 20 },

  // ── Filter row
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: D.cardBorder,
    backgroundColor: D.surface,
  },
  filterFlag: { fontSize: 12 },
  filterText: { fontSize: 12, color: D.text2, fontWeight: '500' },

  // ── Stadium list
  listWrap: { gap: 10, marginBottom: 16 },
  card: {
    backgroundColor: D.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.cardBorder,
    padding: 12,
    shadowColor: D.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardRow: { flexDirection: 'row', gap: 10 },
  // ── Expanded section
  expanded: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 14,
    gap: 14,
  },
  expandedMeta: { flexDirection: 'row', alignItems: 'center' },
  expandedMetaCell: { flex: 1, alignItems: 'center', gap: 2 },
  expandedMetaDivider: { width: 1, height: 28, backgroundColor: D.separator },
  expandedMetaValue: { fontSize: 13, fontWeight: '700', color: D.text2 },
  expandedMetaLabel: { fontSize: 8, color: D.text3, fontWeight: '600', letterSpacing: 0.8 },
  expandedGroupsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  expandedGroupsLabel: { fontSize: 9, color: D.text3, fontWeight: '700', letterSpacing: 1 },
  expandedPressure: { gap: 6 },
  mapContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 180,
    borderWidth: 1,
    borderColor: D.cardBorder,
  },
  map: { flex: 1 },
  expandedInsight: {
    backgroundColor: D.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: D.cardBorder,
    borderLeftWidth: 3,
    padding: 12,
    gap: 8,
  },
  cardLeft: { alignItems: 'center', justifyContent: 'center', width: 36 },
  cardFlag: { fontSize: 24 },
  cardSpecialIcon: { fontSize: 12, marginTop: 2 },
  cardCenter: { flex: 1, gap: 5 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '700', color: D.text1, flex: 1 },
  cardCity: { fontSize: 11, color: D.text3 },
  cardGroupsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  cardMoreGroups: { fontSize: 9, color: D.text3, alignSelf: 'center' },
  cardRight: { alignItems: 'center', justifyContent: 'center', gap: 4, width: 52 },
  favBtn: { padding: 4 },
  favIcon: { fontSize: 20, color: D.text3 },
  favActive: { color: '#FF3B5C' },
  cardPressure: { fontSize: 14, fontWeight: '700' },
  cardPressureLabel: { fontSize: 8, color: D.text3, letterSpacing: 0.8, fontWeight: '600' },

  // ── Capacity comparison
  comparisonCard: {
    backgroundColor: D.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: D.cardBorder,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  comparisonTitle: { fontSize: 10, color: D.text3, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compName: { fontSize: 11, color: D.text2, width: 60 },
  compBarWrap: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  compBar: { height: 4, borderRadius: 2 },
  compCap: { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right' },
});
