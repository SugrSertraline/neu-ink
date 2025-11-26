import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { AuthState, AuthActions, LoginRequest, LoginResult } from './authTypes';
import { authService, isSuccess } from '@/lib/services/auth';
import { AuthAwareResult, shouldResetAuth } from '@/lib/http/normalize';
import { ResponseCode, BusinessCode } from '@/types/api';
import { apiClient } from '@/lib/http/client';

/**
 * 初始认证状态
 */
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

/**
 * 认证状态管理器
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // 登录操作
        login: async (credentials: LoginRequest): Promise<LoginResult> => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const result = await authService.login(credentials);
            
            if (isSuccess(result)) {
              const { user, token } = (result.data || {}) as { user: any; token: string };
              
              if (!user) {
                set((state) => {
                  state.error = '登录响应数据异常';
                  state.isLoading = false;
                });
                return { ok: false, message: '登录响应数据异常', businessCode: result.bizCode };
              }

              if (token) {
                apiClient.setToken(token);
              }

              set((state) => {
                state.user = user;
                state.token = token;
                state.isAuthenticated = true;
                state.error = null;
                state.isLoading = false;
                state.lastUpdated = new Date();
              });

              return { ok: true };
            }

            // 处理登录失败的情况
            if (result.topCode === ResponseCode.UNAUTHORIZED) {
              const message = result.bizMessage && result.bizCode !== BusinessCode.SUCCESS 
                ? result.bizMessage 
                : '用户名或密码错误';
              
              set((state) => {
                state.error = message;
                state.isLoading = false;
              });
              
              return { ok: false, message, businessCode: result.bizCode };
            }

            // 其他错误
            const message = result.bizMessage || '登录失败';
            set((state) => {
              state.error = message;
              state.isLoading = false;
            });
            
            return { ok: false, message, businessCode: result.bizCode };
          } catch (error: any) {
            const message = error?.message || '网络异常或服务器错误，请稍后重试';
            set((state) => {
              state.error = message;
              state.isLoading = false;
            });
            return { ok: false, message };
          }
        },

        // 登出操作
        logout: async () => {
          try {
            await authService.logout();
          } catch (error) {
            // 静默失败，不打断用户体验
          } finally {
            authService.clearToken();
            apiClient.clearToken();
            set((state) => {
              state.user = null;
              state.token = null;
              state.isAuthenticated = false;
              state.error = null;
              state.lastUpdated = new Date();
            });
          }
        },

        // 刷新用户信息
        refreshUser: async () => {
          const token = apiClient.getToken();
          if (!token) {
            set((state) => {
              state.user = null;
              state.token = null;
              state.isAuthenticated = false;
            });
            return;
          }

          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            const result = await authService.getCurrentUser();
            
            if (isSuccess(result) && result.data) {
              set((state) => {
                state.user = result.data;
                state.isAuthenticated = true;
                state.error = null;
                state.isLoading = false;
                state.lastUpdated = new Date();
              });
              return;
            }

            // 处理认证失败
            authService.clearToken();
            apiClient.clearToken();
            set((state) => {
              state.user = null;
              state.token = null;
              state.isAuthenticated = false;
              state.error = null;
              state.isLoading = false;
            });
          } catch (error: any) {
            const err = error as { authReset?: boolean; message?: string; status?: number; isAuthError?: boolean };
            
            // 处理401错误或明确的认证错误
            if (err?.authReset || err?.status === 401 || err?.isAuthError) {
              // 尝试刷新token
              try {
                const refreshResult = await authService.refreshToken();
                if (isSuccess(refreshResult) && refreshResult.data?.user) {
                  set((state) => {
                    state.user = refreshResult.data.user;
                    state.isAuthenticated = true;
                    state.error = null;
                    state.isLoading = false;
                    state.lastUpdated = new Date();
                  });
                  return;
                }
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
              }
              
              // 刷新失败，清除认证信息
              authService.clearToken();
              apiClient.clearToken();
              set((state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                state.error = null;
                state.isLoading = false;
              });
            } else {
              set((state) => {
                state.error = err?.message || '获取用户信息失败';
                state.isLoading = false;
              });
            }
          }
        },

        // 更新用户信息
        updateUser: (userData: Partial<any>) => {
          set((state) => {
            if (state.user) {
              state.user = { ...state.user, ...userData };
              state.lastUpdated = new Date();
            }
          });
        },

        // 状态管理
        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        reset: () => {
          set((state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            state.lastUpdated = new Date();
          });
        },

        // 权限检查
        requireAuth: (message?: string): boolean => {
          const { isAuthenticated } = get();
          if (isAuthenticated) {
            return true;
          }
          // 这里可以添加重定向到登录页的逻辑
          return false;
        },

        isAdmin: (): boolean => {
          const { user } = get();
          return user?.username === 'admin';
        },
      })),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
);