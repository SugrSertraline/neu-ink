'use client';

import React, { useState } from 'react';
import { BlockContent } from '@/types/paper';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BlockRenderer from './BlockRenderer';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParsedBlocksConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: BlockContent[];
  onConfirm: (selectedBlockIds: string[]) => void;
  onCancel: () => void;
}

export default function ParsedBlocksConfirmDialog({
  open,
  onOpenChange,
  blocks,
  onConfirm,
  onCancel,
}: ParsedBlocksConfirmDialogProps) {
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(
    new Set(blocks.map(b => b.id))
  );

  const toggleBlock = (blockId: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡，防止触发 PaperContent 的 onBlockClick
    if (event) {
      event.stopPropagation();
    }
    
    setSelectedBlockIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedBlockIds));
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const selectAll = () => {
    setSelectedBlockIds(new Set(blocks.map(b => b.id)));
  };

  const deselectAll = () => {
    setSelectedBlockIds(new Set());
  };

  const glowButtonFilled =
    'rounded-xl bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 ' +
    'shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.36)] ' +
    'border border-white/70 focus-visible:ring-2 focus-visible:ring-[#4769b8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-[1px]';

  const glowButtonGhost =
    'rounded-xl border border-white/70 bg-white/78 text-[#28418A] shadow-[0_12px_30px_rgba(40,65,138,0.18)] ' +
    'backdrop-blur-xl hover:bg-white/90 hover:text-[#263b78] focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/45 bg-white/55 shadow-[0_28px_72px_rgba(15,23,42,0.28)] backdrop-blur-xl flex flex-col p-0">
        <DialogHeader className="flex items-center justify-between border-b border-white/40 bg-white/50 px-6 py-5 flex-shrink-0">
          <div className="text-left">
            <DialogTitle className="text-lg font-semibold text-slate-900">预览解析结果</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-1">
              请预览解析后的内容，选择要保留的段落。已选择 {selectedBlockIds.size} / {blocks.length} 个段落。
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex gap-2 px-6 py-3 border-b border-white/40 bg-white/50 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            className={glowButtonGhost}
          >
            全选
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deselectAll}
            className={glowButtonGhost}
          >
            全不选
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-white/45 px-6 py-6 backdrop-blur" style={{ transform: 'scale(0.8)', transformOrigin: 'top left' }}>
          <div className="space-y-3" style={{ minWidth: '125%' }}>
            {blocks.map((block, index) => {
              const isSelected = selectedBlockIds.has(block.id);
              
              return (
                <div
                  key={block.id}
                  className={`relative rounded-lg border-2 p-4 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={(e) => toggleBlock(block.id, e)}
                >
                  <div className="absolute top-2 right-2 z-10">
                    {isSelected ? (
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                  
                  <div className="absolute top-2 left-2 text-xs font-semibold text-gray-500">
                    #{index + 1}
                  </div>
                  
                  <div className="mt-6">
                    <BlockRenderer
                      block={block}
                      lang="both"
                      isActive={false}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-3 border-t border-white/40 bg-white/45 px-6 py-5 flex-shrink-0">
          <Button variant="outline" onClick={handleCancel} className={glowButtonGhost}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedBlockIds.size === 0}
            className={cn(glowButtonFilled, 'min-w-[110px]')}
          >
            确认保留 ({selectedBlockIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}