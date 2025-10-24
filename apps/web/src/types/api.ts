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
  SUCCESS = 0,                    // ✅ 业务成功（后端是 0）
  
  // 用户认证相关 1000-1099
  LOGIN_FAILED = 1001,            // 登录失败
  ACCOUNT_DISABLED = 1002,        // 账号被禁用
  PASSWORD_EXPIRED = 1003,        // 密码已过期
  INVALID_PARAMS = 1004,          // 参数错误
  USER_NOT_FOUND = 1005,          // 用户不存在
  USER_EXISTS = 1006,             // 用户已存在
  PERMISSION_DENIED = 1007,       // 权限不足
  TOKEN_INVALID = 1008,           // Token无效
  TOKEN_EXPIRED = 1009,           // Token已过期
  OLD_PASSWORD_WRONG = 1010,      // 旧密码错误
  INTERNAL_ERROR = 1999,          // 服务器内部错误
  
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
