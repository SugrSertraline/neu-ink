// 渲染优化工具函数
import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * 浅比较函数
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

/**
 * 深比较函数（简化版）
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * 优化的列表渲染 Hook
 */
export function useOptimizedList<T, R>(
  items: T[],
  renderItem: (item: T, index: number) => R,
  options: {
    compareFn?: (prev: any, next: any) => boolean;
  enableMemo?: boolean;
  } = {}
) {
  const {
    compareFn = shallowEqual,
    enableMemo = true,
  } = options;

  const memoizedRenderItem = useCallback(renderItem, [renderItem]);
  const memoizedItems = useMemo(() => items, [items, compareFn]);

  const renderedItems = useMemo(() => {
    return memoizedItems.map((item, index) => memoizedRenderItem(item, index));
  }, [memoizedItems, memoizedRenderItem]);

  return enableMemo ? renderedItems : memoizedItems.map((item, index) => memoizedRenderItem(item, index));
}

/**
 * 优化的条件渲染 Hook
 */
export function useOptimizedConditional<T>(
  condition: boolean,
  renderTrue: () => T,
  renderFalse?: () => T,
  options: {
    enableMemo?: boolean;
  } = {}
) {
  const {
    enableMemo = true,
  } = options;

  const memoizedRenderTrue = useCallback(renderTrue, [renderTrue]);
  const memoizedRenderFalse = useCallback(renderFalse || (() => null as T), [renderFalse]);

  const result = useMemo(() => {
    return condition ? memoizedRenderTrue() : memoizedRenderFalse();
  }, [condition, memoizedRenderTrue, memoizedRenderFalse]);

  return enableMemo ? result : (condition ? memoizedRenderTrue() : memoizedRenderFalse());
}

/**
 * 优化的样式计算 Hook
 */
export function useOptimizedStyle<T extends React.CSSProperties>(
  styleFn: () => T,
  deps: React.DependencyList = []
) {
  const memoizedStyleFn = useCallback(styleFn, deps);
  const style = useMemo(() => memoizedStyleFn(), [memoizedStyleFn]);
  return style;
}

/**
 * 优化的类名计算 Hook
 */
export function useOptimizedClassName(
  classNameFn: () => string,
  deps: React.DependencyList = []
) {
  const memoizedClassNameFn = useCallback(classNameFn, deps);
  const className = useMemo(() => memoizedClassNameFn(), [memoizedClassNameFn]);
  return className;
}

/**
 * 防抖渲染 Hook
 */
export function useDebouncedRender<T>(
  value: T,
  delay: number = 300
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流渲染 Hook
 */
export function useThrottledRender<T>(
  value: T,
  delay: number = 300
): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecutedRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutedRef.current;

    if (timeSinceLastExecution >= delay) {
      setThrottledValue(value);
      lastExecutedRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setThrottledValue(value);
        lastExecutedRef.current = Date.now();
      }, delay - timeSinceLastExecution);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * 渲染性能监控 Hook
 */
export function useRenderPerformance(componentName: string) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const [performanceStats, setPerformanceStats] = useState<{
    renderCount: number;
    averageRenderTime: number;
    maxRenderTime: number;
    lastRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    lastRenderTime: 0,
  });

  const startRenderTime = useRef<number>(0);

  const startTiming = useCallback(() => {
    startRenderTime.current = performance.now();
  }, []);

  const endTiming = useCallback(() => {
    if (startRenderTime.current === 0) return;

    const renderTime = performance.now() - startRenderTime.current;
    renderCountRef.current++;
    renderTimesRef.current.push(renderTime);

    if (renderTimesRef.current.length > 50) {
      renderTimesRef.current.shift();
    }

    const averageRenderTime = renderTimesRef.current.reduce((sum, time) => sum + time, 0) / renderTimesRef.current.length;
    const maxRenderTime = Math.max(...renderTimesRef.current);

    setPerformanceStats({
      renderCount: renderCountRef.current,
      averageRenderTime,
      maxRenderTime,
      lastRenderTime: renderTime,
    });

    startRenderTime.current = 0;
  }, []);

  return {
    startTiming,
    endTiming,
    performanceStats,
  };
}

/**
 * 优化的事件处理器 Hook
 */
export function useOptimizedEventHandler<T extends Event>(
  handler: (event: T) => void,
  options: {
    debounce?: number;
    throttle?: number;
    passive?: boolean;
    capture?: boolean;
  } = {}
) {
  const { debounce, throttle, passive = false, capture = false } = options;

  const memoizedHandler = useCallback(handler, [handler]);

  const optimizedHandler = useMemo(() => {
    if (debounce) {
      let timeoutId: NodeJS.Timeout;
      return (event: T) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => memoizedHandler(event), debounce);
      };
    }

    if (throttle) {
      let lastExecuted = 0;
      return (event: T) => {
        const now = Date.now();
        if (now - lastExecuted >= throttle) {
          memoizedHandler(event);
          lastExecuted = now;
        }
      };
    }

    return memoizedHandler;
  }, [memoizedHandler, debounce, throttle]);

  return {
    handler: optimizedHandler,
    options: { passive, capture },
  };
}

/**
 * 优化的滚动事件 Hook
 */
export function useOptimizedScroll(
  handler: (event: Event) => void,
  options: {
    throttle?: number;
    passive?: boolean;
  } = {}
) {
  const { throttle = 16, passive = true } = options;

  const { handler: optimizedHandler, options: eventOptions } = useOptimizedEventHandler(
    handler,
    { throttle, passive }
  );

  useEffect(() => {
    window.addEventListener('scroll', optimizedHandler, eventOptions);
    return () => {
      window.removeEventListener('scroll', optimizedHandler, eventOptions);
    };
  }, [optimizedHandler, eventOptions]);
}

/**
 * 优化的调整大小事件 Hook
 */
export function useOptimizedResize(
  handler: (event: UIEvent) => void,
  options: {
    debounce?: number;
    passive?: boolean;
  } = {}
) {
  const { debounce = 100, passive = true } = options;

  const { handler: optimizedHandler, options: eventOptions } = useOptimizedEventHandler(
    handler,
    { debounce, passive }
  );

  useEffect(() => {
    window.addEventListener('resize', optimizedHandler, eventOptions);
    return () => {
      window.removeEventListener('resize', optimizedHandler, eventOptions);
    };
  }, [optimizedHandler, eventOptions]);
}