// 翻译服务
import { apiClient } from '@/lib/http';
import { callAndNormalize, isSuccess } from '@/lib/http/normalize';
import type { BlockContent } from '@/types/paper';

export interface TranslationRequest {
  text: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TranslationResponse {
  originalText: string;
  translatedText: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface BlockTranslationRequest {
  block: BlockContent;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface BlockTranslationResponse {
  originalBlock: BlockContent;
  translatedBlock: BlockContent;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TranslationModel {
  value: string;
  name: string;
  description: string;
}

export interface TranslationModelsResponse {
  models: TranslationModel[];
}

class TranslationService {
  /**
   * 快速翻译
   */
  async quickTranslation(request: TranslationRequest): Promise<TranslationResponse> {
    const normalized = await callAndNormalize<TranslationResponse>(
      apiClient.post<TranslationResponse>('/translation/quick', request)
    );
    
    if (!isSuccess(normalized)) {
      throw new Error(normalized.bizMessage || '翻译失败');
    }
    
    return normalized.data;
  }

  /**
   * 翻译用户论文块
   */
  async translateUserPaperBlock(userPaperId: string, request: BlockTranslationRequest): Promise<BlockTranslationResponse> {
    const normalized = await callAndNormalize<BlockTranslationResponse>(
      apiClient.post<BlockTranslationResponse>(`/parsing/user/${userPaperId}/translate-block`, request)
    );
    
    if (!isSuccess(normalized)) {
      throw new Error(normalized.bizMessage || '翻译失败');
    }
    
    return normalized.data;
  }

  /**
   * 翻译管理员论文块
   */
  async translateAdminBlock(paperId: string, request: BlockTranslationRequest): Promise<BlockTranslationResponse> {
    const normalized = await callAndNormalize<BlockTranslationResponse>(
      apiClient.post<BlockTranslationResponse>(`/parsing/admin/${paperId}/translate-block`, request)
    );
    
    if (!isSuccess(normalized)) {
      throw new Error(normalized.bizMessage || '翻译失败');
    }
    
    return normalized.data;
  }

  /**
   * 获取可用翻译模型列表
   */
  async getAvailableModels(): Promise<TranslationModel[]> {
    const normalized = await callAndNormalize<TranslationModelsResponse>(
      apiClient.get<TranslationModelsResponse>('/translation/models')
    );
    
    if (!isSuccess(normalized)) {
      throw new Error(normalized.bizMessage || '获取模型列表失败');
    }
    
    return normalized.data.models;
  }
}

// 导出可用的翻译模型常量
export const TRANSLATION_MODELS = {
  GLM_4_5_AIR: 'glm-4.5-air',
  GLM_4_6: 'glm-4.6',
  GLM_4_5: 'glm-4.5',
  GLM_4_PLUS: 'glm-4-plus',
} as const;

export type TranslationModelValue = typeof TRANSLATION_MODELS[keyof typeof TRANSLATION_MODELS];

export const translationService = new TranslationService();