// src/components/paper/PaperContent.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Section,
  InlineContent,
  BlockContent,
  Reference,
  HeadingBlock,
  ParagraphBlock,
  QuoteBlock,
} from '@/types/paper';
import BlockRenderer from './BlockRenderer';
import BlockEditor from './editor/BlockEditor';
import {
  SectionContextMenu,
  BlockContextMenu,
  RootSectionContextMenu,
} from './PaperContextMenus';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditingState } from '@/stores/useEditingState';

type Lang = 'en' | 'both';

interface PaperContentProps {
  sections: Section[];
  references?: Reference[];
  lang: Lang;
  searchQuery: string;
  activeBlockId: string | null;
  selectedBlockId?: string | null;
  setActiveBlockId: (id: string | null) => void;
  onBlockClick?: (blockId: string) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  setSearchResults: (results: string[]) => void;
  setCurrentSearchIndex: (index: number) => void;
  onSectionTitleUpdate?: (sectionId: string, title: Section['title']) => void;
  onSectionAddSubsection?: (sectionId: string) => void;
  onSectionInsert?: (
    targetSectionId: string | null,
    position: 'above' | 'below',
    parentSectionId: string | null,
  ) => void;
  onSectionMove?: (
    sectionId: string,
    direction: 'up' | 'down',
    parentSectionId: string | null,
  ) => void;
  onSectionDelete?: (sectionId: string) => void;
  onSectionAddBlock?: (sectionId: string, type: BlockContent['type']) => void;
  onBlockUpdate?: (blockId: string, block: BlockContent) => void;
  onBlockDuplicate?: (blockId: string) => void;
  onBlockDelete?: (blockId: string) => void;
  onBlockInsert?: (blockId: string, position: 'above' | 'below') => void;
  onBlockMove?: (blockId: string, direction: 'up' | 'down') => void;
  onBlockAppendSubsection?: (blockId: string) => void;
  onBlockAddComponent?: (blockId: string, type: BlockContent['type']) => void;
}

type ContentBlock = HeadingBlock | ParagraphBlock | QuoteBlock;

const cloneBlock = <T extends BlockContent>(block: T): T =>
  JSON.parse(JSON.stringify(block));

function hasContent(block: BlockContent): block is ContentBlock {
  return block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote';
}

