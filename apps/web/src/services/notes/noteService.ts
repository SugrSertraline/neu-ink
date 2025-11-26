// 笔记服务实现
import { BaseApiService } from '../base/BaseApiService';
import { ApiClient } from '../base/ApiClient';
import { 
  Note,
  CreateNoteRequest, 
  UpdateNoteRequest,
  DeleteNoteRequest,
  NoteListOptions,
  NoteStats
} from './noteTypes';

export class NoteService extends BaseApiService {
  private client: ApiClient;
  
  constructor(baseUrl: string = '/api/notes', headers?: Record<string, string>) {
    super();
    this.client = new ApiClient(baseUrl, headers);
  }
  
  protected getClient(): ApiClient {
    return this.client;
  }
  
  // 笔记相关方法
  async getNote(noteId: string): Promise<{ data: Note }> {
    return this.callApi('GET', `/${noteId}`);
  }
  
  async getNotes(options: NoteListOptions): Promise<{ data: Note[] }> {
    const params = new URLSearchParams();
    if (options?.paperId) params.append('paperId', options.paperId);
    if (options?.sectionId) params.append('sectionId', options.sectionId);
    if (options?.blockId) params.append('blockId', options.blockId);
    if (options?.type) params.append('type', options.type);
    if (options?.tags) params.append('tags', options.tags.join(','));
    if (options?.isResolved !== undefined) params.append('isResolved', options.isResolved.toString());
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    
    const query = params.toString();
    const endpoint = query ? `?${query}` : '';
    
    return this.callApi('GET', endpoint);
  }
  
  async createNote(noteData: CreateNoteRequest): Promise<{ data: Note }> {
    return this.callApi('POST', '', noteData);
  }
  
  async updateNote(noteId: string, noteData: UpdateNoteRequest): Promise<{ data: Note }> {
    return this.callApi('PUT', `/${noteId}`, noteData);
  }
  
  async deleteNote(noteId: string, paperId: string): Promise<{ data: void }> {
    return this.callApi('DELETE', `/${noteId}`, { paperId });
  }
  
  // 批量操作方法
  async deleteNotes(noteIds: string[], paperId: string): Promise<{ data: void }> {
    return this.callApi('POST', '/batch-delete', { noteIds, paperId });
  }
  
  async resolveNotes(noteIds: string[]): Promise<{ data: Note[] }> {
    return this.callApi('POST', '/batch-resolve', { noteIds });
  }
  
  async unresolveNotes(noteIds: string[]): Promise<{ data: Note[] }> {
    return this.callApi('POST', '/batch-unresolve', { noteIds });
  }
  
  // 统计方法
  async getNoteStats(paperId?: string): Promise<{ data: NoteStats }> {
    const params = paperId ? `?paperId=${paperId}` : '';
    return this.callApi('GET', `/stats${params}`);
  }
  
  // 按论文获取笔记
  async getNotesByPaper(paperId: string, options?: Partial<NoteListOptions>): Promise<{ data: Note[] }> {
    return this.getNotes({ ...options, paperId });
  }
  
  // 按章节获取笔记
  async getNotesBySection(paperId: string, sectionId: string, options?: Partial<NoteListOptions>): Promise<{ data: Note[] }> {
    return this.getNotes({ ...options, paperId, sectionId });
  }
  
  // 按块获取笔记
  async getNotesByBlock(paperId: string, blockId: string, options?: Partial<NoteListOptions>): Promise<{ data: Note[] }> {
    return this.getNotes({ ...options, paperId, blockId });
  }
  
  // 按类型获取笔记
  async getNotesByType(type: string, options?: Partial<NoteListOptions>): Promise<{ data: Note[] }> {
    return this.getNotes({ ...options, type: type as any });
  }
  
  // 搜索笔记
  async searchNotes(searchQuery: string, options?: Partial<NoteListOptions>): Promise<{ data: Note[] }> {
    return this.getNotes({ ...options, search: searchQuery });
  }
}

// 导出服务实例
export const noteService = new NoteService();