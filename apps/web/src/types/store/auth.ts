// 认证状态管理类型
import { BaseState, BaseActions } from './base';
import { UserPreferences } from './base';

export interface AuthState extends BaseState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  permissions: string[];
  roles: string[];
  lastLoginAt?: Date;
  tokenExpiresAt?: Date;
  refreshExpiresAt?: Date;
}

export interface AuthActions extends BaseActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  enableTwoFactor: () => Promise<string>;
  disableTwoFactor: (code: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  setToken: (token: string, refreshToken?: string) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
}

export type AuthStore = AuthState & AuthActions;

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  affiliation?: string;
  bio?: string;
  phone?: string;
  website?: string;
  location?: string;
  timezone?: string;
  language?: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginCount: number;
  subscription?: UserSubscription;
  stats?: UserStats;
}

export interface UserSubscription {
  id: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  features: string[];
  limits: {
    papers: number;
    storage: number; // in bytes
    collaborators: number;
    apiCalls: number;
  };
}

export interface UserStats {
  papersCount: number;
  publicPapersCount: number;
  privatePapersCount: number;
  draftsCount: number;
  totalViews: number;
  totalDownloads: number;
  totalWords: number;
  averageReadingTime: number;
  collaboratorCount: number;
  noteCount: number;
  lastActivityAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  affiliation?: string;
  acceptTerms: boolean;
  subscribeNewsletter?: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface TwoFactorVerify {
  code: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessAt: Date;
}

export interface AuthConfig {
  tokenStorage: 'localStorage' | 'sessionStorage' | 'memory';
  autoRefresh: boolean;
  refreshThreshold: number; // 提前刷新令牌的时间阈值（秒）
  logoutOnExpired: boolean;
  redirectOnLogin: boolean;
  redirectOnLogout: boolean;
  sessionTimeout: number; // 会话超时时间（分钟）
  maxConcurrentSessions: number;
  requireTwoFactor: boolean;
  passwordPolicy: PasswordPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventPersonalInfo: boolean;
  maxAge: number; // 密码最大年龄（天）
  historyCount: number; // 不能重复使用的历史密码数量
}

export interface AuthEvent {
  type: 'login' | 'logout' | 'register' | 'password_change' | 'email_verification' | 'two_factor_enabled' | 'two_factor_disabled';
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details?: any;
}

export interface AuthAuditLog {
  id: string;
  userId: string;
  event: AuthEvent;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}