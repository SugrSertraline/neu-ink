// src/components/paper/PaperContent.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type {
  Section,
  InlineContent,
  BlockContent,
  Reference,
  HeadingBlock,
  ParagraphBlock,
  QuoteBlock,
  PaperContent as PaperContentModel,
} from '@/types/paper';
import BlockRenderer from './BlockRenderer';
import BlockEditor from './editor/BlockEditor';
import InlineTextParserEditor from './editor/InlineTextParserEditor';
import ParsedBlocksConfirmDialog from './ParsedBlocksConfirmDialog';
import {
  SectionContextMenu,
  BlockContextMenu,
  RootSectionContextMenu,
} from './PaperContextMenus';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditingState } from '@/stores/useEditingState';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { calculateAllNumbers } from './utils/autoNumbering';
import { toast } from 'sonner';
import { userPaperService, adminPaperService } from '@/lib/services/paper';

type Lang = 'en' | 'both';

type StreamProgressData = {
  message: string;
  progress: number;
  sessionId?: string;
};

interface PaperContentProps {
  sections: Section[];
  references?: Reference[];
  lang: Lang;
  searchQuery: string;
  activeBlockId: string | null;
  selectedBlockId?: string | null;
  setActiveBlockId: (id: string | null) => void;
  onBlockClick?: (blockId: string) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  setSearchResults: (results: string[]) => void;
  setCurrentSearchIndex: (index: number) => void;
  onSectionTitleUpdate?: (sectionId: string, title: { en: string; zh: string }, paperId?: string, userPaperId?: string | null, isPersonalOwner?: boolean, onSaveToServer?: () => Promise<void>) => void;
  onSectionInsert?: (
    targetSectionId: string | null,
    position: 'above' | 'below',
    parentSectionId: string | null,
  ) => void;
  onSectionMove?: (
    sectionId: string,
    direction: 'up' | 'down',
    parentSectionId: string | null,
  ) => void;
  onSectionDelete?: (sectionId: string) => void;
  onSectionAddBlock?: (sectionId: string, type: BlockContent['type']) => void;
  onBlockUpdate?: (blockId: string, block: BlockContent) => void;
  onBlockDuplicate?: (blockId: string) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockInsert?: (blockId: string, position: 'above' | 'below') => void;
  onBlockMove?: (blockId: string, direction: 'up' | 'down') => void;
  onBlockAppendSubsection?: (blockId: string, paperId: string, userPaperId: string | null, isPersonalOwner: boolean, onSaveToServer?: () => Promise<void>) => void;
  onBlockAddComponent?: (blockId: string, type: BlockContent['type']) => void;
  onParseTextAdd?: (sectionId: string, text: string, afterBlockId?: string) => Promise<{
    success: boolean;
    blocks?: BlockContent[];
    error?: string;
  }>;
  onParseTextComplete?: (sectionId: string, blocks: BlockContent[], afterBlockId?: string, paperData?: any) => void; // 新增回调函数
  onStartTextParse?: (sectionId: string) => void;
  onSaveToServer?: () => Promise<void>;
  /** ParseProgressModal 需要的回调 */
  onParseComplete?: (result: any) => void;
  /** 笔记相关 */
  notesByBlock?: Record<string, any[]>;
  isPersonalOwner?: boolean;
  paperId?: string;
  userPaperId?: string | null;
  updateSections?: (updater: (sections: Section[]) => { sections: Section[]; touched: boolean }) => void;
}

type ContentBlock = HeadingBlock | ParagraphBlock | QuoteBlock;

const cloneBlock = <T extends BlockContent>(block: T): T =>
  JSON.parse(JSON.stringify(block));

function hasContent(block: BlockContent): block is ContentBlock {
  return block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote';
}

