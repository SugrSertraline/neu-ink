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
      if (!prev) {
        console.log('[usePaperSections.updateSections] prev is null, skip');
        return prev;
      }

      console.log('[usePaperSections.updateSections] before', {
        prevSectionsLength: prev.sections.length,
        prevSectionsIds: prev.sections.map(s => s.id),
      });

      const { sections, touched } = updater(prev.sections);

      console.log('[usePaperSections.updateSections] after updater', {
        nextSectionsLength: sections.length,
        nextSectionsIds: sections.map(s => s.id),
        touched,
      });

      if (touched) {
        didTouch = true;
        return { ...prev, sections };
      }
      return prev;
    });

    if (didTouch) {
      console.log('[usePaperSections.updateSections] setHasUnsavedChanges(true)');
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
    },
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean
  ) => {
    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/papers');
        const result = await userPaperService.updateSection(userPaperId, sectionId, updateData);
        
        if (result.bizCode === 0) {
          toast.success('章节更新成功');
          return { success: true, data: result.data };
        } else {
          toast.error('更新失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '更新章节失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/papers');
        const result = await adminPaperService.updateSection(paperId, sectionId, updateData);
        
        if (result.bizCode === 0) {
          toast.success('章节更新成功');
          return { success: true, data: result.data };
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
      id?: string; // 添加可选的ID字段，用于前端生成的临时ID
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
        const { userPaperService } = await import('@/lib/services/papers');
        const result = await userPaperService.addSection(userPaperId, sectionData, options);
        
        if (result.bizCode === 0) {
          toast.success('章节添加成功');
          return { success: true, data: result.data };
        } else {
          toast.error('添加失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '添加章节失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/papers');
        const result = await adminPaperService.addSection(paperId, sectionData, options);
        
        if (result.bizCode === 0) {
          toast.success('章节添加成功');
          return { success: true, data: result.data };
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
      console.log('【API步骤1】handleSectionDeleteWithAPI 开始:', { sectionId, paperId, userPaperId, isPersonalOwner });
      
      if (isPersonalOwner && userPaperId) {
        console.log('【API步骤2】使用用户论文服务删除章节');
        console.log('【API步骤2.1】准备导入 userPaperService');
        const { userPaperService } = await import('@/lib/services/papers');
        console.log('【API步骤2.2】userPaperService 导入成功:', typeof userPaperService);
        console.log('【API步骤2.3】即将调用 userPaperService.deleteSection:', userPaperId, sectionId);
        console.log('【API步骤2.4】userPaperService.deleteSection 方法:', typeof userPaperService.deleteSection);
        
        const result = await userPaperService.deleteSection(userPaperId, sectionId);
        
        console.log('【API步骤3】用户论文服务删除章节结果:', result);
        
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
                nextNodes.push(nextSection);
              });
              return nextNodes;
            };
            const next = prune(sections);
            console.log('本地更新UI，删除章节后:', next);
            return { sections: touched ? next : sections, touched };
          });
          
          toast.success('章节删除成功');
          return { success: true, data: result.data };
        } else {
          console.error('用户论文服务删除章节失败:', result.bizMessage);
          toast.error('删除失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '删除章节失败' };
        }
      } else {
        console.log('使用管理员论文服务删除章节');
        const { adminPaperService } = await import('@/lib/services/papers');
        const result = await adminPaperService.deleteSection(paperId, sectionId);
        
        console.log('管理员论文服务删除章节结果:', result);
        
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
                nextNodes.push(nextSection);
              });
              return nextNodes;
            };
            const next = prune(sections);
            console.log('本地更新UI，删除章节后:', next);
            return { sections: touched ? next : sections, touched };
          });
          
          toast.success('章节删除成功');
          return { success: true, data: result.data };
        } else {
          console.error('管理员论文服务删除章节失败:', result.bizMessage);
          toast.error('删除失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '删除章节失败' };
        }
      }
    } catch (error) {
      console.error('handleSectionDeleteWithAPI 异常:', error);
      const message = error instanceof Error ? error.message : '删除章节时发生未知错误';
      toast.error('删除失败', { description: message });
      return { success: false, error: message };
    }
  }, [updateSections]);

  const handleSectionTitleUpdate = useCallback(async (
    sectionId: string,
    nextTitle: { en: string; zh: string },
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean,
    onSaveToServer?: () => Promise<void>
  ) => {
    // 先获取原始标题，以便在失败时回滚
    let originalTitle: { en: string; zh: string } = { en: '', zh: '' };
    
    updateSections(sections => {
      const section = sections.find(s => s.id === sectionId);
      if (section) {
        originalTitle = {
          en: section.title || '',
          zh: section.titleZh || ''
        };
      }
      return { sections, touched: false };
    });
    
    try {
      // 显示加载状态
      toast.loading('正在更新章节标题...', { id: 'update-section-title' });
      
      // 先本地更新UI
      updateSectionTree(sectionId, section => ({
        ...section,
        title: nextTitle.en || '',
        titleZh: nextTitle.zh || '',
      }));
      
      // 然后调用API保存
      const updateData = {
        title: nextTitle
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
        // API失败，回滚本地更改
        updateSectionTree(sectionId, section => ({
          ...section,
          title: originalTitle.en,
          titleZh: originalTitle.zh,
        }));
        
        toast.error('更新章节标题失败', {
          id: 'update-section-title',
          description: result.error
        });
      } else {
        // 移除成功提示，因为 handleSectionUpdateWithAPI 已经显示了
        toast.dismiss('update-section-title');
        
        // 如果API返回了更新后的section数据，可以在这里处理
        if (result.data && result.data.updatedSection) {
          // 可以在这里更新本地状态，但通常不需要，因为我们已经更新了UI
        }
      }
    } catch (error) {
      // 异常情况，回滚本地更改
      updateSectionTree(sectionId, section => ({
        ...section,
        title: originalTitle.en,
        titleZh: originalTitle.zh,
      }));
      
      toast.error('更新章节标题失败', {
        id: 'update-section-title',
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  }, [updateSectionTree, handleSectionUpdateWithAPI, updateSections]);


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
      
      // 计算正确的插入位置
      let calculatedPosition = -1; // 默认插入到末尾
      
      if (targetSectionId) {
        // 获取当前sections来计算位置
        let currentSections: Section[] = [];
        updateSections(sections => {
          currentSections = sections;
          return { sections, touched: false };
        });
        
        const targetIdx = currentSections.findIndex(section => section.id === targetSectionId);
        if (targetIdx !== -1) {
          if (position === 'above') {
            // 在目标章节上方插入，位置就是目标章节的索引
            calculatedPosition = targetIdx;
          } else {
            // 在目标章节下方插入，位置是目标章节索引+1
            calculatedPosition = targetIdx + 1;
          }
        }
      }
      
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
              // 由于已移除subsection功能，不再在section.content中插入新章节
              return section;
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
        id: newSection.id, // 发送前端生成的临时ID
        title: {
          en: newSection.title || '',
          zh: newSection.titleZh || ''
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
          position: calculatedPosition
        }
      );

      // 不再调用 handleSaveToServer，因为 handleSectionAddWithAPI 已经更新了数据库
      // 如果 API 调用失败，回滚本地更新
      if (!result.success) {
        // 回滚：移除刚才添加的临时section
        updateSections(sections => {
          const filteredSections = sections.filter(section => section.id !== newSection.id);
          return { sections: filteredSections, touched: true };
        });
        
        toast.error('添加章节失败', {
          id: 'add-section',
          description: result.error
        });
      } else {
        // API成功，更新临时section的ID
        const resultData = result.data as any;
        if (resultData && resultData.addedSectionId) {
          const addedSectionId = resultData.addedSectionId;
          
          // 找到最新添加的临时section并更新其ID
          updateSections(sections => {
            let touched = false;
           
            // 找到需要更新的section（通过临时ID匹配）
            const updatedSections = sections.map(section => {
              if (section.id === newSection.id) {
                touched = true;
                return {
                  ...section,
                  id: addedSectionId
                };
              }
              return section;
            });
           
            return { sections: touched ? updatedSections : sections, touched };
          });
        }
        toast.success('章节添加成功', { id: 'add-section' });
      }
    },
    [updateSections, handleSectionAddWithAPI, setEditableDraft]
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
              // 由于已移除subsection功能，不再在section.content中重新排序
              return section;
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
      try {
        console.log('【Hook步骤1】handleSectionDelete 被调用:', { sectionId, paperId, userPaperId, isPersonalOwner });
        
        // 显示加载状态
        toast.loading('正在删除章节...', { id: 'delete-section' });
        console.log('【Hook步骤2】准备调用 handleSectionDeleteWithAPI');
        
        const result = await handleSectionDeleteWithAPI(
          sectionId,
          paperId,
          userPaperId,
          isPersonalOwner
        );

        console.log('【Hook步骤3】handleSectionDeleteWithAPI 返回结果:', result);

        // 不再调用 handleSaveToServer，因为 handleSectionDeleteWithAPI 已经更新了数据库
        // 如果 API 调用失败，可以考虑回滚本地更新
        if (!result.success) {
          console.error('【Hook步骤4】删除章节失败:', result.error);
          toast.error('删除章节失败', {
            id: 'delete-section',
            description: result.error
          });
        } else {
          console.log('【Hook步骤5】删除章节成功');
          // 如果后端返回了更新后的论文数据，可以使用它来更新本地状态
          if (result.data && result.data.paper) {
            // 这里可以根据需要使用后端返回的数据来更新本地状态
            console.log('【Hook步骤5.1】删除章节成功，后端返回的论文数据:', result.data.paper);
            
            // 可以选择性地使用后端返回的数据来更新本地状态
            // 例如：如果本地状态与后端状态不同步，可以使用后端数据
            // 但目前我们已经在 handleSectionDeleteWithAPI 中更新了本地状态
          }
          toast.success('章节删除成功', { id: 'delete-section' });
        }
      } catch (error) {
        console.error('【Hook步骤6】handleSectionDelete 异常:', error);
        toast.error('删除章节失败', {
          id: 'delete-section',
          description: error instanceof Error ? error.message : '未知错误'
        });
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
            const { userPaperService } = await import('@/lib/services/papers');
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
              
              // 如果返回了blockId，更新本地状态中的临时ID
              const blockId = result.data?.blockId || result.data?.addedBlock?.id;
              if (blockId && newBlockId) {
                updateSectionTree(sectionId, section => {
                  const nextContent = (section.content ?? []).map(block =>
                    block.id === newBlockId ? { ...block, id: blockId } : block
                  );
                  return { ...section, content: nextContent };
                });
              }
              
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
            const { adminPaperService } = await import('@/lib/services/papers');
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
              
              // 如果返回了blockId，更新本地状态中的临时ID
              const blockId = result.data?.blockId || result.data?.addedBlock?.id;
              if (blockId && newBlockId) {
                updateSectionTree(sectionId, section => {
                  const nextContent = (section.content ?? []).map(block =>
                    block.id === newBlockId ? { ...block, id: blockId } : block
                  );
                  return { ...section, content: nextContent };
                });
              }
              
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
    let tempBlockId: string | null = null;
    
    try {
      // 调用API创建加载块并开始异步解析
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/papers');
        const result = await userPaperService.addBlockFromTextToSection(userPaperId, sectionId, {
          text,
          afterBlockId
        });
        
        if (result.bizCode === 0 && result.data) {
          // 后端返回 tempBlockId
          tempBlockId = result.data.tempBlockId ?? null;
          
          // 立即在本地状态中添加loading block，这样用户可以立即看到
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
           
            // 创建parsing block
            const parsingBlock: BlockContent = {
              id: tempBlockId!,
              type: 'parsing',
              stage: 'structuring',
              message: '正在准备解析文本...',
              createdAt: new Date().toISOString()
            };
           
            // 插入parsing block
            const newBlocks = [...currentBlocks];
            newBlocks.splice(insertIndex, 0, parsingBlock);
           
            return {
              ...section,
              content: newBlocks
            };
          });
          
          // 显示加载状态
          toast.loading('正在解析文本内容...', { id: 'parse-text' });
          
          // 开始轮询检查解析状态，使用指数退避策略
          let pollInterval = 8000; // 初始8秒
          const maxPollInterval = 30000; // 最大30秒
          let pollCount = 0;
          
          // 防抖处理：确保只有最后一个完成请求被处理
          let completionTimeoutId: NodeJS.Timeout | null = null;
          let isCompleted = false;
          
          const checkStatus = async () => {
            // 只在页面可见时检查状态
            if (document.hidden) {
              setTimeout(checkStatus, pollInterval);
              return;
            }
           
            // 确保 tempBlockId 不为 null
            if (!tempBlockId) {
              return;
            }
           
            try {
              const statusResult = await userPaperService.checkBlockParsingStatus(
                userPaperId,
                sectionId,
                tempBlockId
              );
              
              if (statusResult.bizCode === 0) {
                const { status, addedBlocks, error, progress, message } = statusResult.data;
                
                // 更新parsing block的状态和进度
                if (status === 'processing' || status === 'pending') {
                  updateSectionTree(sectionId, section => {
                    const currentBlocks = section.content || [];
                    const updatedBlocks = currentBlocks.map(block => {
                      if (block.id === tempBlockId && block.type === 'parsing') {
                        return {
                          ...block,
                          stage: status === 'processing' ? 'structuring' : 'structuring',
                          message: message || (status === 'processing' ? '正在解析文本...' : '等待中...')
                        } as BlockContent;
                      }
                      return block;
                    });
                   
                    return {
                      ...section,
                      content: updatedBlocks
                    };
                  });
                } else if (status === 'completed') {
                  // 防抖处理：清除之前的完成处理定时器
                  if (completionTimeoutId) {
                    clearTimeout(completionTimeoutId);
                  }
                  
                  // 如果已经标记为完成，则忽略后续的完成请求
                  if (isCompleted) {
                    return;
                  }
                  
                  // 设置延迟处理完成状态，确保只处理最后一个
                  completionTimeoutId = setTimeout(() => {
                    isCompleted = true;
                    
                    // 解析完成，更新 parsing block 为待确认状态
                    updateSectionTree(sectionId, section => {
                      const currentBlocks = section.content || [];
                      const updatedBlocks = currentBlocks.map(block => {
                        if (block.id === tempBlockId && block.type === 'parsing') {
                          return {
                            ...block,
                            stage: 'pending_confirmation',
                            message: '解析完成，请确认',
                            parsedBlocks: addedBlocks || [],
                            sessionId: tempBlockId
                          } as BlockContent;
                        }
                        return block;
                      });
                     
                      return {
                        ...section,
                        content: updatedBlocks
                      };
                    });
                   
                    toast.success('解析完成，请确认解析结果', { id: 'parse-text' });
                  }, 300); // 300ms延迟，确保这是最后一个完成请求
                  
                  // 解析完成，清除轮询
                  return;
                } else if (status === 'failed') {
                  // 更新loading block为失败状态
                  updateSectionTree(sectionId, section => {
                    const currentBlocks = section.content || [];
                    const updatedBlocks = currentBlocks.map(block => {
                      if (block.id === tempBlockId && block.type === 'parsing') {
                        return {
                          ...block,
                          stage: 'failed',
                          message: error || '解析失败'
                        } as BlockContent;
                      }
                      return block;
                    });
                    
                    return {
                      ...section,
                      content: updatedBlocks
                    };
                  });
                   
                  toast.error('文本解析失败', {
                    id: 'parse-text',
                    description: error || '服务器错误'
                  });
                  // 解析失败，清除轮询
                  return;
                }
                // 如果状态是 'parsing'，继续轮询
              }
            } catch (error) {
              // 不清除轮询，继续尝试
            }
           
            // 增加轮询间隔（指数退避）
            pollCount++;
            if (pollCount > 3) { // 前3次保持8秒间隔
              pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
            }
           
            // 继续下一次轮询
            setTimeout(checkStatus, pollInterval);
          };
          
          // 开始轮询
          setTimeout(checkStatus, pollInterval);
          
          return { success: true, tempBlockId };
        } else {
          toast.error('创建解析任务失败', {
            id: 'parse-text',
            description: result.bizMessage || '服务器错误'
          });
          return { success: false, error: result.bizMessage || '创建解析任务失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/papers');
        const result = await adminPaperService.addBlockFromTextToSection(paperId, sectionId, {
          text,
          afterBlockId
        });
        
        if (result.bizCode === 0 && result.data) {
          // 后端返回 tempBlockId
          tempBlockId = result.data.tempBlockId ?? null;
          
          // 立即在本地状态中添加parsing block，这样用户可以立即看到
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
           
            // 创建parsing block
            const parsingBlock: BlockContent = {
              id: tempBlockId!,
              type: 'parsing',
              stage: 'structuring',
              message: '正在准备解析文本...',
              createdAt: new Date().toISOString()
            };
           
            // 插入parsing block
            const newBlocks = [...currentBlocks];
            newBlocks.splice(insertIndex, 0, parsingBlock);
           
            return {
              ...section,
              content: newBlocks
            };
          });
          
          // 显示加载状态
          toast.loading('正在解析文本内容...', { id: 'parse-text' });
          
          // 开始轮询检查解析状态，使用指数退避策略
          let pollInterval = 8000; // 初始8秒
          const maxPollInterval = 30000; // 最大30秒
          let pollCount = 0;
          
          // 防抖处理：确保只有最后一个完成请求被处理
          let completionTimeoutId: NodeJS.Timeout | null = null;
          let isCompleted = false;
          
          const checkStatus = async () => {
            // 只在页面可见时检查状态
            if (document.hidden) {
              setTimeout(checkStatus, pollInterval);
              return;
            }
           
            // 确保 tempBlockId 不为 null
            if (!tempBlockId) {
              return;
            }
           
            try {
              const statusResult = await adminPaperService.checkBlockParsingStatus(
                paperId,
                sectionId,
                tempBlockId
              );
              
              if (statusResult.bizCode === 0) {
                const { status, addedBlocks, error, progress, message } = statusResult.data;
                
                // 更新parsing block的状态和进度
                if (status === 'processing' || status === 'pending') {
                  updateSectionTree(sectionId, section => {
                    const currentBlocks = section.content || [];
                    const updatedBlocks = currentBlocks.map(block => {
                      if (block.id === tempBlockId && block.type === 'parsing') {
                        return {
                          ...block,
                          stage: status === 'processing' ? 'structuring' : 'structuring',
                          message: message || (status === 'processing' ? '正在解析文本...' : '等待中...')
                        } as BlockContent;
                      }
                      return block;
                    });
                   
                    return {
                      ...section,
                      content: updatedBlocks
                    };
                  });
                } else if (status === 'completed') {
                  // 防抖处理：清除之前的完成处理定时器
                  if (completionTimeoutId) {
                    clearTimeout(completionTimeoutId);
                  }
                  
                  // 如果已经标记为完成，则忽略后续的完成请求
                  if (isCompleted) {
                    return;
                  }
                  
                  // 设置延迟处理完成状态，确保只处理最后一个
                  completionTimeoutId = setTimeout(() => {
                    isCompleted = true;
                    
                    // 解析完成，更新 parsing block 为待确认状态
                    updateSectionTree(sectionId, section => {
                      const currentBlocks = section.content || [];
                      const updatedBlocks = currentBlocks.map(block => {
                        if (block.id === tempBlockId && block.type === 'parsing') {
                          return {
                            ...block,
                            stage: 'pending_confirmation',
                            message: '解析完成，请确认',
                            parsedBlocks: addedBlocks || [],
                            sessionId: tempBlockId
                          } as BlockContent;
                        }
                        return block;
                      });
                     
                      return {
                        ...section,
                        content: updatedBlocks
                      };
                    });
                   
                    toast.success('解析完成，请确认解析结果', { id: 'parse-text' });
                  }, 300); // 300ms延迟，确保这是最后一个完成请求
                  
                  // 解析完成，清除轮询
                  return;
                } else if (status === 'failed') {
                  // 更新loading block为失败状态
                  updateSectionTree(sectionId, section => {
                    const currentBlocks = section.content || [];
                    const updatedBlocks = currentBlocks.map(block => {
                      if (block.id === tempBlockId && block.type === 'parsing') {
                        return {
                          ...block,
                          stage: 'failed',
                          message: error || '解析失败'
                        } as BlockContent;
                      }
                      return block;
                    });
                    
                    return {
                      ...section,
                      content: updatedBlocks
                    };
                  });
                   
                  toast.error('文本解析失败', {
                    id: 'parse-text',
                    description: error || '服务器错误'
                  });
                  // 解析失败，清除轮询
                  return;
                }
                // 如果状态是 'parsing'，继续轮询
              }
            } catch (error) {
              // 不清除轮询，继续尝试
            }
           
            // 增加轮询间隔（指数退避）
            pollCount++;
            if (pollCount > 3) { // 前3次保持8秒间隔
              pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
            }
           
            // 继续下一次轮询
            setTimeout(checkStatus, pollInterval);
          };
          
          // 开始轮询
          setTimeout(checkStatus, pollInterval);
          
          return { success: true, tempBlockId };
        } else {
          toast.error('创建解析任务失败', {
            id: 'parse-text',
            description: result.bizMessage || '服务器错误'
          });
          return { success: false, error: result.bizMessage || '创建解析任务失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建解析任务时发生未知错误';
      toast.error('创建解析任务失败', {
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
