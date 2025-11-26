// 编辑器状态管理类型
import { BaseState, BaseActions } from './base';

// 块类型定义
export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'math'
  | 'figure'
  | 'table'
  | 'code'
  | 'ordered-list'
  | 'unordered-list'
  | 'quote'
  | 'divider'
  | 'parsing';

export interface EditorState extends BaseState {
  paperId: string | null;
  mode: 'view' | 'edit';
  isDirty: boolean;
  currentSection: string | null;
  currentBlock: string | null;
  selectedText?: string;
  selectionRange?: {
    start: number;
    end: number;
  collapsed?: boolean;
  };
  history?: {
    past: EditorHistory[];
    present: EditorHistory;
    future: EditorHistory[];
  };
}

export interface EditorActions extends BaseActions {
  setPaper: (paperId: string) => void;
  setMode: (mode: 'view' | 'edit') => void;
  setDirty: (isDirty: boolean) => void;
  setCurrentSection: (sectionId: string | null) => void;
  setCurrentBlock: (blockId: string | null) => void;
  setSelectedText: (text: string) => void;
  setSelectionRange: (range: { start: number; end: number; collapsed?: boolean }) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  saveAsDraft: () => Promise<void>;
  discardChanges: () => void;
  insertText: (text: string, position?: number) => void;
  deleteText: (range: { start: number; end: number }) => void;
  replaceText: (range: { start: number; end: number }, text: string) => void;
  formatText: (format: 'bold' | 'italic' | 'underline' | 'strikethrough') => void;
  insertBlock: (type: BlockType, position?: number) => void;
  deleteBlock: (blockId: string) => void;
  moveBlock: (blockId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  duplicateBlock: (blockId: string) => void;
}

export type EditorStore = EditorState & EditorActions;

export interface EditorHistory {
  id: string;
  state: EditorState;
  timestamp: number;
}

export interface EditorConfig {
  autoSave: boolean;
  autoSaveInterval: number;
  spellCheck: boolean;
  wordWrap: boolean;
  tabSize: number;
  theme: 'light' | 'dark' | 'auto';
}

export interface EditorPlugin {
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface EditorToolbar {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  heading: boolean;
  list: boolean;
  quote: boolean;
  code: boolean;
  link: boolean;
  image: boolean;
  table: boolean;
  math: boolean;
  reference: boolean;
}