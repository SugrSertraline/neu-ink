// 章节领域类型
import { Block, BlockType, BlockMetadata } from './block.js';

export interface Section {
  id: string;
  title: string;
  content: Block[];
  order: number;
  paperId: string;
  metadata?: SectionMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionMetadata {
  wordCount?: number;
  readingTime?: number; // in minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  [key: string]: any;
}

export interface CreateSectionRequest {
  paperId: string;
  title: string;
  content?: BlockData[];
  order?: number;
  metadata?: SectionMetadata;
}

export interface UpdateSectionRequest extends Partial<CreateSectionRequest> {
  id: string;
}

export interface SectionFilter {
  paperId?: string;
  title?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface BlockData {
  type: BlockType;
  content: any;
  order?: number;
  metadata?: BlockMetadata;
}