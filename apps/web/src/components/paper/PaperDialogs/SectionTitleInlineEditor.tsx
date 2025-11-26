import React, { useEffect, useState } from 'react';
import type { Section } from '@/types/paper';
import { useEditorStore } from '@/store/editor/editorStore';

type Lang = 'en' | 'both';

interface SectionTitleInlineEditorProps {
  initialTitle: Section;
  lang: Lang;
  onCancel: () => void;
  onConfirm: (title: { en: string; zh: string }) => void;
  externalZhValue?: string;
}

export function SectionTitleInlineEditor({
  initialTitle,
  lang,
  onCancel,
  onConfirm,
  externalZhValue,
}: SectionTitleInlineEditorProps) {
  const [en, setEn] = useState(initialTitle.title ?? '');
  const [zh, setZh] = useState(initialTitle.titleZh ?? '');
  const { setHasUnsavedChanges } = useEditorStore();

  // 当外部提供中文值时，更新中文标题
  useEffect(() => {
    if (externalZhValue !== undefined) {
      setZh(externalZhValue);
    }
  }, [externalZhValue]);

  useEffect(() => {
    const hasChanges = en !== (initialTitle.title ?? '') || zh !== (initialTitle.titleZh ?? '');
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