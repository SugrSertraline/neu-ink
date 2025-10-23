// 业务状态码
export enum BusinessCode {
  SUCCESS = 200,
  INVALID_PARAMS = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

// 业务响应类型
export interface BusinessResponse<T = any> {
  code: BusinessCode;
  message: string;
  data: T;
}
