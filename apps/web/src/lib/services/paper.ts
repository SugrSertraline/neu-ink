// 论文服务层 - 对接后端真实 API

import { AddToLibraryRequest, CreateNoteRequest, CreatePaperFromTextRequest, CreatePaperFromMetadataRequest, DeleteResult, Note, NoteFilters, NoteListData, Paper, PaperContent, PaperListData, PublicPaperFilters, UpdateNoteRequest, UpdateReadingProgressRequest, UpdateUserPaperRequest, UserPaper, UserPaperFilters, UserPaperListData, UserStatistics } from '@/types/paper/index';
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';


// —— 参数拼接工具 —— //
function buildSearchParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// —— 公共论文库服务 —— //
export const publicPaperService = {
  /**
   * 获取公共论文列表
   */
  getPublicPapers(
    filters: PublicPaperFilters = {}
  ): Promise<UnifiedResult<PaperListData>> {
    return callAndNormalize<PaperListData>(
      apiClient.get(`/public/papers${buildSearchParams(filters)}`)
    );
  },

  /**
   * 获取公共论文详情
   */
  getPublicPaperDetail(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.get(`/public/papers/${paperId}`)
    );
  },

  /**
   * 获取公共论文阅读内容
   */
  getPublicPaperContent(paperId: string): Promise<UnifiedResult<PaperContent>> {
    return callAndNormalize<PaperContent>(
      apiClient.get(`/public/papers/${paperId}/content`)
    );
  },
};

// —— 个人论文库服务 —— //
export const userPaperService = {
  /**
   * 获取个人论文库列表
   */
  getUserPapers(
    filters: UserPaperFilters = {}
  ): Promise<UnifiedResult<UserPaperListData>> {
    return callAndNormalize<UserPaperListData>(
      apiClient.get(`/user/papers${buildSearchParams(filters)}`)
    );
  },

  /**
   * 添加公共论文到个人库
   */
  addToLibrary(request: AddToLibraryRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/user/papers', request)
    );
  },

  /**
   * 获取个人论文详情
   */
  getUserPaperDetail(userPaperId: string): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.get(`/user/papers/${userPaperId}`)
    );
  },

  /**
   * 更新个人论文
   */
  updateUserPaper(
    userPaperId: string,
    data: UpdateUserPaperRequest
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.put(`/user/papers/${userPaperId}`, data)
    );
  },

  /**
   * 更新阅读进度（快速接口）
   */
  updateReadingProgress(
    userPaperId: string,
    progress: UpdateReadingProgressRequest
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.patch(`/user/papers/${userPaperId}/progress`, progress)
    );
  },

  /**
   * 从个人库删除论文
   */
  deleteUserPaper(userPaperId: string): Promise<UnifiedResult<DeleteResult>> {
    return callAndNormalize<DeleteResult>(
      apiClient.delete(`/user/papers/${userPaperId}`)
    );
  },

  /**
   * 获取用户统计信息
   */
  getUserStatistics(): Promise<UnifiedResult<UserStatistics>> {
    return callAndNormalize<UserStatistics>(
      apiClient.get('/user/papers/statistics')
    );
  },

  /**
   * 从文本创建个人论文
   */
  createPaperFromText(request: CreatePaperFromTextRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/user/papers/create-from-text', request)
    );
  },

  /**
   * 从元数据创建个人论文
   */
  createPaperFromMetadata(request: CreatePaperFromMetadataRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/user/papers/create-from-metadata', request)
    );
  },

};

// —— 笔记服务 —— //
export const noteService = {
  /**
   * 创建笔记
   */
  createNote(request: CreateNoteRequest): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.post('/notes', request)
    );
  },

  /**
   * 获取论文的所有笔记
   */
  getNotesByPaper(
    userPaperId: string,
    filters: NoteFilters = {}
  ): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/paper/${userPaperId}${buildSearchParams(filters)}`)
    );
  },

  /**
   * 获取某个 Block 的笔记
   */
  getNotesByBlock(
    userPaperId: string,
    blockId: string
  ): Promise<UnifiedResult<{ notes: Note[] }>> {
    return callAndNormalize<{ notes: Note[] }>(
      apiClient.get(`/notes/paper/${userPaperId}/block/${blockId}`)
    );
  },

  /**
   * 获取用户所有笔记
   */
  getUserNotes(filters: NoteFilters = {}): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/user${buildSearchParams(filters)}`)
    );
  },

  /**
   * 搜索笔记
   */
  searchNotes(
    keyword: string,
    filters: Omit<NoteFilters, 'keyword'> = {}
  ): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/search${buildSearchParams({ keyword, ...filters })}`)
    );
  },

  /**
   * 更新笔记
   */
  updateNote(
    noteId: string,
    data: UpdateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.put(`/notes/${noteId}`, data)
    );
  },

  /**
   * 删除笔记
   */
  deleteNote(noteId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/notes/${noteId}`)
    );
  },

  /**
   * 批量删除论文的所有笔记
   */
  deleteNotesByPaper(userPaperId: string): Promise<UnifiedResult<DeleteResult>> {
    return callAndNormalize<DeleteResult>(
      apiClient.delete(`/notes/paper/${userPaperId}`)
    );
  },
};

// —— 管理员服务 —— //
export const adminPaperService = {
  /**
   * 获取管理员论文列表
   */
  getAdminPapers(
    filters: PublicPaperFilters & { 
      isPublic?: boolean; 
      parseStatus?: string; 
      createdBy?: string;
    } = {}
  ): Promise<UnifiedResult<PaperListData>> {
    return callAndNormalize<PaperListData>(
      apiClient.get(`/admin/papers${buildSearchParams(filters)}`)
    );
  },

  /**
   * 创建论文
   */
  createPaper(data: Partial<Paper>): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.post('/admin/papers', data)
    );
  },

  /**
   * 更新论文
   */
  updatePaper(
    paperId: string, 
    data: Partial<Paper>
  ): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.put(`/admin/papers/${paperId}`, data)
    );
  },

  /**
   * 删除论文
   */
  deletePaper(paperId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/admin/papers/${paperId}`)
    );
  },

  /**
    * 获取统计信息
    */
  getStatistics(): Promise<UnifiedResult<{
    total: number;
    public: number;
    private: number;
  }>> {
    return callAndNormalize<{
      total: number;
      public: number;
      private: number;
    }>(
      apiClient.get('/admin/papers/statistics')
    );
  },

  /**
    * 从文本创建管理员论文
    */
  createPaperFromText(request: CreatePaperFromTextRequest): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.post('/admin/papers/create-from-text', request)
    );
  },

  async getAdminPaperDetail(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.get(`/admin/papers/${paperId}`)
    );
  },
};

// —— 统一导出（兼容旧代码） —— //
export const paperService = {
  // 公共论文
  ...publicPaperService,
  
  // 个人论文
  ...userPaperService,
  
  // 笔记
  ...noteService,
  
  // 管理员
  ...adminPaperService,
};

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

// —— Hook 风格导出 —— //
export function usePaperService() {
  return {
    publicPaperService,
    userPaperService,
    noteService,
    adminPaperService,
    paperCache,
  };
}