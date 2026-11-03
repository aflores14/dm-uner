// src/mocks/eventosMock.ts
import { Evento } from '../tipos';

export const EVENTOS_MOCK: Evento[] = [
  {
    id: 'evt-001',
    titulo: 'Peña Folclórica en el Anfiteatro',
    descripcion: 'Noche de música folclórica litoraleña, chamamé y danzas tradicionales con destacados artistas locales y provinciales. Habrá servicio de cantina con empanadas típicas entrerrianas.',
    lugarId: null,
    direccionLibre: 'Anfiteatro del Parque Quirós, Costanera Norte',
    coordenadas: { latitud: -32.2212, longitud: -58.1325 },
    inicio: '2026-11-03T21:00:00-03:00', // Hoy
    fin: '2026-11-04T02:00:00-03:00',
    imagenUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    precio: 0, // Gratis
    estado: 'programado',
  },
  {
    id: 'evt-002',
    titulo: 'Visita Nocturna Teatralizada en Molino Forclaz',
    descripcion: 'Recorrido a la luz de las velas y faroles guiado por personajes de época que reviven la epopeya de las familias colonas del siglo XIX. Se recomienda llevar calzado cómodo.',
    lugarId: 'lug-004',
    direccionLibre: null,
    coordenadas: null,
    inicio: '2026-11-04T20:30:00-03:00', // Mañana
    fin: '2026-11-04T22:30:00-03:00',
    imagenUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
    precio: 2500,
    estado: 'programado',
  },
  {
    id: 'evt-003',
    titulo: 'Avistaje de Aves al Amanecer en El Palmar',
    descripcion: 'Caminata ornitológica por senderos de selva en galería y pastizal. Actividad suspendida en caso de precipitaciones intensas.',
    lugarId: 'lug-005',
    direccionLibre: null,
    coordenadas: null,
    inicio: '2026-11-05T06:30:00-03:00',
    fin: '2026-11-05T10:00:00-03:00',
    imagenUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    precio: 0,
    estado: 'suspendido', // Caso de prueba según PDF: "suspendido por lluvia"
  },
  {
    id: 'evt-004',
    titulo: 'Feria del Libro y de las Artes',
    descripcion: 'Exposición editorial, presentaciones de libros entrerrianos, talleres literarios para niños e intervenciones de plástica en vivo.',
    lugarId: 'lug-003',
    direccionLibre: null,
    coordenadas: null,
    inicio: '2026-11-06T18:00:00-03:00',
    fin: '2026-11-06T22:00:00-03:00',
    imagenUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    precio: 0,
    estado: 'programado',
  },
];

