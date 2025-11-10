'use client';

import React, {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { InlineContent } from '@/types/paper';
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

/** ---------- 小工具 ---------- */
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const truncate = (s: string | undefined | null, len = 160) =>
  (s ?? '').trim().replace(/\s+/g, ' ').slice(0, len) + ((s ?? '').length > len ? '…' : '');

/** ---------- 悬浮卡片 ---------- */
function HoverCard({
  open,
  x,
  y,
  width = 360,
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  open: boolean;
  x: number;
  y: number;
  width?: number;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  if (!open) return null;
  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    width,
    maxWidth: '95vw',
    zIndex: 60_000,
  };
  const card = (
    <div
      role="tooltip"
      aria-hidden={!open}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur p-3"
      style={style}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preview</div>
      <div className="prose prose-sm dark:prose-invert max-w-none">{children}</div>
    </div>
  );
  return createPortal(card, document.body);
}

export default function InlineRenderer({
  nodes,
  searchQuery,
  highlightedRefs,
  setHighlightedRefs,
  contentRef,
  references,
}: InlineRendererProps) {
  /** ---------- utils ---------- */
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
    references.forEach((r, idx) => m.set((r as any).id ?? (r as any).refId ?? (r as any), idx + 1));
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

  /** ---------- 悬浮预览状态 ---------- */
  type PreviewKind =
    | 'figure'
    | 'table'
    | 'section'
    | 'equation'
    | 'footnote'
    | 'citation';

  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverXY, setHoverXY] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverContent, setHoverContent] = useState<React.ReactNode>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // 计算悬浮卡片位置
  const positionForAnchor = (el: HTMLElement, width = 360) => {
    const r = el.getBoundingClientRect();
    const margin = 8;
    const x = clamp(r.left, 8, window.innerWidth - width - 8);
    const y = clamp(r.bottom + margin, 8, window.innerHeight - 8);
    return { x, y };
  };

  // 预览内容生成（从 DOM 或 references 中提取）
  const renderEquationHTML = (latex: string) => {
    try {
      const html = katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
        trust: true,
        strict: 'ignore',
        output: 'html',
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return <code className="text-red-600 dark:text-red-400">{latex}</code>;
    }
  };

  const buildFigurePreview = (host: HTMLElement) => {
    const img = host.querySelector('img') as HTMLImageElement | null;
    const cap =
      (host as any).dataset?.caption ||
      host.getAttribute('data-caption') ||
      host.querySelector('figcaption')?.textContent ||
      host.getAttribute('aria-label') ||
      '';
    if (img?.src) {
      return (
        <div className="space-y-2">
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src={img.currentSrc || img.src}
            alt={img.alt || 'figure'}
            className="max-h-48 w-auto max-w-full rounded-md border border-gray-200 dark:border-gray-700"
          />
          {cap ? <div className="text-sm text-gray-600 dark:text-gray-300">{truncate(cap, 200)}</div> : null}
        </div>
      );
    }
    return (
      <div className="text-sm text-gray-700 dark:text-gray-200">
        {truncate(cap || host.textContent, 200)}
      </div>
    );
  };

  const buildTablePreview = (host: HTMLElement) => {
    const tbl = host.querySelector('table') as HTMLTableElement | null;
    if (!tbl) {
      return (
        <div className="text-sm text-gray-700 dark:text-gray-200">
          {truncate(host.textContent, 200)}
        </div>
      );
    }
    const rows = Array.from(tbl.rows).slice(0, 6);
    const colCount = rows[0]?.cells?.length ?? 0;
    const cols = Math.min(colCount, 6);
    const cells = rows.map((tr, i) =>
      Array.from(tr.cells)
        .slice(0, cols)
        .map((td, j) => ({ key: `${i}-${j}`, text: truncate(td.textContent, 40) }))
    );
    return (
      <div className="overflow-x-auto">
        <table className="min-w-[280px] w-full border border-gray-200 dark:border-gray-700 text-[13px]">
          <tbody>
            {cells.map((row, i) => (
              <tr key={i} className={i === 0 ? 'bg-gray-50 dark:bg-gray-800/70' : ''}>
                {row.map((c) => (
                  <td
                    key={c.key}
                    className="px-2 py-1 border border-gray-200 dark:border-gray-700 whitespace-nowrap"
                    title={c.text}
                  >
                    {c.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {colCount > cols ? (
          <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">… columns truncated</div>
        ) : null}
      </div>
    );
  };

  const buildSectionPreview = (host: HTMLElement) => {
    const title =
      (host as any).dataset?.title ||
      host.getAttribute('data-title') ||
      host.querySelector('h1,h2,h3,h4,h5,h6')?.textContent ||
      host.getAttribute('aria-label') ||
      '';
    const para =
      host.querySelector('p')?.textContent ||
      host.textContent ||
      '';
    return (
      <div>
        {title ? <div className="font-semibold mb-1">{truncate(title, 120)}</div> : null}
        {para ? <div className="text-sm text-gray-700 dark:text-gray-200">{truncate(para, 200)}</div> : null}
      </div>
    );
  };

  const buildFootnotePreview = (host: HTMLElement) => {
    const t = host.textContent || '';
    return <div className="text-sm text-gray-700 dark:text-gray-200">{truncate(t, 220)}</div>;
  };

  const buildEquationPreview = (host: HTMLElement) => {
    const latex =
      (host as any).dataset?.latex ||
      host.getAttribute('data-latex') ||
      host.getAttribute('aria-label') ||
      host.textContent ||
      '';
    return renderEquationHTML(latex);
  };

  const buildCitationPreview = (ids: string[]) => {
    const items = ids
      .map((id) => ({
        id,
        no: refNoMap.get(id),
        ref: references.find((r) => (r as any).id === id || (r as any).refId === id) as any,
      }))
      .sort((a, b) => (a.no ?? 9_999) - (b.no ?? 9_999));

    return (
      <div className="space-y-2">
        {items.map((it, i) => {
          const r = it.ref ?? {};
          const title = r.title ?? r.name ?? r.citationText ?? r.text ?? '';
          const authors = Array.isArray(r.authors) ? r.authors.join(', ') : (r.author ?? r.authors ?? '');
          const year = r.year ?? r.date ?? '';
          const venue = r.journal ?? r.booktitle ?? r.venue ?? '';
          return (
            <div key={i} className="text-sm">
              <div className="font-medium">
                {typeof it.no === 'number' ? `[${it.no}] ` : ''}{truncate(title || r.id || it.id, 140)}
              </div>
              <div className="text-gray-600 dark:text-gray-300">
                {truncate([authors, venue, year].filter(Boolean).join(' · '), 160)}
              </div>
              {r.url ? (
                <a
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open link
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const openHover = (kind: PreviewKind, ids: string[], anchor: HTMLElement) => {
    clearTimers();
    openTimerRef.current = window.setTimeout(() => {
      let content: React.ReactNode = null;

      if (kind === 'citation') {
        content = buildCitationPreview(ids);
      } else {
        const id = ids[0];
        const host = id ? document.getElementById(id) : null;
        if (!host) {
          content = (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              未找到对应元素（id="{id}"）。请检查锚点是否存在。
            </div>
          );
        } else {
          switch (kind) {
            case 'figure':
              content = buildFigurePreview(host);
              break;
            case 'table':
              content = buildTablePreview(host);
              break;
            case 'section':
              content = buildSectionPreview(host);
              break;
            case 'equation':
              content = buildEquationPreview(host);
              break;
            case 'footnote':
              content = buildFootnotePreview(host);
              break;
          }
        }
      }

      setHoverContent(content);
      setHoverXY(positionForAnchor(anchor));
      anchorElRef.current = anchor;
      setHoverOpen(true);
    }, 120);
  };

  const closeHover = () => {
    clearTimers();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverOpen(false);
      setHoverContent(null);
      anchorElRef.current = null;
    }, 120);
  };

  useEffect(() => {
    if (!hoverOpen || !anchorElRef.current) return;
    const handle = () => {
      const pos = positionForAnchor(anchorElRef.current!);
      setHoverXY(pos);
    };
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [hoverOpen]);

  /** ---------- 递归渲染 ---------- */
  const renderNode = useCallback(
    (node: InlineContent, key?: React.Key): React.ReactNode => {
      switch (node.type) {
        case 'text': {
          const s = (node as any).style ?? {};
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
            // 代码风格在下面另行处理
          };
          if (s.code) {
            return (
              <code
                key={key}
                style={style}
                className="rounded px-1 py-0.5 font-mono"
              >
                {String((node as any).content || '')}
              </code>
            );
          }
          return (
            <span key={key} style={style}>
              {highlightText(String((node as any).content || ''))}
            </span>
          );
        }

        case 'link': {
          const children = (node as any).children?.map((ch: InlineContent, i: number) =>
            renderNode(ch, `${key}-c${i}`)
          ) || [];
          return (
            <a
              key={key}
              href={String((node as any).url || '')}
              title={String((node as any).title || '')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        }

        case 'inline-math':
          return <InlineMathSpan key={key} latex={String((node as any).latex || '')} />;

        case 'citation': {
          const n = node as any;
          const nums = Array.from<number>(
            new Set<number>(
              node.referenceIds
                .map((id) => refNoMap.get(id))
                .filter((n): n is number => typeof n === 'number')
            )
          ).sort((a, b) => a - b);

          const label =
            n.displayText && n.displayText.trim().length > 0
              ? String(n.displayText)
              : nums.length
                ? `[${nums.join(', ')}]`
                : '[?]';

          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight(n.referenceIds);
              }}
              onMouseEnter={(e) => openHover('citation', n.referenceIds, e.currentTarget)}
              onMouseLeave={closeHover}
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm font-medium mx-0.5 transition-colors"
              aria-label={`Jump to reference ${nums.join(', ')}` }
              title={`跳转到引用 ${label}`}
            >
              {label}
            </button>
          );
        }

        case 'figure-ref': {
          const n = node as any;
          const label = String(n.displayText || 'Fig.');
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([n.figureId]);
              }}
              onMouseEnter={(e) => openHover('figure', [n.figureId], e.currentTarget)}
              onMouseLeave={closeHover}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到图：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'table-ref': {
          const n = node as any;
          const label = String(n.displayText || 'Table');
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([n.tableId]);
              }}
              onMouseEnter={(e) => openHover('table', [n.tableId], e.currentTarget)}
              onMouseLeave={closeHover}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到表：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'section-ref': {
          const n = node as any;
          const label = String(n.displayText || 'Section');
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([n.sectionId]);
              }}
              onMouseEnter={(e) => openHover('section', [n.sectionId], e.currentTarget)}
              onMouseLeave={closeHover}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到章节：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'equation-ref': {
          const n = node as any;
          const label = String(n.displayText || 'Eq.');
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([n.equationId]);
              }}
              onMouseEnter={(e) => openHover('equation', [n.equationId], e.currentTarget)}
              onMouseLeave={closeHover}
              className="inline text-blue-600 dark:text-blue-400 hover:underline"
              title={`跳转到公式：${label}`}
            >
              {label}
            </button>
          );
        }

        case 'footnote': {
          const n = node as any;
          const label = String(n.displayText || n.id || '');
          return (
            <button
              key={key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollAndHighlight([n.id]);
              }}
              onMouseEnter={(e) => openHover('footnote', [n.id], e.currentTarget)}
              onMouseLeave={closeHover}
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

  return (
    <>
      {nodes.map((n, i) => renderNode(n, `n-${i}`))}
      <HoverCard
        open={hoverOpen}
        x={hoverXY.x}
        y={hoverXY.y}
        onMouseEnter={() => {
          if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
        }}
        onMouseLeave={closeHover}
      >
        {hoverContent}
      </HoverCard>
    </>
  );
}
