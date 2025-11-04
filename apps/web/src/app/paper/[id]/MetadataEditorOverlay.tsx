'use client';

import { createPortal } from 'react-dom';
import MetadataEditor from '@/components/paper/editor/MetadataEditor';
import type { PaperMetadata } from '@/types/paper';
import { useEffect } from 'react';

interface MetadataEditorOverlayProps {
  metadata: PaperMetadata;
  onSubmit: (next: PaperMetadata) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  externalError?: string | null;
   container?: HTMLElement | null;
}

export default function MetadataEditorOverlay({
  metadata,
  onSubmit,
  onCancel,
  isSubmitting,
  externalError,
    container,
}: MetadataEditorOverlayProps) {
  const portalTarget = container ?? document.body;
  if (!portalTarget) return null;
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (container) {
      const prev = container.style.overflow;
      container.style.overflow = 'hidden';
      return () => {
        container.style.overflow = prev;
      };
    } else {
      const html = document.documentElement;
      const body = document.body;
      const prevHtml = html.style.overflow;
      const prevBody = body.style.overflow;
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      return () => {
        html.style.overflow = prevHtml;
        body.style.overflow = prevBody;
      };
    }
  }, [container]);


  return createPortal(
    <div
      className={`fixed  inset-0 z-[9999] flex items-start justify-end bg-slate-900/40 px-4 py-6 backdrop-blur-sm overscroll-contain`}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={event => event.stopPropagation()}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              编辑论文元数据
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              修改会同步到当前草稿，请在顶部保存按钮中提交最终结果。
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

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <MetadataEditor
            initialValue={metadata}
            onSubmit={onSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            externalError={externalError}
            appearance="plain"
          />
        </div>
      </div>
    </div>,
   portalTarget
  );
}
