'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import {
  BlockContent,
  ParagraphBlock,
  HeadingBlock,
  InlineContent,
  Reference,
  Section,

} from '@/types/paper';
import type { ParsingBlock } from '@/types/paper/content';
import InlineRenderer from './InlineRenderer';
import TextSelectionToolbar from './TextSelectionToolbar';
import ParseProgressBlock from './ParseProgressBlock';
import ParsedBlocksConfirmDialog from './ParsedBlocksConfirmDialog';
import ParseResultsManager from './ParseResultsManager';
import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  applyTextColor,
  applyBackgroundColor,
  clearAllStyles,
} from './utils/inlineContentUtils';
import katex from 'katex';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditorStore } from '@/store/editor/editorStore';
import BlockEditor from './editor/BlockEditor';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { translationService } from '@/lib/services/translation';
import { BlockContextMenu } from './PaperContext';
import { PdfBlockHoverCard } from './PdfBlockHoverCard';

/** ===================== 工具与类型 ===================== */

interface BlockRendererProps {
  block: BlockContent;
  lang: 'en' | 'both';
  isActive?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  references?: Reference[];
  onCitationClick?: (refIds: string[]) => void;
  searchQuery?: string;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  onBlockUpdate?: (block: BlockContent) => void;
  highlightedRefs?: string[];
  setHighlightedRefs?: (refs: string[]) => void;

  /** 以下为编辑态需要的额外回调，若父组件无需开放可忽略 */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onAddBlockAfter?: (type: BlockContent['type']) => void;
  allSections?: Section[];

  /** 保存到服务器的回调 */
  onSaveToServer?: (blockId: string, sectionId: string) => Promise<void>;

  /** 笔记相关 */
  notesCount?: number;
  isPersonalOwner?: boolean;

  /** ParseProgressBlock 需要的属性 */
  paperId?: string;
  sectionId?: string;
  onParseComplete?: (result: any) => void;
  onParsePreview?: (data: {
    type: 'preview' | 'cancel';
    blockId: string;
    parsedBlocks?: BlockContent[];
    sessionId?: string;
    parseId?: string;
  }) => void;
  userPaperId?: string | null;
  streamProgressData?: Record<
    string,
    {
      message: string;
      progress: number;
      sessionId?: string;
    }
  >;

  /** 翻译相关 */
  isUserPaper?: boolean; // 是否为用户论文

  /** 添加为章节相关 */
  onAddBlockAsSection?: (sectionData: {
    id: string;
    title: string;
    titleZh: string;
    content: any[];
  }) => void;

  /** 添加为标题相关 */
  onAddHeadingToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    headingBlock: any,
  ) => void;

  /** 添加为段落相关 */
  onAddParagraphToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    paragraphBlock: any,
  ) => void;

  /** 添加为有序列表相关 */
  onAddOrderedListToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    orderedListBlock: any,
  ) => void;

  /** 添加为无序列表相关 */
  onAddUnorderedListToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    unorderedListBlock: any,
  ) => void;

  /** 添加为公式相关（你要新增的这个） */
  onAddMathToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    mathBlock: any,
  ) => void;

  /** 添加为图片相关 */
  onAddFigureToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    figureBlock: any,
  ) => void;

  /** 添加为表格相关 */
  onAddTableToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    tableBlock: any,
  ) => void;

  /** 创建章节并添加标题相关 */
  onCreateSectionWithHeading?: (
    title: string,
    titleZh: string,
    headingBlock: any,
  ) => void;
}


type InlineRendererBaseProps = Omit<ComponentProps<typeof InlineRenderer>, 'nodes'>;
type LocalizedInlineValue = Partial<Record<'en' | 'zh', InlineContent[] | string | number>>;

const cloneBlock = (b: BlockContent): BlockContent => JSON.parse(JSON.stringify(b));

const hasLocalizedContent = (value: unknown): value is LocalizedInlineValue => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return 'en' in candidate || 'zh' in candidate;
};

const COMPONENT_LABEL_MAP: Record<
  | BlockContent['type']
  | 'tableHeader'
  | 'tableCell'
  | 'figureCaption'
  | 'figureDesc'
  | 'tableCaption'
  | 'tableDesc'
  | 'codeCaption'
  | 'listItem'
  | 'loading'
  | 'parsing',
  string
> = {
  heading: '标题',
  paragraph: '段落',
  math: '公式',
  figure: '图片',
  table: '表格',
  code: '代码',
  'ordered-list': '列表',
  'unordered-list': '列表',
  quote: '引用',
  divider: '分割线',
  loading: '加载中',
  parsing: '解析中',
  tableHeader: '表格',
  tableCell: '表格',
  figureCaption: '图片',
  figureDesc: '图片',
  tableCaption: '表格',
  tableDesc: '表格',
  codeCaption: '代码',
  listItem: '列表',
};

