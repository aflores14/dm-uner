// app/(tabs)/recorrido.tsx
import React, { useEffect, useState, useRef } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BotonApp } from '../../src/componentes/BotonApp';
import { useAuth } from '../../src/contexto/AuthContext';
import { obtenerLugares } from '../../src/servicios/lugares';
import { obtenerVisitas, registrarNuevaVisita } from '../../src/servicios/visitas';
import { Coordenadas, Lugar, OrigenVisita, Visita } from '../../src/tipos';
import {
  calcularDistanciaMetros,
  formatearDistancia,
  obtenerUbicacionRobusta,
} from '../../src/utilidades/geolocalizacion';

export default function RecorridoScreen() {
  const { usuario } = useAuth();
  const router = useRouter();

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);

  // Estados del modal de registro
  const [modalVisible, setModalVisible] = useState(false);
  const [pasoRegistro, setPasoRegistro] = useState<'metodo' | 'escaner' | 'formulario'>('metodo');
  const [origen, setOrigen] = useState<OrigenVisita>('manual');
  const [lugarSeleccionado, setLugarSeleccionado] = useState<Lugar | null>(null);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Permisos de Cámara
  const [permisoCamara, solicitarPermisoCamara] = useCameraPermissions();
  const escaneandoRef = useRef(false);

  // Visor de foto en pantalla completa
  const [fotoAmpliada, setFotoAmpliada] = useState<{
    uri: string;
    titulo: string;
    fecha?: string;
    nota?: string | null;
  } | null>(null);

  const cargarDatos = async () => {
    try {
      const [v, l] = await Promise.all([
        obtenerVisitas(usuario?.id),
        obtenerLugares(),
      ]);
      setVisitas(v);
      setLugares(l);
    } catch (e) {
      console.error('Error cargando recorrido:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();

    // Obtener ubicación GPS instantánea con tolerancia
    obtenerUbicacionRobusta().then((coords) => {
      if (coords) {
        setUbicacionUsuario(coords);
      }
    });
  }, [usuario?.id]);

  const abrirModalRegistro = () => {
    setPasoRegistro('metodo');
    setLugarSeleccionado(null);
    setFotoUri(null);
    setNota('');
    escaneandoRef.current = false;
    setModalVisible(true);
  };

  // =========================================================================
  // MÉTODO 1: ESCANEO DE CÓDIGO QR CON SEGURIDAD Y VALIDACIÓN
  // =========================================================================
  const iniciarEscaneoQR = async () => {
    if (!permisoCamara?.granted) {
      const { granted } = await solicitarPermisoCamara();
      if (!granted) {
        Alert.alert(
          'Permiso necesario',
          'La app necesita acceso a la cámara para escanear el código QR del cartel.'
        );
        return;
      }
    }
    escaneandoRef.current = false;
    setOrigen('qr');
    setPasoRegistro('escaner');
  };

  const handleBarcodeScanned = (data: string) => {
    if (escaneandoRef.current) return;
    escaneandoRef.current = true;

    // Validación estricta del formato QR de Colón: "COLON:lug-xxx"
    if (typeof data === 'string' && data.startsWith('COLON:')) {
      const lugarEncontrado = lugares.find(
        (l) => l.codigoQr === data || data.includes(l.id)
      );

      if (lugarEncontrado) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLugarSeleccionado(lugarEncontrado);
        setPasoRegistro('formulario');
        return;
      }
    }

    // Si el QR está roto, es de otra cosa o ajeno: NO romperse ni colgarse
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Código QR no reconocido',
      'Este código no pertenece al circuito turístico oficial de Colón o se encuentra dañado.',
      [
        {
          text: 'Reintentar',
          onPress: () => {
            escaneandoRef.current = false;
          },
        },
        {
          text: 'Cargar a mano',
          onPress: () => {
            setOrigen('manual');
            setPasoRegistro('formulario');
          },
        },
      ]
    );
  };

  // =========================================================================
  // MÉTODO 2: REGISTRO POR CERCANÍA FÍSICA (GPS)
  // =========================================================================
  const iniciarRegistroPorGps = (lugar: Lugar) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOrigen('gps');
    setLugarSeleccionado(lugar);
    setPasoRegistro('formulario');
  };

  // =========================================================================
  // MÉTODO 3: CARGA MANUAL
  // =========================================================================
  const iniciarRegistroManual = (lugar?: Lugar) => {
    setOrigen('manual');
    if (lugar) setLugarSeleccionado(lugar);
    setPasoRegistro('formulario');
  };

  // =========================================================================
  // CAPTURA O SELECCIÓN DE FOTO (expo-camera & expo-image-picker)
  // =========================================================================
  const tomarFotoConCamara = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Se necesita permiso de cámara para tomar una foto de tu visita.'
        );
        return;
      }
      // allowsEditing: false evita que Android abra el crop intent que mata el proceso de Expo Go
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        allowsEditing: false,
      });
      if (!res.canceled && res.assets && res.assets.length > 0 && res.assets[0]?.uri) {
        setFotoUri(res.assets[0].uri);
        Haptics.selectionAsync();
      }
    } catch (e) {
      console.log('Error tomando foto:', e);
      Alert.alert(
        'Aviso',
        'No se pudo acceder a la cámara nativa. Puedes seleccionar una foto de tu galería.'
      );
    }
  };

  const seleccionarFotoGaleria = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Se necesita permiso para acceder a tu galería de fotos.'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        allowsEditing: false,
      });
      if (!res.canceled && res.assets && res.assets.length > 0 && res.assets[0]?.uri) {
        setFotoUri(res.assets[0].uri);
        Haptics.selectionAsync();
      }
    } catch (e) {
      console.log('Error eligiendo foto de galería:', e);
    }
  };

  // =========================================================================
  // GUARDAR VISITA
  // =========================================================================
  const handleGuardarVisita = async () => {
    if (!lugarSeleccionado) {
      Alert.alert('Atención', 'Por favor selecciona un lugar para registrar la visita.');
      return;
    }

    setGuardando(true);
    try {
      const nueva = await registrarNuevaVisita({
        usuarioId: usuario?.id || 'usr-201',
        lugarId: lugarSeleccionado.id,
        fechaHora: new Date().toISOString(),
        origen: origen,
        fotoUri: fotoUri || lugarSeleccionado.imagenes[0] || null,
        nota: nota.trim() || null,
      });

      // Feedback háptico obligatorio al registrar visita (PDF Pág. 5)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setVisitas([nueva, ...visitas]);
      setModalVisible(false);

      Alert.alert(
        '¡Visita Registrada!',
        `Registraste tu visita en "${lugarSeleccionado.nombre}". La visita quedó guardada en tu dispositivo (cola offline).`
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la visita.');
    } finally {
      setGuardando(false);
    }
  };

  // Ordenar lugares cercanos si hay GPS
  const lugaresCercanosGps = ubicacionUsuario
    ? [...lugares]
        .map((l) => ({
          lugar: l,
          dist: calcularDistanciaMetros(ubicacionUsuario, l.coordenadas),
        }))
        .sort((a, b) => a.dist - b.dist)
    : [];

  const getLugarInfo = (lugarId: string) => lugares.find((l) => l.id === lugarId);

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

  const renderBadgeOrigen = (orig: OrigenVisita) => {
    switch (orig) {
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
                {usuario ? `Bitácora de ${usuario.nombre}` : 'Bitácora de visitas a Colón'}
              </Text>
            </View>
            <Pressable style={styles.btnRegistrar} onPress={abrirModalRegistro}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.btnRegistrarTexto}>Registrar</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const lugar = getLugarInfo(item.lugarId);

          return (
            <View style={styles.timelineItem}>
              <View style={styles.timelineEje}>
                <View style={styles.timelinePunto}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
                <View style={styles.timelineLinea} />
              </View>

              <View style={styles.card}>
                {item.fotoUri && (
                  <Pressable
                    style={styles.cardFotoContenedor}
                    onPress={() =>
                      setFotoAmpliada({
                        uri: item.fotoUri!,
                        titulo: lugar ? lugar.nombre : 'Visita en Colón',
                        fecha: formatearFecha(item.fechaHora),
                        nota: item.nota,
                      })
                    }
                  >
                    <Image
                      source={item.fotoUri}
                      style={styles.cardFoto}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.badgeAmpliarFoto}>
                      <Ionicons name="expand" size={13} color="#FFFFFF" />
                      <Text style={styles.badgeAmpliarTexto}>Tocar para ampliar</Text>
                    </View>
                  </Pressable>
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

                  {/* Estado de sincronización offline (Pág. 12) */}
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
            <Ionicons name="camera-outline" size={54} color="#CBD5E1" />
            <Text style={styles.vacioTitulo}>Sin visitas registradas</Text>
            <Text style={styles.vacioSub}>
              Escanea el QR de los carteles de Colón, confirma por cercanía GPS o carga tu visita a mano.
            </Text>
          </View>
        }
      />

      {/* ===================================================================== */}
      {/* MODAL DE REGISTRO DE VISITA */}
      {/* ===================================================================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalVentana}>
            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {pasoRegistro === 'metodo'
                  ? '¿Cómo deseas registrar la visita?'
                  : pasoRegistro === 'escaner'
                  ? 'Escanear QR del Cartel'
                  : 'Detalles de la Visita'}
              </Text>
              <Pressable
                onPress={() => {
                  if (pasoRegistro !== 'metodo') {
                    setPasoRegistro('metodo');
                  } else {
                    setModalVisible(false);
                  }
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </Pressable>
            </View>

            {/* PASO 1: SELECCIÓN DEL MÉTODO */}
            {pasoRegistro === 'metodo' && (
              <ScrollView contentContainerStyle={styles.metodosContenedor}>
                {/* Opción 1: Escanear QR */}
                <Pressable style={styles.metodoCard} onPress={iniciarEscaneoQR}>
                  <View style={[styles.metodoIcono, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="qr-code" size={26} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metodoTitulo}>Escanear código QR del cartel</Text>
                    <Text style={styles.metodoDesc}>
                      Apunta con la cámara al cartel turístico en el lugar.
                    </Text>
                  </View>
                </Pressable>

                {/* Opción 2: Físicamente cerca (GPS) */}
                {lugaresCercanosGps.length > 0 && lugaresCercanosGps[0].dist < 500 && (
                  <View style={styles.cercaniaBox}>
                    <Text style={styles.cercaniaHeader}>Lugares detectados cerca de ti:</Text>
                    {lugaresCercanosGps.slice(0, 2).map(({ lugar, dist }) => (
                      <Pressable
                        key={lugar.id}
                        style={styles.lugarCercaFila}
                        onPress={() => iniciarRegistroPorGps(lugar)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lugarCercaNombre}>{lugar.nombre}</Text>
                          <Text style={styles.lugarCercaDist}>A {formatearDistancia(dist)}</Text>
                        </View>
                        <View style={styles.btnEstoyAqui}>
                          <Text style={styles.btnEstoyAquiTexto}>Estoy acá</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Opción 3: Carga Manual */}
                <Pressable
                  style={styles.metodoCard}
                  onPress={() => iniciarRegistroManual()}
                >
                  <View style={[styles.metodoIcono, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="create" size={26} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metodoTitulo}>Cargar visita a mano</Text>
                    <Text style={styles.metodoDesc}>
                      Elige el lugar del catálogo y escribe tus notas.
                    </Text>
                  </View>
                </Pressable>
              </ScrollView>
            )}

            {/* PASO 2: ESCÁNER QR */}
            {pasoRegistro === 'escaner' && (
              <View style={styles.escanerContenedor}>
                <CameraView
                  style={styles.camaraView}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={(result) => handleBarcodeScanned(result.data)}
                >
                  <View style={styles.marcoQr}>
                    <View style={styles.esquinaQr} />
                  </View>
                </CameraView>
                <Text style={styles.escanerAyuda}>
                  Apunta al código QR del cartel oficial de Colón (COLON:lug-xxx).
                </Text>
              </View>
            )}

            {/* PASO 3: FORMULARIO DE DETALLES (LUGAR, FOTO, NOTA) */}
            {pasoRegistro === 'formulario' && (
              <ScrollView contentContainerStyle={styles.formularioScroll}>
                {/* Lugar seleccionado o selector si fue manual */}
                <Text style={styles.modalLabel}>Lugar visitado:</Text>
                {lugarSeleccionado ? (
                  <View style={styles.lugarSeleccionadoCard}>
                    <Ionicons name="location" size={20} color="#0077B6" />
                    <Text style={styles.lugarSeleccionadoTexto}>
                      {lugarSeleccionado.nombre}
                    </Text>
                    <Pressable
                      onPress={() => setLugarSeleccionado(null)}
                      style={{ marginLeft: 'auto' }}
                    >
                      <Text style={{ color: '#0077B6', fontSize: 13, fontWeight: 'bold' }}>
                        Cambiar
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {lugares.map((lug) => (
                      <Pressable
                        key={lug.id}
                        style={styles.lugarChip}
                        onPress={() => setLugarSeleccionado(lug)}
                      >
                        <Text style={styles.lugarChipTexto}>{lug.nombre}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}

                {/* Foto de la visita (sacar o elegir) */}
                <Text style={styles.modalLabel}>Foto de tu visita:</Text>
                {fotoUri ? (
                  <View style={styles.fotoPreviewContenedor}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() =>
                        setFotoAmpliada({
                          uri: fotoUri,
                          titulo: lugarSeleccionado?.nombre || 'Foto de visita',
                          nota: nota || undefined,
                        })
                      }
                    >
                      <Image source={fotoUri} style={styles.fotoPreview} contentFit="cover" />
                      <View style={styles.badgeAmpliarFoto}>
                        <Ionicons name="expand" size={13} color="#FFFFFF" />
                        <Text style={styles.badgeAmpliarTexto}>Tocar para ampliar</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={styles.btnQuitarFoto}
                      onPress={() => setFotoUri(null)}
                    >
                      <Ionicons name="trash" size={18} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.botonesFotoFila}>
                    <Pressable style={styles.btnFoto} onPress={tomarFotoConCamara}>
                      <Ionicons name="camera" size={20} color="#0077B6" />
                      <Text style={styles.btnFotoTexto}>Sacar foto</Text>
                    </Pressable>
                    <Pressable style={styles.btnFoto} onPress={seleccionarFotoGaleria}>
                      <Ionicons name="images" size={20} color="#0077B6" />
                      <Text style={styles.btnFotoTexto}>De galería</Text>
                    </Pressable>
                  </View>
                )}

                {/* Nota corta */}
                <Text style={styles.modalLabel}>Nota de recuerdo (opcional):</Text>
                <TextInput
                  style={styles.inputNota}
                  placeholder="Escribe cómo fue tu experiencia..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={nota}
                  onChangeText={setNota}
                />

                <BotonApp
                  titulo="Guardar Visita en Mi Recorrido"
                  onPress={handleGuardarVisita}
                  isLoading={guardando}
                  style={{ marginTop: 14 }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL PARA VER FOTO EN DETALLE / PANTALLA COMPLETA */}
      <Modal
        visible={Boolean(fotoAmpliada)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFotoAmpliada(null)}
      >
        <View style={styles.visorFotoFondo}>
          <Pressable
            style={styles.visorFotoCerrar}
            onPress={() => setFotoAmpliada(null)}
            accessibilityLabel="Cerrar foto ampliada"
          >
            <Ionicons name="close-circle" size={38} color="#FFFFFF" />
          </Pressable>

          {fotoAmpliada && (
            <View style={styles.visorFotoContenido}>
              <Image
                source={fotoAmpliada.uri}
                style={styles.visorFotoImagen}
                contentFit="contain"
              />
              <View style={styles.visorFotoPie}>
                <Text style={styles.visorFotoTitulo}>{fotoAmpliada.titulo}</Text>
                {fotoAmpliada.fecha && (
                  <Text style={styles.visorFotoFecha}>{fotoAmpliada.fecha}</Text>
                )}
                {fotoAmpliada.nota && (
                  <Text style={styles.visorFotoNota}>"{fotoAmpliada.nota}"</Text>
                )}
              </View>
            </View>
          )}
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnRegistrarTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
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
  timelineLinea: { width: 2, flex: 1, backgroundColor: '#CBD5E1', marginTop: -2 },
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
  cardFoto: { width: '100%', height: 160 },
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#03045E', flex: 1 },
  metodosContenedor: { paddingBottom: 20, gap: 12 },
  metodoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    gap: 12,
  },
  metodoIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metodoTitulo: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  metodoDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cercaniaBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
  },
  cercaniaHeader: { fontSize: 13, fontWeight: '700', color: '#0284C7', marginBottom: 8 },
  lugarCercaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#BAE6FD',
  },
  lugarCercaNombre: { fontSize: 14, fontWeight: 'bold', color: '#03045E' },
  lugarCercaDist: { fontSize: 12, color: '#0284C7' },
  btnEstoyAqui: {
    backgroundColor: '#0077B6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnEstoyAquiTexto: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  escanerContenedor: { height: 320, alignItems: 'center' },
  camaraView: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcoQr: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  esquinaQr: {},
  escanerAyuda: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 10 },
  formularioScroll: { paddingBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 10 },
  lugarSeleccionadoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  lugarSeleccionadoTexto: { fontSize: 15, fontWeight: 'bold', color: '#03045E' },
  lugarChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginRight: 8,
  },
  lugarChipTexto: { fontSize: 13, color: '#334155', fontWeight: '600' },
  botonesFotoFila: { flexDirection: 'row', gap: 10 },
  btnFoto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnFotoTexto: { fontSize: 13, fontWeight: '700', color: '#0077B6' },
  fotoPreviewContenedor: { position: 'relative', borderRadius: 10, overflow: 'hidden' },
  fotoPreview: { width: '100%', height: 160 },
  btnQuitarFoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    padding: 6,
    borderRadius: 16,
  },
  inputNota: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 70,
  },
  cardFotoContenedor: {
    position: 'relative',
    width: '100%',
    height: 170,
  },
  badgeAmpliarFoto: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAmpliarTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  visorFotoFondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  visorFotoCerrar: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 6,
  },
  visorFotoContenido: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  visorFotoImagen: {
    width: '100%',
    height: '75%',
    borderRadius: 12,
  },
  visorFotoPie: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  visorFotoTitulo: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  visorFotoFecha: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  visorFotoNota: {
    color: '#E2E8F0',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
