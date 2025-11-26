'use client';

import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useEditorStore } from '@/store/editor/editorStore';
import { adminPaperService, userPaperService } from '@/lib/services/papers';
import type { PaperContent as PaperContentModel, PaperMetadata as PaperMetadataModel, Reference } from '@/types/paper';

interface UsePaperPageInteractionsProps {
  paperId: string;
  resolvedUserPaperId: string | null;
  isPersonalOwner: boolean;
  editableDraft: PaperContentModel | null;
  paper: any;
  displayContent: PaperContentModel | null;
  setEditableDraft: (draft: PaperContentModel | null | ((prev: PaperContentModel | null) => PaperContentModel | null)) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setAttachments: (attachments: any) => void;
  setIsPublicVisible: (visible: boolean) => void;
  setActiveBlockId: (id: string | null) => void;
  setSelectedBlockId: (id: string | null | ((prev: string | null) => string | null)) => void;
  updatePosition?: (blockId: string) => void;
  saveImmediately?: () => void;
  loadNotes?: () => void;
  createNote?: (blockId: string, content: any[]) => Promise<void>;
  updateNote?: (blockId: string, noteId: string, content: any[]) => Promise<void>;
  deleteNote?: (blockId: string, noteId: string) => Promise<void>;
  updateSections?: (updater: (sections: any[]) => { sections: any[]; touched: boolean }) => void;
  handleAddBlocksFromText?: (sectionId: string, text: string, paperId: string, userPaperId: string | null, isPersonalOwner: boolean, afterBlockId?: string) => Promise<any>;
}

