// lib/http/normalize.ts
import {
  ApiResponse,
  BusinessResponse,
  UnifiedResult,
  ResponseCode,
  BusinessCode,
} from '@/types/api';
import { apiClient } from './client';
import { toast } from 'sonner';
import { ERROR_CODES, ERROR_MESSAGES, getErrorMessage } from '@/types/paper/constants';

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

  // 检查是否是业务响应格式：{code: 0, message: "...", data: {...}}
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
    bizMessage: '操作成功',
    data: res.data as T,
    raw: res as ApiResponse<any>,
  };
}

export function shouldResetAuth(topCode: number, bizCode?: number, errMsg?: string) {
  // 只有明确的认证错误才重置认证状态
  if (topCode === ResponseCode.UNAUTHORIZED) return true;
  if (bizCode === BusinessCode.TOKEN_INVALID || bizCode === BusinessCode.TOKEN_EXPIRED) return true;
  
  // 明确的权限错误也应该退出登录
  if (topCode === ResponseCode.FORBIDDEN) return true;
  if (bizCode === BusinessCode.PERMISSION_DENIED) return true;

  // 检查错误消息，但更加严格，避免误判
  if (errMsg) {
    const s = `${errMsg}`.toLowerCase();
    
    // 排除明确的业务错误，这些不应该导致登出
    if (
      s.includes('无效的论文ID') ||
      s.includes('论文不存在') ||
      s.includes('章节数据不能为空') ||
      s.includes('block数据不能为空') ||
      s.includes('文本内容不能为空') ||
      s.includes('更新数据不能为空') ||
      s.includes('参数错误') ||
      s.includes('无效的笔记ID') ||
      s.includes('笔记不存在') ||
      s.includes('笔记创建失败') ||
      s.includes('笔记更新失败') ||
      s.includes('笔记删除失败') ||
      s.includes('论文创建失败') ||
      s.includes('论文更新失败') ||
      s.includes('论文删除失败') ||
      s.includes('无效的论文数据')
    ) {
      return false;
    }
    
    // 只有在明确包含认证相关词汇时才认为是认证错误
    // 并且要确保不是业务错误中误包含的词汇
    if (
      s.includes('401') ||
      s.includes('unauthorized') ||
      (s.includes('token') && (
        s.includes('invalid') ||
        s.includes('expired') ||
        s.includes('过期') ||
        s.includes('无效')
      )) ||
      s.includes('认证失败') ||
      s.includes('登录已过期') ||
      s.includes('请重新登录')
    ) {
      return true;
    }
  }
  return false;
}

export function markAuthReset(target: unknown) {
  try {
    // 使用 authService 而不是直接使用 apiClient
    // 这里需要动态导入以避免循环依赖
    import('../services/auth').then(({ authService }) => {
      authService.clearToken();
    });
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
    
    // 特殊处理401错误 - 认证失败
    if (err && typeof err === 'object' && 'status' in err && err.status === ResponseCode.UNAUTHORIZED) {
      // 显示登录过期的提示
      toast.error('登录已过期', {
        description: '您的登录状态已失效，请重新登录',
        duration: 5000
      });
      
      // 标记需要重置认证状态
      markAuthReset(err);
      
      // 返回统一的结果对象，避免页面崩溃
      return {
        success: false,
        topCode: err.status,
        topMessage: '登录已过期',
        bizCode: BusinessCode.TOKEN_EXPIRED,
        bizMessage: '您的登录状态已失效，请重新登录',
        data: null as T,
        raw: err,
        authReset: true,
      } as AuthAwareResult<T>;
    }
    
    // 特殊处理400错误 - 使用sonner显示toast而不是让页面卡死
    if (err && typeof err === 'object' && 'status' in err) {
      if (err.status === ERROR_CODES.BAD_REQUEST) {
        let errorMessage: string = ERROR_MESSAGES.BAD_REQUEST;
        
        // 尝试从payload中提取业务错误信息
        if (err.payload && typeof err.payload === 'object') {
          // 检查是否有业务层的错误代码
          if (err.payload.data && typeof err.payload.data === 'object' && 'code' in err.payload.data) {
            errorMessage = getErrorMessage(err.payload.data.code, ERROR_MESSAGES.BAD_REQUEST);
          } else if (err.payload.message) {
            errorMessage = err.payload.message;
          }
        }
        
        // 使用sonner显示错误toast
        toast.error(errorMessage);
        
        // 返回统一的结果对象，避免页面崩溃
        return {
          success: false,
          topCode: err.status,
          topMessage: errorMessage,
          bizCode: BusinessCode.INTERNAL_ERROR,
          bizMessage: errorMessage,
          data: null as T,
          raw: err,
        } as AuthAwareResult<T>;
      }
      
      // 处理500错误 - 同样显示错误toast而不是让页面卡死
      if (err.status >= 500) {
        let errorMessage: string = `服务器错误 (${err.status})`;
        
        // 尝试从payload中提取详细的错误信息
        if (err.payload && typeof err.payload === 'object') {
          if (err.payload.message) {
            errorMessage = err.payload.message;
          } else if (err.payload.data && typeof err.payload.data === 'object' && 'message' in err.payload.data) {
            errorMessage = err.payload.data.message;
          }
        }
        
        // 使用sonner显示错误toast
        toast.error('操作失败', { description: errorMessage });
        
        // 返回统一的结果对象，避免页面崩溃
        return {
          success: false,
          topCode: err.status,
          topMessage: errorMessage,
          bizCode: BusinessCode.INTERNAL_ERROR,
          bizMessage: errorMessage,
          data: null as T,
          raw: err,
        } as AuthAwareResult<T>;
      }
    }
    
    // 对于其他未处理的错误，也返回统一的结果对象，避免页面崩溃
    console.error('Unhandled API error:', err);
    toast.error('请求失败', { description: msg });
    
    return {
      success: false,
      topCode: err?.status || 500,
      topMessage: msg,
      bizCode: BusinessCode.INTERNAL_ERROR,
      bizMessage: msg,
      data: null as T,
      raw: err,
    } as AuthAwareResult<T>;
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
