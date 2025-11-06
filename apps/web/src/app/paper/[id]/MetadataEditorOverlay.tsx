'use client';

import { createPortal } from 'react-dom';
import MetadataEditor from '@/components/paper/editor/MetadataEditor';
import type { PaperMetadata } from '@/types/paper';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface MetadataEditorOverlayProps {
  metadata: PaperMetadata;
  abstract?: { en?: string; zh?: string };
  keywords?: string[];
  onSubmit: (next: PaperMetadata, abstract?: { en?: string; zh?: string }, keywords?: string[]) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  externalError?: string | null;
  container?: HTMLElement | null;
  userPaperId?: string;
  paperId?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export default function MetadataEditorOverlay({
  metadata,
  abstract,
  keywords,
  onSubmit,
  onCancel,
  isSubmitting,
  externalError,
  container,
  userPaperId,
  paperId,
  autoSave = false,
  autoSaveDelay = 2000,
}: MetadataEditorOverlayProps) {
  const portalTarget = container ?? (typeof document !== 'undefined' ? document.body : null);
  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

  if (!portalTarget) return null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (container) {
      const prevOverflow = container.style.overflow;
      const prevPaddingRight = container.style.paddingRight;
      container.style.overflow = 'hidden';
      
      // 如果有滚动条，添加右边距防止抖动
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        container.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        container.style.overflow = prevOverflow;
        container.style.paddingRight = prevPaddingRight;
      };
    } else {
      const html = document.documentElement;
      const body = document.body;
      const prevHtmlOverflow = html.style.overflow;
      const prevBodyOverflow = body.style.overflow;
      const prevBodyPaddingRight = body.style.paddingRight;
      
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      
      // 如果有滚动条，添加右边距防止抖动
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      return () => {
        html.style.overflow = prevHtmlOverflow;
        body.style.overflow = prevBodyOverflow;
        body.style.paddingRight = prevBodyPaddingRight;
      };
    }
  }, [container]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-end bg-slate-900/40 px-4 py-6 backdrop-blur-sm overscroll-contain"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">编辑论文元数据</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">点击下方保存按钮将保存您的元数据修改到服务器。</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-transparent px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              关闭
            </button>
          </div>
        </header>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <MetadataEditor
            initialValue={metadata}
            initialAbstract={abstract}
            initialKeywords={keywords}
            onSubmit={onSubmit}                 // ✅ 直接交给父组件处理
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            externalError={externalError}
            appearance="plain"
            userPaperId={userPaperId}
            autoSave={autoSave}
            autoSaveDelay={autoSaveDelay}
          />
        </div>
      </div>
    </div>,
    portalTarget
  );
}