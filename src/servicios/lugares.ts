import { LUGARES_MOCK } from "../mocks/lugaresMock";
import { Lugar } from "../tipos";

export const obtenerLugares = async (): Promise<Lugar[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(LUGARES_MOCK);
    }, 1000);
  });
};

export const obtenerLugarPorId = async (id: string): Promise<Lugar | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lugar = LUGARES_MOCK.find(l => l.id === id);
      resolve(lugar);
    }, 500);
  });
};