// src/servicios/database.ts
import * as SQLite from 'expo-sqlite';
import { Favorito, Lugar, Visita } from '../tipos';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const obtenerBaseDatos = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('turismo_colon.db');

  // Inicializar tablas necesarias
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS lugares_cache (
      id TEXT PRIMARY KEY NOT NULL,
      datos_json TEXT NOT NULL,
      actualizado_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS favoritos (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL,
      lugar_id TEXT NOT NULL,
      creado_en TEXT NOT NULL,
      UNIQUE(usuario_id, lugar_id)
    );

    CREATE TABLE IF NOT EXISTS visitas (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL,
      lugar_id TEXT NOT NULL,
      fecha_hora TEXT NOT NULL,
      origen TEXT NOT NULL,
      foto_uri TEXT,
      nota TEXT,
      sincronizada INTEGER NOT NULL DEFAULT 0
    );

    -- Semilla inicial de datos para la cuenta oficial de prueba de Lucía Méndez (usr-201)
    INSERT OR IGNORE INTO favoritos (id, usuario_id, lugar_id, creado_en)
    VALUES 
      ('fav-001', 'usr-201', 'lug-004', '2026-11-02T10:00:00-03:00'),
      ('fav-002', 'usr-201', 'lug-001', '2026-11-02T10:05:00-03:00');

    INSERT OR IGNORE INTO visitas (id, usuario_id, lugar_id, fecha_hora, origen, foto_uri, nota, sincronizada)
    VALUES 
      ('vis-311', 'usr-201', 'lug-004', '2026-11-02T16:42:00-03:00', 'qr', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80', 'Increíble historia del molino y los colonos suizos. Hacía 32 grados pero corría linda brisa.', 0),
      ('vis-312', 'usr-201', 'lug-001', '2026-11-01T11:15:00-03:00', 'gps', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80', 'Tarde de relax en las piscinas con vista al río Uruguay.', 1);
  `);

  return dbInstance;
};

// ==========================================
// CACHÉ OFFLINE DE LUGARES
// ==========================================
export const cachearLugaresDb = async (lugares: Lugar[]): Promise<void> => {
  try {
    const db = await obtenerBaseDatos();
    for (const lug of lugares) {
      await db.runAsync(
        `INSERT OR REPLACE INTO lugares_cache (id, datos_json, actualizado_en) VALUES (?, ?, ?)`,
        lug.id,
        JSON.stringify(lug),
        lug.actualizadoEn || new Date().toISOString()
      );
    }
  } catch (e) {
    console.error('Error cacheando lugares en SQLite:', e);
  }
};

export const obtenerLugaresCacheDb = async (): Promise<Lugar[]> => {
  try {
    const db = await obtenerBaseDatos();
    const rows = await db.getAllAsync<{ datos_json: string }>(
      'SELECT datos_json FROM lugares_cache'
    );
    return rows.map((r) => JSON.parse(r.datos_json));
  } catch (e) {
    console.error('Error leyendo lugares cacheados de SQLite:', e);
    return [];
  }
};

// ==========================================
// FAVORITOS POR USUARIO (ASOCIADOS A LA CUENTA)
// ==========================================
export const obtenerFavoritosDb = async (usuarioId?: string): Promise<string[]> => {
  if (!usuarioId) return [];
  try {
    const db = await obtenerBaseDatos();
    const rows = await db.getAllAsync<{ lugar_id: string }>(
      'SELECT lugar_id FROM favoritos WHERE usuario_id = ?',
      usuarioId
    );
    return rows.map((r) => r.lugar_id);
  } catch (e) {
    console.error('Error leyendo favoritos de SQLite:', e);
    return [];
  }
};

export const alternarFavoritoDb = async (
  usuarioId: string,
  lugarId: string
): Promise<boolean> => {
  try {
    const db = await obtenerBaseDatos();
    const existe = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM favoritos WHERE usuario_id = ? AND lugar_id = ?',
      usuarioId,
      lugarId
    );

    if (existe) {
      await db.runAsync(
        'DELETE FROM favoritos WHERE usuario_id = ? AND lugar_id = ?',
        usuarioId,
        lugarId
      );
      return false; // Ya no es favorito
    } else {
      const id = `fav-${Date.now()}`;
      await db.runAsync(
        'INSERT INTO favoritos (id, usuario_id, lugar_id, creado_en) VALUES (?, ?, ?, ?)',
        id,
        usuarioId,
        lugarId,
        new Date().toISOString()
      );
      return true; // Ahora es favorito
    }
  } catch (e) {
    console.error('Error alternando favorito en SQLite:', e);
    return false;
  }
};

// ==========================================
// VISITAS POR USUARIO (ASOCIADAS A LA CUENTA)
// ==========================================
export const guardarVisitaDb = async (visita: Visita): Promise<void> => {
  try {
    const db = await obtenerBaseDatos();
    await db.runAsync(
      `INSERT OR REPLACE INTO visitas (id, usuario_id, lugar_id, fecha_hora, origen, foto_uri, nota, sincronizada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      visita.id,
      visita.usuarioId,
      visita.lugarId,
      visita.fechaHora,
      visita.origen,
      visita.fotoUri,
      visita.nota,
      visita.sincronizada ? 1 : 0
    );
  } catch (e) {
    console.error('Error guardando visita en SQLite:', e);
  }
};

export const obtenerVisitasDb = async (usuarioId?: string): Promise<Visita[]> => {
  if (!usuarioId) return [];
  try {
    const db = await obtenerBaseDatos();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM visitas WHERE usuario_id = ? ORDER BY fecha_hora DESC',
      usuarioId
    );

    return rows.map((r) => ({
      id: r.id,
      usuarioId: r.usuario_id,
      lugarId: r.lugar_id,
      fechaHora: r.fecha_hora,
      origen: r.origen,
      fotoUri: r.foto_uri,
      nota: r.nota,
      sincronizada: Boolean(r.sincronizada),
    }));
  } catch (e) {
    console.error('Error leyendo visitas de SQLite:', e);
    return [];
  }
};
