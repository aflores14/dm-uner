// src/servicios/lugares.ts
import { ApiResponse, Categoria, Lugar } from '../tipos';
import { CATEGORIAS_MOCK, LUGARES_MOCK } from '../mocks/lugaresMock';
import { clienteHttp } from './cliente';

// Función auxiliar para normalizar texto (quitar acentos y minúsculas)
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const obtenerLugares = async (categoriaId?: string, busqueda?: string): Promise<Lugar[]> => {
  try {
    const params = new URLSearchParams();
    if (categoriaId) params.append('categoriaId', categoriaId);
    if (busqueda) params.append('q', busqueda);

    const queryString = params.toString();
    const url = queryString ? `/lugares?${queryString}` : '/lugares';

    const { data } = await clienteHttp.get<ApiResponse<Lugar[]>>(url);
    if (data?.datos) {
      return data.datos;
    }
    throw new Error('Respuesta inválida del servidor');
  } catch (_error) {
    // Si la API remota no está levantada o falla la conexión, respondemos con el mock local
    let filtrados = LUGARES_MOCK.filter((lugar) => lugar.activo);

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
  }
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
    const encontrado = LUGARES_MOCK.find((l) => l.id === id);
    return encontrado || null;
  }
};
