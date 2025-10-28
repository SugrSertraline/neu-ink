// types/user.ts
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
  // status?: UserStatus; // 后端返回后再打开
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
