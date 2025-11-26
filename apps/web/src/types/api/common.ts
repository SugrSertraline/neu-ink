// API 通用类型定义

export interface BaseApiResponse<T = any> {
  data: T;
  success: boolean;
  message: string;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp?: string;
}

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  version?: string;
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// 请求配置
export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
  priority?: string;
}

// 响应配置
export interface ResponseConfig {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  url: string;
  redirected: boolean;
  type: ResponseType;
  ok: boolean;
  bodyUsed: boolean;
}

// 拦截器
export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onRequestError?: (error: any) => any;
}

export interface ResponseInterceptor {
  onResponse?: (response: any) => any | Promise<any>;
  onResponseError?: (error: any) => any;
}

// 缓存策略
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // 生存时间（秒）
  maxSize: number; // 最大缓存条目数
  strategy: 'lru' | 'fifo' | 'lfu'; // 缓存淘汰策略
  keyGenerator?: (config: RequestConfig) => string;
  shouldCache?: (config: RequestConfig) => boolean;
}

// 重试配置
export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
  retryDelayMultiplier?: number;
  maxRetryDelay?: number;
  retryableMethods?: string[];
  retryableStatusCodes?: number[];
}

// 超时配置
export interface TimeoutConfig {
  connect: number; // 连接超时（毫秒）
  read: number; // 读取超时（毫秒）
  write: number; // 写入超时（毫秒）
  total: number; // 总超时（毫秒）
}

// 认证配置
export interface AuthConfig {
  type: 'bearer' | 'basic' | 'apikey' | 'custom';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyHeader?: string;
  customHeaders?: Record<string, string>;
  refreshUrl?: string;
  refreshToken?: string;
  tokenRefreshThreshold?: number; // 提前刷新令牌的时间阈值（秒）
}

// 请求/响应转换器
export interface RequestTransformer {
  transform?: (data: any, headers: Record<string, string>) => any;
  headers?: Record<string, string>;
}

export interface ResponseTransformer {
  transform?: (data: any, headers: Record<string, string>) => any;
  validate?: (data: any) => boolean;
  errorMessage?: string;
}

// API 客户端配置
export interface ApiClientConfig {
  baseURL: string;
  timeout: TimeoutConfig;
  retry: RetryConfig;
  cache: CacheConfig;
  auth: AuthConfig;
  headers: Record<string, string>;
  interceptors: {
    request: RequestInterceptor[];
    response: ResponseInterceptor[];
  };
  transformers: {
    request: RequestTransformer[];
    response: ResponseTransformer[];
  };
  validateStatus?: (status: number) => boolean;
  errorHandler?: (error: any) => any;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  onRetry?: (config: RequestConfig, retryCount: number) => void;
  onTimeout?: (config: RequestConfig) => void;
}

// 服务端点配置
export interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameters?: ParameterConfig[];
  requestBody?: RequestBodyConfig;
  responses?: ResponseConfig[];
  authentication?: boolean;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
  timeout?: TimeoutConfig;
  retry?: RetryConfig;
}

export interface ParameterConfig {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  type: string;
  description?: string;
  example?: any;
  schema?: any;
}

export interface RequestBodyConfig {
  required: boolean;
  contentType: string;
  schema?: any;
  example?: any;
}

export interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
  message?: string; // 限制时的消息
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean; // 是否跳过失败请求
}

// WebSocket 配置
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeat?: {
    enabled: boolean;
    interval: number;
    message: any;
  };
  authentication?: AuthConfig;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
}

// 文件上传配置
export interface UploadConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: Record<string, any>;
  file: File | Blob;
  fieldName?: string;
  filename?: string;
  contentType?: string;
  chunkSize?: number;
  concurrent?: number;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  onAbort?: () => void;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // 上传速度（字节/秒）
  timeRemaining: number; // 剩余时间（秒）
  chunkIndex?: number;
  totalChunks?: number;
}

