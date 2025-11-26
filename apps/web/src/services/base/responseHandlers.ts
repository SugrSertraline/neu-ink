// 响应处理器
import { ApiResponse, BusinessCode, ResponseCode } from '@/types/api';
import { ServiceResponse, ServiceError } from './BaseServiceTypes';

export const createSuccessResponse = <T>(data: T, message?: string): ServiceResponse<T> => ({
  data,
  success: true,
  message: message || '操作成功',
});

export const createErrorResponse = (error: Error | string): ServiceResponse<never> => {
  const message = typeof error === 'string' ? error : error.message;
  const serviceError: ServiceError = {
    code: 'SERVICE_ERROR',
    message,
  };
  
  if (error instanceof Error) {
    serviceError.details = error.stack;
  }
  
  return {
    data: null as never,
    success: false,
    message,
    error: serviceError,
  };
};

export const handleApiResponse = <T>(response: ApiResponse<T>): ServiceResponse<T> => {
  if (response.code === ResponseCode.SUCCESS || response.code === ResponseCode.CREATED) {
    return createSuccessResponse(response.data, response.message);
  } else {
    return createErrorResponse(response.message);
  }
};

export const handleBusinessResponse = <T>(response: ApiResponse<T>): ServiceResponse<T> => {
  // 检查是否有双重嵌套的响应格式
  if (response.data && typeof response.data === 'object' && 'code' in response.data && 'data' in response.data) {
    const businessResponse = response.data as any;
    
    if (businessResponse.code === BusinessCode.SUCCESS) {
      return createSuccessResponse(businessResponse.data, businessResponse.message);
    } else {
      return createErrorResponse(businessResponse.message);
    }
  }
  
  // 如果没有双重嵌套，直接处理
  return handleApiResponse(response);
};

export const isServiceSuccess = <T>(response: ServiceResponse<T>): response is ServiceResponse<T> & { success: true } => {
  return response.success;
};

export const isServiceError = <T>(response: ServiceResponse<T>): response is ServiceResponse<T> & { success: false } => {
  return !response.success;
};