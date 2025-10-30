// 自动保存阅读进度的 Hook

import { useEffect, useRef, useCallback } from 'react';
import { userPaperService } from '../services/paper';  // ✅ 修复：使用相对路径

interface UseReadingProgressOptions {
  userPaperId: string;
  enabled?: boolean;
  saveInterval?: number; // 自动保存间隔（毫秒），默认 30 秒
}

export function useReadingProgress({
  userPaperId,
  enabled = true,
  saveInterval = 30000, // 30秒
}: UseReadingProgressOptions) {
  const startTimeRef = useRef<number>(Date.now());
  const currentPositionRef = useRef<string | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  /**
   * 更新当前阅读位置
   */
  const updatePosition = useCallback((blockId: string | null) => {
    currentPositionRef.current = blockId;
  }, []);

  /**
   * 保存阅读进度
   */
  const saveProgress = useCallback(async () => {
    if (!enabled || isSavingRef.current) return;

    const now = Date.now();
    const readingTime = Math.floor((now - startTimeRef.current) / 1000); // 秒

    // 至少有 5 秒的阅读时间才保存
    if (readingTime < 5) return;

    isSavingRef.current = true;

    try {
      await userPaperService.updateReadingProgress(userPaperId, {
        readingPosition: currentPositionRef.current,
        readingTime,
      });

      // 重置计时器
      startTimeRef.current = now;
    } catch (error) {
      console.error('保存阅读进度失败:', error);
      // 静默失败，不打断用户阅读
    } finally {
      isSavingRef.current = false;
    }
  }, [userPaperId, enabled]);

  /**
   * 立即保存（用于组件卸载时）
   */
  const saveImmediately = useCallback(async () => {
    if (!enabled) return;
    
    // 清除定时器
    if (saveTimerRef.current) {
      clearInterval(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await saveProgress();
  }, [enabled, saveProgress]);

  /**
   * 启动自动保存定时器
   */
  useEffect(() => {
    if (!enabled) return;

    // 定时自动保存
    saveTimerRef.current = setInterval(() => {
      saveProgress();
    }, saveInterval);

    // 页面可见性变化时保存
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 页面卸载前保存
    const handleBeforeUnload = () => {
      saveProgress();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // 组件卸载时保存
      saveProgress();
    };
  }, [enabled, saveInterval, saveProgress]);

  return {
    updatePosition,      // 更新当前阅读位置
    saveProgress,        // 手动保存进度
    saveImmediately,     // 立即保存并停止定时器
  };
}
