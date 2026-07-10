// FORCE_RELOAD_TIMESTAMP=639189464631202487
// FORCE_RELOAD_TIMESTAMP=639189457796044634
// FORCE_RELOAD_TIMESTAMP=639189403304411124
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet as RNStyleSheet } from 'react-native';
import 'react-native-reanimated';
import './global.css';
import { AuthProvider } from '../context/auth-context';
import { useColorScheme } from '@/components/useColorScheme';
import { StyleSheet } from 'nativewind';
import { registerForPushNotificationsAsync } from '../lib/notificationService';

// NativeWind v4 Web dark mode workaround: ensure the runtime detects class-based dark mode
// Only apply on web and with extra safety checks to prevent startup crashes on mobile
if (Platform.OS === 'web') {
  const stylesheetAny = StyleSheet as any;
  if (stylesheetAny && typeof stylesheetAny.getFlag === 'function') {
    const originalGetFlag = stylesheetAny.getFlag;
    try {
      stylesheetAny.getFlag = (name: string) => {
        if (name === 'darkMode') {
          return 'class dark';
        }
        return originalGetFlag.call(stylesheetAny, name);
      };
    } catch (e) {
      console.warn('NativeWind: Could not patch StyleSheet.getFlag', e);
    }
  }
}
export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { Appearance } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import * as Device from 'expo-device';

let ScreenOrientation: any;
try {
  ScreenOrientation = require('expo-screen-orientation');
} catch (e) {
  console.warn('ScreenOrientation module is not available');
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { colorScheme: nwColorScheme, setColorScheme: setNwColorScheme } = useNativeWindColorScheme();
  
  // Manage orientation: unlock for tablets so they can rotate, lock to portrait for phones
  useEffect(() => {
    async function handleTabletOrientation() {
      if (!ScreenOrientation || !ScreenOrientation.lockAsync) return;
      try {
        const deviceType = await Device.getDeviceTypeAsync();
        if (deviceType === Device.DeviceType.TABLET) {
          await ScreenOrientation.unlockAsync();
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        }
      } catch (err) {
        console.warn('Error configuring orientation:', err);
      }
    }
    handleTabletOrientation();
  }, []);

  // Force light mode by default unless user toggles
  useEffect(() => {
    if (nwColorScheme === 'dark') {
      setNwColorScheme('light');
    }
  }, []);

  // Request notification permissions
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar hidden />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="budget-main" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
