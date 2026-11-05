// src/servicios/favoritos.ts
import { alternarFavoritoDb, obtenerFavoritosDb } from './database';

export const obtenerFavoritosIds = async (usuarioId = 'usr-201'): Promise<string[]> => {
  return await obtenerFavoritosDb(usuarioId);
};

export const esLugarFavorito = async (lugarId: string, usuarioId = 'usr-201'): Promise<boolean> => {
  const ids = await obtenerFavoritosDb(usuarioId);
  return ids.includes(lugarId);
};

export const alternarLugarFavorito = async (
  lugarId: string,
  usuarioId = 'usr-201'
): Promise<boolean> => {
  return await alternarFavoritoDb(usuarioId, lugarId);
};
