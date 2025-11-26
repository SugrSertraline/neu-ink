// 通用查询 Hook
import { useEffect, useCallback } from 'react';
import { useApiCall, type UseApiCallOptions } from './useApiCall';

export interface UseQueryOptions<T> extends UseApiCallOptions<T, []> {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<any>,
  options: UseQueryOptions<T> = {}
) {
  const { data, loading, error, execute, reset } = useApiCall(
    queryFn,
    options
  );
  
  // 自动执行查询
  useEffect(() => {
    if (options.enabled !== false) {
      execute();
    }
  }, [execute, options.enabled]);
  
  // 定时刷新
  useEffect(() => {
    if (options.refetchInterval && options.enabled !== false) {
      const interval = setInterval(execute, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [execute, options.refetchInterval, options.enabled]);
  
  return {
    data,
    loading,
    error,
    refetch: execute,
    reset,
  };
}