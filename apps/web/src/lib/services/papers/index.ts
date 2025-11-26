// 论文服务统一导出
import { publicPaperService } from './public';
import { userPaperService } from './user';
import { adminPaperService } from './admin';
import type { Paper, UserPaper } from '@/types/paper/index';

// 重新导出各个服务
export { publicPaperService, userPaperService, adminPaperService };

// —— 内存缓存 —— //
export class PaperCache {
  private cache = new Map<string, { data: Paper | UserPaper; ts: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟

  set(id: string, data: Paper | UserPaper): void {
    this.cache.set(id, { data, ts: Date.now() });
  }

  get(id: string): Paper | UserPaper | null {
    const node = this.cache.get(id);
    if (!node) return null;
    if (Date.now() - node.ts > this.TTL) {
      this.cache.delete(id);
      return null;
    }
    return node.data;
  }

  invalidate(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const paperCache = new PaperCache();


// Hook 风格导出
export function usePaperService() {
  return {
    publicPaperService,
    userPaperService,
    adminPaperService,
    paperCache,
  };
}