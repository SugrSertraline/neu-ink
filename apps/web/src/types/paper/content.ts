// 论文内容类型定义（InlineContent 和 BlockContent）

// —— 内联元素类型 ——
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

// —— 块级元素类型 ——
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

export interface LoadingBlock {
  id: string;
  type: 'loading';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  progress?: number;
  originalText?: string;
  sectionId?: string;
  afterBlockId?: string;
  createdAt?: string;
  completedAt?: string;
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
  | DividerBlock
  | LoadingBlock;