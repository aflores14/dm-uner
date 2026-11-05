// src/servicios/lugares.ts
import { ApiResponse, Categoria, Lugar } from '../tipos';
import { CATEGORIAS_MOCK, LUGARES_MOCK } from '../mocks/lugaresMock';
import { clienteHttp } from './cliente';
import { cachearLugaresDb, obtenerLugaresCacheDb } from './database';

// Función auxiliar para normalizar texto (quitar acentos y minúsculas)
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const obtenerLugares = async (categoriaId?: string, busqueda?: string): Promise<Lugar[]> => {
  let baseLugares: Lugar[] = [];

  try {
    const params = new URLSearchParams();
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (busqueda) params.append('q', busqueda);

    const queryString = params.toString();
    const url = queryString ? `/lugares?${queryString}` : '/lugares';

    const { data } = await clienteHttp.get<ApiResponse<Lugar[]>>(url);
    if (data?.datos && data.datos.length > 0) {
      baseLugares = data.datos;
      // Guardar en SQLite de fondo para modo sin conexión
      cachearLugaresDb(baseLugares);
      return baseLugares;
    }
  } catch (_error) {
    // Si la API remota no está levantada o falla la conexión, intentamos leer de SQLite
    baseLugares = await obtenerLugaresCacheDb();
    if (baseLugares.length === 0) {
      baseLugares = LUGARES_MOCK;
      cachearLugaresDb(baseLugares);
    }
  }

  // Filtrado local
  let filtrados = baseLugares.filter((lugar) => lugar.activo);

  if (categoriaId) {
    filtrados = filtrados.filter((lugar) => lugar.categoriaId === categoriaId);
  }

  if (busqueda && busqueda.trim().length > 0) {
    const q = normalizar(busqueda.trim());
    filtrados = filtrados.filter((lugar) => {
      const nombreMatch = normalizar(lugar.nombre).includes(q);
      const descCortaMatch = normalizar(lugar.descripcionCorta).includes(q);
      const descMatch = normalizar(lugar.descripcion).includes(q);
      const dirMatch = normalizar(lugar.direccion).includes(q);
      return nombreMatch || descCortaMatch || descMatch || dirMatch;
    });
  }

  return filtrados;
};

export const obtenerCategorias = async (): Promise<Categoria[]> => {
  try {
    const { data } = await clienteHttp.get<ApiResponse<Categoria[]>>('/categorias');
    if (data?.datos && data.datos.length > 0) {
      return data.datos.sort((a, b) => a.orden - b.orden);
    }
    throw new Error('Respuesta inválida de categorías');
  } catch (_error) {
    return [...CATEGORIAS_MOCK].sort((a, b) => a.orden - b.orden);
  }
};

export const obtenerLugarPorId = async (id: string): Promise<Lugar | null> => {
  try {
    const { data } = await clienteHttp.get<ApiResponse<Lugar>>(`/lugares/${id}`);
    if (data?.datos) {
      return data.datos;
    }
    throw new Error('Lugar no encontrado en API');
  } catch (_error) {
    const cacheados = await obtenerLugaresCacheDb();
    const deCache = cacheados.find((l) => l.id === id);
    if (deCache) return deCache;

    const mock = LUGARES_MOCK.find((l) => l.id === id);
    return mock || null;
  }
};
