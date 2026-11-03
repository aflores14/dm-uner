// src/componentes/MapaInteractivo.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@react-native-vector-icons/ionicons';
import { obtenerCategorias, obtenerLugares } from '../servicios/lugares';
import { Categoria, Coordenadas, Lugar } from '../tipos';
import {
  abrirEnMapasExternos,
  calcularDistanciaMetros,
  formatearDistancia,
} from '../utilidades/geolocalizacion';

// Centro histórico de Colón, Entre Ríos
const REGION_COLON_DEFECTO: Region = {
  latitude: -32.2231,
  longitude: -58.1345,
  latitudeDelta: 0.05,
  longitudeDelta: 0.04,
};

export default function MapaInteractivo() {
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    titulo?: string;
    lugarId?: string;
  }>();

  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catSeleccionada, setCatSeleccionada] = useState<string | undefined>();
  const [cargando, setCargando] = useState(true);
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);

  // Modo destino: se activa si venimos desde un lugar específico
  const [destinoActivo, setDestinoActivo] = useState<{
    latitud: number;
    longitud: number;
    titulo: string;
    lugarId?: string;
  } | null>(null);

  // 1. Obtener ubicación con expo-location (tolerante a permisos denegados)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const coordUsuario: Coordenadas = {
            latitud: loc.coords.latitude,
            longitud: loc.coords.longitude,
          };
          setUbicacionUsuario(coordUsuario);
        }
      } catch (err) {
        console.log('Error o permiso no otorgado en ubicación:', err);
      }
    })();
  }, []);

  // 2. Cargar lugares y categorías desde el servicio
  useEffect(() => {
    Promise.all([obtenerLugares(), obtenerCategorias()])
      .then(([lugaresData, catData]) => {
        setLugares(lugaresData);
        setCategorias(catData);
      })
      .catch((e) => console.error('Error inicializando mapa:', e))
      .finally(() => setCargando(false));
  }, []);

  // 3. Activar modo destino si vienen parámetros
  useEffect(() => {
    if (params.lat && params.lng) {
      const latNum = parseFloat(params.lat);
      const lngNum = parseFloat(params.lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setDestinoActivo({
          latitud: latNum,
          longitud: lngNum,
          titulo: params.titulo || 'Destino seleccionado',
          lugarId: params.lugarId,
        });

        // Centrar mapa en el destino
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              latitude: latNum,
              longitude: lngNum,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            },
            800
          );
        }, 300);
      }
    } else {
      setDestinoActivo(null);
    }
  }, [params.lat, params.lng, params.titulo, params.lugarId]);

  // Lugares filtrados por categoría (en modo general)
  const lugaresFiltrados = useMemo(() => {
    if (!catSeleccionada) return lugares;
    return lugares.filter((l) => l.categoriaId === catSeleccionada);
  }, [lugares, catSeleccionada]);

  // Lista "Cerca tuyo" ordenada por distancia
  const lugaresCercanos = useMemo(() => {
    if (!ubicacionUsuario) return lugaresFiltrados.slice(0, 5);
    return [...lugaresFiltrados]
      .map((l) => ({
        ...l,
        distancia: calcularDistanciaMetros(ubicacionUsuario, l.coordenadas),
      }))
      .sort((a, b) => a.distancia - b.distancia);
  }, [lugaresFiltrados, ubicacionUsuario]);

  // Distancia al destino activo (si hay usuario y destino)
  const distanciaAlDestino = useMemo(() => {
    if (!destinoActivo || !ubicacionUsuario) return null;
    return calcularDistanciaMetros(ubicacionUsuario, {
      latitud: destinoActivo.latitud,
      longitud: destinoActivo.longitud,
    });
  }, [destinoActivo, ubicacionUsuario]);

  const centrarEnLugar = (lugar: Lugar) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lugar.coordenadas.latitud,
        longitude: lugar.coordenadas.longitud,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600
    );
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.cargandoTexto}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* MAPA PRINCIPAL */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={
          destinoActivo
            ? {
                latitude: destinoActivo.latitud,
                longitude: destinoActivo.longitud,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }
            : ubicacionUsuario
            ? {
                latitude: ubicacionUsuario.latitud,
                longitude: ubicacionUsuario.longitud,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }
            : REGION_COLON_DEFECTO
        }
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* CASO A: MODO DESTINO -> Solo se muestra el marcador del destino + usuario */}
        {destinoActivo ? (
          <Marker
            coordinate={{
              latitude: destinoActivo.latitud,
              longitude: destinoActivo.longitud,
            }}
            title={destinoActivo.titulo}
            pinColor="#0077B6"
          >
            <View style={styles.pinDestinoContenedor}>
              <View style={styles.pinDestinoCirculo}>
                <Ionicons name="flag" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.pinDestinoPunta} />
            </View>
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitulo}>{destinoActivo.titulo}</Text>
                {distanciaAlDestino !== null && (
                  <Text style={styles.calloutDistancia}>
                    A {formatearDistancia(distanciaAlDestino)} de ti
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ) : (
          /* CASO B: MODO GENERAL -> Se muestran todos los lugares marcados */
          lugaresFiltrados.map((lugar) => (
            <Marker
              key={lugar.id}
              coordinate={{
                latitude: lugar.coordenadas.latitud,
                longitude: lugar.coordenadas.longitud,
              }}
              title={lugar.nombre}
            >
              <Callout onPress={() => router.push(`/lugar/${lugar.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitulo}>{lugar.nombre}</Text>
                  <Text style={styles.calloutSubtitulo}>{lugar.direccion}</Text>
                  <Text style={styles.calloutVerMas}>Tocar para ver detalle ›</Text>
                </View>
              </Callout>
            </Marker>
          ))
        )}
      </MapView>

      {/* OVERLAY SUPERIOR: FILTRO DE CATEGORÍAS (Solo en modo general) */}
      {!destinoActivo && (
        <View style={styles.filtrosOverlay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtrosScroll}>
            <Pressable
              onPress={() => setCatSeleccionada(undefined)}
              style={[styles.chipFiltro, !catSeleccionada && styles.chipFiltroActivo]}
            >
              <Text style={[styles.chipFiltroTexto, !catSeleccionada && styles.chipFiltroTextoActivo]}>
                Todos ({lugares.length})
              </Text>
            </Pressable>
            {categorias.map((cat) => {
              const activa = catSeleccionada === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCatSeleccionada(activa ? undefined : cat.id)}
                  style={[
                    styles.chipFiltro,
                    activa && { backgroundColor: cat.color || '#0077B6' },
                  ]}
                >
                  <Text style={[styles.chipFiltroTexto, activa && styles.chipFiltroTextoActivo]}>
                    {cat.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* OVERLAY INFERIOR - CASO 1: TARJETA DE NAVEGACIÓN A DESTINO */}
      {destinoActivo && (
        <View style={styles.tarjetaDestino}>
          <View style={styles.tarjetaDestinoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tarjetaDestinoSub}>CÓMO LLEGAR A</Text>
              <Text style={styles.tarjetaDestinoTitulo} numberOfLines={1}>
                {destinoActivo.titulo}
              </Text>
              {distanciaAlDestino !== null && (
                <View style={styles.distanciaFila}>
                  <Ionicons name="navigate" size={14} color="#0077B6" />
                  <Text style={styles.distanciaTexto}>
                    Distancia: {formatearDistancia(distanciaAlDestino)}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => setDestinoActivo(null)}
              style={styles.cerrarDestinoBtn}
              accessibilityLabel="Ver todos los lugares"
            >
              <Ionicons name="close" size={22} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.tarjetaDestinoBotones}>
            <Pressable
              style={styles.btnAbrirMaps}
              onPress={() =>
                abrirEnMapasExternos(
                  { latitud: destinoActivo.latitud, longitud: destinoActivo.longitud },
                  destinoActivo.titulo
                )
              }
            >
              <Ionicons name="navigate-circle" size={20} color="#FFFFFF" />
              <Text style={styles.btnAbrirMapsTexto}>Abrir en Google/Apple Maps</Text>
            </Pressable>

            <Pressable
              style={styles.btnVerTodos}
              onPress={() => setDestinoActivo(null)}
            >
              <Text style={styles.btnVerTodosTexto}>Ver todos los lugares</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* OVERLAY INFERIOR - CASO 2: LISTA 'CERCA TUYO' (Wireframe Pág. 3) */}
      {!destinoActivo && (
        <View style={styles.cercaTuyoContenedor}>
          <View style={styles.cercaTuyoHeader}>
            <View style={styles.cercaTuyoIcono}>
              <Ionicons name="compass-outline" size={18} color="#0077B6" />
            </View>
            <Text style={styles.cercaTuyoTitulo}>Cerca tuyo</Text>
            <Text style={styles.cercaTuyoSub}>
              {ubicacionUsuario ? 'Ordenado por distancia' : 'Lugares en Colón'}
            </Text>
          </View>

          <FlatList
            data={lugaresCercanos}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cercaTuyoScroll}
            renderItem={({ item }) => {
              const dist =
                'distancia' in item && typeof item.distancia === 'number'
                  ? item.distancia
                  : ubicacionUsuario
                  ? calcularDistanciaMetros(ubicacionUsuario, item.coordenadas)
                  : null;

              return (
                <Pressable
                  style={styles.tarjetaCercana}
                  onPress={() => centrarEnLugar(item)}
                >
                  <View style={styles.tarjetaCercanaContenido}>
                    <Text style={styles.tarjetaCercanaNombre} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.tarjetaCercanaDesc} numberOfLines={1}>
                      {item.descripcionCorta}
                    </Text>

                    <View style={styles.tarjetaCercanaFooter}>
                      {dist !== null && (
                        <View style={styles.badgeDistCercano}>
                          <Ionicons name="navigate-outline" size={11} color="#0077B6" />
                          <Text style={styles.badgeDistCercanoTexto}>
                            {formatearDistancia(dist)}
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onPress={() => router.push(`/lugar/${item.id}`)}
                        style={styles.btnDetalleCercano}
                      >
                        <Text style={styles.btnDetalleCercanoTexto}>Detalle ›</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cargandoTexto: {
    marginTop: 10,
    fontSize: 15,
    color: '#64748B',
  },
  filtrosOverlay: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
  },
  filtrosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chipFiltro: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  chipFiltroActivo: {
    backgroundColor: '#0077B6',
  },
  chipFiltroTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  chipFiltroTextoActivo: {
    color: '#FFFFFF',
  },
  pinDestinoContenedor: {
    alignItems: 'center',
  },
  pinDestinoCirculo: {
    backgroundColor: '#0077B6',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
  },
  pinDestinoPunta: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0077B6',
    marginTop: -1,
  },
  callout: {
    width: 200,
    padding: 6,
  },
  calloutTitulo: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#03045E',
  },
  calloutSubtitulo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  calloutDistancia: {
    fontSize: 12,
    color: '#0077B6',
    fontWeight: '700',
    marginTop: 4,
  },
  calloutVerMas: {
    fontSize: 12,
    color: '#0077B6',
    fontWeight: 'bold',
    marginTop: 6,
  },
  tarjetaDestino: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  tarjetaDestinoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  tarjetaDestinoSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0077B6',
    letterSpacing: 0.8,
  },
  tarjetaDestinoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#03045E',
    marginTop: 2,
  },
  distanciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  distanciaTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  cerrarDestinoBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  tarjetaDestinoBotones: {
    marginTop: 14,
    gap: 8,
  },
  btnAbrirMaps: {
    backgroundColor: '#0077B6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnAbrirMapsTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnVerTodos: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnVerTodosTexto: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  cercaTuyoContenedor: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  cercaTuyoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    gap: 6,
  },
  cercaTuyoIcono: {
    padding: 2,
  },
  cercaTuyoTitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#03045E',
  },
  cercaTuyoSub: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 'auto',
  },
  cercaTuyoScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 10,
  },
  tarjetaCercana: {
    backgroundColor: '#FFFFFF',
    width: 240,
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tarjetaCercanaContenido: {
    flex: 1,
  },
  tarjetaCercanaNombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#03045E',
  },
  tarjetaCercanaDesc: {
    fontSize: 12,
    color: '#64748B',
    marginVertical: 4,
  },
  tarjetaCercanaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  badgeDistCercano: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeDistCercanoTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  btnDetalleCercano: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  btnDetalleCercanoTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0077B6',
  },
});
