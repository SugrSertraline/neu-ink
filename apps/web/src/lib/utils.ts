// 直接定义 cn 函数，避免循环导入
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 导出 utils/index.ts 中的其他函数
export * from './utils/index';
