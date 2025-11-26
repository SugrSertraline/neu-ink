// types/api.ts
// —— 唯一真源：HTTP与业务码表、通用响应/统一返回体 ——

// HTTP 响应状态码（外层）
export enum ResponseCode {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_ERROR = 500,
}

// 业务状态码（data 内层，与后端 BusinessCode 保持一致）
export enum BusinessCode {
  SUCCESS = 0,
  // 用户认证相关 1000-1099
  LOGIN_FAILED = 1001,
  ACCOUNT_DISABLED = 1002,
  PASSWORD_EXPIRED = 1003,
  INVALID_PARAMS = 1004,
  USER_NOT_FOUND = 1005,
  USER_EXISTS = 1006,
  PERMISSION_DENIED = 1007,
  TOKEN_INVALID = 1008,
  TOKEN_EXPIRED = 1009,
  OLD_PASSWORD_WRONG = 1010,
  INTERNAL_ERROR = 1999,

  // 论文相关 2000-2099
  PAPER_NOT_FOUND = 2001,
  PAPER_CREATION_FAILED = 2002,
  PAPER_UPDATE_FAILED = 2003,
  PAPER_DELETE_FAILED = 2004,
  INVALID_PAPER_DATA = 2005,
  PAPER_PERMISSION_DENIED = 2006,
  PAPER_ALREADY_EXISTS = 2007,
  PAPER_CONFLICT = 2008,

  // 笔记相关 3000-3099
  NOTE_NOT_FOUND = 3001,
  NOTE_CREATION_FAILED = 3002,
  NOTE_UPDATE_FAILED = 3003,
  NOTE_DELETE_FAILED = 3004,
  NOTE_PERMISSION_DENIED = 3005,

  // 章节相关 4000-4099
  SECTION_NOT_FOUND = 4001,
  SECTION_CREATION_FAILED = 4002,
  SECTION_UPDATE_FAILED = 4003,
  SECTION_DELETE_FAILED = 4004,
  SECTION_PERMISSION_DENIED = 4005,

  // 块相关 5000-5099
  BLOCK_NOT_FOUND = 5001,
  BLOCK_CREATION_FAILED = 5002,
  BLOCK_UPDATE_FAILED = 5003,
  BLOCK_DELETE_FAILED = 5004,
  BLOCK_PERMISSION_DENIED = 5005,

  // 解析相关 6000-6099
  PARSE_NOT_FOUND = 6001,
  PARSE_CREATION_FAILED = 6002,
  PARSE_UPDATE_FAILED = 6003,
  PARSE_DELETE_FAILED = 6004,
  PARSE_PERMISSION_DENIED = 6005,
  PARSE_IN_PROGRESS = 6006,
  PARSE_FAILED = 6007,

  // 翻译相关 7000-7099
  TRANSLATION_FAILED = 7001,
  TRANSLATION_IN_PROGRESS = 7002,
  TRANSLATION_NOT_FOUND = 7003,
  TRANSLATION_PERMISSION_DENIED = 7004,

  // 上传相关 8000-8099
  UPLOAD_FAILED = 8001,
  UPLOAD_FILE_TOO_LARGE = 8002,
  UPLOAD_INVALID_FILE_TYPE = 8003,
  UPLOAD_PERMISSION_DENIED = 8004,
}

// HTTP 响应类型（外层）
export interface ApiResponse<T = any> {
  code: ResponseCode;  // HTTP 状态码
  message: string;
  data: T;
}

// 业务响应类型（内层）
export interface BusinessResponse<T = any> {
  code: BusinessCode;  // 业务状态码
  message: string;
  data: T;
}

