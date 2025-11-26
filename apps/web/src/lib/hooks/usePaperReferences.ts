// hooks/usePaperReferences.ts (继续)
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { userPaperService } from '@/lib/services/papers';
import type { Reference, PaperContent as PaperContentModel } from '@/types/paper';
import {
  createEmptyReference,
  cloneReferenceEntry,
  generateId,
} from '../utils/paperHelpers';

type ReferenceEditorMode = 'create' | 'edit';

export function usePaperReferences(
  editableDraft: PaperContentModel | null,
  setEditableDraft: React.Dispatch<React.SetStateAction<PaperContentModel | null>>,
  setHasUnsavedChanges: (value: boolean) => void,
  resolvedUserPaperId: string | null
) {
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const [referenceEditorMode, setReferenceEditorMode] =
    useState<ReferenceEditorMode>('edit');
  const [referenceDraft, setReferenceDraft] = useState<Reference | null>(null);

  const displayReferences = editableDraft?.references ?? [];

  // 保存参考文献到后端
  const saveReferencesToServer = useCallback(async () => {
    if (!resolvedUserPaperId) {
      toast.error('未找到个人论文ID，无法保存参考文献');
      return false;
    }

    try {
      toast.loading('正在保存参考文献...', { id: 'save-references' });
      
      const result = await userPaperService.updateUserPaperReferences(
        resolvedUserPaperId,
        displayReferences
      );

      if (result.bizCode === 0) {
        toast.success('参考文献保存成功', { id: 'save-references' });
        setHasUnsavedChanges(false);
        return true;
      } else {
        toast.error(result.bizMessage || '参考文献保存失败', { id: 'save-references' });
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存过程中发生未知错误';
      toast.error(`参考文献保存失败: ${message}`, { id: 'save-references' });
      return false;
    }
  }, [resolvedUserPaperId, displayReferences, setHasUnsavedChanges]);

  const updateReferences = useCallback(
    (updater: (refs: Reference[]) => { refs: Reference[]; touched: boolean }) => {
      setEditableDraft(prev => {
        if (!prev) return prev;
        const current = prev.references ?? [];
        const { refs: next, touched } = updater(current);
        if (!touched) return prev;
        // 使用 setTimeout 来避免在渲染过程中调用 setState
        setTimeout(() => setHasUnsavedChanges(true), 0);
        return { ...prev, references: next };
      });
    },
    [setEditableDraft, setHasUnsavedChanges]
  );

  const closeReferenceEditor = useCallback(() => {
    setEditingReferenceId(null);
    setReferenceDraft(null);
    setReferenceEditorMode('edit');
  }, []);

  const removeReferenceById = useCallback(
    (referenceId: string) => {
      updateReferences(refs => {
        if (!refs.some(r => r.id === referenceId)) {
          return { refs, touched: false };
        }
        return {
          refs: refs.filter(r => r.id !== referenceId),
          touched: true,
        };
      });
    },
    [updateReferences]
  );

  const handleReferenceDraftChange = useCallback((next: Reference) => {
    setReferenceDraft(cloneReferenceEntry(next));
  }, []);

  const prepareReferenceEditor = useCallback(
    (reference: Reference, mode: ReferenceEditorMode) => {
      if (
        editingReferenceId &&
        editingReferenceId !== reference.id &&
        referenceEditorMode === 'create'
      ) {
        removeReferenceById(editingReferenceId);
      }
      setReferenceDraft(cloneReferenceEntry(reference));
      setEditingReferenceId(reference.id);
      setReferenceEditorMode(mode);
    },
    [editingReferenceId, referenceEditorMode, removeReferenceById]
  );

  const handleReferenceEditorSubmit = useCallback(async () => {
    if (!referenceDraft) return;
    const normalized: Reference = {
  ...referenceDraft,
  authors: (referenceDraft.authors ?? [])
    .map(author => author.trim())
    .filter(Boolean),
  title: referenceDraft.title?.trim() ?? '',
  publication: referenceDraft.publication?.trim() ?? '',
  year:
    referenceDraft.year && referenceDraft.year > 0
      ? referenceDraft.year
      : undefined,
};

    // 先更新本地状态
    updateReferences(refs => {
      const idx = refs.findIndex(r => r.id === normalized.id);
      if (idx === -1) {
        return { refs, touched: false };
      }
      const next = [...refs];
      next[idx] = normalized;
      return { refs: next, touched: true };
    });
    
    // 立即保存到后端
    await saveReferencesToServer();
    closeReferenceEditor();
  }, [referenceDraft, updateReferences, closeReferenceEditor, saveReferencesToServer]);

  const handleReferenceEditorCancel = useCallback(() => {
    if (referenceEditorMode === 'create' && editingReferenceId) {
      removeReferenceById(editingReferenceId);
    }
    closeReferenceEditor();
  }, [referenceEditorMode, editingReferenceId, removeReferenceById, closeReferenceEditor]);

  const handleReferenceAdd = useCallback(async () => {
    const created = createEmptyReference();
    updateReferences(refs => ({
      refs: [...refs, created],
      touched: true,
    }));
    prepareReferenceEditor(created, 'create');
    // 立即保存到后端
    await saveReferencesToServer();
  }, [prepareReferenceEditor, updateReferences, saveReferencesToServer]);

  const handleReferenceDuplicate = useCallback(
    async (reference: Reference) => {
      const duplicate: Reference = {
        ...cloneReferenceEntry(reference),
        id: generateId('ref'),
      };
      updateReferences(refs => {
        const idx = refs.findIndex(r => r.id === reference.id);
        if (idx === -1) return { refs, touched: false };
        const next = [...refs];
        next.splice(idx + 1, 0, duplicate);
        return { refs: next, touched: true };
      });
      prepareReferenceEditor(duplicate, 'edit');
      // 立即保存到后端
      await saveReferencesToServer();
    },
    [prepareReferenceEditor, updateReferences, saveReferencesToServer]
  );

  const handleReferenceInsertBelow = useCallback(
    async (reference: Reference) => {
      const created = createEmptyReference();
      updateReferences(refs => {
        const idx = refs.findIndex(r => r.id === reference.id);
        if (idx === -1) {
          return { refs: [...refs, created], touched: true };
        }
        const next = [...refs];
        next.splice(idx + 1, 0, created);
        return { refs: next, touched: true };
      });
      prepareReferenceEditor(created, 'create');
      // 立即保存到后端
      await saveReferencesToServer();
    },
    [prepareReferenceEditor, updateReferences, saveReferencesToServer]
  );

  const handleReferenceDelete = useCallback(
    async (reference: Reference) => {
      updateReferences(refs => {
        if (!refs.some(r => r.id === reference.id)) {
          return { refs, touched: false };
        }
        return {
          refs: refs.filter(r => r.id !== reference.id),
          touched: true,
        };
      });
      if (editingReferenceId === reference.id) {
        closeReferenceEditor();
      }
      // 立即保存到后端
      await saveReferencesToServer();
    },
    [updateReferences, editingReferenceId, closeReferenceEditor, saveReferencesToServer]
  );

  const handleReferenceEdit = useCallback(
    (reference: Reference) => {
      const source = displayReferences.find(r => r.id === reference.id) ?? reference;
      prepareReferenceEditor(source, 'edit');
    },
    [displayReferences, prepareReferenceEditor]
  );

  const handleReferenceMove = useCallback(
    async (reference: Reference, direction: 'up' | 'down') => {
      updateReferences(refs => {
        const idx = refs.findIndex(r => r.id === reference.id);
        if (idx === -1) return { refs, touched: false };
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= refs.length) return { refs, touched: false };
        const next = [...refs];
        const [item] = next.splice(idx, 1);
        next.splice(targetIdx, 0, item);
        return { refs: next, touched: true };
      });
      // 立即保存到后端
      await saveReferencesToServer();
    },
    [updateReferences, saveReferencesToServer]
  );

  const handleReferenceMoveUp = useCallback(
    (reference: Reference) => handleReferenceMove(reference, 'up'),
    [handleReferenceMove]
  );

  const handleReferenceMoveDown = useCallback(
    (reference: Reference) => handleReferenceMove(reference, 'down'),
    [handleReferenceMove]
  );

  return {
    displayReferences,
    editingReferenceId,
    referenceEditorMode,
    referenceDraft,
    handleReferenceDraftChange,
    handleReferenceEditorSubmit,
    handleReferenceEditorCancel,
    handleReferenceAdd,
    handleReferenceDuplicate,
    handleReferenceInsertBelow,
    handleReferenceDelete,
    handleReferenceEdit,
    handleReferenceMoveUp,
    handleReferenceMoveDown,
    saveReferencesToServer,
  };
}
