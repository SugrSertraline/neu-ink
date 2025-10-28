'use client';

import React, { JSX } from 'react';
import type { BlockContent as Block, Reference, InlineContent } from '@/types/paper';
import InlineRenderer from './InlineRenderer';
import { toAbsoluteUrl } from '@/lib/api';

type Lang = 'en' | 'both';

interface BlockRendererProps {
  block: Block;
  lang: Lang;
  sectionNumber: string;
  searchQuery: string;
  isActive: boolean;
  onClick: () => void;
  highlightedRefs: string[];
  setHighlightedRefs: (refs: string[]) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  references: Reference[];
}

export default function BlockRenderer({
  block,
  lang,
  sectionNumber,
  searchQuery,
  isActive,
  onClick,
  highlightedRefs,
  setHighlightedRefs,
  contentRef,
  references,
}: BlockRendererProps) {
  // ---- utils ----
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function highlightText(text: string, query: string): React.ReactNode {
    const q = query.trim();
    if (!q) return text;
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return text.split(re).map((part, i) =>
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
  }

  const cardClass = `p-4 rounded-lg transition-all ${
    isActive ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
  }`;

  const headingColors: Record<number, string> = {
    1: 'text-3xl',
    2: 'text-2xl',
    3: 'text-xl',
    4: 'text-lg',
    5: 'text-base',
    6: 'text-sm',
  };

  const textAlignClass = (align?: 'left' | 'center' | 'right' | 'justify') => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      case 'justify':
        return 'text-justify';
      default:
        return 'text-left';
    }
  };

  const colAlignClass = (a?: 'left' | 'center' | 'right') =>
    a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left';

  const renderInline = (nodes?: InlineContent[]) =>
    nodes ? (
      <InlineRenderer
        nodes={nodes}
        searchQuery={searchQuery}
        highlightedRefs={highlightedRefs}
        setHighlightedRefs={setHighlightedRefs}
        contentRef={contentRef}
        references={references}
      />
    ) : null;

  // ---- renderers ----
  function renderHeading() {
    const h = block;
    if (h.type !== 'heading') return null;
    const Tag = `h${h.level}` as keyof JSX.IntrinsicElements;
    const numberText = h.number ?? sectionNumber;

    return (
      <div id={h.id} onClick={onClick} className={cardClass}>
        <Tag className={`${headingColors[h.level]} font-semibold text-gray-900 dark:text-slate-100`}>
          {numberText ? <span className="mr-2">{numberText}</span> : null}
          {lang === 'en' || lang === 'both' ? renderInline(h.content.en) : null}
        </Tag>
        {lang === 'both' && h.content.zh ? (
          <div className="mt-1 italic text-gray-600 dark:text-slate-400">
            {renderInline(h.content.zh)}
          </div>
        ) : null}
      </div>
    );
  }

  function renderParagraph() {
    const p = block;
    if (p.type !== 'paragraph') return null;

    return (
      <div id={p.id} onClick={onClick} className={`${cardClass} ${textAlignClass(p.align)} cursor-pointer`}>
        {(lang === 'en' || lang === 'both') && p.content.en ? (
          <p className="text-gray-800 dark:text-slate-200 leading-relaxed mb-2">
            {renderInline(p.content.en)}
          </p>
        ) : null}
        {lang === 'both' && p.content.zh ? (
          <p className="text-gray-600 dark:text-slate-400 leading-relaxed italic">
            {renderInline(p.content.zh)}
          </p>
        ) : null}
      </div>
    );
  }

  function renderMath() {
    const m = block;
    if (m.type !== 'math') return null;

    return (
      <div id={m.id} onClick={onClick} className={cardClass}>
        <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg text-center overflow-x-auto">
          {/* 这里保留纯文本/代码展示；后续可接入 KaTeX/MathJax */}
          <code className="text-gray-800 dark:text-slate-200 font-mono text-sm">
            {m.latex}
          </code>
        </div>
        {m.number != null && (
          <p className="mt-2 text-sm text-right text-gray-600 dark:text-slate-400">({m.number})</p>
        )}
        {m.label && (
          <p className="mt-1 text-sm text-right text-gray-500 dark:text-slate-400">{m.label}</p>
        )}
      </div>
    );
  }

  function renderFigure() {
    const f = block;
    if (f.type !== 'figure') return null;

    const style: React.CSSProperties = {
      width: f.width,
      height: f.height,
    };

    return (
      <div id={f.id} onClick={onClick} className={cardClass}>
        <figure className="flex flex-col items-center">
          <img
            src={toAbsoluteUrl(f.src)}
            alt={f.alt || 'Figure'}
            style={style}
            className="max-w-full h-auto rounded-lg shadow-md"
          />
          {(f.caption.en || f.caption.zh) && (
            <figcaption className="mt-3 text-sm text-center text-gray-600 dark:text-slate-400">
              {f.number != null ? <strong className="mr-1">Figure {f.number}:</strong> : null}
              {(lang === 'en' || lang === 'both') && f.caption.en ? renderInline(f.caption.en) : null}
              {lang === 'both' && f.caption.zh ? (
                <div className="italic mt-1">{renderInline(f.caption.zh)}</div>
              ) : null}
            </figcaption>
          )}
          {(f.description?.en || f.description?.zh) && (
            <div className="mt-2 text-xs text-gray-500 dark:text-slate-400 text-center">
              {(lang === 'en' || lang === 'both') && f.description?.en ? renderInline(f.description.en) : null}
              {lang === 'both' && f.description?.zh ? (
                <div className="italic mt-1">{renderInline(f.description.zh)}</div>
              ) : null}
            </div>
          )}
        </figure>
      </div>
    );
  }

  function renderTable() {
    const t = block;
    if (t.type !== 'table') return null;

    return (
      <div id={t.id} onClick={onClick} className={`${cardClass} overflow-x-auto`}>
        <table className="min-w-full border-collapse border border-gray-300 dark:border-slate-600">
          {/* headers */}
          {t.headers && t.headers.length > 0 && (
            <thead>
              <tr className="bg-gray-100 dark:bg-slate-800 font-semibold">
                {t.headers.map((h, i) => (
                  <th
                    key={i}
                    className={`border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-800 dark:text-slate-200 ${colAlignClass(
                      t.align?.[i]
                    )}`}
                  >
                    {highlightText(h, searchQuery)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          {/* body */}
          <tbody>
            {t.rows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-gray-50 dark:bg-slate-900/40' : ''}>
                {row.map((cell, cIdx) => {
                  const contentStr =
                    typeof cell === 'string'
                      ? cell
                      : (lang === 'en' || lang === 'both'
                          ? cell.en ?? cell.zh ?? ''
                          : ''); // 目前仅支持 lang: 'en' | 'both'
                  return (
                    <td
                      key={cIdx}
                      className={`border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm text-gray-800 dark:text-slate-200 ${colAlignClass(
                        t.align?.[cIdx]
                      )}`}
                    >
                      {highlightText(contentStr, searchQuery)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {(t.caption.en || t.caption.zh) && (
          <p className="mt-3 text-sm text-center text-gray-600 dark:text-slate-400">
            {t.number != null ? <strong className="mr-1">Table {t.number}:</strong> : null}
            {(lang === 'en' || lang === 'both') && t.caption.en ? renderInline(t.caption.en) : null}
            {lang === 'both' && t.caption.zh ? <span className="italic ml-2">{renderInline(t.caption.zh)}</span> : null}
          </p>
        )}

        {(t.description?.en || t.description?.zh) && (
          <p className="mt-2 text-xs text-center text-gray-500 dark:text-slate-400">
            {(lang === 'en' || lang === 'both') && t.description?.en ? renderInline(t.description.en) : null}
            {lang === 'both' && t.description?.zh ? <span className="italic ml-2">{renderInline(t.description.zh)}</span> : null}
          </p>
        )}
      </div>
    );
  }

  function renderCode() {
    const c = block;
    if (c.type !== 'code') return null;

    return (
      <div id={c.id} onClick={onClick} className={cardClass}>
        <div className="relative bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
          {c.language && (
            <span className="absolute top-2 right-3 text-xs text-slate-300">{c.language.toUpperCase()}</span>
          )}
          <pre className="text-sm leading-relaxed">
            <code>{c.code}</code>
          </pre>
        </div>
        {(c.caption?.en || c.caption?.zh) && (
          <div className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            {(lang === 'en' || lang === 'both') && c.caption?.en ? renderInline(c.caption.en) : null}
            {lang === 'both' && c.caption?.zh ? <div className="italic mt-1">{renderInline(c.caption.zh)}</div> : null}
          </div>
        )}
      </div>
    );
  }

  function renderOrderedList() {
    const l = block;
    if (l.type !== 'ordered-list') return null;

    return (
      <div id={l.id} onClick={onClick} className={cardClass}>
        <ol className="list-decimal list-inside space-y-2" start={l.start ?? 1}>
          {l.items.map((it, idx) => (
            <li key={idx} className="text-gray-800 dark:text-slate-200">
              {(lang === 'en' || lang === 'both') && it.content.en ? (
                <span>{renderInline(it.content.en)}</span>
              ) : null}
              {lang === 'both' && it.content.zh ? (
                <div className="text-gray-600 dark:text-slate-400 italic ml-6 mt-1">
                  {renderInline(it.content.zh)}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  function renderUnorderedList() {
    const l = block;
    if (l.type !== 'unordered-list') return null;

    return (
      <div id={l.id} onClick={onClick} className={cardClass}>
        <ul className="list-disc list-inside space-y-2">
          {l.items.map((it, idx) => (
            <li key={idx} className="text-gray-800 dark:text-slate-200">
              {(lang === 'en' || lang === 'both') && it.content.en ? (
                <span>{renderInline(it.content.en)}</span>
              ) : null}
              {lang === 'both' && it.content.zh ? (
                <div className="text-gray-600 dark:text-slate-400 italic ml-6 mt-1">
                  {renderInline(it.content.zh)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderQuote() {
    const q = block;
    if (q.type !== 'quote') return null;

    return (
      <div id={q.id} onClick={onClick} className={cardClass}>
        <blockquote className="border-l-4 pl-4 italic text-gray-700 dark:text-slate-300">
          {(lang === 'en' || lang === 'both') && q.content.en ? renderInline(q.content.en) : null}
          {lang === 'both' && q.content.zh ? <div className="mt-2">{renderInline(q.content.zh)}</div> : null}
        </blockquote>
        {q.author && (
          <div className="mt-2 text-right text-sm text-gray-500 dark:text-slate-400">— {q.author}</div>
        )}
      </div>
    );
  }

  function renderDivider() {
    const d = block;
    if (d.type !== 'divider') return null;

    return (
      <div id={d.id} onClick={onClick} className={cardClass}>
        <hr className="border-gray-300 dark:border-slate-600" />
      </div>
    );
  }

  // ---- dispatch by type ----
  switch (block.type) {
    case 'heading':
      return renderHeading();
    case 'paragraph':
      return renderParagraph();
    case 'math':
      return renderMath();
    case 'figure':
      return renderFigure();
    case 'table':
      return renderTable();
    case 'code':
      return renderCode();
    case 'ordered-list':
      return renderOrderedList();
    case 'unordered-list':
      return renderUnorderedList();
    case 'quote':
      return renderQuote();
    case 'divider':
      return renderDivider();
    default:
      return null;
  }
}
