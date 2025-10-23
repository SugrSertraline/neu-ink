// app/library/components/ColumnConfigSheet.tsx

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TABLE_COLUMNS } from '../utils/paperHelpers';

interface ColumnConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleColumns: Set<string>;
  onToggleColumn: (key: string) => void;
  onReset: () => void;
}

export default function ColumnConfigSheet({
  open,
  onOpenChange,
  visibleColumns,
  onToggleColumn,
  onReset,
}: ColumnConfigSheetProps) {
  const handleSelectAll = () => {
    TABLE_COLUMNS.forEach(col => {
      if (!visibleColumns.has(col.key)) {
        onToggleColumn(col.key);
      }
    });
  };

  const handleDeselectAll = () => {
    TABLE_COLUMNS.forEach(col => {
      if (visibleColumns.has(col.key)) {
        onToggleColumn(col.key);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] bg-white">
        <SheetHeader>
          <SheetTitle>列设置</SheetTitle>
          <SheetDescription>
            选择要在表格中显示的列
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 顶部操作栏 */}
          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium">
              已选择 {visibleColumns.size} / {TABLE_COLUMNS.length} 列
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={visibleColumns.size === TABLE_COLUMNS.length}
              >
                全选
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                disabled={visibleColumns.size === 0}
              >
                取消全选
              </Button>
            </div>
          </div>

          {/* 列列表 */}
          <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
            {TABLE_COLUMNS.map(col => (
              <div
                key={col.key}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Checkbox
                  id={`col-${col.key}`}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => onToggleColumn(col.key)}
                />
                <label
                  htmlFor={`col-${col.key}`}
                  className="flex-1 text-sm cursor-pointer select-none"
                >
                  {col.label}
                </label>
                {col.defaultVisible && (
                  <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    默认
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 底部按钮 */}
          <div className="pt-4 border-t flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onReset}
            >
              恢复默认
            </Button>
            <Button
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              确定
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}