export default function PaperContent({
  sections,
  references = [],
  lang,
  searchQuery,
  activeBlockId,
  selectedBlockId,
  setActiveBlockId,
  onBlockClick,
  contentRef,
  setSearchResults,
  setCurrentSearchIndex,
  onSectionTitleUpdate,
  onSectionAddSubsection,
  onSectionInsert,
  onSectionMove,
  onSectionDelete,
  onSectionAddBlock,
  onBlockUpdate,
  onBlockDuplicate,
  onBlockDelete,
  onBlockInsert,
  onBlockMove,
  onBlockAppendSubsection,
  onBlockAddComponent,
}: PaperContentProps) {
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightText = (text: string, query: string): React.ReactNode => {
    const q = query.trim();
    if (!q) return text;
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return text.split(re).map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-white">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  };

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

  const extractBlockText = (block: BlockContent): string => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        return [
          extractInlineText(hasContent(block) ? block.content?.en : []),
          extractInlineText(hasContent(block) ? block.content?.zh : []),
        ].join(' ');
      case 'math':
        return [
          block.latex || '',
          (block as any).label || '',
          (block as any).number ? String((block as any).number) : '',
        ].join(' ');
      case 'figure':
        return [
          extractInlineText(block.caption?.en),
          extractInlineText(block.caption?.zh),
          extractInlineText(block.description?.en),
          extractInlineText(block.description?.zh),
          (block as any).alt || '',
          (block as any).uploadedFilename || '',
        ].join(' ');
      case 'table': {
        const headerText = Array.isArray((block as any).headers) ? (block as any).headers.join(' ') : '';
        const rowsText = Array.isArray((block as any).rows)
          ? (block as any).rows
            .map((row: any[]) =>
              row
                .map((cell: any) => {
                  if (typeof cell === 'string') return cell;
                  if (cell && typeof cell === 'object') {
                    const en = cell.en ?? '';
                    const zh = cell.zh ?? '';
                    return [en, zh].filter(Boolean).join(' ');
                  }
                  return '';
                })
                .join(' '),
            )
            .join(' ')
          : '';
        const cap = [
          extractInlineText((block as any).caption?.en),
          extractInlineText((block as any).caption?.zh),
          extractInlineText((block as any).description?.en),
          extractInlineText((block as any).description?.zh),
        ].join(' ');
        return [headerText, rowsText, cap].join(' ');
      }
      case 'code':
        return [
          (block as any).code || '',
          extractInlineText((block as any).caption?.en),
          extractInlineText((block as any).caption?.zh),
        ].join(' ');
      case 'ordered-list':
      case 'unordered-list':
        return Array.isArray((block as any).items)
          ? (block as any).items
            .map((it: any) =>
              [
                extractInlineText(it?.content?.en),
                extractInlineText(it?.content?.zh),
              ].join(' '),
            )
            .join(' ')
          : '';
      case 'quote':
        return [
          extractInlineText(hasContent(block) ? block.content?.en : []),
          extractInlineText(hasContent(block) ? block.content?.zh : []),
          (block as any).author || '',
        ].join(' ');
      case 'divider':
        return '';
      default:
        return '';
    }
  };

  const traverseSections = useCallback(
    (nodes: Section[], visitor: (section: Section, path: number[]) => void, path: number[] = []) => {
      nodes.forEach((section, index) => {
        const nextPath = [...path, index + 1];
        visitor(section, nextPath);
        if (section.subsections?.length) {
          traverseSections(section.subsections, visitor, nextPath);
        }
      });
    },
    [],
  );

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: string[] = [];
    traverseSections(sections, (section) => {
      section.content?.forEach((block) => {
        const text = extractBlockText(block).toLowerCase();
        if (text.includes(q)) results.push(block.id);
      });
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);
  }, [searchQuery, sections, traverseSections, setSearchResults, setCurrentSearchIndex]);

  const generateSectionNumber = (path: number[]): string => path.join('.');

  const { canEditContent } = usePaperEditPermissionsContext();
  const { isEditing, clearEditing, setHasUnsavedChanges, switchToEdit } = useEditingState();
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!canEditContent) {
      setRenamingSectionId(null);
      clearEditing();
    }
  }, [canEditContent, clearEditing]);

  const handleSectionRenameConfirm = useCallback(
    (sectionId: string, title: Section['title']) => {
      onSectionTitleUpdate?.(sectionId, title);
      setRenamingSectionId(null);
      setHasUnsavedChanges(false);
    },
    [onSectionTitleUpdate, setHasUnsavedChanges],
  );

  const handleBlockEditConfirm = useCallback(
    (blockId: string, block: BlockContent) => {
      onBlockUpdate?.(blockId, block);
      setHasUnsavedChanges(false);
      clearEditing();
    },
    [onBlockUpdate, clearEditing, setHasUnsavedChanges],
  );

  const handleBlockEditStart = useCallback(
    (blockId: string) => {
      const switched = switchToEdit(blockId, {
        beforeSwitch: () => {
          if (renamingSectionId && renamingSectionId !== blockId) {
            setRenamingSectionId(null);
          }
        },
        onRequestSave: () => {
          // TODO: auto-save pending block
        },
      });
      if (!switched) return;
      setActiveBlockId(blockId);
    },
    [switchToEdit, renamingSectionId, setActiveBlockId],
  );

  const handleSectionEditStart = useCallback(
    (sectionId: string) => {
      const switched = switchToEdit(sectionId, {
        beforeSwitch: () => {
          if (renamingSectionId && renamingSectionId !== sectionId) {
            setRenamingSectionId(null);
          }
        },
        onRequestSave: () => {
          // TODO: auto-save pending section
        },
      });
      if (!switched) return;
      setRenamingSectionId(sectionId);
    },
    [switchToEdit, renamingSectionId],
  );

  const renderedTree = useMemo(() => {
    const renderSection = (
      section: Section,
      path: number[],
      siblings: Section[],
      index: number,
      parentSectionId: string | null,
    ): React.ReactNode => {
      const sectionNumber = generateSectionNumber(path);
      const hasZhTitle = !!section.title?.zh?.trim();
      const normalizedZh = (section.title?.zh ?? '').trim();
      const sectionMargin = Math.max(0, (path.length - 1) * 24);
      const isRenaming = renamingSectionId === section.id;
      const isFirstSibling = index === 0;
      const isLastSibling = index === siblings.length - 1;

      return (
        <section
          key={section.id}
          id={section.id}
          className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-4"
          style={{ marginLeft: sectionMargin }}
        >
          <SectionContextMenu
            onRename={canEditContent ? () => handleSectionEditStart(section.id) : undefined}
            onAddSectionBefore={
              canEditContent && onSectionInsert
                ? () => onSectionInsert(section.id, 'above', parentSectionId)
                : undefined
            }
            onAddSectionAfter={
              canEditContent && onSectionInsert
                ? () => onSectionInsert(section.id, 'below', parentSectionId)
                : undefined
            }
            onAddSubsection={canEditContent ? () => onSectionAddSubsection?.(section.id) : undefined}
            onAddBlock={
              canEditContent && onSectionAddBlock
                ? (type) => onSectionAddBlock(section.id, type)
                : undefined
            }
            onMoveUp={
              canEditContent && onSectionMove && !isFirstSibling
                ? () => onSectionMove(section.id, 'up', parentSectionId)
                : undefined
            }
            onMoveDown={
              canEditContent && onSectionMove && !isLastSibling
                ? () => onSectionMove(section.id, 'down', parentSectionId)
                : undefined
            }
            onDelete={
              canEditContent
                ? () => {
                  if (window.confirm('确定删除该章节及其所有内容吗？')) {
                    onSectionDelete?.(section.id);
                    if (renamingSectionId === section.id) setRenamingSectionId(null);
                  }
                }
                : undefined
            }
          >
            <div
              className={`flex items-baseline gap-3 flex-wrap cursor-context-menu rounded-md transition-colors ${hoveredSectionId === section.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              onMouseEnter={() => setHoveredSectionId(section.id)}
              onMouseLeave={() => setHoveredSectionId(null)}
            >
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{sectionNumber}.</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-baseline gap-3">
                <span>{highlightText(section.title?.en ?? '', searchQuery)}</span>
                <span className="text-gray-400 mx-1">/</span>
                {hasZhTitle ? (
                  <span className="rounded px-1 bg-gray-50 text-gray-700">
                    {highlightText(normalizedZh, searchQuery)}
                  </span>
                ) : (
                  <span className="rounded px-1 bg-gray-100 text-gray-500 italic">
                    该标题组件未配置中文
                  </span>
                )}
              </h2>
            </div>
          </SectionContextMenu>

          {canEditContent && isRenaming && (
            <SectionTitleInlineEditor
              key={section.id}
              initialTitle={section.title}
              lang={lang}
              onCancel={() => setRenamingSectionId(null)}
              onConfirm={(title) => handleSectionRenameConfirm(section.id, title)}
            />
          )}

          <div className="space-y-4">
            {section.content?.map((block, blockIndex) => {
              const isEditingBlock = isEditing(block.id);
              const isSelected = selectedBlockId === block.id;
              const isActive = isSelected || activeBlockId === block.id;

              const blockContent = isEditingBlock ? (
                <BlockEditor
                  block={block}
                  onChange={updatedBlock => onBlockUpdate?.(block.id, updatedBlock)}
                  onMoveUp={() => onBlockMove?.(block.id, 'up')}
                  onMoveDown={() => onBlockMove?.(block.id, 'down')}
                  onDelete={() => onBlockDelete?.(block.id)}
                  onDuplicate={() => onBlockDuplicate?.(block.id)}
                  canMoveUp={blockIndex > 0}
                  canMoveDown={blockIndex < (section.content?.length ?? 0) - 1}
                  references={references}
                  allSections={sections}
                />
              ) : (
                <BlockRenderer
                  block={block}
                  lang={lang === 'both' ? 'zh' : 'en'}
                  searchQuery={searchQuery}
                  isActive={isActive}
                  onMouseEnter={() => setActiveBlockId(block.id)}
                  onMouseLeave={() => {
                    if (!isSelected) setActiveBlockId(null);
                  }}
                  contentRef={contentRef}
                  references={references}
                  onBlockUpdate={updatedBlock => onBlockUpdate?.(block.id, updatedBlock)}
                />
              );

              const blockShell = (
                <div
                  id={block.id}
                  data-block-id={block.id}
                    className={`rounded-md transition-colors ${isActive ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}

                  style={{
                    // 让 scrollIntoView 对齐到“头部下方 16px”
                     scrollMarginTop: 'calc(var(--app-header-h, 0px) + 16px)',
                  }}
                  onClick={
                    !isEditingBlock && onBlockClick
                      ? () => {
                        const selection = window.getSelection();
                        if (selection && selection.toString()) return;
                        onBlockClick(block.id);
                      }
                      : undefined
                  }
                >
                  {blockContent}
                </div>
              );

              return (
                <React.Fragment key={block.id}>
                  {isEditingBlock ? (
                    blockShell
                  ) : (
                    <BlockContextMenu
                      onEdit={
                        canEditContent
                          ? () => {
                            handleBlockEditStart(block.id);
                          }
                          : undefined
                      }
                      onInsertAbove={canEditContent ? () => onBlockInsert?.(block.id, 'above') : undefined}
                      onInsertBelow={canEditContent ? () => onBlockInsert?.(block.id, 'below') : undefined}
                      onMoveUp={canEditContent ? () => onBlockMove?.(block.id, 'up') : undefined}
                      onMoveDown={canEditContent ? () => onBlockMove?.(block.id, 'down') : undefined}
                      onDuplicate={canEditContent ? () => onBlockDuplicate?.(block.id) : undefined}
                      onAddSubsectionAfter={
                        canEditContent ? () => onBlockAppendSubsection?.(block.id) : undefined
                      }
                      onAddComponentAfter={
                        canEditContent ? type => onBlockAddComponent?.(block.id, type) : undefined
                      }
                      onDelete={
                        canEditContent
                          ? () => {
                            if (window.confirm('确定删除该内容块吗？')) {
                              onBlockDelete?.(block.id);
                              if (isEditing(block.id)) clearEditing();
                            }
                          }
                          : undefined
                      }
                    >
                      {blockShell}
                    </BlockContextMenu>
                  )}
                </React.Fragment>
              );
            })}
          </div>


          {section.subsections?.length ? (
            <div className="space-y-8">
              {section.subsections.map((child, childIndex) =>
                renderSection(
                  child,
                  [...path, childIndex + 1],
                  section.subsections ?? [],
                  childIndex,
                  section.id,
                ),
              )}
            </div>
          ) : null}
        </section>
      );
    };

    return sections.map((section, index) =>
      renderSection(section, [index + 1], sections, index, null),
    );
  }, [
    sections,
    lang,
    searchQuery,
    references,
    activeBlockId,
    selectedBlockId,
    canEditContent,
    renamingSectionId,
    hoveredSectionId,
    onSectionInsert,
    onSectionMove,
    onSectionAddSubsection,
    onSectionDelete,
    onSectionAddBlock,
    onBlockDuplicate,
    onBlockDelete,
    onBlockInsert,
    onBlockMove,
    onBlockAppendSubsection,
    onBlockAddComponent,
    onBlockUpdate,
    handleSectionEditStart,
    handleSectionRenameConfirm,
    handleBlockEditStart,
    isEditing,
    clearEditing,
    setHoveredSectionId,
    onBlockClick,
    contentRef,
  ]);

  const emptyState = (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">论文暂无内容</p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">右键此区域以添加第一章。</p>
    </div>
  );

  const rootMenu =
    canEditContent && onSectionInsert
      ? (children: React.ReactNode) => (
        <RootSectionContextMenu onAddSection={() => onSectionInsert(null, 'below', null)}>
          {children}
        </RootSectionContextMenu>
      )
      : (children: React.ReactNode) => <>{children}</>;

  return rootMenu(
    <div className="space-y-8">{sections.length ? renderedTree : emptyState}</div>,
  );
}

