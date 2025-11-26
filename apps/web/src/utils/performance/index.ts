// 性能优化工具函数

// 虚拟列表项类型
export interface VirtualItem {
  index: number;
  value: any;
  key: string | number;
  size: number;
  offset: number;
  x?: number;
  y?: number;
}

// 虚拟列表配置
export interface VirtualListOptions {
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  scrollElement?: HTMLElement | Window;
  estimatedItemSize?: number;
}

// 虚拟网格配置
export interface VirtualGridOptions {
  itemHeight: number;
  itemWidth: number;
  columnCount?: number;
  gap?: number;
  overscan?: number;
  scrollElement?: HTMLElement | Window;
}