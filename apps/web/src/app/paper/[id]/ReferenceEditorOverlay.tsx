// components/paper/ReferenceEditorOverlay.tsx
'use client';

import { type ChangeEvent, type FormEvent } from 'react';
import type { Reference } from '@/types/paper';

type ReferenceEditorOverlayProps = {
  mode: 'create' | 'edit';
  reference: Reference;
  onChange: (next: Reference) => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function ReferenceEditorOverlay({
  mode,
  reference,
  onChange,
  onCancel,
  onSave,
}: ReferenceEditorOverlayProps) {
  const authorsValue = (reference.authors ?? []).join('\n');
  const yearDisplay = reference.year && reference.year > 0 ? reference.year.toString() : '';

  const handleAuthorsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextAuthors = event.target.value
      .split('\n')
      .map(author => author.trim())
      .filter(Boolean);
    onChange({ ...reference, authors: nextAuthors });
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...reference, title: event.target.value });
  };

  const handlePublicationChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...reference, publication: event.target.value });
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const parsed = parseInt(raw, 10);
    onChange({ ...reference, year: Number.isNaN(parsed) ? 0 : parsed });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
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
              placeholder="作者一\n作者二"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">出版信息</span>
            <input
              value={reference.publication}
              onChange={handlePublicationChange}
              placeholder="例如：NeurIPS"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

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
    </div>
  );
}
