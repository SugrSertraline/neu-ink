'use client';

import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FileText, X, Maximize2, Copy, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { PaperAttachments } from '@/types/paper/models';

// 用于只读 Markdown 渲染
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// 模块级缓存：Markdown 内容 & 滚动位置
const markdownCache = new Map<string, string>();        // url -> markdown text
const markdownScrollCache = new Map<string, number>();  // url -> scrollTop

interface PaperFloatingViewerProps {
  attachments: PaperAttachments;
  isVisible: boolean;
  onClose: () => void;
}

type ViewerMode = 'markdown' | null;

// 动画参数
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DURATION = 0.28;

// 自定义图片组件 - 显示灰色占位符而不是实际图片
const CustomImage = ({ src, alt, ...props }: any) => {
  return (
    <span className="block my-4">
      <span className="flex items-center justify-center">
        <span className="bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg p-8 max-w-sm inline-block">
          <span className="flex flex-col items-center text-gray-500">
            <svg
              className="w-12 h-12 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm">图片</span>
            {alt && <span className="text-xs mt-1 text-center">{alt}</span>}
          </span>
        </span>
      </span>
    </span>
  );
};

export function PaperFloatingViewer({
  attachments,
  isVisible,
  onClose,
}: PaperFloatingViewerProps) {
  const [viewerMode, setViewerMode] = useState<ViewerMode>(null);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [mdContent, setMdContent] = useState<string | null>(null);
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);
  const [viewerPosition, setViewerPosition] = useState<{ right: number; top: number } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true); // 初始状态为折叠，始终显示打开按钮
  
  // Markdown 滚动容器 ref
  const markdownScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // 根据附件情况自动选择显示模式
  useEffect(() => {
    if (!isVisible) {
      // 不设置为null，保持组件状态
      setIsCollapsed(true); // 当不可见时，设置为折叠状态
      return;
    }

    if (attachments.markdown) {
      setViewerMode('markdown');
      // 不自动设置isCollapsed，让用户通过按钮控制
    }
  }, [attachments.markdown, isVisible]);

  // 计算悬浮位置 - 只计算一次，之后不随isVisible变化
  useLayoutEffect(() => {
    const compute = () => {
      const right = 20; // 距离右边缘20px
      
      // 获取头部高度变量，确保查看器不会与头部重叠
      const headerVar = getComputedStyle(document.documentElement).getPropertyValue('--app-header-h').trim();
      const headerHeight = parseFloat(headerVar || '160');
      const topOffset = headerHeight + 20; // 头部下方20px处开始
      
      setViewerPosition({ right, top: topOffset });
    };
    
    compute();
    
    const handleResize = () => compute();
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // 空依赖数组，只计算一次

  // Markdown 内容加载 & 缓存 - 只在附件URL变化时重新加载
  useEffect(() => {
    const url = attachments.markdown?.url;

    if (!url) {
      setMdContent(null);
      setMdLoading(false);
      setMdError(null);
      return;
    }

    // 先看缓存里有没有内容
    const cached = markdownCache.get(url);
    if (cached) {
      setMdContent(cached);
      setMdLoading(false);
      setMdError(null);
      return;
    }

    setMdLoading(true);
    setMdError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`请求失败: ${res.status} ${res.statusText}`);
        }
        const text = await res.text();

        // 写入缓存
        markdownCache.set(url, text);
        setMdContent(text);
      })
      .catch((err) => {
        console.error('加载 Markdown 内容失败:', err);
        setMdError('无法加载 Markdown 文件内容，请检查文件链接或网络。');
      })
      .finally(() => {
        setMdLoading(false);
      });
  }, [attachments.markdown?.url]); // 只依赖URL，不依赖viewerMode

  // Markdown 滚动位置恢复 - 在组件展开且内容加载完成时恢复
  useEffect(() => {
    const url = attachments.markdown?.url;
    if (!url || isCollapsed) return; // 改为检查isCollapsed而不是isVisible
    if (!mdContent) return; // 没内容就不用恢复

    const savedScrollTop = markdownScrollCache.get(url);
    if (typeof savedScrollTop !== 'number') return;

    const el = markdownScrollContainerRef.current;
    if (!el) return;

    // 使用setTimeout确保DOM已经更新
    setTimeout(() => {
      if (markdownScrollContainerRef.current) {
        markdownScrollContainerRef.current.scrollTop = savedScrollTop;
      }
    }, 100);
  }, [attachments.markdown?.url, mdContent, isCollapsed]); // 依赖isCollapsed而不是isVisible

  // 在组件关闭时保存滚动位置
  useEffect(() => {
    if (isCollapsed) {
      const url = attachments.markdown?.url;
      if (!url) return;
      
      const el = markdownScrollContainerRef.current;
      if (!el) return;
      
      // 保存当前滚动位置
      markdownScrollCache.set(url, el.scrollTop);
    }
  }, [isCollapsed, attachments.markdown?.url]);

  // 复制 Markdown 源代码
  const handleCopyMarkdown = async () => {
    if (!mdContent) return;

    try {
      await navigator.clipboard.writeText(mdContent);
      toast.success('Markdown 源代码已复制到剪贴板');
    } catch (err) {
      console.error('复制失败:', err);
      toast.error('复制失败，请手动选择文本复制');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!viewerPosition) return null;

  // 计算面板尺寸 - 固定高度
  const panelWidth = fullscreenMode ? '50vw' : '280px'; // 全屏模式下50%页面宽度
  const panelHeight = fullscreenMode ? 'calc(80vh - 100px)' : '40vh'; // 全屏模式下底部留100px距离

  // Markdown 文字基础字号（全局缩放用）
  const markdownBaseTextClass = fullscreenMode
    ? 'text-[12px] leading-relaxed'   // 全屏：稍微大一点
    : 'text-[10px] leading-tight';    // 非全屏：整体再缩小一档

  // 使用 Portal 将组件挂载到 body，实现悬浮效果
  // 参考目录的开关方式
  return createPortal(
    <React.Fragment>
      {/* 折叠状态触发按钮 */}
      <AnimatePresence initial={false}>
        {isCollapsed && (
          <motion.button
            key="viewer-collapsed-trigger"
            onClick={() => {
              if (attachments.markdown) {
                setViewerMode('markdown');
                setIsCollapsed(false);
              } else {
                // 显示提示信息
                toast.error('未配置markdown文件', {
                  duration: 3000,
                });
              }
            }}
            className="hidden lg:block fixed z-40 pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700 shadow-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-200 py-3 px-2 rounded-l-lg"
            style={{
              right: `${viewerPosition?.right || 20}px`,
              top: `${viewerPosition?.top || 180}px`,
              transform: 'scale(0.4)',
              transformOrigin: 'top right',
            }}
            title="展开Markdown查看器"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* 展开状态的查看器面板 */}
      <AnimatePresence>
        {!isCollapsed && viewerMode && (
          <motion.div
            key="viewer-panel-wrapper"
            className="hidden lg:block fixed z-50 will-change-transform"
            style={{
              right: `${viewerPosition?.right || 20}px`,
              top: `${viewerPosition?.top || 180}px`,
              transform: 'scale(0.4)',
              transformOrigin: 'top right',
            }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: DURATION, ease: EASE }}
          >
            <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                 style={{
                   width: panelWidth,
                   height: panelHeight,
                 }}>
              {/* 标题栏 */}
              <div className="flex items-center justify-between p-3 bg-linear-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-800/80 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Markdown 文档
                  </h3>
                </div>
               
                <div className="flex items-center gap-1">
                  
                  {/* 全屏按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFullscreenMode(!fullscreenMode)}
                    className="h-7 w-7 p-0 rounded"
                    title={fullscreenMode ? '退出全屏' : '全屏'}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                  
                  {/* 复制Markdown按钮 - 只有在Markdown模式下才显示 */}
                  {viewerMode === 'markdown' && mdContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      className="h-7 w-7 p-0 rounded"
                      title="复制Markdown源码"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  
                  {/* 关闭按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(true)}
                    className="h-7 w-7 p-0 rounded"
                    title="关闭"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              
              {/* 内容区域 */}
              <div className="flex-1 overflow-hidden">
                {attachments.markdown ? (
                  <div
                    ref={markdownScrollContainerRef}
                    className="w-full h-full overflow-y-auto overflow-x-hidden" // 禁止横向滚动
                    onScroll={(e) => {
                      const url = attachments.markdown?.url;
                      if (!url) return;
                      markdownScrollCache.set(url, e.currentTarget.scrollTop);
                    }}
                  >
                    {mdLoading && (
                      <div className="text-sm text-slate-500 flex items-center justify-center h-64">
                        正在加载 Markdown 内容...
                      </div>
                    )}

                    {mdError && (
                      <div className="text-sm text-red-500 flex items-center justify-center h-64 px-4">
                        {mdError}
                      </div>
                    )}

                    {!mdLoading && !mdError && mdContent && (
                      <div
                        className={cn(
                          'prose prose-xs prose-gray dark:prose-invert max-w-full p-3 select-text',
                          markdownBaseTextClass
                        )}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            img: CustomImage,
                            p: ({ children }) => <div className="mb-3">{children}</div>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-3">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-2">{children}</h3>,
                            ul: ({ children }) => <ul className="text-xs mb-2 ml-4">{children}</ul>,
                            ol: ({ children }) => <ol className="text-xs mb-2 ml-4">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            code: ({ className, children, ...props }: any) => {
                              const isInline = !className || !className.includes('language-');
                              return isInline
                                ? <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{children}</code>
                                : <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mb-2 overflow-x-auto wrap-break-word"><code>{children}</code></pre>;
                            },
                            blockquote: ({ children }) => <blockquote className="text-xs border-l-2 border-gray-300 dark:border-gray-600 pl-3 italic">{children}</blockquote>,
                            // 表格样式 - 支持rowspan和colspan
                            table: ({ children, ...props }) => (
                              <div className="overflow-x-auto my-3 w-full">
                                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs" {...props}>
                                  {children}
                                </table>
                              </div>
                            ),
                            thead: ({ children, ...props }) => <thead className="bg-gray-100 dark:bg-gray-800" {...props}>{children}</thead>,
                            tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
                            tr: ({ children, ...props }) => <tr className="border border-gray-300 dark:border-gray-600" {...props}>{children}</tr>,
                            th: ({ children, ...props }) => {
                              const { rowspan, colspan, ...thProps } = props as any;
                              return (
                                <th
                                  className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-semibold"
                                  rowSpan={rowspan}
                                  colSpan={colspan}
                                  {...thProps}
                                >
                                  {children}
                                </th>
                              );
                            },
                            td: ({ children, ...props }) => {
                              const { rowspan, colspan, ...tdProps } = props as any;
                              return (
                                <td
                                  className="border border-gray-300 dark:border-gray-600 px-2 py-1"
                                  rowSpan={rowspan}
                                  colSpan={colspan}
                                  {...tdProps}
                                >
                                  {children}
                                </td>
                              );
                            },
                          }}
                        >
                          {mdContent}
                        </ReactMarkdown>
                      </div>
                    )}

                    {!mdLoading && !mdError && !mdContent && (
                      <div className="text-sm text-slate-400 flex items-center justify-center h-64">
                        暂无内容可显示。
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    没有可用的Markdown文档
                  </div>
                )}
              </div>
              
              {/* 底部信息栏 */}
              {attachments.markdown && (
                <div className="text-[10px] text-slate-500 text-center p-2 border-t border-gray-200 dark:border-slate-700">
                  {formatFileSize(attachments.markdown.size)} ·{' '}
                  {new Date(attachments.markdown.uploadedAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* 关闭按钮：在查看器面板右侧"外侧" */}
            <motion.button
              key="viewer-close"
              onClick={() => setIsCollapsed(true)}
              className="absolute top-1/2 -translate-y-1/2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-gray-200 dark:border-slate-700 shadow-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-200 py-3 px-1 rounded-r-lg"
              style={{
                right: '-16px', // 调整位置以适应缩放
                top: '50%', // 垂直居中
                transform: 'translateY(-50%)', // 垂直居中
              }}
              title="收起Markdown查看器"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </React.Fragment>,
    document.body
  );
}