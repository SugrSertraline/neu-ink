// 通用变更 Hook
import { useApiCall, type UseApiCallOptions } from './useApiCall';

export interface UseMutationOptions<T, P extends any[]> extends UseApiCallOptions<T, P> {
  onSuccessMessage?: string;
  onErrorMessage?: string;
}

export function useMutation<T, P extends any[] = []>(
  mutationFn: (...params: P) => Promise<any>,
  options: UseMutationOptions<T, P> = {}
) {
  return useApiCall(mutationFn, {
    ...options,
    onSuccess: (data) => {
      if (options.onSuccessMessage) {
        // 这里可以集成 toast 或其他通知系统
        console.log(options.onSuccessMessage);
      }
      options.onSuccess?.(data as T);
    },
    onError: (error) => {
      const message = options.onErrorMessage || error.message;
      // 这里可以集成 toast 或其他通知系统
      console.error(message);
      options.onError?.(error);
    },
  });
}