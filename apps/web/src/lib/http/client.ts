// lib/http/client.ts
import { ApiResponse } from '@/types/api';
import { ApiError } from './errors';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1';
const AUTH_STORAGE_KEY = 'auth_token';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export class ApiClient {
  private baseURL: string;
  private apiPrefix: string;
  private token: string | null = null;
  private defaultTimeoutMs = 300_000; // 增加到5分钟，以适应LLM解析的延迟

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

  private async doFetch(url: string, init: RequestInit & { timeout?: number } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), init.timeout ?? this.defaultTimeoutMs);

    try {
      const res = await fetch(url, {
        // 👇 总是带上 cookie（如后端也做了 session 校验时）
        credentials: 'include',
        // 可按需保留/移除，跨域时建议保留
        mode: 'cors',
        ...init,
        signal: controller.signal,
      });

      const text = await res.text();

      if (!text) {
        throw new ApiError('Empty response from server', { status: res.status, url });
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new ApiError('Invalid JSON response', { status: res.status, url, payload: text as any });
      }

      if (!res.ok) {
        const message = data?.message || `HTTP ${res.status}`;
        throw new ApiError(message, { status: res.status, url, payload: data });
      }

      return data as ApiResponse<any>;
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
}

// 单例客户端
export const apiClient = new ApiClient(API_BASE, API_PREFIX);