export default function PaperContent({
  sections,
  references = [],
  lang,
  searchQuery,
  activeBlockId,
  selectedBlockId,
  setActiveBlockId,
  onBlockClick,
  contentRef,
  setSearchResults,
  setCurrentSearchIndex,
  onSectionTitleUpdate,
  onSectionInsert,
  onSectionMove,
  onSectionDelete,
  onSectionAddBlock,
  onBlockUpdate,
  onBlockDuplicate,
  onBlockDelete,
  onBlockInsert,
  onBlockMove,
  onBlockAppendSubsection,
  onBlockAddComponent,
  onParseTextAdd,
  onParseTextComplete,
  onSaveToServer,
  onParseComplete,
  notesByBlock = {},
  isPersonalOwner = false,
  paperId,
  userPaperId,
  updateSections,
}: PaperContentProps) {
  // 应用自动编号的内容
  const contentWithNumbers = useMemo(() => {
    const paperContent: PaperContentModel = {
      sections,
      references,
      metadata: {
        title: '', // 必需的 title 属性
        authors: [], // 必需的 authors 属性
      },
    };
    return calculateAllNumbers(paperContent);
  }, [sections, references]);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightText = (text: string, query: string): React.ReactNode => {
    const q = query.trim();
    if (!q) return text;
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return text.split(re).map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-white">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  };

  const extractInlineText = (nodes?: InlineContent[]): string => {
    if (!nodes?.length) return '';
    const buf: string[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case 'text':
          buf.push(n.content || '');
          break;
        case 'link':
          buf.push(extractInlineText(n.children));
          break;
        case 'inline-math':
          buf.push(n.latex ?? '');
          break;
        case 'citation':
          buf.push(n.displayText || n.referenceIds?.join(',') || '');
          break;
        case 'figure-ref':
        case 'table-ref':
        case 'section-ref':
        case 'equation-ref':
          buf.push(n.displayText || '');
          break;
        case 'footnote':
          buf.push(n.displayText || n.content || n.id || '');
          break;
        default:
          break;
      }
    }
    return buf.join(' ');
  };

  const extractBlockText = (block: BlockContent): string => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        return [
          extractInlineText(hasContent(block) ? block.content?.en : []),
          extractInlineText(hasContent(block) ? block.content?.zh : []),
        ].join(' ');
      case 'math':
        return [
          (block as any).latex || '',
          (block as any).label || '',
          (block as any).number ? String((block as any).number) : '',
        ].join(' ');
      case 'figure':
        return [
          extractInlineText((block as any).caption?.en),
          extractInlineText((block as any).caption?.zh),
          extractInlineText((block as any).description?.en),
          extractInlineText((block as any).description?.zh),
          (block as any).alt || '',
          (block as any).uploadedFilename || '',
        ].join(' ');
      case 'table': {
        const headerText = Array.isArray((block as any).headers) ? (block as any).headers.join(' ') : '';
        const rowsText = Array.isArray((block as any).rows)
          ? (block as any).rows
              .map((row: any[]) =>
                row
                  .map((cell: any) => {
                    if (typeof cell === 'string') return cell;
                    if (cell && typeof cell === 'object') {
                      const en = cell.en ?? '';
                      const zh = cell.zh ?? '';
                      return [en, zh].filter(Boolean).join(' ');
                    }
                    return '';
                  })
                  .join(' '),
              )
              .join(' ')
          : '';
        const cap = [
          extractInlineText((block as any).caption?.en),
          extractInlineText((block as any).caption?.zh),
          extractInlineText((block as any).description?.en),
          extractInlineText((block as any).description?.zh),
        ].join(' ');
        return [headerText, rowsText, cap].join(' ');
      }
      case 'code':
        return [
          (block as any).code || '',
          extractInlineText((block as any).caption?.en),
          extractInlineText((block as any).caption?.zh),
        ].join(' ');
      case 'ordered-list':
      case 'unordered-list':
        return Array.isArray((block as any).items)
          ? (block as any).items
              .map((it: any) =>
                [
                  extractInlineText(it?.content?.en),
                  extractInlineText(it?.content?.zh),
                ].join(' '),
              )
              .join(' ')
          : '';
      case 'quote':
        return [
          extractInlineText(hasContent(block) ? block.content?.en : []),
          extractInlineText(hasContent(block) ? block.content?.zh : []),
          (block as any).author || '',
        ].join(' ');
      case 'divider':
        return '';
      default:
        return '';
    }
  };

  const traverseSections = useCallback(
    (nodes: Section[], visitor: (section: Section, path: number[]) => void, path: number[] = []) => {
      nodes.forEach((section, index) => {
        const nextPath = [...path, index + 1];
        visitor(section, nextPath);
      });
    },
    [],
  );

  // 使用ref保存上次的搜索结果,避免空数组引起的无限循环
  const lastSearchResultsRef = useRef<string[]>([]);
  const lastSearchQueryRef = useRef<string>('');

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    
    // 如果查询没变,直接返回
    if (q === lastSearchQueryRef.current) {
      return;
    }
    
    lastSearchQueryRef.current = q;
    
    if (!q) {
      // 只有当之前有结果时才清空
      if (lastSearchResultsRef.current.length > 0) {
        lastSearchResultsRef.current = [];
        setSearchResults([]);
        setCurrentSearchIndex(0);
      }
      return;
    }

    const results: string[] = [];
    traverseSections(contentWithNumbers.sections, (section) => {
      section.content?.forEach((block) => {
        const text = extractBlockText(block).toLowerCase();
        if (text.includes(q)) results.push(block.id);
      });
    });

    // 只有结果真正变化时才更新
    const resultsChanged =
      results.length !== lastSearchResultsRef.current.length ||
      results.some((id, i) => id !== lastSearchResultsRef.current[i]);
    
    if (resultsChanged) {
      lastSearchResultsRef.current = results;
      setSearchResults(results);
      setCurrentSearchIndex(0);
    }
  }, [searchQuery, contentWithNumbers.sections, traverseSections]);

  const generateSectionNumber = (path: number[]): string => path.join('.');

  const { canEditContent } = usePaperEditPermissionsContext();
  const { isEditing, clearEditing, setHasUnsavedChanges, switchToEdit } = useEditingState();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [textParseSectionId, setTextParseSectionId] = useState<string | null>(null);
  const [textParseBlockId, setTextParseBlockId] = useState<string | null>(null);
  
  // ★ 新增：管理流式解析进度数据
  const [streamProgressData, setStreamProgressData] = useState<Record<string, StreamProgressData>>({});
  
  // ★ 新增：管理解析确认对话框
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    blockId: string;
    sectionId: string;
    parsedBlocks: BlockContent[];
    sessionId?: string;
  } | null>(null);

  // ★ 新增：处理流式进度更新
  const handleStreamProgressUpdate = useCallback((sectionId: string, progressData: StreamProgressData) => {
    setStreamProgressData(prev => ({
      ...prev,
      [sectionId]: progressData
    }));
  }, []);

  useEffect(() => {
    if (!canEditContent) {
      setRenamingSectionId(null);
      clearEditing();
    }
  }, [canEditContent, clearEditing]);

  const handleSectionRenameConfirm = useCallback(
    (sectionId: string, title: { en: string; zh: string }) => {
      // 直接使用后端期望的格式
      onSectionTitleUpdate?.(sectionId, title, paperId, userPaperId, isPersonalOwner, onSaveToServer);
      setRenamingSectionId(null);
      setHasUnsavedChanges(false);
    },
    [onSectionTitleUpdate, setHasUnsavedChanges, paperId, userPaperId, isPersonalOwner, onSaveToServer],
  );

  const handleBlockEditConfirm = useCallback(
    (blockId: string, block: BlockContent) => {
      onBlockUpdate?.(blockId, block);
      setHasUnsavedChanges(false);
      clearEditing();
    },
    [onBlockUpdate, clearEditing, setHasUnsavedChanges],
  );

  const handleBlockEditStart = useCallback(
    async (blockId: string) => {
      const switched = await switchToEdit(blockId, {
        beforeSwitch: () => {
          if (renamingSectionId && renamingSectionId !== blockId) {
            setRenamingSectionId(null);
          }
        },
        onRequestSave: () => {
          // TODO: auto-save pending block
        },
      });
      if (!switched) return;
      setActiveBlockId(blockId);
    },
    [switchToEdit, renamingSectionId, setActiveBlockId],
  );

  const handleSectionEditStart = useCallback(
    async (sectionId: string) => {
      const switched = await switchToEdit(sectionId, {
        beforeSwitch: () => {
          if (renamingSectionId && renamingSectionId !== sectionId) {
            setRenamingSectionId(null);
          }
        },
        onRequestSave: () => {
          // TODO: auto-save pending section
        },
      });
      if (!switched) return;
      setRenamingSectionId(sectionId);
    },
    [switchToEdit, renamingSectionId],
  );

  const handleStartTextParse = useCallback(
    (sectionId: string) => {
      if (textParseSectionId === sectionId) {
        setTextParseSectionId(null);
      } else {
        setTextParseSectionId(sectionId);
        setTextParseBlockId(null); // 清除block级别的编辑器
      }
    },
    [textParseSectionId],
  );

  const handleStartBlockTextParse = useCallback(
    (sectionId: string, blockId: string) => {
      if (textParseBlockId === blockId) {
        setTextParseBlockId(null);
      } else {
        setTextParseBlockId(blockId);
        setTextParseSectionId(null); // 清除section级别的编辑器
      }
    },
    [textParseBlockId],
  );

  const handleParseTextComplete = useCallback(() => {
    setTextParseSectionId(null);
    setTextParseBlockId(null);
  }, []);

    // 处理流式解析完成后的blocks
  const handleStreamParseComplete = useCallback((
    sectionId: string,
    blocks: BlockContent[],
    afterBlockId?: string,
    paperData?: any
  ) => {
    // ★ 关键修复：区分临时进度块和最终结果
    const isTempProgressBlock = blocks?.length === 1 && (blocks[0] as any).type === 'loading';
    
    if (isTempProgressBlock) {
      // 临时进度块：只插入进度块，不关闭编辑器
      onParseTextComplete?.(sectionId, blocks, afterBlockId);
      return; // ★ 重要：临时进度块时直接返回，不关闭编辑器
    }
    
    // 最终结果blocks：删除临时进度块，插入实际blocks，然后关闭编辑器
    if (onParseTextComplete && blocks?.length && (blocks[0] as any).type !== 'loading') {
      onParseTextComplete(sectionId, blocks, afterBlockId, paperData);
    }
   
    // 如果收到了完整的paperData，可以用于更新整个paper数据
    if (paperData && paperData.sections) {
      // 这里可以根据需要触发paper数据的更新
      // 例如调用某个更新paper的函数
    }
    
    // ★ 最终结果：关闭文本解析编辑器
    handleParseTextComplete();
  }, [onParseTextComplete, handleParseTextComplete]);

  // 处理解析完成后的预览和确认
  const handleParsePreview = useCallback((data: {
    type: 'preview' | 'cancel';
    blockId: string;
    parsedBlocks?: BlockContent[];
    sessionId?: string;
  }) => {
    if (data.type === 'cancel') {
      // 用户取消,删除 parsing block
      if (onBlockDelete) {
        onBlockDelete(data.blockId);
      }
      return;
    }
    
    // 打开确认对话框
    if (data.parsedBlocks) {
      // 找到对应的 section
      const targetSection = sections.find(s =>
        s.content?.some(b => b.id === data.blockId)
      );
      
      if (targetSection) {
        setPendingConfirmation({
          blockId: data.blockId,
          sectionId: targetSection.id,
          parsedBlocks: data.parsedBlocks,
          sessionId: data.sessionId,
        });
        setConfirmDialogOpen(true);
      }
    }
  }, [sections, onBlockDelete]);
  
  // 处理用户确认选择的blocks
  const handleConfirmParsedBlocks = useCallback(async (selectedBlockIds: string[]) => {
    if (!pendingConfirmation) return;
    
    const { blockId, sectionId, parsedBlocks, sessionId } = pendingConfirmation;
    
    // 过滤出用户选择的blocks
    const selectedBlocks = parsedBlocks.filter(b => selectedBlockIds.includes(b.id));
    
    if (selectedBlocks.length === 0) {
      toast.error('请至少选择一个段落');
      return;
    }
    
    try {
      // 调用后端API更新section
      // 删除 parsing block,添加选中的 blocks
      updateSections?.((sections: Section[]) => {
        let touched = false;
        
        const updatedSections = sections.map((section: Section) => {
          if (section.id !== sectionId) return section;
          
          touched = true;
          let currentBlocks = section.content || [];
          
          // 删除 parsing block
          currentBlocks = currentBlocks.filter((block: BlockContent) => block.id !== blockId);
          
          // 添加选中的blocks
          const newBlocks = [...currentBlocks, ...selectedBlocks];
          
          return {
            ...section,
            content: newBlocks
          };
        });
        
        return { sections: touched ? updatedSections : sections, touched };
      });
      
      // 关闭对话框
      setConfirmDialogOpen(false);
      setPendingConfirmation(null);
      
      toast.success(`成功添加了 ${selectedBlocks.length} 个段落`);
      
      // 保存到服务器
      if (onSaveToServer) {
        await onSaveToServer();
      }
    } catch (error) {
      toast.error('保存失败,请重试');
      console.error('保存解析结果失败:', error);
    }
  }, [pendingConfirmation, updateSections, onSaveToServer]);
  
  // 处理取消确认
  const handleCancelConfirmation = useCallback(() => {
    if (pendingConfirmation) {
      // 删除 parsing block
      if (onBlockDelete) {
        onBlockDelete(pendingConfirmation.blockId);
      }
    }
    setConfirmDialogOpen(false);
    setPendingConfirmation(null);
  }, [pendingConfirmation, onBlockDelete]);

  // 处理ParseProgressBlock的onCompleted回调
  const handleParseProgressComplete = useCallback((result: any) => {
    // 处理重新开始的请求
    if (result.status === 'restart') {
      // 删除对应的loading block
      if (onBlockDelete) {
        onBlockDelete(result.blockId);
      }
      return;
    }
    
    // 处理解析完成的情况 - 现在需要二次确认
    if (result.status === 'completed') {
      // 优先检查是否有解析结果（addedBlocks 或 blocks），如果有则走确认流程
      const parsedBlocks = result.addedBlocks || result.blocks;
      
      if (parsedBlocks && parsedBlocks.length > 0) {
        updateSections?.((sections: Section[]) => {
          let touched = false;
          
          const updatedSections = sections.map((section: Section) => {
            const parsingBlockIndex = section.content?.findIndex((block: BlockContent) =>
              block.id === result.blockId
            );
            
            if (parsingBlockIndex !== undefined && parsingBlockIndex >= 0) {
              touched = true;
              const currentBlocks = [...(section.content || [])];
              const parsingBlock = currentBlocks[parsingBlockIndex];
              
              // 确保这是一个 parsing block
              if (parsingBlock.type === 'parsing') {
                // 更新 parsing block 为待确认状态
                const updatedBlock: BlockContent = {
                  ...parsingBlock,
                  stage: 'pending_confirmation' as const,
                  message: '解析完成,请确认',
                  parsedBlocks: parsedBlocks,
                  sessionId: result.sessionId,
                };
                
                currentBlocks[parsingBlockIndex] = updatedBlock;
              }
              
              return {
                ...section,
                content: currentBlocks
              };
            }
            
            return section;
          });
          
          return { sections: touched ? updatedSections : sections, touched };
        });
        
        return;
      }
      
      // 只有在没有解析结果但有完整 paper 数据时才直接更新
      if (result.paper && result.paper.sections) {
        // 调用父组件的 onParseTextComplete，传递完整的 paper 数据
        if (onParseTextComplete) {
          onParseTextComplete(result.sectionId, result.blocks || [], undefined, result.paper);
        }
        
        // 显示成功消息
        toast.success('解析完成，论文内容已更新');
        return;
      }
    }
    
    // 其他完成状态的处理
    onParseComplete?.(result);
  }, [onParseComplete, onBlockDelete, updateSections, onParseTextComplete]);

  const renderedTree = useMemo(() => {
    // 辅助函数：从 contentWithNumbers 中找到对应 ID 的章节
    const findSectionById = (id: string, sections: Section[]): Section | null => {
      for (const section of sections) {
        if (section.id === id) return section;
      }
      return null;
    };

    const renderSection = (
      section: Section,
      path: number[],
      siblings: Section[],
      index: number,
      parentSectionId: string | null,
    ): React.ReactNode => {
      // 获取带有编号的章节
      const numberedSection = findSectionById(section.id, contentWithNumbers.sections) || section;
      const sectionNumber = generateSectionNumber(path);
      const hasZhTitle = !!numberedSection.titleZh?.trim();
      const normalizedZh = (numberedSection.titleZh ?? '').trim();
      const sectionMargin = Math.max(0, (path.length - 1) * 24);
      const isRenaming = renamingSectionId === numberedSection.id;
      const isFirstSibling = index === 0;
      const isLastSibling = index === siblings.length - 1;

      return (
        <section
          key={numberedSection.id}
          id={numberedSection.id}
          className="relative overflow-hidden rounded-2xl border border-white/45 bg-linear-to-tr from-white/30 via-white/15 to-white/35 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-[18px] transition-all duration-300 dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/45 dark:to-slate-900/55 space-y-4"
          style={{ marginLeft: sectionMargin }}
        >
          <SectionContextMenu
            onRename={canEditContent ? () => handleSectionEditStart(numberedSection.id) : undefined}
            onAddSectionBefore={
              canEditContent && onSectionInsert
                ? () => onSectionInsert(numberedSection.id, 'above', parentSectionId)
                : undefined
            }
            onAddSectionAfter={
              canEditContent && onSectionInsert
                ? () => onSectionInsert(numberedSection.id, 'below', parentSectionId)
                : undefined
            }
            onAddBlock={
              canEditContent && onSectionAddBlock
                ? (type) => onSectionAddBlock(numberedSection.id, type)
                : undefined
            }
            onStartTextParse={canEditContent ? () => handleStartTextParse(numberedSection.id) : undefined}
            onMoveUp={
              canEditContent && onSectionMove && !isFirstSibling
                ? () => onSectionMove(numberedSection.id, 'up', parentSectionId)
                : undefined
            }
            onMoveDown={
              canEditContent && onSectionMove && !isLastSibling
                ? () => onSectionMove(numberedSection.id, 'down', parentSectionId)
                : undefined
            }
            onDelete={
              canEditContent
                ? async () => {
                    const confirmed = await confirm({
                      title: '删除章节',
                      description: '确定删除该章节及其所有内容吗？此操作不可撤销。',
                      confirmText: '删除',
                      cancelText: '取消',
                      variant: 'destructive',
                      onConfirm: () => Promise.resolve(),
                    });
                    if (confirmed) {
                      onSectionDelete?.(numberedSection.id);
                      if (renamingSectionId === numberedSection.id) setRenamingSectionId(null);
                    }
                  }
                : undefined
            }
          >
            <div
              className={`flex items-baseline gap-3 flex-wrap cursor-context-menu rounded-md transition-colors ${hoveredSectionId === section.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              onMouseEnter={() => setHoveredSectionId(section.id)}
              onMouseLeave={() => setHoveredSectionId(null)}
            >
              <span className="text-blue-600 dark:text-blue-400 text-2xl font-bold">{sectionNumber}.</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-baseline gap-3">
                <span>{highlightText(String(numberedSection.title ?? ''), searchQuery)}</span>
                <span className="text-gray-400 mx-1">/</span>
                {hasZhTitle ? (
                  <span className="rounded px-1 bg-gray-50 text-gray-700">
                    {highlightText(String(normalizedZh), searchQuery)}
                  </span>
                ) : (
                  <span className="rounded px-1 bg-gray-100 text-gray-500 italic">
                    该标题组件未配置中文
                  </span>
                )}
              </h2>
            </div>
          </SectionContextMenu>

          {canEditContent && isRenaming && (
            <SectionTitleInlineEditor
              key={numberedSection.id}
              initialTitle={numberedSection}
              lang={lang}
              onCancel={() => setRenamingSectionId(null)}
              onConfirm={(title) => {
                handleSectionRenameConfirm(numberedSection.id, title);
              }}
            />
          )}

          <div className="space-y-4">
            {numberedSection.content?.map((block, blockIndex) => {
              const isEditingBlock = isEditing(block.id);
              const isSelected = selectedBlockId === block.id;
              const isActive = isSelected || activeBlockId === block.id;

              const blockContent = isEditingBlock ? (
                <BlockEditor
                  block={block}
                  onChange={updatedBlock => onBlockUpdate?.(block.id, updatedBlock)}
                  onMoveUp={() => onBlockMove?.(block.id, 'up')}
                  onMoveDown={() => onBlockMove?.(block.id, 'down')}
                  onDelete={() => onBlockDelete?.(block.id)}
                  onDuplicate={() => onBlockDuplicate?.(block.id)}
                  canMoveUp={blockIndex > 0}
                  canMoveDown={blockIndex < (section.content?.length ?? 0) - 1}
                  references={references}
                  allSections={sections}
                  onSaveToServer={onSaveToServer}
                />
              ) : (
                <BlockRenderer
                  block={block}
                  lang={lang}
                  searchQuery={searchQuery}
                  isActive={isActive}
                  onMouseEnter={() => setActiveBlockId(block.id)}
                  onMouseLeave={() => {
                    if (!isSelected) setActiveBlockId(null);
                  }}
                  contentRef={contentRef}
                  references={references}
                  onBlockUpdate={updatedBlock => onBlockUpdate?.(block.id, updatedBlock)}
                  onSaveToServer={onSaveToServer}
                  notesCount={notesByBlock[block.id]?.length || 0}
                  isPersonalOwner={isPersonalOwner}
                  paperId={paperId}
                  sectionId={numberedSection.id}
                  onParseComplete={handleParseProgressComplete}
                  onParsePreview={handleParsePreview}
                  userPaperId={userPaperId}
                  // ★ 新增：传递进度数据给loading block
                  streamProgressData={streamProgressData}
                />
              );

              const blockShell = (
                <div
                  id={block.id}
                  data-block-id={block.id}
                  className={`rounded-md transition-colors ${isActive ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                  style={{
                    // 让 scrollIntoView 对齐到"头部下方 16px"
                    scrollMarginTop: 'calc(var(--app-header-h, 0px) + 16px)',
                  }}
                  onClick={
                    !isEditingBlock && onBlockClick
                      ? () => {
                          const selection = window.getSelection();
                          if (selection && selection.toString()) return;
                          onBlockClick(block.id);
                        }
                      : undefined
                  }
                >
                  {blockContent}
                </div>
              );

              // 检查是否需要显示内联文本解析编辑器
              const showBlockTextParser = canEditContent && textParseBlockId === block.id;
              
              if (showBlockTextParser) {
                return (
                  <React.Fragment key={block.id}>
                    <div
                      id={block.id}
                      data-block-id={block.id}
                      className={`rounded-md transition-colors ${isActive ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                      style={{
                        scrollMarginTop: 'calc(var(--app-header-h, 0px) + 16px)',
                      }}
                      onClick={
                        !isEditingBlock && onBlockClick
                          ? () => {
                              const selection = window.getSelection();
                              if (selection && selection.toString()) return;
                              onBlockClick(block.id);
                            }
                          : undefined
                      }
                    >
                      {blockContent}
                    </div>
                    <InlineTextParserEditor
                      sectionId={numberedSection.id}
                      sectionTitle={String(numberedSection.title || numberedSection.titleZh || '未命名章节')}
                      context="block"
                      blockId={block.id}
                      onParseText={async (text: string, afterBlockId?: string, isStreaming?: boolean) => {
                        if (isStreaming) {
                          // 支持流式传输，返回一个特殊的Promise
                          return new Promise<{ success: boolean; error?: string }>((resolve) => {
                            // 这个Promise不会被resolve，因为流式传输会通过EventSource处理
                            // 实际结果会通过onCancel回调来关闭编辑器
                          });
                        } else {
                          // 传统方式
                          return onParseTextAdd?.(numberedSection.id, text, block.id) || Promise.resolve({ success: false });
                        }
                      }}
                      onCancel={handleParseTextComplete}
                      paperId={paperId || ''}
                      userPaperId={userPaperId}
                      onParseComplete={(blocks, paperData) =>
                        handleStreamParseComplete(numberedSection.id, blocks, block.id, paperData)
                      }
                      onProgressUpdate={(progressData: StreamProgressData) =>
                        handleStreamProgressUpdate(numberedSection.id, progressData)
                      }
                    />
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={block.id}>
                  {isEditingBlock ? (
                    blockShell
                  ) : (
                    <BlockContextMenu
                      sectionId={numberedSection.id}
                      sectionTitle={String(numberedSection.title || numberedSection.titleZh || '未命名章节')}
                      onEdit={
                        canEditContent
                          ? () => {
                              handleBlockEditStart(block.id);
                            }
                          : undefined
                      }
                      onInsertAbove={canEditContent ? () => onBlockInsert?.(block.id, 'above') : undefined}
                      onInsertBelow={canEditContent ? () => onBlockInsert?.(block.id, 'below') : undefined}
                      onMoveUp={canEditContent ? () => onBlockMove?.(block.id, 'up') : undefined}
                      onMoveDown={canEditContent ? () => onBlockMove?.(block.id, 'down') : undefined}
                      onDuplicate={canEditContent ? () => onBlockDuplicate?.(block.id) : undefined}
                      onAddComponentAfter={
                        canEditContent ? type => onBlockAddComponent?.(block.id, type) : undefined
                      }
                      onStartTextParse={canEditContent ? () => handleStartBlockTextParse(numberedSection.id, block.id) : undefined}
                      onAddSectionBelow={
                        canEditContent && onSectionInsert
                          ? () => onSectionInsert(numberedSection.id, 'below', null)
                          : undefined
                      }
                      onDelete={
                        canEditContent
                          ? async () => {
                              const confirmed = await confirm({
                                title: '删除内容块',
                                description: '确定删除该内容块吗？此操作不可撤销。',
                                confirmText: '删除',
                                cancelText: '取消',
                                variant: 'destructive',
                                onConfirm: () => Promise.resolve(),
                              });
                              if (confirmed) {
                                onBlockDelete?.(block.id);
                                if (isEditing(block.id)) clearEditing();
                              }
                            }
                          : undefined
                      }
                    >
                      {blockShell}
                    </BlockContextMenu>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {canEditContent && textParseSectionId === numberedSection.id && (
            <InlineTextParserEditor
              sectionId={numberedSection.id}
              sectionTitle={String(numberedSection.title || numberedSection.titleZh || '未命名章节')}
              context="section"
              onParseText={async (text: string, afterBlockId?: string, isStreaming?: boolean) => {
                if (isStreaming) {
                  // 支持流式传输，返回一个特殊的Promise
                  return new Promise<{ success: boolean; error?: string }>((resolve) => {
                    // 这个Promise不会被resolve，因为流式传输会通过EventSource处理
                    // 实际结果会通过onCancel回调来关闭编辑器
                  });
                } else {
                  // 传统方式
                  return onParseTextAdd?.(numberedSection.id, text) || Promise.resolve({ success: false });
                }
              }}
              onCancel={handleParseTextComplete}
              paperId={paperId || ''}
              userPaperId={userPaperId}
              onParseComplete={(blocks, paperData) =>
                handleStreamParseComplete(numberedSection.id, blocks, undefined, paperData)
              }
              onProgressUpdate={(progressData: StreamProgressData) =>
                handleStreamProgressUpdate(numberedSection.id, progressData)
              }
            />
          )}

        </section>
      );
    };

    return contentWithNumbers.sections.map((section, index) =>
      renderSection(section, [index + 1], contentWithNumbers.sections, index, null),
    );
  }, [
    contentWithNumbers, // 添加这个依赖项
    sections,
    lang,
    searchQuery,
    references,
    activeBlockId,
    selectedBlockId,
    canEditContent,
    renamingSectionId,
    hoveredSectionId,
    onSectionInsert,
    onSectionMove,
    onSectionDelete,
    onSectionAddBlock,
    onBlockDuplicate,
    onBlockDelete,
    onBlockInsert,
    onBlockMove,
    onBlockAppendSubsection,
    onBlockAddComponent,
    onBlockUpdate,
    onParseTextAdd,
    handleSectionEditStart,
    handleSectionRenameConfirm,
    handleBlockEditStart,
    handleStartTextParse,
    handleParseTextComplete,
    textParseSectionId,
    textParseBlockId,
    handleStartBlockTextParse,
    isEditing,
    clearEditing,
    setHoveredSectionId,
      onBlockClick,
    contentRef,
    onSaveToServer,
    notesByBlock,
    isPersonalOwner,
    handleStreamParseComplete,
    handleParseProgressComplete,
    paperId,
    userPaperId,
    onParseComplete,
  ]); 

  const emptyState = canEditContent && onSectionInsert ? (
    <RootSectionContextMenu onAddSection={() => onSectionInsert(null, 'below', null)}>
      <div className="relative overflow-hidden rounded-2xl border border-white/45 bg-linear-to-tr from-white/30 via-white/15 to-white/35 p-10 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-[18px] transition-all duration-300 text-center dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/45 dark:to-slate-900/55">
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">论文暂无内容</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">右键此区域以添加第一章。</p>
      </div>
    </RootSectionContextMenu>
  ) : (
    <div className="relative overflow-hidden rounded-2xl border border-white/45 bg-linear-to-tr from-white/30 via-white/15 to-white/35 p-10 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-[18px] transition-all duration-300 text-center dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/45 dark:to-slate-900/55">
      <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">论文暂无内容</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请联系管理员添加内容。</p>
    </div>
  );

  return (
    <>
      <div className="space-y-8">{contentWithNumbers.sections.length ? renderedTree : emptyState}</div>
      <ConfirmDialog />
      {pendingConfirmation && (
        <ParsedBlocksConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          blocks={pendingConfirmation.parsedBlocks}
          onConfirm={handleConfirmParsedBlocks}
          onCancel={handleCancelConfirmation}
        />
      )}
    </>
  );
}

function SectionTitleInlineEditor({
  initialTitle,
  lang,
  onCancel,
  onConfirm,
}: {
  initialTitle: Section;
  lang: Lang;
  onCancel: () => void;
  onConfirm: (title: { en: string; zh: string }) => void;
}) {
  const [en, setEn] = useState(initialTitle.title ?? '');
  const [zh, setZh] = useState(initialTitle.titleZh ?? '');
  const { setHasUnsavedChanges } = useEditingState();

  useEffect(() => {
    const hasChanges = en !== (initialTitle.title ?? '') || zh !== (initialTitle.titleZh ?? '');
    setHasUnsavedChanges(hasChanges);
  }, [en, zh, initialTitle, setHasUnsavedChanges]);

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/70 p-4 shadow-sm space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-blue-600">English Title</label>
        <input
          className="w-full rounded border border-blue-200 px-3 py-2 text-sm"
          value={en}
          onChange={(event) => setEn(event.target.value)}
          placeholder="English title"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-blue-600">中文标题</label>
        <input
          className="w-full rounded border border-blue-200 px-3 py-2 text-sm"
          value={zh}
          onChange={(event) => setZh(event.target.value)}
          placeholder="中文标题"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-full bg-white px-4 py-1.5 text-sm text-blue-600 hover:bg-blue-100"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          onClick={() => onConfirm({ en, zh })}
        >
          完成编辑
        </button>
      </div>
    </div>
  );
}

function InlineBlockEditor({
  block,
  lang,
  onSave,
  onCancel,
}: {
  block: BlockContent;
  lang: Lang;
  onSave: (block: BlockContent) => void;
  onCancel: () => void;
}) {
  const allowZh = lang === 'both';
  const [draft, setDraft] = useState<BlockContent>(() => cloneBlock(block));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(cloneBlock(block));
  }, [block]);

  const commit = () => {
    setError(null);
    switch (draft.type) {
      case 'paragraph':
      case 'heading':
      case 'quote': {
        const b: ContentBlock = draft as ContentBlock;
        const en = inlineToPlain(b.content?.en).trim();
        const zh = inlineToPlain(b.content?.zh).trim();
        if (!en && !zh) {
          setError('至少保留一种语言的内容');
          return;
        }
        break;
      }
      case 'math':
        if (!(draft as any).latex?.trim()) {
          setError('LaTeX 不能为空');
          return;
        }
        break;
      case 'code':
        if (!(draft as any).code?.trim()) {
          setError('代码内容不能为空');
          return;
        }
        break;
      default:
        break;
    }
    onSave(draft);
  };

  const renderEditor = () => {
    switch (draft.type) {
      case 'paragraph':
      case 'quote':
      case 'heading': {
        const b = draft as ContentBlock;

        return (
          <div className="space-y-3">
            <TextAreaField
              label="English Content"
              value={inlineToPlain(b.content?.en)}
              onChange={(value) =>
                setDraft((prev) => {
                  const p = prev as ContentBlock;
                  const nextContent = { ...(p.content ?? {}), en: plainToInline(value) };
                  const next: ContentBlock = { ...p, content: nextContent };
                  return next as BlockContent;
                })
              }
              minRows={draft.type === 'heading' ? 2 : 4}
            />
            <TextAreaField
              label="中文内容"
              value={inlineToPlain(b.content?.zh)}
              onChange={(value) =>
                setDraft((prev) => {
                  const p = prev as ContentBlock;
                  const nextContent = { ...(p.content ?? {}), zh: plainToInline(value) };
                  const next: ContentBlock = { ...p, content: nextContent };
                  return next as BlockContent;
                })
              }
              minRows={draft.type === 'heading' ? 2 : 4}
            />
            {draft.type === 'quote' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-blue-600">引用来源</label>
                <input
                  value={(draft as any).author ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const p = prev as any;
                      return { ...p, author: event.target.value } as BlockContent;
                    })
                  }
                  className="w-full rounded border border-blue-200 px-3 py-2 text-sm"
                  placeholder="作者 / 来源"
                />
              </div>
            )}
          </div>
        );
      }
      case 'math':
        return (
          <TextAreaField
            label="LaTeX"
            value={(draft as any).latex ?? ''}
            onChange={(value) =>
              setDraft((prev) => {
                const p = prev as any;
                return { ...p, latex: value } as BlockContent;
              })
            }
            minRows={6}
            monospace
            placeholder="输入行间公式 LaTeX"
          />
        );
      case 'code':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-blue-600">语言</label>
              <input
                value={(draft as any).language ?? ''}
                onChange={(event) =>
                  setDraft((prev) => {
                    const p = prev as any;
                    return { ...p, language: event.target.value } as BlockContent;
                  })
                }
                className="w-40 rounded border border-blue-200 px-3 py-2 text-sm"
              />
            </div>
            <TextAreaField
              label="代码内容"
              value={(draft as any).code ?? ''}
              onChange={(value) =>
                setDraft((prev) => {
                  const p = prev as any;
                  return { ...p, code: value } as BlockContent;
                })
              }
              minRows={12}
              monospace
            />
          </div>
        );
      default:
        return (
          <div className="rounded border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-600">
            当前类型暂不支持在阅读界面直接编辑，请在完整编辑器中操作。
          </div>
        );
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-blue-300 bg-white p-4 shadow-lg space-y-3">
      {renderEditor()}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          onClick={commit}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  minRows = 4,
  monospace,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  monospace?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-blue-600">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded border border-blue-200 px-3 py-2 text-sm ${monospace ? 'font-mono' : ''}`}
        rows={minRows}
        placeholder={placeholder}
      />
    </div>
  );
}

function inlineToPlain(nodes?: InlineContent[]): string {
  if (!nodes?.length) return '';
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.content ?? '';
        case 'inline-math':
          return node.latex ?? '';
        case 'link':
          return inlineToPlain(node.children);
        case 'citation':
          return node.displayText ?? '';
        default:
          return '';
      }
    })
    .join('');
}

function plainToInline(text: string): InlineContent[] {
  const trimmed = text ?? '';
  if (!trimmed) return [];
  return [{ type: 'text', content: trimmed }];
}
