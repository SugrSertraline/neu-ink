// src/lib/hooks/useParseReferences.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { adminPaperService } from '@/lib/services/paper';
import type { Reference } from '@/types/paper';

interface UseParseReferencesProps {
  paperId: string;
  userPaperId?: string | null;
  isPersonalOwner: boolean;
  onReferencesAdded?: (references: Reference[]) => void;
}

export function useParseReferences({
  paperId,
  userPaperId,
  isPersonalOwner,
  onReferencesAdded,
}: UseParseReferencesProps) {
  const [isParseDialogOpen, setIsParseDialogOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  /**
   * 提供给 ParseReferencesDialog 的回调：
   * - 成功：解析并添加参考文献，toast 提示，resolve(void)
   * - 失败：toast 提示，同时 throw Error，让对话框在输入框下显示错误信息
   */
  const handleParseReferences = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) {
        const msg = '请输入要解析的参考文献内容';
        // 直接抛错，让对话框的 catch 来显示
        throw new Error(msg);
      }

      setIsParsing(true);

      try {
        // 选择正确的 ID（个人论文 or 公共库）
        const targetId = isPersonalOwner ? userPaperId : paperId;
        if (!targetId) {
          throw new Error('无法确定论文标识');
        }

        // 第一步：解析参考文献
        const parseResult = await adminPaperService.parseReferences({
          text: trimmed,
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

        const parsedReferences = parseResult.data
          .references as Reference[];

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
        onReferencesAdded?.(parsedReferences);
        // 不需要返回任何内容，类型就是 Promise<void>
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : '解析过程中发生未知错误';

        // 全局 toast 提示
        toast.error('参考文献解析失败', {
          description: msg,
        });

        // 再抛给 ParseReferencesDialog，让它在文本框下显示错误
        throw err instanceof Error ? err : new Error(msg);
      } finally {
        setIsParsing(false);
      }
    },
    [paperId, userPaperId, isPersonalOwner, onReferencesAdded],
  );

  const openParseDialog = useCallback(() => {
    setIsParseDialogOpen(true);
  }, []);

  const closeParseDialog = useCallback(() => {
    setIsParseDialogOpen(false);
  }, []);

  return {
    isParseDialogOpen,
    isParsing,
    openParseDialog,
    closeParseDialog,
    handleParseReferences,
  };
}
