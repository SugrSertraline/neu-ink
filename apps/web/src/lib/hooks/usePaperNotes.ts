// hooks/usePaperNotes.ts
import { useState, useCallback } from 'react';
import { noteService } from '@/lib/services/paper';
import type { InlineContent, CreateNoteRequest, UpdateNoteRequest } from '@/types/paper';
import {
  type PersonalNoteItem,
  adaptNoteFromApi,
  groupNotesByBlock,
  pickNoteArray,
  sortNotesDesc,
} from '../utils/noteAdapters';
import { extractPlainText } from '../utils/paperHelpers';
import { ensureUnified } from '../utils/apiHelpers';

export function usePaperNotes(userPaperId: string | null, isEnabled: boolean) {
  const [notesByBlock, setNotesByBlock] = useState<Record<string, PersonalNoteItem[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!isEnabled || !userPaperId) {
      setNotesByBlock({});
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await noteService.getNotesByPaper(userPaperId);
      const data = ensureUnified(response);
      const notesRaw = pickNoteArray(data);
      const personalNotes = notesRaw.map(note => adaptNoteFromApi(note));
      setNotesByBlock(groupNotesByBlock(personalNotes));
    } catch (err) {
      console.error('加载笔记失败', err);
      setError(err instanceof Error ? err.message : '加载笔记失败，请稍后重试');
      setNotesByBlock({});
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, userPaperId]);

  const createNote = useCallback(
    async (blockId: string, content: InlineContent[]) => {
      if (!userPaperId) {
        alert('未找到个人论文标识，无法创建笔记。');
        return;
      }
      setIsMutating(true);
      try {
        const payload: CreateNoteRequest = {
          userPaperId,
          blockId,
          content,
          plainText: extractPlainText(content),
        } as CreateNoteRequest;
        const response = await noteService.createNote(payload);
        const created = adaptNoteFromApi(ensureUnified(response), blockId);
        setNotesByBlock(prev => {
          const next = { ...prev };
          const bucket = next[created.blockId] ?? [];
          next[created.blockId] = sortNotesDesc([...bucket, created]);
          return next;
        });
      } catch (err) {
        console.error('创建笔记失败', err);
        alert(err instanceof Error ? err.message : '创建笔记失败，请稍后重试');
      } finally {
        setIsMutating(false);
      }
    },
    [userPaperId]
  );

  const updateNote = useCallback(
    async (blockId: string, noteId: string, content: InlineContent[]) => {
      if (!userPaperId) {
        alert('未找到个人论文标识，无法更新笔记。');
        return;
      }
      setIsMutating(true);
      try {
        const payload: UpdateNoteRequest = {
          content,
          plainText: extractPlainText(content),
        } as UpdateNoteRequest;
        const response = await noteService.updateNote(noteId, payload);
        const updated = adaptNoteFromApi(ensureUnified(response), blockId);

        setNotesByBlock(prev => {
          const next = { ...prev };
          const originalBucket = next[blockId] ?? [];
          const stillInOriginal = originalBucket.some(note => note.id === noteId);
          if (stillInOriginal) {
            const cleaned = originalBucket.filter(note => note.id !== noteId);
            if (cleaned.length) next[blockId] = sortNotesDesc(cleaned);
            else delete next[blockId];
          }
          const targetBucket = next[updated.blockId] ?? [];
          next[updated.blockId] = sortNotesDesc([
            ...targetBucket.filter(note => note.id !== updated.id),
            updated,
          ]);
          return next;
        });
      } catch (err) {
        console.error('更新笔记失败', err);
        alert(err instanceof Error ? err.message : '更新笔记失败，请稍后重试');
      } finally {
        setIsMutating(false);
      }
    },
    [userPaperId]
  );

  const deleteNote = useCallback(
    async (blockId: string, noteId: string) => {
      if (!userPaperId) {
        alert('未找到个人论文标识，无法删除笔记。');
        return;
      }
      setIsMutating(true);
      try {
        const response = await noteService.deleteNote(noteId);
        if (response.bizCode !== 0) {
          throw new Error(response.bizMessage ?? '删除笔记失败，请稍后重试');
        }
        setNotesByBlock(prev => {
          const next = { ...prev };
          const bucket = next[blockId] ?? [];
          const remaining = bucket.filter(note => note.id !== noteId);
          if (remaining.length) {
            next[blockId] = sortNotesDesc(remaining);
          } else {
            delete next[blockId];
          }
          return next;
        });
      } catch (err) {
        console.error('删除笔记失败', err);
        alert(err instanceof Error ? err.message : '删除笔记失败，请稍后重试');
      } finally {
        setIsMutating(false);
      }
    },
    [userPaperId]
  );

  return {
    notesByBlock,
    isLoading,
    error,
    isMutating,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}
