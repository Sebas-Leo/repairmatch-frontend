// repairmatch-mobile/src/services/auth.ts
import { client } from './client';
import { tokenStorage } from './tokenStorage';

export const authService = {
  async login(email: string, password: string) {
    const response = await client.post('/auth/login', { email, password });
    if (response.data && response.data.token) {
      await tokenStorage.setAccessToken(response.data.token);
    }
    return response.data;
  },

  async register(userData: { email: string; firstName: string; lastName: string; password: string }) {
    const response = await client.post('/users/register', userData);
    return response.data;
  },

  async logout() {
    await tokenStorage.clearTokens();
  }
};