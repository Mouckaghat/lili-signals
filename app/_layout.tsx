import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavigationDock from '../components/BottomNavigationDock';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#F5F5F7' },
            headerTintColor: '#005F8E',
            headerTitleStyle: { fontWeight: '600', color: '#1D1D1F' },
            contentStyle: { backgroundColor: '#F5F5F7' },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="journey" options={{ title: 'Team Journey' }} />
          <Stack.Screen name="lili-simulation" options={{ title: 'Play Against Lili' }} />
          <Stack.Screen name="cumulative-graph" options={{ title: 'Cumulative Graph' }} />
          <Stack.Screen name="worldcup-table" options={{ title: 'World Cup Table' }} />
          <Stack.Screen name="confederations" options={{ title: 'Confederations' }} />
          <Stack.Screen name="team-route" options={{ title: 'Team Route', headerShown: false }} />
          <Stack.Screen name="stadium-intelligence"      options={{ title: 'Stadium Intelligence',      headerShown: false }} />
          <Stack.Screen name="lili-route-intelligence" options={{ title: 'Lili Route Intelligence', headerShown: false }} />
          <Stack.Screen name="world-signals"           options={{ title: 'World Signals',           headerShown: false }} />
        </Stack>
        <BottomNavigationDock />
      </View>
    </SafeAreaProvider>
  );
}
