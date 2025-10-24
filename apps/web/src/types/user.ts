// 用户类型定义
export interface User {
  id: string;
  username: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

// 登录请求参数
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应数据（内层 data 字段）
export interface LoginResponse {
  token: string;
  user: User;
}

// 用户状态枚举（可选，与后端保持一致）
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}
