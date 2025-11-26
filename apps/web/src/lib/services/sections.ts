// 章节服务 - 适配新的API结构
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';
import type { 
  UpdateSectionRequest,
  UpdateSectionResult,
  DeleteSectionResult,
  AddBlockToSectionRequest,
  AddBlockToSectionResult,
  AddBlockFromTextToSectionRequest,
  AddBlockFromTextToSectionResult,
  UpdateBlockRequest,
  UpdateBlockResult,
  DeleteBlockResult
} from '@/types/paper/index';

// —— 管理员论文章节服务 —— //
export const adminSectionService = {
  /**
   * 获取管理员论文章节详情
   */
  getSectionDetail(
    paperId: string,
    sectionId: string
  ): Promise<UnifiedResult<any>> {
    return callAndNormalize<any>(
      apiClient.get(`/sections/admin/${paperId}/${sectionId}`)
    );
  },

  /**
   * 向管理员论文添加新章节
   */
  addSection(
    paperId: string,
    sectionData: {
      id?: string;
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      position?: number;
    }
  ): Promise<UnifiedResult<any>> {
    return callAndNormalize<any>(
      apiClient.post(`/sections/admin/${paperId}/add-section`, {
        sectionData,
        position: options?.position ?? -1
      })
    );
  },

  /**
   * 更新管理员论文章节
   */
  updateSection(
    paperId: string,
    sectionId: string,
    updateData: UpdateSectionRequest
  ): Promise<UnifiedResult<UpdateSectionResult>> {
    return callAndNormalize<UpdateSectionResult>(
      apiClient.put(`/sections/admin/${paperId}/${sectionId}`, updateData)
    );
  },

  /**
   * 删除管理员论文章节
   */
  deleteSection(
    paperId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    return callAndNormalize<DeleteSectionResult>(
      apiClient.delete(`/sections/admin/${paperId}/${sectionId}`)
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
};

// —— 用户论文章节服务 —— //
export const userSectionService = {
  /**
   * 获取用户论文章节详情
   */
  getSectionDetail(
    entryId: string,
    sectionId: string
  ): Promise<UnifiedResult<any>> {
    return callAndNormalize<any>(
      apiClient.get(`/sections/user/${entryId}/${sectionId}`)
    );
  },

  /**
   * 向用户论文添加新章节
   */
  addSection(
    entryId: string,
    sectionData: {
      id?: string;
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      position?: number;
    }
  ): Promise<UnifiedResult<any>> {
    return callAndNormalize<any>(
      apiClient.post(`/sections/user/${entryId}/add-section`, {
        sectionData,
        position: options?.position ?? -1
      })
    );
  },

  /**
   * 更新用户论文章节
   */
  updateSection(
    entryId: string,
    sectionId: string,
    updateData: UpdateSectionRequest
  ): Promise<UnifiedResult<UpdateSectionResult>> {
    return callAndNormalize<UpdateSectionResult>(
      apiClient.put(`/sections/user/${entryId}/${sectionId}`, updateData)
    );
  },

  /**
   * 删除用户论文章节
   */
  deleteSection(
    entryId: string,
    sectionId: string
  ): Promise<UnifiedResult<DeleteSectionResult>> {
    return callAndNormalize<DeleteSectionResult>(
      apiClient.delete(`/sections/user/${entryId}/${sectionId}`)
    );
  },

  /**
   * 向用户论文的指定section直接添加block（不通过LLM解析）
   */
  addBlockToSection(
    entryId: string,
    sectionId: string,
    request: AddBlockToSectionRequest
  ): Promise<UnifiedResult<AddBlockToSectionResult>> {
    return callAndNormalize<AddBlockToSectionResult>(
      apiClient.post(`/sections/user/${entryId}/sections/${sectionId}/add-block`, request)
    );
  },

  /**
   * 向用户论文的指定section从文本解析添加block
   */
  addBlockFromTextToSection(
    entryId: string,
    sectionId: string,
    request: AddBlockFromTextToSectionRequest
  ): Promise<UnifiedResult<AddBlockFromTextToSectionResult>> {
    return callAndNormalize<AddBlockFromTextToSectionResult>(
      apiClient.post(`/sections/user/${entryId}/sections/${sectionId}/add-block-from-text`, request)
    );
  },

  /**
   * 更新用户论文的指定section中的指定block
   */
  updateBlock(
    entryId: string,
    sectionId: string,
    blockId: string,
    updateData: UpdateBlockRequest
  ): Promise<UnifiedResult<UpdateBlockResult>> {
    return callAndNormalize<UpdateBlockResult>(
      apiClient.put(`/sections/user/${entryId}/sections/${sectionId}/blocks/${blockId}`, updateData)
    );
  },

  /**
   * 删除用户论文的指定section中的指定block
   */
  deleteBlock(
    entryId: string,
    sectionId: string,
    blockId: string
  ): Promise<UnifiedResult<DeleteBlockResult>> {
    return callAndNormalize<DeleteBlockResult>(
      apiClient.delete(`/sections/user/${entryId}/sections/${sectionId}/blocks/${blockId}`)
    );
  },
};


// —— Hook 风格导出 —— //
export function useSectionsService() {
  return {
    adminSectionService,
    userSectionService,
  };
}