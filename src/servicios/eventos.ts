// src/servicios/eventos.ts
import { ApiResponse, Evento } from '../tipos';
import { EVENTOS_MOCK } from '../mocks/eventosMock';
import { clienteHttp } from './cliente';

export const obtenerEventos = async (): Promise<Evento[]> => {
  try {
    const { data } = await clienteHttp.get<ApiResponse<Evento[]>>('/eventos');
    if (data?.datos) {
      return data.datos;
    }
    throw new Error('Respuesta inválida de eventos');
  } catch (_e) {
    // Retorna los eventos mock ordenados cronológicamente
    return [...EVENTOS_MOCK].sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
    );
  }
};

export const obtenerEventoPorId = async (id: string): Promise<Evento | null> => {
  try {
    const { data } = await clienteHttp.get<ApiResponse<Evento>>(`/eventos/${id}`);
    if (data?.datos) {
      return data.datos;
    }
    throw new Error('Evento no encontrado');
  } catch (_e) {
    const encontrado = EVENTOS_MOCK.find((e) => e.id === id);
    return encontrado || null;
  }
};

