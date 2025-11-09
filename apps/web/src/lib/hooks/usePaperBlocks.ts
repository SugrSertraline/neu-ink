import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { BlockContent, Section, PaperContent as PaperContentModel } from '@/types/paper';
import { cloneBlock, createBlock, createPlaceholderParagraph, generateId } from '../utils/paperHelpers';

export function usePaperBlocks(
  lang: 'en' | 'both',
  paperId: string,
  userPaperId: string | null,
  isPersonalOwner: boolean,
  updateSections: (
    updater: (sections: Section[]) => { sections: Section[]; touched: boolean }
  ) => void,
  setActiveBlockId: (id: string | null) => void
) {
  const updateBlockTree = useCallback(
    (
      blockId: string,
      apply: (
        section: Section,
        block: BlockContent
      ) => { section?: Section; block?: BlockContent; remove?: boolean; insertAfter?: BlockContent }
    ) => {
      updateSections(sections => {
        let touched = false;

        const walkSections = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            let nextSection = section;
            let contentChanged = false;

            const nextContent = section.content
              .map(block => {
                if (block.id !== blockId) return block;
                touched = true;
                contentChanged = true;
                const result = apply(section, block);
                if (result.remove) return null;
                if (result.block) return result.block;
                return block;
              })
              .filter(Boolean) as BlockContent[];

            if (contentChanged) {
              nextSection = { ...nextSection, content: nextContent };
            }

            if (section.subsections?.length) {
              const nextSubsections = walkSections(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
              }
            }

            const foundBlock = section.content.find(b => b.id === blockId);
            const result = foundBlock ? apply(section, foundBlock) : {};
            if (result.insertAfter) {
              const idx = nextContent.findIndex(b => b.id === blockId);
              if (idx >= 0) {
                const withInsert = [...nextContent];
                withInsert.splice(idx + 1, 0, result.insertAfter);
                nextSection = { ...nextSection, content: withInsert };
              }
            }

            return nextSection;
          });

        const next = walkSections(sections);
        return { sections: touched ? next : sections, touched };
      });
    },
    [updateSections]
  );

  // 修复后的API调用函数
  const handleBlockAddWithAPI = useCallback(async (
    sectionId: string,
    block: BlockContent,
    afterBlockId: string | null,
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean
  ) => {
    try {
      // 构建blockData，确保所有必要字段都存在
      const blockData: any = {
        type: block.type,
      };

      // 根据不同block类型添加相应的数据
      if ('content' in block && block.content !== undefined) {
        blockData.content = block.content;
      }
      
      if ('metadata' in block && block.metadata !== undefined) {
        blockData.metadata = block.metadata;
      }
      
      if ('latex' in block && block.latex !== undefined) {
        blockData.latex = block.latex;
      }
      
      if ('code' in block && block.code !== undefined) {
        blockData.code = block.code;
        if ('language' in block && block.language !== undefined) {
          blockData.language = block.language;
        }
      }
      
      if ('url' in block && block.url !== undefined) {
        blockData.url = block.url;
        if ('alt' in block && block.alt !== undefined) {
          blockData.alt = block.alt;
        }
      }
      
      if ('headers' in block && block.headers !== undefined) {
        blockData.headers = block.headers;
      }
      
      if ('rows' in block && block.rows !== undefined) {
        blockData.rows = block.rows;
      }

      if ('items' in block && block.items !== undefined) {
        blockData.items = block.items;
      }

      if ('author' in block && block.author !== undefined) {
        blockData.author = block.author;
      }

      if ('level' in block && block.level !== undefined) {
        blockData.level = block.level;
      }

      if ('align' in block && block.align !== undefined) {
        blockData.align = block.align;
      }

      if ('number' in block && block.number !== undefined) {
        blockData.number = block.number;
      }

      if ('start' in block && block.start !== undefined) {
        blockData.start = block.start;
      }

      if ('caption' in block && block.caption !== undefined) {
        blockData.caption = block.caption;
      }

      if ('description' in block && block.description !== undefined) {
        blockData.description = block.description;
      }

      if ('alt' in block && block.alt !== undefined) {
        blockData.alt = block.alt;
      }

      if ('src' in block && block.src !== undefined) {
        blockData.src = block.src;
      }

      if ('width' in block && block.width !== undefined) {
        blockData.width = block.width;
      }

      if ('height' in block && block.height !== undefined) {
        blockData.height = block.height;
      }

      if ('showLineNumbers' in block && block.showLineNumbers !== undefined) {
        blockData.showLineNumbers = block.showLineNumbers;
      }

      if (isPersonalOwner && userPaperId) {
        // 个人论文
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
          blockData,
          ...(afterBlockId && { afterBlockId })
        });
        
        if (result.bizCode === 0) {
          return { success: true, data: result.data };
        } else {
          const errorMsg = result.bizMessage || '服务器错误';
          toast.error('添加失败', { description: errorMsg });
          return { success: false, error: errorMsg };
        }
      } else {
        // 管理员论文
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.addBlockToSection(paperId, sectionId, {
          blockData,
          ...(afterBlockId && { afterBlockId })
        });
        
        if (result.bizCode === 0) {
          return { success: true, data: result.data };
        } else {
          const errorMsg = result.bizMessage || '服务器错误';
          toast.error('添加失败', { description: errorMsg });
          return { success: false, error: errorMsg };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '添加block时发生未知错误';
      toast.error('添加失败', { description: message });
      return { success: false, error: message };
    }
  }, []);

  // API调用函数 - 更新block
  const handleBlockUpdateWithAPI = useCallback(async (
    sectionId: string,
    blockId: string,
    updateData: {
      content?: any;
      type?: string;
      metadata?: any;
    },
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean
  ) => {
    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.updateBlock(userPaperId, sectionId, blockId, updateData);
        
        if (result.bizCode === 0) {
          return { success: true };
        } else {
          toast.error('更新失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '更新内容块失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.updateBlock(paperId, sectionId, blockId, updateData);
        
        if (result.bizCode === 0) {
          return { success: true };
        } else {
          toast.error('更新失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '更新内容块失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新内容块时发生未知错误';
      toast.error('更新失败', { description: message });
      return { success: false, error: message };
    }
  }, []);

  // API调用函数 - 删除block
  const handleBlockDeleteWithAPI = useCallback(async (
    sectionId: string,
    blockId: string,
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean
  ) => {
    try {
      if (isPersonalOwner && userPaperId) {
        const { userPaperService } = await import('@/lib/services/paper');
        const result = await userPaperService.deleteBlock(userPaperId, sectionId, blockId);
        
        if (result.bizCode === 0) {
          // 不再在这里更新UI，因为乐观更新已经在 handleBlockDelete 中处理
          return { success: true };
        } else {
          return { success: false, error: result.bizMessage || '删除内容块失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.deleteBlock(paperId, sectionId, blockId);
        
        if (result.bizCode === 0) {
          // 不再在这里更新UI，因为乐观更新已经在 handleBlockDelete 中处理
          return { success: true };
        } else {
          return { success: false, error: result.bizMessage || '删除内容块失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除内容块时发生未知错误';
      return { success: false, error: message };
    }
  }, []);

  const handleBlockUpdate = useCallback(
    (
      blockId: string,
      nextBlock: BlockContent,
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      // 只本地更新，不调用API
      updateBlockTree(blockId, () => ({ block: nextBlock }));
    },
    [updateBlockTree]
  );

  // 新增：专门用于保存到服务器的函数
  const handleBlockSaveToServer = useCallback(
    async (
      blockId: string,
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      currentDraft?: PaperContentModel
    ) => {
      try {
        // 使用更简单的方式，直接调用API保存整个editableDraft
        // 这样可以避免类型推断问题，并且确保所有更改都被保存
        const { adminPaperService, userPaperService } = await import('@/lib/services/paper');
        
        const service = isPersonalOwner ? userPaperService : adminPaperService;
        const id = isPersonalOwner ? userPaperId : paperId;
        
        if (!id) {
          return { success: false, error: '无法确定要保存的论文标识' };
        }
        
        // 如果没有提供currentDraft，则无法保存
        if (!currentDraft) {
          return { success: false, error: '没有提供当前草稿' };
        }
        
        // 保存整个草稿到服务器
        const result = isPersonalOwner
          ? await userPaperService.updateUserPaper(id, { paperData: currentDraft })
          : await adminPaperService.updatePaper(id, currentDraft);
        
        if (result.bizCode === 0) {
          toast.success('保存成功', { description: '内容已保存到服务器。' });
          return { success: true };
        } else {
          toast.error('保存失败', {
            description: result.bizMessage || '服务器未返回详细信息，请稍后重试。',
          });
          return { success: false, error: result.bizMessage || '保存失败' };
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    []
  );

  // 保留原有函数，但标记为已弃用
  const handleBlockDuplicate = useCallback(
    (blockId: string) => {
      updateBlockTree(blockId, (_, block) => {
        if (!block) return {};
        return {
          insertAfter: { ...cloneBlock(block), id: generateId(`${block.type}`) },
        };
      });
    },
    [updateBlockTree]
  );

  // 用于存储被删除的块信息，以便在删除失败时恢复
  const deletedBlocksRef = useRef<Map<string, { block: BlockContent; sectionId: string }>>(new Map());

  const handleBlockDelete = useCallback(
    async (
      blockId: string,
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      // 在乐观更新前，先保存被删除的块信息
      let deletedBlockInfo: { block: BlockContent; sectionId: string } | null = null;
      
      // 查找要删除的块信息
      updateSections(sections => {
        let found = false;
        const walk = (nodes: Section[]): Section[] => {
          return nodes.map(section => {
            if (found) return section;
            
            const blockIndex = section.content.findIndex(b => b.id === blockId);
            if (blockIndex !== -1) {
              found = true;
              deletedBlockInfo = {
                block: { ...section.content[blockIndex] },
                sectionId: section.id
              };
              
              // 保存到 ref 中以便后续恢复
              deletedBlocksRef.current.set(blockId, deletedBlockInfo);
              
              // 返回移除该块后的 section
              return {
                ...section,
                content: section.content.filter(b => b.id !== blockId)
              };
            }
            
            if (section.subsections?.length) {
              return {
                ...section,
                subsections: walk(section.subsections)
              };
            }
            
            return section;
          });
        };
        
        return { sections: walk(sections), touched: true };
      });
      
      // 显示加载状态
      toast.loading('正在删除内容块...', { id: 'delete-block' });
      
      try {
        const result = await handleBlockDeleteWithAPI(
          sectionId,
          blockId,
          paperId,
          userPaperId,
          isPersonalOwner
        );

        if (!result.success) {
          // 删除失败，恢复被删除的块
          const savedBlockInfo = deletedBlocksRef.current.get(blockId);
          if (savedBlockInfo) {
            updateSections(sections => {
              const walk = (nodes: Section[]): Section[] => {
                return nodes.map(section => {
                  if (section.id === savedBlockInfo.sectionId) {
                    // 找到原来的位置并恢复块
                    const updatedContent = [...section.content];
                    // 这里简化处理，直接添加到末尾
                    // 在实际应用中，可能需要记录原始位置
                    updatedContent.push(savedBlockInfo.block);
                   
                    return {
                      ...section,
                      content: updatedContent
                    };
                  }
                   
                  if (section.subsections?.length) {
                    return {
                      ...section,
                      subsections: walk(section.subsections)
                    };
                  }
                   
                  return section;
                });
              };
               
              return { sections: walk(sections), touched: true };
            });
           
            // 清理保存的块信息
            deletedBlocksRef.current.delete(blockId);
          }
          
          toast.error('删除失败', {
            id: 'delete-block',
            description: result.error
          });
        } else {
          // 删除成功，清理保存的块信息
          deletedBlocksRef.current.delete(blockId);
          toast.success('内容块删除成功', { id: 'delete-block' });
        }
      } catch (error) {
        // 删除失败，恢复被删除的块
        const savedBlockInfo = deletedBlocksRef.current.get(blockId);
        if (savedBlockInfo) {
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] => {
              return nodes.map(section => {
                if (section.id === savedBlockInfo.sectionId) {
                  // 找到原来的位置并恢复块
                  const updatedContent = [...section.content];
                  // 这里简化处理，直接添加到末尾
                  updatedContent.push(savedBlockInfo.block);
                   
                  return {
                    ...section,
                    content: updatedContent
                  };
                }
                 
                if (section.subsections?.length) {
                  return {
                    ...section,
                    subsections: walk(section.subsections)
                  };
                }
                 
                return section;
              });
            };
           
            return { sections: walk(sections), touched: true };
          });
           
          // 清理保存的块信息
          deletedBlocksRef.current.delete(blockId);
        }
        
        toast.error('删除失败', {
          id: 'delete-block',
          description: error instanceof Error ? error.message : '未知错误'
        });
      }
    },
    [updateSections, handleBlockDeleteWithAPI]
  );

  const handleBlockInsert = useCallback(
    async (
      blockId: string,
      position: 'above' | 'below'
    ) => {
      let newBlockId: string | null = null;
      let targetSectionId: string | null = null;

      // 显示加载状态
      toast.loading('正在插入内容块...', { id: 'insert-block' });

      // 先本地更新UI
      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            let nextSection = section;

            if (idx !== -1) {
              const newBlock = createPlaceholderParagraph(lang);
              newBlockId = newBlock.id;
              targetSectionId = section.id;
              const nextContent = [...section.content];
              const insertIndex = position === 'above' ? idx : idx + 1;
              nextContent.splice(insertIndex, 0, newBlock);
              nextSection = { ...section, content: nextContent };
              touched = true;
            }

            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...section, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      // 然后调用API
      if (newBlockId && targetSectionId) {
        const result = await handleBlockAddWithAPI(
          targetSectionId,
          createPlaceholderParagraph(lang),
          position === 'below' ? blockId : null,
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (result.success) {
          setActiveBlockId(newBlockId);
          toast.success('内容块插入成功', { id: 'insert-block' });
        } else {
          toast.error('插入内容块失败', {
            id: 'insert-block',
            description: result.error
          });
        }
      }
    },
    [lang, setActiveBlockId, updateSections, handleBlockAddWithAPI, paperId, userPaperId, isPersonalOwner]
  );

  const handleBlockMove = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      let didMove = false;

      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            let nextSection = section;

            if (idx !== -1) {
              const targetIndex = direction === 'up' ? idx - 1 : idx + 1;
              if (targetIndex < 0 || targetIndex >= section.content.length) {
                return section;
              }
              const nextContent = [...section.content];
              const [moving] = nextContent.splice(idx, 1);
              nextContent.splice(targetIndex, 0, moving);
              nextSection = { ...section, content: nextContent };
              touched = true;
              didMove = true;
            }

            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      if (didMove) {
        setActiveBlockId(blockId);
        // TODO: 移动功能的后端API实现
      }
    },
    [setActiveBlockId, updateSections]
  );

  const handleBlockAppendSubsection = useCallback(
    (blockId: string) => {
      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            let nextSection = section;

            if (section.content.some(block => block.id === blockId)) {
              const nextSubsections = [...(section.subsections ?? []), createEmptySection()];
              nextSection = { ...section, subsections: nextSubsections };
              touched = true;
            } else if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });
    },
    [updateSections]
  );

  const handleBlockAddComponent = useCallback(
    async (blockId: string, type: BlockContent['type']) => {
      let newBlockId: string | null = null;
      let targetSectionId: string | null = null;

      // 显示加载状态
      toast.loading('正在添加组件...', { id: 'add-component' });

      // 先本地更新UI
      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            let nextSection = section;

            if (idx !== -1) {
              const newBlock = createBlock(type, lang);
              newBlockId = newBlock.id;
              targetSectionId = section.id;
              const nextContent = [...section.content];
              nextContent.splice(idx + 1, 0, newBlock);
              nextSection = { ...section, content: nextContent };
              touched = true;
            }

            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...section, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      // 然后调用API保存
      if (newBlockId && targetSectionId) {
        const result = await handleBlockAddWithAPI(
          targetSectionId,
          createBlock(type, lang),
          blockId, // 使用当前blockId作为afterBlockId
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (result.success) {
          setActiveBlockId(newBlockId);
          toast.success('组件添加成功', { id: 'add-component' });
        } else {
          // 如果API调用失败，回滚本地更新
          if (targetSectionId && newBlockId) {
            updateSections(sections => {
              const walk = (nodes: Section[]): Section[] =>
                nodes.map(section => {
                  if (section.id === targetSectionId) {
                    const nextContent = section.content.filter(block => block.id !== newBlockId);
                    return { ...section, content: nextContent };
                  }
                  if (section.subsections?.length) {
                    return {
                      ...section,
                      subsections: walk(section.subsections)
                    };
                  }
                  return section;
                });

              const nextSections = walk(sections);
              return { sections: nextSections, touched: true };
            });
          }
          toast.error('添加组件失败', {
            id: 'add-component',
            description: result.error
          });
        }
      }
    },
    [lang, setActiveBlockId, updateSections, handleBlockAddWithAPI, paperId, userPaperId, isPersonalOwner]
  );

  return {
    handleBlockUpdate,
    handleBlockDuplicate,
    handleBlockDelete,
    handleBlockInsert,
    handleBlockMove,
    handleBlockAppendSubsection,
    handleBlockAddComponent,
    // 新增的API调用函数
    handleBlockDeleteWithAPI,
    handleBlockUpdateWithAPI,
    handleBlockSaveToServer,
  };
}

function createEmptySection(): Section {
  return {
    id: generateId('section'),
    title: { en: 'Untitled Section', zh: '未命名章节' },
    content: [],
    subsections: [],
  };
}
