'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import {
  BlockContent,
  ParagraphBlock,
  HeadingBlock,
  InlineContent,
  Reference,
  Section,
  TableCell,
  TableRow,
} from '@/types/paper';
import type { ParsingBlock } from '@/types/paper/content';
import InlineRenderer from './InlineRenderer';
import TextSelectionToolbar from './TextSelectionToolbar';
import ParseProgressBlock from './ParseProgressBlock';
import ParsedBlocksConfirmDialog from './ParsedBlocksConfirmDialog';
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
import { useEditingState } from '@/stores/useEditingState';
import BlockEditor from './editor/BlockEditor';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

/** ===================== 工具与类型 ===================== */

interface BlockRendererProps {
  block: BlockContent;
  lang: 'en' | 'zh' | 'both';
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
  onSaveToServer?: () => Promise<void>;
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

function BlockMath({ math }: { math: string }) {
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

  return <div ref={mathRef} className="text-center" />;
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

export default function BlockRenderer({
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
}: BlockRendererProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  const { hasUnsavedChanges, setHasUnsavedChanges, switchToEdit, clearEditing } = useEditingState();
  const inlineEditingEnabled = canEditContent && typeof onBlockUpdate === 'function';

  const previewLang: 'en' | 'zh' | 'both' = lang;

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draftBlock, setDraftBlock] = useState<BlockContent>(() => cloneBlock(block));
  const [isSaving, setIsSaving] = useState(false);

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
      setIsEditing(false);
      setDraftBlock(cloneBlock(block));
    }
  }, [inlineEditingEnabled, isEditing, block]);

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
      requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else if (wasEditingRef.current) {
      requestAnimationFrame(() => {
        blockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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

  const inlineRendererBaseProps: InlineRendererBaseProps = {
    searchQuery,
    highlightedRefs: effectiveHighlightedRefs,
    setHighlightedRefs: handleHighlightedRefs,
    contentRef: effectiveContentRef,
    references,
  };

  const baseClass = `transition-all duration-200 rounded-lg ${
    isActive ? 'bg-blue-50 ring-2 ring-blue-200 shadow-sm' : ''
  }`;

  const enterEditMode = useCallback(() => {
    if (!inlineEditingEnabled || isEditing) return;
    const switched = switchToEdit(block.id, {
      onRequestSave: ({ currentId }) => {
        // TODO: auto-save before switching block
      },
    });
    if (!switched) return;
    setDraftBlock(cloneBlock(block));
    setIsEditing(true);
  }, [inlineEditingEnabled, isEditing, block, switchToEdit]);

  const handleWrapperClick = useCallback((_event: MouseEvent<HTMLDivElement>) => {
    // 禁用左键点击进入编辑状态
    return;
  }, []);

  const handleCancelEdit = useCallback(() => {
    setDraftBlock(cloneBlock(block));
    setHasUnsavedChanges(false);
    setIsEditing(false);
    clearEditing();
  }, [block, setHasUnsavedChanges, clearEditing]);

  const handleSaveEdit = useCallback(async () => {
    if (!onBlockUpdate) {
      setDraftBlock(cloneBlock(block));
      setIsEditing(false);
      clearEditing();
      return;
    }

    if (JSON.stringify(draftBlock) !== JSON.stringify(block)) {
      onBlockUpdate(draftBlock);
    }

    setDraftBlock(cloneBlock(draftBlock));
    setHasUnsavedChanges(false);
    setIsEditing(false);
    clearEditing();

    if (onSaveToServer) {
      setIsSaving(true);
      try {
        await onSaveToServer();
      } catch (err) {
        // 错误在 onSaveToServer 里处理
      } finally {
        setIsSaving(false);
      }
    }
  }, [draftBlock, block, onBlockUpdate, setHasUnsavedChanges, clearEditing, onSaveToServer]);

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
    if (!showToolbar) return;

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

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [showToolbar, selectedText, handleToolbarClose]);

  const applyStyle = useCallback(
    (styleType: 'bold' | 'italic' | 'underline' | 'color' | 'bg' | 'clear', value?: string) => {
      if (!inlineEditingEnabled || !onBlockUpdate || !selectedText) return;

      const currentBlock = block as ParagraphBlock | HeadingBlock;
      const editLang: 'en' | 'zh' = previewLang === 'both' ? 'en' : previewLang;
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
    [block, inlineEditingEnabled, previewLang, onBlockUpdate, selectedText, handleToolbarClose]
  );

  const renderBilingualHeading = (headingBlock: HeadingBlock) => {
    const headingSizes = {
      1: 'text-3xl',
      2: 'text-2xl',
      3: 'text-xl',
      4: 'text-lg',
      5: 'text-base',
      6: 'text-sm',
    } as const;

    const enNodes = headingBlock.content?.en ?? [];
    const zhNodes = headingBlock.content?.zh;

    const numberPart = headingBlock.number ? (
      <span className="text-blue-600 mr-2">{`${headingBlock.number}.`}</span>
    ) : null;

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
      } else if (lang === 'zh') {
        if (hasZh(zhNodes)) {
          return (
            <span className="align-baseline">
              <InlineRenderer nodes={zhNodes as InlineContent[]} {...inlineRendererBaseProps} />
            </span>
          );
        } else {
          return <span className={ZH_PLACEHOLDER_CLASS}>该标题组件未配置中文</span>;
        }
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
      onMouseUp: inlineEditingEnabled && !isEditing ? handleTextSelection : undefined,
      style: { userSelect: 'text' as const },
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

  const renderContent = useCallback(() => {
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

        if (lang === 'both') {
          const enContent = block.content?.en ?? [];
          const zhContent = block.content?.zh;

          return (
            <div
              className={`text-gray-700 leading-relaxed space-y-2 ${alignClass}`}
              onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
              style={{ userSelect: 'text' }}
            >
              <div className="text-gray-800">
                <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
              </div>
              {hasZh(zhContent) ? (
                <div className={ZH_BLOCK_CLASS}>
                  <InlineRenderer nodes={zhContent as InlineContent[]} {...inlineRendererBaseProps} />
                </div>
              ) : (
                <div className={ZH_PLACEHOLDER_CLASS}>该段落组件未配置中文</div>
              )}
            </div>
          );
        } else if (lang === 'zh') {
          if (hasZh(block.content?.zh)) {
            return (
              <p
                className={`text-gray-700 leading-relaxed ${alignClass}`}
                onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
                style={{ userSelect: 'text' }}
              >
                <InlineRenderer
                  nodes={block.content?.zh as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              </p>
            );
          } else {
            return (
              <p
                className={`text-gray-700 leading-relaxed ${alignClass}`}
                onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
                style={{ userSelect: 'text' }}
              >
                <span className={ZH_PLACEHOLDER_CLASS}>该段落组件未配置中文</span>
              </p>
            );
          }
        } else {
          return (
            <p
              className={`text-gray-700 leading-relaxed ${alignClass}`}
              onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
              style={{ userSelect: 'text' }}
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
          } else if (lang === 'zh') {
            if (hasZh(block.caption?.zh)) {
              return (
                <InlineRenderer
                  nodes={block.caption?.zh as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              );
            } else {
              return (
                <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                  该图片组件未配置中文
                </span>
              );
            }
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
          } else if (lang === 'zh') {
            if (hasZh(block.description?.zh)) {
              return (
                <InlineRenderer
                  nodes={block.description?.zh as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              );
            } else {
              return (
                <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                  该图片组件未配置中文
                </span>
              );
            }
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
          } else if (lang === 'zh') {
            if (hasZh(block.caption?.zh)) {
              return (
                <InlineRenderer
                  nodes={block.caption?.zh as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              );
            } else {
              return (
                <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                  该表格组件未配置中文
                </span>
              );
            }
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
                    该表格组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            if (hasZh(block.description?.zh)) {
              return (
                <InlineRenderer
                  nodes={block.description?.zh as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              );
            } else {
              return (
                <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                  该表格组件未配置中文
                </span>
              );
            }
          } else {
            return (
              <InlineRenderer nodes={block.description?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        // 处理表格跨行跨列的渲染函数
        const renderTableRows = (
          rows: TableRow[],
          isHeader: boolean,
          cellRenderer: (value: any) => ReactNode,
          align?: ('left' | 'center' | 'right')[]
        ) => {
          const Tag = isHeader ? 'th' : 'td';

          return rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={isHeader ? '' : 'transition-colors hover:bg-gray-50'}>
              {row.cells.map((cell, colIndex) => (
                <Tag
                  key={colIndex}
                  className={`border border-gray-300 px-3 py-2 text-sm ${
                    isHeader ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}
                  style={{
                    textAlign: cell.align || align?.[colIndex] || 'left',
                  }}
                  colSpan={cell.colspan || 1}
                  rowSpan={cell.rowspan || 1}
                >
                  {cellRenderer(cell.content)}
                </Tag>
              ))}
            </tr>
          ));
        };

        const renderCellValue = (value: any) => {
          if (lang === 'both') {
            if (hasLocalizedContent(value)) {
              const lv = value as LocalizedInlineValue;
              const enContent = lv.en ?? [];
              const zhContent = lv.zh;

              return (
                <div className="space-y-1">
                  <div className="text-gray-800">
                    <InlineRenderer
                      nodes={enContent as InlineContent[]}
                      {...inlineRendererBaseProps}
                    />
                  </div>
                  {hasZh(zhContent) ? (
                    <div className={ZH_INLINE_CLASS}>
                      <InlineRenderer
                        nodes={zhContent as InlineContent[]}
                        {...inlineRendererBaseProps}
                      />
                    </div>
                  ) : (
                    <div className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>未配置中文</div>
                  )}
                </div>
              );
            } else if (Array.isArray(value)) {
              return <InlineRenderer nodes={value} {...inlineRendererBaseProps} />;
            } else {
              return typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value || '');
            }
          } else if (lang === 'zh') {
            if (hasLocalizedContent(value)) {
              const lv = value as LocalizedInlineValue;
              if (hasZh(lv.zh)) {
                return (
                  <InlineRenderer
                    nodes={lv.zh as InlineContent[]}
                    {...inlineRendererBaseProps}
                  />
                );
              } else {
                return <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>未配置中文</span>;
              }
            } else if (Array.isArray(value)) {
              return <InlineRenderer nodes={value} {...inlineRendererBaseProps} />;
            } else {
              return typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value || '');
            }
          } else {
            if (hasLocalizedContent(value)) {
              const lv = value as LocalizedInlineValue;
              return (
                <InlineRenderer
                  nodes={lv.en as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              );
            } else if (Array.isArray(value)) {
              return <InlineRenderer nodes={value} {...inlineRendererBaseProps} />;
            } else {
              return typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value || '');
            }
          }
        };

        return (
          <div className="my-6 overflow-x-auto">
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

            <table className="mx-auto min-w-full border-collapse border border-gray-300 shadow-sm">
              {/* 渲染表头 - 支持新旧格式 */}
              {block.headers && (
                <thead className="bg-gray-100">
                  {/* 检查是否为新格式（有cells属性） */}
                  {Array.isArray(block.headers) &&
                  block.headers.length > 0 &&
                  typeof block.headers[0] === 'object' &&
                  'cells' in block.headers[0] ? (
                    // 新格式：多行表头
                    renderTableRows(
                      block.headers as unknown as TableRow[],
                      true,
                      renderCellValue,
                      block.align
                    )
                  ) : (
                    // 旧格式：简单表头
                    <tr>
                      {(block.headers as unknown as string[]).map((header, i) => (
                        <th
                          key={i}
                          className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900"
                          style={{ textAlign: block.align?.[i] || 'left' }}
                        >
                          {renderCellValue(header)}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
              )}
              <tbody>
                {/* 检查是否为新格式（有cells属性） */}
                {Array.isArray(block.rows) &&
                block.rows.length > 0 &&
                typeof block.rows[0] === 'object' &&
                'cells' in block.rows[0] ? (
                  // 新格式：复杂表格行
                  renderTableRows(
                    block.rows as unknown as TableRow[],
                    false,
                    renderCellValue,
                    block.align
                  )
                ) : (
                  // 旧格式：简单表格行
                  (block.rows as unknown as any[][]).map((row, r) => (
                    <tr key={r} className="transition-colors hover:bg-gray-50">
                      {row.map((cell, c) => (
                        <td
                          key={c}
                          className="border border-gray-300 px-3 py-2 text-sm text-gray-700"
                          style={{ textAlign: block.align?.[c] || 'left' }}
                        >
                          {renderCellValue(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {(block.description?.en || block.description?.zh) && (
              <div className="mt-2 text-center text-xs text-gray-500">
                {renderDescription()}
              </div>
            )}
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
          } else if (lang === 'zh') {
            if (hasZh(block.caption?.zh)) {
              return (
                <InlineRenderer
                  nodes={block.caption?.zh as InlineContent[]}
                  {...inlineRendererBaseProps}
                />
              );
            } else {
              return (
                <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                  该代码组件未配置中文
                </span>
              );
            }
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
                } else if (lang === 'zh') {
                  if (hasZh(item.content?.zh)) {
                    return (
                      <InlineRenderer
                        nodes={item.content?.zh as InlineContent[]}
                        {...inlineRendererBaseProps}
                      />
                    );
                  } else {
                    return (
                      <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                        该列表项未配置中文
                      </span>
                    );
                  }
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
                } else if (lang === 'zh') {
                  if (hasZh(item.content?.zh)) {
                    return (
                      <InlineRenderer
                        nodes={item.content?.zh as InlineContent[]}
                        {...inlineRendererBaseProps}
                      />
                    );
                  } else {
                    return (
                      <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                        该列表项未配置中文
                      </span>
                    );
                  }
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
          } else if (lang === 'zh') {
            if (hasZh(block.content?.zh)) {
              return (
                <div className="italic">
                  <InlineRenderer
                    nodes={block.content?.zh as InlineContent[]}
                    {...inlineRendererBaseProps}
                  />
                </div>
              );
            } else {
              return (
                <span className={`${ZH_PLACEHOLDER_CLASS} text-xs`}>
                  该引用组件未配置中文
                </span>
              );
            }
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
        
        // 如果是待确认状态,显示确认界面
        if (parsingBlock.stage === 'pending_confirmation') {
          return (
            <div className="my-4 rounded-lg border-2 border-green-200 bg-green-50 p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    {parsingBlock.message || '解析完成,请确认'}
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    解析已完成,共得到 {parsingBlock.parsedBlocks?.length || 0} 个段落。
                    请预览并确认要保留的内容。
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (onParsePreview && parsingBlock.parsedBlocks) {
                          onParsePreview({
                            type: 'preview',
                            blockId: parsingBlock.id,
                            parsedBlocks: parsingBlock.parsedBlocks,
                            sessionId: parsingBlock.sessionId,
                          });
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      预览并确认
                    </button>
                    <button
                      onClick={() => {
                        if (onParsePreview) {
                          onParsePreview({
                            type: 'cancel',
                            blockId: parsingBlock.id,
                          });
                        }
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      取消解析
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        
        // 其他状态使用 ParseProgressBlock
        const normalizedProgress = {
          status: parsingBlock.stage === 'failed' ? 'failed' as const :
                  parsingBlock.stage === 'structuring' || parsingBlock.stage === 'translating' ? 'processing' as const :
                  'pending' as const,
          progress: 50,
          message: parsingBlock.message,
          sessionId: parsingBlock.id,
        };

        return (
          <ParseProgressBlock
            paperId={paperId || ''}
            sectionId={sectionId || ''}
            blockId={parsingBlock.id}
            sessionId={parsingBlock.id}
            onCompleted={(result) => {
              // 解析完成后的回调,传递给父组件处理
              if (onParseComplete) {
                onParseComplete(result);
              }
            }}
            isPersonalOwner={!!userPaperId}
            userPaperId={userPaperId}
            initialProgress={normalizedProgress}
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
    previewLang,
    handleTextSelection,
    inlineRendererBaseProps,
    lang,
    onParseComplete,
    onParsePreview,
    paperId,
    sectionId,
    isPersonalOwner,
    userPaperId,
    streamProgressData,
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
        {isEditing ? (
          <div ref={editPanelRef} className="flex flex-col gap-3">
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
                setIsEditing(false);
                clearEditing();
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
          <>
            {renderContent()}
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
                    enterEditMode();
                  }}
                  className="pointer-events-auto rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-blue-700"
                >
                  编辑
                </button>
              )}
            </div>
          </>
        )}
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
    </>
  );
}
