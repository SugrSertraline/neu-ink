'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { authService, isSuccess } from '@/lib/services/auth';
import { AuthAwareResult, shouldResetAuth } from '@/lib/http/normalize';
import type { User, LoginResponse } from '@/types/user';
import type { UnifiedResult } from '@/types/api';
import { ResponseCode } from '@/types/api';
import { apiClient } from '@/lib/http/client';

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  requireAuth: (message?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/', '/login', '/register', '/library'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => {
    if (path === '/library') {
      // 特殊处理 /library 路径，确保 /library 及其子路径都被视为公共路径
      return pathname === path || pathname.startsWith(path + '/');
    }
    return pathname === path || pathname.startsWith(path);
  });
}

function AuthProviderContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const redirectingRef = useRef(false);

  const isAdmin = user?.username === 'admin';
  const isAuthenticated = !!user;

  const clearRedirectGuard = useCallback(() => {
    redirectingRef.current = false;
  }, []);

  useEffect(() => {
    clearRedirectGuard();
  }, [pathname, clearRedirectGuard]);

  const makeLoginUrl = useCallback(
    (includeFrom: boolean) => {
      if (!includeFrom) return '/login';
      const query = searchParams.toString();
      const from = encodeURIComponent(`${pathname}${query ? `?${query}` : ''}`);
      return `/login?from=${from}`;
    },
    [pathname, searchParams],
  );

  const redirectToLogin = useCallback(
    (options?: { includeFrom?: boolean }) => {
      const includeFrom = options?.includeFrom ?? true;
      if (pathname === '/login') {
        clearRedirectGuard();
        return;
      }
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      router.replace(makeLoginUrl(includeFrom));
    },
    [clearRedirectGuard, makeLoginUrl, pathname, router],
  );

  const needsRedirect = useCallback(
    (uni?: AuthAwareResult<unknown>, message?: string) => {
      if (!uni && !message) return false;
      if (uni?.authReset) return true;
      return shouldResetAuth(uni?.topCode ?? ResponseCode.SUCCESS, uni?.bizCode, message);
    },
    [],
  );

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      setIsLoading(true);
      try {
        const uni = await authService.login({ username, password });
        if (isSuccess(uni)) {
          const { user: userData, token } = (uni.data || {}) as LoginResponse;
          if (!userData) {
            return { ok: false, message: '登录响应数据异常', businessCode: uni.bizCode };
          }
          if (token) {
            apiClient.setToken(token);
          }
          setUser(userData);
          clearRedirectGuard();
          return { ok: true };
        }
        // 对于400等错误，normalize.ts已经处理了toast，这里只需要返回结果
        return { ok: false, message: uni.bizMessage || '登录失败', businessCode: uni.bizCode };
      } catch (err: any) {
        // 处理网络错误或其他异常
        console.error('Login error:', err);
        return { ok: false, message: err?.message || '网络异常或服务器错误，请稍后重试' };
      } finally {
        setIsLoading(false);
      }
    },
    [clearRedirectGuard],
  );

  const refreshUser = useCallback(async () => {
    const token = apiClient.getToken();
    if (!token) {
      setUser(null);
      if (!isPublicPath(pathname)) {
        redirectToLogin();
      }
      return;
    }

    try {
      const uni = await authService.getCurrentUser();
      if (isSuccess(uni) && uni.data) {
        setUser(uni.data);
        clearRedirectGuard();
        return;
      }
      // 对于400等错误，normalize.ts已经处理了toast，这里只需要处理状态
      authService.clearToken();
      setUser(null);

      if (!isPublicPath(pathname) && needsRedirect(uni)) {
        redirectToLogin();
      }
    } catch (error) {
      const err = error as { authReset?: boolean; message?: string };
      console.error('Refresh user error:', err);
      
      // 只有明确的认证错误才清除token和用户状态
      if (err?.authReset) {
        authService.clearToken();
        setUser(null);
      }

      if (!isPublicPath(pathname) && (err?.authReset || needsRedirect(undefined, err?.message))) {
        redirectToLogin();
      } else if (!isPublicPath(pathname)) {
        // 静默失败，不打断用户体验
      }
    }
  }, [clearRedirectGuard, needsRedirect, redirectToLogin, pathname]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // 静默失败，不打断用户体验
    } finally {
      authService.clearToken();
      setUser(null);
      redirectToLogin({ includeFrom: false });
    }
  }, [redirectToLogin]);

  const requireAuth = useCallback(
    (message?: string): boolean => {
      if (isAuthenticated) {
        return true;
      }
      redirectToLogin({ includeFrom: true });
      return false;
    },
    [isAuthenticated, redirectToLogin],
  );

  useEffect(() => {
    const init = async () => {
      try {
        await refreshUser();
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, [refreshUser]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      isAdmin,
      login,
      logout,
      refreshUser,
      requireAuth,
    }),
    [user, isLoading, isAuthenticated, isAdmin, login, logout, refreshUser, requireAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </Suspense>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
