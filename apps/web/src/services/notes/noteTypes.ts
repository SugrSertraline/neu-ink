// 笔记服务类型定义
import { ListOptions } from '../base/BaseServiceTypes';

// 笔记基础类型
export interface Note {
  id: string;
  paperId: string;
  sectionId?: string;
  blockId?: string;
  content: string;
  type: NoteType;
  position?: NotePosition;
  metadata?: NoteMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteType = 
  | 'personal'
  | 'public'
  | 'annotation'
  | 'comment'
  | 'summary';

export interface NotePosition {
  start?: number;
  end?: number;
  page?: number;
  x?: number;
  y?: number;
}

export interface NoteMetadata {
  color?: string;
  tags?: string[];
  isPrivate?: boolean;
  isResolved?: boolean;
  [key: string]: any;
}

// 请求类型
export interface CreateNoteRequest {
  paperId: string;
  sectionId?: string;
  blockId?: string;
  content: string;
  type: NoteType;
  position?: NotePosition;
  metadata?: NoteMetadata;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {
  id: string;
}

export interface DeleteNoteRequest {
  id: string;
  paperId: string;
}

// 响应类型
export interface NoteListResponse {
  notes: Note[];
  total: number;
  page: number;
  pageSize: number;
}

// 查询选项
export interface NoteListOptions extends ListOptions {
  paperId?: string;
  sectionId?: string;
  blockId?: string;
  type?: NoteType;
  tags?: string[];
  isResolved?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

// 笔记统计类型
export interface NoteStats {
  total: number;
  personal: number;
  public: number;
  annotations: number;
  comments: number;
  summaries: number;
  resolved: number;
  unresolved: number;
}