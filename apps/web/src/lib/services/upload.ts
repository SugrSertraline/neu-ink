// 上传服务
import { callAndNormalize } from '@/lib/http';
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
<<<<<<< HEAD
  console.log('[DEBUG] 开始上传图片:', file.name, file.type, file.size);
=======
>>>>>>> origin/main
  const formData = new FormData();
  formData.append('file', file);

  const response = await callAndNormalize<UploadResponse>(
    apiClient.upload<UploadResponse>('/upload/image', formData)
  );
  
<<<<<<< HEAD
  console.log('[DEBUG] 图片上传响应:', response);
  
  // 处理嵌套的响应结构
  // 外层是HTTP响应，内层是业务响应，真正的数据在内层的data中
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    console.log('[DEBUG] 解析嵌套响应，提取真实数据:', response.data.data);
=======
  // 处理嵌套的响应结构
  // 外层是HTTP响应，内层是业务响应，真正的数据在内层的data中
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
>>>>>>> origin/main
    return response.data.data as UploadResponse;
  }
  
  return response.data;
}

/**
 * 上传文档到七牛云
 * @param file 文档文件
 * @returns 上传结果
 */
export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await callAndNormalize<UploadResponse>(
    apiClient.upload<UploadResponse>('/upload/document', formData)
  );
  
  // 处理嵌套的响应结构
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data as UploadResponse;
  }
  
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

  const response = await callAndNormalize<UploadResponse>(
    apiClient.upload<UploadResponse>('/upload/markdown', formData)
  );
  
  // 处理嵌套的响应结构
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data as UploadResponse;
  }
  
  return response.data;
}

/**
 * 上传论文图片到七牛云
 * @param file 图片文件
 * @param paperId 论文ID（可选）
 * @returns 上传结果
 */
export async function uploadPaperImage(file: File, paperId?: string): Promise<UploadResponse> {
<<<<<<< HEAD
  console.log('[DEBUG] 开始上传论文图片:', file.name, file.type, file.size, 'paperId:', paperId);
=======
>>>>>>> origin/main
  const formData = new FormData();
  formData.append('file', file);
  if (paperId) {
    formData.append('paper_id', paperId);
  }

  const response = await callAndNormalize<UploadResponse>(
    apiClient.upload<UploadResponse>('/upload/paper-image', formData)
  );
  
<<<<<<< HEAD
  console.log('[DEBUG] 论文图片上传响应:', response);
  
  // 处理嵌套的响应结构
  // 外层是HTTP响应，内层是业务响应，真正的数据在内层的data中
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    console.log('[DEBUG] 解析嵌套响应，提取真实数据:', response.data.data);
=======
  // 处理嵌套的响应结构
  // 外层是HTTP响应，内层是业务响应，真正的数据在内层的data中
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
>>>>>>> origin/main
    return response.data.data as UploadResponse;
  }
  
  return response.data;
}

/**
 * 获取上传配置
 * @returns 上传配置
 */
export async function getUploadConfig(): Promise<UploadConfig> {
  const response = await callAndNormalize<UploadConfig>(
    apiClient.get<UploadConfig>('/upload/config')
  );
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
  const response = await callAndNormalize<{
    token: string;
    key: string;
    expires: number;
    domain: string;
  }>(
    apiClient.get<{
      token: string;
      key: string;
      expires: number;
      domain: string;
    }>(`/upload/token?key=${encodeURIComponent(key)}&expires=${expires}`)
  );
  return response.data;
}