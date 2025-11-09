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
      setHasUnsavedChanges(true);
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
      // 显示加载状态
      toast.loading('正在更新章节标题...', { id: 'update-section-title' });
      
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
        toast.error('更新章节标题失败', {
          id: 'update-section-title',
          description: result.error
        });
      } else {
        toast.success('章节标题更新成功', { id: 'update-section-title' });
      }
    } catch (error) {
      toast.error('更新章节标题失败', {
        id: 'update-section-title',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  }, [updateSectionTree, handleSectionUpdateWithAPI]);

  // 修改为支持API调用的版本
  const handleSectionAddSubsection = useCallback(
    async (
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      const newSection = createEmptySection();
      
      // 显示加载状态
      toast.loading('正在添加子章节...', { id: 'add-subsection' });
      
      // 先本地更新UI
      updateSectionTree(sectionId, section => ({
        ...section,
        subsections: [...(section.subsections ?? []), newSection],
      }));
      
      // 调用API保存
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
          parentSectionId: sectionId,
          position: -1 // 添加到末尾
        }
      );

      // 如果API调用失败，可以考虑回滚本地更新
      if (!result.success) {
        toast.error('添加子章节失败', {
          id: 'add-subsection',
          description: result.error
        });
        // 回滚本地更新
        updateSectionTree(sectionId, section => ({
          ...section,
          subsections: (section.subsections ?? []).filter(sub => sub.id !== newSection.id)
        }));
      } else {
        toast.success('子章节添加成功', { id: 'add-subsection' });
      }
    },
    [updateSectionTree, handleSectionAddWithAPI]
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
      
      // 显示加载状态
      toast.loading('正在添加章节...', { id: 'add-section' });
      
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
        toast.error('添加章节失败', {
          id: 'add-section',
          description: result.error
        });
      } else {
        toast.success('章节添加成功', { id: 'add-section' });
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
      // 显示加载状态
      toast.loading('正在删除章节...', { id: 'delete-section' });
      
      const result = await handleSectionDeleteWithAPI(
        sectionId,
        paperId,
        userPaperId,
        isPersonalOwner
      );

      // 不再调用 handleSaveToServer，因为 handleSectionDeleteWithAPI 已经更新了数据库
      // 如果 API 调用失败，可以考虑回滚本地更新
      if (!result.success) {
        toast.error('删除章节失败', {
          id: 'delete-section',
          description: result.error
        });
      } else {
        toast.success('章节删除成功', { id: 'delete-section' });
      }
    },
    [handleSectionDeleteWithAPI]
  );

  const handleSectionAddBlock = useCallback(
    async (
      sectionId: string,
      blockType: BlockContent['type'],
      lang: 'en' | 'both',
      paperId?: string,
      userPaperId?: string | null,
      isPersonalOwner?: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      let newBlockId: string | null = null;
      
      // 先本地更新UI
      updateSectionTree(sectionId, section => {
        const newBlock = createBlock(blockType, lang);
        newBlockId = newBlock.id;
        return {
          ...section,
          content: [...(section.content ?? []), newBlock],
        };
      });
      
      // 然后调用API保存
      if (newBlockId && paperId && userPaperId !== undefined && isPersonalOwner !== undefined) {
        try {
          if (isPersonalOwner && userPaperId) {
            // 个人论文
            const { userPaperService } = await import('@/lib/services/paper');
            const newBlock = createBlock(blockType, lang);
            
            // 构建blockData，确保所有必要字段都存在
            const blockData: any = {
              type: newBlock.type,
            };
            
            if ('content' in newBlock && newBlock.content !== undefined) {
              blockData.content = newBlock.content;
            }
            
            if ('metadata' in newBlock && newBlock.metadata !== undefined) {
              blockData.metadata = newBlock.metadata;
            }
            
            if ('latex' in newBlock && newBlock.latex !== undefined) {
              blockData.latex = newBlock.latex;
            }
            
            if ('code' in newBlock && newBlock.code !== undefined) {
              blockData.code = newBlock.code;
              if ('language' in newBlock && newBlock.language !== undefined) {
                blockData.language = newBlock.language;
              }
            }
            
            if ('url' in newBlock && newBlock.url !== undefined) {
              blockData.url = newBlock.url;
              if ('alt' in newBlock && newBlock.alt !== undefined) {
                blockData.alt = newBlock.alt;
              }
            }
            
            if ('headers' in newBlock && newBlock.headers !== undefined) {
              blockData.headers = newBlock.headers;
            }
            
            if ('rows' in newBlock && newBlock.rows !== undefined) {
              blockData.rows = newBlock.rows;
            }
            
            if ('items' in newBlock && newBlock.items !== undefined) {
              blockData.items = newBlock.items;
            }
            
            if ('author' in newBlock && newBlock.author !== undefined) {
              blockData.author = newBlock.author;
            }
            
            if ('level' in newBlock && newBlock.level !== undefined) {
              blockData.level = newBlock.level;
            }
            
            if ('align' in newBlock && newBlock.align !== undefined) {
              blockData.align = newBlock.align;
            }
            
            if ('number' in newBlock && newBlock.number !== undefined) {
              blockData.number = newBlock.number;
            }
            
            if ('start' in newBlock && newBlock.start !== undefined) {
              blockData.start = newBlock.start;
            }
            
            if ('caption' in newBlock && newBlock.caption !== undefined) {
              blockData.caption = newBlock.caption;
            }
            
            if ('description' in newBlock && newBlock.description !== undefined) {
              blockData.description = newBlock.description;
            }
            
            if ('src' in newBlock && newBlock.src !== undefined) {
              blockData.src = newBlock.src;
            }
            
            if ('width' in newBlock && newBlock.width !== undefined) {
              blockData.width = newBlock.width;
            }
            
            if ('height' in newBlock && newBlock.height !== undefined) {
              blockData.height = newBlock.height;
            }
            
            if ('showLineNumbers' in newBlock && newBlock.showLineNumbers !== undefined) {
              blockData.showLineNumbers = newBlock.showLineNumbers;
            }
            
            const result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
            
            if (result.bizCode === 0) {
              toast.success('段落添加成功');
              setHasUnsavedChanges(false);
            } else {
              const errorMsg = result.bizMessage || '服务器错误';
              toast.error('添加失败', { description: errorMsg });
              // 如果API调用失败，回滚本地更新
              updateSectionTree(sectionId, section => ({
                ...section,
                content: (section.content ?? []).filter(block => block.id !== newBlockId)
              }));
            }
          } else {
            // 管理员论文
            const { adminPaperService } = await import('@/lib/services/paper');
            const newBlock = createBlock(blockType, lang);
            
            // 构建blockData，确保所有必要字段都存在
            const blockData: any = {
              type: newBlock.type,
            };
            
            if ('content' in newBlock && newBlock.content !== undefined) {
              blockData.content = newBlock.content;
            }
            
            if ('metadata' in newBlock && newBlock.metadata !== undefined) {
              blockData.metadata = newBlock.metadata;
            }
            
            if ('latex' in newBlock && newBlock.latex !== undefined) {
              blockData.latex = newBlock.latex;
            }
            
            if ('code' in newBlock && newBlock.code !== undefined) {
              blockData.code = newBlock.code;
              if ('language' in newBlock && newBlock.language !== undefined) {
                blockData.language = newBlock.language;
              }
            }
            
            if ('url' in newBlock && newBlock.url !== undefined) {
              blockData.url = newBlock.url;
              if ('alt' in newBlock && newBlock.alt !== undefined) {
                blockData.alt = newBlock.alt;
              }
            }
            
            if ('headers' in newBlock && newBlock.headers !== undefined) {
              blockData.headers = newBlock.headers;
            }
            
            if ('rows' in newBlock && newBlock.rows !== undefined) {
              blockData.rows = newBlock.rows;
            }
            
            if ('items' in newBlock && newBlock.items !== undefined) {
              blockData.items = newBlock.items;
            }
            
            if ('author' in newBlock && newBlock.author !== undefined) {
              blockData.author = newBlock.author;
            }
            
            if ('level' in newBlock && newBlock.level !== undefined) {
              blockData.level = newBlock.level;
            }
            
            if ('align' in newBlock && newBlock.align !== undefined) {
              blockData.align = newBlock.align;
            }
            
            if ('number' in newBlock && newBlock.number !== undefined) {
              blockData.number = newBlock.number;
            }
            
            if ('start' in newBlock && newBlock.start !== undefined) {
              blockData.start = newBlock.start;
            }
            
            if ('caption' in newBlock && newBlock.caption !== undefined) {
              blockData.caption = newBlock.caption;
            }
            
            if ('description' in newBlock && newBlock.description !== undefined) {
              blockData.description = newBlock.description;
            }
            
            if ('src' in newBlock && newBlock.src !== undefined) {
              blockData.src = newBlock.src;
            }
            
            if ('width' in newBlock && newBlock.width !== undefined) {
              blockData.width = newBlock.width;
            }
            
            if ('height' in newBlock && newBlock.height !== undefined) {
              blockData.height = newBlock.height;
            }
            
            if ('showLineNumbers' in newBlock && newBlock.showLineNumbers !== undefined) {
              blockData.showLineNumbers = newBlock.showLineNumbers;
            }
            
            const result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
            
            if (result.bizCode === 0) {
              toast.success('段落添加成功');
              setHasUnsavedChanges(false);
            } else {
              const errorMsg = result.bizMessage || '服务器错误';
              toast.error('添加失败', { description: errorMsg });
              // 如果API调用失败，回滚本地更新
              updateSectionTree(sectionId, section => ({
                ...section,
                content: (section.content ?? []).filter(block => block.id !== newBlockId)
              }));
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : '添加段落时发生未知错误';
          toast.error('添加失败', { description: message });
          // 如果API调用失败，回滚本地更新
          if (newBlockId) {
            updateSectionTree(sectionId, section => ({
              ...section,
              content: (section.content ?? []).filter(block => block.id !== newBlockId)
            }));
          }
        }
      }
    },
    [updateSectionTree]
  );

  // 新增：通过文本添加blocks到section的函数
  const handleAddBlocksFromText = useCallback(async (
    sectionId: string,
    text: string,
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean,
    afterBlockId?: string
  ) => {
    // 先添加一个"正在解析"的占位block
    const placeholderId = `parsing_${Date.now()}`;
    const placeholderBlock = {
      id: placeholderId,
      type: 'paragraph' as const,
      content: {
        en: [{ type: 'text' as const, content: '正在解析文本，请稍候...' }],
        zh: [{ type: 'text' as const, content: '正在解析文本，请稍候...' }]
      }
    };

    // 立即更新本地状态，添加占位block
    updateSectionTree(sectionId, section => {
      const currentBlocks = section.content || [];
      let insertIndex = currentBlocks.length; // 默认在末尾
     
      if (afterBlockId) {
        for (let i = 0; i < currentBlocks.length; i++) {
          if (currentBlocks[i].id === afterBlockId) {
            insertIndex = i + 1;
            break;
          }
        }
      }
     
      const newBlocks = [...currentBlocks];
      newBlocks.splice(insertIndex, 0, placeholderBlock);
     
      return {
        ...section,
        content: newBlocks
      };
    });

    // 显示加载状态
    toast.loading('正在解析文本内容...', { id: 'parse-text' });

    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.addBlockFromTextToSection(userPaperId, sectionId, {
          text,
          afterBlockId
        });
        
        if (result.bizCode === 0) {
          // 移除占位block，添加返回的blocks
          updateSectionTree(sectionId, section => {
            const currentBlocks = section.content || [];
            let insertIndex = currentBlocks.length; // 默认在末尾
           
            if (afterBlockId) {
              for (let i = 0; i < currentBlocks.length; i++) {
                if (currentBlocks[i].id === afterBlockId) {
                  insertIndex = i + 1;
                  break;
                }
              }
            }
           
            // 移除占位block
            const filteredBlocks = currentBlocks.filter(block => block.id !== placeholderId);
            
            // 添加解析后的blocks
            const newBlocks = [...filteredBlocks];
            newBlocks.splice(insertIndex, 0, ...result.data.addedBlocks);
           
            return {
              ...section,
              content: newBlocks
            };
          });
          
          toast.success(`成功解析并添加了${result.data.addedBlocks.length}个段落`, { id: 'parse-text' });
          return { success: true, addedBlocks: result.data.addedBlocks };
        } else {
          // 移除占位block
          updateSectionTree(sectionId, section => ({
            ...section,
            content: (section.content || []).filter(block => block.id !== placeholderId)
          }));
          
          toast.error('文本解析失败', {
            id: 'parse-text',
            description: result.bizMessage || '服务器错误'
          });
          return { success: false, error: result.bizMessage || '添加段落失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.addBlockFromTextToSection(paperId, sectionId, {
          text,
          afterBlockId
        });
        
        if (result.bizCode === 0) {
          // 移除占位block，添加返回的blocks
          updateSectionTree(sectionId, section => {
            const currentBlocks = section.content || [];
            let insertIndex = currentBlocks.length; // 默认在末尾
           
            if (afterBlockId) {
              for (let i = 0; i < currentBlocks.length; i++) {
                if (currentBlocks[i].id === afterBlockId) {
                  insertIndex = i + 1;
                  break;
                }
              }
            }
           
            // 移除占位block
            const filteredBlocks = currentBlocks.filter(block => block.id !== placeholderId);
            
            // 添加解析后的blocks
            const newBlocks = [...filteredBlocks];
            newBlocks.splice(insertIndex, 0, ...result.data.addedBlocks);
           
            return {
              ...section,
              content: newBlocks
            };
          });
          
          toast.success(`成功解析并添加了${result.data.addedBlocks.length}个段落`, { id: 'parse-text' });
          return { success: true, addedBlocks: result.data.addedBlocks };
        } else {
          // 移除占位block
          updateSectionTree(sectionId, section => ({
            ...section,
            content: (section.content || []).filter(block => block.id !== placeholderId)
          }));
          
          toast.error('文本解析失败', {
            id: 'parse-text',
            description: result.bizMessage || '服务器错误'
          });
          return { success: false, error: result.bizMessage || '添加段落失败' };
        }
      }
    } catch (error) {
      // 移除占位block
      updateSectionTree(sectionId, section => ({
        ...section,
        content: (section.content || []).filter(block => block.id !== placeholderId)
      }));
      
      const message = error instanceof Error ? error.message : '添加段落时发生未知错误';
      toast.error('文本解析失败', {
        id: 'parse-text',
        description: message
      });
      return { success: false, error: message };
    }
  }, [updateSectionTree]);

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
    handleAddBlocksFromText,
  };
}
