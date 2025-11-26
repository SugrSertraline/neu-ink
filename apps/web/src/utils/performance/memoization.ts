// 记忆化工具函数
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';

/**
 * 深度比较两个对象是否相等
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
 * 创建一个记忆化的函数
 */
export function useMemoCallback<T extends (...args: any[]) => any>(
  fn: T,
  deps: React.DependencyList
): T {
  const ref = useRef<{
    fn: T;
    deps: React.DependencyList;
    result: T;
  }>({
    fn,
    deps,
    result: fn,
  });

  if (!deepEqual(ref.current.deps, deps)) {
    ref.current = {
      fn,
      deps,
      result: fn,
    };
  }

  return ref.current.result;
}

/**
 * 创建一个记忆化的选择器
 */
export function useMemoSelector<T, R>(
  value: T,
  selector: (value: T) => R,
  deps: React.DependencyList = []
): R {
  return useMemo(() => selector(value), [value, ...deps]);
}

/**
 * 创建一个防抖的记忆化函数
 */
export function useDebouncedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  delay: number = 300
): T {
  const [value, setValue] = useState<T>(() => factory());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(factory());
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return value;
}

/**
 * 创建一个记忆化的计算函数
 */
export function useComputed<T, R>(
  value: T,
  computeFn: (value: T) => R,
  equalityFn?: (a: R, b: R) => boolean
): R {
  const ref = useRef<{
    value: T;
    result: R;
  }>({
    value,
    result: computeFn(value),
  });

  if (!equalityFn) {
    equalityFn = deepEqual;
  }

  if (!equalityFn(ref.current.value as any, value as any)) {
    ref.current = {
      value,
      result: computeFn(value),
    };
  }

  return ref.current.result;
}

/**
 * 创建一个记忆化的列表过滤器
 */
export function useMemoFilter<T>(
  items: T[],
  predicate: (item: T, index: number, array: T[]) => boolean,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => items.filter(predicate), [items, ...deps]);
}

/**
 * 创建一个记忆化的列表映射器
 */
export function useMemoMap<T, R>(
  items: T[],
  mapFn: (item: T, index: number, array: T[]) => R,
  deps: React.DependencyList = []
): R[] {
  return useMemo(() => items.map(mapFn), [items, ...deps]);
}

/**
 * 创建一个记忆化的排序列表
 */
export function useMemoSort<T>(
  items: T[],
  compareFn?: (a: T, b: T) => number,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    const sorted = [...items];
    sorted.sort(compareFn);
    return sorted;
  }, [items, ...deps]);
}