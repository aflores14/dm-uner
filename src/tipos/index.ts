// src/tipos/index.ts

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface Horario {
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo, 1 = lunes, ..., 6 = sábado
  abre: string; // "09:00"
  cierra: string; // "19:00"
}

export interface Audioguia {
  url: string;
  duracionSegundos: number;
  idioma: 'es' | 'en' | 'pt';
}

export interface Lugar {
  id: string;
  nombre: string;
  categoriaId: string;
  descripcionCorta: string;
  descripcion: string;
  coordenadas: Coordenadas;
  direccion: string;
  imagenes: string[];
  horarios: Horario[];
  telefono: string | null;
  sitioWeb: string | null;
  precioEntrada: number | null; // 0 = gratis, null = no aplica
  audioguia: Audioguia | null;
  codigoQr: string | null;
  accesible: boolean;
  activo: boolean;
  actualizadoEn: string; // ISO 8601 con zona
}

export interface Categoria {
  id: string;
  nombre: string;
  icono: string; // nombre del ícono de Ionicons
  color: string; // hexadecimal
  orden: number;
}

export type EstadoEvento = 'programado' | 'suspendido' | 'cancelado' | 'finalizado';

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  lugarId: string | null;
  direccionLibre: string | null;
  coordenadas: Coordenadas | null;
  inicio: string; // ISO 8601 con zona
  fin: string | null;
  imagenUrl: string | null;
  precio: number | null;
  estado: EstadoEvento;
}

export interface Preferencias {
  categoriasFavoritas: string[];
  avisarProximidad: boolean;
  radioAvisoMetros: number; // 100, 250 o 500
  tema: 'claro' | 'oscuro' | 'sistema';
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  avatarUrl: string | null;
  creadoEn: string;
  preferencias: Preferencias;
}

export interface Favorito {
  id: string;
  usuarioId: string;
  lugarId: string;
  creadoEn: string;
}

export type OrigenVisita = 'qr' | 'gps' | 'manual';

export interface Visita {
  id: string;
  usuarioId: string;
  lugarId: string;
  fechaHora: string;
  origen: OrigenVisita;
  fotoUri: string | null;
  nota: string | null;
  sincronizada: boolean;
}

export interface ApiResponse<T> {
  datos: T;
  meta?: {
    total: number;
    pagina: number;
    porPagina: number;
  };
  error?: {
    codigo: string;
    mensaje: string;
  };
}
