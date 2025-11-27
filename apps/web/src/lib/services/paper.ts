// 论文服务层 - 对接后端真实 API

import {
  AddBlockFromTextToSectionRequest,
  AddBlockFromTextToSectionResult,
  CheckBlockParsingStatusResult,
  AddBlockToSectionRequest,
  AddBlockToSectionResult,
  AddToLibraryRequest,
  CreateNoteRequest,
  CreatePaperFromTextRequest,
  CreatePaperFromMetadataRequest,
  DeleteResult,
  UpdateSectionRequest,
  UpdateSectionResult,
  DeleteSectionResult,
  UpdateBlockRequest,
  UpdateBlockResult,
  DeleteBlockResult,
  Note,
  NoteFilters,
  NoteListData,
  Paper,
  PaperContent,
  PaperListData,
  PublicPaperFilters,
  UpdateNoteRequest,
  UpdatePaperVisibilityRequest,
  UpdatePaperVisibilityResult,
  UpdateReadingProgressRequest,
  UserPaper,
  UserPaperFilters,
  UserPaperListData,
  UserStatistics,
  ParseReferencesRequest,
  ParseReferencesResult,
  AddReferencesToPaperRequest,
  AddReferencesToPaperResult,
  ParseResult,
  ConfirmParseResultRequest,
  ConfirmParseResultResult,
  DiscardParseResultResult,
  SaveAllParseResultResult
} from '@/types/paper/index';
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';
import { buildSearchParams } from '../utils/index';