export function usePaperPageInteractions({
  paperId,
  resolvedUserPaperId,
  isPersonalOwner,
  editableDraft,
  paper,
  displayContent,
  setEditableDraft,
  setHasUnsavedChanges,
  setAttachments,
  setIsPublicVisible,
  setActiveBlockId,
  setSelectedBlockId,
  updatePosition,
  saveImmediately,
  loadNotes,
  createNote,
  updateNote,
  deleteNote,
  updateSections,
  handleAddBlocksFromText,
}: UsePaperPageInteractionsProps) {
  const { setHasUnsavedChanges: setEditorHasUnsavedChanges, switchToEdit, clearCurrentEditing, currentEditingId } = useEditorStore();

  // 处理元数据编辑开始
  const handleMetadataEditStart = useCallback((metadata: PaperMetadataModel, setIsMetadataEditorOpen: (open: boolean) => void, setMetadataEditorInitial: (initial: PaperMetadataModel | null) => void, setMetadataEditorError: (error: string | null) => void) => {
    if (!metadata) return;
    const switched = switchToEdit('metadata', {
      beforeSwitch: () => {
        setMetadataEditorError(null);
      },
      onRequestSave: () => { },
    });
    if (!switched) return;
    setMetadataEditorInitial(metadata);
    setMetadataEditorError(null);
    setIsMetadataEditorOpen(true);
  }, [switchToEdit]);

  // 处理摘要关键词编辑开始
  const handleAbstractKeywordsEditStart = useCallback((displayContent: PaperContentModel | null, setIsAbstractKeywordsEditorOpen: (open: boolean) => void, setAbstractKeywordsEditorInitial: (initial: any) => void, setAbstractKeywordsEditorError: (error: string | null) => void) => {
    if (!displayContent) return;
    const switched = switchToEdit('abstractKeywords', {
      beforeSwitch: () => {
        setAbstractKeywordsEditorError(null);
      },
      onRequestSave: () => { },
    });
    if (!switched) return;
    setAbstractKeywordsEditorInitial({
      abstract: displayContent.abstract,
      keywords: displayContent.keywords,
    });
    setAbstractKeywordsEditorError(null);
    setIsAbstractKeywordsEditorOpen(true);
  }, [switchToEdit]);

  // 查找块所在章节
  const findBlockSection = useCallback(
    (blockId: string, displayContent: PaperContentModel | null) => {
      if (!displayContent?.sections) return null;

      for (let sectionIndex = 0; sectionIndex < displayContent.sections.length; sectionIndex++) {
        const section = displayContent.sections[sectionIndex];
        const blocks = section.content ?? [];

        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
          if (blocks[blockIndex].id === blockId) {
            return {
              section,
              sectionIndex,
              blockIndex,
            };
          }
        }
      }
      return null;
    },
    [],
  );

  // 处理元数据更新
  const handleMetadataUpdate = useCallback(
    async (next: PaperMetadataModel, abstract?: { en?: string; zh?: string }, keywords?: string[]) => {
      setEditableDraft((prev: PaperContentModel | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          metadata: next,
          abstract: abstract || prev.abstract,
          keywords: keywords || prev.keywords,
        };
      });
      setEditorHasUnsavedChanges(true);
    },
    [setEditableDraft, setEditorHasUnsavedChanges],
  );

  // 保存到服务器
  const handleSaveToServer = useCallback(
    async (data?: PaperContentModel, attachments?: any) => {
      // 由于整个论文更新接口已被移除，显示提示信息
      toast.error('保存功能已变更', {
        description: '整个论文的保存功能已被移除，请使用具体的更新功能（如更新附件、更新可见性等）'
      });
      return;
    },
    [],
  );

  // 处理附件变更
  const handleAttachmentsChange = useCallback((newAttachments: any) => {
    setAttachments(newAttachments);
    setEditorHasUnsavedChanges(true);
  }, [setAttachments, setEditorHasUnsavedChanges]);

  // 处理元数据覆盖层提交
  const handleMetadataOverlaySubmit = useCallback(
    async (
      next: PaperMetadataModel,
      abstract?: { en?: string; zh?: string },
      keywords?: string[]
    ) => {
      try {
        const base = (editableDraft ?? paper)!;
        const nextDraft: PaperContentModel = {
          ...base,
          metadata: next,
          abstract: abstract ?? base.abstract,
          keywords: keywords ?? base.keywords,
        };

        setEditableDraft(nextDraft);
        await handleSaveToServer(nextDraft);
        clearCurrentEditing();
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
        toast.error('元数据保存失败', { description: message });
        throw err; // 重新抛出错误，让调用者处理UI状态更新
      }
    },
    [editableDraft, paper, handleSaveToServer, clearCurrentEditing],
  );

  // 处理摘要关键词覆盖层提交
  const handleAbstractKeywordsOverlaySubmit = useCallback(
    async (
      setIsAbstractKeywordsEditorOpen: (open: boolean) => void,
      setAbstractKeywordsEditorInitial: (initial: any) => void,
      setAbstractKeywordsEditorError: (error: string | null) => void,
      setIsAbstractKeywordsSubmitting: (submitting: boolean) => void,
      abstract?: { en?: string; zh?: string },
      keywords?: string[]
    ) => {
      setIsAbstractKeywordsSubmitting(true);
      setAbstractKeywordsEditorError(null);
      try {
        const base = (editableDraft ?? paper)!;
        const nextDraft: PaperContentModel = {
          ...base,
          abstract: abstract ?? base.abstract,
          keywords: keywords ?? base.keywords,
        };

        setEditableDraft(nextDraft);
        await handleSaveToServer(nextDraft);

        setIsAbstractKeywordsEditorOpen(false);
        setAbstractKeywordsEditorInitial(null);
        clearCurrentEditing();
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
        setAbstractKeywordsEditorError(message);
        toast.error('摘要和关键词保存失败', { description: message });
      } finally {
        setIsAbstractKeywordsSubmitting(false);
      }
    },
    [editableDraft, paper, handleSaveToServer, clearCurrentEditing],
  );

  // 处理块选择
  const handleBlockSelect = useCallback(
    (blockId: string) => {
      setActiveBlockId(blockId);
      // 更新阅读位置
      if (isPersonalOwner && resolvedUserPaperId && updatePosition) {
        updatePosition(blockId);
      }
      if (isPersonalOwner) {
        setSelectedBlockId((prev: string | null) => (prev === blockId ? null : blockId));
      }
    },
    [isPersonalOwner, resolvedUserPaperId, updatePosition, setActiveBlockId, setSelectedBlockId],
  );

  // 处理关闭笔记
  const handleCloseNotes = useCallback(() => {
    setSelectedBlockId(null);
  }, [setSelectedBlockId]);

  // 处理创建笔记
  const handleCreateNote = useCallback(
    async (blockId: string, content: any[]) => {
      if (!resolvedUserPaperId || !createNote) {
        alert('未找到个人论文标识，无法创建笔记。');
        return;
      }
      await createNote(blockId, content);
    },
    [resolvedUserPaperId, createNote],
  );

  // 处理更新笔记
  const handleUpdateNote = useCallback(
    async (blockId: string, noteId: string, content: any[]) => {
      if (!resolvedUserPaperId || !updateNote) {
        alert('未找到个人论文标识，无法更新笔记。');
        return;
      }
      await updateNote(blockId, noteId, content);
    },
    [resolvedUserPaperId, updateNote],
  );

  // 处理删除笔记
  const handleDeleteNote = useCallback(
    async (blockId: string, noteId: string) => {
      if (!resolvedUserPaperId || !deleteNote) {
        alert('未找到个人论文标识，无法删除笔记。');
        return;
      }
      await deleteNote(blockId, noteId);
    },
    [resolvedUserPaperId, deleteNote],
  );

  // 处理解析文本添加
  const handleParseTextAdd = useCallback(
    async (sectionId: string, text: string, afterBlockId?: string) => {
      if (!handleAddBlocksFromText) {
        return { success: false, error: '添加文本功能不可用' };
      }

      try {
        const id = isPersonalOwner ? resolvedUserPaperId : paperId;

        if (!id) {
          toast.error('无法确定论文标识');
          return { success: false, error: '无法确定论文标识' };
        }

        const result = await handleAddBlocksFromText(sectionId, text, paperId, resolvedUserPaperId, isPersonalOwner, afterBlockId);

        if (result.success) {
          // 现在返回的是 tempBlockId，而不是 addedBlocks
          return { success: true, tempBlockId: result.tempBlockId };
        } else {
          return { success: false, error: result.error };
        }
      } catch (err) {
        let message = err instanceof Error ? err.message : '添加过程中发生未知错误';

        if (err instanceof Error) {
          if (err.message.includes('timeout') || err.message.includes('Timeout')) {
            message = '请求超时，可能是文本内容过多或服务器响应较慢，请稍后重试';
          } else if (err.message.includes('Network') || err.message.includes('fetch')) {
            message = '网络连接错误，请检查网络连接后重试';
          }
        }

        toast.error('添加失败', { description: message });
        return { success: false, error: message };
      }
    },
    [isPersonalOwner, resolvedUserPaperId, paperId, handleAddBlocksFromText],
  );

  // 处理切换可见性
  const handleToggleVisibility = useCallback(async (currentVisibility: boolean) => {
    try {
      const newVisibility = !currentVisibility;
      const result = await adminPaperService.updatePaperVisibility(paperId, {
        isPublic: newVisibility,
      });

      if (result.bizCode === 0) {
        toast.success(
          newVisibility ? '论文已设为公开' : '论文已设为私有',
          {
            description: newVisibility
              ? '所有用户现在可以访问此论文'
              : '论文已从公共库中隐藏',
          }
        );
        if (paper) {
          setEditableDraft((prev: PaperContentModel | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              isPublic: newVisibility,
            };
          });
        }
        setIsPublicVisible(newVisibility);
        setEditorHasUnsavedChanges(false);
      } else {
        toast.error('切换可见性失败', {
          description: result.bizMessage ?? '请稍后重试',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '切换可见性时发生未知错误';
      toast.error('切换可见性出错', {
        description: message,
      });
    }
  }, [paperId, paper, setEditableDraft, setEditorHasUnsavedChanges, setIsPublicVisible]);

  // 处理参考文献添加
  const handleReferencesAdded = useCallback((references: Reference[]) => {
    // 更新本地状态
    setEditableDraft((prev: PaperContentModel | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        references: [...(prev.references || []), ...references],
      };
    });
    setEditorHasUnsavedChanges(true);
  }, [setEditableDraft, setEditorHasUnsavedChanges]);

  // 页面卸载时保存阅读进度
  useEffect(() => {
    return () => {
      if (isPersonalOwner && resolvedUserPaperId && saveImmediately) {
        saveImmediately();
      }
    };
  }, [isPersonalOwner, resolvedUserPaperId, saveImmediately]);

  // 监听块添加成功事件，清除未保存状态
  useEffect(() => {
    const handleBlockAdded = () => {
      setEditorHasUnsavedChanges(false);
    };

    window.addEventListener('blockAddedSuccessfully', handleBlockAdded);
    return () => {
      window.removeEventListener('blockAddedSuccessfully', handleBlockAdded);
    };
  }, [setEditorHasUnsavedChanges]);

  return {
    handleMetadataEditStart,
    handleAbstractKeywordsEditStart,
    findBlockSection,
    handleMetadataUpdate,
    handleSaveToServer,
    handleAttachmentsChange,
    handleMetadataOverlaySubmit,
    handleAbstractKeywordsOverlaySubmit,
    handleBlockSelect,
    handleCloseNotes,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleParseTextAdd,
    handleToggleVisibility,
    handleReferencesAdded,
  };
}