// lib/http/normalize.ts
import {
  ApiResponse,
  BusinessResponse,
  UnifiedResult,
  ResponseCode,
  BusinessCode,
} from '@/types/api';
import { apiClient } from './client';

function isBusinessEnvelope<T = any>(data: any): data is BusinessResponse<T> {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.code === 'number' &&
    typeof data.message === 'string' &&
    'data' in data
  );
}

export function normalize<T = any>(res: ApiResponse<T | BusinessResponse<T>>): UnifiedResult<T> {
  const topCode = (res.code ?? ResponseCode.SUCCESS) as number;
  const topMessage = res.message ?? '';

  if (isBusinessEnvelope<T>(res.data)) {
    return {
      topCode,
      topMessage,
      bizCode: res.data.code,
      bizMessage: res.data.message,
      data: res.data.data,
      raw: res as ApiResponse<any>,
    };
  }

  return {
    topCode,
    topMessage,
    bizCode: BusinessCode.SUCCESS,
    bizMessage: topMessage || '操作成功',
    data: res.data as T,
    raw: res as ApiResponse<any>,
  };
}

export function shouldResetAuth(topCode: number, bizCode?: number, errMsg?: string) {
  if (topCode === ResponseCode.UNAUTHORIZED) return true;
  if (bizCode === BusinessCode.TOKEN_INVALID || bizCode === BusinessCode.TOKEN_EXPIRED) return true;

  if (errMsg) {
    const s = `${errMsg}`.toLowerCase();
    if (
      s.includes('401') ||
      s.includes('unauthorized') ||
      (s.includes('token') &&
        (s.includes('invalid') ||
          s.includes('expired') ||
          s.includes('过期') ||
          s.includes('无效')))
    ) {
      return true;
    }
  }
  return false;
}

function markAuthReset(target: unknown) {
  try {
    apiClient.clearToken();
  } catch {
    /* noop */
  }
  if (target && typeof target === 'object') {
    Object.assign(target as Record<string, unknown>, { authReset: true });
  }
}
export type AuthAwareResult<T> = UnifiedResult<T> & { authReset?: boolean };

export async function callAndNormalize<T>(
  p: Promise<ApiResponse<any>>,
): Promise<AuthAwareResult<T>> {
  try {
    const res = await p;
    const uni = normalize<T>(res) as UnifiedResult<T> & { authReset?: boolean };

    if (shouldResetAuth(uni.topCode, uni.bizCode)) {
      markAuthReset(uni);
    }
    return uni;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (shouldResetAuth(ResponseCode.UNAUTHORIZED, undefined, msg)) {
      markAuthReset(err);
    }
    throw err;
  }
}

export function isSuccess(res: UnifiedResult<any>) {
  return res.topCode === ResponseCode.SUCCESS && res.bizCode === BusinessCode.SUCCESS;
}

export function toAbsoluteUrl(relativeUrl: string): string {
  if (!relativeUrl) return '';
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  const base = apiClient.getBaseURL().replace(/\/+$/, '');
  return `${base}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}

export const API_BASE = apiClient.getBaseURL();
