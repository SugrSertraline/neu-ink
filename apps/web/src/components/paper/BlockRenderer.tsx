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
      return <span className="rounded px-1 bg-gray-50">{preferred as any}</span>;
    }

    if (Array.isArray(preferred)) {
      return <InlineRenderer nodes={preferred as InlineContent[]} {...baseProps} />;
    }
    return preferred as any;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    if (lang === 'zh' && opts?.wrapZhBg) {
      return <span className="rounded px-1 bg-gray-50">{String(value)}</span>;
    }
    return value;
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
      console.error('KaTeX block render error:', err);
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
      console.warn('resolveMediaUrl fallback for src:', src, err);
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
}: BlockRendererProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  const { hasUnsavedChanges, setHasUnsavedChanges, switchToEdit, clearEditing } = useEditingState();
  const inlineEditingEnabled = canEditContent && typeof onBlockUpdate === 'function';

  const previewLang: 'en' | 'zh' = lang === 'both' ? 'en' : lang;

  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draftBlock, setDraftBlock] = useState<BlockContent>(() => cloneBlock(block));

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
        console.info('[BlockRenderer] TODO: auto-save before switching block ->', currentId);
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

  const handleSaveEdit = useCallback(() => {
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
  }, [draftBlock, block, onBlockUpdate, setHasUnsavedChanges, clearEditing]);

  const handleTextSelection = useCallback(
    (_e: MouseEvent<HTMLElement>) => {
      if (block.type !== 'paragraph' && block.type !== 'heading') return;
      if (!inlineEditingEnabled || !onBlockUpdate || isEditing) return;

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (!text) {
          setShowToolbar(false);
          return;
        }

        const range = selection?.getRangeAt(0);
        if (!range) return;

        const element = blockRef.current;
        if (!element || !element.contains(range.commonAncestorContainer)) {
          setShowToolbar(false);
          return;
        }

        const rect = range.getBoundingClientRect();
        if (!rect) return;

        setSelectedText(text);
        setToolbarPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
        setShowToolbar(true);
      }, 10);
    },
    [block, inlineEditingEnabled, onBlockUpdate, isEditing]
  );

  const applyStyle = useCallback(
    (
      styleType: 'bold' | 'italic' | 'underline' | 'color' | 'bg' | 'clear',
      value?: string
    ) => {
      if (!inlineEditingEnabled || !onBlockUpdate || !selectedText) return;

      const currentBlock = block as ParagraphBlock | HeadingBlock;
      const currentContent = currentBlock.content?.[previewLang];
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
          [previewLang]: newContent,
        } as typeof currentBlock.content,
      };

      onBlockUpdate(updatedBlock);

      setTimeout(() => {
        setShowToolbar(false);
        window.getSelection()?.removeAllRanges();
      }, 100);
    },
    [block, inlineEditingEnabled, previewLang, onBlockUpdate, selectedText]
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

    const enPart = (
      <span className="mr-1 align-baseline">
        <InlineRenderer nodes={enNodes} {...inlineRendererBaseProps} />
      </span>
    );

    const slash = <span className="mx-1 text-gray-400">/</span>;

    const zhPart = hasZh(zhNodes) ? (
      <span className="rounded px-1 bg-gray-50 align-baseline">
        <InlineRenderer nodes={zhNodes as InlineContent[]} {...inlineRendererBaseProps} />
      </span>
    ) : (
      <span className="rounded px-1 bg-gray-100 text-gray-500 italic align-baseline">
        该标题组件未配置中文
      </span>
    );

    const commonProps = {
      className: `${headingSizes[headingBlock.level]} font-bold text-gray-900 mb-2`,
      onMouseUp: inlineEditingEnabled && !isEditing ? handleTextSelection : undefined,
      style: { userSelect: 'text' as const },
      children: (
        <>
          {numberPart}
          {enPart}
          {slash}
          {zhPart}
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

        const wantZhPlaceholder = previewLang === 'zh' && !hasZh(block.content?.zh);

        return (
          <p
            className={`text-gray-700 leading-relaxed ${alignClass}`}
            onMouseUp={inlineEditingEnabled && !isEditing ? handleTextSelection : undefined}
            style={{ userSelect: 'text' }}
          >
            {previewLang === 'zh' ? (
              wantZhPlaceholder ? (
                zhPlaceholder(COMPONENT_LABEL_MAP['paragraph'])
              ) : (
                <span className="rounded px-1 bg-gray-50">
                  <InlineRenderer nodes={block.content?.zh ?? []} {...inlineRendererBaseProps} />
                </span>
              )
            ) : (
              <InlineRenderer nodes={block.content?.en ?? []} {...inlineRendererBaseProps} />
            )}
          </p>
        );
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
        const wantZhCaptionPlaceholder = previewLang === 'zh' && !hasZh(block.caption?.zh);
        const wantZhDescPlaceholder = previewLang === 'zh' && !hasZh(block.description?.zh);

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
              {previewLang === 'zh' ? (
                wantZhCaptionPlaceholder ? (
                  zhPlaceholder(COMPONENT_LABEL_MAP.figureCaption)
                ) : (
                  <span className="rounded px-1 bg-gray-50">
                    <InlineRenderer nodes={block.caption?.zh ?? []} {...inlineRendererBaseProps} />
                  </span>
                )
              ) : (
                <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
              )}
            </figcaption>

            {(block.description?.en || block.description?.zh) && (
              <div className="mt-2 px-4 text-center text-xs text-gray-500">
                {previewLang === 'zh' ? (
                  wantZhDescPlaceholder ? (
                    zhPlaceholder(COMPONENT_LABEL_MAP.figureDesc)
                  ) : (
                    <span className="rounded px-1 bg-gray-50">
                      <InlineRenderer nodes={block.description?.zh ?? []} {...inlineRendererBaseProps} />
                    </span>
                  )
                ) : (
                  <InlineRenderer nodes={block.description?.en ?? []} {...inlineRendererBaseProps} />
                )}
              </div>
            )}
          </figure>
        );
      }

      case 'table': {
        const wantZhCaptionPlaceholder = previewLang === 'zh' && !hasZh(block.caption?.zh);
        const wantZhDescPlaceholder = previewLang === 'zh' && !hasZh(block.description?.zh);

        return (
          <div className="my-6 overflow-x-auto">
            {(block.caption?.en || block.caption?.zh) && (
              <div className="mb-2 text-center text-sm font-medium text-gray-600">
                {block.number && (
                  <span className="mr-1 font-semibold text-gray-800">
                    Table {block.number}.
                  </span>
                )}
                {previewLang === 'zh' ? (
                  wantZhCaptionPlaceholder ? (
                    zhPlaceholder(COMPONENT_LABEL_MAP.tableCaption)
                  ) : (
                    <span className="rounded px-1 bg-gray-50">
                      <InlineRenderer nodes={block.caption?.zh ?? []} {...inlineRendererBaseProps} />
                    </span>
                  )
                ) : (
                  <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
                )}
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
                        {renderInlineValue(header, previewLang, inlineRendererBaseProps, {
                          componentLabel: COMPONENT_LABEL_MAP.tableHeader,
                          wrapZhBg: true,
                        })}
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
                        {renderInlineValue(cell, previewLang, inlineRendererBaseProps, {
                          componentLabel: COMPONENT_LABEL_MAP.tableCell,
                          wrapZhBg: true,
                        })}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {(block.description?.en || block.description?.zh) && (
              <div className="mt-2 text-center text-xs text-gray-500">
                {previewLang === 'zh' ? (
                  wantZhDescPlaceholder ? (
                    zhPlaceholder(COMPONENT_LABEL_MAP.tableDesc)
                  ) : (
                    <span className="rounded px-1 bg-gray-50">
                      <InlineRenderer nodes={block.description?.zh ?? []} {...inlineRendererBaseProps} />
                    </span>
                  )
                ) : (
                  <InlineRenderer nodes={block.description?.en ?? []} {...inlineRendererBaseProps} />
                )}
              </div>
            )}
          </div>
        );
      }

      case 'code': {
        const wantZhCaptionPlaceholder = previewLang === 'zh' && !hasZh(block.caption?.zh);
        return (
          <div className="my-4">
            {(block.caption?.en || block.caption?.zh) && (
              <div className="mb-2 text-xs text-gray-500">
                {previewLang === 'zh' ? (
                  wantZhCaptionPlaceholder ? (
                    zhPlaceholder(COMPONENT_LABEL_MAP.codeCaption)
                  ) : (
                    <span className="rounded px-1 bg-gray-50">
                      <InlineRenderer nodes={block.caption?.zh ?? []} {...inlineRendererBaseProps} />
                    </span>
                  )
                ) : (
                  <InlineRenderer nodes={block.caption?.en ?? []} {...inlineRendererBaseProps} />
                )}
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
            {block.items.map((item, i) => {
              const wantZh = previewLang === 'zh';
              const zhMissing = wantZh && !hasZh(item.content?.zh);
              return (
                <li key={i} className="leading-relaxed text-gray-700">
                  {wantZh ? (
                    zhMissing ? (
                      zhPlaceholder(COMPONENT_LABEL_MAP.listItem)
                    ) : (
                      <span className="rounded px-1 bg-gray-50">
                        <InlineRenderer nodes={item.content?.zh ?? []} {...inlineRendererBaseProps} />
                      </span>
                    )
                  ) : (
                    <InlineRenderer nodes={item.content?.en ?? []} {...inlineRendererBaseProps} />
                  )}
                </li>
              );
            })}
          </ol>
        );

      case 'unordered-list':
        return (
          <ul className="my-3 list-disc space-y-1.5 pl-6">
            {block.items.map((item, i) => {
              const wantZh = previewLang === 'zh';
              const zhMissing = wantZh && !hasZh(item.content?.zh);
              return (
                <li key={i} className="leading-relaxed text-gray-700">
                  {wantZh ? (
                    zhMissing ? (
                      zhPlaceholder(COMPONENT_LABEL_MAP.listItem)
                    ) : (
                      <span className="rounded px-1 bg-gray-50">
                        <InlineRenderer nodes={item.content?.zh ?? []} {...inlineRendererBaseProps} />
                      </span>
                    )
                  ) : (
                    <InlineRenderer nodes={item.content?.en ?? []} {...inlineRendererBaseProps} />
                  )}
                </li>
              );
            })}
          </ul>
        );

      case 'quote': {
        const wantZhPlaceholder = previewLang === 'zh' && !hasZh(block.content?.zh);
        return (
          <blockquote className="my-4 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 italic text-gray-600">
            {previewLang === 'zh' ? (
              wantZhPlaceholder ? (
                zhPlaceholder(COMPONENT_LABEL_MAP.quote)
              ) : (
                <span className="rounded px-1 bg-gray-50 not-italic">
                  <InlineRenderer nodes={block.content?.zh ?? []} {...inlineRendererBaseProps} />
                </span>
              )
            ) : (
              <InlineRenderer nodes={block.content?.en ?? []} {...inlineRendererBaseProps} />
            )}
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
        id={block.id}
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
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <>
            {renderContent()}
            {inlineEditingEnabled && (
              <div className="pointer-events-none absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
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
              </div>
            )}
          </>
        )}
      </div>

      {showToolbar && inlineEditingEnabled && (
        <TextSelectionToolbar
          onBold={() => applyStyle('bold')}
          onItalic={() => applyStyle('italic')}
          onUnderline={() => applyStyle('underline')}
          onColor={(color) => applyStyle('color', color)}
          onBackgroundColor={(bg) => applyStyle('bg', bg)}
          onClearStyles={() => applyStyle('clear')}
          position={toolbarPos}
          onClose={() => setShowToolbar(false)}
        />
      )}
    </>
  );
}
