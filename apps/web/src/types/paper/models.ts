// 论文核心数据模型

import type { InlineContent, BlockContent } from './content';

// —— 作者 ——
export interface Author {
  name: string;
  affiliation?: string;
  email?: string;
}

// —— 参考文献 ——
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
  originalText?: string; // 原始参考文献文本（去除编号后的部分）
}

// —— 章节 ——
export interface Section {
  id: string;
  number?: string;
  title: string;
  titleZh?: string;
  content: BlockContent[];
}

// —— 解析状态 ——
export interface ParseStatus {
  status: 'pending' | 'parsing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
}

// —— 论文元数据 ——
export interface PaperMetadata {
  title: string;
  titleZh?: string;
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

// —— 论文附件 ——
export interface PaperAttachments {
  pdf?: {
    url: string;
    key: string;
    size: number;
    uploadedAt: string;
  };
  markdown?: {
    url: string;
    key: string;
    size: number;
    uploadedAt: string;
  };
  content_list?: {
    url: string;
    key: string;
    size: number;
    uploadedAt: string;
  };
  model?: {
    url: string;
    key: string;
    size: number;
    uploadedAt: string;
  };
  layout?: {
    url: string;
    key: string;
    size: number;
    uploadedAt: string;
  };
}

// —— 图片附件信息 ——
export interface ImageAttachment {
  filename: string;
  url: string;
  key: string;
  size: number;
  uploadedAt: string;
}

// —— 上传结果（包含图片信息） ——
export interface UploadResult {
  success: boolean;
  markdown_content?: string;
  attachments?: PaperAttachments;
  uploaded_images?: ImageAttachment[];  // 图片信息单独返回，不保存到数据库
  content_list_content?: string;
  model_content?: string;
  layout_content?: string;
  error?: string;
}

// —— 公共论文（Paper Collection） ——
export interface Paper {
  id: string;
  isPublic: boolean;
  createdBy: string;
  
  // 元数据
  metadata: PaperMetadata;
  
  // 摘要
  abstract?: {
    en?: string;
    zh?: string;
  };
  
  // 关键词
  keywords?: string[];
  
  // 章节内容
  sections: Section[];
  
  // 参考文献
  references: Reference[];
  
  // 附件
  attachments: PaperAttachments;
  
  // 解析状态
  parseStatus: ParseStatus;
  
  createdAt: string;
  updatedAt: string;
}

// —— 论文数据副本（用于 UserPaper） ——
export interface PaperData {
  metadata: PaperMetadata;
  abstract?: {
    en?: string;
    zh?: string;
  };
  keywords?: string[];
  sections: Section[];
  references: Reference[];
  attachments: PaperAttachments;
}

// —— 个人论文（UserPaper Collection） ——
export interface UserPaper {
  id: string;                        // 个人论文ID
  userId: string;                    // 用户ID
  sourcePaperId: string | null;      // 来源公共论文ID（用户上传的为 null）
  
  // 论文内容（扁平化到根级别）
  metadata: PaperMetadata;
  abstract?: {
    en?: string;
    zh?: string;
  };
  keywords?: string[];
  sections: Section[];                // 章节内容（后端现在总是返回）
  references: Reference[];
  attachments: PaperAttachments;
  
  // 个人库特有字段
  customTags: string[];              // 自定义标签
  readingStatus: 'unread' | 'reading' | 'finished';  // 阅读状态
  priority: 'high' | 'medium' | 'low';                // 优先级
  
  // 阅读进度相关
  readingPosition?: string | null;   // 当前阅读位置（blockId）
  totalReadingTime: number;          // 总阅读时间（秒）
  lastReadTime?: string | null;      // 最后阅读时间
  remarks?: string | null;           // 备注
  
  // 时间戳
  addedAt: string;
  updatedAt: string;
  
  // 扩展字段（从列表接口可能获取）
  noteCount?: number;                // 笔记数量
}

// —— 笔记（Note Collection） ——
export interface Note {
  id: string;
  userId: string;
  userPaperId: string;               // 关联个人论文ID
  blockId: string;                   // 关联的 block ID
  content: InlineContent[];          // 富文本内容
  plainText?: string;                // 纯文本内容（可选）
  createdAt: string;
  updatedAt: string;
}

// —— 论文内容（用于阅读器） ——
export interface PaperContent {
  metadata: PaperMetadata;
  abstract?: {
    en?: string;
    zh?: string;
  };
  keywords?: string[];
  sections: Section[];
  references: Reference[];
  attachments?: PaperAttachments;
}

export type PaperListItem = 
  Pick<Paper, 'id' | 'isPublic' | 'createdBy' | 'createdAt' | 'updatedAt' | 'parseStatus'> 
  & PaperMetadata;