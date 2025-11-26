// API 错误类型定义

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp?: string;
  requestId?: string;
  stack?: string;
}

export interface ValidationError extends ApiError {
  field: string;
  value?: any;
  constraints?: Record<string, string>;
}

export interface AuthenticationError extends ApiError {
  type: 'unauthorized' | 'forbidden' | 'token_expired' | 'invalid_token';
  retryAfter?: number;
}

export interface RateLimitError extends ApiError {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}

export interface NetworkError extends ApiError {
  type: 'timeout' | 'connection_error' | 'dns_error' | 'cors_error';
  statusCode?: number;
  statusText?: string;
  url?: string;
}

export interface ServerError extends ApiError {
  type: 'internal_error' | 'service_unavailable' | 'gateway_timeout' | 'bad_gateway';
  statusCode: number;
  statusText: string;
  upstreamService?: string;
}

export interface ClientError extends ApiError {
  type: 'bad_request' | 'not_found' | 'method_not_allowed' | 'conflict';
  statusCode: number;
  statusText: string;
}

export interface ParseError extends ApiError {
  type: 'invalid_json' | 'invalid_xml' | 'invalid_yaml' | 'invalid_csv';
  line?: number;
  column?: number;
  position?: number;
}

export interface UploadError extends ApiError {
  type: 'file_too_large' | 'invalid_file_type' | 'corrupted_file' | 'upload_failed';
  fileName?: string;
  fileSize?: number;
  allowedTypes?: string[];
  maxSize?: number;
}

export interface DatabaseError extends ApiError {
  type: 'connection_failed' | 'query_failed' | 'constraint_violation' | 'migration_failed';
  query?: string;
  table?: string;
  constraint?: string;
}

export interface ExternalServiceError extends ApiError {
  type: 'service_unavailable' | 'api_limit_exceeded' | 'invalid_credentials' | 'timeout';
  service: string;
  endpoint?: string;
  statusCode?: number;
  responseHeaders?: Record<string, string>;
}

export interface BusinessLogicError extends ApiError {
  type: 'resource_not_found' | 'access_denied' | 'quota_exceeded' | 'invalid_operation';
  resource?: string;
  resourceId?: string;
  operation?: string;
  currentQuota?: number;
  maxQuota?: number;
}

// 错误代码枚举
export enum ErrorCodes {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED',
  
  // 权限错误
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_IN_USE = 'RESOURCE_IN_USE',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // 验证错误
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  PASSWORD_MISMATCH = 'PASSWORD_MISMATCH',
  
  // 限制错误
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // 文件错误
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  
  // 服务错误
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  
  // 解析错误
  INVALID_JSON = 'INVALID_JSON',
  INVALID_XML = 'INVALID_XML',
  INVALID_YAML = 'INVALID_YAML',
  INVALID_CSV = 'INVALID_CSV',
  PARSE_ERROR = 'PARSE_ERROR',
  
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  DNS_ERROR = 'DNS_ERROR',
  CORS_ERROR = 'CORS_ERROR',
  
  // 服务器错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  SERVICE_UNAVAILABLE_503 = 'SERVICE_UNAVAILABLE_503',
  
  // 业务逻辑错误
  INVALID_OPERATION = 'INVALID_OPERATION',
  OPERATION_FAILED = 'OPERATION_FAILED',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // 翻译错误
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  TRANSLATION_SERVICE_UNAVAILABLE = 'TRANSLATION_SERVICE_UNAVAILABLE',
  UNSUPPORTED_LANGUAGE = 'UNSUPPORTED_LANGUAGE',
  TRANSLATION_QUOTA_EXCEEDED = 'TRANSLATION_QUOTA_EXCEEDED',
  
  // 解析错误
  PARSING_FAILED = 'PARSING_FAILED',
  PARSING_TIMEOUT = 'PARSING_TIMEOUT',
  UNSUPPORTED_FILE_FORMAT = 'UNSUPPORTED_FILE_FORMAT',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  
  // 导出错误
  EXPORT_FAILED = 'EXPORT_FAILED',
  EXPORT_TIMEOUT = 'EXPORT_TIMEOUT',
  UNSUPPORTED_EXPORT_FORMAT = 'UNSUPPORTED_EXPORT_FORMAT',
  EXPORT_SIZE_LIMIT_EXCEEDED = 'EXPORT_SIZE_LIMIT_EXCEEDED',
}

// 错误严重级别
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 错误分类
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  INFRASTRUCTURE = 'infrastructure',
  NETWORK = 'network',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  USER_INPUT = 'user_input',
  SYSTEM = 'system',
}

// 错误上下文
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  timestamp?: string;
  environment?: 'development' | 'staging' | 'production';
  version?: string;
  buildNumber?: string;
}

// 错误报告
export interface ErrorReport {
  id: string;
  error: ApiError;
  context: ErrorContext;
  severity: ErrorSeverity;
  category: ErrorCategory;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  occurrences: number;
  firstOccurrence: string;
  lastOccurrence: string;
}

// 错误恢复策略
export interface ErrorRecoveryStrategy {
  type: 'retry' | 'fallback' | 'ignore' | 'redirect' | 'refresh' | 'reauthenticate';
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrl?: string;
  fallbackData?: any;
  successCriteria?: (response: any) => boolean;
}

// 错误处理配置
export interface ErrorHandlingConfig {
  enableLogging: boolean;
  enableReporting: boolean;
  enableUserNotification: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  fallbackUrls: Record<string, string>;
  recoveryStrategies: Record<string, ErrorRecoveryStrategy>;
}

// 错误通知
export interface ErrorNotification {
  id: string;
  type: 'toast' | 'modal' | 'banner' | 'inline';
  title: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
  dismissible?: boolean;
  persistent?: boolean;
}

// 错误监控
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorsByUser: Record<string, number>;
  errorsByUrl: Record<string, number>;
  averageResolutionTime: number;
  unresolvedErrors: number;
  criticalErrors: number;
  lastUpdated: string;
}

// 错误追踪
export interface ErrorTrace {
  id: string;
  errorId: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  context?: ErrorContext;
}