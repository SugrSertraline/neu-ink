// app/library/components/ContextMenu.tsx
'use client';

import React from 'react';
import { Eye, Edit, Trash2, FolderPlus } from 'lucide-react';
import type { PaperMetadata } from '@/app/types/paper';
import {
  ContextMenu as ShadcnContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ContextMenuWrapperProps {
  paper: PaperMetadata;
  children: React.ReactNode;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddToChecklist?: () => void;  // 🆕 新增
}

export default function ContextMenuWrapper({
  paper,
  children,
  onViewDetails,
  onEdit,
  onDelete,
  onAddToChecklist,  // 🆕 新增
}: ContextMenuWrapperProps) {
  return (
    <ShadcnContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-white">
        <ContextMenuItem onClick={onViewDetails} className="gap-2">
          <Eye className="w-4 h-4" />
          查看详情
        </ContextMenuItem>
        <ContextMenuItem onClick={onEdit} className="gap-2">
          <Edit className="w-4 h-4" />
          编辑
        </ContextMenuItem>
        {/* 🆕 新增添加到清单选项 */}
        {onAddToChecklist && (
          <ContextMenuItem onClick={onAddToChecklist} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            添加到清单
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDelete} className="gap-2 text-red-600">
          <Trash2 className="w-4 h-4" />
          删除
        </ContextMenuItem>
      </ContextMenuContent>
    </ShadcnContextMenu>
  );
}