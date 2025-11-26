// API 请求类型定义

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface SearchParams {
  query?: string;
  fields?: string[];
  filters?: Record<string, any>;
}

// 认证相关请求
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  affiliation?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  affiliation?: string;
  avatar?: string;
  bio?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 论文相关请求
export interface CreatePaperRequest {
  title: string;
  abstract?: string;
  authors: string[];
  keywords?: string[];
  metadata?: Record<string, any>;
  content?: any;
}

export interface UpdatePaperRequest extends Partial<CreatePaperRequest> {
  id: string;
}

export interface PaperListRequest extends PaginationParams, SearchParams {
  status?: 'draft' | 'published' | 'archived';
  author?: string;
  tags?: string[];
  dateRange?: DateRangeParams;
}

export interface UploadPaperRequest {
  file: File;
  title?: string;
  authors?: string[];
  abstract?: string;
  metadata?: Record<string, any>;
}

export interface ParsePaperRequest {
  paperId: string;
  options?: {
    extractImages?: boolean;
    extractTables?: boolean;
    extractReferences?: boolean;
    language?: 'auto' | 'zh' | 'en';
  };
}

export interface TranslatePaperRequest {
  paperId: string;
  targetLanguage: 'zh' | 'en';
  sections?: string[];
  blocks?: string[];
  options?: {
    preserveFormatting?: boolean;
    translateReferences?: boolean;
    translateCaptions?: boolean;
  };
}

// 章节相关请求
export interface CreateSectionRequest {
  paperId: string;
  title: string;
  content?: any[];
  order?: number;
  parentId?: string;
}

export interface UpdateSectionRequest extends Partial<CreateSectionRequest> {
  id: string;
  paperId: string;
}

export interface ReorderSectionsRequest {
  paperId: string;
  sections: Array<{
    id: string;
    order: number;
    parentId?: string;
  }>;
}

export interface DeleteSectionRequest {
  paperId: string;
  sectionId: string;
}

// 块相关请求
export interface CreateBlockRequest {
  sectionId: string;
  type: string;
  content: any;
  order?: number;
}

export interface UpdateBlockRequest extends Partial<CreateBlockRequest> {
  id: string;
  sectionId: string;
}

export interface ReorderBlocksRequest {
  sectionId: string;
  blocks: Array<{
    id: string;
    order: number;
  }>;
}

export interface DeleteBlockRequest {
  sectionId: string;
  blockId: string;
}

// 笔记相关请求
export interface CreateNoteRequest {
  paperId: string;
  sectionId?: string;
  blockId?: string;
  content: string;
  type?: 'personal' | 'shared';
  tags?: string[];
  isPrivate?: boolean;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {
  id: string;
}

export interface NoteListRequest extends PaginationParams, SearchParams {
  paperId?: string;
  type?: 'personal' | 'shared';
  tags?: string[];
}

export interface DeleteNoteRequest {
  id: string;
}

// 翻译相关请求
export interface TranslateTextRequest {
  text: string;
  from?: 'auto' | 'zh' | 'en';
  to: 'zh' | 'en';
  context?: string;
}

export interface TranslateBlockRequest {
  blockId: string;
  targetLanguage: 'zh' | 'en';
  options?: {
    preserveFormatting?: boolean;
    translateCaptions?: boolean;
  };
}

export interface TranslateSectionRequest {
  sectionId: string;
  targetLanguage: 'zh' | 'en';
  options?: {
    translateHeaders?: boolean;
    translateCaptions?: boolean;
    translateReferences?: boolean;
  };
}

// 上传相关请求
export interface UploadFileRequest {
  file: File;
  type: 'image' | 'document' | 'attachment';
  paperId?: string;
  sectionId?: string;
  metadata?: Record<string, any>;
}

export interface UploadImageRequest {
  file: File;
  paperId?: string;
  sectionId?: string;
  alt?: string;
  caption?: string;
}

// 用户相关请求
export interface UserListRequest extends PaginationParams, SearchParams {
  role?: 'admin' | 'user' | 'guest';
  status?: 'active' | 'inactive' | 'suspended';
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user';
  affiliation?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: string;
}

export interface DeleteUserRequest {
  id: string;
}

// 设置相关请求
export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'zh' | 'en';
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
  editor?: EditorSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  paperUpdates: boolean;
  comments: boolean;
  mentions: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showAffiliation: boolean;
  allowDirectMessages: boolean;
}

export interface EditorSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  wordWrap: boolean;
  tabSize: number;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
}

// 搜索相关请求
export interface GlobalSearchRequest extends PaginationParams {
  query: string;
  type?: 'all' | 'papers' | 'notes' | 'users';
  filters?: {
    dateRange?: DateRangeParams;
    author?: string;
    tags?: string[];
    language?: 'zh' | 'en';
  };
}

export interface AdvancedSearchRequest {
  query: string;
  fields: Array<{
    name: string;
    value: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  }>;
  operator: 'and' | 'or';
  pagination?: PaginationParams;
}

// 导出相关请求
export interface ExportPaperRequest {
  paperId: string;
  format: 'pdf' | 'docx' | 'html' | 'markdown' | 'latex';
  options?: {
    includeComments?: boolean;
    includeNotes?: boolean;
    includeReferences?: boolean;
    paperSize?: 'a4' | 'letter';
    fontSize?: number;
    margin?: number;
  };
}

export interface ExportMultiplePapersRequest {
  paperIds: string[];
  format: 'pdf' | 'zip';
  options?: ExportPaperRequest['options'];
}

// 批量操作请求
export interface BulkOperationRequest {
  action: 'delete' | 'archive' | 'publish' | 'unpublish' | 'move';
  resourceType: 'papers' | 'sections' | 'blocks' | 'notes';
  resourceIds: string[];
  options?: Record<string, any>;
}

// 反馈相关请求
export interface CreateFeedbackRequest {
  type: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  steps?: string[];
  attachments?: string[];
  userAgent?: string;
  url?: string;
}

export interface UpdateFeedbackRequest extends Partial<CreateFeedbackRequest> {
  id: string;
}

export interface FeedbackListRequest extends PaginationParams {
  type?: string;
  status?: 'open' | 'in-progress' | 'resolved' | 'closed';
  userId?: string;
}