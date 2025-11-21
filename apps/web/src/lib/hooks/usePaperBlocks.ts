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
          // 返回后端创建的真实block ID
          // 根据normalize.ts的处理，result.data应该是内层的data对象
          const blockId = result.data?.blockId || result.data?.addedBlock?.id;
          
          return {
            success: true,
            data: result.data,
            blockId: blockId
          };
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
          // 返回后端创建的真实block ID
          // 根据normalize.ts的处理，result.data应该是内层的data对象
          const blockId = result.data?.blockId || result.data?.addedBlock?.id;
          
          return {
            success: true,
            data: result.data,
            blockId: blockId
          };
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
      src?: string;
      alt?: string;
      width?: string;
      height?: string;
      caption?: any;
      description?: any;
      uploadedFilename?: string;
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
      // 只进行本地更新，不立即保存到服务器
      // 所有类型的block（包括figure）都将在用户点击"完成编辑"时统一保存
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
        // 首先尝试只更新特定的block
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
        
        // 查找要更新的block
        let targetBlock: BlockContent | null = null;
        let targetSection: Section | null = null;
        
        for (const section of currentDraft.sections || []) {
          const block = section.content?.find(b => b.id === blockId);
          if (block) {
            targetBlock = block;
            targetSection = section;
            break;
          }
        }
        
        if (!targetBlock || !targetSection) {
          return { success: false, error: '找不到要更新的block' };
        }
        
        // 构建更新数据，只包含block的字段
        const updateData: any = {
          type: targetBlock.type,
        };
        
        // 根据block类型添加相应字段
        if ('content' in targetBlock && targetBlock.content !== undefined) {
          updateData.content = targetBlock.content;
        }
        
        if ('src' in targetBlock && targetBlock.src !== undefined) {
          updateData.src = targetBlock.src;
        }
        
        if ('alt' in targetBlock && targetBlock.alt !== undefined) {
          updateData.alt = targetBlock.alt;
        }
        
        if ('width' in targetBlock && targetBlock.width !== undefined) {
          updateData.width = targetBlock.width;
        }
        
        if ('height' in targetBlock && targetBlock.height !== undefined) {
          updateData.height = targetBlock.height;
        }
        
        if ('caption' in targetBlock && targetBlock.caption !== undefined) {
          updateData.caption = targetBlock.caption;
        }
        
        if ('description' in targetBlock && targetBlock.description !== undefined) {
          updateData.description = targetBlock.description;
        }
        
        if ('uploadedFilename' in targetBlock && targetBlock.uploadedFilename !== undefined) {
          updateData.uploadedFilename = targetBlock.uploadedFilename;
        }
        
        // 调用block更新API而不是更新整个论文
        const result = isPersonalOwner
          ? await userPaperService.updateBlock(id, targetSection.id, blockId, updateData)
          : await adminPaperService.updateBlock(paperId, targetSection.id, blockId, updateData);
        
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
      
      // 复制块后，需要清除未保存状态
      // 由于复制操作是纯本地操作，没有API调用，我们直接触发事件
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
      }, 100);
    },
    [updateBlockTree]
  );

  // 用于存储被删除的块信息，以便在删除失败时恢复
  const deletedBlocksRef = useRef<Map<string, { block: BlockContent; sectionId: string; originalIndex?: number }>>(new Map());

  const handleBlockDelete = useCallback(
    async (
      blockId: string,
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      // 在乐观更新前,先保存被删除的块信息
      let deletedBlockInfo: { block: BlockContent; sectionId: string; originalIndex?: number } | null = null;
      
      // 查找要删除的块信息并进行乐观删除
      updateSections(sections => {
        let found = false;
        const walk = (nodes: Section[]): Section[] => {
          return nodes.map(section => {
            if (found) return section;
            
            const blockIndex = section.content.findIndex(b => b.id === blockId);
            if (blockIndex !== -1) {
              found = true;
              const blockToDelete = section.content[blockIndex];
              
              deletedBlockInfo = {
                block: { ...blockToDelete },
                sectionId: section.id,
                originalIndex: blockIndex
              };
              
              // 保存到 ref 中以便后续恢复
              deletedBlocksRef.current.set(blockId, deletedBlockInfo);
              
              // 返回移除该块后的 section
              return {
                ...section,
                content: section.content.filter(b => b.id !== blockId)
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
        // 直接使用blockId调用API删除,所有block都使用后端返回的真实ID
        const result = await handleBlockDeleteWithAPI(
          sectionId,
          blockId,
          paperId,
          userPaperId,
          isPersonalOwner
        );

        if (!result.success) {
          // 删除失败,恢复被删除的块
          const savedBlockInfo = deletedBlocksRef.current.get(blockId);
          if (savedBlockInfo) {
            updateSections(sections => {
              const walk = (nodes: Section[]): Section[] => {
                return nodes.map(section => {
                  if (section.id === savedBlockInfo.sectionId) {
                    const updatedContent = [...section.content];
                    
                    // 尝试恢复到原始位置
                    if (savedBlockInfo.originalIndex !== undefined &&
                        savedBlockInfo.originalIndex >= 0 &&
                        savedBlockInfo.originalIndex <= updatedContent.length) {
                      updatedContent.splice(savedBlockInfo.originalIndex, 0, savedBlockInfo.block);
                    } else {
                      updatedContent.push(savedBlockInfo.block);
                    }
                   
                    return {
                      ...section,
                      content: updatedContent
                    } as Section;
                  }
                   
                  return section as Section;
                });
              };
               
              return { sections: walk(sections), touched: true };
            });
           
            deletedBlocksRef.current.delete(blockId);
          }
          
          const errorMsg = result.error || '删除内容块失败';
          toast.error('删除失败', {
            id: 'delete-block',
            description: errorMsg.includes('不存在') ?
              '要删除的内容块不存在,可能已经被删除。请刷新页面后重试。' :
              errorMsg
          });
          
          // 如果是400错误(block不存在),触发页面刷新以重新同步状态
          if (errorMsg.includes('不存在') || errorMsg.includes('400')) {
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else {
          // 删除成功,清理保存的块信息
          deletedBlocksRef.current.delete(blockId);
          toast.success('内容块删除成功', { id: 'delete-block' });
          
          // 删除成功后,清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        }
      } catch (error) {
        // 删除失败,恢复被删除的块
        const savedBlockInfo = deletedBlocksRef.current.get(blockId);
        if (savedBlockInfo) {
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] => {
              return nodes.map(section => {
                if (section.id === savedBlockInfo.sectionId) {
                  const updatedContent = [...section.content];
                  
                  if (savedBlockInfo.originalIndex !== undefined &&
                      savedBlockInfo.originalIndex >= 0 &&
                      savedBlockInfo.originalIndex <= updatedContent.length) {
                    updatedContent.splice(savedBlockInfo.originalIndex, 0, savedBlockInfo.block);
                  } else {
                    updatedContent.push(savedBlockInfo.block);
                  }
                   
                  return {
                    ...section,
                    content: updatedContent
                  } as Section;
                }
                  
                return section as Section;
              });
            };
           
            return { sections: walk(sections), touched: true };
          });
           
          deletedBlocksRef.current.delete(blockId);
        }
        
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        toast.error('删除失败', {
          id: 'delete-block',
          description: errorMsg.includes('不存在') ?
            '要删除的内容块不存在,可能已经被删除。请刷新页面后重试。' :
            errorMsg
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
      // 显示加载状态
      toast.loading('正在插入内容块...', { id: 'insert-block' });

      // 先找到目标section
      let targetSectionId: string | null = null;
      
      updateSections(sections => {
        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            if (idx !== -1) {
              targetSectionId = section.id;
            }
            return section;
          });

        walk(sections);
        return { sections, touched: false };
      });

      // 如果找到了目标section,先调用API创建block
      if (targetSectionId) {
        const result = await handleBlockAddWithAPI(
          targetSectionId,
          createPlaceholderParagraph(lang),
          position === 'below' ? blockId : null,
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (result.success && result.blockId) {
          // API成功后,使用后端返回的真实ID更新UI
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] =>
              nodes.map(section => {
                if (section.id === targetSectionId) {
                  const idx = section.content.findIndex(block => block.id === blockId);
                  if (idx !== -1) {
                    const newBlock = createPlaceholderParagraph(lang);
                    // 使用后端返回的真实ID
                    newBlock.id = result.blockId!;
                    
                    const nextContent = [...section.content];
                    const insertIndex = position === 'above' ? idx : idx + 1;
                    nextContent.splice(insertIndex, 0, newBlock);
                    return { ...section, content: nextContent };
                  }
                }
                return section;
              });

            return { sections: walk(sections), touched: true };
          });
          
          // 使用后端返回的真实ID设置活动块
          setActiveBlockId(result.blockId);
          toast.success('内容块插入成功', { id: 'insert-block' });
          
          // 插入成功后,清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
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


  const handleBlockAddComponent = useCallback(
    async (blockId: string, type: BlockContent['type']) => {
      // 显示加载状态
      toast.loading('正在添加组件...', { id: 'add-component' });

      // 先找到目标section
      let targetSectionId: string | null = null;
      
      updateSections(sections => {
        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            if (idx !== -1) {
              targetSectionId = section.id;
            }
            return section;
          });

        walk(sections);
        return { sections, touched: false };
      });

      // 如果找到了目标section,先调用API创建block
      if (targetSectionId) {
        const result = await handleBlockAddWithAPI(
          targetSectionId,
          createBlock(type, lang),
          blockId, // 使用当前blockId作为afterBlockId
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (result.success && result.blockId) {
          // API成功后,使用后端返回的真实ID更新UI
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] =>
              nodes.map(section => {
                if (section.id === targetSectionId) {
                  const idx = section.content.findIndex(block => block.id === blockId);
                  if (idx !== -1) {
                    const newBlock = createBlock(type, lang);
                    // 使用后端返回的真实ID
                    newBlock.id = result.blockId!;
                    
                    const nextContent = [...section.content];
                    nextContent.splice(idx + 1, 0, newBlock);
                    return { ...section, content: nextContent };
                  }
                }
                return section;
              });

            return { sections: walk(sections), touched: true };
          });
          
          // 使用后端返回的真实ID设置活动块
          setActiveBlockId(result.blockId);
          toast.success('组件添加成功', { id: 'add-component' });
          
          // 添加成功后,清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        } else {
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
    title: 'Untitled Section',
    titleZh: '未命名章节',
    content: [],
  };
}
