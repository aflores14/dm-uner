// src/servicios/visitas.ts
import * as SecureStore from 'expo-secure-store';
import { Visita } from '../tipos';

const VISITAS_STORAGE_KEY = 'turismo_visitas_locales_v1';

const VISITAS_MOCK_INICIAL: Visita[] = [
  {
    id: 'vis-311',
    usuarioId: 'usr-201',
    lugarId: 'lug-004', // Molino Forclaz
    fechaHora: '2026-11-02T16:42:00-03:00',
    origen: 'qr',
    fotoUri: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    nota: 'Increíble historia del molino y los colonos suizos. Hacía 32 grados pero corría linda brisa.',
    sincronizada: false, // Cola offline según requerimiento pág. 12
  },
  {
    id: 'vis-312',
    usuarioId: 'usr-201',
    lugarId: 'lug-001', // Termas de Colón
    fechaHora: '2026-11-01T11:15:00-03:00',
    origen: 'gps',
    fotoUri: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80',
    nota: 'Tarde de relax en las piscinas con vista al río Uruguay.',
    sincronizada: true,
  },
];

export const obtenerVisitas = async (): Promise<Visita[]> => {
  try {
    const raw = await SecureStore.getItemAsync(VISITAS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error leyendo visitas locales:', e);
  }
  // Si no hay datos previos, inicializamos con los mocks
  await SecureStore.setItemAsync(VISITAS_STORAGE_KEY, JSON.stringify(VISITAS_MOCK_INICIAL));
  return VISITAS_MOCK_INICIAL;
};

export const registrarNuevaVisita = async (
  nueva: Omit<Visita, 'id' | 'sincronizada'>
): Promise<Visita> => {
  const actuales = await obtenerVisitas();
  const visitaCreada: Visita = {
    ...nueva,
    id: `vis-${Date.now()}`,
    sincronizada: false, // Se guarda primero localmente sin conexión
  };

  const listaActualizada = [visitaCreada, ...actuales];
  try {
    await SecureStore.setItemAsync(VISITAS_STORAGE_KEY, JSON.stringify(listaActualizada));
  } catch (e) {
    console.error('Error guardando visita:', e);
  }

  return visitaCreada;
};

