'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Upload, FileText, File, Trash2, Copy, X, Maximize2 } from 'lucide-react';
import { userPaperService, adminPaperService } from '@/lib/services/paper';
import type { PaperAttachments } from '@/types/paper/models';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ✅ 用于只读 Markdown 渲染
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Image from 'next/image';

// ✅ 模块级缓存：Markdown 内容 & 滚动位置
const markdownCache = new Map<string, string>();        // url -> markdown text
const markdownScrollCache = new Map<string, number>();  // url -> scrollTop

interface PaperAttachmentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  paperId: string;
  userPaperId: string | null;
  isPersonalOwner: boolean;
  isAdmin?: boolean;
  attachments: PaperAttachments;
  onAttachmentsChange: (attachments: PaperAttachments) => void;
  onSaveToServer: (data?: any) => Promise<void>;
}

export function PaperAttachmentsDrawer({
  isOpen,
  onClose,
  paperId,
  userPaperId,
  isPersonalOwner,
  isAdmin = false,
  attachments,
  onAttachmentsChange,
  onSaveToServer,
}: PaperAttachmentsDrawerProps) {
  const [isUploading, setIsUploading] = useState(false);

  // ===== PDF解析相关状态 =====
  const [isParsing, setIsParsing] = useState(false);
  const [parsingTaskId, setParsingTaskId] = useState<string | null>(null);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingMessage, setParsingMessage] = useState<string>('');
  const [parsingStatus, setParsingStatus] = useState<string>('');

  // ===== Markdown 预览相关状态 =====
  const [mdContent, setMdContent] = useState<string | null>(null);
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState<string | null>(null);

  // ✅ Markdown 滚动容器 ref
  const markdownScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // ✅ 自定义图片组件 - 显示灰色占位符而不是实际图片
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

  // ===== 全屏模式状态 =====
  const [fullscreenMode, setFullscreenMode] = useState<'none' | 'pdf' | 'markdown'>('none');

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

  // ===== PDF解析相关函数 =====
  const handleParsePdfToMarkdown = async () => {
    if (!attachments.pdf?.url) {
      toast.error('没有找到PDF文件，无法解析');
      return;
    }

    if (attachments.markdown) {
      toast.error('已有Markdown文件，无需重复解析');
      return;
    }

    setIsParsing(true);
    setParsingProgress(0);
    setParsingMessage('正在提交PDF解析任务...');

    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.parsePdfToMarkdown(userPaperId, false);
      } else {
        result = await adminPaperService.parsePdfToMarkdown(paperId, false);
      }

      if (result.bizCode === 0) {
        setParsingTaskId(result.data.taskId);
        setParsingMessage('PDF解析任务已提交，请点击"查看解析进度"按钮获取最新状态');
        toast.success('PDF解析任务已提交，请点击"查看解析进度"按钮获取最新状态');
      } else {
        setIsParsing(false);
        toast.error(result.bizMessage || 'PDF解析任务提交失败');
      }
    } catch (error) {
      console.error('PDF解析任务提交异常:', error);
      setIsParsing(false);
      toast.error('PDF解析任务提交失败，请检查网络连接');
    }
  };

  // 手动查看解析进度
  const handleCheckParsingProgress = async () => {
    if (!parsingTaskId) {
      // 如果没有任务ID，先尝试获取最新的任务
      try {
        let tasksResult;
        if (isPersonalOwner && userPaperId) {
          tasksResult = await userPaperService.getPdfParseTasks(userPaperId);
        } else {
          tasksResult = await adminPaperService.getPdfParseTasks(paperId);
        }

        if (tasksResult.bizCode === 0 && tasksResult.data.tasks) {
          const latestTask = tasksResult.data.tasks[0];
          if (latestTask) {
            setParsingTaskId(latestTask.taskId);
            setParsingStatus(latestTask.status);
            setParsingProgress(latestTask.progress || 0);
            setParsingMessage(latestTask.message || '获取任务状态中...');
            setIsParsing(true);

            // 显示后端返回的消息
            if (latestTask.message) {
              toast.info(latestTask.message);
            }
          } else {
            toast.error('没有找到解析任务');
            return;
          }
        } else {
          toast.error(tasksResult.bizMessage || '获取解析任务列表失败');
          return;
        }
      } catch (error) {
        console.error('获取解析任务列表失败:', error);
        toast.error('获取解析任务列表失败');
        return;
      }
    }

    // 查询任务状态
    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.getPdfParseTaskStatus(userPaperId, parsingTaskId!);
      } else {
        result = await adminPaperService.getPdfParseTaskStatus(paperId, parsingTaskId!);
      }

      if (result.bizCode === 0) {
        const taskData = result.data;
        setParsingStatus(taskData.status);
        setParsingProgress(taskData.progress);
        setParsingMessage(taskData.message);

        // 显示后端返回的消息
        if (taskData.message) {
          toast.info(taskData.message);
        }

        if (taskData.status === 'completed') {
          setIsParsing(false);
          toast.success('PDF解析完成，Markdown文件已生成');

          if (taskData.markdownAttachment) {
            onAttachmentsChange({
              ...attachments,
              markdown: taskData.markdownAttachment,
            });
          }

          setTimeout(() => {
            setParsingTaskId(null);
            setParsingProgress(0);
            setParsingMessage('');
            setParsingStatus('');
          }, 3000);
        } else if (taskData.status === 'failed') {
          setIsParsing(false);
          toast.error(`PDF解析失败: ${taskData.message}`);

          setTimeout(() => {
            setParsingTaskId(null);
            setParsingProgress(0);
            setParsingMessage('');
            setParsingStatus('');
          }, 3000);
        }
      } else {
        toast.error(result.bizMessage || '获取解析状态失败');
      }
    } catch (error) {
      console.error('查询解析进度异常:', error);
      toast.error('查询解析进度失败，请检查网络连接');
    }
  };

  // 检查是否有进行中的解析任务
  useEffect(() => {
    if (attachments.markdown || isParsing) return;

    const checkExistingTasks = async () => {
      try {
        let tasksResult;
        if (isPersonalOwner && userPaperId) {
          tasksResult = await userPaperService.getPdfParseTasks(userPaperId);
        } else {
          tasksResult = await adminPaperService.getPdfParseTasks(paperId);
        }

        if (tasksResult.bizCode === 0 && tasksResult.data.tasks) {
          const existingTask = tasksResult.data.tasks.find(
            (task: any) => task.status === 'pending' || task.status === 'processing',
          );

          if (existingTask) {
            setParsingTaskId(existingTask.taskId);
            setParsingStatus(existingTask.status);
            setParsingProgress(existingTask.progress || 0);
            setParsingMessage(existingTask.message || '检测到进行中的PDF解析任务');
            setIsParsing(true);
            toast.success('检测到进行中的PDF解析任务，可点击"查看解析进度"按钮获取最新状态');
          }
        }
      } catch (error) {
        console.error('检查现有解析任务失败:', error);
      }
    };

    checkExistingTasks();
  }, [paperId, userPaperId, isPersonalOwner, attachments.markdown, isParsing]);

  // ===== Markdown 内容加载 & 缓存 =====
  useEffect(() => {
    const url = attachments.markdown?.url;

    if (!url) {
      // 真正没有 markdown 了才清掉
      setMdContent(null);
      setMdLoading(false);
      setMdError(null);
      return;
    }

    // ✅ 先看缓存里有没有内容
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

        // ✅ 写入缓存
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
  }, [attachments.markdown?.url]);

  // ✅ Markdown 滚动位置恢复
  useEffect(() => {
    const url = attachments.markdown?.url;
    if (!url) return;
    if (!mdContent) return; // 没内容就不用恢复

    const savedScrollTop = markdownScrollCache.get(url);
    if (typeof savedScrollTop !== 'number') return;

    const el = markdownScrollContainerRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      if (markdownScrollContainerRef.current) {
        markdownScrollContainerRef.current.scrollTop = savedScrollTop;
      }
    });
  }, [attachments.markdown?.url, mdContent]);

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdfFile =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf') ||
      (file.type === '' && file.name.toLowerCase().endsWith('.pdf'));

    if (!isPdfFile) {
      toast.error('请选择PDF文件');
      return;
    }

    setIsUploading(true);
    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.uploadUserPaperPdf(userPaperId, file);
      } else {
        result = await adminPaperService.uploadAdminPaperPdf(paperId, file);
      }

      if (result.bizCode === 0) {
        onAttachmentsChange({
          ...attachments,
          pdf: {
            url: result.data.url,
            key: result.data.key,
            size: result.data.size,
            uploadedAt: result.data.uploadedAt,
          },
        });
        toast.success('PDF上传成功');
      } else {
        toast.error(result.bizMessage || 'PDF上传失败');
      }
    } catch (error) {
      console.error('PDF上传异常:', error);
      toast.error('PDF上传失败，请检查网络连接或文件格式');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleMarkdownUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isMarkdownFile =
      fileName.endsWith('.md') ||
      fileName.endsWith('.markdown') ||
      file.type === 'text/markdown' ||
      file.type === 'text/plain';

    if (!isMarkdownFile) {
      toast.error('请选择Markdown文件(.md或.markdown)');
      return;
    }

    setIsUploading(true);
    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.uploadUserPaperMarkdown(userPaperId, file);
      } else {
        result = await adminPaperService.uploadAdminPaperMarkdown(paperId, file);
      }

      if (result.bizCode === 0) {
        onAttachmentsChange({
          ...attachments,
          markdown: {
            url: result.data.url,
            key: result.data.key,
            size: result.data.size,
            uploadedAt: result.data.uploadedAt,
          },
        });
        toast.success('Markdown文件上传成功');
      } else {
        toast.error(result.bizMessage || 'Markdown文件上传失败');
      }
    } catch (error) {
      console.error('Markdown上传异常:', error);
      toast.error('Markdown文件上传失败，请检查网络连接或文件格式');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const handleRemovePdf = async () => {
    setIsUploading(true);
    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.deleteUserPaperAttachment(userPaperId, 'pdf');
      } else {
        result = await adminPaperService.deletePaperAttachment(paperId, 'pdf');
      }

      if (result.bizCode === 0) {
        onAttachmentsChange({
          ...attachments,
          pdf: undefined,
        });
        toast.success('PDF已移除');
      } else {
        toast.error(result.bizMessage || 'PDF删除失败');
      }
    } catch (error) {
      console.error('PDF删除失败:', error);
      toast.error('PDF删除失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveMarkdown = async () => {
    setIsUploading(true);
    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.deleteUserPaperAttachment(userPaperId, 'markdown');
      } else {
        result = await adminPaperService.deletePaperAttachment(paperId, 'markdown');
      }

      if (result.bizCode === 0) {
        onAttachmentsChange({
          ...attachments,
          markdown: undefined,
        });
        toast.success('Markdown文件已移除');
      } else {
        toast.error(result.bizMessage || 'Markdown删除失败');
      }
    } catch (error) {
      console.error('Markdown删除失败:', error);
      toast.error('Markdown删除失败');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Drawer
      open={isOpen}
      direction="right"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      handleOnly={false}
      shouldScaleBackground={false}
      
    >
      <DrawerContent
        forceMount
        data-vaul-no-drag
        className={cn(
          'h-screen w-[85vw] max-w-none min-w-[1400px] flex flex-col',
          'data-[vaul-drawer-direction=right]:w-[85vw] data-[vaul-drawer-direction=right]:min-w-[1400px] data-[vaul-drawer-direction=right]:max-w-none',
          'border-l border-white/60 bg-white/80 backdrop-blur-3xl shadow-[0_20px_54px_rgba(15,23,42,0.18)]',
        )}
      >
        {/* 隐藏上传 input */}
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          disabled={isUploading}
          className="hidden"
          id="pdf-upload"
        />
        <input
          type="file"
          accept=".md,.markdown"
          onChange={handleMarkdownUpload}
          disabled={isUploading}
          className="hidden"
          id="markdown-upload"
        />

        <DrawerHeader className="pb-4 shrink-0 flex flex-row items-center justify-between px-6 border-b border-white/60 bg白/70 backdrop-blur-3xl">
          <DrawerTitle className="text-base font-semibold text-[#1F2937] tracking-tight">
            论文附件 - 左右分屏查看
          </DrawerTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              'h-8 w-8 p-0 rounded-full border border-white/65',
              'bg-white/85 hover:bg-white/95 text-[#28418A]',
              'shadow-[0_10px_26px_rgba(15,23,42,0.22)]',
              'transition-all duration-200 hover:-translate-y-px',
            )}
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        {/* 主内容区域：左右分栏 */}
        <div className="flex-1 flex overflow-hidden px-6 py-5 gap-4">
          {/* 左侧：PDF 区域 */}
          <div
            className={cn(
              'flex flex-col overflow-hidden transition-all duration-300',
              fullscreenMode === 'markdown'
                ? 'w-0 opacity-0'
                : fullscreenMode === 'pdf'
                ? 'w-full'
                : 'w-1/2',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    'bg-linear-to-br from-[#28418A]/20 to-[#1F3469]/20',
                    'border border-[#28418A]/30',
                  )}
                >
                  <File className="h-4 w-4 text-[#28418A]" />
                </div>
                <h3 className="text-sm font-semibold text-[#1F2937]">PDF 文档</h3>
              </div>
              <div className="flex gap-2">
                {attachments.pdf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFullscreenMode(fullscreenMode === 'pdf' ? 'none' : 'pdf')
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium',
                      'border border-white/65 bg-white/85 text-[#28418A]',
                      'hover:bg-white/95 hover:text-[#1F2937]',
                      'shadow-[0_10px_24px_rgba(148,163,184,0.35)]',
                      'transition-all duration-200',
                    )}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    {fullscreenMode === 'pdf' ? '还原' : '全屏'}
                  </Button>
                )}
                {(isPersonalOwner || isAdmin) && attachments.pdf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePdf}
                    disabled={isUploading || isParsing}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium',
                      'border border-[#FECACA] bg-[#FDF2F2]/90 text-[#B91C1C]',
                      'hover:bg-[#FEE2E2] hover:text-[#991B1B]',
                      'shadow-[0_10px_26px_rgba(248,113,113,0.30)]',
                      'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                    title={isParsing ? 'PDF正在解析中，无法删除' : ''}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                )}
              </div>
            </div>

            {attachments.pdf ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border border-white/70 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-2xl flex-1 flex flex-col min-h-0 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                  {attachments.pdf.url ? (
                    <div className="flex-1 overflow-hidden min-h-0">
                      <iframe
                        src={attachments.pdf.url}
                        title="PDF预览"
                        className="w-full h-full border-0"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      无法加载PDF，请检查文件链接
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 text-center mt-2">
                  {formatFileSize(attachments.pdf.size)} ·{' '}
                  {new Date(attachments.pdf.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-white/70 rounded-2xl bg-white/60 backdrop-blur-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/80 border border-white/70 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
                    <File className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">尚未上传PDF文档</p>
                  {isPersonalOwner || isAdmin ? (
                    <Button
                      disabled={isUploading || isParsing}
                      onClick={() => {
                        const fileInput = document.getElementById(
                          'pdf-upload',
                        ) as HTMLInputElement | null;
                        fileInput?.click();
                      }}
                      className={cn(
                        'inline-flex items-center justify-center gap-2',
                        'h-9 rounded-xl px-4 text-sm font-medium',
                        'border border-white/55 bg-linear-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92',
                        'text-white shadow-[0_14px_32px_rgba(40,65,138,0.35)]',
                        'hover:shadow-[0_18px_40px_rgba(40,65,138,0.45)] hover:-translate-y-px',
                        'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                      )}
                      title={isParsing ? 'PDF正在解析中，请等待解析完成后再上传新文件' : ''}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? '上传中...' : isParsing ? 'PDF解析中...' : '上传PDF'}
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-500">您没有上传权限</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 中间分隔线 */}
          {fullscreenMode === 'none' && (
            <div className="w-px bg-linear-to-b from-transparent via-slate-300/50 to-transparent" />
          )}

          {/* 右侧：Markdown 区域 */}
          <div
            className={cn(
              'flex flex-col overflow-hidden transition-all duration-300',
              fullscreenMode === 'pdf'
                ? 'w-0 opacity-0'
                : fullscreenMode === 'markdown'
                ? 'w-full'
                : 'w-1/2',
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    'bg-linear-to-br from-[#3050A5]/20 to-[#1F3469]/20',
                    'border border-[#3050A5]/30',
                  )}
                >
                  <FileText className="h-4 w-4 text-[#3050A5]" />
                </div>
                <h3 className="text-sm font-semibold text-[#1F2937]">Markdown 文档</h3>
              </div>
              <div className="flex gap-2">
                {attachments.markdown && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFullscreenMode(fullscreenMode === 'markdown' ? 'none' : 'markdown')
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium',
                        'border border-white/65 bg-white/85 text-[#28418A]',
                        'hover:bg-white/95 hover:text-[#1F2937]',
                        'shadow-[0_10px_24px_rgba(148,163,184,0.35)]',
                        'transition-all duration-200',
                      )}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      {fullscreenMode === 'markdown' ? '还原' : '全屏'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMarkdown}
                      disabled={!mdContent}
                      className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium',
                        'border border-white/65 bg-white/85 text-[#28418A]',
                        'hover:bg-white/95 hover:text-[#1F2937]',
                        'shadow-[0_10px_24px_rgba(148,163,184,0.35)]',
                        'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                      )}
                    >
                      <Copy className="h-4 w-4" />
                      复制源码
                    </Button>
                  </>
                )}
                {(isPersonalOwner || isAdmin) && attachments.markdown && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveMarkdown}
                    disabled={isUploading || isParsing}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium',
                      'border border-[#FECACA] bg-[#FDF2F2]/90 text-[#B91C1C]',
                      'hover:bg-[#FEE2E2] hover:text-[#991B1B]',
                      'shadow-[0_10px_26px_rgba(248,113,113,0.30)]',
                      'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                    title={isParsing ? 'PDF正在解析中，无法删除Markdown' : ''}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                )}
              </div>
            </div>

            {attachments.markdown ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border border-white/70 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-2xl flex-1 flex flex-col min-h-0 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                  {attachments.markdown.url ? (
                    <div
                      ref={markdownScrollContainerRef}
                      className="flex-1 overflow-y-auto min-h-0"
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
                        <div className="prose prose-gray dark:prose-invert max-w-none p-6 select-text">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              img: CustomImage,
                              p: ({ children }) => <div className="mb-4">{children}</div>,
                              // 表格样式 - 支持rowspan和colspan
                                table: ({ children, ...props }) => (
                                  <div className="overflow-x-auto my-4">
                                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
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
                                      className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold"
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
                                      className="border border-gray-300 dark:border-gray-600 px-3 py-2"
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
                      无法加载Markdown，请检查文件链接
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 text-center mt-2">
                  {formatFileSize(attachments.markdown.size)} ·{' '}
                  {new Date(attachments.markdown.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-white/70 rounded-2xl bg-white/60 backdrop-blur-xl">
                <div className="text-center px-6 max-w-md">
                  <div className="w-16 h-16 bg-white/80 border border-white/70 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_14px_32px_rgba(15,23,42,0.12)]">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">尚未上传Markdown文档</p>

                  {/* PDF解析进度显示 */}
                  {isParsing && parsingTaskId && (
                    <div className="mb-4 p-4 bg-blue-50/90 border border-blue-200/80 rounded-xl backdrop-blur-sm">
                      <div className="flex items-center justify-center mb-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm text-blue-700 font-medium">
                          PDF解析任务已创建
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${parsingProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-blue-600 mb-2">{parsingMessage}</p>
                      <Button
                        onClick={handleCheckParsingProgress}
                        className={cn(
                          'inline-flex items-center justify-center gap-2 w-full',
                          'h-8 rounded-lg px-3 text-xs font-medium',
                          'border border-blue-300 bg-blue-100 text-blue-700',
                          'hover:bg-blue-200 hover:text-blue-800',
                          'transition-all duration-200',
                        )}
                      >
                        查看解析进度
                      </Button>
                    </div>
                  )}

                  {/* PDF解析按钮 */}
                  {(isPersonalOwner || isAdmin) &&
                    attachments.pdf &&
                    !attachments.markdown &&
                    !isParsing && (
                      <div className="mb-4">
                        <Button
                          onClick={handleParsePdfToMarkdown}
                          className={cn(
                            'inline-flex items-center justify-center gap-2',
                            'h-9 rounded-xl px-4 text-sm font-medium',
                            'border border-white/55 bg-linear-to-r from-[#10B981]/90 via-[#059669]/88 to-[#047857]/90',
                            'text-white shadow-[0_14px_32px_rgba(16,185,129,0.35)]',
                            'hover:shadow-[0_18px_40px_rgba(16,185,129,0.45)] hover:-translate-y-px',
                            'transition-all duration-200',
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          通过PDF解析生成Markdown
                        </Button>
                        <p className="text-xs text-slate-500 mt-2">
                          从左侧PDF自动提取文本内容
                        </p>
                      </div>
                    )}

                  {/* 检查解析进度按钮 */}
                  {!isParsing && (
                    <div className="mb-4">
                      <Button
                        onClick={handleCheckParsingProgress}
                        className={cn(
                          'inline-flex items-center justify-center gap-2',
                          'h-8 rounded-lg px-3 text-xs font-medium',
                          'border border-blue-300 bg-blue-50 text-blue-700',
                          'hover:bg-blue-100 hover:text-blue-800',
                          'transition-all duration-200',
                        )}
                      >
                        检查解析进度
                      </Button>
                    </div>
                  )}

                  {/* 普通上传按钮 */}
                  {isPersonalOwner || isAdmin ? (
                    <Button
                      disabled={isUploading || isParsing}
                      onClick={() => {
                        const fileInput = document.getElementById(
                          'markdown-upload',
                        ) as HTMLInputElement | null;
                        fileInput?.click();
                      }}
                      className={cn(
                        'inline-flex items-center justify-center gap-2',
                        'h-9 rounded-xl px-4 text-sm font-medium',
                        'border border-white/55 bg-linear-to-r from-[#3050A5]/90 via-[#28418A]/88 to-[#1F3469]/90',
                        'text-white shadow-[0_14px_32px_rgba(37,99,235,0.35)]',
                        'hover:shadow-[0_18px_40px_rgba(37,99,235,0.45)] hover:-translate-y-px',
                        'transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
                      )}
                      title={isParsing ? 'PDF正在解析中，请等待解析完成后再上传新文件' : ''}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? '上传中...' : isParsing ? 'PDF解析中...' : '上传Markdown'}
                    </Button>
                  ) : (
                    <p className="text-xs text-slate-500">您没有上传权限</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
