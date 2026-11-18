import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const sheet = { presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } } as const;

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_400Regular, GeistMono_500Medium });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="subject/[id]" />
        <Stack.Screen name="lecture/[id]" />
        {/* these two draw their own bottom sheet over the screen below */}
        <Stack.Screen name="block" options={sheet} />
        <Stack.Screen name="settings" options={sheet} />
      </Stack>
    </SafeAreaProvider>
  );
}
