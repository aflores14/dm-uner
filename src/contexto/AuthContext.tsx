// src/contexto/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { clienteHttp, TOKEN_KEY, USUARIO_KEY } from '../servicios/cliente';
import { Usuario } from '../tipos';

const BIOMETRIA_KEY = 'biometria_habilitada_v1';

// Usuario mock oficial del PDF (pág. 10 y 11)
const USUARIO_MOCK_DEFECTO: Usuario = {
  id: 'usr-201',
  nombre: 'Lucía Méndez',
  email: 'lucia@mail.com',
  avatarUrl: null,
  creadoEn: '2026-09-02T18:20:00-03:00',
  preferencias: {
    categoriasFavoritas: ['cat-museos', 'cat-playas'],
    avisarProximidad: true,
    radioAvisoMetros: 250,
    tema: 'sistema',
  },
};

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  estaAutenticado: boolean;
  cargando: boolean;
  soportaBiometria: boolean;
  biometriaHabilitada: boolean;
  iniciarSesion: (email: string, contrasena: string) => Promise<{ ok: boolean; error?: string }>;
  iniciarConBiometria: () => Promise<{ ok: boolean; error?: string }>;
  cerrarSesion: () => Promise<void>;
  toggleBiometria: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [soportaBiometria, setSoportaBiometria] = useState(false);
  const [biometriaHabilitada, setBiometriaHabilitada] = useState(false);

  // 1. Cargar sesión guardada y chequear biometría del hardware al iniciar
  useEffect(() => {
    (async () => {
      try {
        // Verificar capacidades biométricas del dispositivo
        const tieneHardware = await LocalAuthentication.hasHardwareAsync();
        const estaEnrolado = await LocalAuthentication.isEnrolledAsync();
        setSoportaBiometria(tieneHardware && estaEnrolado);

        // Verificar preferencia de biometría
        const bioGuardada = await SecureStore.getItemAsync(BIOMETRIA_KEY);
        setBiometriaHabilitada(bioGuardada === 'true');

        // Restaurar token y usuario si existen
        const tokenGuardado = await SecureStore.getItemAsync(TOKEN_KEY);
        const usuarioGuardado = await SecureStore.getItemAsync(USUARIO_KEY);

        if (tokenGuardado && usuarioGuardado) {
          setToken(tokenGuardado);
          setUsuario(JSON.parse(usuarioGuardado));
        }
      } catch (e) {
        console.error('Error restaurando sesión:', e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  // 2. Iniciar sesión con email y contraseña
  const iniciarSesion = async (email: string, contrasena: string) => {
    try {
      let nuevoToken = '';
      let nuevoUsuario: Usuario = {
        ...USUARIO_MOCK_DEFECTO,
        email: email,
        nombre: email.split('@')[0],
      };

      try {
        // Intentar conectar con la API si estuviera disponible
        const res = await clienteHttp.post('/auth/ingreso', { email, contrasena });
        if (res.data?.datos?.token) {
          nuevoToken = res.data.datos.token;
          if (res.data.datos.usuario) {
            nuevoUsuario = res.data.datos.usuario;
          }
        }
      } catch (_apiError) {
        // Fallback a autenticación mock local (según regla pág. 6 del PDF)
        nuevoToken = `token-jwt-mock-${Date.now()}`;
        if (email.toLowerCase() === 'lucia@mail.com') {
          nuevoUsuario = USUARIO_MOCK_DEFECTO;
        }
      }

      // Guardar en SecureStore
      await SecureStore.setItemAsync(TOKEN_KEY, nuevoToken);
      await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(nuevoUsuario));

      setToken(nuevoToken);
      setUsuario(nuevoUsuario);

      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error al iniciar sesión' };
    }
  };

  // 3. Reingreso rápido con Huella o Rostro (expo-local-authentication)
  const iniciarConBiometria = async () => {
    try {
      if (!soportaBiometria) {
        return { ok: false, error: 'El dispositivo no cuenta con biometría configurada' };
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ingreso a Mi Ciudad Colón',
        fallbackLabel: 'Usar contraseña',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (res.success) {
        // Si la biometría es exitosa, restauramos la sesión mock o existente
        const tokenGuardado = (await SecureStore.getItemAsync(TOKEN_KEY)) || `token-bio-${Date.now()}`;
        const usuarioGuardado = await SecureStore.getItemAsync(USUARIO_KEY);
        const usr = usuarioGuardado ? JSON.parse(usuarioGuardado) : USUARIO_MOCK_DEFECTO;

        await SecureStore.setItemAsync(TOKEN_KEY, tokenGuardado);
        await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usr));

        setToken(tokenGuardado);
        setUsuario(usr);
        return { ok: true };
      } else {
        return { ok: false, error: 'Autenticación biométrica no completada' };
      }
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error biométrico' };
    }
  };

  // 4. Habilitar o deshabilitar ingreso biométrico
  const toggleBiometria = async () => {
    const nuevoValor = !biometriaHabilitada;
    setBiometriaHabilitada(nuevoValor);
    await SecureStore.setItemAsync(BIOMETRIA_KEY, nuevoValor ? 'true' : 'false');
  };

  // 5. Cerrar sesión
  const cerrarSesion = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USUARIO_KEY);
      setToken(null);
      setUsuario(null);
    } catch (e) {
      console.error('Error cerrando sesión:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        estaAutenticado: Boolean(token && usuario),
        cargando,
        soportaBiometria,
        biometriaHabilitada,
        iniciarSesion,
        iniciarConBiometria,
        cerrarSesion,
        toggleBiometria,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

