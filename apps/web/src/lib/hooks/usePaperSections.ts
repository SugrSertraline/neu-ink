// hooks/usePaperSections.ts
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { Section, PaperContent as PaperContentModel, BlockContent } from '@/types/paper';
import { createEmptySection, createBlock } from '../utils/paperHelpers';

export function usePaperSections(
  setEditableDraft: React.Dispatch<React.SetStateAction<PaperContentModel | null>>,
  setHasUnsavedChanges: (value: boolean) => void
) {
  const updateSections = useCallback(
  (updater: (sections: Section[]) => { sections: Section[]; touched: boolean }) => {
    let didTouch = false;

    setEditableDraft(prev => {
      if (!prev) return prev;
      const { sections, touched } = updater(prev.sections);
      if (touched) {
        didTouch = true;
        return { ...prev, sections };
      }
      return prev;
    });

    if (didTouch) {
      setHasUnsavedChanges(false);
    }
  },
  [setEditableDraft, setHasUnsavedChanges]
);

  // 轻量级章节操作 - 旧方法保留，但将改为本地操作
  const updateSectionTree = useCallback(
    (sectionId: string, apply: (section: Section) => Section) => {
      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            let nextSection = section;
            if (section.id === sectionId) {
              touched = true;
              nextSection = apply(section);
            }
            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
              }
            }
            return nextSection;
          });

        const next = walk(sections);
        return { sections: touched ? next : sections, touched };
      });
    },
    [updateSections]
  );

  // API调用函数 - 定义在前面
  const handleSectionUpdateWithAPI = useCallback(async (
    sectionId: string,
    updateData: {
      title?: { en: string; zh: string };
      content?: any[];
      subsections?: any[];
    },
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean
  ) => {
    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.updateSection(userPaperId, sectionId, updateData);
        
        if (result.bizCode === 0) {
          return { success: true };
        } else {
          toast.error('更新失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '更新章节失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.updateSection(paperId, sectionId, updateData);
        
        if (result.bizCode === 0) {
          return { success: true };
        } else {
          toast.error('更新失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '更新章节失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新章节时发生未知错误';
      toast.error('更新失败', { description: message });
      return { success: false, error: message };
    }
  }, []);

  // 新增：调用API添加章节的函数
  const handleSectionAddWithAPI = useCallback(async (
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean,
    sectionData: {
      title: { en: string; zh: string };
      content?: any[];
    },
    options?: {
      parentSectionId?: string;
      position?: number;
    }
  ) => {
    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.addSection(userPaperId, sectionData, options);
        
        if (result.bizCode === 0) {
          toast.success('章节添加成功');
          return { success: true };
        } else {
          toast.error('添加失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '添加章节失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.addSection(paperId, sectionData, options);
        
        if (result.bizCode === 0) {
          toast.success('章节添加成功');
          return { success: true };
        } else {
          toast.error('添加失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '添加章节失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '添加章节时发生未知错误';
      toast.error('添加失败', { description: message });
      return { success: false, error: message };
    }
  }, []);

  // 新增：调用API删除章节的函数
  const handleSectionDeleteWithAPI = useCallback(async (
    sectionId: string,
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean
  ) => {
    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.deleteSection(userPaperId, sectionId);
        
        if (result.bizCode === 0) {
          // 本地更新UI - 移除该章节
          updateSections(sections => {
            let touched = false;
            const prune = (nodes: Section[]): Section[] => {
              const nextNodes: Section[] = [];
              nodes.forEach(section => {
                if (section.id === sectionId) {
                  touched = true;
                  return;
                }
                let nextSection = section;
                if (section.subsections?.length) {
                  const nextSubsections = prune(section.subsections);
                  if (nextSubsections !== section.subsections) {
                    nextSection = { ...nextSection, subsections: nextSubsections };
                  }
                }
                nextNodes.push(nextSection);
              });
              return nextNodes;
            };
            const next = prune(sections);
            return { sections: touched ? next : sections, touched };
          });
          
          toast.success('章节删除成功');
          return { success: true };
        } else {
          toast.error('删除失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '删除章节失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.deleteSection(paperId, sectionId);
        
        if (result.bizCode === 0) {
          // 本地更新UI - 移除该章节
          updateSections(sections => {
            let touched = false;
            const prune = (nodes: Section[]): Section[] => {
              const nextNodes: Section[] = [];
              nodes.forEach(section => {
                if (section.id === sectionId) {
                  touched = true;
                  return;
                }
                let nextSection = section;
                if (section.subsections?.length) {
                  const nextSubsections = prune(section.subsections);
                  if (nextSubsections !== section.subsections) {
                    nextSection = { ...nextSection, subsections: nextSubsections };
                  }
                }
                nextNodes.push(nextSection);
              });
              return nextNodes;
            };
            const next = prune(sections);
            return { sections: touched ? next : sections, touched };
          });
          
          toast.success('章节删除成功');
          return { success: true };
        } else {
          toast.error('删除失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '删除章节失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除章节时发生未知错误';
      toast.error('删除失败', { description: message });
      return { success: false, error: message };
    }
  }, [updateSections]);

  const handleSectionTitleUpdate = useCallback(async (
    sectionId: string,
    nextTitle: Section['title'],
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean,
    onSaveToServer?: () => Promise<void>
  ) => {
    try {
      // 先本地更新UI
      updateSectionTree(sectionId, section => ({
        ...section,
        title: { ...section.title, ...nextTitle },
      }));
      
      // 然后调用API保存
      const updateData = {
        title: {
          en: nextTitle.en || '',
          zh: nextTitle.zh || ''
        }
      };
      
      const result = await handleSectionUpdateWithAPI(
        sectionId,
        updateData,
        paperId,
        userPaperId,
        isPersonalOwner
      );
      
      // 不再调用 handleSaveToServer，因为 handleSectionUpdateWithAPI 已经更新了数据库
      if (!result.success) {
        console.error('Failed to update section title:', result.error);
      }
    } catch (error) {
      console.error('Failed to update section title:', error);
    }
  }, [updateSectionTree, handleSectionUpdateWithAPI]);

  // 保留原有函数，但标记为已弃用
  const handleSectionAddSubsection = useCallback(
    (sectionId: string) => {
      updateSectionTree(sectionId, section => ({
        ...section,
        subsections: [...(section.subsections ?? []), createEmptySection()],
      }));
    },
    [updateSectionTree]
  );

  const handleSectionInsert = useCallback(
    async (
      targetSectionId: string | null,
      position: 'above' | 'below',
      parentSectionId: string | null,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      const newSection = createEmptySection();
      
      // 本地更新UI
      updateSections(sections => {
        let touched = false;
        let inserted = false;

        const insertIntoList = (list: Section[]): Section[] => {
          if (inserted) return list;
          const nextList = [...list];
          if (targetSectionId) {
            const targetIdx = nextList.findIndex(section => section.id === targetSectionId);
            if (targetIdx !== -1) {
              const insertIdx = position === 'above' ? targetIdx : targetIdx + 1;
              nextList.splice(insertIdx, 0, newSection);
              touched = true;
              inserted = true;
              return nextList;
            }
          }
          nextList.push(newSection);
          touched = true;
          inserted = true;
          return nextList;
        };

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            if (inserted) return section;
            if (section.id === parentSectionId) {
              const current = section.subsections ?? [];
              const nextSubsections = insertIntoList(current);
              if (nextSubsections !== current) {
                return { ...section, subsections: nextSubsections };
              }
              return section;
            }
            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                return { ...section, subsections: nextSubsections };
              }
            }
            return section;
          });

        let nextSections = sections;
        if (parentSectionId === null) {
          nextSections = insertIntoList(sections);
        } else {
          nextSections = walk(sections);
        }

        if (!inserted) {
          nextSections = insertIntoList(nextSections);
        }

        return { sections: touched ? nextSections : sections, touched };
      });

      // 调用API
      const sectionData = {
        title: {
          en: newSection.title.en || '',
          zh: newSection.title.zh || ''
        },
        content: newSection.content || []
      };

      const result = await handleSectionAddWithAPI(
        paperId,
        userPaperId,
        isPersonalOwner,
        sectionData,
        {
          parentSectionId: parentSectionId || undefined,
          position: position === 'above' ? 0 : -1
        }
      );

      // 不再调用 handleSaveToServer，因为 handleSectionAddWithAPI 已经更新了数据库
      // 如果 API 调用失败，可以考虑回滚本地更新
      if (!result.success) {
        // 这里可以添加回滚逻辑，但暂时先让用户知道添加失败
        console.error('Failed to add section:', result.error);
      }
    },
    [updateSections, handleSectionAddWithAPI]
  );

  const handleSectionMove = useCallback(
    (sectionId: string, direction: 'up' | 'down', parentSectionId: string | null) => {
      // 目前只是本地操作，后续可以扩展为API调用
      updateSections(sections => {
        let touched = false;
        let moved = false;

        const reorder = (list: Section[]): Section[] => {
          const idx = list.findIndex(section => section.id === sectionId);
          if (idx === -1) return list;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= list.length) return list;
          const nextList = [...list];
          const [item] = nextList.splice(idx, 1);
          nextList.splice(targetIdx, 0, item);
          touched = true;
          moved = true;
          return nextList;
        };

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            if (moved) return section;
            if (section.id === parentSectionId) {
              const current = section.subsections ?? [];
              const nextSubsections = reorder(current);
              if (nextSubsections !== current) {
                return { ...section, subsections: nextSubsections };
              }
              return section;
            }
            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                return { ...section, subsections: nextSubsections };
              }
            }
            return section;
          });

        let nextSections = sections;
        if (parentSectionId === null) {
          nextSections = reorder(sections);
        } else {
          nextSections = walk(sections);
          if (!moved) {
            const fallback = reorder(sections);
            if (moved) {
              nextSections = fallback;
            }
          }
        }

        return { sections: touched ? nextSections : sections, touched };
      });
    },
    [updateSections]
  );

  const handleSectionDelete = useCallback(
    async (
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      const result = await handleSectionDeleteWithAPI(
        sectionId,
        paperId,
        userPaperId,
        isPersonalOwner
      );

      // 不再调用 handleSaveToServer，因为 handleSectionDeleteWithAPI 已经更新了数据库
      // 如果 API 调用失败，可以考虑回滚本地更新
      if (!result.success) {
        console.error('Failed to delete section:', result.error);
      }
    },
    [handleSectionDeleteWithAPI]
  );

  const handleSectionAddBlock = useCallback(
    (sectionId: string, blockType: BlockContent['type'], lang: 'en' | 'both') => {
      updateSectionTree(sectionId, section => {
        const newBlock = createBlock(blockType, lang);
        return {
          ...section,
          content: [...(section.content ?? []), newBlock],
        };
      });
    },
    [updateSectionTree]
  );

  return {
    updateSections,
    updateSectionTree,
    handleSectionTitleUpdate,
    handleSectionAddSubsection,
    handleSectionInsert,
    handleSectionMove,
    handleSectionDelete,
    handleSectionAddBlock,
    // 新增的API调用函数
    handleSectionAddWithAPI,
    handleSectionDeleteWithAPI,
    handleSectionUpdateWithAPI,
  };
}
