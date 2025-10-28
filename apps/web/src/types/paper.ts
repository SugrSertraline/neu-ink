// 论文相关类型定义，基于说明文档的数据模型

// 内联元素类型
export interface TextNode {
  type: 'text';
  content: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: string;
    backgroundColor?: string;
  };
}

export interface LinkNode {
  type: 'link';
  url: string;
  children: InlineContent[];
  title?: string;
}

export interface InlineMathNode {
  type: 'inline-math';
  latex: string;
}

export interface CitationNode {
  type: 'citation';
  referenceIds: string[];
  displayText: string;
}

export interface FigureRefNode {
  type: 'figure-ref';
  figureId: string;
  displayText: string;
}

export interface TableRefNode {
  type: 'table-ref';
  tableId: string;
  displayText: string;
}

export interface SectionRefNode {
  type: 'section-ref';
  sectionId: string;
  displayText: string;
}

export interface EquationRefNode {
  type: 'equation-ref';
  equationId: string;
  displayText: string;
}

export interface FootnoteNode {
  type: 'footnote';
  id: string;
  content: string;
  displayText: string;
}

export type InlineContent = 
  | TextNode
  | LinkNode
  | InlineMathNode
  | CitationNode
  | FigureRefNode
  | TableRefNode
  | SectionRefNode
  | EquationRefNode
  | FootnoteNode;

// 块级元素类型
export interface HeadingBlock {
  id: string;
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  number?: string;
}

export interface ParagraphBlock {
  id: string;
  type: 'paragraph';
  content: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface MathBlock {
  id: string;
  type: 'math';
  latex: string;
  label?: string;
  number?: number;
}

export interface FigureBlock {
  id: string;
  type: 'figure';
  src: string;
  alt?: string;
  number?: number;
  caption: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  description?: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  width?: string;
  height?: string;
  uploadedFilename?: string;
}

export interface TableBlock {
  id: string;
  type: 'table';
  number?: number;
  caption: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  description?: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  headers?: string[];
  rows: (string | { en?: string; zh?: string })[][];
  align?: ('left' | 'center' | 'right')[];
}

export interface CodeBlock {
  id: string;
  type: 'code';
  language?: string;
  code: string;
  caption?: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  showLineNumbers?: boolean;
}

export interface OrderedListBlock {
  id: string;
  type: 'ordered-list';
  items: Array<{
    content: {
      en?: InlineContent[];
      zh?: InlineContent[];
    };
  }>;
  start?: number;
}

export interface UnorderedListBlock {
  id: string;
  type: 'unordered-list';
  items: Array<{
    content: {
      en?: InlineContent[];
      zh?: InlineContent[];
    };
  }>;
}

export interface QuoteBlock {
  id: string;
  type: 'quote';
  content: {
    en?: InlineContent[];
    zh?: InlineContent[];
  };
  author?: string;
}

export interface DividerBlock {
  id: string;
  type: 'divider';
}

export type BlockContent = 
  | HeadingBlock
  | ParagraphBlock
  | MathBlock
  | FigureBlock
  | TableBlock
  | CodeBlock
  | OrderedListBlock
  | UnorderedListBlock
  | QuoteBlock
  | DividerBlock;

// 论文类型定义
export interface Author {
  name: string;
  affiliation?: string;
  email?: string;
}

export interface Reference {
  id: string;
  number?: number;
  authors: string[];
  title: string;
  publication?: string;
  year?: number;
  doi?: string;
  url?: string;
  pages?: string;
  volume?: string;
  issue?: string;
}

export interface Section {
  id: string;
  number?: string;
  title: {
    en?: string;
    zh?: string;
  };
  content: BlockContent[];
  subsections?: Section[];
}

export interface ParseStatus {
  status: 'pending' | 'parsing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
}

export interface PaperMetadata {
  title: string;
  titleZh?: string;
  shortTitle?: string;
  authors: Author[];
  publication?: string;
  year?: number;
  date?: string;
  doi?: string;
  articleType?: 'journal' | 'conference' | 'preprint' | 'book' | 'thesis';
  sciQuartile?: '无' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
  casQuartile?: '无' | '1区' | '2区' | '3区' | '4区';
  ccfRank?: '无' | 'A' | 'B' | 'C';
  impactFactor?: number;
  tags?: string[];
}

export interface Paper {
  id: string;
  isPublic: boolean;
  createdBy: string;
  
  // 元数据
  metadata: PaperMetadata;
  
  abstract?: {
    en?: string;
    zh?: string;
  };
  
  keywords?: string[];
  
  // 章节内容
  sections: Section[];
  
  // 参考文献
  references: Reference[];
  
  // 附件
  attachments: {
    pdf?: string;
    markdown?: string;
  };
  
  // 解析状态
  parseStatus: ParseStatus;
  
  createdAt: string;
  updatedAt: string;
}

// 论文内容类型（用于阅读器）
export interface PaperContent {
  metadata: PaperMetadata;
  abstract?: {
    en?: string;
    zh?: string;
  };
  keywords?: string[];
  sections: Section[];
  references: Reference[];
}


// 用户-论文关联
export interface UserPaper {
  id: string;
  userId: string;
  paperId: string;
  addedAt: string;
  
  // 个性化数据
  readingStatus?: 'unread' | 'reading' | 'finished';
  priority?: 'high' | 'medium' | 'low';
  remarks?: string;
  readingPosition?: number;
  totalReadingTime?: number;
  lastReadTime?: string;
}

// 笔记
export interface Note {
  id: string;
  paperId: string;
  blockId: string;
  userId: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// API响应类型
export interface PaperListResponse {
  code: number;  // 业务状态码
  message: string;
  data: {
    papers: Paper[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

// 搜索和筛选参数
export interface PaperFilters {
  search?: string;
  status?: string;
  priority?: string;
  articleType?: string;
  year?: string;
  sciQuartile?: string;
  casQuartile?: string;
  ccfRank?: string;
  rating?: string;
  page?: number;
  limit?: number;
  pageSize?: number;
  sort?: string;
}

// 简化的论文元数据类型（用于列表显示）
export interface PaperListItem extends PaperMetadata {
  id: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  parseStatus: ParseStatus;
  
  // 用户个性化数据（如果有关联）
  readingStatus?: 'unread' | 'reading' | 'finished';
  priority?: 'high' | 'medium' | 'low';
  remarks?: string;
  readingPosition?: number;
  totalReadingTime?: number;
  lastReadTime?: string;
}