function SectionTitleInlineEditor({
  initialTitle,
  lang,
  onCancel,
  onConfirm,
}: {
  initialTitle: Section['title'];
  lang: Lang;
  onCancel: () => void;
  onConfirm: (title: Section['title']) => void;
}) {
  const [en, setEn] = useState(initialTitle.en ?? '');
  const [zh, setZh] = useState(initialTitle.zh ?? '');
  const { setHasUnsavedChanges } = useEditingState();

  useEffect(() => {
    const hasChanges = en !== (initialTitle.en ?? '') || zh !== (initialTitle.zh ?? '');
    setHasUnsavedChanges(hasChanges);
  }, [en, zh, initialTitle, setHasUnsavedChanges]);

  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/70 p-4 shadow-sm space-y-3">
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-blue-600">English Title</label>
        <input
          className="w-full rounded border border-blue-200 px-3 py-2 text-sm"
          value={en}
          onChange={(event) => setEn(event.target.value)}
          placeholder="English title"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-semibold text-blue-600">中文标题</label>
        <input
          className="w-full rounded border border-blue-200 px-3 py-2 text-sm"
          value={zh}
          onChange={(event) => setZh(event.target.value)}
          placeholder="中文标题"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-full bg-white px-4 py-1.5 text-sm text-blue-600 hover:bg-blue-100"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          onClick={() => onConfirm({ en, zh })}
        >
          完成编辑
        </button>
      </div>
    </div>
  );
}

