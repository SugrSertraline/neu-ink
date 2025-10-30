'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import type { InlineContent } from '@/types/paper'; // 确保导出 InlineContent
import type { Reference } from '@/types/paper';
import katex from 'katex';
import InlineMathSpan from './InlineMathSpan';

interface InlineRendererProps {
  nodes: InlineContent[];
  searchQuery: string;
  highlightedRefs: string[];
  setHighlightedRefs: (refs: string[]) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  references: Reference[];
}

export default function InlineRenderer({
  nodes,
  searchQuery,
  highlightedRefs,
  setHighlightedRefs,
  contentRef,
  references,
}: InlineRendererProps) {
  // --- utils ---
  const escapeRegExp = useCallback(
    (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    []
  );

  // 搜索高亮（仅用于 TextNode.content）
  const highlightText = useCallback(
    (str: string): React.ReactNode => {
      const q = searchQuery.trim();
      if (!q) return str;
      const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
      return str.split(re).map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-white"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      );
    },
    [searchQuery, escapeRegExp]
  );

  // 引用编号映射：refId -> 1-based index
  const refNoMap = useMemo(() => {
    const m = new Map<string, number>();
    references.forEach((r, idx) => m.set(r.id, idx + 1));
    return m;
  }, [references]);

  // 统一滚动 + 高亮
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const scrollAndHighlight = useCallback(
    (ids: string[]) => {
      if (!ids?.length) return;
      setHighlightedRefs(ids);

      const container = contentRef?.current ?? null;
      const firstId = ids[0];
      const target = firstId ? document.getElementById(firstId) : null;

      if (container && target) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = target.getBoundingClientRect();
        const offset = 100;
        const top =
          container.scrollTop + (elementRect.top - containerRect.top) - offset;
        container.scrollTo({ top, behavior: 'smooth' });
      } else if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        setHighlightedRefs([]);
        timerRef.current = null;
      }, 3000);
    },
    [contentRef, setHighlightedRefs]
  );

  // 递归渲染
  const renderNode = useCallback(
    (node: InlineContent, key?: React.Key): React.ReactNode => {
      switch (node.type) {
        case 'text': {
          const s = node.style ?? {};
          const style: React.CSSProperties = {
            color: s.color,
            backgroundColor: s.backgroundColor,
            fontWeight: s.bold ? 600 : undefined,
            fontStyle: s.italic ? 'italic' : undefined,
            textDecoration: [
              s.underline ? 'underline' : null,
              s.strikethrough ? 'line-through' : null,
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          };
          if (s.code) {
            // 代码内一般不做搜索高亮，避免破坏等宽布局
            return (
              <code
                key={key}
                style={style}
                className="rounded px-1 py-0.5 font-mono"
              >
                {node.content}
              </code>
            );
          }
          return (
            <span key={key} style={style}>
              {highlightText(node.content)}
            </span>
          );
        }

        case 'link': {
          const children = node.children?.map((ch, i) =>
            renderNode(ch, `${key}-c${i}`)
          );
          return (
            <a
              key={key}
              href={node.url}
              title={node.title}
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        }

        case 'inline-math':
  return <InlineMathSpan key={key} latex={node.latex} />;

        case 'citation': {
          const nums = Array.from(
            new Set(
              node.referenceIds
                .map((id) => refNoMap.get(id))
                .filter((n): n is number => typeof n === 'number')
            )
          ).sort((a, b) => a - b);

          const label =
            node.displayText && node.displayText.trim().length > 0
              ? node.displayText
              : nums.length
                ? `[${nums.join(', ')}]`
                : '[?]';

          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight(node.referenceIds);
              }}
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm font-medium mx-0.5 transition-colors"
              aria-label={`Jump to reference ${nums.join(', ')}`}
              title={`跳转到引用 ${label}`}
            >
              {label}
            </button>
          );
        }

        case 'figure-ref': {
          const label = node.displayText || 'Fig.';
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([node.figureId]);
              }}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到图：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'table-ref': {
          const label = node.displayText || 'Table';
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([node.tableId]);
              }}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到表：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'section-ref': {
          const label = node.displayText || 'Section';
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([node.sectionId]);
              }}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到章节：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'equation-ref': {
          const label = node.displayText || 'Eq.';
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([node.equationId]);
              }}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到公式：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'footnote': {
          const label = node.displayText || node.id;
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([node.id]);
              }}
              className="align-super text-xs text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到脚注：${label}`}
            >
              <sup>[{label}]</sup>
            </button>
          );
        }

        default:
          return null;
      }
    },
    [highlightText, refNoMap, scrollAndHighlight]
  );

  return <>{nodes.map((n, i) => renderNode(n, `n-${i}`))}</>;
}
