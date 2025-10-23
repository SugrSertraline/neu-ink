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
  
  // 登录响应数据
  export interface LoginResponse {
    token: string;
    user: User;
  }
  