// —— 公共论文库服务 —— //
export const publicPaperService = {
  /**
   * 获取公共论文列表
   */
  getPublicPapers(
    filters: PublicPaperFilters = {}
  ): Promise<UnifiedResult<PaperListData>> {
    return callAndNormalize<PaperListData>(
      apiClient.get(`/public-papers${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
    );
  },

  /**
   * 获取公共论文详情
   */
  getPublicPaperDetail(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.get(`/public-papers/${paperId}`)
    );
  },

  /**
   * 获取公共论文阅读内容
   */
  getPublicPaperContent(paperId: string): Promise<UnifiedResult<PaperContent>> {
    return callAndNormalize<PaperContent>(
      apiClient.get(`/public-papers/${paperId}/content`)
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
      apiClient.get(`/papers/user${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
    );
  },

  /**
   * 添加公共论文到个人库
   */
  addToLibrary(request: AddToLibraryRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/papers/user', request)
    );
  },

  /**
   * 获取个人论文详情
   */
  getUserPaperDetail(userPaperId: string): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.get(`/papers/user/${userPaperId}`)
    );
  },

  /**
   * 更新个人论文的metadata
   */
  updateUserPaperMetadata(
    userPaperId: string,
    metadata: any
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.put(`/papers/user/${userPaperId}/metadata`, { metadata })
    );
  },

  /**
   * 更新个人论文的abstract和keywords
   */
  updateUserPaperAbstractKeywords(
    userPaperId: string,
    abstract: { en: string; zh: string },
    keywords: string[]
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.put(`/papers/user/${userPaperId}/abstract-keywords`, { abstract, keywords })
    );
  },

  /**
   * 更新个人论文的references
   */
  updateUserPaperReferences(
    userPaperId: string,
    references: any[]
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.put(`/papers/user/${userPaperId}/references`, { references })
    );
  },

  /**
   * 从个人库删除论文
   */
  deleteUserPaper(userPaperId: string): Promise<UnifiedResult<DeleteResult>> {
    return callAndNormalize<DeleteResult>(
      apiClient.delete(`/papers/user/${userPaperId}`)
    );
  },

  /**
   * 从文本创建个人论文
   */
  createPaperFromText(request: CreatePaperFromTextRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/papers/user', request)
    );
  },

  /**
   * 从元数据创建个人论文
   */
  createPaperFromMetadata(request: CreatePaperFromMetadataRequest): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.post('/papers/user', request)
    );
  },

  /**
   * 向个人论文的指定section直接添加block（不通过LLM解析）
   */
  addBlockToSection(
    userPaperId: string,
    sectionId: string,
    request: AddBlockToSectionRequest
  ): Promise<UnifiedResult<AddBlockToSectionResult>> {
    return callAndNormalize<AddBlockToSectionResult>(
      apiClient.post(`/sections/user/${userPaperId}/sections/${sectionId}/add-block`, request)
    );
  },

  /**
   * 向个人论文的指定section从文本解析添加block
   */
  addBlockFromTextToSection(
    userPaperId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): Promise<UnifiedResult<AddBlockFromTextToSectionResult>> {
    return callAndNormalize<AddBlockFromTextToSectionResult>(
      apiClient.post(`/sections/user/${userPaperId}/sections/${sectionId}/add-block-from-text`, request)
    );
  },

  /**
   * 向个人论文添加新章节（已移除subsection支持）
   */
  addSection(
    userPaperId: string,
    sectionData: {
      id?: string; // 添加可选的ID字段，用于前端生成的临时ID
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      position?: number;
    }
  ): Promise<UnifiedResult<import('@/types/paper/requests').AddSectionResult>> {
    return callAndNormalize<import('@/types/paper/requests').AddSectionResult>(
      apiClient.post(`/sections/user/${userPaperId}/add-section`, {
        sectionData,
        position: options?.position ?? -1
      })
    );
  },

  /**
   * 更新个人论文的指定section
   */
  updateSection(
    userPaperId: string,
    sectionId: string,
    updateData: UpdateSectionRequest
  ): Promise<UnifiedResult<UpdateSectionResult>> {
    return callAndNormalize<UpdateSectionResult>(
      apiClient.put(`/sections/user/${userPaperId}/sections/${sectionId}`, updateData)
    );
  },

  /**
   * 删除个人论文的指定section
   */
  deleteSection(
    userPaperId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    console.log('【服务步骤1】paper.ts deleteSection 被调用:', userPaperId, sectionId);
    const url = `/sections/user/${userPaperId}/sections/${sectionId}`;
    console.log('【服务步骤2】请求URL:', url);
    console.log('【服务步骤3】准备调用 apiClient.delete');
    console.log('【服务步骤3.1】apiClient 对象:', typeof apiClient);
    console.log('【服务步骤3.2】apiClient.delete 方法:', typeof apiClient.delete);
    
    const result = callAndNormalize<DeleteSectionResult>(
      apiClient.delete(url)
    );
    
    console.log('【服务步骤4】paper.ts deleteSection 返回结果:', result);
    return result;
  },

  /**
   * 更新个人论文的指定section中的指定block
   */
  updateBlock(
    userPaperId: string,
    sectionId: string,
    blockId: string,
    updateData: UpdateBlockRequest
  ): Promise<UnifiedResult<UpdateBlockResult>> {
    return callAndNormalize<UpdateBlockResult>(
      apiClient.put(`/sections/user/${userPaperId}/sections/${sectionId}/blocks/${blockId}`, updateData)
    );
  },

  /**
   * 删除个人论文的指定section中的指定block
   */
  deleteBlock(
    userPaperId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<DeleteBlockResult>> {
    return callAndNormalize<DeleteBlockResult>(
      apiClient.delete(`/sections/user/${userPaperId}/sections/${sectionId}/blocks/${blockId}`)
    );
  },

  /**
   * 解析参考文献并添加到用户论文（一步完成）
   */
  parseReferencesForUserPaper(
    userPaperId: string,
    request: ParseReferencesRequest
  ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
    return callAndNormalize<AddReferencesToPaperResult>(
      apiClient.post(`/parsing/user/${userPaperId}/parse-references`, request)
    );
  },

  /**
   * 更新个人论文的参考文献
   */
  updateUserPaperReferencesOld(
    userPaperId: string,
    references: any[]
  ): Promise<UnifiedResult<{ references: any[]; totalReferences: number; paper: any }>> {
    return callAndNormalize<{ references: any[]; totalReferences: number; paper: any }>(
      apiClient.put(`/papers/user/${userPaperId}/references`, { references })
    );
  },

  /**
   * 检查指定加载块的解析状态
   */
  checkBlockParsingStatus(
    userPaperId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<CheckBlockParsingStatusResult>> {
    return callAndNormalize<CheckBlockParsingStatusResult>(
      apiClient.get(`/papers/user/${userPaperId}/sections/${sectionId}/blocks/${blockId}/parsing-status`)
    );
  },

  /**
   * 检查论文是否已在个人论文库中
   */
  checkPaperInLibrary(
    paperId: string
  ): Promise<UnifiedResult<{ inLibrary: boolean; userPaperId: string | null }>> {
    return callAndNormalize<{ inLibrary: boolean; userPaperId: string | null }>(
      apiClient.get(`/papers/user/check-in-library?paperId=${paperId}`)
    );
  },

  /**
   * 获取解析结果
   */
  getParseResult(
    paperId: string,
    parseId: string,
    isAdmin: boolean = false
  ): Promise<UnifiedResult<ParseResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<ParseResult>(
      apiClient.get(`${prefix}/${paperId}/parse-results/${parseId}`)
    );
  },

  /**
   * 确认解析结果
   */
  confirmParseResult(
    paperId: string,
    parseId: string,
    request: ConfirmParseResultRequest,
    isAdmin: boolean = false
  ): Promise<UnifiedResult<ConfirmParseResultResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<ConfirmParseResultResult>(
      apiClient.post(`${prefix}/${paperId}/parse-results/${parseId}/confirm`, request)
    );
  },

  /**
   * 丢弃解析结果
   */
  discardParseResult(
    paperId: string,
    parseId: string,
    isAdmin: boolean = false
  ): Promise<UnifiedResult<DiscardParseResultResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<DiscardParseResultResult>(
      apiClient.post(`${prefix}/${paperId}/parse-results/${parseId}/discard`, {})
    );
  },

  /**
   * 保存所有解析结果
   */
  saveAllParseResult(
    paperId: string,
    parseId: string,
    isAdmin: boolean = false
  ): Promise<UnifiedResult<SaveAllParseResultResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<SaveAllParseResultResult>(
      apiClient.post(`${prefix}/${paperId}/parse-results/${parseId}/save-all`, {})
    );
  },

  /**
   * 更新个人论文附件
   */
  updateUserPaperAttachments(
    userPaperId: string,
    attachments: import('@/types/paper/models').PaperAttachments
  ): Promise<UnifiedResult<UserPaper>> {
    return callAndNormalize<UserPaper>(
      apiClient.put(`/papers/user/${userPaperId}/attachments`, { attachments })
    );
  },

  /**
   * 删除个人论文附件
   */
  deleteUserPaperAttachment(
     userPaperId: string,
     attachmentType: 'pdf' | 'markdown'
   ): Promise<UnifiedResult<UserPaper>> {
     return callAndNormalize<UserPaper>(
       apiClient.delete(`/papers/user/${userPaperId}/attachments/${attachmentType}`)
     );
   },

  /**
   * 上传个人论文PDF附件
   */
  uploadUserPaperPdf(
     userPaperId: string,
     file: File
  ): Promise<UnifiedResult<{ url: string; key: string; size: number; uploadedAt: string; taskId?: string; status?: string; message?: string }>> {
     const formData = new FormData();
     formData.append('file', file);
     formData.append('type', 'pdf');
     
     return callAndNormalize<{ url: string; key: string; size: number; uploadedAt: string; taskId?: string; status?: string; message?: string }>(
       apiClient.upload(`/papers/user/${userPaperId}/upload-pdf`, formData)
     );
  },


  /**
   * 通过PDF创建个人论文
   */
  createPaperFromPdf(
     file: File,
     extra?: {
       customTags?: string[];
       readingStatus?: string;
       priority?: string;
     }
  ): Promise<UnifiedResult<{ userPaper: UserPaper; taskId: string; message: string }>> {
     const formData = new FormData();
     formData.append('file', file);
     if (extra) {
       formData.append('extra', JSON.stringify(extra));
     }
     
     return callAndNormalize<{ userPaper: UserPaper; taskId: string; message: string }>(
       apiClient.upload('/papers/user/create-from-pdf', formData)
     );
  },

  /**
   * 获取管理员论文的content_list.json文件内容
   */
  getAdminPaperContentList(
   paperId: string
  ): Promise<UnifiedResult<{ contentList: any; attachment: any }>> {
   return callAndNormalize<{ contentList: any; attachment: any }>(
     apiClient.get(`/papers/admin/${paperId}/content-list`)
   );
 },


  /**
   * 获取用户论文的content_list.json文件内容
   */
  getUserPaperContentList(
    userPaperId: string
  ): Promise<UnifiedResult<{ contentList: any; attachment: any }>> {
    return callAndNormalize<{ contentList: any; attachment: any }>(
      apiClient.get(`/papers/user/${userPaperId}/content-list`)
    );
  },

  /**
   * 获取用户论文的PDF文件内容（base64格式）
   */
  getUserPaperPdfContent(
    userPaperId: string
  ): Promise<UnifiedResult<{ pdfContent: string; attachment: any }>> {
    return callAndNormalize<{ pdfContent: string; attachment: any }>(
      apiClient.get(`/papers/user/${userPaperId}/pdf-content`)
    );
  },

 /**
  * 获取用户论文的Markdown文件内容（base64格式）
  */
 getUserPaperMarkdownContent(
   userPaperId: string
 ): Promise<UnifiedResult<{ markdownContent: string; attachment: any }>> {
   return callAndNormalize<{ markdownContent: string; attachment: any }>(
     apiClient.get(`/papers/user/${userPaperId}/markdown-content`)
   );
 },

