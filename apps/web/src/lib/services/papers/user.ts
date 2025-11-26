// 用户论文服务
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
  UserPaper,
  UserPaperFilters,
  UserPaperListData,
  ParseReferencesRequest,
  AddReferencesToPaperResult,
  ParseResult,
  ConfirmParseResultRequest,
  ConfirmParseResultResult,
  DiscardParseResultResult,
  SaveAllParseResultResult
} from '@/types/paper/index';
import type { UpdateReadingProgressRequest } from '@/types/paper/requests';
import { apiClient, callAndNormalize } from '../../http';
import type { UnifiedResult } from '@/types/api';
import { buildSearchParams } from '../../utils/index';

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
      apiClient.put(`/sections/user/${userPaperId}/${sectionId}`, updateData)
    );
  },

  /**
   * 删除个人论文的指定section
   */
  deleteSection(
    userPaperId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    return callAndNormalize<DeleteSectionResult>(
      apiClient.delete(`/sections/user/${userPaperId}/${sectionId}`)
    );
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
   ): Promise<UnifiedResult<{ url: string; key: string; size: number; uploadedAt: string }>> {
     const formData = new FormData();
     formData.append('file', file);
     formData.append('type', 'pdf');
     
     return callAndNormalize<{ url: string; key: string; size: number; uploadedAt: string }>(
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
  * 更新阅读进度
  */
 updateReadingProgress(
   userPaperId: string,
   request: UpdateReadingProgressRequest
 ): Promise<UnifiedResult<UserPaper>> {
   return callAndNormalize<UserPaper>(
     apiClient.put(`/papers/user/${userPaperId}/reading-progress`, request)
   );
 },
};