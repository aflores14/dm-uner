// app/lugar/[id].tsx
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BotonApp } from '../../src/componentes/BotonApp';
import { obtenerLugarPorId } from '../../src/servicios/lugares';
import { Coordenadas, Lugar } from '../../src/tipos';
import {
  calcularDistanciaMetros,
  formatearDistancia,
  verificarEstadoApertura,
} from '../../src/utilidades/geolocalizacion';

export default function DetalleLugarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);
  const [esFavorito, setEsFavorito] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // 1. Cargar lugar
    if (id) {
      obtenerLugarPorId(id).then((res) => {
        setLugar(res);
        setCargando(false);
      });
    }

    // 2. Obtener ubicación con tolerancia a permisos
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUbicacionUsuario({
            latitud: loc.coords.latitude,
            longitud: loc.coords.longitude,
          });
        }
      } catch (_e) {
        // Ignora silenciosamente si no hay permisos
      }
    })();
  }, [id]);

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
  }

  if (!lugar) {
    return (
      <View style={styles.centrado}>
        <Ionicons name="alert-circle-outline" size={48} color="#D00000" />
        <Text style={styles.errorText}>Lugar no encontrado</Text>
      </View>
    );
  }

  const distanciaMetros = ubicacionUsuario
    ? calcularDistanciaMetros(ubicacionUsuario, lugar.coordenadas)
    : null;

  const apertura = verificarEstadoApertura(lugar.horarios);

  const irAlMapaParaLlegar = () => {
    router.push({
      pathname: '/(tabs)/mapa',
      params: {
        lugarId: lugar.id,
        lat: lugar.coordenadas.latitud.toString(),
        lng: lugar.coordenadas.longitud.toString(),
        titulo: lugar.nombre,
      },
    });
  };

  const llamarTelefono = () => {
    if (lugar.telefono) {
      Linking.openURL(`tel:${lugar.telefono}`);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Stack.Screen
        options={{
          title: lugar.nombre,
          headerRight: () => (
            <Pressable
              onPress={() => setEsFavorito(!esFavorito)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 8 }]}
              accessibilityLabel="Marcar favorito"
            >
              <Ionicons
                name={esFavorito ? 'star' : 'star-outline'}
                size={24}
                color={esFavorito ? '#FFB703' : '#03045E'}
              />
            </Pressable>
          ),
        }}
      />

      {/* Imagen Hero */}
      {lugar.imagenes && lugar.imagenes.length > 0 ? (
        <Image
          source={lugar.imagenes[0]}
          style={styles.hero}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Ionicons name="image-outline" size={60} color="#94A3B8" />
        </View>
      )}

      <View style={styles.content}>
        {/* Nombre */}
        <Text style={styles.nombre}>{lugar.nombre}</Text>

        {/* Dirección */}
        <View style={styles.filaInfo}>
          <Ionicons name="location-sharp" size={16} color="#0077B6" />
          <Text style={styles.direccion}>{lugar.direccion}</Text>
        </View>

        {/* Estado y Distancia (Wireframe Pág. 4) */}
        <View style={styles.badgesFila}>
          <View
            style={[
              styles.badgeEstado,
              { backgroundColor: apertura.abierto ? '#DCFCE7' : '#FEE2E2' },
            ]}
          >
            <View
              style={[
                styles.punto,
                { backgroundColor: apertura.abierto ? '#16A34A' : '#DC2626' },
              ]}
            />
            <Text
              style={[
                styles.badgeTexto,
                { color: apertura.abierto ? '#15803D' : '#B91C1C' },
              ]}
            >
              {apertura.texto}
            </Text>
          </View>

          {distanciaMetros !== null && (
            <View style={styles.badgeDistancia}>
              <Ionicons name="navigate-outline" size={14} color="#0284C7" />
              <Text style={styles.badgeDistanciaTexto}>
                A {formatearDistancia(distanciaMetros)} de donde estás
              </Text>
            </View>
          )}
        </View>

        {/* Datos clave: Precio, Accesibilidad, Teléfono */}
        <View style={styles.datosGrid}>
          <View style={styles.datoItem}>
            <Ionicons name="cash-outline" size={20} color="#0077B6" />
            <Text style={styles.datoTitulo}>Entrada</Text>
            <Text style={styles.datoValor}>
              {lugar.precioEntrada === 0
                ? 'Gratis'
                : lugar.precioEntrada !== null
                ? `$${lugar.precioEntrada}`
                : 'No informada'}
            </Text>
          </View>

          <View style={styles.datoItem}>
            <Ionicons
              name={lugar.accesible ? 'body' : 'body-outline'}
              size={20}
              color={lugar.accesible ? '#16A34A' : '#94A3B8'}
            />
            <Text style={styles.datoTitulo}>Accesibilidad</Text>
            <Text style={styles.datoValor}>
              {lugar.accesible ? 'Apto silla' : 'No adaptado'}
            </Text>
          </View>

          {lugar.telefono && (
            <Pressable onPress={llamarTelefono} style={styles.datoItem}>
              <Ionicons name="call-outline" size={20} color="#0077B6" />
              <Text style={styles.datoTitulo}>Teléfono</Text>
              <Text style={[styles.datoValor, styles.enlace]}>{lugar.telefono}</Text>
            </Pressable>
          )}
        </View>

        {/* Descripción larga */}
        <Text style={styles.seccionTitulo}>Sobre este lugar</Text>
        <Text style={styles.descripcion}>{lugar.descripcion}</Text>

        {/* Audioguía (si existe) */}
        {lugar.audioguia && (
          <View style={styles.audioguiaCard}>
            <Ionicons name="headset" size={24} color="#0077B6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.audioguiaTitulo}>Audioguía disponible</Text>
              <Text style={styles.audioguiaSubtitulo}>
                Duración: {Math.floor(lugar.audioguia.duracionSegundos / 60)}:
                {(lugar.audioguia.duracionSegundos % 60).toString().padStart(2, '0')} min
              </Text>
            </View>
            <Pressable
              style={styles.audioguiaBtn}
              onPress={() => alert('Reproduciendo audioguía histórica...')}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        {/* Botones de acción principales */}
        <View style={styles.botonesAccion}>
          <BotonApp
            titulo="Cómo llegar"
            onPress={irAlMapaParaLlegar}
            style={styles.botonLlegar}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  hero: { width: '100%', height: 260 },
  heroPlaceholder: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 20 },
  nombre: { fontSize: 24, fontWeight: 'bold', color: '#03045E' },
  filaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  direccion: { fontSize: 14, color: '#475569', flex: 1 },
  badgesFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  badgeEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  punto: { width: 7, height: 7, borderRadius: 4 },
  badgeTexto: { fontSize: 13, fontWeight: '700' },
  badgeDistancia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeDistanciaTexto: { fontSize: 13, fontWeight: '600', color: '#0369A1' },
  datosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datoItem: { alignItems: 'center', flex: 1 },
  datoTitulo: { fontSize: 12, color: '#64748B', marginTop: 4 },
  datoValor: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  enlace: { color: '#0077B6', textDecorationLine: 'underline' },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 20,
  },
  audioguiaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  audioguiaTitulo: { fontSize: 15, fontWeight: 'bold', color: '#0369A1' },
  audioguiaSubtitulo: { fontSize: 13, color: '#0284C7', marginTop: 2 },
  audioguiaBtn: {
    backgroundColor: '#0077B6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonesAccion: { marginTop: 10 },
  botonLlegar: { backgroundColor: '#0077B6' },
  errorText: { fontSize: 16, color: '#64748B', marginTop: 12 },
});
