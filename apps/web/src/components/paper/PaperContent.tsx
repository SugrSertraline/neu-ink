'use client';

import React, { useEffect } from 'react';
import type { Section, Reference, InlineContent } from '@/types/paper';
import BlockRenderer from './BlockRenderer';

type Lang = 'en' | 'both';

interface PaperContentProps {
  sections: Section[];
  references?: Reference[];
  lang: Lang;
  searchQuery: string;
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  onBlockClick?: (blockId: string) => void;
  highlightedRefs: string[];
  setHighlightedRefs: (refs: string[]) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  setSearchResults: (results: string[]) => void;
  setCurrentSearchIndex: (index: number) => void;
}

export default function PaperContent({
  sections,
  references = [],
  lang,
  searchQuery,
  activeBlockId,
  setActiveBlockId,
  onBlockClick,
  highlightedRefs,
  setHighlightedRefs,
  contentRef,
  setSearchResults,
  setCurrentSearchIndex,
}: PaperContentProps) {
  // ---------- utils ----------
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightText = (text: string, query: string): React.ReactNode => {
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
  };

  // 递归提取 InlineContent 文本
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

  // 针对不同 Block 类型提取可检索文本
  const extractBlockText = (block: any): string => {
    switch (block.type) {
      case 'heading':
        return [extractInlineText(block.content?.en), extractInlineText(block.content?.zh)].join(' ');
      case 'paragraph':
        return [extractInlineText(block.content?.en), extractInlineText(block.content?.zh)].join(' ');
      case 'math':
        return [block.latex || '', block.label || '', block.number ? String(block.number) : ''].join(' ');
      case 'figure':
        return [
          extractInlineText(block.caption?.en),
          extractInlineText(block.caption?.zh),
          extractInlineText(block.description?.en),
          extractInlineText(block.description?.zh),
          block.alt || '',
          block.uploadedFilename || '',
        ].join(' ');
      case 'table': {
        const headerText = Array.isArray(block.headers) ? block.headers.join(' ') : '';
        const rowsText = Array.isArray(block.rows)
          ? block.rows
              .map((row: any[]) =>
                row
                  .map((cell) => {
                    if (typeof cell === 'string') return cell;
                    if (cell && typeof cell === 'object') {
                      const en = cell.en ?? '';
                      const zh = cell.zh ?? '';
                      return [en, zh].filter(Boolean).join(' ');
                    }
                    return '';
                  })
                  .join(' ')
              )
              .join(' ')
          : '';
        const cap = [
          extractInlineText(block.caption?.en),
          extractInlineText(block.caption?.zh),
          extractInlineText(block.description?.en),
          extractInlineText(block.description?.zh),
        ].join(' ');
        return [headerText, rowsText, cap].join(' ');
      }
      case 'code':
        return [block.code || '', extractInlineText(block.caption?.en), extractInlineText(block.caption?.zh)].join(' ');
      case 'ordered-list':
      case 'unordered-list':
        return Array.isArray(block.items)
          ? block.items
              .map((it: any) =>
                [extractInlineText(it?.content?.en), extractInlineText(it?.content?.zh)].join(' ')
              )
              .join(' ')
          : '';
      case 'quote':
        return [extractInlineText(block.content?.en), extractInlineText(block.content?.zh), block.author || ''].join(' ');
      case 'divider':
        return '';
      default:
        return '';
    }
  };

  // ---------- 搜索：收集匹配的 blockId ----------
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: string[] = [];
    sections.forEach((section) => {
      section.content?.forEach((block: any) => {
        const text = extractBlockText(block).toLowerCase();
        if (text.includes(q)) results.push(block.id);
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, sections, setSearchResults, setCurrentSearchIndex]);

  // ---------- 章节编号 ----------
  const generateSectionNumber = (section: Section, index: number): string => `${index + 1}`;

  // ---------- 参考文献行渲染 ----------
  const formatReference = (ref: Reference): React.ReactNode => {
    const parts: React.ReactNode[] = [];

    if (ref.authors?.length) {
      parts.push(<strong key="authors">{ref.authors.join(', ')}</strong>);
    }

    if (ref.year) {
      parts.push(
        <span key="year" className="text-gray-500 dark:text-slate-400">
          {' '}({ref.year})
        </span>
      );
    }

    if (ref.title) {
      parts.push(<span key="title">. {ref.title}</span>);
    }

    const pubBits: string[] = [];
    if (ref.publication) pubBits.push(ref.publication);
    const volIssue: string[] = [];
    if (ref.volume) volIssue.push(ref.volume);
    if (ref.issue) volIssue.push(`(${ref.issue})`);
    if (volIssue.length) pubBits.push(volIssue.join(''));
    if (ref.pages) pubBits.push(ref.pages);
    if (pubBits.length) {
      parts.push(<span key="pub">. {pubBits.join(', ')}</span>);
    }

    if (ref.doi) {
      parts.push(
        <span key="doi">
          . DOI:{' '}
          <a
            href={`https://doi.org/${ref.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {ref.doi}
          </a>
        </span>
      );
    } else if (ref.url) {
      parts.push(
        <span key="url">
          .{' '}
          <a
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {ref.url}
          </a>
        </span>
      );
    }

    return <>{parts}</>;
  };

  // ---------- 渲染 ----------
  return (
    <div className="space-y-8">
      {sections.map((section, sectionIndex) => {
        const sectionNumber = generateSectionNumber(section, sectionIndex);

        const normalizedEn = (section.title?.en ?? '')
          .trim()
          .toLowerCase()
          .replace(/^\d+[\.\)]?\s*/, '');
        const normalizedZh = (section.title?.zh ?? '').trim();
        const isReferences =
          normalizedEn === 'references' ||
          normalizedEn === 'bibliography' ||
          normalizedZh === '参考文献';

        // 双语标题结构
        const hasZh = !!section.title?.zh?.trim();
        const zhPart = hasZh ? (
          <span className="rounded px-1 bg-gray-50 text-gray-700">
            {highlightText(section.title!.zh!, searchQuery)}
          </span>
        ) : (
          <span className="rounded px-1 bg-gray-100 text-gray-500 italic">
            该标题组件未配置中文
          </span>
        );

        return (
          <section
            key={section.id}
            id={section.id}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            {/* Section 双语标题 */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-baseline gap-3">
              {sectionNumber && (
                <span className="text-blue-600 dark:text-blue-400">{sectionNumber}.</span>
              )}
              <span>{highlightText(section.title?.en ?? '', searchQuery)}</span>
              <span className="text-gray-400 mx-1">/</span>
              {zhPart}
            </h2>

            {/* 内容块 */}
            <div className="space-y-4">
              {section.content?.map((block: any) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  lang={lang === 'both' ? 'zh' : 'en'}
                  searchQuery={searchQuery}
                  isActive={activeBlockId === block.id}
                  onMouseEnter={() => setActiveBlockId(block.id)}
                  onMouseLeave={() => setActiveBlockId(null)}
                  onBlockUpdate={() => {}}
                  highlightedRefs={highlightedRefs}
                  setHighlightedRefs={setHighlightedRefs}
                  contentRef={contentRef}
                  references={references}
                />
              ))}
            </div>

            {/* References 区域 */}
            {isReferences && references.length > 0 && (
              <div className="mt-6 space-y-3">
                {references.map((ref, idx) => (
                  <div
                    key={ref.id}
                    id={ref.id}
                    className={`text-sm p-3 rounded transition-colors ${
                      highlightedRefs.includes(ref.id)
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500'
                        : 'bg-gray-50 dark:bg-slate-800'
                    }`}
                  >
                    <span className="font-medium text-gray-700 dark:text-slate-300">
                      [{idx + 1}]
                    </span>{' '}
                    <span className="text-gray-600 dark:text-slate-400">
                      {formatReference(ref)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
