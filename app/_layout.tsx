import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavigationDock from '../components/BottomNavigationDock';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ProfileProvider } from '../contexts/ProfileContext';
import { KnockoutPicksProvider } from '../contexts/KnockoutPicksContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ProfileProvider>
      <KnockoutPicksProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#05080F' },
              headerTintColor: '#4A9EFF',
              headerTitleStyle: { fontWeight: '600', color: '#EEF2FF' },
              contentStyle: { backgroundColor: '#050810' },
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
            <Stack.Screen name="stadium-intelligence" options={{ title: 'Stadium Intelligence', headerShown: false }} />
            <Stack.Screen name="lili-route-intelligence" options={{ title: 'Lili Route Intelligence', headerShown: false }} />
            <Stack.Screen name="world-signals" options={{ title: 'World Signals', headerShown: false }} />
            <Stack.Screen name="alternate-timeline" options={{ title: 'Alternate Timeline', headerShown: false }} />
            <Stack.Screen name="group-drama" options={{ title: 'Group Drama Index', headerShown: false }} />
            <Stack.Screen name="match-heatmap" options={{ title: 'Match Heatmaps' }} />
            <Stack.Screen name="lili-vs-market" options={{ title: 'Lili vs The Market' }} />
            <Stack.Screen name="knockout-bracket" options={{ title: 'Road to the Final' }} />
            <Stack.Screen name="diamonds" options={{ title: 'Diamonds of the Tournament', headerShown: false }} />
          </Stack>
          <BottomNavigationDock />
        </View>
      </SafeAreaProvider>
      </KnockoutPicksProvider>
      </ProfileProvider>
    </LanguageProvider>
  );
}
