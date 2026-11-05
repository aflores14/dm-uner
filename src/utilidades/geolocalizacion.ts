// src/utilidades/geolocalizacion.ts
import { Linking, Platform } from 'react-native';
import { Coordenadas, Horario } from '../tipos';

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