/** ===================== 中英文样式常量 ===================== */

const ZH_INLINE_CLASS = 'inline-block rounded px-1 bg-amber-50';
const ZH_BLOCK_CLASS = 'rounded px-2 py-0.5 bg-amber-50';
const ZH_PLACEHOLDER_CLASS = 'inline-block rounded px-1 bg-gray-100 text-gray-500 italic';

const zhPlaceholder = (label: string) => (
  <span className={ZH_PLACEHOLDER_CLASS}>{`该${label}组件未配置中文`}</span>
);

const hasZh = (v?: InlineContent[] | string | number | null): boolean => {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
};

const renderInlineValue = (
  value: unknown,
  lang: 'en' | 'zh',
  baseProps: InlineRendererBaseProps,
  opts?: { componentLabel?: string; wrapZhBg?: boolean }
): ReactNode => {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    if (lang === 'zh' && opts?.wrapZhBg) {
      return (
        <span className={ZH_INLINE_CLASS}>
          <InlineRenderer nodes={value as InlineContent[]} {...baseProps} />
        </span>
      );
    }
    return <InlineRenderer nodes={value as InlineContent[]} {...baseProps} />;
  }

  if (hasLocalizedContent(value)) {
    const lv = value as LocalizedInlineValue;
    const preferred = lv[lang] ?? lv.en ?? lv.zh ?? [];

    if (lang === 'zh') {
      if (!hasZh(lv.zh)) {
        return zhPlaceholder(opts?.componentLabel ?? '组件');
      }
      if (Array.isArray(preferred)) {
        return (
          <span className={ZH_INLINE_CLASS}>
            <InlineRenderer nodes={preferred as InlineContent[]} {...baseProps} />
          </span>
        );
      }
      return (
        <span className={ZH_INLINE_CLASS}>
          {typeof preferred === 'object' ? JSON.stringify(preferred) : String(preferred)}
        </span>
      );
    }

    if (Array.isArray(preferred)) {
      return <InlineRenderer nodes={preferred as InlineContent[]} {...baseProps} />;
    }
    return typeof preferred === 'object' ? JSON.stringify(preferred) : String(preferred);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    if (lang === 'zh' && opts?.wrapZhBg) {
      return <span className={ZH_INLINE_CLASS}>{String(value)}</span>;
    }
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return null;
};

/** ===================== KaTeX 块渲染 ===================== */

interface BlockMathProps {
  math: string;
  className?: string;
}

export function BlockMath({ math, className }: BlockMathProps) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mathRef.current || !math) return;
    try {
      katex.render(math, mathRef.current, {
        throwOnError: false,
        displayMode: true,
      });
    } catch (err) {
      mathRef.current.textContent = `$$${math}$$`;
    }
  }, [math]);

  return <div ref={mathRef} className={className} />;
}

const resolveMediaUrl = (src?: string) => {
  if (!src) return '';
  if (/^(https?:|data:|\/\/)/i.test(src)) return src;
  if (typeof window !== 'undefined') {
    try {
      return new URL(src, window.location.origin).href;
    } catch (err) {
      // ignore
    }
  }
  return src;
};

/** ===================== 主组件 ===================== */

