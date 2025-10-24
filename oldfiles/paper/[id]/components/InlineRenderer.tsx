'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { InlineContent, Reference, Section, FigureBlock, TableBlock } from '../../../types/paper';
import katex from 'katex';
import { createPortal } from 'react-dom';
import { API_BASE, toAbsoluteUrl } from '../../../lib/api';

interface InlineRendererProps {
  nodes?: InlineContent[];
  references?: Reference[];
  onCitationClick?: (refIds: string[]) => void;
  searchQuery?: string;
  allSections?: Section[];
  contentRef?: React.RefObject<HTMLDivElement | null>;
}

// 行内公式组件
function InlineMath({ math }: { math: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && math) {
      try {
        katex.render(math, ref.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        console.error('KaTeX inline render error:', e);
        if (ref.current) {
          ref.current.textContent = `$${math}$`;
        }
      }
    }
  }, [math]);

  return <span ref={ref} className="inline-block mx-0.5" />;
}

export default function InlineRenderer({
  nodes,
  references = [],
  onCitationClick,
  searchQuery = '',
  allSections = [],
  contentRef
}: InlineRendererProps) {
  if (!nodes) return null;

  // 查找图表
  const findFigureOrTable = (id: string): FigureBlock | TableBlock | null => {
    for (const section of allSections) {
      const found = section.content.find(block => block.id === id);
      if (found && (found.type === 'figure' || found.type === 'table')) {
        return found as FigureBlock | TableBlock;
      }

      if (section.subsections) {
        for (const sub of section.subsections) {
          const subFound = sub.content.find(block => block.id === id);
          if (subFound && (subFound.type === 'figure' || subFound.type === 'table')) {
            return subFound as FigureBlock | TableBlock;
          }
        }
      }
    }
    return null;
  };

  // 搜索高亮函数
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'text': {
            const textNode = node as any;
            let className = '';
            if (textNode.style?.bold) className += 'font-bold ';
            if (textNode.style?.italic) className += 'italic ';
            if (textNode.style?.underline) className += 'underline ';
            if (textNode.style?.strikethrough) className += 'line-through ';
            if (textNode.style?.code) className += 'px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-red-600 ';

            const inlineStyle: React.CSSProperties = {
              userSelect: 'text'
            };
            if (textNode.style?.color) inlineStyle.color = textNode.style.color;
            if (textNode.style?.backgroundColor) inlineStyle.backgroundColor = textNode.style.backgroundColor;

            return (
              <span key={i} className={className} style={inlineStyle}>
                {highlightText(textNode.content)}
              </span>
            );
          }

          case 'link':
            return (
              <a
                key={i}
                href={node.url}
                className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 hover:decoration-blue-500 transition-colors"
                target="_blank"
                rel="noreferrer"
                title={node.title}
              >
                <InlineRenderer
                  nodes={(node as any).children}
                  searchQuery={searchQuery}
                  allSections={allSections}
                />
              </a>
            );

          case 'citation': {
            const citationNode = node as any;
            const refIds = citationNode.referenceIds || [];
            let displayText = citationNode.displayText || '';

            // ✅ 关键修复：智能检测并重新生成 displayText
            // 如果 displayText 为空、包含 "ref-"、或者不是纯数字格式，则重新生成
            const needsRegeneration = !displayText || 
                                       refIds.some((id: string) => displayText.includes(id)) ||
                                       !/^\[\d+(,\s*\d+)*\]$/.test(displayText);
            
            if (needsRegeneration) {
              console.log('🔄 InlineRenderer: 重新生成引用显示文本');
              console.log('   原始 displayText:', displayText);
              console.log('   referenceIds:', refIds);
              console.log('   可用 references:', references.map(r => ({ id: r.id, number: r.number })));
              
              // 从 references 数组中查找对应的 number
              const numbers = refIds
                .map((id: string) => {
                  const ref = references.find(r => r.id === id);
                  console.log(`   查找 ${id}:`, ref ? `找到 number=${ref.number}` : '未找到');
                  return ref?.number;
                })
                .filter((num: any) => num !== undefined);
              
              if (numbers.length > 0) {
                displayText = `[${numbers.join(',')}]`;
                console.log('   ✅ 生成新的 displayText:', displayText);
              } else {
                displayText = `[${refIds.join(',')}]`;
                console.log('   ⚠️ 未找到 number，使用 ID:', displayText);
              }
            }

            // 获取引用详情（用于悬停预览）
            const refDetails = refIds
              .map((id: string) => references.find(r => r.id === id || String(r.number) === id))
              .filter(Boolean);

            return (
              <CitationLink
                key={i}
                displayText={displayText}
                references={refDetails}
                onClick={() => onCitationClick?.(refIds)}
                contentRef={contentRef}
              />
            );
          }

          case 'inline-math':
            return (
              <InlineMath key={i} math={node.latex || ''} />
            );

          case 'figure-ref': {
            const refNode = node as any;
            const displayText = refNode.displayText || '';
            const figureId = refNode.figureId;

            return (
              <FigureRefLink
                key={i}
                displayText={displayText}
                figureId={figureId}
                findFigure={findFigureOrTable}
              />
            );
          }

          case 'table-ref': {
            const refNode = node as any;
            const displayText = refNode.displayText || '';
            const tableId = refNode.tableId;

            return (
              <TableRefLink
                key={i}
                displayText={displayText}
                tableId={tableId}
                findTable={findFigureOrTable}
              />
            );
          }

          case 'section-ref':
          case 'equation-ref': {
            const refNode = node as any;
            const displayText = refNode.displayText || '';
            const targetId = refNode.sectionId || refNode.equationId;

            return (
              <a
                key={i}
                href={`#${targetId}`}
                className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(targetId);
                  if (el && contentRef?.current) {
                    const containerRect = contentRef.current.getBoundingClientRect();
                    const elementRect = el.getBoundingClientRect();
                    const scrollTop = contentRef.current.scrollTop;
                    const targetPosition = scrollTop + (elementRect.top - containerRect.top) - 100;

                    contentRef.current.scrollTo({
                      top: targetPosition,
                      behavior: 'smooth'
                    });

                    el.classList.add('ring-2', 'ring-blue-400', 'bg-blue-50');
                    setTimeout(() => {
                      el.classList.remove('ring-2', 'ring-blue-400', 'bg-blue-50');
                    }, 2000);
                  }
                }}
              >
                {displayText}
              </a>
            );
          }

          case 'footnote': {
            const footnoteNode = node as any;
            return (
              <sup
                key={i}
                title={footnoteNode.content}
                className="cursor-help text-amber-600 hover:text-amber-800 font-medium transition-colors"
              >
                {footnoteNode.displayText}
              </sup>
            );
          }

          default:
            return <span key={i} />;
        }
      })}
    </>
  );
}

