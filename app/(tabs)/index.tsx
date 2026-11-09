// app/(tabs)/index.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Ionicons from '@react-native-vector-icons/ionicons';
import { TarjetaLugar } from '../../src/componentes/TarjetaLugar';
import { obtenerCategorias, obtenerLugares } from '../../src/servicios/lugares';
import { Categoria, Coordenadas, Lugar } from '../../src/tipos';
import {
  calcularDistanciaMetros,
  obtenerUbicacionRobusta,
  suscribirUbicacion,
} from '../../src/utilidades/geolocalizacion';
import { notificarProximidadLugar } from '../../src/servicios/notificaciones';
import { useAuth } from '../../src/contexto/AuthContext';

export default function CatalogoScreen() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [catActiva, setCatActiva] = useState<string | undefined>();
  const [busqueda, setBusqueda] = useState('');
  const [ordenarPorDistancia, setOrdenarPorDistancia] = useState(false);
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);

  // Usar favoritosIds y toggleFavorito del contexto global (ya están sincronizados)
  const { usuario, favoritosIds, toggleFavorito } = useAuth();
  const router = useRouter();

  const handleToggleFav = async (lugarId: string) => {
    await toggleFavorito(lugarId);
  };

  // 1. Obtener ubicación instantánea (caché del sistema) y suscribir a actualizaciones continuas
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let activo = true;

    (async () => {
      // Intento ultra rápido (0-50ms) con fallback tolerante
      const inicial = await obtenerUbicacionRobusta();
      if (activo && inicial) {
        setUbicacionUsuario(inicial);
      }

      // Suscribirse a cambios en vivo (mientras camina el turista)
      sub = await suscribirUbicacion((posActual) => {
        if (activo) {
          setUbicacionUsuario(posActual);
        }
      });
    })();

    return () => {
      activo = false;
      if (sub) sub.remove();
    };
  }, []);

  // 2. Cargar categorías una sola vez
  useEffect(() => {
    obtenerCategorias().then(setCategorias);
  }, []);

  // 3. Cargar lugares cuando cambian los filtros
  useEffect(() => {
    setCargando(true);
    obtenerLugares(catActiva, busqueda)
      .then((data) => setLugares(data))
      .finally(() => setCargando(false));
  }, [catActiva, busqueda]);

  // Aviso de proximidad controlado (PDF Pág. 4: un aviso por lugar/día, configurable en preferencias)
  useEffect(() => {
    if (ubicacionUsuario && lugares.length > 0) {
      if (usuario && usuario.preferencias && !usuario.preferencias.avisarProximidad) {
        return;
      }

      const radioUmbral = usuario?.preferencias?.radioAvisoMetros ?? 350;

      let lugarCercano: Lugar | null = null;
      let distanciaMinima = Infinity;

      for (const lugar of lugares) {
        const d = calcularDistanciaMetros(ubicacionUsuario, lugar.coordenadas);
        if (d < distanciaMinima) {
          distanciaMinima = d;
          lugarCercano = lugar;
        }
      }

      if (lugarCercano) {
        console.log(
          `[Proximidad] Posición: (${ubicacionUsuario.latitud.toFixed(4)}, ${ubicacionUsuario.longitud.toFixed(4)}) → Más próximo: "${lugarCercano.nombre}" a ${Math.round(distanciaMinima)}m (Umbral de aviso: ${radioUmbral}m).`
        );

        if (distanciaMinima <= radioUmbral) {
          notificarProximidadLugar(lugarCercano, distanciaMinima);
        }
      }
    }
  }, [ubicacionUsuario, lugares, usuario]);

  // 4. Calcular distancias y ordenar si el usuario lo solicita
  const lugaresConDistancia = useMemo(() => {
    return lugares.map((lugar) => {
      const dist = ubicacionUsuario
        ? calcularDistanciaMetros(ubicacionUsuario, lugar.coordenadas)
        : undefined;
      return { lugar, dist };
    });
  }, [lugares, ubicacionUsuario]);

  const lugaresProcesados = useMemo(() => {
    const lista = [...lugaresConDistancia];
    if (ordenarPorDistancia && ubicacionUsuario) {
      lista.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
    }
    return lista;
  }, [lugaresConDistancia, ordenarPorDistancia, ubicacionUsuario]);

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o descripción..."
          placeholderTextColor="#888"
          value={busqueda}
          onChangeText={setBusqueda}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => setBusqueda('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </Pressable>
        )}
      </View>

      {/* Botón de ordenamiento por cercanía + Categorías */}
      <View style={styles.filtrosRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosScroll}
        >
          {/* Botón para ordenar por distancia (siempre presente) */}
          <Pressable
            onPress={async () => {
              if (!ubicacionUsuario) {
                const u = await obtenerUbicacionRobusta();
                if (u) {
                  setUbicacionUsuario(u);
                  setOrdenarPorDistancia(true);
                }
              } else {
                setOrdenarPorDistancia(!ordenarPorDistancia);
              }
            }}
            style={[
              styles.chip,
              styles.chipCercanos,
              ordenarPorDistancia && styles.chipCercanosActivo,
            ]}
          >
            <Ionicons
              name="navigate"
              size={14}
              color={ordenarPorDistancia ? '#FFFFFF' : '#0077B6'}
            />
            <Text
              style={[
                styles.chipTexto,
                ordenarPorDistancia && styles.chipTextoActivo,
              ]}
            >
              Más cercanos
            </Text>
          </Pressable>

          {/* Chips de Categorías */}
          {categorias.map((c) => {
            const activa = catActiva === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCatActiva(activa ? undefined : c.id)}
                style={[
                  styles.chip,
                  activa && { backgroundColor: c.color || '#0077B6' },
                ]}
              >
                <Text style={[styles.chipTexto, activa && styles.chipTextoActivo]}>
                  {c.nombre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenido principal: Loading / Lista / Vacío */}
      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#0077B6" />
          <Text style={styles.textoCargando}>Buscando lugares...</Text>
        </View>
      ) : (
        <FlatList
          data={lugaresProcesados}
          keyExtractor={({ lugar }) => lugar.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <TarjetaLugar
              lugar={item.lugar}
              distanciaMetros={item.dist}
              esFavorito={favoritosIds.includes(item.lugar.id)}
              onToggleFavorito={handleToggleFav}
              onPress={(id) => router.push(`/lugar/${id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centrado}>
              <Ionicons name="search" size={48} color="#CBD5E1" />
              <Text style={styles.textoVacio}>No encontramos lugares</Text>
              <Text style={styles.subtextoVacio}>
                Intenta con otra palabra clave o quita los filtros.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: 16,
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  filtrosRow: {
    marginBottom: 8,
  },
  filtrosScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
  },
  chipCercanos: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  chipCercanosActivo: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  chipTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextoActivo: {
    color: '#FFFFFF',
  },
  lista: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
  },
  centrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  textoCargando: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
  },
  textoVacio: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  subtextoVacio: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