/**
 * 获取用户论文PDF解析状态
 */
getUserPaperPdfParseStatus(
  userPaperId: string
): Promise<UnifiedResult<{ hasTask: boolean; task?: any; message?: string }>> {
  return callAndNormalize<{ hasTask: boolean; task?: any; message?: string }>(
    apiClient.get(`/papers/user/${userPaperId}/pdf-parse-status`)
  );
},

/**
 * 获取用户论文PDF解析任务列表
 */
getUserPaperPdfParseTasks(
  userPaperId: string
): Promise<UnifiedResult<{ tasks: any[] }>> {
  return callAndNormalize<{ tasks: any[] }>(
    apiClient.get(`/papers/user/${userPaperId}/pdf-parse-tasks`)
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
      apiClient.post('/notes/user/default', request)
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
      apiClient.get(`/notes/user/${userPaperId}${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
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
      apiClient.get(`/notes/user/${userPaperId}/block/${blockId}`)
    );
  },

  /**
   * 获取用户所有笔记
   */
  getUserNotes(filters: NoteFilters = {}): Promise<UnifiedResult<NoteListData>> {
    return callAndNormalize<NoteListData>(
      apiClient.get(`/notes/user/default${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
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
   * 更新笔记
   */
  updateNote(
    noteId: string,
    data: UpdateNoteRequest
  ): Promise<UnifiedResult<Note>> {
    return callAndNormalize<Note>(
      apiClient.put(`/notes/user/${noteId}`, data)
    );
  },

  /**
   * 删除笔记
   */
  deleteNote(noteId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/notes/user/${noteId}`)
    );
  },

  /**
   * 批量删除论文的所有笔记
   */
  deleteNotesByPaper(userPaperId: string): Promise<UnifiedResult<DeleteResult>> {
    return callAndNormalize<DeleteResult>(
      apiClient.delete(`/notes/user/${userPaperId}`)
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
      createdBy?: string;
    } = {}
  ): Promise<UnifiedResult<PaperListData>> {
    return callAndNormalize<PaperListData>(
      apiClient.get(`/papers/admin${buildSearchParams(filters) ? '?' + buildSearchParams(filters) : ''}`)
    );
  },

  /**
   * 创建论文
   */
  createPaper(data: Partial<Paper>): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.post('/papers/admin', data)
    );
  },

  /**
   * 删除论文
   */
  deletePaper(paperId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(
      apiClient.delete(`/papers/admin/${paperId}`)
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
      apiClient.get('/papers/admin/statistics')
    );
  },

  /**
     * 从文本创建管理员论文
     */
  createPaperFromText(request: CreatePaperFromTextRequest): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.post('/papers/admin', request)
    );
  },

  async getAdminPaperDetail(paperId: string): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.get(`/papers/admin/${paperId}`)
    );
  },

  /**
   * 更新管理员论文的metadata
   */
  updateAdminPaperMetadata(
    paperId: string,
    metadata: any
  ): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.put(`/papers/admin/${paperId}/metadata`, { metadata })
    );
  },

  /**
   * 更新管理员论文的abstract和keywords
   */
  updateAdminPaperAbstractKeywords(
    paperId: string,
    abstract: { en: string; zh: string },
    keywords: string[]
  ): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.put(`/papers/admin/${paperId}/abstract-keywords`, { abstract, keywords })
    );
  },

  /**
   * 更新管理员论文的references
   */
  updateAdminPaperReferences(
    paperId: string,
    references: any[]
  ): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.put(`/papers/admin/${paperId}/references`, { references })
    );
  },

  /**
   * 向管理员论文的指定section直接添加block（不通过LLM解析）
   */
  addBlockToSection(
    paperId: string,
    sectionId: string,
    request: AddBlockToSectionRequest
  ): Promise<UnifiedResult<AddBlockToSectionResult>> {
    return callAndNormalize<AddBlockToSectionResult>(
      apiClient.post(`/sections/admin/${paperId}/sections/${sectionId}/add-block`, request)
    );
  },

  /**
   * 向管理员论文的指定section从文本解析添加block
   */
  addBlockFromTextToSection(
    paperId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): Promise<UnifiedResult<AddBlockFromTextToSectionResult>> {
    return callAndNormalize<AddBlockFromTextToSectionResult>(
      apiClient.post(`/sections/admin/${paperId}/sections/${sectionId}/add-block-from-text`, request)
    );
  },

  /**
   * 向管理员论文添加新章节（已移除subsection支持）
   */
  addSection(
    paperId: string,
    sectionData: {
      id?: string; // 添加可选的ID字段，用于前端生成的临时ID
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      position?: number;
    }
  ): Promise<UnifiedResult<import('@/types/paper/requests').AddSectionResult>> {
    return callAndNormalize<import('@/types/paper/requests').AddSectionResult>(
      apiClient.post(`/sections/admin/${paperId}/add-section`, {
        sectionData,
        position: options?.position ?? -1
      })
    );
  },

  /**
   * 更新管理员论文的指定section
   */
  updateSection(
    paperId: string,
    sectionId: string,
    updateData: UpdateSectionRequest
  ): Promise<UnifiedResult<UpdateSectionResult>> {
    return callAndNormalize<UpdateSectionResult>(
      apiClient.put(`/sections/admin/${paperId}/sections/${sectionId}`, updateData)
    );
  },

  /**
   * 删除管理员论文的指定section
   */
  deleteSection(
    paperId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    return callAndNormalize<DeleteSectionResult>(
      apiClient.delete(`/sections/admin/${paperId}/sections/${sectionId}`)
    );
  },

  /**
   * 更新管理员论文的指定section中的指定block
   */
  updateBlock(
    paperId: string,
    sectionId: string,
    blockId: string,
    updateData: UpdateBlockRequest
  ): Promise<UnifiedResult<UpdateBlockResult>> {
    return callAndNormalize<UpdateBlockResult>(
      apiClient.put(`/sections/admin/${paperId}/sections/${sectionId}/blocks/${blockId}`, updateData)
    );
  },

  /**
   * 删除管理员论文的指定section中的指定block
   */
  deleteBlock(
    paperId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<DeleteBlockResult>> {
    return callAndNormalize<DeleteBlockResult>(
      apiClient.delete(`/sections/admin/${paperId}/sections/${sectionId}/blocks/${blockId}`)
    );
  },

  /**
   * 修改论文可见状态
   */
  updatePaperVisibility(
    paperId: string,
    request: UpdatePaperVisibilityRequest
  ): Promise<UnifiedResult<UpdatePaperVisibilityResult>> {
    return callAndNormalize<UpdatePaperVisibilityResult>(
      apiClient.put(`/papers/admin/${paperId}/visibility`, request)
    );
  },

  /**
   * 解析参考文献
   */
  parseReferences(
    paperId: string,
    request: ParseReferencesRequest
  ): Promise<UnifiedResult<ParseReferencesResult>> {
    return callAndNormalize<ParseReferencesResult>(
      apiClient.post(`/parsing/admin/${paperId}/parse-references`, request)
    );
  },

  /**
   * 解析参考文献并添加到论文（一步完成）
   */
  parseReferencesForPaper(
    paperId: string,
    request: ParseReferencesRequest
  ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
    return callAndNormalize<AddReferencesToPaperResult>(
      apiClient.post(`/parsing/admin/${paperId}/parse-references`, request)
    );
  },

  /**
   * 添加参考文献到论文
   */
  addReferencesToPaper(
    paperId: string,
    request: AddReferencesToPaperRequest
  ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
    return callAndNormalize<AddReferencesToPaperResult>(
      apiClient.post(`/papers/admin/${paperId}/add-references`, request)
    );
  },

  /**
   * 检查指定加载块的解析状态
   */
  checkBlockParsingStatus(
    paperId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<CheckBlockParsingStatusResult>> {
    return callAndNormalize<CheckBlockParsingStatusResult>(
      apiClient.get(`/sections/admin/${paperId}/sections/${sectionId}/blocks/${blockId}/parsing-status`)
    );
  },

  /**
   * 获取管理员论文解析结果
   */
  getParseResult(
    paperId: string,
    parseId: string,
    isAdmin: boolean = true
  ): Promise<UnifiedResult<ParseResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<ParseResult>(
      apiClient.get(`${prefix}/${paperId}/parse-results/${parseId}`)
    );
  },

  /**
   * 确认管理员论文解析结果
   */
  confirmParseResult(
    paperId: string,
    parseId: string,
    request: ConfirmParseResultRequest,
    isAdmin: boolean = true
  ): Promise<UnifiedResult<ConfirmParseResultResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<ConfirmParseResultResult>(
      apiClient.post(`${prefix}/${paperId}/parse-results/${parseId}/confirm`, request)
    );
  },

  /**
   * 丢弃管理员论文解析结果
   */
  discardParseResult(
    paperId: string,
    parseId: string,
    isAdmin: boolean = true
  ): Promise<UnifiedResult<DiscardParseResultResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<DiscardParseResultResult>(
      apiClient.post(`${prefix}/${paperId}/parse-results/${parseId}/discard`, {})
    );
  },

  /**
   * 保存所有管理员论文解析结果
   */
  saveAllParseResult(
    paperId: string,
    parseId: string,
    isAdmin: boolean = true
  ): Promise<UnifiedResult<SaveAllParseResultResult>> {
    const prefix = isAdmin ? '/admin/papers' : '/user/papers';
    return callAndNormalize<SaveAllParseResultResult>(
      apiClient.post(`${prefix}/${paperId}/parse-results/${parseId}/save-all`, {})
    );
  },

  /**
   * 更新管理员论文附件
   */
  updatePaperAttachments(
    paperId: string,
    attachments: import('@/types/paper/models').PaperAttachments
  ): Promise<UnifiedResult<Paper>> {
    return callAndNormalize<Paper>(
      apiClient.put(`/papers/admin/${paperId}/attachments`, { attachments })
    );
  },

  /**
   * 删除管理员论文附件
   */
  deletePaperAttachment(
     paperId: string,
     attachmentType: 'pdf' | 'markdown'
   ): Promise<UnifiedResult<Paper>> {
     return callAndNormalize<Paper>(
       apiClient.delete(`/papers/admin/${paperId}/attachments/${attachmentType}`)
     );
   },

  /**
   * 上传管理员论文PDF附件
   */
  uploadAdminPaperPdf(
    paperId: string,
    file: File
  ): Promise<UnifiedResult<{ url: string; key: string; size: number; uploadedAt: string; taskId?: string; status?: string; message?: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'pdf');
    
    return callAndNormalize<{ url: string; key: string; size: number; uploadedAt: string; taskId?: string; status?: string; message?: string }>(
       apiClient.upload(`/papers/admin/${paperId}/upload-pdf`, formData)
     );
  },


  /**
   * 通过PDF创建管理员论文
   */
  createPaperFromPdf(
     file: File,
     extra?: {
       customTags?: string[];
       readingStatus?: string;
       priority?: string;
     }
  ): Promise<UnifiedResult<{ paper: Paper; taskId: string; message: string }>> {
     const formData = new FormData();
     formData.append('file', file);
     if (extra) {
       formData.append('extra', JSON.stringify(extra));
     }
     
     return callAndNormalize<{ paper: Paper; taskId: string; message: string }>(
       apiClient.upload('/papers/admin/create-from-pdf', formData)
     );
  },

 /**
  * 获取管理员论文的PDF文件内容（base64格式）
  */
 getAdminPaperPdfContent(
   paperId: string
 ): Promise<UnifiedResult<{ pdfContent: string; attachment: any }>> {
   return callAndNormalize<{ pdfContent: string; attachment: any }>(
      apiClient.get(`/papers/admin/${paperId}/pdf-content`)
    );
  },

  /**
   * 获取管理员论文的Markdown文件内容（base64格式）
   */
  getAdminPaperMarkdownContent(
   paperId: string
  ): Promise<UnifiedResult<{ markdownContent: string; attachment: any }>> {
   return callAndNormalize<{ markdownContent: string; attachment: any }>(
      apiClient.get(`/papers/admin/${paperId}/markdown-content`)
   );
  },

 /**
  * 获取管理员论文的content_list.json文件内容
  */
 getAdminPaperContentList(
  paperId: string
 ): Promise<UnifiedResult<{ contentList: any; attachment: any }>> {
   return callAndNormalize<{ contentList: any; attachment: any }>(
     apiClient.get(`/papers/admin/${paperId}/content-list`)
   );
 },

 /**
  * 获取管理员论文PDF解析状态
  */
 getAdminPaperPdfParseStatus(
   paperId: string
 ): Promise<UnifiedResult<{ hasTask: boolean; task?: any; message?: string }>> {
   return callAndNormalize<{ hasTask: boolean; task?: any; message?: string }>(
     apiClient.get(`/papers/admin/${paperId}/pdf-parse-status`)
   );
 },

 /**
  * 获取管理员论文PDF解析任务列表
  */
 getAdminPaperPdfParseTasks(
   paperId: string
 ): Promise<UnifiedResult<{ tasks: any[] }>> {
   return callAndNormalize<{ tasks: any[] }>(
     apiClient.get(`/papers/admin/${paperId}/pdf-parse-tasks`)
   );
 },
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
