import { apiClient } from './apiClient';
import type { ApiResponse, BusinessResponse } from '@/types/api';
import type { 
  Paper, 
  PaperListResponse, 
  PaperFilters, 
  PaperListItem,
  UserPaper,
  Note 
} from '@/types/paper';

// 论文API类
export class PaperApi {
  private client = apiClient;

  // 获取公开论文列表
  async getPublicPapers(filters: PaperFilters = {}): Promise<ApiResponse<PaperListResponse>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    // 直接调用 /papers 端点，无需认证
    return this.client.get(`/papers?${searchParams.toString()}`);
  }

  // 获取用户论文库
  async getUserPapers(filters: PaperFilters = {}): Promise<ApiResponse<PaperListResponse>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    // 调用 /papers/user 端点，需要认证
    return this.client.get(`/papers/user?${searchParams.toString()}`);
  }

  // 获取所有论文（管理员用）
  async getAllPapers(filters: PaperFilters = {}): Promise<ApiResponse<PaperListResponse>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });

    // 调用 /papers/all 端点，需要管理员权限
    console.log('[PaperApi] 请求所有论文，参数:', filters);
    console.log('[PaperApi] 请求URL:', `/papers/all?${searchParams.toString()}`);
    return this.client.get(`/papers/all?${searchParams.toString()}`);
  }

  // 获取论文详情
  async getPaper(paperId: string): Promise<ApiResponse<Paper>> {
    return this.client.get(`/papers/${paperId}`);
  }

  // 获取论文内容（用于阅读器）
  async getPaperContent(paperId: string): Promise<ApiResponse<any>> {
    return this.client.get(`/papers/${paperId}/content`);
  }

  // 创建论文（管理员或用户）
  async createPaper(paperData: Partial<Paper>): Promise<ApiResponse<Paper>> {
    return this.client.post('/papers', paperData);
  }

  // 从Markdown创建论文
  async createPaperFromMarkdown(formData: FormData): Promise<ApiResponse<BusinessResponse<{ paperId: string }>>> {
    // 使用fetch直接调用，因为需要特殊的header处理
    const response = await fetch(`${this.client.getBaseURL()}/api/v1/papers/markdown`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.client.getToken()}`,
        // 不设置Content-Type，让浏览器自动设置multipart/form-data的boundary
      },
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data;
  }

  // 更新论文
  async updatePaper(paperId: string, paperData: Partial<Paper>): Promise<ApiResponse<Paper>> {
    return this.client.put(`/papers/${paperId}`, paperData);
  }

  // 删除论文
  async deletePaper(paperId: string): Promise<ApiResponse<null>> {
    return this.client.delete(`/papers/${paperId}`);
  }

  // 添加论文到个人库
  async addToUserLibrary(paperId: string, userData?: Partial<UserPaper>): Promise<ApiResponse<UserPaper>> {
    return this.client.post(`/papers/${paperId}/add-to-library`, userData);
  }

  // 从个人库移除论文
  async removeFromUserLibrary(paperId: string): Promise<ApiResponse<null>> {
    return this.client.delete(`/papers/${paperId}/remove-from-library`);
  }

  // 更新个人库中的论文数据
  async updateUserPaper(paperId: string, userData: Partial<UserPaper>): Promise<ApiResponse<UserPaper>> {
    return this.client.put(`/papers/${paperId}/user-data`, userData);
  }

  // 获取论文解析进度
  async getParseProgress(paperId: string): Promise<ApiResponse<{ status: string; progress: number; message: string }>> {
    return this.client.get(`/papers/${paperId}/parse-progress`);
  }

  // 笔记相关API
  async getNotes(paperId: string): Promise<ApiResponse<Note[]>> {
    return this.client.get(`/papers/${paperId}/notes`);
  }

  async createNote(paperId: string, noteData: Partial<Note>): Promise<ApiResponse<Note>> {
    return this.client.post(`/papers/${paperId}/notes`, noteData);
  }

  async updateNote(paperId: string, noteId: string, noteData: Partial<Note>): Promise<ApiResponse<Note>> {
    return this.client.put(`/papers/${paperId}/notes/${noteId}`, noteData);
  }

  async deleteNote(paperId: string, noteId: string): Promise<ApiResponse<null>> {
    return this.client.delete(`/papers/${paperId}/notes/${noteId}`);
  }

  // 获取所有笔记（跨论文）
  async getAllNotes(filters: { page?: number; pageSize?: number } = {}): Promise<ApiResponse<{ notes: Note[]; pagination: any }>> {
    const searchParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 0) {
        searchParams.append(key, String(value));
      }
    });

    return this.client.get(`/notes?${searchParams.toString()}`);
  }
}

// 创建API实例
export const paperApi = new PaperApi();

// 数据转换工具函数
export function transformPaperToListItem(paper: Paper, userPaper?: UserPaper): PaperListItem {
  return {
    id: paper.id,
    isPublic: paper.isPublic,
    createdBy: paper.createdBy,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
    parseStatus: paper.parseStatus,
    
    // 论文元数据
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
    
    // 用户个性化数据
    readingStatus: userPaper?.readingStatus,
    priority: userPaper?.priority,
    remarks: userPaper?.remarks,
    readingPosition: userPaper?.readingPosition,
    totalReadingTime: userPaper?.totalReadingTime,
    lastReadTime: userPaper?.lastReadTime,
  };
}

// 缓存管理
export class PaperCache {
  private cache = new Map<string, { data: Paper; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟

  set(paperId: string, paper: Paper): void {
    this.cache.set(paperId, {
      data: paper,
      timestamp: Date.now(),
    });
  }

  get(paperId: string): Paper | null {
    const cached = this.cache.get(paperId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(paperId);
      return null;
    }

    return cached.data;
  }

  invalidate(paperId: string): void {
    this.cache.delete(paperId);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 创建缓存实例
export const paperCache = new PaperCache();

// Hook样式的API使用
export function usePaperApi() {
  return {
    paperApi,
    paperCache,
    transformPaperToListItem,
  };
}
