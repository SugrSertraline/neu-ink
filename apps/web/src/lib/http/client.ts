// lib/http/client.ts
import { ApiResponse } from '@/types/api';
import { ApiError } from './errors';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1';
const AUTH_STORAGE_KEY = 'auth_token';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export class ApiClient {
  private baseURL: string;
  private apiPrefix: string;
  private token: string | null = null;
  private defaultTimeoutMs = 30_000;

  constructor(baseURL: string, apiPrefix: string = '') {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.apiPrefix = apiPrefix;
    this.loadToken();
  }

  // ===== Token =====
  private loadToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(AUTH_STORAGE_KEY);
    }
  }

  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
    }
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  getToken(): string | null {
    return this.token;
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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return { ...headers, ...extra };
  }

  private async doFetch(url: string, init: RequestInit & { timeout?: number } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), init.timeout ?? this.defaultTimeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();

      if (!text) {
        // 空体也视为错误，便于上层统一处理
        throw new ApiError('Empty response from server', { status: res.status, url });
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new ApiError('Invalid JSON response', { status: res.status, url, payload: text as any });
      }

      if (!res.ok) {
        // 服务端通常会在 data.message 上放错误文案
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
      headers: this.getHeaders(headers),
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

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, 'DELETE');
  }

  // 上传走 multipart/form-data
  async upload<T>(endpoint: string, formData: FormData) {
    const url = this.getFullURL(endpoint);
    const headers: HeadersInit = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const data = await this.doFetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    return data as ApiResponse<T>;
  }
}

// 单例客户端
export const apiClient = new ApiClient(API_BASE, API_PREFIX);
