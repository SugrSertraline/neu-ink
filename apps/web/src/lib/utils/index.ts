// lib/utils/index.ts

// 导出其他工具函数
export * from './apiHelpers';
export * from './noteAdapters';
export * from './paperHelpers';
export * from './paperPageUtils';
export * from './pdfBlockConverters';
export * from './tableParser';

// 导出性能优化工具函数
export * from '../../utils/performance';

/** 格式化日期 */
export function formatDate(
  date: string | Date,
  format: 'date' | 'datetime' | 'relative' = 'date'
): string {
  const d = new Date(date);

  if (format === 'relative') {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return d.toLocaleDateString('zh-CN');
  }

  if (format === 'datetime') {
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('zh-CN');
}

/** 生成随机ID (UUID格式) */
export function generateId(): string {
  // 生成 UUID v4 格式的 ID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/** 延迟执行 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 防抖 */
export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** 节流 */
export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number) {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (inThrottle) return;
    inThrottle = true;
    fn(...args);
    setTimeout(() => (inThrottle = false), limit);
  };
}

/** 安全JSON解析 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/** 复制到剪贴板 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/** 文件大小格式化 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** URL 参数解析 */
export function parseUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  urlObj.searchParams.forEach((value, key) => { params[key] = value; });
  return params;
}

/** 构建 URL 参数串 */
export function buildUrlParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) value.forEach(v => searchParams.append(key, String(v)));
      else searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}

/** 构建分页参数 */
export function buildPaginationParams(page = 1, pageSize = 20) {
  const ps = Math.min(pageSize, 100);
  const p = Math.max(1, page);
  return {
    page: p,
    pageSize: ps,
    offset: (p - 1) * ps,
  };
}

/** 构建排序参数 */
export function buildSortParams(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  if (!sortBy) return {};
  return { sortBy, sortOrder };
}

/** 构建搜索参数 */
export function buildSearchParams(params: Record<string, any>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) value.forEach(v => searchParams.append(key, String(v)));
      else searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}
