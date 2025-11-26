// 解析领域类型
export interface ParsingSession {
  id: string;
  paperId: string;
  status: ParsingStatus;
  progress: number;
  totalBlocks?: number;
  parsedBlocks?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type ParsingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ParsedBlock {
  id: string;
  type: ParsedBlockType;
  content: any;
  order: number;
  metadata?: ParsedBlockMetadata;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ParsedBlockType = 
  | 'text'
  | 'heading'
  | 'image'
  | 'table'
  | 'list'
  | 'quote'
  | 'code'
  | 'math'
  | 'reference'
  | 'figure'
  | 'caption';

export interface ParsedBlockMetadata {
  level?: number; // for headings
  language?: string; // for code blocks
  alignment?: 'left' | 'center' | 'right';
  source?: string; // source reference
  confidence?: number; // parsing confidence
  [key: string]: any;
}

export interface CreateParsingSessionRequest {
  paperId: string;
  options?: ParsingOptions;
}

export interface ParsingOptions {
  extractImages?: boolean;
  extractTables?: boolean;
  extractReferences?: boolean;
  language?: string;
  [key: string]: any;
}

export interface ParsingFilter {
  paperId?: string;
  status?: ParsingStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}