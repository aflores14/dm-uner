// app/(tabs)/perfil.tsx
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BotonApp } from '../../src/componentes/BotonApp';
import { useAuth } from '../../src/contexto/AuthContext';
import { obtenerLugares } from '../../src/servicios/lugares';
import { Lugar } from '../../src/tipos';

// Esquema de validación estricto según la cátedra
const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  contrasena: z.string().min(5, 'Mínimo 5 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    usuario,
    estaAutenticado,
    favoritosIds,
    iniciarSesion,
    iniciarConBiometria,
    cerrarSesion,
    soportaBiometria,
    biometriaHabilitada,
    toggleBiometria,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [lugaresFavoritos, setLugaresFavoritos] = useState<Lugar[]>([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit', // Requerimiento cátedra
    defaultValues: {
      email: 'lucia@mail.com', // Valor por defecto de prueba sugerido por la cátedra
      contrasena: '123456',
    },
  });

  // Sincronizar lista de lugares cada vez que cambien los IDs del contexto global
  useEffect(() => {
    if (!estaAutenticado || favoritosIds.length === 0) {
      setLugaresFavoritos([]);
      return;
    }
    obtenerLugares().then((todos) => {
      setLugaresFavoritos(todos.filter((l) => favoritosIds.includes(l.id)));
    });
  }, [favoritosIds, estaAutenticado]);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const resultado = await iniciarSesion(data.email, data.contrasena);
    setLoading(false);

    if (resultado.ok) {
      reset();
      Alert.alert('¡Bienvenido!', `Sesión iniciada con éxito.`);
    } else {
      Alert.alert('Error de acceso', resultado.error || 'Credenciales inválidas');
    }
  };

  const handleIngresoBiometrico = async () => {
    const res = await iniciarConBiometria();
    if (res.ok) {
      Alert.alert('Éxito', 'Acceso biométrico concedido.');
    } else if (res.error) {
      Alert.alert('Aviso', res.error);
    }
  };

  const handleCerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await cerrarSesion();
            setLugaresFavoritos([]);
          },
        },
      ]
    );
  };

  // ========================================================================
  // VISTA 1: USUARIO AUTENTICADO
  // ========================================================================
  if (estaAutenticado && usuario) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Tarjeta de Encabezado de Perfil */}
          <View style={styles.perfilCard}>
            <View style={styles.avatarContenedor}>
              <Text style={styles.avatarIniciales}>
                {usuario.nombre
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>

            <Text style={styles.perfilNombre}>{usuario.nombre}</Text>
            <Text style={styles.perfilEmail}>{usuario.email}</Text>

            <View style={styles.badgeSesion}>
              <View style={styles.puntoVerde} />
              <Text style={styles.badgeSesionTexto}>Sesión activa</Text>
            </View>
          </View>

          {/* Seguridad y Biometría (expo-local-authentication) */}
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <Ionicons name="finger-print-outline" size={20} color="#0077B6" />
              <Text style={styles.seccionTitulo}>Seguridad y Reingreso</Text>
            </View>

            <View style={styles.opcionFila}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.opcionTexto}>Ingreso biométrico</Text>
                <Text style={styles.opcionSubtexto}>
                  {soportaBiometria
                    ? 'Reingreso rápido con huella o rostro'
                    : 'Biometría no disponible en este dispositivo'}
                </Text>
              </View>
              {soportaBiometria && (
                <Switch
                  value={biometriaHabilitada}
                  onValueChange={toggleBiometria}
                  trackColor={{ false: '#CBD5E1', true: '#90E0EF' }}
                  thumbColor={biometriaHabilitada ? '#0077B6' : '#F1F5F9'}
                />
              )}
            </View>
          </View>

          {/* Preferencias (PDF Pág. 10 y 11) */}
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <Ionicons name="options-outline" size={20} color="#0077B6" />
              <Text style={styles.seccionTitulo}>Preferencias del Turista</Text>
            </View>

            <View style={styles.datoFila}>
              <Text style={styles.datoEtiqueta}>Avisos de proximidad:</Text>
              <Text style={styles.datoValor}>
                {usuario.preferencias.avisarProximidad
                  ? `Sí (a menos de ${usuario.preferencias.radioAvisoMetros}m)`
                  : 'Desactivados'}
              </Text>
            </View>

            <View style={styles.datoFila}>
              <Text style={styles.datoEtiqueta}>Tema visual:</Text>
              <Text style={styles.datoValor}>{usuario.preferencias.tema}</Text>
            </View>

            <View style={{ marginTop: 8 }}>
              <Text style={styles.datoEtiqueta}>Categorías favoritas:</Text>
              <View style={styles.chipsContainer}>
                {usuario.preferencias.categoriasFavoritas.map((cat) => (
                  <View key={cat} style={styles.chipPref}>
                    <Text style={styles.chipPrefTexto}>
                      {cat.replace('cat-', '').toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Mis Lugares Favoritos */}
          <View style={styles.seccionCard}>
            <View style={styles.seccionHeader}>
              <Ionicons name="star" size={20} color="#FFB703" />
              <Text style={styles.seccionTitulo}>
                Mis Favoritos ({lugaresFavoritos.length})
              </Text>
            </View>

            {lugaresFavoritos.length === 0 ? (
              <View style={styles.favoritosVacios}>
                <Ionicons name="star-outline" size={32} color="#CBD5E1" />
                <Text style={styles.favoritosVaciosTexto}>
                  Aún no has guardado lugares favoritos.
                </Text>
                <Text style={styles.favoritosVaciosSub}>
                  Toca la estrella en el detalle de cualquier lugar para guardarlo aquí.
                </Text>
              </View>
            ) : (
              <FlatList
                data={lugaresFavoritos}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.favItem}
                    onPress={() => router.push(`/lugar/${item.id}`)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.favItemNombre}>{item.nombre}</Text>
                      <Text style={styles.favItemDesc} numberOfLines={1}>
                        {item.direccion}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </Pressable>
                )}
              />
            )}
          </View>

          {/* Botón de Cerrar Sesión */}
          <Pressable style={styles.btnCerrarSesion} onPress={handleCerrarSesion}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.btnCerrarSesionTexto}>Cerrar Sesión</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ========================================================================
  // VISTA 2: INVITADO / FORMULARIO DE INGRESO
  // ========================================================================
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Ingreso Turista</Text>

          {/* Banner informativo según PDF Pág. 3 */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={22} color="#0077B6" />
            <Text style={styles.infoBannerTexto}>
              Para consultar el mapa y los lugares no necesitas cuenta. La cuenta te
              permite guardar favoritos y sincronizar tu recorrido.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="ejemplo@mail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              )}
            />
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <Controller
              control={control}
              name="contrasena"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.contrasena && styles.inputError]}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="********"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                />
              )}
            />
            {errors.contrasena && (
              <Text style={styles.error}>{errors.contrasena.message}</Text>
            )}
          </View>

          <BotonApp
            titulo="Ingresar"
            onPress={handleSubmit(onSubmit)}
            isLoading={loading}
            style={styles.boton}
          />

          {/* Botón de ingreso con Biometría (si está disponible) */}
          {soportaBiometria && (
            <Pressable
              style={styles.btnBiometria}
              onPress={handleIngresoBiometrico}
            >
              <Ionicons name="finger-print" size={22} color="#0077B6" />
              <Text style={styles.btnBiometriaTexto}>Ingresar con Huella / Rostro</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, flexGrow: 1, paddingBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#03045E',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    gap: 10,
  },
  infoBannerTexto: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
  formGroup: { marginBottom: 18 },
  label: { fontSize: 14, color: '#03045E', fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  inputError: { borderColor: '#DC2626' },
  error: { color: '#DC2626', fontSize: 12, marginTop: 4 },
  boton: { marginTop: 10 },
  btnBiometria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0077B6',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 16,
    gap: 8,
  },
  btnBiometriaTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0077B6',
  },
  // Estilos perfil autenticado
  perfilCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  avatarContenedor: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0077B6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarIniciales: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  perfilNombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#03045E',
  },
  perfilEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  badgeSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
    gap: 6,
  },
  puntoVerde: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  badgeSesionTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  seccionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  opcionFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opcionTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  opcionSubtexto: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  datoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  datoEtiqueta: {
    fontSize: 14,
    color: '#64748B',
  },
  datoValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chipPref: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipPrefTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  favoritosVacios: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  favoritosVaciosTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  favoritosVaciosSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  favItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  favItemNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  favItemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  btnCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
  },
  btnCerrarSesionTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
