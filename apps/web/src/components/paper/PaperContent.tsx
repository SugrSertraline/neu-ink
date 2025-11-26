// src/components/paper/PaperContent.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type {
  Section,
  BlockContent,
  Reference,
  PaperContent as PaperContentModel,
} from '@/types/paper';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditorStore } from '@/store/editor/editorStore';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { calculateAllNumbers } from './utils/autoNumbering';
import { toast } from 'sonner';
import { translationService } from '@/lib/services/translation';

// 导入重构后的组件
import { PaperSection } from './PaperSections';
import { PaperBlock } from './PaperBlocks';
import { InlineTextParserEditor } from './PaperParsing';
import { SectionTitleInlineEditor } from './PaperDialogs/SectionTitleInlineEditor';
import { RootSectionContextMenu } from './PaperContext';

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

  onSectionTitleUpdate?: (
    sectionId: string,
    title: { en: string; zh: string },
    paperId?: string,
    userPaperId?: string | null,
    isPersonalOwner?: boolean,
    onSaveToServer?: (blockId: string, sectionId: string) => Promise<void>,
  ) => void;

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

  onBlockAppendSubsection?: (
    blockId: string,
    paperId: string,
    userPaperId: string | null,
    isPersonalOwner: boolean,
    onSaveToServer?: (blockId: string, sectionId: string) => Promise<void>,
  ) => void;

  onAddBlockAsSection?: (sectionData: {
    id: string;
    title: string;
    titleZh: string;
    content: any[];
  }) => void;

  onAddHeadingToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    headingBlock: any,
  ) => void;

  onAddParagraphToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    paragraphBlock: any,
  ) => void;

  onAddOrderedListToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    orderedListBlock: any,
  ) => void;

  onAddUnorderedListToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    unorderedListBlock: any,
  ) => void;

  /** 新增的公式块插入到 Section */
  onAddMathToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    mathBlock: any,
  ) => void;

  onAddFigureToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    figureBlock: any,
  ) => void;

  onAddTableToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    tableBlock: any,
  ) => void;

  onCreateSectionWithHeading?: (
    title: string,
    titleZh: string,
    headingBlock: any,
  ) => void;

  onBlockAddComponent?: (blockId: string, type: BlockContent['type']) => void;

  onParseTextAdd?: (
    sectionId: string,
    text: string,
    afterBlockId?: string,
  ) => Promise<{
    success: boolean;
    blocks?: BlockContent[];
    error?: string;
  }>;

  // 解析完成后把生成的 blocks 写入
  onParseTextComplete?: (
    sectionId: string,
    blocks: BlockContent[],
    afterBlockId?: string,
    paperData?: any,
  ) => void;

  onStartTextParse?: (sectionId: string) => void;

  onSaveToServer?: (blockId: string, sectionId: string) => Promise<void>;

  /** ParseProgressModal 需要的回调 */
  onParseComplete?: (result: any) => void;

  /** 笔记相关 */
  notesByBlock?: Record<string, any[]>;

  isPersonalOwner?: boolean;
  paperId?: string;
  userPaperId?: string | null;

  updateSections?: (
    updater: (
      sections: Section[],
    ) => {
      sections: Section[];
      touched: boolean;
    },
  ) => void;
}

