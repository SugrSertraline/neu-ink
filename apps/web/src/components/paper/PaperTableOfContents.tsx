'use client';

import React, { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronDown, FileText, BookOpen, List, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  PaperContent,
  Section,
  BlockContent,
  PaperMetadata,
  Reference,
  InlineContent
} from '@/types/paper';

interface TableOfContentsProps {
  paperContent: PaperContent;
  onNavigate: (elementId: string) => void;
  containerRef?: React.RefObject<HTMLElement|null>;
}

interface TOCItem {
  id: string;
  title: string;
  level: number;
  type: 'metadata' | 'abstract' | 'section' | 'block' | 'references';
  icon?: React.ReactNode;
  children?: TOCItem[];
}

// 动画参数
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DURATION = 0.28;

// 从InlineContent数组中提取文本内容
function extractTextFromInlineContent(inlineContent?: InlineContent[]): string {
  if (!inlineContent || inlineContent.length === 0) return '';
  
  return inlineContent.map(item => {
    switch (item.type) {
      case 'text':
        return item.content || '';
      case 'link':
        return extractTextFromInlineContent(item.children);
      case 'inline-math':
        return item.latex || '';
      case 'citation':
      case 'figure-ref':
      case 'table-ref':
      case 'section-ref':
      case 'equation-ref':
      case 'footnote':
        return item.displayText || '';
      default:
        return '';
    }
  }).join('');
}

// 获取块内容的开头文本
function getBlockPreview(block: BlockContent): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote': {
      const text = extractTextFromInlineContent(block.content?.en) ||
                   extractTextFromInlineContent(block.content?.zh) || '';
      return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    case 'math':
      return (block.latex ?? '').substring(0, 20) + ((block.latex && block.latex.length > 20) ? '...' : '');
    case 'figure': {
      const captionText = extractTextFromInlineContent(block.caption?.en) ||
                          extractTextFromInlineContent(block.caption?.zh) || '图';
      return captionText;
    }
    case 'table':
      return '表格';
    case 'code':
      return '代码';
    default:
      return block.type;
  }
}

// 获取块类型的图标
function getBlockIcon(block: BlockContent): React.ReactNode {
  switch (block.type) {
    case 'heading':
      return <FileText className="w-3 h-3" />;
    case 'paragraph':
      return <FileText className="w-3 h-3" />;
    case 'quote':
      return <Quote className="w-3 h-3" />;
    case 'math':
      return <span className="text-xs font-mono">∑</span>;
    case 'figure':
      return <span className="text-xs">🖼️</span>;
    case 'table':
      return <span className="text-xs">📊</span>;
    case 'code':
      return <span className="text-xs">{`</>`}</span>;
    default:
      return <FileText className="w-3 h-3" />;
  }
}

// 生成章节编号
function generateSectionNumber(path: number[]): string {
  return path.join('.');
}

// 递归遍历章节生成目录项
function traverseSections(
  sections: Section[], 
  path: number[] = []
): TOCItem[] {
  const items: TOCItem[] = [];
  
  sections.forEach((section, index) => {
    const currentPath = [...path, index + 1];
    const sectionNumber = generateSectionNumber(currentPath);
    const sectionTitle = section.title?.en || section.title?.zh || '未命名章节';
    
    // 添加章节项
    const sectionItem: TOCItem = {
      id: section.id,
      title: `${sectionNumber} ${sectionTitle}`,
      level: currentPath.length,
      type: 'section',
      icon: <BookOpen className="w-3 h-3" />,
      children: []
    };
    
    // 添加章节内的块
    if (section.content && section.content.length > 0) {
      section.content.forEach((block) => {
        const blockItem: TOCItem = {
          id: block.id,
          title: getBlockPreview(block),
          level: currentPath.length + 1,
          type: 'block',
          icon: getBlockIcon(block)
        };
        sectionItem.children!.push(blockItem);
      });
    }
    
    // 递归处理子章节
    if (section.subsections && section.subsections.length > 0) {
      const subsectionItems = traverseSections(section.subsections, currentPath);
      sectionItem.children!.push(...subsectionItems);
    }
    
    items.push(sectionItem);
  });
  
  return items;
}