// 统一后的前端可用返回体
export interface UnifiedResult<T = any> {
  topCode: number;         // 顶层 code（等同 HTTP 语义）
  topMessage: string;      // 顶层 message
  bizCode: number;         // 业务 code（没有业务层时为 0）
  bizMessage: string;      // 业务 message（没有业务层时与顶层一致）
  data: T;                 // 真实数据载荷
  raw: ApiResponse<any>;   // 原始响应（便于调试）
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 分页响应
export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 排序参数
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 搜索参数
export interface SearchParams {
  search?: string;
}

// 通用列表参数
export interface ListParams extends PaginationParams, SortParams, SearchParams {}

// API端点常量
export const API_ENDPOINTS = {
  // 论文管理
  papers: {
    admin: {
      base: '/papers/admin',
      list: '/papers/admin',
      create: '/papers/admin',
      update: '/papers/admin',
      updateMetadata: '/papers/admin',
      updateAbstractKeywords: '/papers/admin',
      updateReferences: '/papers/admin',
      delete: '/papers/admin',
    },
    user: {
      base: '/papers/user',
      list: '/papers/user',
      create: '/papers/user',
      updateMetadata: '/papers/user',
      updateAbstractKeywords: '/papers/user',
      updateReferences: '/papers/user',
      delete: '/papers/user',
    },
  },
  
  // 公开论文
  publicPapers: {
    base: '/public-papers',
    list: '/public-papers',
    content: '/public-papers',
  },
  
  // 章节管理
  sections: {
    admin: {
      base: '/sections/admin',
      create: '/sections/admin',
      addBlock: '/sections/admin',
      addBlockFromText: '/sections/admin',
    },
    user: {
      base: '/sections/user',
      create: '/sections/user',
      addBlock: '/sections/user',
      addBlockFromText: '/sections/user',
    },
  },
  
  // 笔记管理
  notes: {
    admin: {
      base: '/notes/admin',
      list: '/notes/admin',
      create: '/notes/admin',
      detail: '/notes',
      update: '/notes/admin',
      delete: '/notes/admin',
    },
    user: {
      base: '/notes/user',
      list: '/notes/user',
      create: '/notes/user',
      detail: '/notes',
      update: '/notes/user',
      delete: '/notes/user',
    },
  },
  
  // 解析管理
  parseResults: {
    base: '/parse-results',
    confirm: '/parse-results',
    discard: '/parse-results',
    saveAll: '/parse-results',
  },
  
  // 解析服务
  parsing: {
    admin: {
      parseReferences: '/parsing/admin',
      parseText: '/parsing/admin',
    },
    user: {
      parseReferences: '/parsing/user',
      parseText: '/parsing/user',
    },
  },
  
  // 翻译服务
  translation: {
    admin: {
      checkAndComplete: '/translation/admin',
      status: '/translation/admin',
    },
    public: {
      checkAndComplete: '/translation/public',
      status: '/translation/public',
    },
    quick: '/translation/quick',
    models: '/translation/models',
  },
  
  // 上传服务
  upload: {
    image: '/upload/image',
    pdf: '/upload/pdf',
    markdown: '/upload/markdown',
    document: '/upload/document',
    paperImage: '/upload/paper-image',
    token: '/upload/token',
    config: '/upload/config',
  },
  
  // 用户管理
  users: {
    base: '/users',
    list: '/users',
    create: '/users',
    update: '/users',
    delete: '/users',
    login: '/users/login',
    logout: '/users/logout',
    refresh: '/users/refresh',
    current: '/users/current',
    changePassword: '/users/password',
    changeRole: '/users',
  },
  
  // 系统监控
  health: '/health',
} as const;

// API端点构建器
export const buildApiUrl = {
  // 论文管理
  papers: {
    admin: {
      detail: (id: string) => `${API_ENDPOINTS.papers.admin.base}/${id}`,
      update: (id: string) => `${API_ENDPOINTS.papers.admin.update}/${id}`,
      updateMetadata: (id: string) => `${API_ENDPOINTS.papers.admin.updateMetadata}/${id}/metadata`,
      updateAbstractKeywords: (id: string) => `${API_ENDPOINTS.papers.admin.updateAbstractKeywords}/${id}/abstract-keywords`,
      updateReferences: (id: string) => `${API_ENDPOINTS.papers.admin.updateReferences}/${id}/references`,
      delete: (id: string) => `${API_ENDPOINTS.papers.admin.delete}/${id}`,
    },
    user: {
      detail: (id: string) => `${API_ENDPOINTS.papers.user.base}/${id}`,
      updateMetadata: (id: string) => `${API_ENDPOINTS.papers.user.updateMetadata}/${id}/metadata`,
      updateAbstractKeywords: (id: string) => `${API_ENDPOINTS.papers.user.updateAbstractKeywords}/${id}/abstract-keywords`,
      updateReferences: (id: string) => `${API_ENDPOINTS.papers.user.updateReferences}/${id}/references`,
      delete: (id: string) => `${API_ENDPOINTS.papers.user.delete}/${id}`,
    },
  },
  
  // 公开论文
  publicPapers: {
    detail: (id: string) => `${API_ENDPOINTS.publicPapers.base}/${id}`,
    content: (id: string) => `${API_ENDPOINTS.publicPapers.content}/${id}/content`,
  },
  
  // 章节管理
  sections: {
    admin: {
      base: (paperId: string) => `${API_ENDPOINTS.sections.admin.base}/${paperId}`,
      detail: (paperId: string, sectionId: string) => `${API_ENDPOINTS.sections.admin.base}/${paperId}/${sectionId}`,
      create: (paperId: string) => `${API_ENDPOINTS.sections.admin.create}/${paperId}/add-section`,
      update: (paperId: string, sectionId: string) => `${API_ENDPOINTS.sections.admin.base}/${paperId}/${sectionId}`,
      delete: (paperId: string, sectionId: string) => `${API_ENDPOINTS.sections.admin.base}/${paperId}/${sectionId}`,
      addBlock: (paperId: string, sectionId: string) => `${API_ENDPOINTS.sections.admin.addBlock}/${paperId}/sections/${sectionId}/add-block`,
      addBlockFromText: (paperId: string, sectionId: string) => `${API_ENDPOINTS.sections.admin.addBlockFromText}/${paperId}/sections/${sectionId}/add-block-from-text`,
      updateBlock: (paperId: string, sectionId: string, blockId: string) => `${API_ENDPOINTS.sections.admin.base}/${paperId}/sections/${sectionId}/blocks/${blockId}`,
      deleteBlock: (paperId: string, sectionId: string, blockId: string) => `${API_ENDPOINTS.sections.admin.base}/${paperId}/sections/${sectionId}/blocks/${blockId}`,
    },
    user: {
      base: (entryId: string) => `${API_ENDPOINTS.sections.user.base}/${entryId}`,
      detail: (entryId: string, sectionId: string) => `${API_ENDPOINTS.sections.user.base}/${entryId}/${sectionId}`,
      create: (entryId: string) => `${API_ENDPOINTS.sections.user.create}/${entryId}/add-section`,
      update: (entryId: string, sectionId: string) => `${API_ENDPOINTS.sections.user.base}/${entryId}/${sectionId}`,
      delete: (entryId: string, sectionId: string) => `${API_ENDPOINTS.sections.user.base}/${entryId}/${sectionId}`,
      addBlock: (entryId: string, sectionId: string) => `${API_ENDPOINTS.sections.user.addBlock}/${entryId}/sections/${sectionId}/add-block`,
      addBlockFromText: (entryId: string, sectionId: string) => `${API_ENDPOINTS.sections.user.addBlockFromText}/${entryId}/sections/${sectionId}/add-block-from-text`,
      updateBlock: (entryId: string, sectionId: string, blockId: string) => `${API_ENDPOINTS.sections.user.base}/${entryId}/sections/${sectionId}/blocks/${blockId}`,
      deleteBlock: (entryId: string, sectionId: string, blockId: string) => `${API_ENDPOINTS.sections.user.base}/${entryId}/sections/${sectionId}/blocks/${blockId}`,
    },
  },
  
  // 笔记管理
  notes: {
    admin: {
      base: (paperId: string) => `${API_ENDPOINTS.notes.admin.base}/${paperId}`,
      list: (paperId: string) => `${API_ENDPOINTS.notes.admin.list}/${paperId}`,
      create: (paperId: string) => `${API_ENDPOINTS.notes.admin.create}/${paperId}`,
      detail: (noteId: string) => `${API_ENDPOINTS.notes.admin.detail}/${noteId}`,
      update: (paperId: string, noteId: string) => `${API_ENDPOINTS.notes.admin.update}/${paperId}/${noteId}`,
      delete: (paperId: string, noteId: string) => `${API_ENDPOINTS.notes.admin.delete}/${paperId}/${noteId}`,
    },
    user: {
      base: (entryId: string) => `${API_ENDPOINTS.notes.user.base}/${entryId}`,
      list: (entryId: string) => `${API_ENDPOINTS.notes.user.list}/${entryId}`,
      create: (entryId: string) => `${API_ENDPOINTS.notes.user.create}/${entryId}`,
      detail: (noteId: string) => `${API_ENDPOINTS.notes.user.detail}/${noteId}`,
      update: (entryId: string, noteId: string) => `${API_ENDPOINTS.notes.user.update}/${entryId}/${noteId}`,
      delete: (entryId: string, noteId: string) => `${API_ENDPOINTS.notes.user.delete}/${entryId}/${noteId}`,
    },
  },
  
  // 解析管理
  parseResults: {
    base: (paperId: string, parseId: string) => `${API_ENDPOINTS.parseResults.base}/${paperId}/${parseId}`,
    detail: (paperId: string, parseId: string) => `${API_ENDPOINTS.parseResults.base}/${paperId}/${parseId}`,
    confirm: (paperId: string, parseId: string) => `${API_ENDPOINTS.parseResults.confirm}/${paperId}/${parseId}/confirm`,
    discard: (paperId: string, parseId: string) => `${API_ENDPOINTS.parseResults.discard}/${paperId}/${parseId}/discard`,
    saveAll: (paperId: string, parseId: string) => `${API_ENDPOINTS.parseResults.saveAll}/${paperId}/${parseId}/save-all`,
  },
  
  // 解析服务
  parsing: {
    admin: {
      parseReferences: (paperId: string) => `${API_ENDPOINTS.parsing.admin.parseReferences}/${paperId}/parse-references`,
      parseText: (paperId: string) => `${API_ENDPOINTS.parsing.admin.parseText}/${paperId}/parse-text`,
    },
    user: {
      parseReferences: (entryId: string) => `${API_ENDPOINTS.parsing.user.parseReferences}/${entryId}/parse-references`,
      parseText: (entryId: string) => `${API_ENDPOINTS.parsing.user.parseText}/${entryId}/parse-text`,
    },
  },
  
  // 翻译服务
  translation: {
    admin: {
      checkAndComplete: (paperId: string) => `${API_ENDPOINTS.translation.admin.checkAndComplete}/${paperId}/translation/check-and-complete`,
      status: (paperId: string) => `${API_ENDPOINTS.translation.admin.status}/${paperId}/translation/status`,
    },
    public: {
      checkAndComplete: (paperId: string) => `${API_ENDPOINTS.translation.public.checkAndComplete}/${paperId}/translation/check-and-complete`,
      status: (paperId: string) => `${API_ENDPOINTS.translation.public.status}/${paperId}/translation/status`,
    },
  },
  
  // 用户管理
  users: {
    detail: (userId: string) => `${API_ENDPOINTS.users.base}/${userId}`,
    update: (userId: string) => `${API_ENDPOINTS.users.update}/${userId}`,
    delete: (userId: string) => `${API_ENDPOINTS.users.delete}/${userId}`,
    changeRole: (userId: string) => `${API_ENDPOINTS.users.changeRole}/${userId}/role`,
  },
};
