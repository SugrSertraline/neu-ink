// 虚拟化工具函数
import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * 虚拟列表项类型
 */
export interface VirtualItem {
  index: number;
  value: any;
  key: string | number;
  size: number;
  offset: number;
  x?: number;
  y?: number;
}

/**
 * 虚拟列表配置
 */
export interface VirtualListOptions {
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  scrollElement?: HTMLElement | Window;
  estimatedItemSize?: number;
}

/**
 * 虚拟列表 Hook
 */
export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
) {
  const {
    itemHeight,
    overscan = 5,
    scrollElement = window,
    estimatedItemSize = 50,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLElement>(null);

  // 计算项目高度
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  // 计算项目偏移量
  const getItemOffset = useCallback((index: number): number => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [getItemHeight]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return items.reduce((height, _, index) => height + getItemHeight(index), 0);
  }, [items, getItemHeight]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const result: VirtualItem[] = [];
    let offset = 0;
    let startIndex = 0;
    let endIndex = 0;

    // 找到开始索引
    for (let i = 0; i < items.length; i++) {
      const itemOffset = getItemOffset(i);
      const itemHeight = getItemHeight(i);
      
      if (itemOffset + itemHeight > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    // 找到结束索引
    for (let i = startIndex; i < items.length; i++) {
      const itemOffset = getItemOffset(i);
      const itemHeight = getItemHeight(i);
      
      if (itemOffset > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    // 如果没有找到结束索引，说明所有项目都可见
    if (endIndex === 0) {
      endIndex = items.length - 1;
    }

    // 生成可见项目
    for (let i = startIndex; i <= endIndex; i++) {
      const itemOffset = getItemOffset(i);
      result.push({
        index: i,
        value: items[i],
        key: (items[i] as any)?.id ?? i,
        size: getItemHeight(i),
        offset: itemOffset,
      });
    }

    return result;
  }, [items, scrollTop, containerHeight, overscan, getItemHeight, getItemOffset]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    const element = scrollElement === window ? document.documentElement : scrollElement as HTMLElement;
    setScrollTop(element.scrollTop);
  }, [scrollElement]);

  // 容器高度测量
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  // 设置滚动监听
  useEffect(() => {
    const element = scrollElement === window ? window : scrollElement as HTMLElement;
    
    element.addEventListener('scroll', handleScroll);
    measureContainer();
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, measureContainer, scrollElement]);

  // 窗口大小变化监听
  useEffect(() => {
    const resizeObserver = new ResizeObserver(measureContainer);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [measureContainer]);

  return {
    items: visibleItems,
    totalHeight,
    containerRef,
    scrollToIndex: useCallback((index: number) => {
      const offset = getItemOffset(index);
      const element = scrollElement === window ? document.documentElement : scrollElement as HTMLElement;
      element.scrollTop = offset;
    }, [getItemOffset, scrollElement]),
  };
}

/**
 * 虚拟网格配置
 */
export interface VirtualGridOptions {
  itemHeight: number;
  itemWidth: number;
  columnCount?: number;
  gap?: number;
  overscan?: number;
  scrollElement?: HTMLElement | Window;
}

/**
 * 虚拟网格 Hook
 */
export function useVirtualGrid<T>(
  items: T[],
  options: VirtualGridOptions
) {
  const {
    itemHeight,
    itemWidth,
    columnCount: propColumnCount,
    gap = 0,
    overscan = 2,
    scrollElement = window,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLElement>(null);

  // 计算列数
  const columnCount = useMemo(() => {
    if (propColumnCount) return propColumnCount;
    if (containerWidth === 0) return 1;
    return Math.floor((containerWidth + gap) / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap, propColumnCount]);

  // 计算行数
  const rowCount = useMemo(() => {
    return Math.ceil(items.length / columnCount);
  }, [items.length, columnCount]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return rowCount * (itemHeight + gap) - gap;
  }, [rowCount, itemHeight, gap]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const result: VirtualItem[] = [];
    
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const visibleRowCount = Math.ceil(containerHeight / (itemHeight + gap));
    const endRow = Math.min(rowCount - 1, startRow + visibleRowCount + overscan * 2);
    const actualStartRow = Math.max(0, startRow - overscan);

    for (let row = actualStartRow; row <= endRow; row++) {
      for (let col = 0; col < columnCount; col++) {
        const index = row * columnCount + col;
        if (index >= items.length) break;
        
        const x = col * (itemWidth + gap);
        const y = row * (itemHeight + gap);
        
        result.push({
          index,
          value: items[index],
          key: (items[index] as any)?.id ?? index,
          size: itemHeight,
          offset: y,
          x: (items[index] as any)?.x,
          y: (items[index] as any)?.y,
        });
      }
    }

    return result;
  }, [items, scrollTop, containerHeight, columnCount, rowCount, itemHeight, itemWidth, gap, overscan]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    const element = scrollElement === window ? document.documentElement : scrollElement as HTMLElement;
    setScrollTop(element.scrollTop);
  }, [scrollElement]);

  // 容器测量
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  // 设置监听
  useEffect(() => {
    const element = scrollElement === window ? window : scrollElement as HTMLElement;
    
    element.addEventListener('scroll', handleScroll);
    measureContainer();
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, measureContainer, scrollElement]);

  // 窗口大小变化监听
  useEffect(() => {
    const resizeObserver = new ResizeObserver(measureContainer);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [measureContainer]);

  return {
    items: visibleItems,
    totalHeight,
    containerRef,
    columnCount,
    scrollToIndex: useCallback((index: number) => {
      const row = Math.floor(index / columnCount);
      const offset = row * (itemHeight + gap);
      const element = scrollElement === window ? document.documentElement : scrollElement as HTMLElement;
      element.scrollTop = offset;
    }, [columnCount, itemHeight, gap, scrollElement]),
  };
}

/**
 * 动态高度虚拟列表 Hook
 */
export function useDynamicVirtualList<T>(
  items: T[],
  options: {
    estimatedItemSize?: number;
    overscan?: number;
    scrollElement?: HTMLElement | Window;
    getItemSize?: (index: number, item: T) => number;
  }
) {
  const {
    estimatedItemSize = 50,
    overscan = 5,
    scrollElement = window,
    getItemSize,
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  const itemSizesRef = useRef<Map<number, number>>(new Map());
  const itemOffsetsRef = useRef<Map<number, number>>(new Map());

  // 获取项目大小
  const getItemSizeInternal = useCallback((index: number, item: T): number => {
    if (getItemSize) {
      return getItemSize(index, item);
    }
    return itemSizesRef.current.get(index) ?? estimatedItemSize;
  }, [getItemSize, estimatedItemSize]);

  // 计算项目偏移量
  const getItemOffset = useCallback((index: number): number => {
    const cached = itemOffsetsRef.current.get(index);
    if (cached !== undefined) return cached;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemSizeInternal(i, items[i]);
    }
    
    itemOffsetsRef.current.set(index, offset);
    return offset;
  }, [items, getItemSizeInternal]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    return items.reduce((height, _, index) => height + getItemSizeInternal(index, items[index]), 0);
  }, [items, getItemSizeInternal]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const result: VirtualItem[] = [];
    let startIndex = 0;
    let endIndex = 0;

    // 二分查找开始索引
    let low = 0;
    let high = items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const offset = getItemOffset(mid);
      const size = getItemSizeInternal(mid, items[mid]);
      
      if (offset + size > scrollTop) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    startIndex = Math.max(0, low - overscan);

    // 查找结束索引
    for (let i = startIndex; i < items.length; i++) {
      const offset = getItemOffset(i);
      const size = getItemSizeInternal(i, items[i]);
      
      if (offset > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }

    if (endIndex === 0) {
      endIndex = items.length - 1;
    }

    // 生成可见项目
    for (let i = startIndex; i <= endIndex; i++) {
      const offset = getItemOffset(i);
      const size = getItemSizeInternal(i, items[i]);
      
      result.push({
        index: i,
        value: items[i],
        key: (items[i] as any)?.id ?? i,
        size,
        offset,
      });
    }

    return result;
  }, [items, scrollTop, containerHeight, overscan, getItemOffset, getItemSizeInternal]);

  // 滚动处理
  const handleScroll = useCallback(() => {
    const element = scrollElement === window ? document.documentElement : scrollElement as HTMLElement;
    setScrollTop(element.scrollTop);
  }, [scrollElement]);

  // 容器测量
  const measureContainer = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
  }, []);

  // 设置项目大小
  const setItemSize = useCallback((index: number, size: number) => {
    itemSizesRef.current.set(index, size);
    // 清除后续项目的偏移缓存
    for (let i = index + 1; i < items.length; i++) {
      itemOffsetsRef.current.delete(i);
    }
  }, [items.length]);

  // 设置监听
  useEffect(() => {
    const element = scrollElement === window ? window : scrollElement as HTMLElement;
    
    element.addEventListener('scroll', handleScroll);
    measureContainer();
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll, measureContainer, scrollElement]);

  // 窗口大小变化监听
  useEffect(() => {
    const resizeObserver = new ResizeObserver(measureContainer);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [measureContainer]);

  return {
    items: visibleItems,
    totalHeight,
    containerRef,
    setItemSize,
    scrollToIndex: useCallback((index: number) => {
      const offset = getItemOffset(index);
      const element = scrollElement === window ? document.documentElement : scrollElement as HTMLElement;
      element.scrollTop = offset;
    }, [getItemOffset, scrollElement]),
  };
}