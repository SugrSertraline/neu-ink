'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, authApi, BusinessCode } from '@/lib/api';

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
          authApi.setToken(token);
          setUser(userData);
          return { ok: true };
        } else {
          // 登录失败（但请求成功），把后端 message 往上抛
          return {
            ok: false,
            message: businessResponse?.message || '登录失败',
            businessCode: businessResponse?.code,
          };
        }
      }
      // HTTP 非 200
      return { ok: false, message: response?.message || '网络错误，请稍后重试' };
    } catch (error) {
      console.error('Login failed:', error);
      return { ok: false, message: '网络异常或服务器错误，请稍后重试' };
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = () => {
    authApi.clearToken();
    setUser(null);
  };

  // 刷新用户信息（这里假设 getCurrentUser 返回的是用户对象）
  const refreshUser = async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response?.code === 200) {
        setUser(response.data);
      } else {
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
