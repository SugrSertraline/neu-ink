// frontend/app/papers/[id]/components/editor/KeywordsEditor.tsx
'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Tag, X } from 'lucide-react';

interface KeywordsEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function KeywordsEditor({ value, onChange }: KeywordsEditorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // 删除最后一个关键词
      removeKeyword(value.length - 1);
    }
  };

  const addKeyword = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeKeyword = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addKeyword();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">关键词 Keywords</h3>
      </div>

      <div className="border border-gray-300 rounded-lg p-2 min-h-[60px] flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
        {value.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
          >
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={value.length === 0 ? "输入关键词，按 Enter 或逗号添加..." : ""}
          className="flex-1 min-w-[200px] outline-none text-sm"
        />
      </div>

      <p className="text-xs text-gray-500 mt-2">
        按 Enter 或逗号添加关键词，点击 × 删除
      </p>
    </div>
  );
}