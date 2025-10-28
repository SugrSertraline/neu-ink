'use client';

import { authApi } from '@/lib/authApi';
import { BusinessCode } from '@/types/api';
import { User } from '@/types/user';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; 
interface LoginResult {
  ok: boolean;
  message?: string;
  businessCode?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter(); 
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = user?.username === 'admin';
  const isAuthenticated = !!user;

  // 登录
  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      const response = await authApi.login({ username, password });

      // HTTP / 网关层
      if (response?.code === 200) {
        const businessResponse = response.data;

        // 业务层
        if (businessResponse?.code === BusinessCode.SUCCESS) {
          const { token, user: userData } = businessResponse.data;

          // 检查 userData 是否存在
          if (!userData) {
            console.error('[AuthContext] 用户数据为空:', businessResponse);
            return {
              ok: false,
              message: '登录响应数据异常',
              businessCode: businessResponse?.code,
            };
          }

          authApi.setToken(token);
          setUser(userData);

          return { ok: true };
        } else {
          return {
            ok: false,
            message: businessResponse?.message || '登录失败',
            businessCode: businessResponse?.code,
          };
        }
      }
      return { ok: false, message: response?.message || '网络错误，请稍后重试' };
    } catch (error) {
      console.error('[AuthContext] 登录异常:', error);
      return { ok: false, message: '网络异常或服务器错误，请稍后重试' };
    } finally {
      setIsLoading(false);
    }
  };
  

  // 登出
  const logout = async () => {
    try {
      // 调用后端登出API
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // 无论API调用是否成功，都清除本地状态
      authApi.clearToken();
      setUser(null);
      // 跳转到登录页面
      router.push('/login');
    }
  };

  // 刷新用户信息
  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();

      if (response?.code === 200 && response?.data) {
        // getCurrentUser 直接返回用户数据（单层结构）
        setUser(response.data);
      } else {
        console.error('[AuthContext] 刷新用户信息失败:', response);
        authApi.clearToken();
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      authApi.clearToken();
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    };
    void initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