// 文件下载配置
export interface DownloadConfig {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  filename?: string;
  saveAs?: boolean;
  onProgress?: (progress: DownloadProgress) => void;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  onAbort?: () => void;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number; // 下载速度（字节/秒）
  timeRemaining: number; // 剩余时间（秒）
}

// 批量请求配置
export interface BatchRequestConfig {
  requests: RequestConfig[];
  concurrency?: number; // 并发请求数
  delay?: number; // 请求间延迟（毫秒）
  stopOnFirstError?: boolean; // 是否在第一个错误时停止
  aggregateResults?: boolean; // 是否聚合结果
  onProgress?: (progress: BatchProgress) => void;
  onSuccess?: (results: any[]) => void;
  onError?: (error: any, index: number) => void;
  onComplete?: (results: any[]) => void;
}

export interface BatchProgress {
  completed: number;
  total: number;
  percentage: number;
  current?: RequestConfig;
  errors: Array<{ error: any; index: number }>;
}

// 请求队列配置
export interface RequestQueueConfig {
  maxSize: number;
  concurrency: number;
  timeout: number;
  priority?: boolean; // 是否启用优先级队列
  onAdd?: (request: RequestConfig) => void;
  onRemove?: (request: RequestConfig) => void;
  onProcess?: (request: RequestConfig) => void;
  onComplete?: (request: RequestConfig, response: any) => void;
  onError?: (request: RequestConfig, error: any) => void;
  onTimeout?: (request: RequestConfig) => void;
}

// 健康检查配置
export interface HealthCheckConfig {
  endpoint: string;
  interval: number; // 检查间隔（毫秒）
  timeout: number; // 超时时间（毫秒）
  retries: number; // 重试次数
  expectedStatus?: number; // 期望的状态码
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  onTimeout?: () => void;
}

// 监控配置
export interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logPerformance: boolean;
  metricsEndpoint?: string;
  customMetrics?: Record<string, (data: any) => any>;
  samplingRate?: number; // 采样率（0-1）
}

// 性能监控
export interface PerformanceMetrics {
  requestId: string;
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  size: {
    request: number;
    response: number;
  };
  cache: {
    hit: boolean;
    key?: string;
    ttl?: number;
  };
  retry: {
    count: number;
    delay: number;
  };
  network: {
    connectTime: number;
    dnsTime: number;
    sslTime: number;
    firstByteTime: number;
  };
}

// API 版本控制
export interface ApiVersionConfig {
  version: string;
  defaultVersion: string;
  supportedVersions: string[];
  versionHeader?: string;
  versionParameter?: string;
  versionStrategy: 'header' | 'parameter' | 'url' | 'custom';
  customVersionHandler?: (config: RequestConfig, version: string) => RequestConfig;
}

// 环境配置
export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout: TimeoutConfig;
  retry: RetryConfig;
  cache: CacheConfig;
  auth: AuthConfig;
  headers: Record<string, string>;
  logging: MonitoringConfig;
  features: Record<string, boolean>;
}

// API 客户端实例
export interface ApiClientInstance {
  config: ApiClientConfig;
  request: <T = any>(config: RequestConfig) => Promise<T>;
  get: <T = any>(url: string, config?: Partial<RequestConfig>) => Promise<T>;
  post: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => Promise<T>;
  put: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => Promise<T>;
  patch: <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => Promise<T>;
  delete: <T = any>(url: string, config?: Partial<RequestConfig>) => Promise<T>;
  upload: (config: UploadConfig) => Promise<any>;
  download: (config: DownloadConfig) => Promise<any>;
  batch: (config: BatchRequestConfig) => Promise<any[]>;
  setConfig: (config: Partial<ApiClientConfig>) => void;
  getConfig: () => ApiClientConfig;
  addInterceptor: (type: 'request' | 'response', interceptor: any) => void;
  removeInterceptor: (type: 'request' | 'response', interceptor: any) => void;
  clearCache: () => void;
  getMetrics: () => PerformanceMetrics[];
  healthCheck: (config?: HealthCheckConfig) => Promise<boolean>;
}