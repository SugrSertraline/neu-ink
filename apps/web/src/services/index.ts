// 服务层主入口文件
export { BaseApiService } from './base/BaseApiService';
export { ApiClient, type RequestOptions } from './base/ApiClient';
export type {
  BaseServiceConfig,
  PaginationOptions,
  SearchOptions,
  ListOptions,
  ServiceError,
  ServiceResponse
} from './base/BaseServiceTypes';

export {
  createSuccessResponse,
  createErrorResponse,
  handleApiResponse,
  handleBusinessResponse,
  isServiceSuccess,
  isServiceError
} from './base/responseHandlers';

// 论文服务
export { PaperService, paperService } from './papers/paperService';
export type {
  Paper,
  Author,
  PaperMetadata,
  Section,
  Block,
  BlockType,
  BlockContent,
  BlockMetadata,
  CreatePaperRequest,
  UpdatePaperRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateBlockRequest,
  UpdateBlockRequest,
  BlockData,
  PaperListOptions,
  SectionListOptions,
  BlockListOptions
} from './papers/paperTypes';

// 笔记服务
export { NoteService, noteService } from './notes/noteService';
export type {
  Note,
  NoteType,
  NotePosition,
  NoteMetadata,
  CreateNoteRequest,
  UpdateNoteRequest,
  DeleteNoteRequest,
  NoteListOptions,
  NoteStats
} from './notes/noteTypes';