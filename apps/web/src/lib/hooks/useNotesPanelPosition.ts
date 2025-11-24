import { useState, useLayoutEffect } from 'react';
import { NOTES_PANEL_WIDTH, NOTES_PANEL_GAP } from '@/types/paper/constants';

interface UseNotesPanelPositionProps {
  showNotesPanel: boolean;
  wrapperRef: React.RefObject<HTMLDivElement>;
  headerRef: React.RefObject<HTMLDivElement>;
}

export function useNotesPanelPosition({ showNotesPanel, wrapperRef, headerRef }: UseNotesPanelPositionProps) {
  const [notesFixedStyle, setNotesFixedStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  // 计算固定笔记面板的位置与高度（贴紧 content，位于 header 下）
  useLayoutEffect(() => {
    if (!showNotesPanel) {
      setNotesOpen(false);
      setNotesFixedStyle(null);
      return;
    }

    // 缓存上次计算的值,避免不必要的状态更新
    let lastStyle: { top: number; left: number; width: number; height: number } | null = null;

    // 节流计时器引用
    let throttleTimer: NodeJS.Timeout | null = null;
    let rafId: number | null = null;

    const compute = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const headerVar = getComputedStyle(document.documentElement).getPropertyValue('--app-header-h').trim();
      const headerH = parseFloat(headerVar || '160');
      const gap = NOTES_PANEL_GAP;

      const top = headerH + gap;
      const left = rect.right - NOTES_PANEL_WIDTH;
      const height = Math.max(200, window.innerHeight - top - gap);

      // 只有当值真正改变时才更新状态(使用较小的阈值避免微小抖动)
      const hasChanged = !lastStyle ||
        Math.abs(lastStyle.top - top) > 1 ||
        Math.abs(lastStyle.left - left) > 1 ||
        Math.abs(lastStyle.height - height) > 5;

      if (hasChanged) {
        const newStyle = {
          top,
          left,
          width: NOTES_PANEL_WIDTH,
          height,
        };
        lastStyle = newStyle;
        setNotesFixedStyle(newStyle);
      }
    };

    // 使用 requestAnimationFrame 优化计算时机
    const scheduleCompute = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        compute();
        rafId = null;
      });
    };

    // 节流版本的 compute - 用于高频事件(滚动)
    const throttledCompute = () => {
      if (throttleTimer) return;

      throttleTimer = setTimeout(() => {
        scheduleCompute();
        throttleTimer = null;
      }, 100); // 100ms 节流间隔
    };

    // 防抖版本的 compute - 用于 resize 事件
    let debounceTimer: NodeJS.Timeout | null = null;
    const debouncedCompute = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        scheduleCompute();
        debounceTimer = null;
      }, 150); // 150ms 防抖延迟
    };

    // 初始计算
    scheduleCompute();

    // ResizeObserver 使用节流
    const roWrapper = new ResizeObserver(() => throttledCompute());
    const roHeader = new ResizeObserver(() => throttledCompute());

    if (wrapperRef.current) roWrapper.observe(wrapperRef.current);
    // @ts-ignore
    if (headerRef?.current) roHeader.observe(headerRef.current as Element);

    // 窗口 resize 使用防抖
    window.addEventListener('resize', debouncedCompute, { passive: true });
    // 滚动使用节流
    window.addEventListener('scroll', throttledCompute, { passive: true });

    // 打开标志（动画由 framer 执行）
    const openRaf = requestAnimationFrame(() => setNotesOpen(true));

    return () => {
      // 清理所有计时器和监听器
      roWrapper.disconnect();
      roHeader.disconnect();
      window.removeEventListener('resize', debouncedCompute);
      window.removeEventListener('scroll', throttledCompute);

      if (throttleTimer) clearTimeout(throttleTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (rafId) cancelAnimationFrame(rafId);
      cancelAnimationFrame(openRaf);
    };
  }, [showNotesPanel, headerRef, wrapperRef]);

  return {
    notesFixedStyle,
    notesOpen,
  };
}