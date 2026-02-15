import { Colors } from '@/constants/theme';
import { hasCompletedOnboarding, setOnboardingComplete as markOnboardingComplete } from '@/utils/storage';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Auth Context for Onboarding/Session
const AuthContext = createContext<{
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  isLoading: boolean;
}>({
  onboardingComplete: false,
  completeOnboarding: async () => { },
  isLoading: true,
});

export const useSession = () => useContext(AuthContext);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}

function SessionProvider({ children }: { children: React.ReactNode }) {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await hasCompletedOnboarding();
        setOnboardingComplete(status);
      } catch (e) {
        console.warn('Error checking onboarding status:', e);
      } finally {
        setIsLoading(false);
      }
    }
    checkStatus();
  }, []);

  const completeOnboarding = async () => {
    try {
      await markOnboardingComplete();
      setOnboardingComplete(true);
    } catch (e) {
      console.error('Error marking onboarding complete:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ onboardingComplete, completeOnboarding, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

function AppContent() {
  const router = useRouter();
  const segments = useSegments();
  const { onboardingComplete, isLoading } = useSession();

  // Load custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'Amiri-Regular': require('../assets/fonts/Amiri-Regular.ttf'),
    'Amiri-Bold': require('../assets/fonts/Amiri-Bold.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      console.error('Error loading fonts:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  useEffect(() => {
    // Handle initial routing based on onboarding status
    if (fontsLoaded && !isLoading) {
      const inOnboarding = segments[0] === 'onboarding';
      const atRoot = (segments as string[]).length === 0;

      if (!onboardingComplete && !inOnboarding) {
        // User hasn't completed onboarding, redirect to onboarding
        router.replace('/onboarding');
      } else if (onboardingComplete && (inOnboarding || atRoot)) {
        // User has completed onboarding, redirect to home if on onboarding or at root
        router.replace('/(tabs)');
      }
    }
  }, [fontsLoaded, isLoading, onboardingComplete, segments]);

  // Don't render anything until fonts are loaded
  if (!fontsLoaded || isLoading) {
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
