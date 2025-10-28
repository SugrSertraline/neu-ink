// lib/http/normalize.ts
import {
  ApiResponse,
  BusinessResponse,
  UnifiedResult,
  ResponseCode,
  BusinessCode,
} from '@/types/api';
import { apiClient } from './client';

// 类型守卫：判断 data 是否为业务包裹
function isBusinessEnvelope<T = any>(data: any): data is BusinessResponse<T> {
  return data && typeof data === 'object'
    && typeof data.code === 'number'
    && typeof data.message === 'string'
    && 'data' in data;
}

// 归一化：ApiResponse<T | BusinessResponse<T>> -> UnifiedResult<T>
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

function shouldResetAuth(topCode: number, bizCode?: number, errMsg?: string) {
  if (topCode === ResponseCode.UNAUTHORIZED) return true;
  if (bizCode === BusinessCode.TOKEN_INVALID || bizCode === BusinessCode.TOKEN_EXPIRED) return true;

  if (errMsg) {
    const s = `${errMsg}`.toLowerCase();
    if (
      s.includes('401') ||
      s.includes('unauthorized') ||
      (s.includes('token') && (s.includes('invalid') || s.includes('expired') || s.includes('过期') || s.includes('无效')))
    ) return true;
  }
  return false;
}

function resetAuthAndRedirect() {
  try { apiClient.clearToken(); } catch {}
  if (typeof window !== 'undefined') {
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?from=${from}`;
  }
}

// 包装器：请求 + 归一化 + 401/Token失效防抖处理
export async function callAndNormalize<T>(p: Promise<ApiResponse<any>>): Promise<UnifiedResult<T>> {
  try {
    const res = await p;
    const uni = normalize<T>(res);
    if (shouldResetAuth(uni.topCode, uni.bizCode)) {
      resetAuthAndRedirect();
    }
    return uni;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (shouldResetAuth(ResponseCode.UNAUTHORIZED, undefined, msg)) {
      resetAuthAndRedirect();
    }
    throw err;
  }
}

// 对外通用工具
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
