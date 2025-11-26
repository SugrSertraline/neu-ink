// 基础服务类型定义
export interface BaseServiceConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  search?: string;
  filters?: Record<string, any>;
}

export interface ListOptions extends PaginationOptions, SearchOptions {}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

export interface ServiceResponse<T = any> {
  data: T;
  success: boolean;
  message: string;
  error?: ServiceError;
}