import type { Note, NoteListData, InlineContent } from '@/types/paper';

export type PersonalNoteItem = {
  id: string;
  blockId: string;
  content: InlineContent[];
  createdAt: number;
  updatedAt: number;
};

export const toTimestamp = (value: unknown): number => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  
  // 处理 ISO 8601 格式的时间字符串（后端返回的 UTC 时间）
  if (typeof value === 'string') {
    // 如果是 ISO 8601 格式（如 "2025-11-17T11:20:42.784667"）
    if (value.includes('T') && value.includes('-')) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.getTime();
      }
    }
    
    // 尝试直接解析为时间戳
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  
  // 最后尝试使用 Date 构造函数
  const ts = new Date(value as string).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
};

export const parseInlineContent = (raw: unknown): InlineContent[] => {
  if (Array.isArray(raw)) {
    return raw as InlineContent[];
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as InlineContent[]) : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return Array.isArray((raw as { nodes?: unknown }).nodes)
      ? ((raw as { nodes: InlineContent[] }).nodes ?? [])
      : [];
  }
  return [];
};

export const adaptNoteFromApi = (
  note: Note,
  fallbackBlockId?: string
): PersonalNoteItem => {
  const blockId =
    (note as any).blockId ?? (note as any).block_id ?? fallbackBlockId ?? '';
  return {
    id: note.id,
    blockId,
    content: parseInlineContent((note as any).content ?? (note as any).contentJson),
    createdAt: toTimestamp((note as any).createdAt ?? (note as any).created_at),
    updatedAt: toTimestamp((note as any).updatedAt ?? (note as any).updated_at),
  };
};

export const sortNotesDesc = (notes: PersonalNoteItem[]) =>
  [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

export const groupNotesByBlock = (
  notes: PersonalNoteItem[]
): Record<string, PersonalNoteItem[]> => {
  const map: Record<string, PersonalNoteItem[]> = {};
  notes.forEach(note => {
    if (!note.blockId) return;
    if (!map[note.blockId]) {
      map[note.blockId] = [];
    }
    map[note.blockId].push(note);
  });
  Object.keys(map).forEach(key => {
    map[key] = sortNotesDesc(map[key]);
  });
  return map;
};

export const pickNoteArray = (payload: NoteListData | null | undefined): Note[] => {
  if (!payload) return [];
  const anyPayload = payload as any;
  if (Array.isArray(anyPayload.notes)) return anyPayload.notes as Note[];
  if (Array.isArray(anyPayload.items)) return anyPayload.items as Note[];
  if (Array.isArray(anyPayload.list)) return anyPayload.list as Note[];
  return [];
};
