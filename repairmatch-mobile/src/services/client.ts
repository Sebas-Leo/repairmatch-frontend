// repairmatch-mobile/src/services/client.ts
import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// Ajusta esta URL según tu entorno (si pruebas en dispositivo físico con Expo Go, usarás la IP de tu PC en lugar de localhost)
const API_BASE_URL = 'http://localhost:8080'; 

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el Bearer token automáticamente en cada petición
client.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);