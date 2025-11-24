import { useCallback } from 'react';
import { toast } from 'sonner';
import { adminPaperService, userPaperService } from '@/lib/services/paper';

interface UsePaperSectionOperationsProps {
  paperId: string;
  resolvedUserPaperId: string | null;
  isPersonalOwner: boolean;
  updateSections: (updater: (sections: any[]) => { sections: any[]; touched: boolean }) => void;
}

export function usePaperSectionOperations({
  paperId,
  resolvedUserPaperId,
  isPersonalOwner,
  updateSections,
}: UsePaperSectionOperationsProps) {
  // 处理添加块为章节的函数
  const handleAddBlockAsSection = useCallback((sectionData: { id: string; title: string; titleZh: string; content: any[] }) => {
    const newSection = {
      id: sectionData.id,
      title: sectionData.title,
      titleZh: sectionData.titleZh,
      content: sectionData.content || []
    };

    updateSections(sections => {
      const newSections = [...sections, newSection];
      return { sections: newSections, touched: true };
    });

    toast.success('章节添加成功');

    const addSectionAsync = async () => {
      try {
        const { userPaperService, adminPaperService } = await import('@/lib/services/paper');

        let result;
        if (isPersonalOwner && resolvedUserPaperId) {
          result = await userPaperService.addSection(resolvedUserPaperId, {
            id: sectionData.id,
            title: {
              en: sectionData.title,
              zh: sectionData.titleZh
            },
            content: sectionData.content || []
          }, {
            position: -1
          });
        } else {
          result = await adminPaperService.addSection(paperId, {
            id: sectionData.id,
            title: {
              en: sectionData.title,
              zh: sectionData.titleZh
            },
            content: sectionData.content || []
          }, {
            position: -1
          });
        }

        if (result.bizCode !== 0) {
          updateSections(sections => {
            const filteredSections = sections.filter(s => s.id !== sectionData.id);
            return { sections: filteredSections, touched: true };
          });
          toast.error('添加章节失败', { description: result.bizMessage || '服务器错误' });
        } else {
          if (result.data && result.data.addedSectionId) {
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionData.id) {
                  return {
                    ...section,
                    id: result.data.addedSectionId
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
          }
        }
      } catch (error) {
        updateSections(sections => {
          const filteredSections = sections.filter(s => s.id !== sectionData.id);
          return { sections: filteredSections, touched: true };
        });
        toast.error('添加章节失败，请重试');
      }
    };

    addSectionAsync();
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加标题到章节的函数
  const handleAddHeadingToSection = useCallback(async (sectionId: string, position: 'start' | 'end', headingBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [headingBlock, ...currentContent]
              : [...currentContent, headingBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveHeadingAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建标题块数据
          const blockData: any = {
            type: headingBlock.type,
          };

          if ('level' in headingBlock && headingBlock.level !== undefined) {
            blockData.level = headingBlock.level;
          }

          if ('content' in headingBlock && headingBlock.content !== undefined) {
            blockData.content = headingBlock.content;
          }

          if ('metadata' in headingBlock && headingBlock.metadata !== undefined) {
            blockData.metadata = headingBlock.metadata;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== headingBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加标题失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === headingBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('标题已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== headingBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加标题失败，请重试');
        }
      };

      saveHeadingAsync();
    } catch (error) {
      console.error('添加标题到章节失败:', error);
      toast.error('添加标题失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理创建新章节并添加标题的函数
  const handleCreateSectionWithHeading = useCallback(async (title: string, titleZh: string, headingBlock: any) => {
    try {
      // 导入generateId函数
      const { generateId } = await import('@/lib/utils/paperHelpers');
      
      // 创建新章节
      const tempSectionId = generateId('section');
      const newSection = {
        id: tempSectionId,
        title: title,
        titleZh: titleZh,
        content: [headingBlock] // 将标题块作为章节的第一个内容
      };

      // 使用现有的章节添加逻辑
      updateSections(sections => {
        const newSections = [...sections, newSection];
        return { sections: newSections, touched: true };
      });

      toast.success('章节创建成功，标题已添加');

      // 异步保存到服务器
      const saveSectionAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');

          let result;
          if (isPersonalOwner && resolvedUserPaperId) {
            result = await userPaperService.addSection(resolvedUserPaperId, {
              id: tempSectionId,
              title: {
                en: title,
                zh: titleZh
              },
              content: [headingBlock]
            }, {
              position: -1
            });
          } else {
            result = await adminPaperService.addSection(paperId, {
              id: tempSectionId,
              title: {
                en: title,
                zh: titleZh
              },
              content: [headingBlock]
            }, {
              position: -1
            });
          }

          if (result.bizCode !== 0) {
            updateSections(sections => {
              const filteredSections = sections.filter(s => s.id !== tempSectionId);
              return { sections: filteredSections, touched: true };
            });
            toast.error('创建章节失败', { description: result.bizMessage || '服务器错误' });
          } else {
            if (result.data && result.data.addedSectionId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === tempSectionId) {
                    return {
                      ...section,
                      id: result.data.addedSectionId
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
          }
        } catch (error) {
          updateSections(sections => {
            const filteredSections = sections.filter(s => s.id !== tempSectionId);
            return { sections: filteredSections, touched: true };
          });
          toast.error('创建章节失败，请重试');
        }
      };

      saveSectionAsync();
    } catch (error) {
      console.error('创建章节并添加标题失败:', error);
      toast.error('创建章节失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加段落到章节的函数
  const handleAddParagraphToSection = useCallback(async (sectionId: string, position: 'start' | 'end', paragraphBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [paragraphBlock, ...currentContent]
              : [...currentContent, paragraphBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveParagraphAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建段落块数据
          const blockData: any = {
            type: paragraphBlock.type,
          };

          if ('content' in paragraphBlock && paragraphBlock.content !== undefined) {
            blockData.content = paragraphBlock.content;
          }

          if ('align' in paragraphBlock && paragraphBlock.align !== undefined) {
            blockData.align = paragraphBlock.align;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== paragraphBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加段落失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === paragraphBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('段落已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== paragraphBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加段落失败，请重试');
        }
      };

      saveParagraphAsync();
    } catch (error) {
      console.error('添加段落到章节失败:', error);
      toast.error('添加段落失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加有序列表到章节的函数
  const handleAddOrderedListToSection = useCallback(async (sectionId: string, position: 'start' | 'end', orderedListBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [orderedListBlock, ...currentContent]
              : [...currentContent, orderedListBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveOrderedListAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建有序列表块数据
          const blockData: any = {
            type: orderedListBlock.type,
          };

          if ('items' in orderedListBlock && orderedListBlock.items !== undefined) {
            blockData.items = orderedListBlock.items;
          }

          if ('start' in orderedListBlock && orderedListBlock.start !== undefined) {
            blockData.start = orderedListBlock.start;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== orderedListBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加有序列表失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === orderedListBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('有序列表已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== orderedListBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加有序列表失败，请重试');
        }
      };

      saveOrderedListAsync();
    } catch (error) {
      console.error('添加有序列表到章节失败:', error);
      toast.error('添加有序列表失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加无序列表到章节的函数
  const handleAddUnorderedListToSection = useCallback(async (sectionId: string, position: 'start' | 'end', unorderedListBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [unorderedListBlock, ...currentContent]
              : [...currentContent, unorderedListBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveUnorderedListAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建无序列表块数据
          const blockData: any = {
            type: unorderedListBlock.type,
          };

          if ('items' in unorderedListBlock && unorderedListBlock.items !== undefined) {
            blockData.items = unorderedListBlock.items;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== unorderedListBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加无序列表失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === unorderedListBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('无序列表已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== unorderedListBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加无序列表失败，请重试');
        }
      };

      saveUnorderedListAsync();
    } catch (error) {
      console.error('添加无序列表到章节失败:', error);
      toast.error('添加无序列表失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加公式到章节的函数
  const handleAddMathToSection = useCallback(async (sectionId: string, position: 'start' | 'end', mathBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [mathBlock, ...currentContent]
              : [...currentContent, mathBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveMathAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建公式块数据
          const blockData: any = {
            type: mathBlock.type,
          };

          if ('latex' in mathBlock && mathBlock.latex !== undefined) {
            blockData.latex = mathBlock.latex;
          }

          if ('label' in mathBlock && mathBlock.label !== undefined) {
            blockData.label = mathBlock.label;
          }

          if ('number' in mathBlock && mathBlock.number !== undefined) {
            blockData.number = mathBlock.number;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== mathBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加公式失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === mathBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('公式已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== mathBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加公式失败，请重试');
        }
      };

      saveMathAsync();
    } catch (error) {
      console.error('添加公式到章节失败:', error);
      toast.error('添加公式失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加图片到章节的函数
  const handleAddFigureToSection = useCallback(async (sectionId: string, position: 'start' | 'end', figureBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [figureBlock, ...currentContent]
              : [...currentContent, figureBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveFigureAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建图片块数据
          const blockData: any = {
            type: figureBlock.type,
          };

          if ('src' in figureBlock && figureBlock.src !== undefined) {
            blockData.src = figureBlock.src;
          }

          if ('alt' in figureBlock && figureBlock.alt !== undefined) {
            blockData.alt = figureBlock.alt;
          }

          if ('caption' in figureBlock && figureBlock.caption !== undefined) {
            blockData.caption = figureBlock.caption;
          }

          if ('description' in figureBlock && figureBlock.description !== undefined) {
            blockData.description = figureBlock.description;
          }

          if ('width' in figureBlock && figureBlock.width !== undefined) {
            blockData.width = figureBlock.width;
          }

          if ('height' in figureBlock && figureBlock.height !== undefined) {
            blockData.height = figureBlock.height;
          }

          if ('uploadedFilename' in figureBlock && figureBlock.uploadedFilename !== undefined) {
            blockData.uploadedFilename = figureBlock.uploadedFilename;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== figureBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加图片失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === figureBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('图片已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== figureBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加图片失败，请重试');
        }
      };

      saveFigureAsync();
    } catch (error) {
      console.error('添加图片到章节失败:', error);
      toast.error('添加图片失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  // 处理添加表格到章节的函数
  const handleAddTableToSection = useCallback(async (sectionId: string, position: 'start' | 'end', tableBlock: any) => {
    try {
      // 先本地更新UI
      updateSections(sections => {
        const updatedSections = sections.map(section => {
          if (section.id === sectionId) {
            const currentContent = section.content || [];
            const newContent = position === 'start'
              ? [tableBlock, ...currentContent]
              : [...currentContent, tableBlock];
            return {
              ...section,
              content: newContent
            };
          }
          return section;
        });
        return { sections: updatedSections, touched: true };
      });

      // 异步保存到服务器
      const saveTableAsync = async () => {
        try {
          const { userPaperService, adminPaperService } = await import('@/lib/services/paper');
          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;

          // 构建表格块数据（简化版，只包含content字段）
          const blockData: any = {
            type: tableBlock.type,
          };

          if ('number' in tableBlock && tableBlock.number !== undefined) {
            blockData.number = tableBlock.number;
          }

          if ('caption' in tableBlock && tableBlock.caption !== undefined) {
            blockData.caption = tableBlock.caption;
          }

          if ('content' in tableBlock && tableBlock.content !== undefined) {
            blockData.content = tableBlock.content;
          }

          let result;
          if (isPersonalOwner && userPaperId) {
            result = await userPaperService.addBlockToSection(userPaperId, sectionId, {
              blockData
            });
          } else {
            result = await adminPaperService.addBlockToSection(paperId, sectionId, {
              blockData
            });
          }

          if (result.bizCode !== 0) {
            // 回滚本地更改
            updateSections(sections => {
              const updatedSections = sections.map(section => {
                if (section.id === sectionId) {
                  const currentContent = section.content || [];
                  const newContent = currentContent.filter((block: any) => block.id !== tableBlock.id);
                  return {
                    ...section,
                    content: newContent
                  };
                }
                return section;
              });
              return { sections: updatedSections, touched: true };
            });
            toast.error('添加表格失败', { description: result.bizMessage || '服务器错误' });
          } else {
            // 更新本地状态中的临时ID
            const blockId = result.data?.blockId || result.data?.addedBlock?.id;
            if (blockId) {
              updateSections(sections => {
                const updatedSections = sections.map(section => {
                  if (section.id === sectionId) {
                    const newContent = section.content?.map((block: any) =>
                      block.id === tableBlock.id ? { ...block, id: blockId } : block
                    );
                    return {
                      ...section,
                      content: newContent
                    };
                  }
                  return section;
                });
                return { sections: updatedSections, touched: true };
              });
            }
            toast.success('表格已添加到章节');
          }
        } catch (error) {
          // 回滚本地更改
          updateSections(sections => {
            const updatedSections = sections.map(section => {
              if (section.id === sectionId) {
                const currentContent = section.content || [];
                const newContent = currentContent.filter((block: any) => block.id !== tableBlock.id);
                return {
                  ...section,
                  content: newContent
                };
              }
              return section;
            });
            return { sections: updatedSections, touched: true };
          });
          toast.error('添加表格失败，请重试');
        }
      };

      saveTableAsync();
    } catch (error) {
      console.error('添加表格到章节失败:', error);
      toast.error('添加表格失败，请重试');
    }
  }, [paperId, resolvedUserPaperId, isPersonalOwner, updateSections]);

  return {
    handleAddBlockAsSection,
    handleAddHeadingToSection,
    handleCreateSectionWithHeading,
    handleAddParagraphToSection,
    handleAddOrderedListToSection,
    handleAddUnorderedListToSection,
    handleAddMathToSection,
    handleAddFigureToSection,
    handleAddTableToSection,
  };
}