// lib/http/client.ts
import { ApiResponse } from '@/types/api';
import { ApiError } from './errors';

// 新的API基础配置，适配后端API文档
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5050';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1';
const AUTH_STORAGE_KEY = 'auth_token';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export class ApiClient {
  private baseURL: string;
  private apiPrefix: string;
  private token: string | null = null;
  private defaultTimeoutMs = 600_000; // 增加到10分钟，以适应大文件下载和LLM解析的延迟

  constructor(baseURL: string, apiPrefix: string = '') {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.apiPrefix = apiPrefix;
    this.loadToken();
  }

  // ===== Token =====
  private loadToken(): void {
    if (typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem(AUTH_STORAGE_KEY);
      } catch {}
    }
  }

  /** 每次请求前用它拿“最新”的 token（优先内存，其次 localStorage） */
  private resolveToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(AUTH_STORAGE_KEY);
      } catch {}
    }
    return null;
  }

  setToken(token: string): void {
    this.token = token || null;
    if (typeof window !== 'undefined' && token) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, token);
      } catch {}
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
    }
  }

  getToken(): string | null {
    return this.resolveToken();
  }

  // ===== URL helpers =====
  getBaseURL(): string {
    return this.baseURL;
  }

  getApiPrefix(): string {
    return this.apiPrefix;
  }

  getFullURL(endpoint: string): string {
    if (/^https?:\/\//i.test(endpoint)) return endpoint;
    if (endpoint.startsWith('/api')) return `${this.baseURL}${endpoint}`;
    return `${this.baseURL}${this.apiPrefix}${endpoint}`;
  }

  // ===== Request core =====
  private getHeaders(extra?: HeadersInit): HeadersInit {
    const token = this.resolveToken();

    // 统一默认 JSON；上传（FormData）会走 upload()，不受这里影响
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 让调用方可以覆盖/追加
    if (extra) {
      // 兼容多种 HeadersInit 形态
      if (extra instanceof Headers) {
        extra.forEach((v, k) => (headers[k] = v));
      } else if (Array.isArray(extra)) {
        for (const [k, v] of extra) headers[k] = String(v);
      } else {
        Object.assign(headers, extra as Record<string, string>);
      }
    }

    return headers;
  }

  private async doFetch(url: string, init: RequestInit & { timeout?: number } = {}, isRetry: boolean = false): Promise<ApiResponse<any>> {
    console.log('ApiClient.doFetch 开始:', { url, method: init.method, isRetry });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), init.timeout ?? this.defaultTimeoutMs);

    try {
      console.log('发送 fetch 请求:', { url, method: init.method, headers: init.headers });
      const res = await fetch(url, {
        // 👇 总是带上 cookie（如后端也做了 session 校验时）
        credentials: 'include',
        // 可按需保留/移除，跨域时建议保留
        mode: 'cors',
        ...init,
        signal: controller.signal,
      });
      console.log('收到 fetch 响应:', { url, status: res.status, ok: res.ok });

      const text = await res.text();
      console.log('响应文本内容:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));

      if (!text) {
        throw new ApiError('Empty response from server', { status: res.status, url });
      }

      let data: any;
      try {
        data = JSON.parse(text);
        console.log('解析后的JSON数据:', data);
      } catch (e) {
        console.error('JSON解析失败:', e, '原始文本:', text);
        throw new ApiError('Invalid JSON response', { status: res.status, url, payload: text as any });
      }

      // 处理401错误，尝试刷新token（如果不是重试请求）
      if (!res.ok && res.status === 401 && !isRetry) {
        // 检查是否是登录接口的请求
        const isLoginRequest = url.includes('/users/login');
        
        // 如果是登录接口的401错误，不尝试刷新token，直接返回错误
        if (isLoginRequest) {
          // 登录接口返回401错误，不尝试刷新token
        } else {
          const token = this.resolveToken();
          if (token) {
            try {
              // 尝试刷新token
              const { authService } = await import('../services/auth');
              const refreshResult = await authService.refreshToken();
              
              // 如果刷新成功，使用新token重试原请求
              if (refreshResult.data?.token) {
                clearTimeout(timeoutId);
                
                // 更新请求头中的token
                const newHeaders = this.getHeaders(init.headers);
                return this.doFetch(url, {
                  ...init,
                  headers: newHeaders,
                }, true); // 标记为重试请求
              }
            } catch (refreshError) {
              console.error('[DEBUG] Token刷新失败:', refreshError);
            }
          }
        }
      }

      if (!res.ok) {
        // 尝试从多个可能的字段获取错误信息
        let message = data?.message || data?.bizMessage || `HTTP ${res.status}`;
        
        // 如果是双重嵌套的响应格式，尝试从内层获取错误信息
        if (data?.data?.message) {
          message = data.data.message;
        } else if (data?.data?.bizMessage) {
          message = data.data.bizMessage;
        }
        
        // API请求失败调试信息已移除
        
        // 对于401错误，添加特殊标记以便后续处理
        const errorOptions = { status: res.status, url, payload: data };
        if (res.status === 401) {
          (errorOptions as any).isAuthError = true;
          (errorOptions as any).authReset = true;
        }
        
        throw new ApiError(message, errorOptions);
      }

      // API响应数据调试信息已移除

      // 直接返回原始数据，让 normalize.ts 处理业务响应格式
      return {
        code: res.status as any,
        message: data.message || 'Success',
        data: data
      } as ApiResponse<any>;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new ApiError('Request timeout', { status: 0, url });
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError(err?.message || 'Network error', { status: 0, url });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private request<T>(endpoint: string, method: HttpMethod, body?: any, headers?: HeadersInit) {
    const url = this.getFullURL(endpoint);
    console.log('ApiClient.request 被调用:', { endpoint, method, url, body });
    return this.doFetch(url, {
      method,
      headers: this.getHeaders(headers), // 👈 这里的 headers 已经包含最新 token
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }) as Promise<ApiResponse<T>>;
  }

  // ===== Public HTTP verbs =====
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, 'GET');
  }

  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, 'POST', data);
  }

  put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, 'PUT', data);
  }

  patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, 'PATCH', data);
  }

  delete<T>(endpoint: string) {
    console.log('ApiClient.delete 被调用:', endpoint);
    return this.request<T>(endpoint, 'DELETE');
  }

  // 上传走 multipart/form-data
  async upload<T>(endpoint: string, formData: FormData) {
    const url = this.getFullURL(endpoint);
    const token = this.resolveToken();

    const headers: HeadersInit = {};
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

    const data = await this.doFetch(url, {
      method: 'POST',
      headers,               // 不设置 Content-Type，浏览器会自动带 boundary
      body: formData,
      credentials: 'include',// 👈 上传也带 cookie
      mode: 'cors',
    });

    return data as ApiResponse<T>;
  }

  // ===== Server-Sent Events =====
  /**
   * 创建带有认证的EventSource（GET方法）
   */
  createAuthenticatedEventSource(url: string, params?: URLSearchParams): EventSource {
    const fullUrl = this.getFullURL(url);
    const token = this.resolveToken();
    
    // 添加认证token到URL参数
    if (token) {
      if (!params) {
        params = new URLSearchParams();
      }
      params.set('token', token);
    }
    
    const finalUrl = params ? `${fullUrl}?${params.toString()}` : fullUrl;
    const eventSource = new EventSource(finalUrl);
    
    // 添加连接超时检查
    const connectionTimeout = setTimeout(() => {
      if (eventSource.readyState === EventSource.CONNECTING) {
        // EventSource 连接超时调试信息已移除
        // 不直接关闭，让组件自己处理超时逻辑
      }
    }, 15000); // 15秒连接超时
    
    // 当连接成功建立时清除超时
    eventSource.onopen = () => {
      // EventSource 连接已建立
      clearTimeout(connectionTimeout);
    };
    
    // 当连接关闭时清除超时
    eventSource.onerror = () => {
      clearTimeout(connectionTimeout);
    };
    
    return eventSource;
  }

  /**
   * 创建带有认证的EventSource（POST方法）
   * 由于EventSource只支持GET请求，这里使用fetch实现类似的功能
   */
  createAuthenticatedEventSourceWithPost(
    url: string,
    data: any,
    onMessage: (event: MessageEvent) => void,
    onError?: (event: Event) => void,
    onClose?: () => void
  ): { close: () => void } {
    const fullUrl = this.getFullURL(url);
    const token = this.resolveToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let aborted = false;
    const controller = new AbortController();
    let connectionEstablished = false;


    // 添加连接超时检查
    const connectionTimeout = setTimeout(() => {
      if (!connectionEstablished && !aborted) {
        // EventSource-POST 连接超时调试信息已移除
        if (onError) {
          const event = new Event('error');
          onError(event);
        }
      }
    }, 15000); // 15秒连接超时

    // 使用fetch发送POST请求，处理Server-Sent Events
    fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
      credentials: 'include',
    })
    .then(response => {
      if (aborted) return;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      connectionEstablished = true;
      clearTimeout(connectionTimeout);
      // EventSource-POST 连接已建立
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      function processText(text: string) {
        buffer += text;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能不完整）

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (onClose) onClose();
              return;
            }
            try {
              const parsedData = JSON.parse(data);
              const event = new MessageEvent('message', { data: parsedData });
              onMessage(event);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          } else if (line.startsWith('event: end')) {
            // 处理后端发送的结束事件
            if (onClose) onClose();
            return;
          }
        }
      }

      function read() {
        if (!reader || aborted) return;
        
        reader.read().then(({ done, value }) => {
          if (aborted || done) {
            if (onClose) onClose();
            return;
          }
          
          const text = decoder.decode(value, { stream: true });
          processText(text);
          read();
        }).catch(error => {
          if (!aborted && onError) {
            // EventSource-POST 读取错误调试信息已移除
            const event = new Event('error');
            onError(event);
          }
        });
      }

      read();
    })
    .catch(error => {
      if (!aborted) {
        clearTimeout(connectionTimeout);
        // EventSource-POST 连接错误调试信息已移除
        if (onError) {
          const event = new Event('error');
          onError(event);
        }
      }
    });

    return {
      close: () => {
        aborted = true;
        connectionEstablished = false;
        clearTimeout(connectionTimeout);
        controller.abort();
      }
    };
  }
}

// 单例客户端
export const apiClient = new ApiClient(API_BASE, API_PREFIX);
