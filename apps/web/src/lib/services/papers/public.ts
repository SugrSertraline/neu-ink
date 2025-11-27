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

};