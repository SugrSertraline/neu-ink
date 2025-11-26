// API 响应类型定义

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message: string;
  error?: ErrorDetail;
  meta?: ResponseMeta;
}

export interface ErrorDetail {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp?: string;
}

export interface ResponseMeta {
  requestId?: string;
  timestamp?: string;
  version?: string;
  pagination?: PaginationMeta;
  rateLimit?: RateLimitMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RateLimitMeta {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// 认证相关响应
export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  affiliation?: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  editor: EditorPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  paperUpdates: boolean;
  comments: boolean;
  mentions: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showAffiliation: boolean;
  allowDirectMessages: boolean;
}

export interface EditorPreferences {
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  wordWrap: boolean;
  tabSize: number;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
}

// 论文相关响应
export interface PaperResponse {
  id: string;
  title: string;
  abstract: string;
  authors: Author[];
  keywords: string[];
  metadata: PaperMetadata;
  sections: SectionResponse[];
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'unlisted';
  language: 'zh' | 'en' | 'both';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  wordCount: number;
  readingTime: number;
  viewCount: number;
  downloadCount: number;
  tags: string[];
  coverImage?: string;
  attachments: Attachment[];
  owner: UserResponse;
  collaborators: Collaborator[];
  permissions: PaperPermissions;
}

export interface Author {
  id?: string;
  name: string;
  email?: string;
  affiliation?: string;
  orcid?: string;
  order?: number;
  isCorresponding?: boolean;
}

export interface PaperMetadata {
  doi?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  publishedAt?: string;
  isbn?: string;
  issn?: string;
  conference?: string;
  venue?: string;
  [key: string]: any;
}

export interface SectionResponse {
  id: string;
  title: string;
  content: BlockResponse[];
  order: number;
  parentId?: string;
  level: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlockResponse {
  id: string;
  type: BlockType;
  content: any;
  order: number;
  metadata?: BlockMetadata;
  createdAt: string;
  updatedAt: string;
}

export type BlockType = 
  | 'heading'
  | 'paragraph'
  | 'math'
  | 'figure'
  | 'table'
  | 'code'
  | 'ordered-list'
  | 'unordered-list'
  | 'quote'
  | 'divider'
  | 'parsing';

export interface BlockMetadata {
  level?: number;
  language?: string;
  alignment?: 'left' | 'center' | 'right';
  caption?: string;
  alt?: string;
  width?: string;
  height?: string;
  [key: string]: any;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploader: UserResponse;
}

export interface Collaborator {
  id: string;
  user: UserResponse;
  role: 'owner' | 'editor' | 'viewer' | 'commenter';
  permissions: string[];
  invitedAt: string;
  joinedAt?: string;
  invitedBy?: UserResponse;
}

export interface PaperPermissions {
  canView: boolean;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  canExport: boolean;
  canManageCollaborators: boolean;
}

export interface PaperListResponse {
  papers: PaperResponse[];
  pagination: PaginationMeta;
  filters: {
    status?: string;
    author?: string;
    tags?: string[];
    dateRange?: {
      startDate?: string;
      endDate?: string;
    };
  };
}

export interface PaperStatsResponse {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  totalViews: number;
  totalDownloads: number;
  totalWords: number;
  averageReadingTime: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'view' | 'download' | 'comment' | 'edit' | 'share';
  paperId: string;
  paperTitle: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  metadata?: any;
}

// 笔记相关响应
export interface NoteResponse {
  id: string;
  paperId: string;
  sectionId?: string;
  blockId?: string;
  content: string;
  type: 'personal' | 'shared';
  tags: string[];
  isPrivate: boolean;
  author: UserResponse;
  createdAt: string;
  updatedAt: string;
  paper: {
    id: string;
    title: string;
  };
  section?: {
    id: string;
    title: string;
  };
  block?: {
    id: string;
    type: BlockType;
    content: any;
  };
  comments: CommentResponse[];
}

export interface CommentResponse {
  id: string;
  content: string;
  author: UserResponse;
  createdAt: string;
  updatedAt: string;
  replies: CommentResponse[];
  likes: number;
  isLiked: boolean;
}

export interface NoteListResponse {
  notes: NoteResponse[];
  pagination: PaginationMeta;
  filters: {
    paperId?: string;
    type?: string;
    tags?: string[];
  };
}

// 翻译相关响应
export interface TranslationResponse {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: 'zh' | 'en';
  targetLanguage: 'zh' | 'en';
  confidence: number;
  alternatives?: string[];
  createdAt: string;
}

export interface BlockTranslationResponse {
  id: string;
  blockId: string;
  originalContent: any;
  translatedContent: any;
  sourceLanguage: 'zh' | 'en';
  targetLanguage: 'zh' | 'en';
  confidence: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface SectionTranslationResponse {
  id: string;
  sectionId: string;
  originalBlocks: BlockResponse[];
  translatedBlocks: BlockResponse[];
  sourceLanguage: 'zh' | 'en';
  targetLanguage: 'zh' | 'en';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface PaperTranslationResponse {
  id: string;
  paperId: string;
  sourceLanguage: 'zh' | 'en';
  targetLanguage: 'zh' | 'en';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  sections: SectionTranslationResponse[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// 解析相关响应
export interface ParseJobResponse {
  id: string;
  paperId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stages: ParseStage[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ParseStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
}

export interface ParseResultResponse {
  id: string;
  paperId: string;
  sections: SectionResponse[];
  blocks: BlockResponse[];
  metadata: {
    extractedImages: number;
    extractedTables: number;
    extractedReferences: number;
    wordCount: number;
    processingTime: number;
  };
  confidence: number;
  createdAt: string;
}

// 上传相关响应
export interface UploadResponse {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: any;
  uploadedAt: string;
  uploader: UserResponse;
}

export interface ImageUploadResponse extends UploadResponse {
  width: number;
  height: number;
  format: string;
  colorSpace?: string;
  hasAlpha?: boolean;
}

export interface DocumentUploadResponse extends UploadResponse {
  pageCount: number;
  wordCount: number;
  format: string;
  author?: string;
  title?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  createdAt?: string;
  modifiedAt?: string;
}

// 搜索相关响应
export interface SearchResult {
  id: string;
  type: 'paper' | 'note' | 'user';
  title: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  score: number;
  highlights: string[];
  metadata?: any;
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: PaginationMeta;
  facets: SearchFacets;
  suggestions?: string[];
  searchTime: number;
}

export interface SearchFacets {
  types: Array<{
    value: string;
    count: number;
  }>;
  authors: Array<{
    value: string;
    count: number;
  }>;
  tags: Array<{
    value: string;
    count: number;
  }>;
  dateRanges: Array<{
    value: string;
    count: number;
  }>;
}

// 导出相关响应
export interface ExportJobResponse {
  id: string;
  resourceType: 'paper' | 'papers';
  resourceId?: string;
  resourceIds?: string[];
  format: 'pdf' | 'docx' | 'html' | 'markdown' | 'latex' | 'zip';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// 批量操作响应
export interface BulkOperationResponse {
  id: string;
  action: string;
  resourceType: string;
  resourceIds: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: BulkOperationResult[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface BulkOperationResult {
  resourceId: string;
  success: boolean;
  error?: string;
  data?: any;
}

// 反馈相关响应
export interface FeedbackResponse {
  id: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  steps?: string[];
  attachments?: string[];
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  url?: string;
  userId?: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: UserResponse;
  resolution?: string;
}

// 系统相关响应
export interface SystemInfoResponse {
  version: string;
  buildNumber: string;
  environment: 'development' | 'staging' | 'production';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    connections: number;
    maxConnections: number;
  };
  cache: {
    status: 'connected' | 'disconnected';
    hitRate: number;
    memory: number;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: HealthCheck[];
  uptime: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  details?: any;
}

// 用户：通用类型
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  affiliation?: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}