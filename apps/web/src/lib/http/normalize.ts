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
  // 只有明确的认证错误才重置认证状态
  if (topCode === ResponseCode.UNAUTHORIZED) return true;
  if (bizCode === BusinessCode.TOKEN_INVALID || bizCode === BusinessCode.TOKEN_EXPIRED) return true;

  // 检查错误消息，但更加严格，避免误判
  if (errMsg) {
    const s = `${errMsg}`.toLowerCase();
    // 只检查明确的认证相关错误
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
    
    // 排除明确的业务错误，这些不应该导致登出
    if (
      s.includes('无效的论文ID') ||
      s.includes('论文不存在') ||
      s.includes('章节数据不能为空') ||
      s.includes('block数据不能为空') ||
      s.includes('文本内容不能为空') ||
      s.includes('更新数据不能为空') ||
      s.includes('参数错误')
    ) {
      return false;
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
