// lib/services/auth.ts
import { AuthAwareResult, callAndNormalize, isSuccess } from '../http';
import { apiClient } from '../http';
import type { UnifiedResult } from '@/types/api';
import { BusinessCode } from '@/types/api';
import type { LoginRequest, LoginResponse, User } from '@/types/user';

// 认证服务：全部返回统一结果体，调用方只关心 isSuccess / data
export const authService = {
  setToken: (token: string) => apiClient.setToken(token),
  clearToken: async () => {
<<<<<<< HEAD
    // 使用 markAuthReset 来确保 authReset 标记被正确设置
    const { markAuthReset } = await import('../http/normalize');
    markAuthReset(null);
=======
    // 直接清除 token，避免循环依赖
>>>>>>> origin/main
    apiClient.clearToken();
  },

  async login(payload: LoginRequest): Promise<AuthAwareResult<LoginResponse>> {
    const uni = await callAndNormalize<LoginResponse>(apiClient.post('/users/login', payload));
    if (isSuccess(uni) && uni.data?.token) {
      // 只有业务成功才写入 token
      apiClient.setToken(uni.data.token);
    }
    return uni;
  },

<<<<<<< HEAD
=======
  async refreshToken(): Promise<AuthAwareResult<{ token: string; user: User }>> {
    const uni = await callAndNormalize<{ token: string; user: User }>(apiClient.post('/users/refresh'));
    if (isSuccess(uni) && uni.data?.token) {
      // 刷新成功，更新token
      apiClient.setToken(uni.data.token);
    }
    return uni;
  },

>>>>>>> origin/main
  getCurrentUser(): Promise<AuthAwareResult<User>> {
    return callAndNormalize<User>(apiClient.get('/users/current'));
  },

  async logout(): Promise<UnifiedResult<null>> {
    try {
      const uni = await callAndNormalize<null>(apiClient.post('/users/logout'));
      return uni;
    } finally {
      // 无论接口成功与否，清理本地 token
<<<<<<< HEAD
      // 使用 markAuthReset 来确保 authReset 标记被正确设置
      const { markAuthReset } = await import('../http/normalize');
      markAuthReset(null);
=======
      // 直接清除 token，避免循环依赖
>>>>>>> origin/main
      apiClient.clearToken();
    }
  },
};

// 便捷导出
export { isSuccess } from '../http';
