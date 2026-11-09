// src/componentes/BrujulaDestino.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Magnetometer } from 'expo-sensors';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Coordenadas } from '../tipos';
import { calcularRumboGrados, formatearDistancia } from '../utilidades/geolocalizacion';

interface BrujulaDestinoProps {
  origen: Coordenadas | null;
  destino: Coordenadas;
  tituloDestino: string;
  distanciaMetros: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook reutilizable para leer el magnetómetro
// ─────────────────────────────────────────────────────────────────────────────
function useMagnetometro() {
  const [angulo, setAngulo] = useState(0);
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    let sub: ReturnType<typeof Magnetometer.addListener> | null = null;

    (async () => {
      const ok = await Magnetometer.isAvailableAsync();
      setDisponible(ok);
      if (ok) {
        Magnetometer.setUpdateInterval(100);
        sub = Magnetometer.addListener((data) => {
          let a = Math.atan2(data.y, data.x) * (180 / Math.PI);
          if (a < 0) a += 360;
          setAngulo(Math.round(a));
        });
      }
    })();

    return () => { if (sub) sub.remove(); };
  }, []);

  return { angulo, disponible };
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSIÓN COMPLETA — tarjeta expandida (ya no se usa en el mapa,
// queda disponible si se necesita en otra pantalla)
// ─────────────────────────────────────────────────────────────────────────────
export const BrujulaDestino: React.FC<BrujulaDestinoProps> = ({
  origen,
  destino,
  tituloDestino,
  distanciaMetros,
}) => {
  const { angulo: orientacionDispositivo, disponible: sensorDisponible } = useMagnetometro();

  const rumboHaciaDestino = origen
    ? Math.round(calcularRumboGrados(origen, destino))
    : 0;

  const anguloFlecha = sensorDisponible
    ? (rumboHaciaDestino - orientacionDispositivo + 360) % 360
    : rumboHaciaDestino;

  const obtenerPuntoCardinal = (grados: number) => {
    const dirs = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
    return dirs[Math.round(grados / 45) % 8];
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="compass" size={22} color="#0077B6" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitulo}>Orientación hacia el lugar</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{tituloDestino}</Text>
        </View>
        {distanciaMetros !== null && (
          <View style={styles.badgeDistancia}>
            <Text style={styles.badgeDistanciaTexto}>{formatearDistancia(distanciaMetros)}</Text>
          </View>
        )}
      </View>

      <View style={styles.dialContenedor}>
        <View style={styles.circuloDial}>
          <Text style={[styles.cardinal, styles.norte]}>N</Text>
          <Text style={[styles.cardinal, styles.este]}>E</Text>
          <Text style={[styles.cardinal, styles.sur]}>S</Text>
          <Text style={[styles.cardinal, styles.oeste]}>O</Text>
          <View style={[styles.flechaRotable, { transform: [{ rotate: `${anguloFlecha}deg` }] }]}>
            <Ionicons name="navigate" size={54} color="#0077B6" />
          </View>
        </View>

        <View style={styles.infoColumna}>
          <Text style={styles.direccionTexto}>
            Hacia el {obtenerPuntoCardinal(rumboHaciaDestino)} ({rumboHaciaDestino}°)
          </Text>
          <Text style={styles.instruccionTexto}>
            {sensorDisponible
              ? 'Alinea tu celular hasta que la flecha apunte hacia arriba.'
              : 'Rumbo estimado en línea recta.'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// VERSIÓN COMPACTA — overlay flotante sobre el mapa
// Muestra solo la flecha grande y la distancia. Siempre visible en modo destino.
// ─────────────────────────────────────────────────────────────────────────────
export const BrujulaDestinoCompacta: React.FC<BrujulaDestinoProps> = ({
  origen,
  destino,
  tituloDestino,
  distanciaMetros,
}) => {
  const { angulo: orientacionDispositivo, disponible: sensorDisponible } = useMagnetometro();

  const rumboHaciaDestino = origen
    ? Math.round(calcularRumboGrados(origen, destino))
    : 0;

  const anguloFlecha = sensorDisponible
    ? (rumboHaciaDestino - orientacionDispositivo + 360) % 360
    : rumboHaciaDestino;

  return (
    <View style={styles.compacta}>
      {/* Flecha giratoria */}
      <View style={[styles.compactaFlecha, { transform: [{ rotate: `${anguloFlecha}deg` }] }]}>
        <Ionicons name="navigate" size={36} color="#0077B6" />
      </View>

      {/* Distancia al destino */}
      {distanciaMetros !== null && (
        <Text style={styles.compactaDist}>{formatearDistancia(distanciaMetros)}</Text>
      )}

      {/* Nombre abreviado */}
      <Text style={styles.compactaNombre} numberOfLines={1}>{tituloDestino}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Versión completa ────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#03045E',
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
  },
  badgeDistancia: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeDistanciaTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dialContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  circuloDial: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardinal: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  norte: { top: 4 },
  este: { right: 6 },
  sur: { bottom: 4 },
  oeste: { left: 6 },
  flechaRotable: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoColumna: { flex: 1 },
  direccionTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  instruccionTexto: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },

  // ── Versión compacta (overlay sobre el mapa) ────────────────────────────
  compacta: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  compactaFlecha: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactaDist: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#0077B6',
  },
  compactaNombre: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    maxWidth: 80,
    textAlign: 'center',
  },
});
