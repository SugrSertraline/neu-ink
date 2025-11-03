// hooks/usePaperReferences.ts (继续)
import { useState, useCallback } from 'react';
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
  setHasUnsavedChanges: (value: boolean) => void
) {
  const [editingReferenceId, setEditingReferenceId] = useState<string | null>(null);
  const [referenceEditorMode, setReferenceEditorMode] =
    useState<ReferenceEditorMode>('edit');
  const [referenceDraft, setReferenceDraft] = useState<Reference | null>(null);

  const displayReferences = editableDraft?.references ?? [];

  const updateReferences = useCallback(
    (updater: (refs: Reference[]) => { refs: Reference[]; touched: boolean }) => {
      setEditableDraft(prev => {
        if (!prev) return prev;
        const current = prev.references ?? [];
        const { refs: next, touched } = updater(current);
        if (!touched) return prev;
        setHasUnsavedChanges(true);
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

  const handleReferenceEditorSubmit = useCallback(() => {
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
          : new Date().getFullYear(),
    };
    updateReferences(refs => {
      const idx = refs.findIndex(r => r.id === normalized.id);
      if (idx === -1) {
        return { refs, touched: false };
      }
      const next = [...refs];
      next[idx] = normalized;
      return { refs: next, touched: true };
    });
    closeReferenceEditor();
  }, [referenceDraft, updateReferences, closeReferenceEditor]);

  const handleReferenceEditorCancel = useCallback(() => {
    if (referenceEditorMode === 'create' && editingReferenceId) {
      removeReferenceById(editingReferenceId);
    }
    closeReferenceEditor();
  }, [referenceEditorMode, editingReferenceId, removeReferenceById, closeReferenceEditor]);

  const handleReferenceAdd = useCallback(() => {
    const created = createEmptyReference();
    updateReferences(refs => ({
      refs: [...refs, created],
      touched: true,
    }));
    prepareReferenceEditor(created, 'create');
  }, [prepareReferenceEditor, updateReferences]);

  const handleReferenceDuplicate = useCallback(
    (reference: Reference) => {
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
    },
    [prepareReferenceEditor, updateReferences]
  );

  const handleReferenceInsertBelow = useCallback(
    (reference: Reference) => {
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
    },
    [prepareReferenceEditor, updateReferences]
  );

  const handleReferenceDelete = useCallback(
    (reference: Reference) => {
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
    },
    [updateReferences, editingReferenceId, closeReferenceEditor]
  );

  const handleReferenceEdit = useCallback(
    (reference: Reference) => {
      const source = displayReferences.find(r => r.id === reference.id) ?? reference;
      prepareReferenceEditor(source, 'edit');
    },
    [displayReferences, prepareReferenceEditor]
  );

  const handleReferenceMove = useCallback(
    (reference: Reference, direction: 'up' | 'down') => {
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
    },
    [updateReferences]
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
  };
}
