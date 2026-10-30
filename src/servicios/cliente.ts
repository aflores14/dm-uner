import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'http://192.168.1.208:3000'; // Ajusta con tu IP

export const clienteHttp = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

clienteHttp.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token_sesion');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);