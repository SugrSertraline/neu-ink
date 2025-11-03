'use client';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import { Calendar, Users, FileText, Award, Tag, BookOpen } from 'lucide-react';
import type { PaperMetadata } from '@/types/paper';
import { MetadataContextMenu } from '@/components/paper/PaperContextMenus';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditingState } from '@/stores/useEditingState';
import MetadataEditor from './editor/MetadataEditor';

interface PaperMetadataProps {
  metadata: PaperMetadata;
  onMetadataUpdate?: (next: PaperMetadata) => void | Promise<void>;
}

const quartileBadge = (
  label: string,
  classes: string,
) => (
  <span className={classes}>
    {label}
  </span>
);

const renderAuthors = (authors: PaperMetadata['authors']) =>
  authors.map((author, idx) => {
    const parts = [author.name, author.affiliation, author.email].filter(Boolean);
    const text = parts.join(' · ');
    return (
      <span
        key={`${author.name}-${idx}`}
        className="text-sm text-gray-700 dark:text-slate-300"
      >
        {text}
        {idx < authors.length - 1 && <span className="text-gray-400 dark:text-slate-500">, </span>}
      </span>
    );
  });

function MetadataReadOnly({ metadata }: { metadata: PaperMetadata }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
        {metadata.title}
      </h1>

      {metadata.titleZh && (
        <h2 className="mb-2 text-xl text-gray-700 dark:text-slate-300">
          {metadata.titleZh}
        </h2>
      )}

      {metadata.shortTitle && (
        <h3 className="mb-4 text-lg text-gray-600 dark:text-slate-400">
          {metadata.shortTitle}
        </h3>
      )}

      {metadata.authors?.length ? (
        <div className="mb-3 flex items-start gap-2">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
          <div className="flex flex-wrap gap-2">{renderAuthors(metadata.authors)}</div>
        </div>
      ) : (
        <div className="mb-3 flex items-start gap-2">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
          <span className="text-sm text-gray-500 dark:text-slate-400">暂无作者信息</span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {metadata.publication ? (
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-700 dark:text-slate-300">
              {metadata.publication}
            </span>
          </div>
        ) : null}

        {metadata.date || metadata.year ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-700 dark:text-slate-300">
              {metadata.date || metadata.year}
            </span>
          </div>
        ) : null}

        {metadata.articleType ? (
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
            <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">
              {metadata.articleType}
            </span>
          </div>
        ) : null}
      </div>

      {metadata.sciQuartile ||
      metadata.casQuartile ||
      metadata.ccfRank ||
      typeof metadata.impactFactor === 'number' ? (
        <div className="mb-4 flex items-start gap-2">
          <Award className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
          <div className="flex flex-wrap gap-2">
            {metadata.sciQuartile && metadata.sciQuartile !== '无'
              ? quartileBadge(
                  `SCI ${metadata.sciQuartile}`,
                  'rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                )
              : null}
            {metadata.casQuartile && metadata.casQuartile !== '无'
              ? quartileBadge(
                  `CAS ${metadata.casQuartile}`,
                  'rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400',
                )
              : null}
            {metadata.ccfRank && metadata.ccfRank !== '无'
              ? quartileBadge(
                  `CCF ${metadata.ccfRank}`,
                  'rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                )
              : null}
            {typeof metadata.impactFactor === 'number'
              ? quartileBadge(
                  `IF: ${metadata.impactFactor}`,
                  'rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                )
              : null}
          </div>
        </div>
      ) : null}

      {metadata.doi ? (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-slate-400">DOI:</span>
          <a
            href={`https://doi.org/${metadata.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            {metadata.doi}
          </a>
        </div>
      ) : null}

      {metadata.tags?.length ? (
        <div className="mb-4 flex items-start gap-2">
          <Tag className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map(tag => (
              <span
                key={tag}
                className="rounded px-2 py-1 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <Tag className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
          <span className="text-sm text-gray-500 dark:text-slate-400">暂无标签</span>
        </div>
      )}
    </div>
  );
}

export default function PaperMetadata({
  metadata,
  onMetadataUpdate,
}: PaperMetadataProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  const { isEditing, clearEditing, setHasUnsavedChanges, switchToEdit } = useEditingState();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const allowEdit = useMemo(
    () => canEditContent && Boolean(onMetadataUpdate),
    [canEditContent, onMetadataUpdate],
  );

  const handleMetadataEditConfirm = useCallback(
    async (next: PaperMetadata) => {
      if (!onMetadataUpdate) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await Promise.resolve(onMetadataUpdate(next));
        setHasUnsavedChanges(false);
        clearEditing();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '保存失败，请稍后重试';
        setSubmitError(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [onMetadataUpdate, setHasUnsavedChanges, clearEditing],
  );

  const handleMetadataEditStart = useCallback(() => {
    const switched = switchToEdit('metadata', {
      beforeSwitch: () => {
        setSubmitError(null);
      },
      onRequestSave: () => {
        // TODO: auto-save pending metadata
      },
    });
    if (!switched) return;
  }, [switchToEdit]);

  const isEditingMetadata = isEditing('metadata');

  const cardContent = isEditingMetadata ? (
    <MetadataEditor
      initialValue={metadata}
      onCancel={clearEditing}
      onSubmit={handleMetadataEditConfirm}
      isSubmitting={submitting}
      externalError={submitError}
    />
  ) : (
    <MetadataReadOnly metadata={metadata} />
  );

  return (
    <MetadataContextMenu
      onEdit={allowEdit ? handleMetadataEditStart : undefined}
    >
      {cardContent}
    </MetadataContextMenu>
  );
}
