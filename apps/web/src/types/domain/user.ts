// 用户领域类型定义

export enum Role {
  ADMIN = "admin",
  USER = "user",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

export interface User {
  id: string;
  username: string;
  nickname: string;
  role: Role;           // 与后端一致
  createdAt: string;
  updatedAt: string;
  status?: UserStatus; // 后端返回后再打开
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// 用户管理相关类型定义
export interface CreateUserDto {
  username: string;
  password: string;
  nickname: string;
  role?: Role;
}

export interface UpdateUserDto {
  username?: string;
  nickname?: string;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UserListRequest {
  page?: number;
  limit?: number;
  keyword?: string;
}

export interface ChangeRoleRequest {
  role: Role;
}

// 扩展的用户类型（与新架构兼容）
export interface ExtendedUser extends User {
  email?: string;
  avatar?: string;
  affiliation?: string;
  bio?: string;
  phone?: string;
  website?: string;
  location?: string;
  timezone?: string;
  language?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
  loginCount?: number;
  subscription?: UserSubscription;
  stats?: UserStats;
}

export interface UserSubscription {
  id: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
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
  lastActivityAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    paperUpdates: boolean;
    comments: boolean;
    mentions: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showAffiliation: boolean;
    allowDirectMessages: boolean;
  };
  editor: {
    autoSave: boolean;
    autoSaveInterval: number;
    spellCheck: boolean;
    wordWrap: boolean;
    tabSize: number;
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    fontFamily: string;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: string;
  lastAccessAt: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'paper_created' | 'paper_updated' | 'paper_deleted' | 'note_created' | 'note_updated';
  description: string;
  metadata?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: UserPermission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  details?: any;
}