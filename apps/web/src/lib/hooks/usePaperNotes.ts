// hooks/usePaperNotes.ts
import { useState, useCallback } from 'react';
import { userNoteService } from '@/lib/services/notes';
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
import { toast } from 'sonner';

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
      const response = await userNoteService.getNotesByPaper(userPaperId);
      const data = ensureUnified(response);
      const notesRaw = pickNoteArray(data);
      const personalNotes = notesRaw.map(note => adaptNoteFromApi(note));
      setNotesByBlock(groupNotesByBlock(personalNotes));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载笔记失败，请稍后重试');
      setNotesByBlock({});
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, userPaperId]);

  const createNote = useCallback(
    async (blockId: string, content: InlineContent[]) => {
      if (!userPaperId) {
        toast.error('未找到个人论文标识，无法创建笔记。');
        return;
      }
      setIsMutating(true);
      
      // 1. 生成标准UUID作为笔记ID
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const noteId = generateUUID();
      
      // 2. 创建笔记对象
      const note: PersonalNoteItem = {
        id: noteId,
        blockId,
        content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // 3. 立即将笔记添加到状态中，这样用户可以立即看到并操作
      setNotesByBlock(prev => {
        const next = { ...prev };
        const bucket = next[blockId] ?? [];
        next[blockId] = sortNotesDesc([...bucket, note]);
        return next;
      });
      
      try {
        const payload: CreateNoteRequest = {
          id: noteId,  // 使用前端生成的ID
          userPaperId,
          blockId,
          content,
          plainText: extractPlainText(content),
        };
        const response = await userNoteService.createNote(userPaperId, payload);
        
        // 4. 检查响应并显示成功消息
        if (response.bizMessage) {
          // 使用后端返回的成功消息
          toast.success(response.bizMessage);
        } else {
          toast.success('笔记创建成功');
        }
        
        // 5. 验证后端返回的ID是否与前端生成的ID一致
        if (response.data && response.data.id && response.data.id !== noteId) {
          console.warn('后端返回的ID与前端生成的ID不一致', {
            frontendId: noteId,
            backendId: response.data.id
          });
          
          // 如果ID不一致，更新本地状态中的笔记ID
          setNotesByBlock(prev => {
            const next = { ...prev };
            const bucket = next[blockId] ?? [];
            const updatedBucket = bucket.map(note =>
              note.id === noteId ? { ...note, id: response.data.id } : note
            );
            next[blockId] = updatedBucket;
            return next;
          });
        }
      } catch (err) {
        // 6. 如果创建失败，移除笔记
        setNotesByBlock(prev => {
          const next = { ...prev };
          const bucket = next[blockId] ?? [];
          const filteredBucket = bucket.filter(note => note.id !== noteId);
          
          if (filteredBucket.length) {
            next[blockId] = sortNotesDesc(filteredBucket);
          } else {
            delete next[blockId];
          }
          
          return next;
        });
        
        toast.error(err instanceof Error ? err.message : '创建笔记失败，请稍后重试');
      } finally {
        setIsMutating(false);
      }
    },
    [userPaperId]
  );

  const updateNote = useCallback(
    async (blockId: string, noteId: string, content: InlineContent[]) => {
      if (!userPaperId) {
        toast.error('未找到个人论文标识，无法更新笔记。');
        return;
      }
      setIsMutating(true);
      try {
        const payload: UpdateNoteRequest = {
          content,
          plainText: extractPlainText(content),
        };
        const response = await userNoteService.updateNote(userPaperId, noteId, payload);
        
        // 处理可能的响应格式
        let noteData = response.data;
        if (!noteData) {
          throw new Error('更新笔记失败：返回数据为空');
        }
        
        // 检查是否是有效的笔记数据（必须有content字段）
        if (!noteData.content) {
          toast.success('笔记更新成功');
          return;
        }
        
        const updated = adaptNoteFromApi(noteData, blockId);

        setNotesByBlock(prev => {
          const next = { ...prev };
          
          // 从原始blockId中移除笔记
          const originalBucket = next[blockId] ?? [];
          const cleanedOriginalBucket = originalBucket.filter(note => note.id !== noteId);
          if (cleanedOriginalBucket.length) {
            next[blockId] = sortNotesDesc(cleanedOriginalBucket);
          } else {
            delete next[blockId];
          }
          
          // 将更新后的笔记添加到其blockId中
          const targetBucket = next[updated.blockId] ?? [];
          next[updated.blockId] = sortNotesDesc([
            ...targetBucket.filter(note => note.id !== updated.id),
            updated,
          ]);
          
          return next;
        });
        
        toast.success('笔记更新成功');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '更新笔记失败，请稍后重试');
      } finally {
        setIsMutating(false);
      }
    },
    [userPaperId]
  );

  const deleteNote = useCallback(
    async (blockId: string, noteId: string) => {
      if (!userPaperId) {
        toast.error('未找到个人论文标识，无法删除笔记。');
        return;
      }
      setIsMutating(true);
      try {
        const response = await userNoteService.deleteNote(userPaperId, noteId);
        if (response.bizCode !== 0) {
          throw new Error(response.bizMessage ?? '删除笔记失败，请稍后重试');
        }
        
        // 从所有block中查找并删除笔记
        setNotesByBlock(prev => {
          const next = { ...prev };
          
          // 遍历所有block，找到包含该笔记的block
          Object.keys(next).forEach(currentBlockId => {
            const bucket = next[currentBlockId] ?? [];
            const filteredBucket = bucket.filter(note => note.id !== noteId);
            
            if (filteredBucket.length) {
              next[currentBlockId] = sortNotesDesc(filteredBucket);
            } else {
              delete next[currentBlockId];
            }
          });
          
          return next;
        });
        
        toast.success('笔记删除成功');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '删除笔记失败，请稍后重试');
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
