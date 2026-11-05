// src/servicios/visitas.ts
import { Visita } from '../tipos';
import { guardarVisitaDb, obtenerVisitasDb } from './database';

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

export const obtenerVisitas = async (usuarioId?: string): Promise<Visita[]> => {
  let visitas = await obtenerVisitasDb(usuarioId);
  if (visitas.length === 0) {
    // Inicializar con visitas de prueba
    for (const v of VISITAS_MOCK_INICIAL) {
      await guardarVisitaDb(v);
    }
    visitas = await obtenerVisitasDb(usuarioId);
  }
  return visitas;
};

export const registrarNuevaVisita = async (
  nueva: Omit<Visita, 'id' | 'sincronizada'>
): Promise<Visita> => {
  const visitaCreada: Visita = {
    ...nueva,
    id: `vis-${Date.now()}`,
    sincronizada: false, // Se guarda primero localmente en cola offline
  };

  await guardarVisitaDb(visitaCreada);
  return visitaCreada;
};
