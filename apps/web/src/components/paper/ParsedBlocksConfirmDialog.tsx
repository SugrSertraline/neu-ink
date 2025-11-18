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

  const toggleBlock = (blockId: string) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>预览解析结果</DialogTitle>
          <DialogDescription>
            请预览解析后的内容,选择要保留的段落。已选择 {selectedBlockIds.size} / {blocks.length} 个段落。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
            >
              全选
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
            >
              全不选
            </Button>
          </div>

          <div className="space-y-3">
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
                  onClick={() => toggleBlock(block.id)}
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

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedBlockIds.size === 0}
          >
            确认保留 ({selectedBlockIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}