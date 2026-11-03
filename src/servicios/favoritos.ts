// src/servicios/favoritos.ts
import * as SecureStore from 'expo-secure-store';

const FAVORITOS_STORAGE_KEY = 'turismo_favoritos_ids_v1';

// Obtiene la lista de IDs de lugares favoritos
export const obtenerFavoritosIds = async (): Promise<string[]> => {
  try {
    const raw = await SecureStore.getItemAsync(FAVORITOS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error al leer favoritos:', e);
  }
  return [];
};

// Verifica si un lugar específico es favorito
export const esLugarFavorito = async (lugarId: string): Promise<boolean> => {
  const ids = await obtenerFavoritosIds();
  return ids.includes(lugarId);
};

// Agrega o quita un lugar de favoritos con un solo toque (retorna el nuevo estado)
export const alternarLugarFavorito = async (lugarId: string): Promise<boolean> => {
  const ids = await obtenerFavoritosIds();
  let nuevosIds: string[];
  let esFav = false;

  if (ids.includes(lugarId)) {
    nuevosIds = ids.filter((id) => id !== lugarId);
    esFav = false;
  } else {
    nuevosIds = [...ids, lugarId];
    esFav = true;
  }

  try {
    await SecureStore.setItemAsync(FAVORITOS_STORAGE_KEY, JSON.stringify(nuevosIds));
  } catch (e) {
    console.error('Error al guardar favoritos:', e);
  }

  return esFav;
};

