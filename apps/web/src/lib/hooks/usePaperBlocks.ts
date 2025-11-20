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
<<<<<<< HEAD
          // 添加调试日志
          console.log('添加block API响应:', result);
          console.log('响应数据:', result.data);
          
          // 返回后端创建的真实block ID
          // 根据normalize.ts的处理，result.data应该是内层的data对象
          const blockId = result.data?.blockId || result.data?.addedBlock?.id;
          console.log('提取的blockId:', blockId);
=======
          // 返回后端创建的真实block ID
          // 根据normalize.ts的处理，result.data应该是内层的data对象
          const blockId = result.data?.blockId || result.data?.addedBlock?.id;
>>>>>>> origin/main
          
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
<<<<<<< HEAD
          // 添加调试日志
          console.log('添加block API响应(管理员):', result);
          console.log('响应数据(管理员):', result.data);
          
          // 返回后端创建的真实block ID
          // 根据normalize.ts的处理，result.data应该是内层的data对象
          const blockId = result.data?.blockId || result.data?.addedBlock?.id;
          console.log('提取的blockId(管理员):', blockId);
=======
          // 返回后端创建的真实block ID
          // 根据normalize.ts的处理，result.data应该是内层的data对象
          const blockId = result.data?.blockId || result.data?.addedBlock?.id;
>>>>>>> origin/main
          
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
        
<<<<<<< HEAD
        console.log('删除block API响应(个人):', result);
