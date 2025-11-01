'use client';

import clsx from 'clsx';
import type { Reference } from '@/types/paper';

interface PaperReferencesProps {
  references: Reference[];
  title?: string;
  highlightedRefs?: string[];
  onHighlightChange?: (ids: string[]) => void;
}

const joinMeta = (...parts: (string | undefined | null)[]) =>
  parts.filter(Boolean).join('. ');

const formatReference = (ref: Reference) => {
  const authors = ref.authors.join(', ');
  const publication = joinMeta(ref.publication, ref.volume && `Vol. ${ref.volume}`, ref.issue && `No. ${ref.issue}`);
  const tail = joinMeta(publication, ref.pages, ref.year?.toString(), ref.doi && `DOI: ${ref.doi}`, ref.url && `URL: ${ref.url}`);
  return joinMeta(authors, ref.title, tail);
};

export default function PaperReferences({
  references,
  title = 'References',
  highlightedRefs = [],
  onHighlightChange,
}: PaperReferencesProps) {
  if (!references?.length) return null;

  const handleMouseEnter = (id: string) => onHighlightChange?.([id]);
  const handleMouseLeave = () => onHighlightChange?.([]);

  return (
    <section aria-labelledby="paper-references-heading" className="mt-10">
      <header className="mb-3">
        <h2 id="paper-references-heading" className="text-base font-semibold text-gray-900 dark:text-slate-100">
          {title}
        </h2>
        <div className="h-px bg-gray-200 dark:bg-slate-700" />
      </header>

      <ol className="space-y-1.5 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        {references.map((ref, idx) => {
          const displayNumber = ref.number ?? idx + 1;
          const isHighlighted = highlightedRefs.includes(ref.id);

          return (
            <li
              key={ref.id}
              id={`reference-${ref.id}`}
              onMouseEnter={() => handleMouseEnter(ref.id)}
              onMouseLeave={handleMouseLeave}
              className={clsx(
                'flex gap-2 rounded-md px-2 py-1 transition-colors',
                isHighlighted
                  ? 'bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
              )}
            >
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                [{displayNumber}]
              </span>
              <span className="whitespace-pre-wrap">{formatReference(ref)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