// 引用链接组件（带悬停预览）
function CitationLink({
  displayText,
  references,
  onClick,
  contentRef
}: {
  displayText: string;
  references: Reference[];
  onClick: () => void;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const supRef = useRef<HTMLElement>(null);

  // ✅ 清理显示文本，移除方括号
  const cleanDisplayText = displayText.replace(/^\[|\]$/g, '');

  useEffect(() => {
    if (showTooltip && supRef.current) {
      const rect = supRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [showTooltip]);

  return (
    <>
      <sup
        ref={supRef}
        className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium hover:underline transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.preventDefault();
          onClick();

          const referencesElement = document.getElementById('references');
          if (referencesElement && contentRef?.current) {
            const containerRect = contentRef.current.getBoundingClientRect();
            const elementRect = referencesElement.getBoundingClientRect();
            const scrollTop = contentRef.current.scrollTop;
            const targetPosition = scrollTop + (elementRect.top - containerRect.top) - 100;

            contentRef.current.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        }}
      >
        [{cleanDisplayText}]
      </sup>

      {showTooltip && references.length > 0 && createPortal(
        <div
          className="fixed z-[9999] w-96 max-w-screen-sm bg-white rounded-lg shadow-2xl border border-gray-300 p-4 pointer-events-none"
          style={{
            top: `${tooltipPos.top - 8}px`,
            left: `${tooltipPos.left}px`,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-2">
            {references.map((ref, idx) => (
              <div key={idx} className="text-xs text-gray-700">
                <div className="font-semibold text-gray-900 mb-1">
                  [{ref.number || ref.id}] {ref.title}
                </div>
                <div className="text-gray-600">
                  {ref.authors.join(', ')}
                  {ref.publication && ` • ${ref.publication}`}
                  {ref.year && ` • ${ref.year}`}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-white border-r border-b border-gray-300 transform rotate-45"></div>
        </div>,
        document.body
      )}
    </>
  );
}

// 图片引用链接（带预览）
function FigureRefLink({
  displayText,
  figureId,
  findFigure
}: {
  displayText: string;
  figureId: string;
  findFigure: (id: string) => FigureBlock | TableBlock | null;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (showPreview && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPreviewPos({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      });
    }
  }, [showPreview]);

  const figure = findFigure(figureId);

  return (
    <>
      <span
        ref={linkRef}
        className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        onClick={() => {
          document.getElementById(figureId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      >
        {displayText}
      </span>

      {showPreview && figure && figure.type === 'figure' && createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl border-2 border-blue-300 p-3 pointer-events-none"
          style={{
            top: `${previewPos.top - 8}px`,
            left: `${previewPos.left}px`,
            transform: 'translate(-50%, -100%)',
            maxWidth: '320px'
          }}
        >
          <img
            src={toAbsoluteUrl(figure.src)}
            alt={figure.alt || ''}
            className="w-full h-auto rounded"
          />
          {figure.caption?.en && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              <InlineRenderer nodes={figure.caption.en} />
            </p>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-blue-300 transform rotate-45"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// 表格引用链接（带预览）
function TableRefLink({
  displayText,
  tableId,
  findTable
}: {
  displayText: string;
  tableId: string;
  findTable: (id: string) => FigureBlock | TableBlock | null;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (showPreview && linkRef.current) {
      const rect = linkRef.current.getBoundingClientRect();
      setPreviewPos({
        top: rect.top + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX
      });
    }
  }, [showPreview]);

  const table = findTable(tableId);

  return (
    <>
      <span
        ref={linkRef}
        className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        onClick={() => {
          document.getElementById(tableId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      >
        {displayText}
      </span>

      {showPreview && table && table.type === 'table' && createPortal(
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl border-2 border-blue-300 p-3 pointer-events-none"
          style={{
            top: `${previewPos.top - 8}px`,
            left: `${previewPos.left}px`,
            transform: 'translate(-50%, -100%)',
            maxWidth: '480px'
          }}
        >
          <div className="overflow-auto max-h-64">
            <table className="min-w-full text-xs border-collapse">
              {table.headers && (
                <thead>
                  <tr className="bg-gray-100">
                    {table.headers.map((header, i) => (
                      <th key={i} className="px-2 py-1 text-left font-semibold border border-gray-300">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {table.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-gray-300">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 border border-gray-300">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {table.rows.length > 5 && (
                  <tr>
                    <td colSpan={table.rows[0]?.length || 1} className="px-2 py-1 text-center text-gray-400 italic">
                      ...共 {table.rows.length} 行
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {table.caption?.en && (
            <p className="text-xs text-gray-600 mt-2 text-center">
              <InlineRenderer nodes={table.caption.en} />
            </p>
          )}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-blue-300 transform rotate-45"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}