=======
>>>>>>> origin/main
        
        if (result.bizCode === 0) {
          // 不再在这里更新UI，因为乐观更新已经在 handleBlockDelete 中处理
          return { success: true };
        } else {
          return { success: false, error: result.bizMessage || '删除内容块失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.deleteBlock(paperId, sectionId, blockId);
        
<<<<<<< HEAD
        console.log('删除block API响应(管理员):', result);
=======
>>>>>>> origin/main
        
        if (result.bizCode === 0) {
          // 不再在这里更新UI，因为乐观更新已经在 handleBlockDelete 中处理
          return { success: true };
        } else {
          return { success: false, error: result.bizMessage || '删除内容块失败' };
        }
      }
    } catch (error) {
<<<<<<< HEAD
      console.error('删除block API调用出错:', error);
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
          ? await userPaperService.updateUserPaper(id, { paperData: currentDraft })
=======
          ? await userPaperService.updateUserPaper(id, currentDraft)
>>>>>>> origin/main
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
<<<<<<< HEAD
      // 在乐观更新前，先保存被删除的块信息
      let deletedBlockInfo: { block: BlockContent; sectionId: string; originalIndex?: number } | null = null;
      
      // 检查是否是临时ID（前端生成的ID格式）
      // 前端生成的ID格式：type_timestamp_random（如 paragraph_mhvuvhkp_92a7）
      // 后端生成的ID格式：block_timestamp_hash（如 block_1234567890_abcdef）
      const isTempId = blockId.match(/^[a-z-]+_[a-z0-9]+_[a-z0-9]+$/) &&
                       !blockId.startsWith('block_');
      
      console.log('删除block:', blockId, '是否为临时ID:', isTempId);
      
      let actualBlockId = blockId; // 用于API调用的实际ID
      
      // 查找要删除的块信息
=======
      // 在乐观更新前,先保存被删除的块信息
      let deletedBlockInfo: { block: BlockContent; sectionId: string; originalIndex?: number } | null = null;
      
      // 查找要删除的块信息并进行乐观删除
>>>>>>> origin/main
      updateSections(sections => {
        let found = false;
        const walk = (nodes: Section[]): Section[] => {
          return nodes.map(section => {
            if (found) return section;
            
            const blockIndex = section.content.findIndex(b => b.id === blockId);
            if (blockIndex !== -1) {
              found = true;
              const blockToDelete = section.content[blockIndex];
              
<<<<<<< HEAD
              if (isTempId) {
                // 如果是临时ID，说明这个block可能还没有正确同步到后端
                // 或者前端没有正确更新ID
                console.warn('尝试删除使用临时ID的block:', blockId);
                
                // 尝试在section中查找相同类型和内容的block，获取其真实ID
                const sameTypeBlocks = section.content.filter(b =>
                  b.type === blockToDelete.type && b.id !== blockId && b.id.startsWith('block_')
                );
                
                // 如果找到相同类型的block，尝试找到最相似的block
                if (sameTypeBlocks.length > 0) {
                  // 简单的内容比较，找到最相似的block
                  let mostSimilarBlock = null;
                  let maxSimilarity = 0;
                   
                  for (const candidateBlock of sameTypeBlocks) {
                    // 计算内容相似度（简单实现）
                    let similarity = 0;
                    
                    // 根据block类型比较相应的内容字段
                    if (blockToDelete.type === 'math' && candidateBlock.type === 'math') {
                      // MathBlock 比较 latex 字段
                      if ('latex' in blockToDelete && 'latex' in candidateBlock &&
                          blockToDelete.latex === candidateBlock.latex) {
                        similarity += 0.8;
                      }
                    } else if (blockToDelete.type === 'figure' && candidateBlock.type === 'figure') {
                      // FigureBlock 比较 src 字段
                      if ('src' in blockToDelete && 'src' in candidateBlock &&
                          blockToDelete.src === candidateBlock.src) {
                        similarity += 0.8;
                      }
                    } else if (blockToDelete.type === 'code' && candidateBlock.type === 'code') {
                      // CodeBlock 比较 code 字段
                      if ('code' in blockToDelete && 'code' in candidateBlock &&
                          blockToDelete.code === candidateBlock.code) {
                        similarity += 0.8;
                      }
                    } else if (blockToDelete.type === 'table' && candidateBlock.type === 'table') {
                      // TableBlock 比较 rows 字段
                      if ('rows' in blockToDelete && 'rows' in candidateBlock &&
                          JSON.stringify(blockToDelete.rows) === JSON.stringify(candidateBlock.rows)) {
                        similarity += 0.8;
                      }
                    } else if ('content' in blockToDelete && 'content' in candidateBlock) {
                      // 其他有 content 字段的 block
                      if (JSON.stringify(blockToDelete.content) === JSON.stringify(candidateBlock.content)) {
                        similarity += 0.8;
                      }
                    }
                    
                    // 比较类型
                    if (blockToDelete.type === candidateBlock.type) {
                      similarity += 0.2;
                    }
                    
                    if (similarity > maxSimilarity) {
                      maxSimilarity = similarity;
                      mostSimilarBlock = candidateBlock;
                    }
                  }
                   
                  // 如果找到相似度高的block，使用其ID进行删除
                  if (mostSimilarBlock && maxSimilarity > 0.5) {
                    console.warn('找到相似的block，使用其ID进行删除:', mostSimilarBlock.id);
                    actualBlockId = mostSimilarBlock.id;
                  } else {
                    console.warn('未找到相似的block，尝试使用临时ID删除');
                    // 对于临时ID，我们可以直接跳过API调用，只进行本地删除
                    // 因为这个block可能还没有同步到后端
                    console.warn('跳过API调用，只进行本地删除');
                    
                    // 标记为跳过API调用
                    actualBlockId = '';
                  }
                } else {
                  // 没有找到相同类型的后端ID，可能是刚创建的block
                  console.warn('没有找到相同类型的block，可能是刚创建的block，跳过API调用');
                  
                  // 标记为跳过API调用
                  actualBlockId = '';
                }
              }
              
              deletedBlockInfo = {
                block: { ...blockToDelete },
                sectionId: section.id,
                originalIndex: blockIndex  // 记录原始位置
=======
              deletedBlockInfo = {
                block: { ...blockToDelete },
                sectionId: section.id,
                originalIndex: blockIndex
>>>>>>> origin/main
              };
              
              // 保存到 ref 中以便后续恢复
              deletedBlocksRef.current.set(blockId, deletedBlockInfo);
              
              // 返回移除该块后的 section
              return {
                ...section,
                content: section.content.filter(b => b.id !== blockId)
              };
            }
<<<<<<< HEAD
           
=======
>>>>>>> origin/main
            
            return section;
          });
        };
        
        return { sections: walk(sections), touched: true };
      });
      
<<<<<<< HEAD
      // 如果actualBlockId为空，说明是临时ID且不需要调用API
      if (!actualBlockId) {
        console.log('跳过API调用，只进行本地删除，blockId:', blockId);
        
        // 显示加载状态
        toast.loading('正在删除内容块...', { id: 'delete-block' });
        
        // 直接返回成功，不调用API
        setTimeout(() => {
          toast.success('内容块删除成功', { id: 'delete-block' });
          // 清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        }, 500);
        
        return;
      }
      
      // 显示加载状态
      toast.loading('正在删除内容块...', { id: 'delete-block' });
      
      console.log('调用API删除block:', {
        sectionId,
        actualBlockId,
        originalBlockId: blockId,
        paperId,
        userPaperId,
        isPersonalOwner
      });
      
      try {
        const result = await handleBlockDeleteWithAPI(
          sectionId,
          actualBlockId,
=======
      // 显示加载状态
      toast.loading('正在删除内容块...', { id: 'delete-block' });
      
      try {
        // 直接使用blockId调用API删除,所有block都使用后端返回的真实ID
        const result = await handleBlockDeleteWithAPI(
          sectionId,
          blockId,
>>>>>>> origin/main
          paperId,
          userPaperId,
          isPersonalOwner
        );
<<<<<<< HEAD
        
        console.log('删除block API响应:', result);

        if (!result.success) {
          // 删除失败，恢复被删除的块
=======

        if (!result.success) {
          // 删除失败,恢复被删除的块
>>>>>>> origin/main
          const savedBlockInfo = deletedBlocksRef.current.get(blockId);
          if (savedBlockInfo) {
            updateSections(sections => {
              const walk = (nodes: Section[]): Section[] => {
                return nodes.map(section => {
                  if (section.id === savedBlockInfo.sectionId) {
<<<<<<< HEAD
                    // 找到原来的位置并恢复块
=======
>>>>>>> origin/main
                    const updatedContent = [...section.content];
                    
                    // 尝试恢复到原始位置
                    if (savedBlockInfo.originalIndex !== undefined &&
                        savedBlockInfo.originalIndex >= 0 &&
                        savedBlockInfo.originalIndex <= updatedContent.length) {
                      updatedContent.splice(savedBlockInfo.originalIndex, 0, savedBlockInfo.block);
                    } else {
<<<<<<< HEAD
                      // 如果无法恢复到原始位置，添加到末尾
=======
>>>>>>> origin/main
                      updatedContent.push(savedBlockInfo.block);
                    }
                   
                    return {
                      ...section,
                      content: updatedContent
                    } as Section;
                  }
                   
<<<<<<< HEAD
                   
=======
>>>>>>> origin/main
                  return section as Section;
                });
              };
               
              return { sections: walk(sections), touched: true };
            });
           
<<<<<<< HEAD
            // 清理保存的块信息
            deletedBlocksRef.current.delete(blockId);
          }
          
          // 显示更详细的错误信息
=======
            deletedBlocksRef.current.delete(blockId);
          }
          
>>>>>>> origin/main
          const errorMsg = result.error || '删除内容块失败';
          toast.error('删除失败', {
            id: 'delete-block',
            description: errorMsg.includes('不存在') ?
<<<<<<< HEAD
              '要删除的内容块不存在，可能已经被删除。请刷新页面后重试。' :
              errorMsg
          });
          
          // 如果是400错误（block不存在），触发页面刷新以重新同步状态
          if (errorMsg.includes('不存在') || errorMsg.includes('400')) {
            console.warn('检测到block不存在的错误，将在2秒后刷新页面以重新同步状态');
=======
              '要删除的内容块不存在,可能已经被删除。请刷新页面后重试。' :
              errorMsg
          });
          
          // 如果是400错误(block不存在),触发页面刷新以重新同步状态
          if (errorMsg.includes('不存在') || errorMsg.includes('400')) {
>>>>>>> origin/main
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } else {
<<<<<<< HEAD
          // 删除成功，清理保存的块信息
          deletedBlocksRef.current.delete(blockId);
          toast.success('内容块删除成功', { id: 'delete-block' });
          
          // 删除成功后，需要清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        }
      } catch (error) {
        // 删除失败，恢复被删除的块
=======
          // 删除成功,清理保存的块信息
          deletedBlocksRef.current.delete(blockId);
          toast.success('内容块删除成功', { id: 'delete-block' });
          
          // 删除成功后,清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        }
      } catch (error) {
        // 删除失败,恢复被删除的块
>>>>>>> origin/main
        const savedBlockInfo = deletedBlocksRef.current.get(blockId);
        if (savedBlockInfo) {
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] => {
              return nodes.map(section => {
                if (section.id === savedBlockInfo.sectionId) {
<<<<<<< HEAD
                  // 找到原来的位置并恢复块
                  const updatedContent = [...section.content];
                  
                  // 尝试恢复到原始位置
=======
                  const updatedContent = [...section.content];
                  
>>>>>>> origin/main
                  if (savedBlockInfo.originalIndex !== undefined &&
                      savedBlockInfo.originalIndex >= 0 &&
                      savedBlockInfo.originalIndex <= updatedContent.length) {
                    updatedContent.splice(savedBlockInfo.originalIndex, 0, savedBlockInfo.block);
                  } else {
<<<<<<< HEAD
                    // 如果无法恢复到原始位置，添加到末尾
=======
>>>>>>> origin/main
                    updatedContent.push(savedBlockInfo.block);
                  }
                   
                  return {
                    ...section,
                    content: updatedContent
                  } as Section;
                }
                  
<<<<<<< HEAD
                  
                  return section as Section;
                });
              };
=======
                return section as Section;
              });
            };
>>>>>>> origin/main
           
            return { sections: walk(sections), touched: true };
          });
           
<<<<<<< HEAD
          // 清理保存的块信息
=======
>>>>>>> origin/main
          deletedBlocksRef.current.delete(blockId);
        }
        
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        toast.error('删除失败', {
          id: 'delete-block',
          description: errorMsg.includes('不存在') ?
<<<<<<< HEAD
            '要删除的内容块不存在，可能已经被删除。请刷新页面后重试。' :
=======
            '要删除的内容块不存在,可能已经被删除。请刷新页面后重试。' :
>>>>>>> origin/main
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
<<<<<<< HEAD
      let tempBlockId: string | null = null;
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
              tempBlockId = newBlock.id;
              targetSectionId = section.id;
              const nextContent = [...section.content];
              const insertIndex = position === 'above' ? idx : idx + 1;
              nextContent.splice(insertIndex, 0, newBlock);
              nextSection = { ...section, content: nextContent };
              touched = true;
            }


            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      // 然后调用API
      if (tempBlockId && targetSectionId) {
=======
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
>>>>>>> origin/main
        const result = await handleBlockAddWithAPI(
          targetSectionId,
          createPlaceholderParagraph(lang),
          position === 'below' ? blockId : null,
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (result.success && result.blockId) {
<<<<<<< HEAD
          console.log('更新本地block ID:', tempBlockId, '->', result.blockId);
          
          // 更新本地状态中的临时ID为后端返回的真实ID
=======
          // API成功后,使用后端返回的真实ID更新UI
>>>>>>> origin/main
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] =>
              nodes.map(section => {
                if (section.id === targetSectionId) {
<<<<<<< HEAD
                  const nextContent = section.content.map(block =>
                    block.id === tempBlockId ? { ...block, id: result.blockId! } : block
                  );
                  return { ...section, content: nextContent };
=======
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
>>>>>>> origin/main
                }
                return section;
              });

            return { sections: walk(sections), touched: true };
          });
          
          // 使用后端返回的真实ID设置活动块
          setActiveBlockId(result.blockId);
          toast.success('内容块插入成功', { id: 'insert-block' });
          
<<<<<<< HEAD
          // 插入成功后，需要清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        } else {
          // 如果API调用失败，移除本地添加的临时block
          if (tempBlockId && targetSectionId) {
            updateSections(sections => {
              const walk = (nodes: Section[]): Section[] =>
                nodes.map(section => {
                  if (section.id === targetSectionId) {
                    const nextContent = section.content.filter(block => block.id !== tempBlockId);
                    return { ...section, content: nextContent };
                  }
                  return section;
                });

              return { sections: walk(sections), touched: true };
            });
          }
          
=======
          // 插入成功后,清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        } else {
>>>>>>> origin/main
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
<<<<<<< HEAD
      let tempBlockId: string | null = null;
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
              tempBlockId = newBlock.id;
              targetSectionId = section.id;
              const nextContent = [...section.content];
              nextContent.splice(idx + 1, 0, newBlock);
              nextSection = { ...section, content: nextContent };
              touched = true;
            }


            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      // 然后调用API保存
      if (tempBlockId && targetSectionId) {
=======
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
>>>>>>> origin/main
        const result = await handleBlockAddWithAPI(
          targetSectionId,
          createBlock(type, lang),
          blockId, // 使用当前blockId作为afterBlockId
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (result.success && result.blockId) {
<<<<<<< HEAD
          console.log('更新本地block ID(组件):', tempBlockId, '->', result.blockId);
          
          // 更新本地状态中的临时ID为后端返回的真实ID
=======
          // API成功后,使用后端返回的真实ID更新UI
>>>>>>> origin/main
          updateSections(sections => {
            const walk = (nodes: Section[]): Section[] =>
              nodes.map(section => {
                if (section.id === targetSectionId) {
<<<<<<< HEAD
                  const nextContent = section.content.map(block =>
                    block.id === tempBlockId ? { ...block, id: result.blockId! } : block
                  );
                  return { ...section, content: nextContent };
=======
                  const idx = section.content.findIndex(block => block.id === blockId);
                  if (idx !== -1) {
                    const newBlock = createBlock(type, lang);
                    // 使用后端返回的真实ID
                    newBlock.id = result.blockId!;
                    
                    const nextContent = [...section.content];
                    nextContent.splice(idx + 1, 0, newBlock);
                    return { ...section, content: nextContent };
                  }
>>>>>>> origin/main
                }
                return section;
              });

            return { sections: walk(sections), touched: true };
          });
          
          // 使用后端返回的真实ID设置活动块
          setActiveBlockId(result.blockId);
          toast.success('组件添加成功', { id: 'add-component' });
          
<<<<<<< HEAD
          // 添加成功后，需要清除未保存状态
          // 由于我们无法直接访问setHasUnsavedChanges，我们需要通过其他方式
          // 这里我们可以触发一个自定义事件，让页面组件处理
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        } else {
          // 如果API调用失败，回滚本地更新
          if (targetSectionId && tempBlockId) {
            updateSections(sections => {
              const walk = (nodes: Section[]): Section[] =>
                nodes.map(section => {
                  if (section.id === targetSectionId) {
                    const nextContent = section.content.filter(block => block.id !== tempBlockId);
                    return { ...section, content: nextContent } as Section;
                  }
                  return section as Section;
                });

              const nextSections = walk(sections);
              return { sections: nextSections, touched: true };
            });
          }
=======
          // 添加成功后,清除未保存状态
          window.dispatchEvent(new CustomEvent('blockAddedSuccessfully'));
        } else {
>>>>>>> origin/main
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
