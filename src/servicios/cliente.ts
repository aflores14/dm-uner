// src/servicios/cliente.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'jwt_auth_token_v1';
export const USUARIO_KEY = 'usuario_sesion_v1';
export const BASE_URL = 'http://192.168.1.208:3000'; // Ajusta con tu IP si levantas la API

export const clienteHttp = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

clienteHttp.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_e) {
      // Si falla SecureStore, continúa sin header
    }
    return config;
  },
  (error) => Promise.reject(error)
);
