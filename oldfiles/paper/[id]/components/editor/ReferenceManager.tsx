// frontend/app/papers/[id]/components/editor/ReferenceManager.tsx
'use client';

import React, { useState } from 'react';
import type { Reference } from '../../../../types/paper';
import { Plus, Edit3, Trash2, Save, X, ExternalLink } from 'lucide-react';

interface ReferenceManagerProps {
  references: Reference[];
  onChange: (references: Reference[]) => void;
}

export default function ReferenceManager({ references, onChange }: ReferenceManagerProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRef, setEditingRef] = useState<Reference | null>(null);

  // 添加新文献
  const addReference = () => {
    const newRef: Reference = {
      id: `ref_${Date.now()}`,
      number: references.length + 1,
      authors: [],
      title: '',
      year: new Date().getFullYear()
    };
    setEditingRef(newRef);
    setEditingIndex(references.length);
  };

  // 开始编辑
  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingRef({ ...references[index] });
  };

  // 保存编辑
  const saveEdit = () => {
    if (editingRef && editingIndex !== null) {
      const newRefs = [...references];
      if (editingIndex >= newRefs.length) {
        // 新增
        newRefs.push(editingRef);
      } else {
        // 更新
        newRefs[editingIndex] = editingRef;
      }
      onChange(newRefs);
      setEditingIndex(null);
      setEditingRef(null);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingRef(null);
  };

  // 删除文献
  const deleteReference = (index: number) => {
    if (!confirm('确定删除这条参考文献吗？')) return;
    const newRefs = references.filter((_, i) => i !== index);
    // 重新编号
    newRefs.forEach((ref, i) => {
      ref.number = i + 1;
    });
    onChange(newRefs);
  };

  return (
    <div className="space-y-4">
      {/* 添加按钮 */}
      <button
        type="button"
        onClick={addReference}
        className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加参考文献
      </button>

      {/* 文献列表 */}
      <div className="space-y-3">
        {references.map((ref, index) => (
          <div
            key={ref.id}
            className="border border-gray-300 rounded-lg bg-white shadow-sm"
          >
            {editingIndex === index && editingRef ? (
              // 编辑模式
              <ReferenceEditor
                reference={editingRef}
                onChange={setEditingRef}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            ) : (
              // 显示模式
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-500">
                        [{ref.number || index + 1}]
                      </span>
                      <span className="text-sm text-gray-400">ID: {ref.id}</span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                      {ref.title || '(未命名)'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {ref.authors.join(', ')}
                      {ref.publication && ` • ${ref.publication}`}
                      {ref.year && ` • ${ref.year}`}
                    </p>
                    {ref.doi && (
                      <p className="text-xs text-gray-500 mt-1">DOI: {ref.doi}</p>
                    )}
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        链接
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(index)}
                      className="p-2 hover:bg-gray-100 rounded text-gray-600"
                      title="编辑"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReference(index)}
                      className="p-2 hover:bg-red-100 rounded text-red-600"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 空状态 */}
      {references.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">还没有参考文献</p>
          <p className="text-sm mt-2">点击上方按钮添加第一条参考文献</p>
        </div>
      )}
    </div>
  );
}

// 文献编辑器
function ReferenceEditor({
  reference,
  onChange,
  onSave,
  onCancel
}: {
  reference: Reference;
  onChange: (ref: Reference) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [authorsText, setAuthorsText] = useState(reference.authors.join(', '));

  const handleAuthorsChange = (text: string) => {
    setAuthorsText(text);
    const authors = text.split(',').map(a => a.trim()).filter(a => a);
    onChange({ ...reference, authors });
  };

  return (
    <div className="p-4 bg-blue-50 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* 编号和ID */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">编号:</label>
          <input
            type="number"
            value={reference.number || ''}
            onChange={(e) => onChange({ ...reference, number: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">ID:</label>
          <input
            type="text"
            value={reference.id}
            onChange={(e) => onChange({ ...reference, id: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-mono"
          />
        </div>
      </div>

      {/* 标题 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">标题 *:</label>
        <input
          type="text"
          value={reference.title}
          onChange={(e) => onChange({ ...reference, title: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder="论文标题"
        />
      </div>

      {/* 作者 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          作者 * (用逗号分隔):
        </label>
        <input
          type="text"
          value={authorsText}
          onChange={(e) => handleAuthorsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder="Smith J., Zhang L., ..."
        />
      </div>

      {/* 发表信息 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">期刊/会议:</label>
          <input
            type="text"
            value={reference.publication || ''}
            onChange={(e) => onChange({ ...reference, publication: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="Nature, CVPR, ..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">年份:</label>
          <input
            type="number"
            value={reference.year || ''}
            onChange={(e) => onChange({ ...reference, year: Number(e.target.value) })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="2024"
          />
        </div>
      </div>

      {/* 详细信息 */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">卷:</label>
          <input
            type="text"
            value={reference.volume || ''}
            onChange={(e) => onChange({ ...reference, volume: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">期:</label>
          <input
            type="text"
            value={reference.issue || ''}
            onChange={(e) => onChange({ ...reference, issue: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">页码:</label>
          <input
            type="text"
            value={reference.pages || ''}
            onChange={(e) => onChange({ ...reference, pages: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="123-456"
          />
        </div>
      </div>

      {/* DOI 和 URL */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">DOI:</label>
          <input
            type="text"
            value={reference.doi || ''}
            onChange={(e) => onChange({ ...reference, doi: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="10.1234/..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">URL:</label>
          <input
            type="text"
            value={reference.url || ''}
            onChange={(e) => onChange({ ...reference, url: e.target.value })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* 按钮 */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          取消
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!reference.title || reference.authors.length === 0}
          className={`px-3 py-1.5 text-sm rounded flex items-center gap-1 ${
            reference.title && reference.authors.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          保存
        </button>
      </div>
    </div>
  );
}