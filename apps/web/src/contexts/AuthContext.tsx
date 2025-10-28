'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { authService, isSuccess } from '@/lib/services/auth';
import { AuthAwareResult, shouldResetAuth } from '@/lib/http/normalize';
import type { User, LoginResponse } from '@/types/user';
import type { UnifiedResult } from '@/types/api';
import { ResponseCode } from '@/types/api';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
      return shouldResetAuth(
        uni?.topCode ?? ResponseCode.SUCCESS,
        uni?.bizCode,
        message,
      );
    },
    [],
  );

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      setIsLoading(true);
      try {
        const uni = await authService.login({ username, password });
        if (isSuccess(uni)) {
          const { user: userData } = (uni.data || {}) as LoginResponse;
          if (!userData) {
            return { ok: false, message: '登录响应数据异常', businessCode: uni.bizCode };
          }
          setUser(userData);
          clearRedirectGuard();
          return { ok: true };
        }
        return { ok: false, message: uni.bizMessage || '登录失败', businessCode: uni.bizCode };
      } catch (err: any) {
        return { ok: false, message: err?.message || '网络异常或服务器错误，请稍后重试' };
      } finally {
        setIsLoading(false);
      }
    },
    [clearRedirectGuard],
  );

  const refreshUser = useCallback(async () => {
    try {
      const uni = await authService.getCurrentUser();
      if (isSuccess(uni) && uni.data) {
        setUser(uni.data);
        clearRedirectGuard();
        return;
      }
      setUser(null);
      if (needsRedirect(uni)) {
        redirectToLogin();
      }
    } catch (error) {
      const err = error as { authReset?: boolean; message?: string };
      setUser(null);
      if (err?.authReset || needsRedirect(undefined, err?.message)) {
        redirectToLogin();
      } else {
        console.error('[AuthContext] Failed to refresh user:', error);
      }
    }
  }, [clearRedirectGuard, needsRedirect, redirectToLogin]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('[AuthContext] Logout API call failed:', error);
    } finally {
      setUser(null);
      redirectToLogin({ includeFrom: false });
    }
  }, [redirectToLogin]);

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
    }),
    [user, isLoading, isAuthenticated, isAdmin, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
