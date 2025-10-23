// app/library/components/AddToChecklistDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Check } from 'lucide-react';
import { fetchChecklistTree, addPapersToChecklist, fetchPaperChecklists } from '@/app/lib/checklistApi';
import { apiDelete } from '@/app/lib/api';
import type { ChecklistNode } from '@/app/types/checklist';

interface AddToChecklistDialogProps {
  open: boolean;
  paperId: string;
  paperTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddToChecklistDialog({
  open,
  paperId,
  paperTitle,
  onClose,
  onSuccess,
}: AddToChecklistDialogProps) {
  const [loading, setLoading] = useState(true);
  const [allChecklists, setAllChecklists] = useState<ChecklistNode[]>([]);
  const [currentChecklists, setCurrentChecklists] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // 加载清单树和当前所属清单
  useEffect(() => {
    if (!open) return;
    
    const load = async () => {
      setLoading(true);
      try {
        const [tree, existing] = await Promise.all([
          fetchChecklistTree(),
          fetchPaperChecklists(paperId),
        ]);
        
        setAllChecklists(tree);
        
        // 只显示二级分类，并标记已存在的
        const existingIds = new Set(existing.map(c => c.id));
        setCurrentChecklists(existingIds);
        setSelectedIds(new Set(existingIds));
      } catch (error) {
        console.error('加载清单失败:', error);
        alert('加载清单失败，请重试');
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, [open, paperId]);

  const toggleChecklist = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 计算需要添加和移除的清单
      const toAdd = Array.from(selectedIds).filter(id => !currentChecklists.has(id));
      const toRemove = Array.from(currentChecklists).filter(id => !selectedIds.has(id));

      // 执行添加
      for (const checklistId of toAdd) {
        await addPapersToChecklist(checklistId, paperId);
      }

      // 执行移除
      for (const checklistId of toRemove) {
        await apiDelete(`/api/checklists/${checklistId}/papers/${paperId}`);
      }

      alert('✓ 保存成功！');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
      alert('❌ 保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              添加到清单
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {paperTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : allChecklists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">还没有任何清单</p>
              <a
                href="/checklists"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                去创建清单
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {allChecklists.map((parent) => (
                <div key={parent.id}>
                  {/* 一级分类标题 */}
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {parent.name}
                    </span>
                  </div>

                  {/* 二级分类列表 */}
                  {parent.children && parent.children.length > 0 ? (
                    <div className="ml-6 space-y-2">
                      {parent.children.map((child) => {
                        const isSelected = selectedIds.has(child.id);
                        const isExisting = currentChecklists.has(child.id);
                        
                        return (
                          <label
                            key={child.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleChecklist(child.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">
                                  {child.name}
                                </span>
                                {isExisting && (
                                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    已添加
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                {child.fullPath}
                              </span>
                            </div>
                            {child.paperCount !== undefined && (
                              <span className="text-xs text-slate-400">
                                {child.paperCount} 篇
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ml-6 text-sm text-slate-400 italic">
                      该分类下暂无子分类
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-500">
            已选择 {selectedIds.size} 个清单
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}