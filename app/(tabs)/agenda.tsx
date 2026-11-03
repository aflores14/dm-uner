// app/(tabs)/agenda.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { obtenerEventos } from '../../src/servicios/eventos';
import { obtenerLugarPorId } from '../../src/servicios/lugares';
import { Evento, Lugar } from '../../src/tipos';

export default function AgendaScreen() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eventosGuardados, setEventosGuardados] = useState<string[]>([]);
  const [lugaresAsociados, setLugaresAsociados] = useState<Record<string, Lugar>>({});
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const data = await obtenerEventos();
        setEventos(data);

        // Cargar nombres de lugares asociados
        const lugaresMap: Record<string, Lugar> = {};
        for (const ev of data) {
          if (ev.lugarId && !lugaresMap[ev.lugarId]) {
            const lug = await obtenerLugarPorId(ev.lugarId);
            if (lug) lugaresMap[ev.lugarId] = lug;
          }
        }
        setLugaresAsociados(lugaresMap);
      } catch (e) {
        console.error('Error cargando eventos:', e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const toggleGuardarEvento = (evento: Evento) => {
    const yaGuardado = eventosGuardados.includes(evento.id);
    if (yaGuardado) {
      setEventosGuardados(eventosGuardados.filter((id) => id !== evento.id));
      Alert.alert('Recordatorio quitado', `Ya no recibirás aviso para "${evento.titulo}".`);
    } else {
      setEventosGuardados([...eventosGuardados, evento.id]);
      Alert.alert(
        '¡Evento agendado!',
        `Te avisaremos con anticipación antes de que comience "${evento.titulo}".`
      );
    }
  };

  const formatearFechaHora = (iso: string) => {
    try {
      const fecha = new Date(iso);
      const opcionesFecha: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      };
      const opcionesHora: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      };
      return {
        fecha: fecha.toLocaleDateString('es-AR', opcionesFecha),
        hora: fecha.toLocaleTimeString('es-AR', opcionesHora),
      };
    } catch (_e) {
      return { fecha: iso, hora: '' };
    }
  };

  const renderBadgeEstado = (estado: Evento['estado']) => {
    switch (estado) {
      case 'suspendido':
        return (
          <View style={[styles.badgeEstado, styles.badgeSuspendido]}>
            <Ionicons name="rainy-outline" size={12} color="#DC2626" />
            <Text style={[styles.badgeEstadoTexto, { color: '#DC2626' }]}>
              Suspendido por lluvia
            </Text>
          </View>
        );
      case 'cancelado':
        return (
          <View style={[styles.badgeEstado, styles.badgeCancelado]}>
            <Ionicons name="close-circle-outline" size={12} color="#991B1B" />
            <Text style={[styles.badgeEstadoTexto, { color: '#991B1B' }]}>Cancelado</Text>
          </View>
        );
      case 'finalizado':
        return (
          <View style={[styles.badgeEstado, styles.badgeFinalizado]}>
            <Text style={[styles.badgeEstadoTexto, { color: '#64748B' }]}>Finalizado</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeEstado, styles.badgeProgramado]}>
            <Text style={[styles.badgeEstadoTexto, { color: '#15803D' }]}>Programado</Text>
          </View>
        );
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.textoCargando}>Cargando agenda de Colón...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={eventos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitulo}>Agenda de Eventos</Text>
            <Text style={styles.headerSub}>
              Peñas, recitales, visitas guiadas y ferias en Colón
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { fecha, hora } = formatearFechaHora(item.inicio);
          const guardado = eventosGuardados.includes(item.id);
          const lugarAsoc = item.lugarId ? lugaresAsociados[item.lugarId] : null;

          return (
            <View style={styles.card}>
              {item.imagenUrl && (
                <Image
                  source={item.imagenUrl}
                  style={styles.imagen}
                  contentFit="cover"
                  transition={200}
                />
              )}

              <View style={styles.cardContenido}>
                {/* Fila superior: Fecha/Hora y Badge de Estado */}
                <View style={styles.filaHeader}>
                  <View style={styles.fechaContenedor}>
                    <Ionicons name="calendar-outline" size={14} color="#0077B6" />
                    <Text style={styles.fechaTexto}>
                      {fecha} · {hora} hs
                    </Text>
                  </View>
                  {renderBadgeEstado(item.estado)}
                </View>

                {/* Título */}
                <Text style={styles.titulo}>{item.titulo}</Text>

                {/* Ubicación (asociada a lugar o dirección libre) */}
                <View style={styles.ubicacionFila}>
                  <Ionicons name="location-outline" size={15} color="#64748B" />
                  <Text style={styles.ubicacionTexto} numberOfLines={1}>
                    {lugarAsoc ? lugarAsoc.nombre : item.direccionLibre || 'Colón, Entre Ríos'}
                  </Text>
                </View>

                {/* Descripción */}
                <Text style={styles.descripcion} numberOfLines={3}>
                  {item.descripcion}
                </Text>

                {/* Footer: Precio + Botones */}
                <View style={styles.cardFooter}>
                  <View style={styles.precioBadge}>
                    <Text style={styles.precioTexto}>
                      {item.precio === 0 ? 'Entrada Libre y Gratuita' : `$${item.precio}`}
                    </Text>
                  </View>

                  <View style={styles.accionesFila}>
                    {/* Botón de guardar recordatorio */}
                    <Pressable
                      style={[styles.btnAccion, guardado && styles.btnAccionGuardado]}
                      onPress={() => toggleGuardarEvento(item)}
                    >
                      <Ionicons
                        name={guardado ? 'notifications' : 'notifications-outline'}
                        size={18}
                        color={guardado ? '#FFFFFF' : '#0077B6'}
                      />
                      <Text
                        style={[
                          styles.btnAccionTexto,
                          guardado && styles.btnAccionTextoGuardado,
                        ]}
                      >
                        {guardado ? 'Agendado' : 'Avisarme'}
                      </Text>
                    </Pressable>

                    {/* Botón Ver Lugar si está asociado */}
                    {item.lugarId && (
                      <Pressable
                        style={styles.btnVerLugar}
                        onPress={() => router.push(`/lugar/${item.lugarId}`)}
                      >
                        <Ionicons name="arrow-forward" size={16} color="#0077B6" />
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  lista: { padding: 16, paddingBottom: 32 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoCargando: { marginTop: 12, fontSize: 15, color: '#64748B' },
  header: { marginBottom: 16 },
  headerTitulo: { fontSize: 24, fontWeight: 'bold', color: '#03045E' },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imagen: { width: '100%', height: 160 },
  cardContenido: { padding: 14 },
  filaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fechaContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fechaTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0077B6',
    textTransform: 'capitalize',
  },
  badgeEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeProgramado: { backgroundColor: '#DCFCE7' },
  badgeSuspendido: { backgroundColor: '#FEE2E2' },
  badgeCancelado: { backgroundColor: '#FEE2E2' },
  badgeFinalizado: { backgroundColor: '#F1F5F9' },
  badgeEstadoTexto: { fontSize: 11, fontWeight: '700' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 },
  ubicacionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ubicacionTexto: { fontSize: 13, color: '#64748B', flex: 1 },
  descripcion: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  precioBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  precioTexto: { fontSize: 12, fontWeight: '700', color: '#334155' },
  accionesFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnAccionGuardado: {
    backgroundColor: '#0077B6',
  },
  btnAccionTexto: { fontSize: 13, fontWeight: '700', color: '#0077B6' },
  btnAccionTextoGuardado: { color: '#FFFFFF' },
  btnVerLugar: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
  },
});

