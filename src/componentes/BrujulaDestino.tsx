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

export const BrujulaDestino: React.FC<BrujulaDestinoProps> = ({
  origen,
  destino,
  tituloDestino,
  distanciaMetros,
}) => {
  const [orientacionDispositivo, setOrientacionDispositivo] = useState(0);
  const [sensorDisponible, setSensorDisponible] = useState(true);

  useEffect(() => {
    let sub: any = null;

    (async () => {
      const disponible = await Magnetometer.isAvailableAsync();
      setSensorDisponible(disponible);

      if (disponible) {
        Magnetometer.setUpdateInterval(100);
        sub = Magnetometer.addListener((data) => {
          // Ángulo respecto al Norte magnético
          let angulo = Math.atan2(data.y, data.x) * (180 / Math.PI);
          if (angulo < 0) {
            angulo += 360;
          }
          setOrientacionDispositivo(Math.round(angulo));
        });
      }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // Rumbo geográfico hacia el destino
  const rumboHaciaDestino = origen
    ? Math.round(calcularRumboGrados(origen, destino))
    : 0;

  // Ángulo relativo para rotar la flecha
  // (rumbo al destino - orientación del teléfono)
  const anguloFlecha = sensorDisponible
    ? (rumboHaciaDestino - orientacionDispositivo + 360) % 360
    : rumboHaciaDestino;

  const obtenerPuntoCardinal = (grados: number) => {
    const direcciones = ['Norte', 'Noreste', 'Este', 'Sureste', 'Sur', 'Suroeste', 'Oeste', 'Noroeste'];
    const idx = Math.round(grados / 45) % 8;
    return direcciones[idx];
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="compass" size={22} color="#0077B6" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitulo}>Orientación hacia el lugar</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {tituloDestino}
          </Text>
        </View>
        {distanciaMetros !== null && (
          <View style={styles.badgeDistancia}>
            <Text style={styles.badgeDistanciaTexto}>{formatearDistancia(distanciaMetros)}</Text>
          </View>
        )}
      </View>

      <View style={styles.dialContenedor}>
        {/* Dial de la brújula con puntos cardinales */}
        <View style={styles.circuloDial}>
          <Text style={[styles.cardinal, styles.norte]}>N</Text>
          <Text style={[styles.cardinal, styles.este]}>E</Text>
          <Text style={[styles.cardinal, styles.sur]}>S</Text>
          <Text style={[styles.cardinal, styles.oeste]}>O</Text>

          {/* Flecha indicadora que apunta hacia el destino */}
          <View
            style={[
              styles.flechaRotable,
              { transform: [{ rotate: `${anguloFlecha}deg` }] },
            ]}
          >
            <Ionicons name="navigate" size={54} color="#0077B6" />
          </View>
        </View>

        <View style={styles.infoColumna}>
          <Text style={styles.direccionTexto}>
            Hacia el {obtenerPuntoCardinal(rumboHaciaDestino)} ({rumboHaciaDestino}°)
          </Text>
          <Text style={styles.instruccionTexto}>
            {sensorDisponible
              ? 'Alinea tu celular hasta que la flecha apunte hacia arriba para caminar en esa dirección.'
              : 'Rumbo estimado en línea recta. Mantén el norte de referencia.'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  infoColumna: {
    flex: 1,
  },
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
});

