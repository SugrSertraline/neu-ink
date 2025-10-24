'use client';
import React, { useState, useEffect } from 'react';
import type { Section, Reference, BlockContent } from '../../../types/paper';
import BlockRenderer from './BlockRenderer';

interface PaperContentProps {
  sections: Section[];
  references: Reference[];
  lang: 'en' | 'both';
  searchQuery: string;
  activeBlockId: string | null;
  setActiveBlockId: (id: string | null) => void;
  onBlockClick: (id: string) => void;
  highlightedRefs: string[];
  setHighlightedRefs: (refs: string[]) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  blockNotes?: Array<{ id: string; blockId: string; content: string }>;
  setSearchResults?: (results: string[]) => void;
  setCurrentSearchIndex?: (index: number) => void;
  onBlockUpdate?: (updatedBlock: BlockContent, sectionId: string) => void; // 🆕 新增
}

export default function PaperContent({
  sections,
  references,
  lang,
  searchQuery,
  activeBlockId,
  setActiveBlockId,
  onBlockClick,
  highlightedRefs,
  setHighlightedRefs,
  contentRef,
  blockNotes = [],
  setSearchResults,
  setCurrentSearchIndex,
  onBlockUpdate
}: PaperContentProps) {

  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  const hasNotes = (blockId: string): boolean => {
    return blockNotes.some(note => note.blockId === blockId);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults?.([]);
      setCurrentSearchIndex?.(0);
      return;
    }

    const results: string[] = [];
    const collectResults = (secs: Section[]) => {
      secs.forEach(section => {
        section.content.forEach(block => {
          const blockText = JSON.stringify(block).toLowerCase();
          if (blockText.includes(searchQuery.toLowerCase())) {
            results.push(block.id);
          }
        });

        if (section.subsections) {
          collectResults(section.subsections);
        }
      });
    };

    collectResults(sections);
    setSearchResults?.(results);
    setCurrentSearchIndex?.(0);
  }, [searchQuery, sections, setSearchResults, setCurrentSearchIndex]);

  const handleCitationClick = (refIds: string[]) => {
    setHighlightedRefs(refIds);

    if (refIds.length > 0) {
      const refElement = document.getElementById(`ref-${refIds[0]}`);
      if (refElement && contentRef.current) {
        const container = contentRef.current;
        const elementTop = refElement.offsetTop;
        const containerTop = container.offsetTop;
        const scrollPosition = elementTop - containerTop - 100;

        container.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }

    setTimeout(() => setHighlightedRefs([]), 3000);
  };

  const needsBilingualLayout = (block: BlockContent): boolean => {
    return ['paragraph', 'quote', 'ordered-list', 'unordered-list'].includes(block.type);
  };

  const hasContent = (block: any, language: 'en' | 'zh'): boolean => {
    if (block.content?.[language]) return true;
    if (block.caption?.[language]) return true;
    if (block.description?.[language]) return true;
    if (block.items?.some((item: any) => item.content?.[language])) return true;
    return false;
  };

  // 🆕 递归渲染章节（双语模式）
  const renderSectionRecursive = (section: Section, level: number = 0) => {
    const headingClass = level === 0
      ? 'text-2xl font-bold border-b-2 border-gray-300 pb-1.5'
      : level === 1
        ? 'text-xl font-semibold'
        : 'text-lg font-medium';

    const marginLeft = level > 0 ? `${level * 1.5}rem` : '0';

    return (
      <section
        id={section.id}
        key={section.id}
        className="mb-6"
        style={{ marginLeft }}
      >
        <div className="mb-3">
          {section.title?.en && (
            <h2 className={`${headingClass} text-gray-900`}>
              {section.number && (
                <span className="text-blue-600 mr-2">{section.number}</span>
              )}
              {section.title.en}
              {section.title.zh && (
                <span className="text-gray-600"> / {section.title.zh}</span>
              )}
            </h2>
          )}
        </div>

        {/* 渲染当前章节的块 */}
        {section.content.map((block) => {
          const isActive = activeBlockId === block.id;
          const isHovered = hoveredBlockId === block.id;

          if (needsBilingualLayout(block)) {
            const hasEn = hasContent(block, 'en');
            const hasZh = hasContent(block, 'zh');

            return (
              <div
                data-sync-id={block.id}
                key={block.id}
                id={block.id}
                className={`mb-3 rounded border overflow-hidden transition-all relative ${isActive
                    ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-300'
                    : isHovered
                      ? 'border-gray-400 shadow-sm'
                      : 'bg-white border-gray-200'
                  }`}
                onMouseEnter={() => setHoveredBlockId(block.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
                onMouseDown={(e) => {
                  // 🆕 记录鼠标按下时的位置
                  (e.currentTarget as any)._mouseDownPos = { x: e.clientX, y: e.clientY };
                }}
                onMouseUp={(e) => {
                  // 🆕 智能判断是点击还是拖动选择
                  const mouseDownPos = (e.currentTarget as any)._mouseDownPos;
                  if (!mouseDownPos) return;

                  const distance = Math.sqrt(
                    Math.pow(e.clientX - mouseDownPos.x, 2) +
                    Math.pow(e.clientY - mouseDownPos.y, 2)
                  );

                  // 移动距离小于5px且没有选中文字，才认为是点击
                  const selection = window.getSelection();
                  const hasSelection = selection && selection.toString().trim().length > 0;

                  if (distance < 5 && !hasSelection) {
                    onBlockClick(block.id);
                  }

                  delete (e.currentTarget as any)._mouseDownPos;
                }}
                style={{
                  cursor: isActive ? 'text' : 'pointer',
                  userSelect: isActive ? 'text' : 'auto' // 🆕 允许选择文本
                }}
              >
                {hasNotes(block.id) && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                )}
                {hasEn && (
                  <div className="px-3 pt-2 pb-1.5">
                    <BlockRenderer
                      block={block}
                      lang="en"
                      isActive={false}
                      onMouseEnter={() => { }}
                      onMouseLeave={() => { }}
                      references={references}
                      onCitationClick={handleCitationClick}
                      searchQuery={searchQuery}
                      allSections={sections}
                      contentRef={contentRef}
                      onBlockUpdate={(updatedBlock) => onBlockUpdate?.(updatedBlock, section.id)} // 🆕 新增
                    />
                  </div>
                )}

                <div className="border-t border-gray-200 mx-3"></div>

                {hasZh ? (
                  <div className="px-3 pt-1.5 pb-2 bg-gray-50/50">
                    <BlockRenderer
                      block={block}
                      lang="zh"
                      isActive={false}
                      onMouseEnter={() => { }}
                      onMouseLeave={() => { }}
                      references={references}
                      onCitationClick={handleCitationClick}
                      searchQuery={searchQuery}
                      allSections={sections}
                      contentRef={contentRef}
                      onBlockUpdate={(updatedBlock) => onBlockUpdate?.(updatedBlock, section.id)}
                    />
                  </div>
                ) : (
                  <div className="px-3 pt-1.5 pb-2 bg-amber-50/30">
                    <p className="text-amber-600 text-sm italic">
                      ⚠️ 未配置中文及解释信息
                    </p>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              data-sync-id={block.id}
              key={block.id}
              id={block.id}
              className={`mb-3 rounded relative ${isActive
                  ? 'ring-2 ring-blue-400 bg-blue-50'
                  : isHovered
                    ? 'ring-1 ring-gray-300'
                    : ''
                }`}
              onMouseEnter={() => setHoveredBlockId(block.id)}
              onMouseLeave={() => setHoveredBlockId(null)}
              onMouseDown={(e) => {
                (e.currentTarget as any)._mouseDownPos = { x: e.clientX, y: e.clientY };
              }}
              onMouseUp={(e) => {
                const mouseDownPos = (e.currentTarget as any)._mouseDownPos;
                if (!mouseDownPos) return;

                const distance = Math.sqrt(
                  Math.pow(e.clientX - mouseDownPos.x, 2) +
                  Math.pow(e.clientY - mouseDownPos.y, 2)
                );

                const selection = window.getSelection();
                const hasSelection = selection && selection.toString().trim().length > 0;

                if (distance < 5 && !hasSelection) {
                  onBlockClick(block.id);
                }

                delete (e.currentTarget as any)._mouseDownPos;
              }}
              style={{
                cursor: isActive ? 'text' : 'pointer',
                userSelect: isActive ? 'text' : 'auto'
              }}
            >
              {hasNotes(block.id) && (
                <div className="absolute -top-1 -right-1 z-10">
                  <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                </div>
              )}
              <BlockRenderer
                block={block}
                lang="en"
                isActive={false}
                onMouseEnter={() => { }}
                onMouseLeave={() => { }}
                references={references}
                onCitationClick={handleCitationClick}
                searchQuery={searchQuery}
                allSections={sections}
                contentRef={contentRef}
                onBlockUpdate={(updatedBlock) => onBlockUpdate?.(updatedBlock, section.id)}
              />
            </div>
          );
        })}

        {/* 🔥 递归渲染子章节 */}
        {section.subsections?.map((subsection) =>
          renderSectionRecursive(subsection, level + 1)
        )}
      </section>
    );
  };

  // 🆕 递归渲染章节（英文模式）
  const renderSectionRecursiveEn = (section: Section, level: number = 0) => {
    const headingClass = level === 0
      ? 'text-2xl font-bold border-b-2 border-gray-300 pb-1.5'
      : level === 1
        ? 'text-xl font-semibold'
        : 'text-lg font-medium';

    const marginLeft = level > 0 ? `${level * 1.5}rem` : '0';

    return (
      <section
        data-sync-id={section.id}
        id={section.id}
        key={section.id}
        className="mb-6"
        style={{ marginLeft }}
      >
        {section.title?.en && (
          <h2 className={`${headingClass} text-gray-900 mb-3`}>
            {section.number && (
              <span className="text-blue-600 mr-2">{section.number}</span>
            )}
            {section.title.en}
          </h2>
        )}

        {section.content.map((block) => {
          const isActive = activeBlockId === block.id;
          const isHovered = hoveredBlockId === block.id;

          return (
            <div
  data-sync-id={block.id}
  key={block.id}
  id={block.id}
  className={`mb-3 rounded relative ${
    isActive 
      ? 'ring-2 ring-blue-400 bg-blue-50' 
      : isHovered
      ? 'ring-1 ring-gray-300'
      : ''
  }`}
  onMouseEnter={() => setHoveredBlockId(block.id)}
  onMouseLeave={() => setHoveredBlockId(null)}
  onMouseDown={(e) => {
    (e.currentTarget as any)._mouseDownPos = { x: e.clientX, y: e.clientY };
  }}
  onMouseUp={(e) => {
    const mouseDownPos = (e.currentTarget as any)._mouseDownPos;
    if (!mouseDownPos) return;
    
    const distance = Math.sqrt(
      Math.pow(e.clientX - mouseDownPos.x, 2) + 
      Math.pow(e.clientY - mouseDownPos.y, 2)
    );
    
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;
    
    if (distance < 5 && !hasSelection) {
      onBlockClick(block.id);
    }
    
    delete (e.currentTarget as any)._mouseDownPos;
  }}
  style={{ 
    cursor: isActive ? 'text' : 'pointer',
    userSelect: isActive ? 'text' : 'auto'
  }}
>
              {hasNotes(block.id) && (
                <div className="absolute -top-1 -right-1 z-10">
                  <div className="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                </div>
              )}
              <BlockRenderer
                block={block}
                lang="en"
                isActive={false}
                onMouseEnter={() => { }}
                onMouseLeave={() => { }}
                references={references}
                onCitationClick={handleCitationClick}
                searchQuery={searchQuery}
                allSections={sections}
                contentRef={contentRef}
                onBlockUpdate={(updatedBlock) => onBlockUpdate?.(updatedBlock, section.id)}
              />
            </div>
          );
        })}

        {/* 🔥 递归渲染子章节 */}
        {section.subsections?.map((subsection) =>
          renderSectionRecursiveEn(subsection, level + 1)
        )}
      </section>
    );
  };

  if (lang === 'both') {
    return (
      <>
        {sections.map((section) => renderSectionRecursive(section, 0))}

        {references && references.length > 0 && (
          <section id="references" className="mt-8 pt-4 border-t-2 border-gray-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">References</h2>
            <div className="space-y-2">
              {references.map((ref) => {
                const isHighlighted = highlightedRefs.includes(ref.id) ||
                  highlightedRefs.includes(String(ref.number));

                return (
                  <div
                    key={ref.id}
                    id={`ref-${ref.id}`}
                    className={`text-sm text-gray-700 p-2 rounded transition-all duration-300 ${isHighlighted ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'hover:bg-gray-50'
                      }`}
                  >
                    <span className="font-bold text-blue-600 mr-2">
                      [{ref.number || ref.id}]
                    </span>
                    <span className="font-medium">{ref.authors.join(', ')}.</span>{' '}
                    <span className="italic">"{ref.title}."</span>{' '}
                    {ref.publication && <span>{ref.publication}</span>}
                    {ref.year && <span> ({ref.year})</span>}
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        className="text-blue-600 hover:underline ml-2"
                        target="_blank"
                        rel="noreferrer"
                      >
                        [DOI]
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </>
    );
  }

  return (
    <>
      {sections.map((section) => renderSectionRecursiveEn(section, 0))}

      {references && references.length > 0 && (
        <section id="references" className="mt-8 pt-4 border-t-2 border-gray-300">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">References</h2>
          <div className="space-y-2">
            {references.map((ref) => {
              const isHighlighted = highlightedRefs.includes(ref.id) ||
                highlightedRefs.includes(String(ref.number));

              return (
                <div
                  key={ref.id}
                  id={`ref-${ref.id}`}
                  className={`text-sm text-gray-700 p-2 rounded transition-all duration-300 ${isHighlighted ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'hover:bg-gray-50'
                    }`}
                >
                  <span className="font-bold text-blue-600 mr-2">
                    [{ref.number || ref.id}]
                  </span>
                  <span className="font-medium">{ref.authors.join(', ')}.</span>{' '}
                  <span className="italic">"{ref.title}."</span>{' '}
                  {ref.publication && <span>{ref.publication}</span>}
                  {ref.year && <span> ({ref.year})</span>}
                  {ref.doi && (
                    <a
                      href={`https://doi.org/${ref.doi}`}
                      className="text-blue-600 hover:underline ml-2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      [DOI]
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}