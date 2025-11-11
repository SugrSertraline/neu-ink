// src/components/paper/ParseReferencesDialog.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { adminPaperService, userPaperService } from '@/lib/services/paper';
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
  const [parseResult, setParseResult] = useState<{
    references: Reference[];
    count: number;
    errors: Array<{
      index: number | null;
      raw: string;
      message: string;
    }>;
  } | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入要解析的参考文献内容');
      return;
    }

    setIsLoading(true);
    setError(null);
    setParseResult(null);

    try {
      // 选择正确的 ID（个人论文 or 公共库）
      const targetId = isPersonalOwner ? userPaperId : paperId;
      if (!targetId) {
        throw new Error('无法确定论文标识');
      }

      let result;
      
      // 根据论文类型选择不同的服务
      if (isPersonalOwner) {
        // 用户个人论文库
        result = await userPaperService.parseReferencesForUserPaper(
          targetId,
          { text: text.trim() }
        );
      } else {
        // 管理员公共论文库
        result = await adminPaperService.parseReferencesForPaper(
          targetId,
          { text: text.trim() }
        );
      }

      if (result.bizCode !== 0) {
        const msg = result.bizMessage || '解析并添加参考文献失败';
        throw new Error(msg);
      }

      const addedReferences = result.data?.addedReferences as Reference[] || [];
      const updatedReferences = result.data?.updatedReferences as Reference[] || [];
      const duplicateCount = result.data?.duplicateCount || 0;
      const totalReferences = result.data?.paper?.references?.length || 0;
      const parseData = result.data?.parseResult;

      // 如果有解析结果数据，显示解析状态
      if (parseData) {
        setParseResult({
          references: parseData.references || [],
          count: parseData.count || 0,
          errors: parseData.errors || []
        });

        // 如果有解析错误，显示警告并在控制台输出错误详情
        if (parseData.errors && parseData.errors.length > 0) {
          console.group('📚 参考文献解析错误详情');
          console.error(`解析失败的条目数量: ${parseData.errors.length}`);
          parseData.errors.forEach((error, index) => {
            console.error(`错误 ${index + 1}:`, {
              条目索引: error.index,
              原始内容: error.raw,
              错误信息: error.message
            });
          });
          console.groupEnd();
          
          toast.warning('部分参考文献解析失败', {
            description: `成功解析 ${parseData.count} 条，${parseData.errors.length} 条解析失败`,
          });
        }
      }

      // 构建成功消息
      let successMessage = `成功添加了 ${addedReferences.length} 条参考文献`;
      if (updatedReferences.length > 0) {
        successMessage += `，更新了 ${updatedReferences.length} 条重复文献`;
      }
      successMessage += `，总计 ${totalReferences} 条`;

      // 成功提示
      toast.success('参考文献解析成功', {
        description: successMessage,
      });

      // 通知上层更新本地 state（包括新增和更新的参考文献）
      onReferencesAdded([...addedReferences, ...updatedReferences]);
      
      // 关闭弹窗并清空状态
      onOpenChange(false);
      setText('');
      setError(null);
      setParseResult(null);
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
      setParseResult(null);
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

          {parseResult && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                解析结果
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                成功解析 {parseResult.count} 条参考文献
              </p>
              
              {parseResult.errors.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    解析失败的条目 ({parseResult.errors.length})
                  </h5>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {parseResult.errors.map((err, idx) => (
                      <div key={idx} className="text-xs bg-red-100 dark:bg-red-900/30 rounded p-2">
                        <p className="text-red-700 dark:text-red-300 font-medium">
                          {err.index !== null ? `条目 [${err.index}]` : '未知条目'}: {err.message}
                        </p>
                        <p className="text-red-600 dark:text-red-400 mt-1 font-mono">
                          {err.raw.length > 100 ? `${err.raw.substring(0, 100)}...` : err.raw}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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