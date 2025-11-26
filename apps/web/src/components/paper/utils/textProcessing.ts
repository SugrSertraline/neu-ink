// 文本处理工具函数
// 用于减少组件中的重复代码
import React from 'react';
import type { BlockContent } from '@/types/paper';

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 高亮文本中的搜索词
 */
export function highlightText(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
  const parts = text.split(re);
  
  return parts.map((part, i) => {
    if (part.toLowerCase() === q.toLowerCase()) {
      return React.createElement(
        'mark',
        {
          key: i,
          className: "bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-white"
        },
        part
      );
    } else {
      return React.createElement(
        React.Fragment,
        { key: i },
        part
      );
    }
  });
}

/**
 * 从内联节点中提取文本
 */
export function extractInlineText(nodes?: any[]): string {
  if (!nodes?.length) return '';
  const buf: string[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case 'text':
        buf.push(n.content || '');
        break;
      case 'link':
        buf.push(extractInlineText(n.children));
        break;
      case 'inline-math':
        buf.push(n.latex ?? '');
        break;
      case 'citation':
        buf.push(n.displayText || n.referenceIds?.join(',') || '');
        break;
      case 'figure-ref':
      case 'table-ref':
      case 'section-ref':
      case 'equation-ref':
        buf.push(n.displayText || '');
        break;
      case 'footnote':
        buf.push(n.displayText || n.content || n.id || '');
        break;
      default:
        break;
    }
  }
  return buf.join(' ');
}

/**
 * 从块内容中提取文本
 */
export function extractBlockText(block: any): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return [
        extractInlineText((block as any).content?.en),
        extractInlineText((block as any).content?.zh),
      ].join(' ');
    case 'math':
      return [
        (block as any).latex || '',
        (block as any).label || '',
        (block as any).number ? String((block as any).number) : '',
      ].join(' ');
    case 'figure':
      return [
        extractInlineText((block as any).caption?.en),
        extractInlineText((block as any).caption?.zh),
        extractInlineText((block as any).description?.en),
        extractInlineText((block as any).description?.zh),
        (block as any).alt || '',
        (block as any).uploadedFilename || '',
      ].join(' ');
    case 'table': {
      const headerText = Array.isArray((block as any).headers) ? (block as any).headers.join(' ') : '';
      const rowsText = Array.isArray((block as any).rows)
        ? (block as any).rows
            .map((row: any[]) =>
              row
                .map((cell: any) => {
                  if (typeof cell === 'string') return cell;
                  if (cell && typeof cell === 'object') {
                    const en = cell.en ?? '';
                    const zh = cell.zh ?? '';
                    return [en, zh].filter(Boolean).join(' ');
                  }
                  return '';
                })
                .join(' '),
            )
            .join(' ')
        : '';
      const cap = [
        extractInlineText((block as any).caption?.en),
        extractInlineText((block as any).caption?.zh),
        extractInlineText((block as any).description?.en),
        extractInlineText((block as any).description?.zh),
      ].join(' ');
      return [headerText, rowsText, cap].join(' ');
    }
    case 'code':
      return [
        (block as any).code || '',
        extractInlineText((block as any).caption?.en),
        extractInlineText((block as any).caption?.zh),
      ].join(' ');
    case 'ordered-list':
    case 'unordered-list':
      return Array.isArray((block as any).items)
        ? (block as any).items
            .map((it: any) =>
              [
                extractInlineText(it?.content?.en),
                extractInlineText(it?.content?.zh),
              ].join(' '),
            )
            .join(' ')
        : '';
    case 'quote':
      return [
        extractInlineText((block as any).content?.en),
        extractInlineText((block as any).content?.zh),
        (block as any).author || '',
      ].join(' ');
    case 'divider':
      return '';
    default:
      return '';
  }
}

/**
 * 生成章节编号
 */
export function generateSectionNumber(path: number[]): string {
  return path.join('.');
}

/**
 * 深度克隆对象
 */
export function cloneBlock<T extends any>(block: T): T {
  return JSON.parse(JSON.stringify(block));
}

/**
 * 检查块类型是否支持翻译
 */
export function isTranslatableBlockType(type: string): boolean {
  const supportedTypes = ['heading', 'paragraph', 'figure', 'table', 'ordered-list', 'unordered-list', 'quote'];
  return supportedTypes.includes(type);
}

/**
 * 获取块类型的显示名称和图标
 */
export function getBlockTypeInfo(type: string) {
  const blockTypes: Record<string, { label: string; icon: string }> = {
    'paragraph': { label: '段落', icon: '📝' },
    'heading': { label: '标题', icon: '📌' },
    'math': { label: '数学公式', icon: '∑' },
    'figure': { label: '图片', icon: '🖼️' },
    'table': { label: '表格', icon: '📊' },
    'code': { label: '代码块', icon: '💻' },
    'ordered-list': { label: '有序列表', icon: '🔢' },
    'unordered-list': { label: '无序列表', icon: '•' },
    'quote': { label: '引用', icon: '💬' },
    'divider': { label: '分隔线', icon: '—' },
  };
  
  return blockTypes[type] || { label: type, icon: '❓' };
}

/**
 * 创建块类型菜单项
 */
export function createBlockTypeMenuItems(onSelect: (type: string) => void) {
  const blockTypes = [
    'paragraph', 'heading', 'math', 'figure', 'table', 
    'code', 'ordered-list', 'unordered-list', 'quote', 'divider'
  ] as const;
  
  return blockTypes.map(type => {
    const info = getBlockTypeInfo(type);
    return {
      kind: 'item' as const,
      label: `${info.icon} ${info.label}`,
      onSelect: () => onSelect(type),
    };
  });
}