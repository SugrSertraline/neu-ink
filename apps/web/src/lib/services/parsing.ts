// 解析服务 - 适配新的API结构
import { apiClient, callAndNormalize } from '../http';
import type { UnifiedResult } from '@/types/api';
import type { 
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

// —— 解析服务 —— //
export const parsingService = {
  // —— 管理员论文解析服务 —— //
  admin: {
    /**
     * 解析参考文献（管理员论文）
     */
    parseReferences(request: ParseReferencesRequest): Promise<UnifiedResult<ParseReferencesResult>> {
      return callAndNormalize<ParseReferencesResult>(
        apiClient.post('/parsing/admin/parse-references', request)
      );
    },

    /**
     * 解析参考文献并添加到管理员论文（一步完成）
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
     * 解析文本为blocks（管理员论文，流式）
     */
    parseText(
      paperId: string,
      request: { text: string; afterBlockId?: string }
    ): Promise<UnifiedResult<any>> {
      return callAndNormalize<any>(
        apiClient.post(`/parsing/admin/${paperId}/parse-text`, request)
      );
    },
  },

  // —— 用户论文解析服务 —— //
  user: {
    /**
     * 解析参考文献（用户论文）
     */
    parseReferences(request: ParseReferencesRequest): Promise<UnifiedResult<ParseReferencesResult>> {
      return callAndNormalize<ParseReferencesResult>(
        apiClient.post('/parsing/user/parse-references', request)
      );
    },

    /**
     * 解析参考文献并添加到用户论文（一步完成）
     */
    parseReferencesForPaper(
      entryId: string,
      request: ParseReferencesRequest
    ): Promise<UnifiedResult<AddReferencesToPaperResult>> {
      return callAndNormalize<AddReferencesToPaperResult>(
        apiClient.post(`/parsing/user/${entryId}/parse-references`, request)
      );
    },

    /**
     * 解析文本为blocks（用户论文，流式）
     */
    parseText(
      entryId: string,
      request: { text: string; afterBlockId?: string }
    ): Promise<UnifiedResult<any>> {
      return callAndNormalize<any>(
        apiClient.post(`/parsing/user/${entryId}/parse-text`, request)
      );
    },
  },
};

// —— 解析结果管理服务 —— //
export const parseResultsService = {
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
};

// —— Hook 风格导出 —— //
export function useParsingService() {
  return {
    parsingService,
    parseResultsService,
  };
}