// 笔记领域类型
export interface Note {
  id: string;
  paperId: string;
  sectionId?: string;
  blockId?: string;
  content: string;
  type: NoteType;
  isPrivate: boolean;
  position?: NotePosition;
  metadata?: NoteMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteType = 'personal' | 'shared' | 'public';

export interface NotePosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

export interface NoteMetadata {
  color?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  [key: string]: any;
}

export interface CreateNoteRequest {
  paperId: string;
  sectionId?: string;
  blockId?: string;
  content: string;
  type?: NoteType;
  isPrivate?: boolean;
  position?: NotePosition;
  metadata?: NoteMetadata;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {
  id: string;
}

export interface NoteFilter {
  paperId?: string;
  type?: NoteType;
  isPrivate?: boolean;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}