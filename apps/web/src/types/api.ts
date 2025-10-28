// types/api.ts
// —— 唯一真源：HTTP与业务码表、通用响应/统一返回体 ——

// HTTP 响应状态码（外层）
export enum ResponseCode {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_ERROR = 500,
}

// 业务状态码（data 内层，与后端 BusinessCode 保持一致）
export enum BusinessCode {
  SUCCESS = 0,                   
  // 用户认证相关 1000-1099
  LOGIN_FAILED = 1001,
  ACCOUNT_DISABLED = 1002,
  PASSWORD_EXPIRED = 1003,
  INVALID_PARAMS = 1004,
  USER_NOT_FOUND = 1005,
  USER_EXISTS = 1006,
  PERMISSION_DENIED = 1007,
  TOKEN_INVALID = 1008,
  TOKEN_EXPIRED = 1009,
  OLD_PASSWORD_WRONG = 1010,
  INTERNAL_ERROR = 1999,

  // 论文相关 2000-2099
  PAPER_NOT_FOUND = 2001,
  PAPER_CREATION_FAILED = 2002,
  PAPER_UPDATE_FAILED = 2003,
  PAPER_DELETE_FAILED = 2004,
  INVALID_PAPER_DATA = 2005,

  // 笔记相关 3000-3099
  NOTE_NOT_FOUND = 3001,
  NOTE_CREATION_FAILED = 3002,
  NOTE_UPDATE_FAILED = 3003,
  NOTE_DELETE_FAILED = 3004,
}

// HTTP 响应类型（外层）
export interface ApiResponse<T = any> {
  code: ResponseCode;  // HTTP 状态码
  message: string;
  data: T;
}

// 业务响应类型（内层）
export interface BusinessResponse<T = any> {
  code: BusinessCode;  // 业务状态码
  message: string;
  data: T;
}

// 统一后的前端可用返回体
export interface UnifiedResult<T = any> {
  topCode: number;         // 顶层 code（等同 HTTP 语义）
  topMessage: string;      // 顶层 message
  bizCode: number;         // 业务 code（没有业务层时为 0）
  bizMessage: string;      // 业务 message（没有业务层时与顶层一致）
  data: T;                 // 真实数据载荷
  raw: ApiResponse<any>;   // 原始响应（便于调试）
}
