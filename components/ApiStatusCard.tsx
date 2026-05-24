import { StyleSheet, Text, View } from 'react-native';
import type { ApiStatus } from '../lib/apiClient';

interface Props {
  status: ApiStatus;
}

const STATUS_CONFIG: Record<ApiStatus, { color: string; label: string; sublabel?: string }> = {
  checking:     { color: '#8E8E93', label: 'Lili is waking up…' },
  connected:    { color: '#30D158', label: 'Lili is Online', sublabel: 'All signals operational' },
  unavailable:  { color: '#FF9F0A', label: 'Running on local signals', sublabel: 'Live data unavailable — simulation mode active' },
  unauthorized: { color: '#FF3B30', label: 'Signal key required', sublabel: 'Configure your API key to connect Lili' },
};

export default function ApiStatusCard({ status }: Props) {
  const { color, label, sublabel } = STATUS_CONFIG[status];

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  sublabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});
