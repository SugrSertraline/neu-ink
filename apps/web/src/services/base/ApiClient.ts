// API 客户端类
import { ApiResponse } from '@/types/api';

export interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  
  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }
  
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...options?.headers,
      },
      ...options,
    };
    
    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, config);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  getBaseURL(): string {
    return this.baseUrl;
  }
  
  setHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }
  
  clearHeaders(): void {
    this.headers = {};
  }
}