export default function PaperTableOfContents({ paperContent, onNavigate, containerRef }: TableOfContentsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [tocPosition, setTocPosition] = useState<{ left: number } | null>(null);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);
  
  // 生成目录项
  const tocItems = useMemo(() => {
    const items: TOCItem[] = [];
    
    // 添加元数据
    if (paperContent.metadata) {
      items.push({
        id: 'metadata',
        title: '元数据',
        level: 0,
        type: 'metadata',
        icon: <FileText className="w-3 h-3" />
      });
    }
    
    // 添加摘要
    if (paperContent.abstract && (paperContent.abstract.en || paperContent.abstract.zh)) {
      items.push({
        id: 'abstract',
        title: '摘要',
        level: 0,
        type: 'abstract',
        icon: <FileText className="w-3 h-3" />
      });
    }
    
    // 添加章节和块
    if (paperContent.sections && paperContent.sections.length > 0) {
      const sectionItems = traverseSections(paperContent.sections);
      items.push(...sectionItems);
    }
    
    // 添加参考文献
    if (paperContent.references && paperContent.references.length > 0) {
      items.push({
        id: 'references',
        title: '参考文献',
        level: 0,
        type: 'references',
        icon: <List className="w-3 h-3" />
      });
    }
    
    return items;
  }, [paperContent]);
  
  // 初始展开所有章节
  useEffect(() => {
    const sectionIds = new Set<string>();
    tocItems.forEach(item => {
      if (item.type === 'section') {
        sectionIds.add(item.id);
      }
    });
    setExpandedItems(sectionIds);
  }, [tocItems]);
  
  useLayoutEffect(() => {
    const compute = () => {
      if (!containerRef?.current) {
        setTocPosition({ left: 20 });
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const computedStyle = getComputedStyle(containerRef.current);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const contentLeft = containerRect.left + paddingLeft;
      
      setTocPosition({ left: contentLeft });
    };
    compute();

    const handleResize = () => compute();
    window.addEventListener('resize', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (containerRef?.current) {
      resizeObserver = new ResizeObserver(() => compute());
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [containerRef]);

  // 切换章节展开/折叠状态
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) newSet.delete(itemId);
      else newSet.add(itemId);
      return newSet;
    });
  };
  
  // 处理点击事件
  const handleClick = (item: TOCItem) => {
    if (item.type === 'section' && item.children && item.children.length > 0) {
      toggleExpand(item.id);
    }
    setHighlightedElement(item.id);
    setTimeout(() => setHighlightedElement(null), 3000);
    onNavigate(item.id);
  };
  
  // 渲染目录项
  const renderTOCItem = (item: TOCItem, highlightedId?: string | null): React.ReactNode => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isExpandable = item.type === 'section' && hasChildren;
    const isHighlighted = highlightedId === item.id;
    
    return (
      <div key={item.id} className="select-none">
        <div
          className={`
            flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors
            hover:bg-blue-50 dark:hover:bg-blue-900/20
            ${item.type === 'block' ? 'text-xs text-gray-600 dark:text-gray-400' : 'text-sm text-gray-800 dark:text-gray-200'}
            ${isHighlighted ? 'bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500' : ''}
          `}
          style={{ paddingLeft: `${8 + item.level * 12}px` }}
          onClick={() => handleClick(item)}
        >
          {isExpandable ? (
            <span className="shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </span>
          ) : (
            <span className="w-3 h-3 flex-shrink-0" />
          )}
          
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          
          <span className="truncate flex-1">
            {item.title}
          </span>
        </div>
        
        {isExpandable && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderTOCItem(child, highlightedId))}
          </div>
        )}
      </div>
    );
  };

  if (!tocPosition) return null;

  // 使用 Portal 将目录挂载到 body，实现悬浮效果 + 动画
  return createPortal(
    <>
      {/* 折叠状态触发按钮：淡入 + 从左轻微滑入 */}
      <AnimatePresence initial={false}>
        {isCollapsed && (
          <motion.button
            key="toc-collapsed-trigger"
            onClick={() => setIsCollapsed(false)}
            className="hidden lg:block fixed z-40 pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-t border-b border-gray-200 dark:border-slate-700 shadow-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-200 py-4 px-1 rounded-r-lg"
            style={{
              left: `${tocPosition.left}px`,
              top: '50vh',
              transform: 'translateY(-50%)',
            }}
            title="展开目录"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* 展开状态的目录面板：整体滑入/滑出；关闭按钮在面板右侧“外面” */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            key="toc-panel-wrapper"
            className="hidden lg:block fixed z-40 will-change-transform"
            style={{
              left: `${tocPosition.left}px`,
              top: '35vh',
              transform: 'translateY(-50%)',
            }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: DURATION, ease: EASE }}
          >
            {/* 面板主体 */}
            <div
              className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: 'calc(50vh - 60px)', // 半高
              }}
            >
              <div className="flex items-center justify-start p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-800/80 border-b border-gray-200 dark:border-slate-700 relative">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  目录
                </h3>
              </div>
              <div
                className="p-2 overflow-y-auto w-72 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
                style={{
                  maxHeight: 'calc(50vh - 120px)',
                }}
              >
                {tocItems.length > 0 ? (
                  <div className="space-y-0.5">
                    {tocItems.map(item => renderTOCItem(item, highlightedElement))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                    暂无目录内容
                  </p>
                )}
              </div>
            </div>

            {/* 关闭按钮：在目录面板右侧"外侧"，垂直居中 */}
            <motion.button
              key="toc-close"
              onClick={() => setIsCollapsed(true)}
              className="absolute top-1/2 -translate-y-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700 shadow-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-200 py-3 px-1 rounded-r-lg"
              style={{
                left: '100%',        // 紧贴面板右边缘之外
                marginLeft: '0px',   // 紧贴右边缘，不留间距
              }}
              title="收起目录"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              {/* 使用 ChevronRight 旋转 180° 作为"向左收起"的视觉 */}
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 transform rotate-180" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
