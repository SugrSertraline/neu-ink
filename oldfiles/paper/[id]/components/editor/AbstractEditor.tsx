// frontend/app/papers/[id]/components/editor/AbstractEditor.tsx
'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface AbstractEditorProps {
  value: {
    en?: string;
    zh?: string;
  };
  onChange: (value: { en?: string; zh?: string }) => void;
}

export default function AbstractEditor({ value, onChange }: AbstractEditorProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">摘要 Abstract</h3>
      </div>

      <div className="space-y-4">
        {/* 英文摘要 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            English Abstract
          </label>
          <textarea
            value={value.en || ''}
            onChange={(e) => onChange({ ...value, en: e.target.value })}
            placeholder="Enter the abstract in English..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 中文摘要 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            中文摘要（可选）
          </label>
          <textarea
            value={value.zh || ''}
            onChange={(e) => onChange({ ...value, zh: e.target.value })}
            placeholder="输入中文摘要（可选）..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}