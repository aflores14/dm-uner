import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../src/contexto/AuthContext';
import { configurarCategoriasNotificaciones } from '../src/servicios/notificaciones';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
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

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const procesadoRef = useRef<string | null>(null);

  useEffect(() => {
    configurarCategoriasNotificaciones();
  }, []);

  // Manejo canónico y oficial de toques en notificaciones según Expo Router
  useEffect(() => {
    if (!lastNotificationResponse) return;

    try {
      const notifId = lastNotificationResponse.notification.request.identifier;
      if (notifId && procesadoRef.current === notifId) {
        return;
      }
      if (notifId) {
        procesadoRef.current = notifId;
      }

      const data = lastNotificationResponse.notification.request.content.data;
      const url = data?.url;

      if (typeof url === 'string') {
        setTimeout(() => {
          try {
            router.push(url as any);
          } catch (e) {
            console.error('Error al navegar desde notificación:', e);
          }
        }, 120);
      }
    } catch (err) {
      console.error('Error procesando respuesta de notificación:', err);
    }
  }, [lastNotificationResponse, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
