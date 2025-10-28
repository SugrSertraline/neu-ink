// lib/services/paper.ts
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';

import type {
  Paper,
  PaperListResponse,
  PaperFilters,
  PaperListItem,
  UserPaper,
  Note,
} from '@/types/paper';

// —— 参数拼接工具 —— //
function buildSearchParams(params: Record<string, any>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 0) {
      if (Array.isArray(value)) value.forEach(v => searchParams.append(key, String(v)));
      else searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// —— 领域服务 —— //
export const paperService = {
  // 公开论文（无需认证）
  getPublicPapers(filters: PaperFilters = {}): Promise<UnifiedResult<PaperListResponse>> {
    return callAndNormalize<PaperListResponse>(apiClient.get(`/papers${buildSearchParams(filters)}`));
  },

  // 用户论文库（需认证）
  getUserPapers(filters: PaperFilters = {}): Promise<UnifiedResult<PaperListResponse>> {
    return callAndNormalize<PaperListResponse>(apiClient.get(`/papers/user${buildSearchParams(filters)}`));
  },

  // 管理员查看所有
  getAllPapers(filters: PaperFilters = {}): Promise<UnifiedResult<PaperListResponse>> {
    return callAndNormalize<PaperListResponse>(apiClient.get(`/papers/all${buildSearchParams(filters)}`));
  },

  // 详情 & 内容
  getPaper(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(apiClient.get(`/papers/${paperId}`));
  },

  getPaperContent(paperId: string): Promise<UnifiedResult<any>> {
    return callAndNormalize<any>(apiClient.get(`/papers/${paperId}/content`));
  },

  // 创建/更新/删除
  createPaper(payload: Partial<Paper>): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(apiClient.post('/papers', payload));
  },

  async createPaperFromMarkdown(formData: FormData): Promise<UnifiedResult<{ paperId: string }>> {
    // 走 client.upload 以保持 Token/错误处理一致
    return callAndNormalize<{ paperId: string }>(
      apiClient.upload('/papers/markdown', formData)
    );
  },

  updatePaper(paperId: string, payload: Partial<Paper>): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(apiClient.put(`/papers/${paperId}`, payload));
  },

  deletePaper(paperId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(apiClient.delete(`/papers/${paperId}`));
  },

  // 用户个性化
  addToUserLibrary(paperId: string, userData?: Partial<UserPaper>): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(apiClient.post(`/papers/${paperId}/add-to-library`, userData));
  },

  removeFromUserLibrary(paperId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(apiClient.delete(`/papers/${paperId}/remove-from-library`));
  },

  updateUserPaper(paperId: string, userData: Partial<UserPaper>): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(apiClient.put(`/papers/${paperId}/user-data`, userData));
  },

  // 解析进度
  getParseProgress(paperId: string): Promise<UnifiedResult<{ status: string; progress: number; message: string }>> {
    return callAndNormalize(apiClient.get(`/papers/${paperId}/parse-progress`));
  },

  // 笔记
  getNotes(paperId: string): Promise<UnifiedResult<Note[]>> {
    return callAndNormalize<Note[]>(apiClient.get(`/papers/${paperId}/notes`));
  },

  createNote(paperId: string, noteData: Partial<Note>): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(apiClient.post(`/papers/${paperId}/notes`, noteData));
  },

  updateNote(paperId: string, noteId: string, noteData: Partial<Note>): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(apiClient.put(`/papers/${paperId}/notes/${noteId}`, noteData));
  },

  deleteNote(paperId: string, noteId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(apiClient.delete(`/papers/${paperId}/notes/${noteId}`));
  },

  // 跨论文笔记
  getAllNotes(filters: { page?: number; pageSize?: number } = {}):
    Promise<UnifiedResult<{ notes: Note[]; pagination: any }>> {
    return callAndNormalize(apiClient.get(`/notes${buildSearchParams(filters)}`));
  },
};

// —— 数据转换器（UI友好） —— //
export function transformPaperToListItem(paper: Paper, userPaper?: UserPaper): PaperListItem {
  return {
    id: paper.id,
    isPublic: paper.isPublic,
    createdBy: paper.createdBy,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
    parseStatus: paper.parseStatus,

    // 元数据
    title: paper.metadata.title,
    titleZh: paper.metadata.titleZh,
    shortTitle: paper.metadata.shortTitle,
    authors: paper.metadata.authors,
    publication: paper.metadata.publication,
    year: paper.metadata.year,
    date: paper.metadata.date,
    doi: paper.metadata.doi,
    articleType: paper.metadata.articleType,
    sciQuartile: paper.metadata.sciQuartile,
    casQuartile: paper.metadata.casQuartile,
    ccfRank: paper.metadata.ccfRank,
    impactFactor: paper.metadata.impactFactor,
    tags: paper.metadata.tags,

    // 用户个性化
    readingStatus: userPaper?.readingStatus,
    priority: userPaper?.priority,
    remarks: userPaper?.remarks,
    readingPosition: userPaper?.readingPosition,
    totalReadingTime: userPaper?.totalReadingTime,
    lastReadTime: userPaper?.lastReadTime,
  };
}

// —— 简单内存缓存（5分钟） —— //
export class PaperCache {
  private cache = new Map<string, { data: Paper; ts: number }>();
  private readonly TTL = 5 * 60 * 1000;

  set(paperId: string, paper: Paper) {
    this.cache.set(paperId, { data: paper, ts: Date.now() });
  }

  get(paperId: string): Paper | null {
    const node = this.cache.get(paperId);
    if (!node) return null;
    if (Date.now() - node.ts > this.TTL) {
      this.cache.delete(paperId);
      return null;
    }
    return node.data;
  }

  invalidate(paperId: string) {
    this.cache.delete(paperId);
  }

  clear() {
    this.cache.clear();
  }
}

export const paperCache = new PaperCache();

// —— 自带 Hook 风格导出 —— //
export function usePaperService() {
  return {
    paperService,
    paperCache,
    transformPaperToListItem,
  };
}
