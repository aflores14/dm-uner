// app/(tabs)/recorrido.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BotonApp } from '../../src/componentes/BotonApp';
import { useAuth } from '../../src/contexto/AuthContext';
import { obtenerLugares } from '../../src/servicios/lugares';
import { obtenerVisitas, registrarNuevaVisita } from '../../src/servicios/visitas';
import { Lugar, OrigenVisita, Visita } from '../../src/tipos';

export default function RecorridoScreen() {
  const { usuario } = useAuth();
  const router = useRouter();

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal para registrar nueva visita manual
  const [modalVisible, setModalVisible] = useState(false);
  const [lugarSeleccionado, setLugarSeleccionado] = useState<string>('');
  const [nota, setNota] = useState('');
  const [origen, setOrigen] = useState<OrigenVisita>('manual');
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = async () => {
    try {
      const [v, l] = await Promise.all([obtenerVisitas(), obtenerLugares()]);
      setVisitas(v);
      setLugares(l);
      if (l.length > 0 && !lugarSeleccionado) {
        setLugarSeleccionado(l[0].id);
      }
    } catch (e) {
      console.error('Error cargando recorrido:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearVisita = async () => {
    if (!lugarSeleccionado) {
      Alert.alert('Atención', 'Selecciona un lugar visitado.');
      return;
    }

    setGuardando(true);
    const lugarObj = lugares.find((l) => l.id === lugarSeleccionado);
    const foto = lugarObj?.imagenes[0] || null;

    const creada = await registrarNuevaVisita({
      usuarioId: usuario?.id || 'usr-anonimo',
      lugarId: lugarSeleccionado,
      fechaHora: new Date().toISOString(),
      origen: origen,
      fotoUri: foto,
      nota: nota.trim() || null,
    });

    setVisitas([creada, ...visitas]);
    setNota('');
    setGuardando(false);
    setModalVisible(false);

    Alert.alert(
      '¡Visita Registrada!',
      'Tu visita ha sido guardada en la memoria local del dispositivo (cola offline).'
    );
  };

  const getLugarInfo = (lugarId: string) => {
    return lugares.find((l) => l.id === lugarId);
  };

  const formatearFecha = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_e) {
      return iso;
    }
  };

  const renderBadgeOrigen = (origenVisita: OrigenVisita) => {
    switch (origenVisita) {
      case 'qr':
        return (
          <View style={[styles.badgeOrigen, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="qr-code-outline" size={12} color="#7C3AED" />
            <Text style={[styles.badgeOrigenTexto, { color: '#7C3AED' }]}>Escaneo QR</Text>
          </View>
        );
      case 'gps':
        return (
          <View style={[styles.badgeOrigen, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="navigate-outline" size={12} color="#0284C7" />
            <Text style={[styles.badgeOrigenTexto, { color: '#0284C7' }]}>Cercanía GPS</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badgeOrigen, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="create-outline" size={12} color="#D97706" />
            <Text style={[styles.badgeOrigenTexto, { color: '#D97706' }]}>Manual</Text>
          </View>
        );
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0077B6" />
        <Text style={styles.textoCargando}>Cargando tu recorrido...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visitas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitulo}>Mi Recorrido</Text>
              <Text style={styles.headerSub}>
                Bitácora de lugares que visitaste en Colón
              </Text>
            </View>
            <Pressable
              style={styles.btnRegistrar}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.btnRegistrarTexto}>Registrar</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const lugar = getLugarInfo(item.lugarId);

          return (
            <View style={styles.timelineItem}>
              {/* Línea e indicador visual de la bitácora */}
              <View style={styles.timelineEje}>
                <View style={styles.timelinePunto}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineLinea} />
              </View>

              {/* Tarjeta de Visita */}
              <View style={styles.card}>
                {item.fotoUri && (
                  <Image
                    source={item.fotoUri}
                    style={styles.cardFoto}
                    contentFit="cover"
                    transition={200}
                  />
                )}

                <View style={styles.cardCuerpo}>
                  <View style={styles.cardFilaSuperior}>
                    <Text style={styles.cardFecha}>{formatearFecha(item.fechaHora)}</Text>
                    {renderBadgeOrigen(item.origen)}
                  </View>

                  <Text style={styles.cardLugarNombre}>
                    {lugar ? lugar.nombre : 'Lugar en Colón'}
                  </Text>

                  {item.nota && (
                    <View style={styles.notaContenedor}>
                      <Ionicons name="chatbubble-outline" size={14} color="#64748B" />
                      <Text style={styles.cardNota}>"{item.nota}"</Text>
                    </View>
                  )}

                  {/* Estado de sincronización offline (PDF Pág. 12) */}
                  <View style={styles.cardFooter}>
                    <View
                      style={[
                        styles.badgeSync,
                        item.sincronizada ? styles.badgeSyncOk : styles.badgeSyncPendiente,
                      ]}
                    >
                      <Ionicons
                        name={item.sincronizada ? 'cloud-done-outline' : 'cloud-offline-outline'}
                        size={13}
                        color={item.sincronizada ? '#16A34A' : '#D97706'}
                      />
                      <Text
                        style={[
                          styles.badgeSyncTexto,
                          { color: item.sincronizada ? '#16A34A' : '#D97706' },
                        ]}
                      >
                        {item.sincronizada ? 'Sincronizada' : 'Guardada local (offline)'}
                      </Text>
                    </View>

                    {lugar && (
                      <Pressable
                        onPress={() => router.push(`/lugar/${lugar.id}`)}
                        style={styles.btnVerLugar}
                      >
                        <Text style={styles.btnVerLugarTexto}>Ver lugar ›</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.vacioContenedor}>
            <Ionicons name="map-outline" size={54} color="#CBD5E1" />
            <Text style={styles.vacioTitulo}>Sin visitas registradas</Text>
            <Text style={styles.vacioSub}>
              Comienza a registrar los lugares que visitas mediante QR, GPS o de forma manual.
            </Text>
          </View>
        }
      />

      {/* MODAL PARA REGISTRAR VISITA */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalVentana}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Registrar Visita</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalLabel}>Selecciona el lugar visitado:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {lugares.map((lug) => {
                  const sel = lugarSeleccionado === lug.id;
                  return (
                    <Pressable
                      key={lug.id}
                      style={[styles.lugarChip, sel && styles.lugarChipActivo]}
                      onPress={() => setLugarSeleccionado(lug.id)}
                    >
                      <Text style={[styles.lugarChipTexto, sel && styles.lugarChipTextoActivo]}>
                        {lug.nombre}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.modalLabel}>Método de registro:</Text>
              <View style={styles.origenSelector}>
                {(['manual', 'qr', 'gps'] as OrigenVisita[]).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.origenBtn, origen === m && styles.origenBtnActivo]}
                    onPress={() => setOrigen(m)}
                  >
                    <Text
                      style={[
                        styles.origenBtnTexto,
                        origen === m && styles.origenBtnTextoActivo,
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.modalLabel}>Nota de tu experiencia (opcional):</Text>
              <TextInput
                style={styles.modalInputNota}
                placeholder="Escribe una breve anécdota o recuerdo..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={nota}
                onChangeText={setNota}
              />

              <BotonApp
                titulo="Guardar en Mi Recorrido"
                onPress={handleCrearVisita}
                isLoading={guardando}
                style={{ marginTop: 12 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  lista: { padding: 16, paddingBottom: 32 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoCargando: { marginTop: 12, fontSize: 15, color: '#64748B' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitulo: { fontSize: 24, fontWeight: 'bold', color: '#03045E' },
  headerSub: { fontSize: 14, color: '#64748B', marginTop: 2 },
  btnRegistrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0077B6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnRegistrarTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineEje: { width: 30, alignItems: 'center' },
  timelinePunto: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0077B6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLinea: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginTop: -2,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 6,
  },
  cardFoto: { width: '100%', height: 140 },
  cardCuerpo: { padding: 14 },
  cardFilaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardFecha: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  badgeOrigen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeOrigenTexto: { fontSize: 11, fontWeight: '700' },
  cardLugarNombre: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 6 },
  notaContenedor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  cardNota: { fontSize: 13, color: '#334155', fontStyle: 'italic', flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  badgeSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSyncOk: { backgroundColor: '#DCFCE7' },
  badgeSyncPendiente: { backgroundColor: '#FEF3C7' },
  badgeSyncTexto: { fontSize: 11, fontWeight: '700' },
  btnVerLugar: { padding: 4 },
  btnVerLugarTexto: { fontSize: 12, fontWeight: '700', color: '#0077B6' },
  vacioContenedor: { alignItems: 'center', padding: 40 },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginTop: 12 },
  vacioSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalVentana: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#03045E' },
  modalScroll: { paddingBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  lugarChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 8,
  },
  lugarChipActivo: { backgroundColor: '#0077B6' },
  lugarChipTexto: { fontSize: 13, color: '#334155', fontWeight: '600' },
  lugarChipTextoActivo: { color: '#FFFFFF' },
  origenSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  origenBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  origenBtnActivo: { backgroundColor: '#0077B6' },
  origenBtnTexto: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  origenBtnTextoActivo: { color: '#FFFFFF' },
  modalInputNota: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
  },
});

