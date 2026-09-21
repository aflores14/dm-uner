// src/mocks/lugaresMock.ts
import { Lugar } from "../tipos";

export const LUGARES_MOCK: Lugar[] = [
  {
    id: "lug-004",
    nombre: "Molino Forclaz",
    categoriaId: "cat-museos",
    descripcionCorta: "Molino de viento de 1888.",
    descripcion: "Construido por la familia Forclaz...",
    coordenadas: { latitud: -32.1904, longitud: -58.1932 },
    direccion: "Ruta Provincial 26",
    imagenes: ["https://api.colon.tur.ar/img/molino-1.jpg"],
    telefono: "3454421234",
    sitioWeb: null,
    precioEntrada: 1500,
    activo: true,
    accesible: false,
    actualizadoEn: "2026-08-01T10:30:00-03:00"
  }
];