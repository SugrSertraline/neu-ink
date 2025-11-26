// 基础 API 服务类
import { ApiResponse, createErrorResponse, createSuccessResponse } from '@/lib/http/normalize';

export abstract class BaseApiService {
  protected abstract getClient(): any;  
  
  protected async callApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const client = this.getClient();
    
    try {
      const response = await client.request(method, endpoint, data, options);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  protected handleResponse<T>(response: any): ApiResponse<T> {
    return createSuccessResponse(response.data, response.message);
  }
  
  protected handleError(error: any): ApiResponse<never> {
    return createErrorResponse(error) as unknown as ApiResponse<never>;
  }
}