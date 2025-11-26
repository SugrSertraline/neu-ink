// 公共论文服务
import {
  Paper,
  PaperContent,
  PaperListData,
  PublicPaperFilters
} from '@/types/paper/index';
import { apiClient, callAndNormalize } from '../../http';
import type { UnifiedResult } from '@/types/api';
import { buildSearchParams } from '../../utils/index';

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