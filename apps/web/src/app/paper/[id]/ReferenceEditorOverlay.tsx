// components/paper/ReferenceEditorOverlay.tsx
'use client';

import { useCallback, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Reference } from '@/types/paper';

type ReferenceEditorOverlayProps = {
  mode: 'create' | 'edit';
  reference: Reference;
  onChange: (next: Reference) => void;
  onCancel: () => void;
  onSave: () => void;
  container?: HTMLElement | null; 
};

export default function ReferenceEditorOverlay({
  mode,
  reference,
  onChange,
  onCancel,
  onSave,
  container,
}: ReferenceEditorOverlayProps) {
   const portalTarget =
    container ??
    (typeof window !== 'undefined' ? document.body : null);
  if (!portalTarget) return null;

  useEffect(() => {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;
  const body = document.body;
  const prevHtml = html.style.overflow;
  const prevBody = body.style.overflow;
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';

  let restoreContainer: (() => void) | undefined;
  if (container) {
    const prev = container.style.overflow;
    container.style.overflow = 'hidden';
    restoreContainer = () => {
      container.style.overflow = prev;
    };
  }

  return () => {
    html.style.overflow = prevHtml;
    body.style.overflow = prevBody;
    restoreContainer?.();
  };
}, [container]);
  const positionCls = 'fixed';
  const authorsValue = (reference.authors ?? []).join('\n');
  const yearDisplay = reference.year && reference.year > 0 ? reference.year.toString() : '';

  const updateReference = useCallback(
    <K extends keyof Reference>(field: K, value: Reference[K]) => {
      onChange({ ...reference, [field]: value });
    },
    [reference, onChange],
  );

  const handleAuthorsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextAuthors = event.target.value
      .split('\n')
      .map(author => author.trim())
      .filter(Boolean);
    updateReference('authors', nextAuthors);
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('title', event.target.value);
  };

  const handlePublicationChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('publication', event.target.value);
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim();
    const parsed = Number.parseInt(raw, 10);
    updateReference('year', raw === '' || Number.isNaN(parsed) ? undefined : parsed);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('volume', event.target.value);
  };

  const handleIssueChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('issue', event.target.value);
  };

  const handlePagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('pages', event.target.value);
  };

  const handleDoiChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('doi', event.target.value);
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('url', event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return createPortal(
    <div
      className={`${positionCls} inset-0 z-[9999] flex items-start justify-end bg-slate-900/40 px-4 py-6 backdrop-blur-sm overscroll-contain`}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[70vh] overflow-y-auto"
        onClick={event => event.stopPropagation()}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {mode === 'create' ? '新增参考文献' : '编辑参考文献'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                提交后将自动保存到当前列表。
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-transparent px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              关闭
            </button>
          </header>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">标题</span>
            <input
              value={reference.title}
              onChange={handleTitleChange}
              placeholder="例如：Attention Is All You Need"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">
              作者（每行一位）
            </span>
            <textarea
              value={authorsValue}
              onChange={handleAuthorsChange}
              rows={4}
              placeholder="作者一&#10;作者二"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">出版物</span>
            <input
              value={reference.publication ?? ''}
              onChange={handlePublicationChange}
              placeholder="例如：NeurIPS"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">年份</span>
              <input
                type="number"
                value={yearDisplay}
                onChange={handleYearChange}
                placeholder={`${new Date().getFullYear()}`}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">卷号</span>
              <input
                value={reference.volume ?? ''}
                onChange={handleVolumeChange}
                placeholder="例如：42"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">期号</span>
              <input
                value={reference.issue ?? ''}
                onChange={handleIssueChange}
                placeholder="例如：7"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">页码</span>
              <input
                value={reference.pages ?? ''}
                onChange={handlePagesChange}
                placeholder="例如：23-37"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">DOI</span>
            <input
              value={reference.doi ?? ''}
              onChange={handleDoiChange}
              placeholder="10.xxxx/xxxxxx"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">URL</span>
            <input
              type="url"
              value={reference.url ?? ''}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <footer className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
            >
              保存
            </button>
          </footer>
        </form>
      </div>
    </div>,
    portalTarget
  );
}
