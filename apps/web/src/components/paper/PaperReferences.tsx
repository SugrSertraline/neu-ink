// apps/web/src/components/paper/PaperReferences.tsx
'use client';

import { useCallback } from 'react';
import clsx from 'clsx';
import {
  ReferenceContextMenu,
  RootReferenceContextMenu,
} from '@/components/paper/PaperContextMenus';
import type { Reference } from '@/types/paper';

interface PaperReferencesProps {
  references: Reference[];
  title?: string;
  highlightedRefs?: string[];
  onHighlightChange?: (ids: string[]) => void;
  onReferenceEdit?: (reference: Reference) => void;
  onReferenceDuplicate?: (reference: Reference) => void;
  onReferenceInsertBelow?: (reference: Reference) => void;
  onReferenceMoveUp?: (reference: Reference) => void;
  onReferenceMoveDown?: (reference: Reference) => void;
  onReferenceDelete?: (reference: Reference) => void;
  onReferenceCopyCitation?: (citation: string, reference: Reference) => void;
  onReferenceCopyDoi?: (doi: string, reference: Reference) => void;
  onReferenceCopyUrl?: (url: string, reference: Reference) => void;
  onReferenceOpenLink?: (url: string, reference: Reference) => void;
  onReferenceAdd?: () => void;
  onParseReferences?: () => void;
  'data-references'?: string;
}

const joinMeta = (...parts: (string | undefined | null)[]) =>
  parts.filter(Boolean).join('. ');

const formatReference = (ref: Reference) => {
  // 直接使用原始文本，不进行任何格式化处理
  return ref.originalText && ref.originalText.trim() ? ref.originalText.trim() : '';
};

export default function PaperReferences({
  references,
  title = 'References',
  highlightedRefs = [],
  onHighlightChange,
  onReferenceEdit,
  onReferenceDuplicate,
  onReferenceInsertBelow,
  onReferenceMoveUp,
  onReferenceMoveDown,
  onReferenceDelete,
  onReferenceCopyCitation,
  onReferenceCopyDoi,
  onReferenceCopyUrl,
  onReferenceOpenLink,
  onReferenceAdd,
  onParseReferences,
  'data-references': dataReferences,
}: PaperReferencesProps) {
  const handleMouseEnter = useCallback(
    (id: string) => onHighlightChange?.([id]),
    [onHighlightChange],
  );
  const handleMouseLeave = useCallback(
    () => onHighlightChange?.([]),
    [onHighlightChange],
  );

  const copyWithFallback = useCallback(async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch (error) {
      // 静默失败，不影响用户体验
    }
  }, []);

  const openLinkWithFallback = useCallback((url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      // 静默失败，不影响用户体验
    }
  }, []);

  const isEditable =
    Boolean(onReferenceAdd) ||
    Boolean(onReferenceEdit) ||
    Boolean(onReferenceDuplicate) ||
    Boolean(onReferenceInsertBelow) ||
    Boolean(onReferenceMoveUp) ||
    Boolean(onReferenceMoveDown) ||
    Boolean(onReferenceDelete);

  const renderContent = () => {
    if (!references?.length) {
      if (!isEditable) {
        return (
          <div className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
            当前没有参考文献。
          </div>
        );
      }
      
      return (
        <RootReferenceContextMenu
          onAddReference={onReferenceAdd}
          onParseReferences={onParseReferences}
        >
          <div
            data-reference-region="true"
            className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            当前没有参考文献，请右键此区域快速添加或批量解析参考文献。
          </div>
        </RootReferenceContextMenu>
      );
    }

    return (
      <ol className="space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        {references.map((ref, idx) => {
          const displayNumber = ref.number ?? idx + 1;
          const isHighlighted = highlightedRefs.includes(ref.id);
          const citationText = formatReference(ref);
          
          // 使用索引和ID的组合确保key的唯一性
          const uniqueKey = `${ref.id}-${idx}`;

          const handleCopyCitation = () => {
            if (!citationText) return;
            if (onReferenceCopyCitation) {
              onReferenceCopyCitation(citationText, ref);
            } else {
              void copyWithFallback(citationText);
            }
          };

          const handleCopyDoi = () => {
            if (!ref.doi) return;
            if (onReferenceCopyDoi) {
              onReferenceCopyDoi(ref.doi, ref);
            } else {
              void copyWithFallback(ref.doi);
            }
          };

          const handleCopyUrl = () => {
            if (!ref.url) return;
            if (onReferenceCopyUrl) {
              onReferenceCopyUrl(ref.url, ref);
            } else {
              void copyWithFallback(ref.url);
            }
          };

          const handleOpenLink = () => {
            if (!ref.url) return;
            if (onReferenceOpenLink) {
              onReferenceOpenLink(ref.url, ref);
            } else {
              openLinkWithFallback(ref.url);
            }
          };

          return (
            <li
              key={uniqueKey}
              id={`reference-${ref.id}`}
              data-reference-id={ref.id}
              onMouseEnter={() => handleMouseEnter(ref.id)}
              onMouseLeave={handleMouseLeave}
              className={clsx(
                'flex gap-2 rounded-md px-2 py-1 transition-colors',
                isHighlighted
                  ? 'bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50',
              )}
            >
              <ReferenceContextMenu
                onEdit={onReferenceEdit ? () => onReferenceEdit(ref) : undefined}
                onDuplicate={
                  onReferenceDuplicate ? () => onReferenceDuplicate(ref) : undefined
                }
                onInsertBelow={
                  onReferenceInsertBelow
                    ? () => onReferenceInsertBelow(ref)
                    : undefined
                }
                onMoveUp={
                  onReferenceMoveUp ? () => onReferenceMoveUp(ref) : undefined
                }
                onMoveDown={
                  onReferenceMoveDown ? () => onReferenceMoveDown(ref) : undefined
                }
                onDelete={onReferenceDelete ? () => onReferenceDelete(ref) : undefined}
                onCopyCitation={citationText ? handleCopyCitation : undefined}
                onCopyDoi={ref.doi ? handleCopyDoi : undefined}
                onCopyUrl={ref.url ? handleCopyUrl : undefined}
                onOpenLink={ref.url ? handleOpenLink : undefined}
                onParseReferences={onParseReferences}
              >
                <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  [{displayNumber}]
                </span>
                <span className="whitespace-pre-wrap">{citationText}</span>
              </ReferenceContextMenu>
            </li>
          );
        })}
      </ol>
    );
  };

  const section = (
    <section aria-labelledby="paper-references-heading" className="mt-10" data-references={dataReferences}>
      <header className="mb-3">
        <h2
          id="paper-references-heading"
          className="text-base font-semibold text-gray-900 dark:text-slate-100"
        >
          {title}
        </h2>
        <div className="h-px bg-gray-200 dark:bg-slate-700" />
      </header>
      {renderContent()}
    </section>
  );

  if (!onReferenceAdd) return section;

  return (
    <RootReferenceContextMenu
      onAddReference={onReferenceAdd}
      onParseReferences={onParseReferences}
    >
      {section}
    </RootReferenceContextMenu>
  );
}
