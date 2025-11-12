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
} from '@/types/paper';
import InlineRenderer from './InlineRenderer';
import TextSelectionToolbar from './TextSelectionToolbar';
import ParseProgressBlock from './ParseProgressBlock';
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
  /** ParseProgressModal 需要的属性 */
  paperId?: string;
  sectionId?: string;
  onParseComplete?: (result: any) => void;
  userPaperId?: string | null;
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
  BlockContent['type'] | 'tableHeader' | 'tableCell' | 'figureCaption' | 'figureDesc' | 'tableCaption' | 'tableDesc' | 'codeCaption' | 'listItem',
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
  tableHeader: '表格',
  tableCell: '表格',
  figureCaption: '图片',
  figureDesc: '图片',
  tableCaption: '表格',
  tableDesc: '表格',
  codeCaption: '代码',
  listItem: '列表',
};

const zhPlaceholder = (label: string) => (
  <span className="inline-block rounded px-1 bg-gray-100 text-gray-500 italic">
    {`该${label}组件未配置中文`}
  </span>
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
        <span className="rounded px-1 bg-gray-50">
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
          <span className="rounded px-1 bg-gray-50">
            <InlineRenderer nodes={preferred as InlineContent[]} {...baseProps} />
          </span>
        );
      }
      // 确保不直接渲染对象，而是转换为字符串
      return <span className="rounded px-1 bg-gray-50">
        {typeof preferred === 'object' ? JSON.stringify(preferred) : String(preferred)}
      </span>;
    }

    if (Array.isArray(preferred)) {
      return <InlineRenderer nodes={preferred as InlineContent[]} {...baseProps} />;
    }
    // 确保不直接渲染对象，而是转换为字符串
    return typeof preferred === 'object' ? JSON.stringify(preferred) : String(preferred);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    if (lang === 'zh' && opts?.wrapZhBg) {
      return <span className="rounded px-1 bg-gray-50">{String(value)}</span>;
    }
    return value;
  }

  // 确保不直接渲染对象，而是转换为字符串
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
      // 静默处理KaTeX渲染错误，显示原始LaTeX文本
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
      // 静默处理URL解析错误，返回原始src
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
  userPaperId,
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
    // 移除左键点击进入编辑状态的功能
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

    // 如果内容有变化，先更新本地
    if (JSON.stringify(draftBlock) !== JSON.stringify(block)) {
      onBlockUpdate(draftBlock);
    }

    setDraftBlock(cloneBlock(draftBlock));
    setHasUnsavedChanges(false);
    setIsEditing(false);
    clearEditing();

    // 然后保存到服务器
    if (onSaveToServer) {
      setIsSaving(true);
      try {
        await onSaveToServer();
        // toast.success 已经在 onSaveToServer 中处理
      } catch (err) {
        // 错误处理已经在 onSaveToServer 中处理
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

        // 使用光标位置而不是选区位置
        if (selection && selection.rangeCount > 0) {
          const currentRange = selection.getRangeAt(0);
          const rect = currentRange.getBoundingClientRect();
          if (rect) {
            setSelectedText(text);
            setToolbarPos({
              x: rect.right, // 光标在选区的右端
              y: rect.top,   // 光标位置
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

  // 全局点击事件监听
  useEffect(() => {
    if (!showToolbar) return;

    const handleGlobalClick = (event: Event) => {
      const mouseEvent = event as unknown as MouseEvent;
      const target = mouseEvent.target as HTMLElement;
      
      // 如果点击的不是工具栏或工具栏内的元素，则关闭工具栏
      if (target.closest('[data-text-selection-toolbar]')) {
        return; // 点击工具栏本身，不关闭
      }
      
      // 如果点击的是相同区域的选择，则不关闭（留给新选择处理）
      const selection = window.getSelection();
      const currentText = selection?.toString().trim();
      if (currentText && currentText === selectedText) {
        return;
      }
      
      // 其他情况关闭工具栏
      handleToolbarClose();
    };

    const handleGlobalKeydown = (event: Event) => {
      const keyEvent = event as unknown as KeyboardEvent;
      if (keyEvent.key === 'Escape') {
        handleToolbarClose();
      }
    };

    // 添加事件监听
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('keydown', handleGlobalKeydown);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  }, [showToolbar, selectedText, handleToolbarClose]);

  const applyStyle = useCallback(
    (
      styleType: 'bold' | 'italic' | 'underline' | 'color' | 'bg' | 'clear',
      value?: string
    ) => {
      if (!inlineEditingEnabled || !onBlockUpdate || !selectedText) return;

      const currentBlock = block as ParagraphBlock | HeadingBlock;
      // 确定要编辑的语言：如果是双语模式，默认编辑英文
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

      // 关闭工具栏并清除选择
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

    // 根据语言模式渲染不同内容
    const renderContent = () => {
      if (lang === 'both') {
        // 双语模式：显示英文和中文
        const enPart = (
          <span className="mr-1 align-baseline">
            <InlineRenderer nodes={enNodes} {...inlineRendererBaseProps} />
          </span>
        );

        const slash = <span className="mx-1 text-gray-400">/</span>;

        const zhPart = hasZh(zhNodes) ? (
          <span className="align-baseline">
            <InlineRenderer nodes={zhNodes as InlineContent[]} {...inlineRendererBaseProps} />
          </span>
        ) : (
          <span className="text-gray-500 italic align-baseline">
            该标题组件未配置中文
          </span>
        );

        return (
          <>
            {enPart}
            {slash}
            {zhPart}
          </>
        );
      } else if (lang === 'zh') {
        // 中文模式：只显示中文
        if (hasZh(zhNodes)) {
          return (
            <span className="align-baseline">
              <InlineRenderer nodes={zhNodes as InlineContent[]} {...inlineRendererBaseProps} />
            </span>
          );
        } else {
          return (
            <span className="text-gray-500 italic align-baseline">
              该标题组件未配置中文
            </span>
          );
        }
      } else {
        // 英文模式：只显示英文
        return (
          <span className="align-baseline">
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

        // 根据语言模式渲染不同内容
        if (lang === 'both') {
          // 双语模式：显示英文和中文，使用 div 容器而不是 p 标签
          const enContent = block.content?.en ?? [];
          const zhContent = block.content?.zh;
          
          return (
            <div
              className={`text-gray-700 leading-relaxed space-y-2 ${alignClass}`}
              onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
              style={{ userSelect: 'text' }}
            >
              <div>
                <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
              </div>
              {hasZh(zhContent) ? (
                <div>
                  <InlineRenderer nodes={zhContent as InlineContent[]} {...inlineRendererBaseProps} />
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  该段落组件未配置中文
                </div>
              )}
            </div>
          );
        } else if (lang === 'zh') {
          // 中文模式：只显示中文
          if (hasZh(block.content?.zh)) {
            return (
              <p
                className={`text-gray-700 leading-relaxed ${alignClass}`}
                onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
                style={{ userSelect: 'text' }}
              >
                <InlineRenderer nodes={block.content?.zh as InlineContent[]} {...inlineRendererBaseProps} />
              </p>
            );
          } else {
            return (
              <p
                className={`text-gray-700 leading-relaxed ${alignClass}`}
                onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
                style={{ userSelect: 'text' }}
              >
                <span className="text-gray-500 italic">
                  该段落组件未配置中文
                </span>
              </p>
            );
          }
        } else {
          // 英文模式：只显示英文
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
        // 根据语言模式渲染不同内容
        const renderCaption = () => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            const enCaption = block.caption?.en ?? [];
            const zhCaption = block.caption?.zh;
            
            return (
              <div className="space-y-1">
                <div>
                  <InlineRenderer nodes={enCaption} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhCaption) ? (
                  <div>
                    <InlineRenderer nodes={zhCaption as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs">
                    该图片组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasZh(block.caption?.zh)) {
              return (
                <InlineRenderer nodes={block.caption?.zh as InlineContent[]} {...inlineRendererBaseProps} />
              );
            } else {
              return (
                <span className="text-gray-500 italic text-xs">
                  该图片组件未配置中文
                </span>
              );
            }
          } else {
            // 英文模式：只显示英文
            return (
              <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        const renderDescription = () => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            const enDesc = block.description?.en ?? [];
            const zhDesc = block.description?.zh;
            
            return (
              <div className="space-y-1">
                <div>
                  <InlineRenderer nodes={enDesc} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhDesc) ? (
                  <div>
                    <InlineRenderer nodes={zhDesc as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs">
                    该图片组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasZh(block.description?.zh)) {
              return (
                <InlineRenderer nodes={block.description?.zh as InlineContent[]} {...inlineRendererBaseProps} />
              );
            } else {
              return (
                <span className="text-gray-500 italic text-xs">
                  该图片组件未配置中文
                </span>
              );
            }
          } else {
            // 英文模式：只显示英文
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
        // 根据语言模式渲染不同内容
        const renderCaption = () => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            const enCaption = block.caption?.en ?? [];
            const zhCaption = block.caption?.zh;
            
            return (
              <div className="space-y-1">
                <div>
                  <InlineRenderer nodes={enCaption} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhCaption) ? (
                  <div>
                    <InlineRenderer nodes={zhCaption as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs">
                    该表格组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasZh(block.caption?.zh)) {
              return (
                <InlineRenderer nodes={block.caption?.zh as InlineContent[]} {...inlineRendererBaseProps} />
              );
            } else {
              return (
                <span className="text-gray-500 italic text-xs">
                  该表格组件未配置中文
                </span>
              );
            }
          } else {
            // 英文模式：只显示英文
            return (
              <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        const renderDescription = () => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            const enDesc = block.description?.en ?? [];
            const zhDesc = block.description?.zh;
            
            return (
              <div className="space-y-1">
                <div>
                  <InlineRenderer nodes={enDesc} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhDesc) ? (
                  <div>
                    <InlineRenderer nodes={zhDesc as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs">
                    该表格组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasZh(block.description?.zh)) {
              return (
                <InlineRenderer nodes={block.description?.zh as InlineContent[]} {...inlineRendererBaseProps} />
              );
            } else {
              return (
                <span className="text-gray-500 italic text-xs">
                  该表格组件未配置中文
                </span>
              );
            }
          } else {
            // 英文模式：只显示英文
            return (
              <InlineRenderer nodes={block.description?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        // 表格单元格渲染函数
        const renderCellValue = (value: any) => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            if (hasLocalizedContent(value)) {
              const lv = value as LocalizedInlineValue;
              const enContent = lv.en ?? [];
              const zhContent = lv.zh;
              
              return (
                <div className="space-y-1">
                  <div>
                    <InlineRenderer nodes={enContent as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                  {hasZh(zhContent) ? (
                    <div>
                      <InlineRenderer nodes={zhContent as InlineContent[]} {...inlineRendererBaseProps} />
                    </div>
                  ) : (
                    <div className="text-gray-500 italic text-xs">
                      未配置中文
                    </div>
                  )}
                </div>
              );
            } else if (Array.isArray(value)) {
              return <InlineRenderer nodes={value} {...inlineRendererBaseProps} />;
            } else {
              // 确保不直接渲染对象，而是转换为字符串
              return typeof value === 'object' && value !== null ?
                JSON.stringify(value) :
                String(value || '');
            }
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasLocalizedContent(value)) {
              const lv = value as LocalizedInlineValue;
              if (hasZh(lv.zh)) {
                return <InlineRenderer nodes={lv.zh as InlineContent[]} {...inlineRendererBaseProps} />;
              } else {
                return <span className="text-gray-500 italic text-xs">未配置中文</span>;
              }
            } else if (Array.isArray(value)) {
              return <InlineRenderer nodes={value} {...inlineRendererBaseProps} />;
            } else {
              // 确保不直接渲染对象，而是转换为字符串
              return typeof value === 'object' && value !== null ?
                JSON.stringify(value) :
                String(value || '');
            }
          } else {
            // 英文模式：只显示英文
            if (hasLocalizedContent(value)) {
              const lv = value as LocalizedInlineValue;
              return <InlineRenderer nodes={lv.en as InlineContent[]} {...inlineRendererBaseProps} />;
            } else if (Array.isArray(value)) {
              return <InlineRenderer nodes={value} {...inlineRendererBaseProps} />;
            } else {
              // 确保不直接渲染对象，而是转换为字符串
              return typeof value === 'object' && value !== null ?
                JSON.stringify(value) :
                String(value || '');
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
              {block.headers && (
                <thead className="bg-gray-100">
                  <tr>
                    {block.headers.map((header, i) => (
                      <th
                        key={i}
                        className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900"
                        style={{ textAlign: block.align?.[i] || 'left' }}
                      >
                        {renderCellValue(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {block.rows.map((row, r) => (
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
                ))}
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
        // 根据语言模式渲染不同内容
        const renderCaption = () => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            const enCaption = block.caption?.en ?? [];
            const zhCaption = block.caption?.zh;
            
            return (
              <div className="space-y-1">
                <div>
                  <InlineRenderer nodes={enCaption} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhCaption) ? (
                  <div>
                    <InlineRenderer nodes={zhCaption as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs">
                    该代码组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasZh(block.caption?.zh)) {
              return (
                <InlineRenderer nodes={block.caption?.zh as InlineContent[]} {...inlineRendererBaseProps} />
              );
            } else {
              return (
                <span className="text-gray-500 italic text-xs">
                  该代码组件未配置中文
                </span>
              );
            }
          } else {
            // 英文模式：只显示英文
            return (
              <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
            );
          }
        };

        return (
          <div className="my-4">
            {(block.caption?.en || block.caption?.zh) && (
              <div className="mb-2 text-xs text-gray-500">
                {renderCaption()}
              </div>
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
              // 根据语言模式渲染不同内容
              const renderContent = () => {
                if (lang === 'both') {
                  // 双语模式：显示英文和中文
                  const enContent = item.content?.en ?? [];
                  const zhContent = item.content?.zh;
                  
                  return (
                    <div className="space-y-1">
                      <div>
                        <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
                      </div>
                      {hasZh(zhContent) ? (
                        <div>
                          <InlineRenderer nodes={zhContent as InlineContent[]} {...inlineRendererBaseProps} />
                        </div>
                      ) : (
                        <div className="text-gray-500 italic text-xs">
                          该列表项未配置中文
                        </div>
                      )}
                    </div>
                  );
                } else if (lang === 'zh') {
                  // 中文模式：只显示中文
                  if (hasZh(item.content?.zh)) {
                    return (
                      <InlineRenderer nodes={item.content?.zh as InlineContent[]} {...inlineRendererBaseProps} />
                    );
                  } else {
                    return (
                      <span className="text-gray-500 italic text-xs">
                        该列表项未配置中文
                      </span>
                    );
                  }
                } else {
                  // 英文模式：只显示英文
                  return (
                    <InlineRenderer nodes={item.content?.en ?? []} {...inlineRendererBaseProps} />
                  );
                }
              };

              return (
                <li key={i} className="leading-relaxed text-gray-700">
                  {renderContent()}
                </li>
              );
            })}
          </ol>
        );

      case 'unordered-list':
        return (
          <ul className="my-3 list-disc space-y-1.5 pl-6">
            {(block.items || []).map((item, i) => {
              // 根据语言模式渲染不同内容
              const renderContent = () => {
                if (lang === 'both') {
                  // 双语模式：显示英文和中文
                  const enContent = item.content?.en ?? [];
                  const zhContent = item.content?.zh;
                  
                  return (
                    <div className="space-y-1">
                      <div>
                        <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
                      </div>
                      {hasZh(zhContent) ? (
                        <div>
                          <InlineRenderer nodes={zhContent as InlineContent[]} {...inlineRendererBaseProps} />
                        </div>
                      ) : (
                        <div className="text-gray-500 italic text-xs">
                          该列表项未配置中文
                        </div>
                      )}
                    </div>
                  );
                } else if (lang === 'zh') {
                  // 中文模式：只显示中文
                  if (hasZh(item.content?.zh)) {
                    return (
                      <InlineRenderer nodes={item.content?.zh as InlineContent[]} {...inlineRendererBaseProps} />
                    );
                  } else {
                    return (
                      <span className="text-gray-500 italic text-xs">
                        该列表项未配置中文
                      </span>
                    );
                  }
                } else {
                  // 英文模式：只显示英文
                  return (
                    <InlineRenderer nodes={item.content?.en ?? []} {...inlineRendererBaseProps} />
                  );
                }
              };

              return (
                <li key={i} className="leading-relaxed text-gray-700">
                  {renderContent()}
                </li>
              );
            })}
          </ul>
        );

      case 'quote': {
        // 根据语言模式渲染不同内容
        const renderContent = () => {
          if (lang === 'both') {
            // 双语模式：显示英文和中文
            const enContent = block.content?.en ?? [];
            const zhContent = block.content?.zh;
            
            return (
              <div className="space-y-2">
                <div className="italic">
                  <InlineRenderer nodes={enContent} {...inlineRendererBaseProps} />
                </div>
                {hasZh(zhContent) ? (
                  <div className="italic">
                    <InlineRenderer nodes={zhContent as InlineContent[]} {...inlineRendererBaseProps} />
                  </div>
                ) : (
                  <div className="text-gray-500 italic text-xs">
                    该引用组件未配置中文
                  </div>
                )}
              </div>
            );
          } else if (lang === 'zh') {
            // 中文模式：只显示中文
            if (hasZh(block.content?.zh)) {
              return (
                <div className="italic">
                  <InlineRenderer nodes={block.content?.zh as InlineContent[]} {...inlineRendererBaseProps} />
                </div>
              );
            } else {
              return (
                <span className="text-gray-500 italic text-xs">
                  该引用组件未配置中文
                </span>
              );
            }
          } else {
            // 英文模式：只显示英文
            return (
              <div className="italic">
                <InlineRenderer nodes={block.content?.en ?? []} {...inlineRendererBaseProps} />
              </div>
            );
          }
        };

        return (
          <blockquote className="my-4 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 text-gray-600">
            {renderContent()}
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

      case 'loading': {
        const loadingBlock = block as any;
        console.log('BlockRenderer loading block:', loadingBlock);
        
        const handleParseComplete = (result: any) => {
          console.log('BlockRenderer parse complete:', result);
          onParseComplete?.(result);
        };

        // 直接显示解析进度块，不需要模态框
        return (
          <ParseProgressBlock
            paperId={paperId || ''}
            sectionId={sectionId || loadingBlock.sectionId || ''}
            blockId={loadingBlock.id}
            sessionId={loadingBlock.sessionId || ''}
            onCompleted={handleParseComplete}
            isPersonalOwner={isPersonalOwner}
            userPaperId={userPaperId}
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
  ]);

  return (
    <>
      <div
        ref={blockRef}
        data-block-id={block.id}
        className={`${baseClass} group relative mb-3 p-2 ${isEditing ? 'border-2 border-blue-300 bg-white shadow-lg ring-2 ring-blue-200' : ''}`}
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
            {/* 笔记指示器 - 仅在个人论文库访问时显示，放在右上角外侧，蓝色呼吸灯效果 */}
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
              {inlineEditingEnabled && (
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