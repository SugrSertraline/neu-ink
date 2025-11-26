// 论文服务实现
import { BaseApiService } from '../base/BaseApiService';
import { ApiClient } from '../base/ApiClient';
import { 
  Paper, 
  Section, 
  Block,
  CreatePaperRequest, 
  UpdatePaperRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateBlockRequest,
  UpdateBlockRequest,
  PaperListOptions,
  SectionListOptions,
  BlockListOptions
} from './paperTypes';

export class PaperService extends BaseApiService {
  private client: ApiClient;
  
  constructor(baseUrl: string = '/api/papers', headers?: Record<string, string>) {
    super();
    this.client = new ApiClient(baseUrl, headers);
  }
  
  protected getClient(): ApiClient {
    return this.client;
  }
  
  // 论文相关方法
  async getPaper(paperId: string): Promise<{ data: Paper }> {
    return this.callApi('GET', `/${paperId}`);
  }
  
  async getPapers(options?: PaperListOptions): Promise<{ data: Paper[] }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.search) params.append('search', options.search);
    if (options?.author) params.append('author', options.author);
    if (options?.keyword) params.append('keyword', options.keyword);
    
    const query = params.toString();
    const endpoint = query ? `?${query}` : '';
    
    return this.callApi('GET', endpoint);
  }
  
  async createPaper(paperData: CreatePaperRequest): Promise<{ data: Paper }> {
    return this.callApi('POST', '', paperData);
  }
  
  async updatePaper(paperId: string, paperData: UpdatePaperRequest): Promise<{ data: Paper }> {
    return this.callApi('PUT', `/${paperId}`, paperData);
  }
  
  async deletePaper(paperId: string): Promise<{ data: void }> {
    return this.callApi('DELETE', `/${paperId}`);
  }
  
  // 章节相关方法
  async getSection(paperId: string, sectionId: string): Promise<{ data: Section }> {
    return this.callApi('GET', `/${paperId}/sections/${sectionId}`);
  }
  
  async getSections(paperId: string, options?: SectionListOptions): Promise<{ data: Section[] }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    
    const query = params.toString();
    const endpoint = `/${paperId}/sections${query ? `?${query}` : ''}`;
    
    return this.callApi('GET', endpoint);
  }
  
  async createSection(paperId: string, sectionData: CreateSectionRequest): Promise<{ data: Section }> {
    return this.callApi('POST', `/${paperId}/sections`, sectionData);
  }
  
  async updateSection(paperId: string, sectionId: string, sectionData: UpdateSectionRequest): Promise<{ data: Section }> {
    return this.callApi('PUT', `/${paperId}/sections/${sectionId}`, sectionData);
  }
  
  async deleteSection(paperId: string, sectionId: string): Promise<{ data: void }> {
    return this.callApi('DELETE', `/${paperId}/sections/${sectionId}`);
  }
  
  // 块相关方法
  async getBlock(paperId: string, sectionId: string, blockId: string): Promise<{ data: Block }> {
    return this.callApi('GET', `/${paperId}/sections/${sectionId}/blocks/${blockId}`);
  }
  
  async getBlocks(paperId: string, sectionId: string, options?: BlockListOptions): Promise<{ data: Block[] }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.type) params.append('type', options.type);
    if (options?.sortBy) params.append('sortBy', options.sortBy);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    
    const query = params.toString();
    const endpoint = `/${paperId}/sections/${sectionId}/blocks${query ? `?${query}` : ''}`;
    
    return this.callApi('GET', endpoint);
  }
  
  async createBlock(paperId: string, sectionId: string, blockData: CreateBlockRequest): Promise<{ data: Block }> {
    return this.callApi('POST', `/${paperId}/sections/${sectionId}/blocks`, blockData);
  }
  
  async updateBlock(paperId: string, sectionId: string, blockId: string, blockData: UpdateBlockRequest): Promise<{ data: Block }> {
    return this.callApi('PUT', `/${paperId}/sections/${sectionId}/blocks/${blockId}`, blockData);
  }
  
  async deleteBlock(paperId: string, sectionId: string, blockId: string): Promise<{ data: void }> {
    return this.callApi('DELETE', `/${paperId}/sections/${sectionId}/blocks/${blockId}`);
  }
  
  // 批量操作方法
  async reorderSections(paperId: string, sectionIds: string[]): Promise<{ data: Section[] }> {
    return this.callApi('POST', `/${paperId}/sections/reorder`, { sectionIds });
  }
  
  async reorderBlocks(paperId: string, sectionId: string, blockIds: string[]): Promise<{ data: Block[] }> {
    return this.callApi('POST', `/${paperId}/sections/${sectionId}/blocks/reorder`, { blockIds });
  }
}

// 导出服务实例
export const paperService = new PaperService();