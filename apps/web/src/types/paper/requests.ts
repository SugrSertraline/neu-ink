// API 请求和响应类型定义

import type { Paper, UserPaper, Note } from './models';

// —— 分页信息 ——
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// —— 公共论文列表响应 ——
export interface PaperListData {
  papers: Paper[];
  pagination: Pagination;
}

// —— 个人论文列表响应 ——
export interface UserPaperListData {
  papers: UserPaper[];
  pagination: Pagination;
}

// —— 笔记列表响应 ——
export interface NoteListData {
  notes: Note[];
  pagination: Pagination;
}

// —— 用户统计信息 ——
export interface UserStatistics {
  total: number;
  readingStatus: {
    unread: number;
    reading: number;
    finished: number;
  };
  priority: {
    high: number;
    medium: number;
    low: number;
  };
  fromPublic: number;
  uploaded: number;
  totalNotes: number;
}

// —— 筛选参数：公共论文 ——
export interface PublicPaperFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  articleType?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  sciQuartile?: string;
  casQuartile?: string;
  ccfRank?: string;
  tag?: string;
  author?: string;
  publication?: string;
  doi?: string;
}

// —— 筛选参数：个人论文 ——
export interface UserPaperFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  readingStatus?: 'unread' | 'reading' | 'finished';
  priority?: 'high' | 'medium' | 'low';
  customTag?: string;
  hasSource?: boolean;
}

// —— 筛选参数：笔记 ——
export interface NoteFilters {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

// —— 请求：添加到个人库 ——
export interface AddToLibraryRequest {
  paperId: string;
  extra?: {
    customTags?: string[];
    readingStatus?: 'unread' | 'reading' | 'finished';
    priority?: 'high' | 'medium' | 'low';
  };
}

// —— 请求：从文本创建论文 ——
export interface CreatePaperFromTextRequest {
  text: string;
  extra?: {
    customTags?: string[];
    readingStatus?: 'unread' | 'reading' | 'finished';
    priority?: 'high' | 'medium' | 'low';
  };
}

// —— 请求：从元数据创建论文 ——
export interface CreatePaperFromMetadataRequest {
  metadata: {
    title: string;
    authors?: string[];
    year?: number;
    journal?: string;
    abstract?: string;
    keywords?: string[];
    doi?: string;
    url?: string;
  };
  extra?: {
    customTags?: string[];
    readingStatus?: 'unread' | 'reading' | 'finished';
    priority?: 'high' | 'medium' | 'low';
  };
}

// —— 请求：更新个人论文 ——
export interface UpdateUserPaperRequest {
  paperData?: Partial<UserPaper['paperData']>;
  customTags?: string[];
  readingStatus?: 'unread' | 'reading' | 'finished';
  priority?: 'high' | 'medium' | 'low';
  readingPosition?: string | null;
  totalReadingTime?: number;
  lastReadTime?: string | null;
  remarks?: string | null;
}

// —— 请求：更新阅读进度 ——
export interface UpdateReadingProgressRequest {
  readingPosition?: string | null;  // blockId
  readingTime?: number;             // 本次阅读时长（秒）
}

// —— 请求：创建笔记 ——
export interface CreateNoteRequest {
  userPaperId: string;
  blockId: string;
  content: Note['content'];
}

// —— 请求：更新笔记 ——
export interface UpdateNoteRequest {
  content: Note['content'];
}

// —— 响应：删除结果 ——
export interface DeleteResult {
  deletedNotes?: number;
  deletedCount?: number;
}

// —— 请求：向section添加blocks（从文本解析）——
export interface AddBlockFromTextToSectionRequest {
  text: string;
  afterBlockId?: string;  // 可选：指定在哪个block后插入
}

// —— 响应：添加block结果（从文本解析）——
export interface AddBlockFromTextToSectionResult {
  paper: Paper;
  addedBlock: import('./content').BlockContent;
  sectionId: string;
}

// —— 请求：直接向section添加block ——
export interface AddBlockToSectionRequest {
  blockData: {
    type: string;
    content?: any;
    metadata?: any;
    latex?: string;
    code?: string;
    language?: string;
    url?: string;
    alt?: string;
    headers?: string[];
    rows?: any[][];
  };
  afterBlockId?: string;  // 可选：指定在哪个block后插入
}

// —— 响应：直接添加block结果 ——
export interface AddBlockToSectionResult {
  paper: Paper;
  addedBlock: import('./content').BlockContent;
  sectionId: string;
}

// —— 请求：更新section ——
export interface UpdateSectionRequest {
  title?: { en: string; zh: string };
  content?: any[];
}

// —— 响应：更新section结果 ——
export interface UpdateSectionResult {
  paper: Paper;
  updatedSection: any;
}

// —— 响应：删除section结果 ——
export interface DeleteSectionResult {
  deletedSectionId: string;
}

// —— 请求：更新block ——
export interface UpdateBlockRequest {
  content?: string;
  type?: string;
  metadata?: any;
}

// —— 响应：更新block结果 ——
export interface UpdateBlockResult {
  paper: Paper;
  updatedBlock: any;
}

// —— 响应：删除block结果 ——
export interface DeleteBlockResult {
  deletedBlockId: string;
}