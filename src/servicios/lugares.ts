import { Lugar } from '../tipos';
import { clienteHttp } from './cliente';

interface ApiResponse<T> {
  datos: T;
  meta: any;
}

export const obtenerLugares = async (): Promise<Lugar[]> => {
  const { data } = await clienteHttp.get<ApiResponse<Lugar[]>>('/lugares');
  return data.datos;
};

export const obtenerLugarPorId = async (id: string): Promise<Lugar> => {
  const { data } = await clienteHttp.get<ApiResponse<Lugar>>(`/lugares/${id}`);
  return data.datos;
};