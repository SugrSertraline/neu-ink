// PDF 解析相关的块类型定义

// —— PDF 内容块类型 ——
export interface PdfTextBlock {
  type: 'text';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text?: string;
  text_level?: number;
}

export interface PdfImageBlock {
  type: 'image';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  img_path?: string;
  image_caption?: string[];
  image_footnote?: string[];
}

export interface PdfTableBlock {
  type: 'table';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  table_caption?: string[];
  table_footnote?: string[];
  table_body?: string;
}

export interface PdfEquationBlock {
  type: 'equation';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text: string;
  text_format: 'latex';
}

export interface PdfCodeBlock {
  type: 'code';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  sub_type: 'code' | 'algorithm';
  code_body: string;
  code_caption?: string[];
}

export interface PdfListBlock {
  type: 'list';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  sub_type: 'text' | 'ref_text';
  list_items?: string[];
}

// Discarded blocks types
export interface PdfHeaderBlock {
  type: 'header';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text: string;
}

export interface PdfFooterBlock {
  type: 'footer';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text: string;
}

export interface PdfPageNumberBlock {
  type: 'page_number';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text: string;
}

export interface PdfAsideTextBlock {
  type: 'aside_text';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text: string;
}

export interface PdfPageFootnoteBlock {
  type: 'page_footnote';
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] 映射到 0-1000
  page_idx: number; // 从 0 开始
  text: string;
}

// PDF 内容块联合类型
export type PdfContentBlock =
  | PdfTextBlock
  | PdfImageBlock
  | PdfTableBlock
  | PdfEquationBlock
  | PdfCodeBlock
  | PdfListBlock;

// Discarded blocks 联合类型
export type PdfDiscardedBlock =
  | PdfHeaderBlock
  | PdfFooterBlock
  | PdfPageNumberBlock
  | PdfAsideTextBlock
  | PdfPageFootnoteBlock;

// 所有块类型联合
export type PdfAllBlock = PdfContentBlock | PdfDiscardedBlock;