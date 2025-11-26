import type { User, LoginRequest, LoginResponse } from '@/types/user';

/**
 * 认证状态接口
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

/**
 * 认证操作接口
 */
export interface AuthActions {
  // 登录相关
  login: (credentials: LoginRequest) => Promise<LoginResult>;
  logout: () => Promise<void>;
  
  // 用户相关
  refreshUser: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  
  // 权限检查
  requireAuth: (message?: string) => boolean;
  isAdmin: () => boolean;
}

/**
 * 认证 store 类型
 */
export type AuthStore = AuthState & AuthActions;

/**
 * 登录结果
 */
export interface LoginResult {
  ok: boolean;
  message?: string;
  businessCode?: number;
}

// 重新导出 LoginRequest
export type { LoginRequest };