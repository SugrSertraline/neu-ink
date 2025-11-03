// apps/web/src/components/paper/ReferencesEditor.tsx
'use client';

import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import type { Reference } from '@/types/paper';

type ReferencesEditorProps = {
  references: Reference[];
  onChange?: (next: Reference[]) => void;
  disabled?: boolean;
  className?: string;
};

type ReferenceRow = Reference & {
  authorText: string;
};

const generateId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const createBlankReference = (): ReferenceRow => ({
  id: generateId('ref'),
  authors: ['Unnamed author'],
  authorText: 'Unnamed author',
  title: 'Untitled reference',
  publication: '',
  year: new Date().getFullYear(),
});

const toRow = (reference: Reference): ReferenceRow => ({
  ...reference,
  authorText: (reference.authors ?? []).join(', '),
});

const parseAuthors = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return trimmed
    .split(',')
    .map(author => author.trim())
    .filter(Boolean);
};

const normalizeRows = (rows: ReferenceRow[]): Reference[] =>
  rows.map(({ authorText, ...rest }) => ({
    ...rest,
    authors: parseAuthors(authorText),
  }));

export default function ReferencesEditor({
  references,
  onChange,
  disabled = false,
  className,
}: ReferencesEditorProps) {
  const [rows, setRows] = useState<ReferenceRow[]>(() =>
    references.length ? references.map(toRow) : [createBlankReference()],
  );

  // 关键：标记这次 rows 变化是否来自本地输入，如果是，就跳过下一次 props 同步
  const skipNextSync = useRef(false);

  useEffect(() => {
    setRows(prev => {
      if (skipNextSync.current) {
        skipNextSync.current = false;
        return prev; // 本地输入优先，跳过这次 props 覆盖
      }

      const next = references.length ? references.map(toRow) : [];
      if (!next.length) {
        return prev.length ? prev : [createBlankReference()];
      }
      return next;
    });
  }, [references]);

  const emitChange = useCallback(
    (nextRows: ReferenceRow[]) => {
      if (!onChange) return;
      onChange(normalizeRows(nextRows));
    },
    [onChange],
  );

  const updateRows = useCallback(
    (recipe: (current: ReferenceRow[]) => ReferenceRow[]) => {
      setRows(prev => {
        const next = recipe(prev);
        // 标记：这是一次本地编辑，将导致父级 onChange -> props 回传，但我们要跳过下一次同步
        skipNextSync.current = true;
        emitChange(next);
        return next.length ? next : [createBlankReference()];
      });
    },
    [emitChange],
  );

  const handleFieldChange = useCallback(
    <K extends keyof ReferenceRow>(id: string, field: K, value: ReferenceRow[K]) => {
      updateRows(current =>
        current.map(row => (row.id === id ? { ...row, [field]: value } : row)),
      );
    },
    [updateRows],
  );

  const handleAdd = useCallback(() => {
    updateRows(current => [...current, createBlankReference()]);
  }, [updateRows]);

  const handleRemove = useCallback(
    (id: string) => {
      updateRows(current => current.filter(row => row.id !== id));
    },
    [updateRows],
  );

  const hasMultipleRows = useMemo(() => rows.length > 1, [rows.length]);

  return (
    <section
      className={[
        'rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            参考文献列表编辑
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            作者使用逗号分隔；字段修改后会即时同步到父组件。
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          新增参考文献
        </button>
      </header>

      <div className="space-y-5">
        {rows.map((row, index) => (
          <article
            key={row.id}
            className="rounded-lg border border-slate-200 p-4 shadow-xs transition hover:border-blue-400 hover:shadow-sm dark:border-slate-700 dark:hover:border-blue-500"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                #{index + 1}
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {row.id}
                </span>
              </span>
              {hasMultipleRows && (
                <button
                  type="button"
                  onClick={() => handleRemove(row.id)}
                  disabled={disabled}
                  className="text-sm text-red-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:text-red-300"
                >
                  删除
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  作者（逗号分隔）
                </span>
                <input
                  type="text"
                  value={row.authorText ?? ''}
                  onChange={event => handleFieldChange(row.id, 'authorText', event.target.value)}
                  disabled={disabled}
                  placeholder="例如：Alice Smith, Bob Chen"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  标题
                </span>
                <input
                  type="text"
                  value={row.title ?? ''}
                  onChange={event => handleFieldChange(row.id, 'title', event.target.value)}
                  disabled={disabled}
                  placeholder="论文标题"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  出版物
                </span>
                <input
                  type="text"
                  value={row.publication ?? ''}
                  onChange={event => handleFieldChange(row.id, 'publication', event.target.value)}
                  disabled={disabled}
                  placeholder="期刊 / 会议名"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  年份
                </span>
                <input
                  type="number"
                  value={row.year ?? ''}
                  onChange={event =>
                    handleFieldChange(
                      row.id,
                      'year',
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                  disabled={disabled}
                  min={0}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  卷号
                </span>
                <input
                  type="text"
                  value={row.volume ?? ''}
                  onChange={event => handleFieldChange(row.id, 'volume', event.target.value)}
                  disabled={disabled}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  期号
                </span>
                <input
                  type="text"
                  value={row.issue ?? ''}
                  onChange={event => handleFieldChange(row.id, 'issue', event.target.value)}
                  disabled={disabled}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  页码
                </span>
                <input
                  type="text"
                  value={row.pages ?? ''}
                  onChange={event => handleFieldChange(row.id, 'pages', event.target.value)}
                  disabled={disabled}
                  placeholder="例如：23-37"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  DOI
                </span>
                <input
                  type="text"
                  value={row.doi ?? ''}
                  onChange={event => handleFieldChange(row.id, 'doi', event.target.value)}
                  disabled={disabled}
                  placeholder="10.xxxx/xxxxxx"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  URL
                </span>
                <input
                  type="url"
                  value={row.url ?? ''}
                  onChange={event => handleFieldChange(row.id, 'url', event.target.value)}
                  disabled={disabled}
                  placeholder="https://example.com"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
