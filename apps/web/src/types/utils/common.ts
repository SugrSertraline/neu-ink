// 通用工具类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ID = string;
export type Timestamp = string | Date;
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export interface JsonArray extends Array<JsonValue> {}

// 泛型类型
export interface Repository<T, ID = string> {
  findById: (id: ID) => Promise<T | null>;
  findAll: (params?: any) => Promise<T[]>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: ID, data: Partial<T>) => Promise<T>;
  delete: (id: ID) => Promise<void>;
}

export interface Service<T, ID = string> {
  get: (id: ID) => Promise<ApiResponse<T>>;
  list: (params?: any) => Promise<ApiResponse<T[]>>;
  create: (data: Partial<T>) => Promise<ApiResponse<T>>;
  update: (id: ID, data: Partial<T>) => Promise<ApiResponse<T>>;
  delete: (id: ID) => Promise<ApiResponse<void>>;
}

// 基础 API 响应类型
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message: string;
  error?: ErrorDetail;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}