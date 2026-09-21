// src/tipos/index.ts
export interface Coordenadas {
  latitud: number;
  longitud: number;
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
  telefono: string | null;
  sitioWeb: string | null;
  precioEntrada: number | null;
  activo: boolean;
  accesible: boolean; 
  actualizadoEn: string;  
}

export interface Usuario {
  email: string;
  nombre: string;
  token?: string;
}