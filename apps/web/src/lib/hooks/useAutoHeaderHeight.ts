import { useRef, useEffect } from 'react';

export function useAutoHeaderHeight(varName = '--app-header-h', extraScrollPad = 24, stickyOffset = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setVars = (h: number) => {
      const actual = Math.round(h);
      const total = actual + stickyOffset;
      const root = document.documentElement;

      // 使用更稳定的更新方式，减少布局抖动
      root.style.setProperty(varName, `${total}px`);
    };

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        // 使用防抖处理，减少频繁更新
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setVars(rect.height);
        }, 50);
      }
    };

    const ro = new ResizeObserver(handleResize);

    // 初始设置高度
    setVars(el.getBoundingClientRect().height);
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [varName, extraScrollPad, stickyOffset]);

  return ref;
}