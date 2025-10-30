'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import {
  BlockContent,
  ParagraphBlock,
  HeadingBlock,
  InlineContent,
  Reference,
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

interface BlockRendererProps {
  block: BlockContent;
  lang: 'en' | 'zh';
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
}

type InlineRendererBaseProps = Omit<ComponentProps<typeof InlineRenderer>, 'nodes'>;

type LocalizedInlineValue = Partial<Record<'en' | 'zh', InlineContent[] | string | number>>;

const hasLocalizedContent = (value: unknown): value is LocalizedInlineValue => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return 'en' in candidate || 'zh' in candidate;
};

const renderInlineValue = (
  value: unknown,
  lang: 'en' | 'zh',
  baseProps: InlineRendererBaseProps
): ReactNode => {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    return <InlineRenderer nodes={value as InlineContent[]} {...baseProps} />;
  }

  if (hasLocalizedContent(value)) {
    const preferred = value[lang] ?? value.en ?? value.zh ?? [];
    if (Array.isArray(preferred)) {
      return <InlineRenderer nodes={preferred as InlineContent[]} {...baseProps} />;
    }
    if (typeof preferred === 'string' || typeof preferred === 'number') {
      return preferred;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return null;
};

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
}: BlockRendererProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const blockRef = useRef<HTMLDivElement>(null);
  const fallbackContentRef = useRef<HTMLDivElement | null>(null);
  const [localHighlightedRefs, setLocalHighlightedRefs] = useState<string[]>([]);

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

  const handleTextSelection = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (block.type !== 'paragraph' && block.type !== 'heading') return;
      if (!onBlockUpdate) return;

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

        console.log('=== 文本选择调试 ===');
        console.log('选中的文本:', text);
        console.log('块类型:', block.type);
        console.log('当前内容:', (block as ParagraphBlock | HeadingBlock).content?.[lang]);
      }, 10);
    },
    [block, lang, onBlockUpdate]
  );

  const applyStyle = useCallback(
    (
      styleType: 'bold' | 'italic' | 'underline' | 'color' | 'bg' | 'clear',
      value?: string
    ) => {
      if (!onBlockUpdate || !selectedText) return;

      const currentBlock = block as ParagraphBlock | HeadingBlock;
      const currentContent = currentBlock.content?.[lang];
      if (!currentContent) return;

      console.log('=== 应用样式 ===');
      console.log('样式类型:', styleType);
      console.log('样式值:', value);
      console.log('选中文本:', selectedText);
      console.log('原内容:', currentContent);

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

      console.log('新内容:', newContent);

      const updatedBlock: BlockContent = {
        ...currentBlock,
        content: {
          ...currentBlock.content,
          [lang]: newContent,
        },
      };

      onBlockUpdate(updatedBlock);

      setTimeout(() => {
        setShowToolbar(false);
        window.getSelection()?.removeAllRanges();
      }, 100);
    },
    [block, lang, onBlockUpdate, selectedText]
  );

  const renderContent = useCallback(() => {
    switch (block.type) {
      case 'heading': {
        const headingSizes = {
          1: 'text-3xl',
          2: 'text-2xl',
          3: 'text-xl',
          4: 'text-lg',
          5: 'text-base',
          6: 'text-sm',
        } as const;

        const commonProps = {
          className: `${headingSizes[block.level]} font-bold text-gray-900 mb-2`,
          onMouseUp: handleTextSelection,
          style: { userSelect: 'text' as const },
          children: (
            <>
              {block.number && <span className="text-blue-600 mr-2">{block.number}</span>}
              <InlineRenderer
                nodes={block.content?.[lang] ?? []}
                {...inlineRendererBaseProps}
              />
            </>
          ),
        };

        switch (block.level) {
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
      }

      case 'paragraph': {
        const alignClass =
          {
            left: 'text-left',
            center: 'text-center',
            right: 'text-right',
            justify: 'text-justify',
          }[block.align || 'left'] ?? 'text-left';

        return (
          <p
            className={`text-gray-700 leading-relaxed ${alignClass}`}
            onMouseUp={handleTextSelection}
            style={{ userSelect: 'text' }}
          >
            <InlineRenderer nodes={block.content?.[lang] ?? []} {...inlineRendererBaseProps} />
          </p>
        );
      }

      case 'math': {
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
      }

      case 'figure': {
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
              <InlineRenderer nodes={block.caption?.[lang] ?? []} {...inlineRendererBaseProps} />
            </figcaption>

            {block.description?.[lang] && (
              <div className="mt-2 px-4 text-center text-xs text-gray-500">
                <InlineRenderer
                  nodes={block.description[lang] ?? []}
                  {...inlineRendererBaseProps}
                />
              </div>
            )}
          </figure>
        );
      }

      case 'table': {
        return (
          <div className="my-6 overflow-x-auto">
            {block.caption?.[lang] && (
              <div className="mb-2 text-center text-sm font-medium text-gray-600">
                {block.number && (
                  <span className="mr-1 font-semibold text-gray-800">
                    Table {block.number}.
                  </span>
                )}
                <InlineRenderer nodes={block.caption[lang] ?? []} {...inlineRendererBaseProps} />
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
                        {renderInlineValue(header, lang, inlineRendererBaseProps)}
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
                        {renderInlineValue(cell, lang, inlineRendererBaseProps)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {block.description?.[lang] && (
              <div className="mt-2 text-center text-xs text-gray-500">
                <InlineRenderer nodes={block.description[lang] ?? []} {...inlineRendererBaseProps} />
              </div>
            )}
          </div>
        );
      }

      case 'code': {
        return (
          <div className="my-4">
            {block.caption?.[lang] && (
              <div className="mb-2 text-xs text-gray-500">
                <InlineRenderer nodes={block.caption[lang] ?? []} {...inlineRendererBaseProps} />
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

      case 'ordered-list': {
        return (
          <ol start={block.start ?? 1} className="my-3 list-decimal space-y-1.5 pl-6">
            {block.items.map((item, i) => (
              <li key={i} className="leading-relaxed text-gray-700">
                <InlineRenderer nodes={item.content?.[lang] ?? []} {...inlineRendererBaseProps} />
              </li>
            ))}
          </ol>
        );
      }

      case 'unordered-list': {
        return (
          <ul className="my-3 list-disc space-y-1.5 pl-6">
            {block.items.map((item, i) => (
              <li key={i} className="leading-relaxed text-gray-700">
                <InlineRenderer nodes={item.content?.[lang] ?? []} {...inlineRendererBaseProps} />
              </li>
            ))}
          </ul>
        );
      }

      case 'quote': {
        return (
          <blockquote className="my-4 rounded-r-lg border-l-4 border-blue-500 bg-blue-50 py-2 pl-4 italic text-gray-600">
            <InlineRenderer nodes={block.content?.[lang] ?? []} {...inlineRendererBaseProps} />
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
  }, [block, lang, handleTextSelection, inlineRendererBaseProps]);

  return (
    <>
      <div
        ref={blockRef}
        id={block.id}
        className={`${baseClass} mb-3 p-2`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {renderContent()}
      </div>

      {showToolbar && (
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
