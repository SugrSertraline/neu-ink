// 笔记服务 - 适配新的API结构
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';
import { buildSearchParams } from '../utils/index';
import type { 
  Note, 
  NoteFilters, 
  NoteListData, 
  CreateNoteRequest, 
  UpdateNoteRequest 
} from '@/types/paper/index';

// —— 管理员论文笔记服务 —— //
export const adminNoteService = {
  /**
   * 获取管理员论文的所有笔记
   */
  getNotesByPaper(
    paperId: string,
    filters: NoteFilters = {}
  ): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/admin/${paperId}${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
    );
  },

  /**
   * 创建管理员论文笔记
   */
  createNote(
    paperId: string,
    request: CreateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.post(`/notes/admin/${paperId}`, request)
    );
  },

  /**
   * 获取某个 Block 的笔记（管理员论文）
   */
  getNotesByBlock(
    paperId: string,
    blockId: string
  ): Promise<UnifiedResult<{ notes: Note[] }>> {
    return callAndNormalize<{ notes: Note[] }>(
      apiClient.get(`/notes/admin/${paperId}/block/${blockId}`)
    );
  },

  /**
   * 更新管理员论文笔记
   */
  updateNote(
    paperId: string,
    noteId: string,
    data: UpdateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.put(`/notes/admin/${paperId}/${noteId}`, data)
    );
  },

  /**
   * 删除管理员论文笔记
   */
  deleteNote(
    paperId: string,
    noteId: string
  ): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/notes/admin/${paperId}/${noteId}`)
    );
  },

  /**
   * 批量删除管理员论文的所有笔记
   */
  deleteNotesByPaper(paperId: string): Promise<UnifiedResult<{ deleted: number }>> {
    return callAndNormalize<{ deleted: number }>(
      apiClient.delete(`/notes/admin/${paperId}`)
    );
  },
};

// —— 用户论文笔记服务 —— //
export const userNoteService = {
  /**
   * 获取用户论文的所有笔记
   */
  getNotesByPaper(
    entryId: string,
    filters: NoteFilters = {}
  ): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/user/${entryId}${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
    );
  },

  /**
   * 创建用户论文笔记
   */
  createNote(
    entryId: string,
    request: CreateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.post(`/notes/user/${entryId}`, request)
    );
  },

  /**
   * 获取某个 Block 的笔记（用户论文）
   */
  getNotesByBlock(
    entryId: string,
    blockId: string
  ): Promise<UnifiedResult<{ notes: Note[] }>> {
    return callAndNormalize<{ notes: Note[] }>(
      apiClient.get(`/notes/user/${entryId}/block/${blockId}`)
    );
  },

  /**
   * 更新用户论文笔记
   */
  updateNote(
    entryId: string,
    noteId: string,
    data: UpdateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.put(`/notes/user/${entryId}/${noteId}`, data)
    );
  },

  /**
   * 删除用户论文笔记
   */
  deleteNote(
    entryId: string,
    noteId: string
  ): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/notes/user/${entryId}/${noteId}`)
    );
  },

  /**
   * 批量删除用户论文的所有笔记
   */
  deleteNotesByPaper(entryId: string): Promise<UnifiedResult<{ deleted: number }>> {
    return callAndNormalize<{ deleted: number }>(
      apiClient.delete(`/notes/user/${entryId}`)
    );
  },
};

// —— 通用笔记服务 —— //
export const noteService = {
  /**
   * 获取笔记详情（不区分论文类型）
   */
  getNoteDetail(noteId: string): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.get(`/notes/${noteId}`)
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
      apiClient.get(`/notes/user/default/search${buildSearchParams({ keyword, ...filters }) ? '?' + buildSearchParams({ keyword, ...filters }) : ''}`)
    );
  },

  /**
   * 更新笔记（通用接口）
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
   * 删除笔记（通用接口）
   */
  deleteNote(noteId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/notes/${noteId}`)
    );
  },
};


// —— Hook 风格导出 —— //
export function useNotesService() {
  return {
    adminNoteService,
    userNoteService,
    noteService,
  };
}