function InlineBlockEditor({
  block,
  lang,
  onSave,
  onCancel,
}: {
  block: BlockContent;
  lang: Lang;
  onSave: (block: BlockContent) => void;
  onCancel: () => void;
}) {
  const allowZh = lang === 'both';
  const [draft, setDraft] = useState<BlockContent>(() => cloneBlock(block));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(cloneBlock(block));
  }, [block]);

  const commit = () => {
    setError(null);
    switch (draft.type) {
      case 'paragraph':
      case 'heading':
      case 'quote': {
        const b: ContentBlock = draft as ContentBlock;
        const en = inlineToPlain(b.content?.en).trim();
        const zh = inlineToPlain(b.content?.zh).trim();
        if (!en && !zh) {
          setError('至少保留一种语言的内容');
          return;
        }
        break;
      }
      case 'math':
        if (!(draft as any).latex?.trim()) {
          setError('LaTeX 不能为空');
          return;
        }
        break;
      case 'code':
        if (!(draft as any).code?.trim()) {
          setError('代码内容不能为空');
          return;
        }
        break;
      default:
        break;
    }
    onSave(draft);
  };

  const renderEditor = () => {
    switch (draft.type) {
      case 'paragraph':
      case 'quote':
      case 'heading': {
        const b = draft as ContentBlock;

        return (
          <div className="space-y-3">
            <TextAreaField
              label="English Content"
              value={inlineToPlain(b.content?.en)}
              onChange={(value) =>
                setDraft((prev) => {
                  const p = prev as ContentBlock;
                  const nextContent = { ...(p.content ?? {}), en: plainToInline(value) };
                  const next: ContentBlock = { ...p, content: nextContent };
                  return next as BlockContent;
                })
              }
              minRows={draft.type === 'heading' ? 2 : 4}
            />
            <TextAreaField
              label="中文内容"
              value={inlineToPlain(b.content?.zh)}
              onChange={(value) =>
                setDraft((prev) => {
                  const p = prev as ContentBlock;
                  const nextContent = { ...(p.content ?? {}), zh: plainToInline(value) };
                  const next: ContentBlock = { ...p, content: nextContent };
                  return next as BlockContent;
                })
              }
              minRows={draft.type === 'heading' ? 2 : 4}
            />
            {draft.type === 'quote' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-blue-600">引用来源</label>
                <input
                  value={(draft as any).author ?? ''}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const p = prev as any;
                      return { ...p, author: event.target.value } as BlockContent;
                    })
                  }
                  className="w-full rounded border border-blue-200 px-3 py-2 text-sm"
                  placeholder="作者 / 来源"
                />
              </div>
            )}
          </div>
        );
      }
      case 'math':
        return (
          <TextAreaField
            label="LaTeX"
            value={(draft as any).latex ?? ''}
            onChange={(value) =>
              setDraft((prev) => {
                const p = prev as any;
                return { ...p, latex: value } as BlockContent;
              })
            }
            minRows={6}
            monospace
            placeholder="输入行间公式 LaTeX"
          />
        );
      case 'code':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-blue-600">语言</label>
              <input
                value={(draft as any).language ?? ''}
                onChange={(event) =>
                  setDraft((prev) => {
                    const p = prev as any;
                    return { ...p, language: event.target.value } as BlockContent;
                  })
                }
                className="w-40 rounded border border-blue-200 px-3 py-2 text-sm"
              />
            </div>
            <TextAreaField
              label="代码内容"
              value={(draft as any).code ?? ''}
              onChange={(value) =>
                setDraft((prev) => {
                  const p = prev as any;
                  return { ...p, code: value } as BlockContent;
                })
              }
              minRows={12}
              monospace
            />
          </div>
        );
      default:
        return (
          <div className="rounded border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-600">
            当前类型暂不支持在阅读界面直接编辑，请在完整编辑器中操作。
          </div>
        );
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-blue-300 bg-white p-4 shadow-lg space-y-3">
      {renderEditor()}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          className="rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          onClick={commit}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  minRows = 4,
  monospace,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  monospace?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-blue-600">{label}</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded border border-blue-200 px-3 py-2 text-sm ${monospace ? 'font-mono' : ''}`}
        rows={minRows}
        placeholder={placeholder}
      />
    </div>
  );
}

function inlineToPlain(nodes?: InlineContent[]): string {
  if (!nodes?.length) return '';
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.content ?? '';
        case 'inline-math':
          return node.latex ?? '';
        case 'link':
          return inlineToPlain(node.children);
        case 'citation':
          return node.displayText ?? '';
        default:
          return '';
      }
    })
    .join('');
}

function plainToInline(text: string): InlineContent[] {
  const trimmed = text ?? '';
  if (!trimmed) return [];
  return [{ type: 'text', content: trimmed }];
}
