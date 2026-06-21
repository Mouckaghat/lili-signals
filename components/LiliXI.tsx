// Lili XI — Team of the Tournament WATCH. A pitch card showing Lili's evolving,
// explicitly NON-official best current XI (model in lib/dashboardModel). Each
// slot is a real player picked by impact + real broad role; a slot with no
// honest candidate shows "Data pending" (never fabricated). Optional favourite-
// team highlight (subtle glow).
import { StyleSheet, Text, View } from 'react-native';
import type { LiliXI as LiliXIData, LiliXIPlayer } from '../lib/dashboardModel';

const D = {
  panel:  '#0A1322',
  panel2: '#0F1C33',
  border: 'rgba(86,140,224,0.16)',
  grass:  '#0B2A1E',
  line:   'rgba(229,239,255,0.22)',
  blue:   '#2E7CFF',
  gold:   '#F2C24B',
  text1:  '#F1F5FF',
  text2:  '#8DA2C8',
  text3:  '#52668C',
};

const surnameOf = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? p[p.length - 1] : n; };

export default function LiliXI({ xi, favTeam }: { xi: LiliXIData; favTeam?: string }) {
  // Pitch rows render FWD at the top → GK at the bottom (attacking view).
  const pitchRows = [...xi.rows].reverse();
  const flat = xi.rows.flatMap((r) => r.slots);

  return (
    <View style={s.card}>
      <Text style={s.title}>🌟 LILI XI · TEAM OF THE TOURNAMENT WATCH</Text>
      <Text style={s.sub}>Lili's evolving, non-official selection — based on available tournament data. Not an official award.</Text>

      <View style={s.formRow}>
        <Text style={s.formLabel}>Lili Formation: <Text style={s.formVal}>{xi.formation}</Text></Text>
      </View>
      <Text style={s.formReason}>{xi.formationReason}</Text>

      <View style={s.pitch}>
        <View style={s.halfway} />
        <View style={s.circle} />
        {pitchRows.map((row, ri) => (
          <View key={ri} style={s.pitchRow}>
            {row.slots.map((slot, si) => <Chip key={si} slot={slot} label={row.label} favTeam={favTeam} />)}
          </View>
        ))}
      </View>

      {/* readable XI list (full names + reason) below the pitch */}
      <View style={s.list}>
        {flat.map((slot, i) => (
          <View key={i} style={[s.listRow, slot && favTeam && slot.team === favTeam && s.listRowFav]}>
            <Text style={s.listPos}>{xi.rows.flatMap((r) => r.slots.map(() => r.label))[i]}</Text>
            {slot ? (
              <>
                <Text style={s.listName} numberOfLines={1}>{slot.flag} {slot.name}</Text>
                <Text style={s.listReason} numberOfLines={1}>{slot.reason}</Text>
                <Text style={s.listImpact}>{slot.impact}</Text>
              </>
            ) : (
              <Text style={s.listPending}>Data pending</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Chip({ slot, label, favTeam }: { slot: LiliXIPlayer | null; label: string; favTeam?: string }) {
  const fav = !!slot && !!favTeam && slot.team === favTeam;
  return (
    <View style={[s.chip, fav && s.chipFav]}>
      <Text style={s.chipPos}>{label}</Text>
      {slot ? (
        <>
          <Text style={s.chipName} numberOfLines={1}>{slot.flag} {surnameOf(slot.name)}</Text>
          <Text style={s.chipImpact}>{slot.impact}</Text>
        </>
      ) : (
        <Text style={s.chipPending} numberOfLines={1}>—</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card:      { backgroundColor: D.panel, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(242,194,75,0.28)', padding: 12 },
  title:     { color: D.gold, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, marginBottom: 4 },
  sub:       { color: D.text3, fontSize: 10, fontStyle: 'italic', lineHeight: 14, marginBottom: 8 },

  formRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  formLabel: { color: D.text2, fontSize: 13, fontWeight: '700' },
  formVal:   { color: D.text1, fontSize: 14, fontWeight: '900' },
  formReason:{ color: D.text3, fontSize: 10, lineHeight: 14, marginBottom: 10 },

  pitch:     { backgroundColor: D.grass, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(120,180,255,0.28)', paddingVertical: 14, gap: 12, overflow: 'hidden' },
  halfway:   { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: D.line },
  circle:    { position: 'absolute', left: '50%', top: '50%', width: 64, height: 64, marginLeft: -32, marginTop: -32, borderRadius: 999, borderWidth: 1, borderColor: D.line },
  pitchRow:  { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', gap: 4 },

  chip:      { alignItems: 'center', minWidth: 58, maxWidth: 92, flexShrink: 1, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(4,6,13,0.55)', borderWidth: 1, borderColor: D.border },
  chipFav:   { borderColor: D.gold, backgroundColor: 'rgba(242,194,75,0.12)', shadowColor: D.gold, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  chipPos:   { color: D.text3, fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  chipName:  { color: D.text1, fontSize: 10, fontWeight: '700', marginTop: 1 },
  chipImpact:{ color: D.gold, fontSize: 11, fontWeight: '900', marginTop: 1 },
  chipPending:{ color: D.text3, fontSize: 11, fontWeight: '700', marginTop: 1 },

  list:      { marginTop: 10, gap: 1 },
  listRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: D.border },
  listRowFav:{ backgroundColor: 'rgba(242,194,75,0.10)' },
  listPos:   { color: D.text3, fontSize: 9, fontWeight: '800', width: 30 },
  listName:  { color: D.text1, fontSize: 12, fontWeight: '700', flex: 1, minWidth: 0 },
  listReason:{ color: D.text2, fontSize: 10, flexShrink: 1, textAlign: 'right' },
  listImpact:{ color: D.gold, fontSize: 12, fontWeight: '900', width: 30, textAlign: 'right' },
  listPending:{ color: D.text3, fontSize: 11, fontStyle: 'italic', flex: 1 },
});
