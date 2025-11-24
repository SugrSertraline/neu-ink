'use client';

import React, { useState, useEffect, useRef } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import katex from 'katex';

interface AttachmentPreviewProps {
  children: React.ReactNode;
  attachmentUrl: string;
  attachmentType: 'markdown' | 'pdf';
  paperId: string;
  userPaperId?: string | null;
  isAdmin?: boolean;
  isPersonalOwner?: boolean;
  className?: string;
}

// Markdown渲染组件
function MarkdownRenderer({ content }: { content: string }) {
  const [processedContent, setProcessedContent] = useState<string>('');

  

  useEffect(() => {
    let processed = content;
    
    // 处理数学公式（KaTeX）
    // 先处理行间公式（$$...$$），避免与行内公式冲突
    // 改进正则表达式，支持多行公式和包含特殊字符的公式
    processed = processed.replace(/\$\$\s*([^$]+?)\s*\$\$/g, (match, formula) => {
      try {
        const cleanedFormula = formula.replace(/\n/g, '').trim();
        const html = katex.renderToString(cleanedFormula, {
          displayMode: true,
          throwOnError: false,
          trust: true,
          strict: 'ignore',
          output: 'html',
        });
        return `<div class="math-display my-3 text-center">${html}</div>`;
      } catch {
        const cleanedFormula = formula.replace(/\n/g, '').trim();
        return `<div class="math-display my-3 text-center"><code class="bg-red-100 text-red-600 px-2 py-1 rounded">${cleanedFormula}</code></div>`;
      }
    });

    // 再处理行内公式（$...$），使用更精确的正则表达式避免匹配行间公式
    processed = processed.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (match, formula) => {
      try {
        const cleanedFormula = formula.trim();
        const html = katex.renderToString(cleanedFormula, {
          displayMode: false,
          throwOnError: false,
          trust: true,
          strict: 'ignore',
          output: 'html',
        });
        return `<span class="math-inline">${html}</span>`;
      } catch {
        return `<code class="bg-red-100 text-red-600 px-1 py-0.5 rounded text-sm">${formula.trim()}</code>`;
      }
    });

    // 处理标题
    processed = processed.replace(/^### (.*$)/gim, '<h3 className="text-lg font-semibold mt-4 mb-2">$1</h3>');
    processed = processed.replace(/^## (.*$)/gim, '<h2 className="text-xl font-semibold mt-4 mb-2">$1</h2>');
    processed = processed.replace(/^# (.*$)/gim, '<h1 className="text-2xl font-bold mt-4 mb-2">$1</h1>');

    // 处理粗体
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 处理斜体
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 处理代码块
    processed = processed.replace(/```([^`]+)```/g, '<pre class="bg-gray-100 p-3 rounded mt-3 mb-3 overflow-x-auto"><code>$1</code></pre>');

    // 处理行内代码
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">$1</code>');

    // 处理链接
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">$1</a>');

    // 处理表格
    const lines = processed.split('\n');
    const processedLines: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检查是否是表格行
      if (line.match(/^\|.*\|$/)) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        
        // 跳过分隔行（包含---的行）
        if (line.includes('---')) {
          continue;
        }
        
        const cells = line.split('|').filter(cell => cell.trim() !== '');
        const cellClass = 'border border-gray-300 px-3 py-2 text-sm';
        
        const rowHtml = cells.map(cell => `<td class="${cellClass}">${cell.trim()}</td>`).join('');
        tableRows.push(`<tr>${rowHtml}</tr>`);
      } else {
        // 非表格行
        if (inTable) {
          inTable = false;
          const tableHtml = `<div class="overflow-x-auto my-4"><table class="min-w-full border border-gray-300">${tableRows.join('')}</table></div>`;
          processedLines.push(tableHtml);
          tableRows = [];
        }
        processedLines.push(lines[i]);
      }
    }
    
    // 处理表格结束
    if (inTable && tableRows.length > 0) {
      const tableHtml = `<div class="overflow-x-auto my-4"><table class="min-w-full border border-gray-300">${tableRows.join('')}</table></div>`;
      processedLines.push(tableHtml);
    }
    
    processed = processedLines.join('\n');

    // 处理列表 - 更精确的处理
    const listLines = processed.split('\n');
    const finalLines: string[] = [];
    let inUnorderedList = false;
    let inOrderedList = false;
    let unorderedItems: string[] = [];
    let orderedItems: string[] = [];
    
    for (const line of listLines) {
      const trimmedLine = line.trim();
      
      // 检查无序列表项
      if (trimmedLine.match(/^\* (.+)$/)) {
        if (!inUnorderedList) {
          inUnorderedList = true;
          // 如果之前在有序列表中，先关闭它
          if (inOrderedList && orderedItems.length > 0) {
            finalLines.push(`<ul class="list-disc mb-3 ml-4">${orderedItems.join('')}</ul>`);
            orderedItems = [];
            inOrderedList = false;
          }
        }
        const itemContent = trimmedLine.replace(/^\* (.+)$/, '$1');
        unorderedItems.push(`<li class="mb-1">${itemContent}</li>`);
      }
      // 检查有序列表项
      else if (trimmedLine.match(/^\d+\. (.+)$/)) {
        if (!inOrderedList) {
          inOrderedList = true;
          // 如果之前在无序列表中，先关闭它
          if (inUnorderedList && unorderedItems.length > 0) {
            finalLines.push(`<ul class="list-disc mb-3 ml-4">${unorderedItems.join('')}</ul>`);
            unorderedItems = [];
            inUnorderedList = false;
          }
        }
        const itemContent = trimmedLine.replace(/^\d+\. (.+)$/, '$1');
        orderedItems.push(`<li class="mb-1">${itemContent}</li>`);
      }
      // 不是列表项
      else {
        // 关闭任何打开的列表
        if (inUnorderedList && unorderedItems.length > 0) {
          finalLines.push(`<ul class="list-disc mb-3 ml-4">${unorderedItems.join('')}</ul>`);
          unorderedItems = [];
          inUnorderedList = false;
        }
        if (inOrderedList && orderedItems.length > 0) {
          finalLines.push(`<ol class="list-decimal mb-3 ml-4">${orderedItems.join('')}</ol>`);
          orderedItems = [];
          inOrderedList = false;
        }
        finalLines.push(line);
      }
    }
    
    // 确保关闭任何打开的列表
    if (inUnorderedList && unorderedItems.length > 0) {
      finalLines.push(`<ul class="list-disc mb-3 ml-4">${unorderedItems.join('')}</ul>`);
    }
    if (inOrderedList && orderedItems.length > 0) {
      finalLines.push(`<ol class="list-decimal mb-3 ml-4">${orderedItems.join('')}</ol>`);
    }
    
    processed = finalLines.join('\n');

    // 处理段落 - 更精确的处理
    const paragraphs = processed.split('\n\n');
    const finalParagraphs: string[] = [];
    
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (trimmed === '') {
        continue;
      }
      
      // 如果已经是HTML标签，不添加段落标签
      if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<table') ||
          trimmed.startsWith('<ul') || trimmed.startsWith('<ol') || trimmed.startsWith('<div class="math-display') ||
          trimmed.startsWith('<li>')) {
        finalParagraphs.push(trimmed);
      } else {
        // 检查是否包含单行的HTML元素
        const lines = trimmed.split('\n');
        const hasHtmlElements = lines.some(line =>
          line.trim().startsWith('<h') ||
          line.trim().startsWith('<pre') ||
          line.trim().startsWith('<table') ||
          line.trim().startsWith('<ul') ||
          line.trim().startsWith('<ol') ||
          line.trim().startsWith('<div') ||
          line.trim().startsWith('<li>')
        );
        
        if (hasHtmlElements) {
          finalParagraphs.push(trimmed);
        } else {
          finalParagraphs.push(`<p class="mb-3 text-gray-700 leading-relaxed">${trimmed}</p>`);
        }
      }
    }
    
    processed = finalParagraphs.join('\n');

    setProcessedContent(processed);
  }, [content]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <div
        className="markdown-content text-gray-700 dark:text-gray-300 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:ml-4 [&_ol]:mb-3 [&_ol]:ml-4 [&_li]:mb-1 [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:bg-gray-50 [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_a]:text-blue-600 [&_a]:hover:underline [&_strong]:font-semibold [&_em]:italic"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}

// PDF预览组件
function PDFPreview({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
        <FileText className="h-12 w-12 text-gray-400" />
      </div>
      <p className="text-sm text-gray-600 text-center">
        PDF文档预览不可用，请点击下载按钮查看完整内容
      </p>
    </div>
  );
}

export default function AttachmentPreview({
  children,
  attachmentUrl,
  attachmentType,
  paperId,
  userPaperId,
  isAdmin = false,
  isPersonalOwner = false,
  className
}: AttachmentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 获取附件内容
  const fetchAttachmentContent = async () => {
    if (!attachmentUrl || content) return; // 如果已经有内容，不再重复获取

    setIsLoading(true);
    setError(null);

    try {
      if (attachmentType === 'markdown') {
        // 使用服务方法获取markdown内容
        const { adminPaperService, userPaperService } = await import('@/lib/services/paper');
        
        let result;
        if (isAdmin) {
          result = await adminPaperService.getAdminPaperMarkdownContent(paperId);
        } else if (userPaperId) {
          result = await userPaperService.getUserPaperMarkdownContent(userPaperId);
        } else {
          throw new Error('缺少必要的ID参数');
        }
        
        if (result.bizCode !== 0) {
          throw new Error(result.bizMessage || '获取markdown内容失败');
        }
        
        // 解码base64内容
        const markdownContent = atob(result.data.markdownContent);
        setContent(markdownContent);
      } else {
        // PDF文件不获取内容，只显示预览
        setContent('');
      }
    } catch (err) {
      console.error('获取附件内容失败:', err);
      setError(err instanceof Error ? err.message : '获取附件内容失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 当hover card打开时获取内容
  useEffect(() => {
    if (isOpen) {
      fetchAttachmentContent();
    }
  }, [isOpen, attachmentUrl, attachmentType]);

  // 处理下载
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachmentUrl;
    link.download = attachmentUrl.split('/').pop() || `attachment.${attachmentType}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={setIsOpen}
      delayOpen={300}
      delayClose={100}
      openDelay={300}
    >
      <HoverCardTrigger asChild>
        <div className={cn("cursor-pointer", className)}>
          {children}
        </div>
      </HoverCardTrigger>
      <AnimatePresence mode="wait">
        {isOpen && (
          <HoverCardContent
            side="top"
            align="start"
            className="w-96 p-0 overflow-hidden"
            asChild
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8
                }
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: -10,
                transition: {
                  duration: 0.2,
                  ease: "easeInOut"
                }
              }}
              className={cn(
                'w-96 rounded-2xl border border-white/20 bg-white/95 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.16)] dark:bg-white/10 dark:border-white/10',
                'overflow-hidden'
              )}
            >
              {/* 标题栏 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 bg-gray-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {attachmentType === 'markdown' ? 'Markdown 预览' : 'PDF 文档'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>

              {/* 内容区域 */}
              <div
                ref={contentRef}
                className="max-h-80 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                    <span className="text-sm text-gray-600">加载中...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-red-600 mb-2">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="text-xs"
                    >
                      下载文件
                    </Button>
                  </div>
                ) : attachmentType === 'markdown' && content ? (
                  <MarkdownRenderer content={content} />
                ) : attachmentType === 'pdf' ? (
                  <PDFPreview url={attachmentUrl} />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600">暂无预览内容</p>
                  </div>
                )}
              </div>
            </motion.div>
          </HoverCardContent>
        )}
      </AnimatePresence>
    </HoverCard>
  );
}