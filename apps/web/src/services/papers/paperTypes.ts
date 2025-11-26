// 论文服务类型定义
import { ListOptions } from '../base/BaseServiceTypes';

// 论文基础类型
export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: Author[];
  sections: Section[];
  metadata: PaperMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface Author {
  id?: string;
  name: string;
  email?: string;
  affiliation?: string;
  orcid?: string;
}

export interface PaperMetadata {
  keywords?: string[];
  doi?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publishedAt?: Date;
  [key: string]: any;
}

// 章节类型
export interface Section {
  id: string;
  title: string;
  content: Block[];
  order: number;
  paperId: string;
  createdAt: Date;
  updatedAt: Date;
}

// 块类型
export interface Block {
  id: string;
  type: BlockType;
  content: BlockContent;
  order: number;
  sectionId: string;
  metadata?: BlockMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type BlockType = 
  | 'text'
  | 'heading'
  | 'image'
  | 'table'
  | 'list'
  | 'quote'
  | 'code'
  | 'math'
  | 'reference';

export interface BlockContent {
  text?: string;
  html?: string;
  markdown?: string;
  [key: string]: any;
}

export interface BlockMetadata {
  level?: number; // for headings
  language?: string; // for code blocks
  alignment?: 'left' | 'center' | 'right';
  [key: string]: any;
}

// 请求类型
export interface CreatePaperRequest {
  title: string;
  abstract?: string;
  authors: string[];
  keywords?: string[];
  metadata?: Record<string, any>;
}

export interface UpdatePaperRequest extends Partial<CreatePaperRequest> {
  id: string;
}

export interface CreateSectionRequest {
  title: string;
  content?: BlockData[];
  order?: number;
}

export interface UpdateSectionRequest extends Partial<CreateSectionRequest> {
  id: string;
}

export interface CreateBlockRequest {
  type: BlockType;
  content: BlockContent;
  order?: number;
  metadata?: BlockMetadata;
}

export interface UpdateBlockRequest extends Partial<CreateBlockRequest> {
  id: string;
}

export interface BlockData {
  type: BlockType;
  content: BlockContent;
  order: number;
  metadata?: BlockMetadata;
}

// 响应类型
export interface PaperListResponse {
  papers: Paper[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SectionListResponse {
  sections: Section[];
  total: number;
}

export interface BlockListResponse {
  blocks: Block[];
  total: number;
}

// 查询选项
export interface PaperListOptions extends ListOptions {
  author?: string;
  keyword?: string;
  journal?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SectionListOptions extends ListOptions {
  paperId: string;
}

export interface BlockListOptions extends ListOptions {
  paperId: string;
  sectionId: string;
  type?: BlockType;
}