import { Colors } from '@/constants/theme';
import { hasCompletedOnboarding } from '@/utils/storage';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [appIsReady, setAppIsReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Load custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Check if onboarding is complete
        const hasSeenOnboarding = await hasCompletedOnboarding();
        setOnboardingComplete(hasSeenOnboarding);
      } catch (e) {
        console.warn('Error loading app data:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (fontError) {
      console.error('Error loading fonts:', fontError);
      throw fontError;
    }
  }, [fontError]);

  useEffect(() => {
    // When fonts are loaded and app is ready, hide splash screen
    if (fontsLoaded && appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appIsReady]);

  useEffect(() => {
    // Handle initial routing based on onboarding status
    if (fontsLoaded && appIsReady) {
      const inOnboarding = segments[0] === 'onboarding';

      if (!onboardingComplete && !inOnboarding) {
        // User hasn't completed onboarding, redirect to onboarding
        router.replace('/onboarding');
      } else if (onboardingComplete && inOnboarding) {
        // User has completed onboarding but is on onboarding screen, redirect to home
        router.replace('/(tabs)');
      }
    }
  }, [fontsLoaded, appIsReady, onboardingComplete, segments]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded || !appIsReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontFamily: 'Amiri-Bold',
            fontSize: 20,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: Colors.background,
          },
          animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="onboarding/index"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
