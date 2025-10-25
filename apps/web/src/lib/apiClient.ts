import { ApiResponse } from "../types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || '/api/v1';

// HTTP请求工具类
class ApiClient {
  private baseURL: string;
  private apiPrefix: string;
  private token: string | null = null;

  constructor(baseURL: string, apiPrefix: string = '') {
    this.baseURL = baseURL;
    this.apiPrefix = apiPrefix;
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  getApiPrefix(): string {
    return this.apiPrefix;
  }

  // 获取完整的API URL（包含前缀）
  getFullURL(endpoint: string): string {
    if (endpoint.startsWith('/api')) {
      return `${this.baseURL}${endpoint}`;
    }
    return `${this.baseURL}${this.apiPrefix}${endpoint}`;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = this.getFullURL(endpoint);
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      console.log('[ApiClient] 请求URL:', url);
      console.log('[ApiClient] 请求配置:', config);
      
      const response = await fetch(url, config);
      
      console.log('[ApiClient] 响应状态:', response.status, response.statusText);
      
      // 检查响应是否为空
      const responseText = await response.text();
      console.log('[ApiClient] 响应原始文本:', responseText);
      
      if (!responseText) {
        throw new Error('服务器返回空响应');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[ApiClient] JSON解析失败:', parseError);
        throw new Error('响应格式错误：无法解析JSON');
      }
      
      console.log('[ApiClient] 解析后的数据:', data);

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('[ApiClient] API请求失败:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(API_BASE, API_PREFIX);
