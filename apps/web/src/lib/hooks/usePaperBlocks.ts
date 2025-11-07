import { useCallback } from 'react';
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
          // 本地更新UI - 移除该block
          updateBlockTree(blockId, () => ({ remove: true }));
          toast.success('内容块删除成功');
          return { success: true };
        } else {
          toast.error('删除失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '删除内容块失败' };
        }
      } else {
        const { adminPaperService } = await import('@/lib/services/paper');
        const result = await adminPaperService.deleteBlock(paperId, sectionId, blockId);
        
        if (result.bizCode === 0) {
          // 本地更新UI - 移除该block
          updateBlockTree(blockId, () => ({ remove: true }));
          toast.success('内容块删除成功');
          return { success: true };
        } else {
          toast.error('删除失败', { description: result.bizMessage || '服务器错误' });
          return { success: false, error: result.bizMessage || '删除内容块失败' };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除内容块时发生未知错误';
      toast.error('删除失败', { description: message });
      return { success: false, error: message };
    }
  }, [updateBlockTree]);

  const handleBlockUpdate = useCallback(
    async (
      blockId: string,
      nextBlock: BlockContent,
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      try {
        // 先本地更新
        updateBlockTree(blockId, () => ({ block: nextBlock }));
        
        // 然后调用API保存
        const updateData: any = {
          type: nextBlock.type
        };
        
        // 只添加存在的属性
        if ('content' in nextBlock && nextBlock.content !== undefined) {
          updateData.content = nextBlock.content;
        }
        
        if ('metadata' in nextBlock && nextBlock.metadata !== undefined) {
          updateData.metadata = nextBlock.metadata;
        }
        
        if ('latex' in nextBlock && nextBlock.latex !== undefined) {
          updateData.latex = nextBlock.latex;
        }
        
        if ('code' in nextBlock && nextBlock.code !== undefined) {
          updateData.code = nextBlock.code;
        }
        
        if ('language' in nextBlock && nextBlock.language !== undefined) {
          updateData.language = nextBlock.language;
        }
        
        if ('caption' in nextBlock && nextBlock.caption !== undefined) {
          updateData.caption = nextBlock.caption;
        }
        
        if ('description' in nextBlock && nextBlock.description !== undefined) {
          updateData.description = nextBlock.description;
        }
        
        if ('alt' in nextBlock && nextBlock.alt !== undefined) {
          updateData.alt = nextBlock.alt;
        }
        
        if ('headers' in nextBlock && nextBlock.headers !== undefined) {
          updateData.headers = nextBlock.headers;
        }
        
        if ('rows' in nextBlock && nextBlock.rows !== undefined) {
          updateData.rows = nextBlock.rows;
        }
        
        if ('items' in nextBlock && nextBlock.items !== undefined) {
          updateData.items = nextBlock.items;
        }
        
        if ('author' in nextBlock && nextBlock.author !== undefined) {
          updateData.author = nextBlock.author;
        }
        
        const result = await handleBlockUpdateWithAPI(
          sectionId,
          blockId,
          updateData,
          paperId,
          userPaperId,
          isPersonalOwner
        );
        
        if (!result.success) {
          console.error('Failed to update block:', result.error);
        }
      } catch (error) {
        console.error('Failed to update block:', error);
      }
    },
    [updateBlockTree, handleBlockUpdateWithAPI]
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

  const handleBlockDelete = useCallback(
    async (
      blockId: string,
      sectionId: string,
      paperId: string,
      userPaperId: string | null,
      isPersonalOwner: boolean,
      onSaveToServer?: () => Promise<void>
    ) => {
      const result = await handleBlockDeleteWithAPI(
        sectionId,
        blockId,
        paperId,
        userPaperId,
        isPersonalOwner
      );

      // 不再调用 handleSaveToServer，因为 handleBlockDeleteWithAPI 已经更新了数据库
      if (!result.success) {
        console.error('Failed to delete block:', result.error);
      }
    },
    [handleBlockDeleteWithAPI]
  );

  const handleBlockInsert = useCallback(
    (
      blockId: string,
      position: 'above' | 'below'
    ) => {
      let newBlockId: string | null = null;
      let targetSectionId: string | null = null;

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
        handleBlockAddWithAPI(
          targetSectionId,
          createPlaceholderParagraph(lang),
          position === 'below' ? blockId : null,
          paperId,
          userPaperId,
          isPersonalOwner
        ).then(result => {
          if (result.success) {
            setActiveBlockId(newBlockId);
          } else {
            console.error('Failed to insert block:', result.error);
          }
        });
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
        console.log('Block moved locally:', blockId, direction);
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
    (blockId: string, type: BlockContent['type']) => {
      let newBlockId: string | null = null;
      let targetSectionId: string | null = null;

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
        handleBlockAddWithAPI(
          targetSectionId,
          createBlock(type, lang),
          blockId, // 使用当前blockId作为afterBlockId
          paperId,
          userPaperId,
          isPersonalOwner
        ).then(result => {
          if (result.success) {
            setActiveBlockId(newBlockId);
            toast.success('组件添加成功');
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
            console.error('Failed to add component:', result.error);
          }
        });
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
