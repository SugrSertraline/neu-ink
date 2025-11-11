// 上传服务
import { apiClient } from '@/lib/http/client';

export interface UploadResponse {
  url: string;
  key: string;
  size: number;
  contentType: string;
  uploadedAt: string;
}

export interface UploadConfig {
  isConfigured: boolean;
  maxFileSize: number;
  allowedImageTypes: string[];
  allowedDocumentTypes: string[];
  allowedMarkdownTypes: string[];
  domain?: string;
}

/**
 * 上传图片到七牛云
 * @param file 图片文件
 * @returns 上传结果
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  console.log('[DEBUG] 开始上传图片:', file.name, file.type, file.size);
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.upload<UploadResponse>('/upload/image', formData);
    console.log('[DEBUG] 图片上传响应:', response);
    return response.data;
  } catch (error) {
    console.error('[DEBUG] 图片上传失败:', error);
    throw error;
  }
}

/**
 * 上传文档到七牛云
 * @param file 文档文件
 * @returns 上传结果
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.upload<UploadResponse>('/upload/document', formData);
  return response.data;
}

/**
 * 上传Markdown文件到七牛云
 * @param file Markdown文件
 * @returns 上传结果
 */
export async function uploadMarkdown(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.upload<UploadResponse>('/upload/markdown', formData);
  return response.data;
}

/**
 * 上传论文图片到七牛云
 * @param file 图片文件
 * @param paperId 论文ID（可选）
 * @returns 上传结果
 */
export async function uploadPaperImage(file: File, paperId?: string): Promise<UploadResponse> {
  console.log('[DEBUG] 开始上传论文图片:', file.name, file.type, file.size, 'paperId:', paperId);
  const formData = new FormData();
  formData.append('file', file);
  if (paperId) {
    formData.append('paper_id', paperId);
  }

  try {
    const response = await apiClient.upload<UploadResponse>('/upload/paper-image', formData);
    console.log('[DEBUG] 论文图片上传响应:', response);
    return response.data;
  } catch (error) {
    console.error('[DEBUG] 论文图片上传失败:', error);
    throw error;
  }
}

/**
 * 获取上传配置
 * @returns 上传配置
 */
export async function getUploadConfig(): Promise<UploadConfig> {
  const response = await apiClient.get<UploadConfig>('/upload/config');
  return response.data;
}

/**
 * 获取上传凭证
 * @param key 文件在七牛云中的存储路径
 * @param expires 凭证有效期（秒），默认3600
 * @returns 上传凭证
 */
export async function getUploadToken(key: string, expires = 3600): Promise<{
  token: string;
  key: string;
  expires: number;
  domain: string;
}> {
  const response = await apiClient.get<{
    token: string;
    key: string;
    expires: number;
    domain: string;
  }>(`/upload/token?key=${encodeURIComponent(key)}&expires=${expires}`);
  return response.data;
}