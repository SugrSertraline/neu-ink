// 通用 API 调用 Hook
import { useState, useCallback } from 'react';
import { ApiResponse } from '@/types/api';

export interface UseApiCallOptions<T, P extends any[]> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  immediate?: boolean;
}

export interface UseApiCallReturn<T, P extends any[]> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...params: P) => Promise<T>;
  reset: () => void;
}

export function useApiCall<T, P extends any[] = []>(
  apiFunction: (...params: P) => Promise<ApiResponse<T>>,
  options: UseApiCallOptions<T, P> = {}
): UseApiCallReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const execute = useCallback(async (...params: P): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFunction(...params);
      
      // 检查响应是否成功（基于 HTTP 状态码）
      if (response.code >= 200 && response.code < 300) {
        setData(response.data);
        options.onSuccess?.(response.data);
        return response.data;
      } else {
        throw new Error(response.message || '请求失败');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知错误');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
      options.onComplete?.();
    }
  }, [apiFunction, options]);
  
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);
  
  return { data, loading, error, execute, reset };
}