// 块领域类型
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

export interface CreateBlockRequest {
  sectionId: string;
  type: BlockType;
  content: any;
  order?: number;
  metadata?: BlockMetadata;
}

export interface UpdateBlockRequest extends Partial<CreateBlockRequest> {
  id: string;
}

export interface BlockFilter {
  sectionId?: string;
  type?: BlockType;
  search?: string;
}