'use client';

import React from 'react';
import type { PaperContent } from '@/types/paper';

interface EditingWorkspacePlaceholderProps {
  content: PaperContent;
  lang: 'en' | 'both';
  onExit: () => void;
}

export default function EditingWorkspacePlaceholder({
  content,
  lang,
  onExit,
}: EditingWorkspacePlaceholderProps) {
  return (
    <div className="h-full flex overflow-hidden bg-gray-50">
      <aside className="w-64 border-r border-gray-200 bg-white/80 backdrop-blur-md p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">导航树</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          后续会替换成真正的章节导航，本占位用于锁定布局。
        </p>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">编辑模式</h1>
              <p className="text-sm text-gray-500">
                当前语言：{lang === 'en' ? '英文' : '双语'}
              </p>
            </div>
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
            >
              返回阅读
            </button>
          </header>

          <section className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-6">
            <p className="text-gray-600 text-sm leading-relaxed">
              这里将来会承载摘要、关键词、正文、参考文献等编辑器组件；当前先展示内容概要，确保模式切换逻辑正确。
            </p>
            <pre className="mt-4 rounded bg-gray-100 p-4 text-xs text-gray-600 overflow-x-auto">
{JSON.stringify(
  {
    sections: content.sections.length,
    references: content.references.length,
    keywords: content.keywords?.length ?? 0,
  },
  null,
  2,
)}
            </pre>
          </section>
        </div>
      </main>

      <aside className="w-96 border-l border-gray-200 bg-white/80 backdrop-blur-md p-4 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">预览面板</h3>
        <p className="text-xs text-gray-500 leading-relaxed">
          后续可嵌入实时预览或辅助面板。本区域当前仅起占位作用。
        </p>
      </aside>
    </div>
  );
}
