// 论文领域类型
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

export interface Section {
  id: string;
  title: string;
  content: Block[];
  order: number;
  paperId: string;
  createdAt: Date;
  updatedAt: Date;
}

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