function BlockRenderer({
  block,
  lang,
  isActive = false,
  onMouseEnter,
  onMouseLeave,
  references = [],
  onCitationClick,
  searchQuery = '',
  contentRef,
  onBlockUpdate,
  highlightedRefs,
  setHighlightedRefs,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  canMoveUp,
  canMoveDown,
  onAddBlockAfter,
  allSections = [],
  onSaveToServer,
  notesCount = 0,
  isPersonalOwner = false,
  paperId,
  sectionId,
  onParseComplete,
  onParsePreview,
  userPaperId,
  streamProgressData,
  isUserPaper = false,
  onAddBlockAsSection,
  onAddHeadingToSection,
  onAddParagraphToSection,
  onAddOrderedListToSection,
  onAddUnorderedListToSection,
  onAddFigureToSection,
  onAddTableToSection,
  onCreateSectionWithHeading,
}: BlockRendererProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  const { hasUnsavedChanges, setHasUnsavedChanges, switchToEdit, clearCurrentEditing, currentEditingId } = useEditorStore();
  const inlineEditingEnabled = canEditContent && typeof onBlockUpdate === 'function';

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  // 使用全局状态而不是本地状态，避免状态不同步
  const isEditing = currentEditingId === block.id;
  const [draftBlock, setDraftBlock] = useState<BlockContent>(() => cloneBlock(block));
  const [isSaving, setIsSaving] = useState(false);
  const [showParseResultsManager, setShowParseResultsManager] = useState(false);
  const [parseResultsData, setParseResultsData] = useState<{
    parseId: string;
    tempBlockId: string;
    blockId: string;
  } | null>(null);

  useEffect(() => {
    if (!isEditing) return;
    const unchanged = JSON.stringify(draftBlock) === JSON.stringify(block);
    setHasUnsavedChanges(!unchanged);
  }, [draftBlock, block, isEditing, setHasUnsavedChanges]);

  const blockRef = useRef<HTMLDivElement>(null);
  const editPanelRef = useRef<HTMLDivElement>(null);
  const fallbackContentRef = useRef<HTMLDivElement | null>(null);
  const [localHighlightedRefs, setLocalHighlightedRefs] = useState<string[]>([]);
  const wasEditingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!inlineEditingEnabled && showToolbar) {
      setShowToolbar(false);
    }
  }, [inlineEditingEnabled, showToolbar]);

  useEffect(() => {
    if (!isEditing) {
      setDraftBlock(cloneBlock(block));
    }
  }, [block, isEditing]);

  useEffect(() => {
    if (!inlineEditingEnabled && isEditing) {
      clearCurrentEditing();
      setDraftBlock(cloneBlock(block));
    }
  }, [inlineEditingEnabled, isEditing, block, clearCurrentEditing]);

  useEffect(() => {
    if (isEditing && showToolbar) {
      setShowToolbar(false);
      setToolbarPos(null);
      setSelectedText('');
    }
  }, [isEditing, showToolbar]);

  useEffect(() => {
    if (isEditing) {
      const target = editPanelRef.current ?? blockRef.current;
      target?.scrollIntoView({ behavior: 'auto', block: 'center' });
    } else if (wasEditingRef.current) {
      blockRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
    wasEditingRef.current = isEditing;
  }, [isEditing]);

  const effectiveContentRef = contentRef ?? fallbackContentRef;
  const effectiveHighlightedRefs = highlightedRefs ?? localHighlightedRefs;

  const handleHighlightedRefs = useCallback(
    (ids: string[]) => {
      if (setHighlightedRefs) {
        setHighlightedRefs(ids);
      } else {
        setLocalHighlightedRefs(ids);
      }
      if (ids.length > 0) {
        onCitationClick?.(ids);
      }
    },
    [setHighlightedRefs, onCitationClick]
  );

  const inlineRendererBaseProps = useMemo(() => ({
    searchQuery,
    highlightedRefs: effectiveHighlightedRefs,
    setHighlightedRefs: handleHighlightedRefs,
    contentRef: effectiveContentRef,
    references,
  }), [searchQuery, effectiveHighlightedRefs, handleHighlightedRefs, effectiveContentRef, references]);

  const baseClass = `transition-all duration-200 rounded-lg ${
    isActive ? 'bg-blue-50 ring-2 ring-blue-200 shadow-sm' : ''
  }`;

  const enterEditMode = useCallback(() => {
    if (!inlineEditingEnabled || isEditing) return;
    
    // 先设置本地状态，立即响应UI
    setDraftBlock(cloneBlock(block));
    
    // 直接切换编辑状态
    switchToEdit(block.id, {
      onRequestSave: ({ currentId }: { currentId: string }) => {
        // TODO: auto-save before switching block
      },
    }).catch((error) => {
      // 如果切换失败，恢复原状态
      console.error('Failed to switch edit mode:', error);
      setDraftBlock(cloneBlock(block));
    });
  }, [inlineEditingEnabled, isEditing, block, switchToEdit]);

  const handleWrapperClick = useCallback((_event: MouseEvent<HTMLDivElement>) => {
    // 禁用左键点击进入编辑状态
    return;
  }, []);

  const handleCancelEdit = useCallback(() => {
    setDraftBlock(cloneBlock(block));
    setHasUnsavedChanges(false);
    clearCurrentEditing();
  }, [block, setHasUnsavedChanges, clearCurrentEditing]);

  const handleSaveEdit = useCallback(async () => {
    if (!onBlockUpdate) {
      setDraftBlock(cloneBlock(block));
      clearCurrentEditing();
      return;
    }

    if (JSON.stringify(draftBlock) !== JSON.stringify(block)) {
      onBlockUpdate(draftBlock);
    }

    setDraftBlock(cloneBlock(draftBlock));
    setHasUnsavedChanges(false);
    clearCurrentEditing();

    if (onSaveToServer && sectionId) {
      setIsSaving(true);
      try {
        // 传递 block ID 和 section ID，而不是整个论文
        await onSaveToServer(block.id, sectionId);
      } catch (err) {
        // 错误在 onSaveToServer 里处理
      } finally {
        setIsSaving(false);
      }
    }
  }, [draftBlock, block, onBlockUpdate, setHasUnsavedChanges, clearCurrentEditing, onSaveToServer, sectionId]);

  const handleTextSelection = useCallback(
    (_e: MouseEvent<HTMLElement>) => {
      if (block.type !== 'paragraph' && block.type !== 'heading') return;
      if (!inlineEditingEnabled || !onBlockUpdate || isEditing) return;

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text) {
          setShowToolbar(false);
          setToolbarPos(null);
          setSelectedText('');
          return;
        }

        const range = selection?.getRangeAt(0);
        if (!range) {
          setShowToolbar(false);
          setToolbarPos(null);
          setSelectedText('');
          return;
        }

        const element = blockRef.current;
        if (!element || !element.contains(range.commonAncestorContainer)) {
          setShowToolbar(false);
          setToolbarPos(null);
          setSelectedText('');
          return;
        }

        if (selection && selection.rangeCount > 0) {
          const currentRange = selection.getRangeAt(0);
          const rect = currentRange.getBoundingClientRect();
          if (rect) {
            setSelectedText(text);
            setToolbarPos({
              x: rect.right,
              y: rect.top,
            });
            setShowToolbar(true);
          }
        }
      }, 10);
    },
    [block, inlineEditingEnabled, onBlockUpdate, isEditing]
  );

  const handleToolbarClose = useCallback(() => {
    setShowToolbar(false);
    setToolbarPos(null);
    setSelectedText('');
  }, []);

  useEffect(() => {
    if (!showToolbar || isEditing) return; // 在编辑状态下不显示工具栏

    const handleGlobalClick = (event: Event) => {
      const mouseEvent = event as unknown as MouseEvent;
      const target = mouseEvent.target as HTMLElement;

      if (target.closest('[data-text-selection-toolbar]')) {
        return;
      }

      const selection = window.getSelection();
      const currentText = selection?.toString().trim();
      if (currentText && currentText === selectedText) {
        return;
      }

      handleToolbarClose();
    };

    const handleGlobalKeydown = (event: Event) => {
      const keyEvent = event as unknown as KeyboardEvent;
      if (keyEvent.key === 'Escape') {
        handleToolbarClose();
      }
    };

    // 使用防抖避免频繁触发
    const debounceTimer = setTimeout(() => {
      document.addEventListener('mousedown', handleGlobalClick);
      document.addEventListener('keydown', handleGlobalKeydown);
    }, 100);

    return () => {
      clearTimeout(debounceTimer);
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [showToolbar, selectedText, handleToolbarClose, isEditing]);

  const applyStyle = useCallback(
    (styleType: 'bold' | 'italic' | 'underline' | 'color' | 'bg' | 'clear', value?: string) => {
      if (!inlineEditingEnabled || !onBlockUpdate || !selectedText) return;

      const currentBlock = block as ParagraphBlock | HeadingBlock;
      // 现在只支持编辑英文内容
      const editLang: 'en' = 'en';
      const currentContent = currentBlock.content?.[editLang];
      if (!currentContent) return;

      let newContent = currentContent;

      switch (styleType) {
        case 'bold':
          newContent = toggleBold(currentContent, selectedText);
          break;
        case 'italic':
          newContent = toggleItalic(currentContent, selectedText);
          break;
        case 'underline':
          newContent = toggleUnderline(currentContent, selectedText);
          break;
        case 'color':
          if (value !== undefined) {
            newContent = applyTextColor(currentContent, selectedText, value);
          }
          break;
        case 'bg':
          if (value !== undefined) {
            newContent = applyBackgroundColor(currentContent, selectedText, value);
          }
          break;
        case 'clear':
          newContent = clearAllStyles(currentContent, selectedText);
          break;
      }

      const updatedBlock: BlockContent = {
        ...currentBlock,
        content: {
          ...currentBlock.content,
          [editLang]: newContent,
        } as typeof currentBlock.content,
      };

      onBlockUpdate(updatedBlock);

      setTimeout(() => {
        handleToolbarClose();
        window.getSelection()?.removeAllRanges();
      }, 100);
    },
    [block, inlineEditingEnabled, onBlockUpdate, selectedText, handleToolbarClose]
  );

  const renderBilingualHeading = (headingBlock: HeadingBlock) => {
    const headingSizes = {
      1: 'text-2xl',
      2: 'text-xl',
      3: 'text-lg',
      4: 'text-base',
      5: 'text-sm',
      6: 'text-xs',
    } as const;

    const enNodes = headingBlock.content?.en ?? [];
    const zhNodes = headingBlock.content?.zh;

    // 不使用系统自动计算的编号，直接显示原始标题内容（包含原始编号）
    const numberPart = null;

    // 在编辑状态下禁用文本选择，避免冲突
    const shouldHandleTextSelection = inlineEditingEnabled && !isEditing && !showToolbar;

    const renderContent = () => {
      if (lang === 'both') {
        const enPart = (
          <span className="mr-1 align-baseline text-gray-900">
            <InlineRenderer nodes={enNodes} {...inlineRendererBaseProps} />
          </span>
        );

        const slash = <span className="mx-1 text-gray-400">/</span>;

        const zhPart = hasZh(zhNodes) ? (
          <span className={`align-baseline ${ZH_INLINE_CLASS}`}>
            <InlineRenderer nodes={zhNodes as InlineContent[]} {...inlineRendererBaseProps} />
          </span>
        ) : (
          <span className={ZH_PLACEHOLDER_CLASS}>该标题组件未配置中文</span>
        );

        return (
          <>
            {enPart}
            {slash}
            {zhPart}
          </>
        );
      } else {
        return (
          <span className="align-baseline text-gray-900">
            <InlineRenderer nodes={enNodes} {...inlineRendererBaseProps} />
          </span>
        );
      }
    };

    const commonProps = {
      className: `${headingSizes[headingBlock.level]} font-bold text-gray-900 mb-2`,
      onMouseUp: shouldHandleTextSelection ? handleTextSelection : undefined,
      style: { userSelect: shouldHandleTextSelection ? 'text' as const : 'none' as const },
      children: (
        <>
          {numberPart}
          {renderContent()}
        </>
      ),
    };

    switch (headingBlock.level) {
      case 1:
        return <h1 {...commonProps} />;
      case 2:
        return <h2 {...commonProps} />;
      case 3:
        return <h3 {...commonProps} />;
      case 4:
        return <h4 {...commonProps} />;
      case 5:
        return <h5 {...commonProps} />;
      case 6:
        return <h6 {...commonProps} />;
      default:
        return <h2 {...commonProps} />;
    }
  };

  // 优化：将 renderContent 改为 useMemo，减少重新渲染
  const renderContent = useMemo(() => {
    switch (block.type) {
      case 'heading':
        return renderBilingualHeading(block);

      case 'paragraph': {
        const alignClass =
          {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
            justify: 'text-justify',
          }[block.align || 'left'] ?? 'text-left';

        // 在编辑状态下禁用文本选择，避免冲突
        const shouldHandleTextSelection = inlineEditingEnabled && !isEditing && !showToolbar;

        if (lang === 'both') {
          const enContent = block.content?.en ?? [];
          const zhContent = block.content?.zh;

          return (
            <div
              className={`text-gray-700 leading-relaxed space-y-2 ${alignClass}`}
              onMouseUp={shouldHandleTextSelection ? handleTextSelection : undefined}
              style={{ userSelect: shouldHandleTextSelection ? 'text' as const : 'none' as const }}
            >
              <div className="text-gray-800">
                <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
              </div>
              {hasZh(zhContent) ? (
                <div className={ZH_BLOCK_CLASS}>
                  <InlineRenderer
                    nodes={zhContent as InlineContent[]}
                    {...inlineRendererBaseProps}
                  />
                </div>
              ) : (
                <div className={ZH_PLACEHOLDER_CLASS}>该段落组件未配置中文</div>
              )}
            </div>
          );
        } else {
          return (
            <p
              className={`text-gray-700 leading-relaxed ${alignClass}`}
              onMouseUp={shouldHandleTextSelection ? handleTextSelection : undefined}
              style={{ userSelect: shouldHandleTextSelection ? 'text' as const : 'none' as const }}
            >
              <InlineRenderer nodes={block.content?.en ?? []} {...inlineRendererBaseProps} />
            </p>
          );
        }
      }

      case 'math':
        return (
          <div className="my-4">
            <div className="relative flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
              <BlockMath math={block.latex || ''} />
              {block.number && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  ({block.number})
                </div>
              )}
            </div>
          </div>
        );

      case 'figure': {
        const renderCaption = () => {
          if (lang === 'both') {
            const enCaption = block.caption?.en ?? [];
            const zhCaption = block.caption?.zh;

            return (
              <div className="space-y-1">
                <div className="text-gray-800">
                  <InlineRenderer nodes={enCaption} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhCaption) ? (
                  <div className={ZH_INLINE_CLASS}>
                    <InlineRenderer
                      nodes={zhCaption as InlineContent[]}
                      {...inlineRendererBaseProps}
                    />
                  </div>
                ) : (
                  <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                    该图片组件未配置中文
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        const renderDescription = () => {
          if (lang === 'both') {
            const enDesc = block.description?.en ?? [];
            const zhDesc = block.description?.zh;

            return (
              <div className="space-y-1">
                <div className="text-gray-800">
                  <InlineRenderer nodes={enDesc} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhDesc) ? (
                  <div className={ZH_INLINE_CLASS}>
                    <InlineRenderer
                      nodes={zhDesc as InlineContent[]}
                      {...inlineRendererBaseProps}
                    />
                  </div>
                ) : (
                  <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                    该图片组件未配置中文
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <InlineRenderer nodes={block.description?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        return (
          <figure className="my-6">
            {block.src ? (
              <img
                src={resolveMediaUrl(block.src)}
                alt={block.alt || ''}
                className="mx-auto max-w-2xl rounded-lg border border-gray-200 shadow-md"
                style={{
                  width: block.width || 'auto',
                  height: block.height || 'auto',
                }}
              />
            ) : (
              <div className="mx-auto max-w-2xl rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-12 text-center">
                <svg
                  className="mx-auto mb-3 h-16 w-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-400">图片未上传</p>
              </div>
            )}

            <figcaption className="mt-3 px-4 text-center text-sm text-gray-600">
              {block.number && (
                <span className="mr-1 font-semibold text-gray-800">
                  Figure {block.number}.
                </span>
              )}
              {renderCaption()}
            </figcaption>

            {(block.description?.en || block.description?.zh) && (
              <div className="mt-2 px-4 text-center text-xs text-gray-500">
                {renderDescription()}
              </div>
            )}
          </figure>
        );
      }

      case 'table': {
        const renderCaption = () => {
          if (lang === 'both') {
            const enCaption = block.caption?.en ?? [];
            const zhCaption = block.caption?.zh;

            return (
              <div className="space-y-1">
                <div className="text-gray-800">
                  <InlineRenderer nodes={enCaption} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhCaption) ? (
                  <div className={ZH_INLINE_CLASS}>
                    <InlineRenderer
                      nodes={zhCaption as InlineContent[]}
                      {...inlineRendererBaseProps}
                    />
                  </div>
                ) : (
                  <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                    该表格组件未配置中文
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        // 安全处理HTML内容，防止XSS攻击
        const sanitizeTableHTML = (html: string) => {
          if (!html) return '<table><tr><td>空表格</td></tr></table>';
          
          // 基本的HTML清理，只保留表格相关标签和基本属性
          return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script标签
            .replace(/on\w+="[^"]*"/gi, '') // 移除事件处理器
            .replace(/javascript:/gi, '') // 移除javascript:协议
            .replace(/vbscript:/gi, '') // 移除vbscript:协议
            .replace(/data:/gi, ''); // 移除data:协议
        };

        return (
          <div className="my-6">
            {(block.caption?.en || block.caption?.zh) && (
              <div className="mb-2 text-center text-sm font-medium text-gray-600">
                {block.number && (
                  <span className="mr-1 font-semibold text-gray-800">
                    Table {block.number}.
                  </span>
                )}
                {renderCaption()}
              </div>
            )}

            {/* 渲染HTML表格内容，添加样式和安全处理 */}
            <div
              className="mx-auto w-full rounded-lg border border-gray-200"
            >
              <div
                className="table-wrapper"
                dangerouslySetInnerHTML={{
                  __html: sanitizeTableHTML(block.content)
                }}
              />
            </div>
          </div>
        );
      }

      case 'code': {
        const renderCaption = () => {
          if (lang === 'both') {
            const enCaption = block.caption?.en ?? [];
            const zhCaption = block.caption?.zh;

            return (
              <div className="space-y-1">
                <div className="text-gray-800">
                  <InlineRenderer nodes={enCaption} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhCaption) ? (
                  <div className={ZH_INLINE_CLASS}>
                    <InlineRenderer
                      nodes={zhCaption as InlineContent[]}
                      {...inlineRendererBaseProps}
                    />
                  </div>
                ) : (
                  <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                    该代码组件未配置中文
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        return (
          <div className="my-4">
            {(block.caption?.en || block.caption?.zh) && (
              <div className="mb-2 text-xs text-gray-500">{renderCaption()}</div>
            )}
            <pre className="relative overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 shadow-md">
              {block.language && (
                <div className="absolute right-3 top-3 rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
                  {block.language}
                </div>
              )}
              <code className={block.showLineNumbers ? 'block' : ''}>{block.code}</code>
            </pre>
          </div>
        );
      }

      case 'ordered-list':
        return (
          <ol start={block.start ?? 1} className="my-3 list-decimal space-y-1.5 pl-6">
            {(block.items || []).map((item, i) => {
              const renderItemContent = () => {
                if (lang === 'both') {
                  const enContent = item.content?.en ?? [];
                  const zhContent = item.content?.zh;

                  return (
                    <div className="space-y-1">
                      <div className="text-gray-800">
                        <InlineRenderer
                          nodes={enContent}
                          {...inlineRendererBaseProps}
                        />
                      </div>
                      {hasZh(zhContent) ? (
                        <div className={ZH_BLOCK_CLASS}>
                          <InlineRenderer
                            nodes={zhContent as InlineContent[]}
                            {...inlineRendererBaseProps}
                          />
                        </div>
                      ) : (
                        <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                          该列表项未配置中文
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <InlineRenderer
                      nodes={item.content?.en ?? []}
                      {...inlineRendererBaseProps}
                    />
                  );
                }
              };

              return (
                <li key={i} className="leading-relaxed text-gray-700">
                  {renderItemContent()}
                </li>
              );
            })}
          </ol>
        );

      case 'unordered-list':
        return (
          <ul className="my-3 list-disc space-y-1.5 pl-6">
            {(block.items || []).map((item, i) => {
              const renderItemContent = () => {
                if (lang === 'both') {
                  const enContent = item.content?.en ?? [];
                  const zhContent = item.content?.zh;

                  return (
                    <div className="space-y-1">
                      <div className="text-gray-800">
                        <InlineRenderer
                          nodes={enContent}
                          {...inlineRendererBaseProps}
                        />
                      </div>
                      {hasZh(zhContent) ? (
                        <div className={ZH_BLOCK_CLASS}>
                          <InlineRenderer
                            nodes={zhContent as InlineContent[]}
                            {...inlineRendererBaseProps}
                          />
                        </div>
                      ) : (
                        <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                          该列表项未配置中文
                        </div>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <InlineRenderer
                      nodes={item.content?.en ?? []}
                      {...inlineRendererBaseProps}
                    />
                  );
                }
              };

              return (
                <li key={i} className="leading-relaxed text-gray-700">
                  {renderItemContent()}
                </li>
              );
            })}
          </ul>
        );

      case 'quote': {
        const renderQuoteContent = () => {
          if (lang === 'both') {
            const enContent = block.content?.en ?? [];
            const zhContent = block.content?.zh;

            return (
              <div className="space-y-2">
                <div className="italic text-gray-800">
                  <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhContent) ? (
                  <div className={`italic ${ZH_BLOCK_CLASS}`}>
                    <InlineRenderer
                      nodes={zhContent as InlineContent[]}
                      {...inlineRendererBaseProps}
                    />
                  </div>
                ) : (
                  <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                    该引用组件未配置中文
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="italic">
                <InlineRenderer nodes={block.content?.en ?? []} {...inlineRendererBaseProps} />
              </div>
            );
          }
        };

        return (
          <blockquote className="my-4 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 text-gray-600">
            {renderQuoteContent()}
            {block.author && (
              <div className="mt-2 text-right text-sm font-medium not-italic text-gray-500">
                — {block.author}
              </div>
            )}
          </blockquote>
        );
      }

      case 'divider':
        return <hr className="my-6 border-t-2 border-gray-300" />;

      case 'parsing': {
        const parsingBlock = block as ParsingBlock;

        // 所有状态都使用 ParseProgressBlock 处理，包括完成状态
        const normalizedProgress = {
          status:
            parsingBlock.stage === 'failed'
              ? ('failed' as const)
              : parsingBlock.stage === 'pending_confirmation'
              ? ('completed' as const)
              : parsingBlock.stage === 'completed'
              ? ('completed' as const)
              : parsingBlock.stage === 'structuring' || parsingBlock.stage === 'translating'
              ? ('processing' as const)
              : ('pending' as const),
          progress: 50,
          message: parsingBlock.message,
          sessionId: parsingBlock.id,
          parseId: parsingBlock.parseId,
          tempBlockId: parsingBlock.tempBlockId,
          parsedBlocks: parsingBlock.parsedBlocks,
        };

        return (
          <ParseProgressBlock
            paperId={paperId || ''}
            sectionId={sectionId || ''}
            blockId={parsingBlock.id}
            sessionId={parsingBlock.id}
            parseId={parsingBlock.parseId}
            onCompleted={(result) => {
              // 解析完成后的回调,传递给父组件处理
              if (onParseComplete) {
                onParseComplete(result);
              }

              // 不再自动打开ParseResultsManager，等待用户点击"管理解析结果"按钮
            }}
            isPersonalOwner={!!userPaperId}
            userPaperId={userPaperId}
            initialProgress={normalizedProgress}
            onParsePreview={useCallback((data: {
              type: 'preview' | 'cancel';
              blockId: string;
              parsedBlocks?: any[];
              sessionId?: string;
              parseId?: string;
            }) => {
              console.log('[BlockRenderer] onParsePreview 被调用', {
                type: data.type,
                blockId: data.blockId,
                parseId: data.parseId,
                parsingBlockId: parsingBlock.id,
                parsingBlockParseId: parsingBlock.parseId,
              });

              // 处理ParseProgressBlock中的onParsePreview回调
              if (data.type === 'preview') {
                const parseResultsDataToSet = {
                  parseId: data.parseId || parsingBlock.parseId || '',
                  tempBlockId: parsingBlock.id,
                  blockId: data.blockId || parsingBlock.id,
                };

                console.log('[BlockRenderer] 设置 parseResultsData', parseResultsDataToSet);
                console.log('[BlockRenderer] 打开 ParseResultsManager 对话框');

                // 设置parseResultsData以打开ParseResultsManager对话框
                setParseResultsData(parseResultsDataToSet);
                setShowParseResultsManager(true);
              } else if (data.type === 'cancel') {
                console.log('[BlockRenderer] 取消解析');
                // 取消解析，通知父组件
                if (onParsePreview) {
                  onParsePreview(data);
                }
              }
            }, [onParsePreview, parsingBlock.id, parsingBlock.parseId])}
          />
        );
      }

      default:
        return null;
    }
  }, [
    block,
    inlineEditingEnabled,
    isEditing,
    handleTextSelection,
    inlineRendererBaseProps,
    lang,
    onParseComplete,
    onParsePreview,
    paperId,
    sectionId,
    isPersonalOwner,
    userPaperId,
    showToolbar, // 添加 showToolbar 依赖
    // 移除 streamProgressData 依赖，避免频繁重新渲染
  ]);

  return (
    <>
      <div
        ref={blockRef}
        data-block-id={block.id}
        className={`${baseClass} group relative mb-3 p-2 ${
          isEditing
            ? 'border-2 border-blue-300 bg-white shadow-lg ring-2 ring-blue-200'
            : ''
        }`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={handleWrapperClick}
      >
        <div className="relative">
          {isEditing ? (
            <div ref={editPanelRef} className="flex flex-col gap-3 animate-in fade-in-0 duration-200">
              <BlockEditor
                block={draftBlock}
                lang={lang}
                references={references}
                allSections={allSections}
                onChange={setDraftBlock}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                onDelete={() => {
                  onDelete?.();
                  clearCurrentEditing();
                }}
                onDuplicate={onDuplicate}
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
                onAddBlockAfter={onAddBlockAfter}
              />
              <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                  disabled={isSaving}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      保存中...
                    </>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in-0 duration-200">
              {renderContent}
              {isPersonalOwner && notesCount > 0 && (
                <div className="absolute -right-1 -top-1 pointer-events-none z-10">
                  <div className="relative">
                    <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full animate-pulse blur-sm"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-pulse blur-md opacity-75"></div>
                    <div className="relative w-3 h-3 bg-blue-600 rounded-full shadow-lg shadow-blue-500/60 animate-pulse"></div>
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 flex items-center gap-2">
                {inlineEditingEnabled && block.type !== 'parsing' && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      // 直接调用 enterEditMode，它内部已经处理了即时状态设置
                      enterEditMode();
                    }}
                    className="pointer-events-auto rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-blue-700"
                  >
                    编辑
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showToolbar && inlineEditingEnabled && toolbarPos && (
        <TextSelectionToolbar
          onBold={() => applyStyle('bold')}
          onItalic={() => applyStyle('italic')}
          onUnderline={() => applyStyle('underline')}
          onColor={(color) => applyStyle('color', color)}
          onBackgroundColor={(bg) => applyStyle('bg', bg)}
          onClearStyles={() => applyStyle('clear')}
          position={toolbarPos}
          onClose={handleToolbarClose}
        />
      )}

      {/* ParseResultsManager 模态框 */}
      {showParseResultsManager && parseResultsData && (
        <ParseResultsManager
          isOpen={showParseResultsManager}
          onOpenChange={setShowParseResultsManager}
          parseId={parseResultsData.parseId}
          tempBlockId={parseResultsData.tempBlockId}
          paperId={paperId || ''}
          userPaperId={userPaperId}
          sectionId={sectionId || ''}
          blockId={parseResultsData.blockId}
          onClose={() => {
            setShowParseResultsManager(false);
            setParseResultsData(null);
          }}
          onSuccess={() => {
            // 成功保存后，删除临时解析块
            if (onParsePreview) {
              onParsePreview({
                type: 'cancel',
                blockId: parseResultsData.blockId,
              });
            }
            setShowParseResultsManager(false);
            setParseResultsData(null);
          }}
          onBlocksAdded={(blocks) => {
            // 处理新增的blocks，通过onParsePreview通知父组件更新内容
            if (onParsePreview) {
              onParsePreview({
                type: 'preview',
                blockId: parseResultsData.blockId,
                parsedBlocks: blocks,
              });
            }
            setShowParseResultsManager(false);
            setParseResultsData(null);
          }}
        />
      )}
    </>
  );
}

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default React.memo(BlockRenderer);
