import { useMemo, useState } from 'react';
import {
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FED_BG, FED_COLOR, WC_TEAMS, type WCTeam } from '../lib/wcData';

interface Props {
  visible: boolean;
  selected: WCTeam | null;
  onSelect: (team: WCTeam) => void;
  onClose: () => void;
}

export default function TeamPickerModal({ visible, selected, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.toLowerCase().trim();
    return 'ABCDEFGHIJKL'.split('').map((g) => ({
      title: `Group ${g}`,
      data: WC_TEAMS.filter(
        (t) =>
          t.group === g &&
          (q === '' || t.name.toLowerCase().includes(q) || t.federation.toLowerCase().includes(q))
      ),
    })).filter((s) => s.data.length > 0);
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <Text style={s.title}>Select a team</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchWrap}>
          <TextInput
            style={s.searchInput}
            placeholder="Search team or federation…"
            placeholderTextColor="#AEAEB2"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.name}
          stickySectionHeadersEnabled
          removeClippedSubviews
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isActive = selected?.name === item.name;
            return (
              <TouchableOpacity
                style={[s.row, isActive && s.rowActive]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={s.flag}>{item.flag}</Text>
                <Text style={[s.teamName, isActive && s.teamNameActive]}>{item.name}</Text>
                <View style={[s.fedBadge, { backgroundColor: FED_BG[item.federation] }]}>
                  <Text style={[s.fedText, { color: FED_COLOR[item.federation] }]}>
                    {item.federation}
                  </Text>
                </View>
                {isActive && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.listContent}
        />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Trigger button (exported separately for convenience) ─────────────────────

interface TriggerProps {
  team: WCTeam | null;
  onPress: () => void;
  placeholder?: string;
}

export function TeamPickerTrigger({
  team,
  onPress,
  placeholder = 'Select a team',
}: TriggerProps) {
  return (
    <TouchableOpacity style={ts.trigger} onPress={onPress} activeOpacity={0.75}>
      {team ? (
        <View style={ts.selectedRow}>
          <Text style={ts.flag}>{team.flag}</Text>
          <Text style={ts.name}>{team.name}</Text>
          <View style={[ts.fedBadge, { backgroundColor: FED_BG[team.federation] }]}>
            <Text style={[ts.fedText, { color: FED_COLOR[team.federation] }]}>
              {team.federation}
            </Text>
          </View>
          <Text style={ts.chevron}>›</Text>
        </View>
      ) : (
        <View style={ts.selectedRow}>
          <Text style={ts.placeholder}>{placeholder}</Text>
          <Text style={ts.chevron}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F5F5F7',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1D1D1F' },
  closeBtn: { paddingHorizontal: 4 },
  closeTxt: { fontSize: 15, fontWeight: '600', color: '#005F8E' },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F5F5F7' },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1D1D1F',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  sectionHeader: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F2F2F7',
    gap: 10,
  },
  rowActive: { backgroundColor: '#EEF4FA' },
  flag: { fontSize: 22 },
  teamName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#1D1D1F' },
  teamNameActive: { color: '#005F8E', fontWeight: '600' },
  fedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fedText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  check: { fontSize: 15, color: '#005F8E', fontWeight: '700' },
  listContent: { paddingBottom: 32 },
});

const ts = StyleSheet.create({
  trigger: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flag: { fontSize: 24 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1D1D1F' },
  fedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fedText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  chevron: { fontSize: 20, color: '#AEAEB2', fontWeight: '300' },
  placeholder: { flex: 1, fontSize: 16, color: '#AEAEB2' },
});