const cloneBlock = <T extends BlockContent>(block: T): T =>
  JSON.parse(JSON.stringify(block));

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
  onAddBlockAsSection,
  onAddHeadingToSection,
  onAddParagraphToSection,
  onAddOrderedListToSection,
  onAddUnorderedListToSection,
  onAddMathToSection,
  onAddFigureToSection,
  onAddTableToSection,
  onCreateSectionWithHeading,
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

  const extractInlineText = (nodes?: any[]): string => {
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
          extractInlineText((block as any).content?.en),
          extractInlineText((block as any).content?.zh),
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
          extractInlineText((block as any).content?.en),
          extractInlineText((block as any).content?.zh),
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
  const { currentEditingId, clearCurrentEditing, setHasUnsavedChanges, switchToEdit } = useEditorStore();
  
  // 辅助函数
  const isEditing = useCallback((id: string) => currentEditingId === id, [currentEditingId]);
  const clearEditing = useCallback(() => clearCurrentEditing(), [clearCurrentEditing]);
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [textParseSectionId, setTextParseSectionId] = useState<string | null>(null);
  const [textParseBlockId, setTextParseBlockId] = useState<string | null>(null);
  const [translationResult, setTranslationResult] = useState<{ sectionId: string; translatedText: string } | null>(null);
  
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
      onSectionTitleUpdate?.(sectionId, title, paperId, userPaperId, isPersonalOwner, async () => {
        if (onSaveToServer) {
          // 对于 section 标题更新，我们需要一个特殊的处理，因为它不涉及特定的 block
          // 这里我们可以传递一个特殊的 block ID 或者修改 API 来处理 section 更新
          // 暂时使用一个临时的 block ID
          await onSaveToServer('section-title', sectionId);
        }
      });
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
      requestAnimationFrame(async () => {
        try {
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
        } catch (error) {
          console.error('切换编辑状态时出错:', error);
        }
      });
    },
    [switchToEdit, renamingSectionId, setActiveBlockId],
  );

  const handleSectionEditStart = useCallback(
    async (sectionId: string) => {
      requestAnimationFrame(async () => {
        try {
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
        } catch (error) {
          console.error('切换章节编辑状态时出错:', error);
        }
      });
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

  // 处理快速翻译功能
  const handleQuickTranslate = useCallback(async (sectionId: string, title: string) => {
    if (!title || !title.trim()) {
      toast.error('章节标题为空，无法翻译');
      return;
    }

    try {
      toast.loading('正在翻译中...', { id: 'translate-loading' });
      
      // 调用翻译API，只翻译英文标题，使用 GLM-4.5-Air 模型
      const result = await translationService.quickTranslation({
        text: title.trim(),
        model: 'glm-4.5-air',
        temperature: 0.1,
        maxTokens: 1000
      });

      toast.dismiss('translate-loading');
      
      // 检查响应是否成功
      if (result && result.translatedText) {
        console.log('翻译成功:', result);
        
        // 保存翻译结果到状态
        setTranslationResult({ sectionId, translatedText: result.translatedText });
        
        requestAnimationFrame(async () => {
          try {
            await handleSectionEditStart(sectionId);
            toast.success('翻译完成，已自动填入中文标题');
          } catch (error) {
            console.error('进入编辑状态时出错:', error);
            toast.error('进入编辑状态失败，请重试');
          }
        });
      } else {
        console.error('翻译响应无效:', result);
        toast.error('翻译失败，请重试');
      }
    } catch (error) {
      toast.dismiss('translate-loading');
      console.error('翻译失败:', error);
      toast.error('翻译失败，请重试');
    }
  }, [handleSectionEditStart, paperId, userPaperId, isPersonalOwner, onSaveToServer]);

  // 将渲染函数移到useMemo外部，避免在渲染过程中创建新函数
  const renderSection = useCallback((
    section: Section,
    path: number[],
    siblings: Section[],
    index: number,
    parentSectionId: string | null,
  ): React.ReactNode => {
    // 辅助函数：从 contentWithNumbers 中找到对应 ID 的章节
    const findSectionById = (id: string, sections: Section[]): Section | null => {
      for (const section of sections) {
        if (section.id === id) return section;
      }
      return null;
    };

    // 获取带有编号的章节
    const numberedSection = findSectionById(section.id, contentWithNumbers.sections) || section;
    const sectionNumber = generateSectionNumber(path);
    const isRenaming = renamingSectionId === numberedSection.id;
    const isFirstSibling = index === 0;
    const isLastSibling = index === siblings.length - 1;

    return (
      <PaperSection
        key={numberedSection.id}
        section={section}
        numberedSection={numberedSection}
        sectionNumber={sectionNumber}
        path={path}
        siblings={siblings}
        index={index}
        parentSectionId={parentSectionId}
        searchQuery={searchQuery}
        canEditContent={canEditContent}
        renamingSectionId={renamingSectionId}
        hoveredSectionId={hoveredSectionId}
        isRenaming={isRenaming}
        isFirstSibling={isFirstSibling}
        isLastSibling={isLastSibling}
        onSectionEditStart={handleSectionEditStart}
        onSectionInsert={onSectionInsert || (() => {})}
        onSectionMove={onSectionMove || (() => {})}
        onSectionDelete={onSectionDelete || (() => {})}
        onSectionAddBlock={onSectionAddBlock || (() => {})}
        onStartTextParse={handleStartTextParse}
        onQuickTranslate={handleQuickTranslate}
        onSectionRenameConfirm={handleSectionRenameConfirm}
        setRenamingSectionId={setRenamingSectionId}
        setHoveredSectionId={setHoveredSectionId}
        setTranslationResult={setTranslationResult}
        translationResult={translationResult}
        lang={lang}
        sectionTitleEditor={
          isRenaming ? (
            <SectionTitleInlineEditor
              key={numberedSection.id}
              initialTitle={numberedSection}
              lang={lang}
              onCancel={() => {
                requestAnimationFrame(() => {
                  setRenamingSectionId(null);
                  setTranslationResult(null);
                });
              }}
              onConfirm={(title) => {
                handleSectionRenameConfirm(numberedSection.id, title);
                requestAnimationFrame(() => {
                  setTranslationResult(null);
                });
              }}
              externalZhValue={translationResult?.sectionId === numberedSection.id ? translationResult.translatedText : undefined}
            />
          ) : undefined
        }
      >
        {numberedSection.content?.map((block, blockIndex) => {
          const isEditingBlock = isEditing(block.id);
          const isSelected = selectedBlockId === block.id;
          const isActive = isSelected || activeBlockId === block.id;

          // 检查是否需要显示内联文本解析编辑器
          const showBlockTextParser = canEditContent && textParseBlockId === block.id;
          
          if (showBlockTextParser) {
            return (
              <React.Fragment key={block.id}>
                <PaperBlock
                  key={block.id}
                  block={block}
                  sectionId={numberedSection.id}
                  sectionTitle={String(numberedSection.title || numberedSection.titleZh || '未命名章节')}
                  blockIndex={blockIndex}
                  totalBlocks={numberedSection.content?.length || 0}
                  searchQuery={searchQuery}
                  references={references}
                  canEditContent={canEditContent}
                  isPersonalOwner={isPersonalOwner}
                  paperId={paperId}
                  userPaperId={userPaperId}
                  activeBlockId={activeBlockId}
                  selectedBlockId={selectedBlockId || null}
                  contentRef={contentRef}
                  notesCount={notesByBlock[block.id]?.length || 0}
                  lang={lang}
                  setActiveBlockId={setActiveBlockId}
                  onBlockClick={onBlockClick}
                  onBlockEditStart={handleBlockEditStart}
                  onBlockUpdate={onBlockUpdate || (() => {})}
                  onBlockDuplicate={onBlockDuplicate || (() => {})}
                  onBlockDelete={onBlockDelete || (() => {})}
                  onBlockInsert={onBlockInsert || (() => {})}
                  onBlockMove={onBlockMove || (() => {})}
                  onBlockAddComponent={onBlockAddComponent || (() => {})}
                  onStartTextParse={handleStartBlockTextParse}
                  onAddSectionBelow={(sectionId: string) => (onBlockInsert || (() => {}))(sectionId, 'below')}
                  onSaveToServer={onSaveToServer || (() => Promise.resolve())}
                  onParseComplete={onParseComplete || (() => {})}
                  onParsePreview={(data: any) => (onParseTextComplete || (() => {}))(data.sectionId, data.blocks, data.afterBlockId, data.paperData)}
                  onAddBlockAsSection={onAddBlockAsSection}
                  onAddHeadingToSection={onAddHeadingToSection}
                  onAddParagraphToSection={onAddParagraphToSection}
                  onAddOrderedListToSection={onAddOrderedListToSection}
                  onAddUnorderedListToSection={onAddUnorderedListToSection}
                  onAddMathToSection={onAddMathToSection}
                  onAddFigureToSection={onAddFigureToSection}
                  onAddTableToSection={onAddTableToSection}
                  onCreateSectionWithHeading={onCreateSectionWithHeading}
                  allSections={sections}
                  streamProgressData={streamProgressData}
                />
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
              <PaperBlock
                block={block}
                sectionId={numberedSection.id}
                sectionTitle={String(numberedSection.title || numberedSection.titleZh || '未命名章节')}
                blockIndex={blockIndex}
                totalBlocks={numberedSection.content?.length || 0}
                searchQuery={searchQuery}
                references={references}
                canEditContent={canEditContent}
                isPersonalOwner={isPersonalOwner}
                paperId={paperId}
                userPaperId={userPaperId}
                activeBlockId={activeBlockId}
                selectedBlockId={selectedBlockId || null}
                contentRef={contentRef}
                notesCount={notesByBlock[block.id]?.length || 0}
                lang={lang}
                setActiveBlockId={setActiveBlockId}
                onBlockClick={onBlockClick}
                onBlockEditStart={handleBlockEditStart}
                onBlockUpdate={onBlockUpdate || (() => {})}
                onBlockDuplicate={onBlockDuplicate || (() => {})}
                onBlockDelete={onBlockDelete || (() => {})}
                onBlockInsert={onBlockInsert || (() => {})}
                onBlockMove={onBlockMove || (() => {})}
                onBlockAddComponent={onBlockAddComponent || (() => {})}
                onStartTextParse={handleStartBlockTextParse}
                onAddSectionBelow={(sectionId: string) => (onBlockInsert || (() => {}))(sectionId, 'below')}
                onSaveToServer={onSaveToServer || (() => Promise.resolve())}
                onParseComplete={onParseComplete || (() => {})}
                onParsePreview={(data: any) => (onParseTextComplete || (() => {}))(data.sectionId, data.blocks, data.afterBlockId, data.paperData)}
                onAddBlockAsSection={onAddBlockAsSection}
                onAddHeadingToSection={onAddHeadingToSection}
                onAddParagraphToSection={onAddParagraphToSection}
                onAddOrderedListToSection={onAddOrderedListToSection}
                onAddUnorderedListToSection={onAddUnorderedListToSection}
                onAddMathToSection={onAddMathToSection}
                onAddFigureToSection={onAddFigureToSection}
                onAddTableToSection={onAddTableToSection}
                onCreateSectionWithHeading={onCreateSectionWithHeading}
                allSections={sections}
                streamProgressData={streamProgressData}
              />
            </React.Fragment>
          );
        })}
      </PaperSection>
    );
  }, [
    contentWithNumbers.sections,
    searchQuery,
    references,
    activeBlockId,
    selectedBlockId,
    canEditContent,
    renamingSectionId,
    hoveredSectionId,
    textParseBlockId,
    textParseSectionId,
    isEditing,
    notesByBlock,
    isPersonalOwner,
    paperId,
    userPaperId,
    streamProgressData,
    lang,
    translationResult,
    // 回调函数
    handleSectionEditStart,
    handleSectionRenameConfirm,
    handleBlockEditStart,
    handleStartTextParse,
    handleParseTextComplete,
    handleStartBlockTextParse,
    handleStreamParseComplete,
    handleStreamProgressUpdate,
    handleQuickTranslate,
    setActiveBlockId,
    onBlockClick,
    onSectionInsert,
    onSectionMove,
    onSectionDelete,
    onSectionAddBlock,
    onBlockUpdate,
    onBlockDuplicate,
    onBlockDelete,
    onBlockInsert,
    onBlockMove,
    onBlockAddComponent,
    onParseTextAdd,
    onParseComplete,
    onSaveToServer,
    onAddBlockAsSection,
    onAddHeadingToSection,
    onAddParagraphToSection,
    onAddOrderedListToSection,
    onAddUnorderedListToSection,
    onAddMathToSection,
    onAddFigureToSection,
    onAddTableToSection,
    onCreateSectionWithHeading,
    sections,
    setRenamingSectionId,
    setHoveredSectionId,
    setTranslationResult,
    contentRef,
  ]);

  const renderedTree = useMemo(() => {
    // 使用稳定化的渲染函数，避免在渲染过程中触发状态更新
    return contentWithNumbers.sections.map((section, index) =>
      renderSection(section, [index + 1], contentWithNumbers.sections, index, null),
    );
  }, [contentWithNumbers.sections, renderSection]);

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
    </>
  );
}