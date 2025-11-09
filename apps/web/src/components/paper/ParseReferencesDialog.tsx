// src/components/paper/ParseReferencesDialog.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { adminPaperService } from '@/lib/services/paper';
import type { Reference } from '@/types/paper';

interface ParseReferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paperId: string;
  userPaperId?: string | null;
  isPersonalOwner: boolean;
  onReferencesAdded: (references: Reference[]) => void;
}

export default function ParseReferencesDialog({
  open,
  onOpenChange,
  paperId,
  userPaperId,
  isPersonalOwner,
  onReferencesAdded,
}: ParseReferencesDialogProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入要解析的参考文献内容');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 选择正确的 ID（个人论文 or 公共库）
      const targetId = isPersonalOwner ? userPaperId : paperId;
      if (!targetId) {
        throw new Error('无法确定论文标识');
      }

      // 第一步：解析参考文献
      const parseResult = await adminPaperService.parseReferences({
        text: text.trim(),
      });

      if (
        parseResult.bizCode !== 0 ||
        !parseResult.data?.references ||
        !parseResult.data.references.length
      ) {
        const msg =
          parseResult.bizMessage || '解析失败，未找到有效的参考文献';
        throw new Error(msg);
      }

      const parsedReferences = parseResult.data.references as Reference[];

      // 第二步：添加到论文
      const addResult = await adminPaperService.addReferencesToPaper(
        targetId,
        { references: parsedReferences },
      );

      if (addResult.bizCode !== 0) {
        const msg = addResult.bizMessage || '添加参考文献失败';
        throw new Error(msg);
      }

      // 成功提示
      toast.success('参考文献解析成功', {
        description: `成功添加了 ${parsedReferences.length} 条参考文献`,
      });

      // 通知上层更新本地 state
      onReferencesAdded(parsedReferences);
      
      // 关闭弹窗并清空状态
      onOpenChange(false);
      setText('');
      setError(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : '解析过程中发生未知错误';

      // 全局 toast 提示
      toast.error('参考文献解析失败', {
        description: msg,
      });

      // 显示错误信息
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setText('');
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批量解析参考文献</DialogTitle>
          <DialogDescription>
            在下方的文本框中粘贴参考文献内容，系统将自动解析并添加到论文的参考文献列表中。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              支持多种参考文献格式，包括：
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-500 list-disc list-inside mb-3 space-y-1">
              <li>期刊论文：[1] J. Smith, "Title of paper," Journal Name, vol. 10, no. 2, pp. 123-145, 2020.</li>
              <li>会议论文：[2] K. Johnson et al., "Another paper title," Conference Name, 2019.</li>
              <li>预印本：[3] L. Wang, "Preprint title," arXiv:1234.5678, 2021.</li>
              <li>书籍：[4] M. Brown, "Book title," Publisher, 2018.</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              参考文献内容
            </label>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null); // Clear error when user starts typing
              }}
              placeholder={`请粘贴参考文献内容，例如：\n\n[1] J. Liu, Z. Lu, and W. Du, "Combining enterprise knowledge graph and news sentiment analysis for stock price prediction," *Hawaii International Conference on System Sciences*, 2019.\n[22] T. Jochem and F. S. Peters, "Bias propagation in economically linked firms," Available at SSRN 2698365, 2019.\n[23] J. Cao et al., "Too sensitive to fail: The impact of sentiment connectedness on stock price crash risk," Entropy, vol. 27, no. 4, p. 345, 2025.`}
              rows={12}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono text-sm"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            className="min-w-20"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                解析中...
              </>
            ) : (
              '解析并添加'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}