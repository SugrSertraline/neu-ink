// utils/apiHelpers.ts
import type { UnifiedResult } from '@/types/api';

export const ensureUnified = <T,>(result: UnifiedResult<T>): T => {
  if (result.bizCode === 0 && result.data) {
    return result.data;
  }
  throw new Error(result.bizMessage ?? '未知错误');
};
