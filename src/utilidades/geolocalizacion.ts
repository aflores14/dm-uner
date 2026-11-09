// src/utilidades/geolocalizacion.ts
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Coordenadas, Horario } from '../tipos';

/**
 * Obtiene la ubicación del usuario de la forma más rápida y tolerante a fallos.
 * Primero intenta leer la última ubicación conocida en caché (instantánea).
 * Si no existe, consulta la posición actual con precisión equilibrada, y
 * si el GPS aún no tiene fix o falla, usa un fallback de menor precisión.
 */
export async function obtenerUbicacionRobusta(): Promise<Coordenadas | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    let permitido = status === 'granted';

    if (!permitido) {
      const resp = await Location.requestForegroundPermissionsAsync();
      permitido = resp.status === 'granted';
    }

    if (!permitido) {
      return null;
    }

    // 1. Intento ultra-rápido: última posición registrada por el sistema (0-50ms)
    try {
      const ultima = await Location.getLastKnownPositionAsync({});
      if (ultima?.coords) {
        return {
          latitud: ultima.coords.latitude,
          longitud: ultima.coords.longitude,
        };
      }
    } catch (_errUltima) {
      // Continuar con los siguientes intentos
    }

    // 2. Posición en tiempo real con precisión equilibrada
    try {
      const actual = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (actual?.coords) {
        return {
          latitud: actual.coords.latitude,
          longitud: actual.coords.longitude,
        };
      }
    } catch (_errActual) {
      // 3. Fallback con Lowest accuracy (red celular o WiFi)
      try {
        const fallback = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
        });
        if (fallback?.coords) {
          return {
            latitud: fallback.coords.latitude,
            longitud: fallback.coords.longitude,
          };
        }
      } catch (_errFallback) {
        // Silencioso: no romper la app si los servicios de ubicación están apagados
      }
    }
  } catch (e) {
    console.log('Error tolerado al consultar ubicación:', e);
  }
  return null;
}

/**
 * Suscribe a actualizaciones continuas de la posición del usuario.
 * Se actualiza cada 10 metros o cada 5 segundos.
 */
export async function suscribirUbicacion(
  onUbicacion: (coord: Coordenadas) => void
): Promise<Location.LocationSubscription | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (loc) => {
        if (loc?.coords) {
          onUbicacion({
            latitud: loc.coords.latitude,
            longitud: loc.coords.longitude,
          });
        }
      }
    );
  } catch (err) {
    console.log('Error iniciando suscripción de ubicación:', err);
    return null;
  }
}

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas mediante la fórmula de Haversine.
 */
export function calcularDistanciaMetros(coord1: Coordenadas, coord2: Coordenadas): number {
  const R = 6371000; // Radio de la Tierra en metros
  const rad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = rad(coord2.latitud - coord1.latitud);
  const dLon = rad(coord2.longitud - coord1.longitud);

  const lat1 = rad(coord1.latitud);
  const lat2 = rad(coord2.latitud);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Calcula el rumbo geográfico (azimuth / bearing) en grados (0° a 360°)
 * desde las coordenadas de origen hacia las del destino.
 */
export function calcularRumboGrados(origen: Coordenadas, destino: Coordenadas): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const deg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = rad(origen.latitud);
  const lat2 = rad(destino.latitud);
  const dLon = rad(destino.longitud - origen.longitud);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const rumbo = deg(Math.atan2(y, x));
  return (rumbo + 360) % 360;
}

/**
 * Formatea una distancia en metros a texto amigable ("850 m" o "4,2 km").
 */
export function formatearDistancia(metros: number | null | undefined): string {
  if (metros === null || metros === undefined || isNaN(metros)) return '';
  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }
  const km = (metros / 1000).toFixed(1).replace('.', ',');
  return `${km} km`;
}

/**
 * Abre la app nativa de mapas (Google Maps en Android, Apple Maps en iOS)
 * para navegar hacia el destino caminando o en auto.
 */
export async function abrirEnMapasExternos(coordenadas: Coordenadas, nombre: string) {
  const { latitud, longitud } = coordenadas;
  const label = encodeURIComponent(nombre);

  const url = Platform.select({
    ios: `maps:0,0?q=${label}@${latitud},${longitud}`,
    android: `geo:0,0?q=${latitud},${longitud}(${label})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`,
  });

  try {
    const soportado = await Linking.canOpenURL(url);
    if (soportado) {
      await Linking.openURL(url);
    } else {
      // Fallback a URL web de Google Maps
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`);
    }
  } catch (_error) {
    // Fallback universal en caso de error con el scheme nativo
    await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`);
  }
}

/**
 * Comprueba si un lugar está abierto actualmente en base a sus horarios.
 */
export function verificarEstadoApertura(horarios: Horario[]): { abierto: boolean; texto: string } {
  if (!horarios || horarios.length === 0) {
    return { abierto: false, texto: 'Horarios no informados' };
  }

  const ahora = new Date();
  const diaActual = ahora.getDay(); // 0 domingo, 1 lunes...
  const horaMinActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;

  const horarioHoy = horarios.find((h) => h.dia === diaActual);

  if (!horarioHoy) {
    return { abierto: false, texto: 'Cerrado hoy' };
  }

  if (horaMinActual >= horarioHoy.abre && horaMinActual <= horarioHoy.cierra) {
    return { abierto: true, texto: `Abierto ahora · Cierra ${horarioHoy.cierra}` };
  } else if (horaMinActual < horarioHoy.abre) {
    return { abierto: false, texto: `Cerrado · Abre hoy a las ${horarioHoy.abre}` };
  } else {
    return { abierto: false, texto: `Cerrado · Abrió hasta las ${horarioHoy.cierra}` };
  }
}

