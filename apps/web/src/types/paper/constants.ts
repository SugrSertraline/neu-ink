export const HEADER_HEIGHT = 112;
export const NOTES_PANEL_WIDTH = 320;
export const NOTES_PANEL_GAP = 32;
export const NOTES_PANEL_SHIFT = (NOTES_PANEL_WIDTH + NOTES_PANEL_GAP) / 2;
export const NOTES_PANEL_TOP = HEADER_HEIGHT + 24;

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  paragraph: '段落',
  heading: '标题',
  math: '公式',
  figure: '图示',
  table: '表格',
  code: '代码',
  'ordered-list': '有序列表',
  'unordered-list': '无序列表',
  quote: '引用',
  divider: '分隔线',
};

// 错误代码常量 - 与后端保持一致
export const ERROR_CODES = {
  // 网络层错误代码
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  
  // 业务层错误代码
  INVALID_PARAMS: 1004,
  TOKEN_INVALID: 1005,
  TOKEN_EXPIRED: 1006,
  PERMISSION_DENIED: 1007,
  RESOURCE_NOT_FOUND: 1008,
  DATA_VALIDATION_FAILED: 1009,
} as const;

// 错误消息映射 - 与后端保持一致
export const ERROR_MESSAGES = {
  // 网络层消息
  BAD_REQUEST: '请求参数错误',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '权限不足',
  NOT_FOUND: '资源不存在',
  INTERNAL_ERROR: '服务器内部错误',
  
  // 业务层消息
  INVALID_PARAMS: '参数错误',
  TOKEN_INVALID: '令牌无效',
  TOKEN_EXPIRED: '令牌已过期',
  PERMISSION_DENIED: '权限不足',
  RESOURCE_NOT_FOUND: '资源不存在',
  DATA_VALIDATION_FAILED: '数据验证失败',
} as const;

// 获取错误消息的工具函数
export function getErrorMessage(bizCode?: number, defaultMessage: string = '操作失败'): string {
  if (!bizCode) return defaultMessage;
  
  // 直接匹配业务错误代码
  switch (bizCode) {
    case ERROR_CODES.INVALID_PARAMS:
      return ERROR_MESSAGES.INVALID_PARAMS;
    case ERROR_CODES.TOKEN_INVALID:
      return ERROR_MESSAGES.TOKEN_INVALID;
    case ERROR_CODES.TOKEN_EXPIRED:
      return ERROR_MESSAGES.TOKEN_EXPIRED;
    case ERROR_CODES.PERMISSION_DENIED:
      return ERROR_MESSAGES.PERMISSION_DENIED;
    case ERROR_CODES.RESOURCE_NOT_FOUND:
      return ERROR_MESSAGES.RESOURCE_NOT_FOUND;
    case ERROR_CODES.DATA_VALIDATION_FAILED:
      return ERROR_MESSAGES.DATA_VALIDATION_FAILED;
    default:
      return defaultMessage;
  }
}