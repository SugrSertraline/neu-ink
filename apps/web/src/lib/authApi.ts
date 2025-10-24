import { apiClient } from './apiClient';
import type { ApiResponse, BusinessResponse } from '@/types/api';
import type { User, LoginRequest, LoginResponse } from '@/types/user';

// 认证相关API
export const authApi = {
  setToken: (token: string) => apiClient.setToken(token),
  clearToken: () => apiClient.clearToken(),
  
  async login(params: LoginRequest): Promise<ApiResponse<BusinessResponse<LoginResponse>>> {
    return apiClient.post('/users/login', params);
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get('/users/current');
  },

  async logout(): Promise<ApiResponse<null>> {
    return apiClient.post('/users/logout');
  },
};
