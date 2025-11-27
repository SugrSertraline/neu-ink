// 管理员论文服务
import {
  AddBlockFromTextToSectionRequest,
  AddBlockFromTextToSectionResult,
  CheckBlockParsingStatusResult,
  AddBlockToSectionRequest,
  AddBlockToSectionResult,
  DeleteResult,
  UpdateSectionRequest,
  UpdateSectionResult,
  DeleteSectionResult,
  UpdateBlockRequest,
  UpdateBlockResult,
  DeleteBlockResult,
  Paper,
  PaperListData,
  PublicPaperFilters,
  CreatePaperFromTextRequest,
  UpdatePaperVisibilityRequest,
  UpdatePaperVisibilityResult,
  ParseReferencesRequest,
  ParseReferencesResult,
  AddReferencesToPaperRequest,
  AddReferencesToPaperResult,
  ParseResult,
  ConfirmParseResultRequest,
  ConfirmParseResultResult,
  DiscardParseResultResult
} from '@/types/paper/index';
import { apiClient, callAndNormalize } from '../../http';
import type { UnifiedResult } from '@/types/api';
import { buildSearchParams } from '../../utils/index';

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
  ): Promise<UnifiedResult<{ url: string; key: string; size: number; uploadedAt: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'pdf');
    
    return callAndNormalize<{ url: string; key: string; size: number; uploadedAt: string }>(
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
};