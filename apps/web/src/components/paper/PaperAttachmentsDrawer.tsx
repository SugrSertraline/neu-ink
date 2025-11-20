'use client';

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, File, Trash2 } from 'lucide-react';
import { userPaperService, adminPaperService } from '@/lib/services/paper';
import type { PaperAttachments } from '@/types/paper/models';
import { toast } from 'sonner';
import { Document, Page, pdfjs } from 'react-pdf';

// 配置 PDF.js worker - 使用更稳定的 CDN 和备用方案
if (typeof window !== 'undefined') {
  // 尝试使用 jsDelivr CDN，它在国内访问更稳定
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  
  console.log('PDF.js worker 配置:', pdfjs.GlobalWorkerOptions.workerSrc);
  
  // 如果加载失败，提供备用方案
  const script = document.createElement('script');
  script.src = pdfjs.GlobalWorkerOptions.workerSrc;
  script.onerror = () => {
    console.warn('jsDelivr CDN 加载失败，尝试使用 unpkg CDN');
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
    console.log('PDF.js worker 备用配置:', pdfjs.GlobalWorkerOptions.workerSrc);
  };
  script.onload = () => {
    console.log('PDF.js worker 加载成功');
  };
  document.head.appendChild(script);
}

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

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 更宽松的PDF文件检查 - 检查文件扩展名和MIME类型
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
      console.log('开始上传PDF文件:', file.name, '大小:', file.size, '类型:', file.type);
      let result;
      if (isPersonalOwner && userPaperId) {
        console.log('使用用户论文服务上传PDF:', userPaperId);
        result = await userPaperService.uploadUserPaperPdf(userPaperId, file);
      } else {
        console.log('使用管理员论文服务上传PDF:', paperId);
        result = await adminPaperService.uploadAdminPaperPdf(paperId, file);
      }

      console.log('PDF上传结果:', result);

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
        console.error('PDF上传业务失败:', result.bizMessage);
        toast.error(result.bizMessage || 'PDF上传失败');
      }
    } catch (error) {
      console.error('PDF上传异常:', error);
      toast.error('PDF上传失败，请检查网络连接或文件格式');
    } finally {
      setIsUploading(false);
      // 清空 input 值，避免同一文件无法再次触发 onChange
      event.target.value = '';
    }
  };

  const handleMarkdownUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 更严格的Markdown文件检查
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
      console.log('开始上传Markdown文件:', file.name, '大小:', file.size, '类型:', file.type);
      let result;
      if (isPersonalOwner && userPaperId) {
        console.log('使用用户论文服务上传Markdown:', userPaperId);
        result = await userPaperService.uploadUserPaperMarkdown(userPaperId, file);
      } else {
        console.log('使用管理员论文服务上传Markdown:', paperId);
        result = await adminPaperService.uploadAdminPaperMarkdown(paperId, file);
      }

      console.log('Markdown上传结果:', result);

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
        console.error('Markdown上传业务失败:', result.bizMessage);
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

  // PDF 相关状态
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0); // 0.5 ~ 3.0，用于缩放
  const isMountedRef = useRef(true);

  // 根据容器宽度计算 Page 的 width，从而让缩放真正变化视觉大小
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // 当抽屉打开时重置页数和缩放，并测量容器宽度
  useEffect(() => {
    if (isOpen) {
      setNumPages(null);
      setScale(1.0);
      if (pdfContainerRef.current) {
        setContainerWidth(pdfContainerRef.current.clientWidth);
      }
    }
  }, [isOpen]);

  // 监听窗口变化，更新容器宽度
  useEffect(() => {
    const handleResize = () => {
      if (pdfContainerRef.current) {
        setContainerWidth(pdfContainerRef.current.clientWidth);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // 组件卸载时标记
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      if (isMountedRef.current) {
        console.log('PDF加载成功，总页数:', numPages);
        setNumPages(numPages);
        toast.success(`PDF加载成功，共${numPages}页`);
      }
    },
    []
  );

  const onDocumentLoadError = useCallback(
    (error: any) => {
      console.error('PDF加载失败:', error);
      if (isMountedRef.current) {
        const errorMessage = error?.message || error?.toString() || '未知错误';
        console.error('PDF加载详细错误:', errorMessage);
        
        // 根据错误类型提供更具体的提示
        if (errorMessage.includes('Invalid PDF') || errorMessage.includes('Corrupted PDF')) {
          toast.error('PDF文件损坏或格式不正确，请重新上传');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          toast.error('网络连接失败，请检查网络后重试');
        } else if (errorMessage.includes('CORS') || errorMessage.includes('cross-origin')) {
          toast.error('PDF文件跨域访问受限，请联系管理员');
        } else {
          toast.error(`PDF加载失败: ${errorMessage}`);
        }
      }
    },
    []
  );

  // 使用 useMemo 缓存 PDF 选项，避免不必要的重新渲染
  const pdfOptions = useMemo(
    () => ({
      fontExtraProperties: false,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
      // 添加更多调试选项
      enableXfa: true,
      disableRange: false,
    }),
    []
  );

  // 处理缩放变化
  const handleZoomChange = useCallback(
    (newScale: number) => {
      if (!isMountedRef.current) return;
      const clamped = Math.min(3.0, Math.max(0.5, newScale));
      console.log('缩放比例:', clamped);
      setScale(clamped);
    },
    []
  );

  // 计算 Page 宽度：容器宽度 * scale
  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined; // 让 react-pdf 自己决定
    return containerWidth * scale * 0.98; // 略减一点避免贴边
  }, [containerWidth, scale]);

  return (
    <Drawer
      open={isOpen}
      direction="right"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DrawerContent className="h-screen w-[40vw] max-w-none min-w-[1200px]">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="text-lg font-semibold">论文附件</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4">
          {/* 统一放在顶层的隐藏 input，方便全局和各 Tab 共用 */}
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

          <Tabs defaultValue="pdf" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="pdf" className="flex items-center gap-2 text-sm">
                <File className="h-4 w-4" />
                PDF文档
              </TabsTrigger>
              <TabsTrigger value="markdown" className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Markdown文档
              </TabsTrigger>
            </TabsList>

            {/* PDF Tab */}
            <TabsContent value="pdf" className="mt-2 space-y-4">
              {attachments.pdf ? (
                <>
                  {(isPersonalOwner || isAdmin) && (
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePdf}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        disabled={isUploading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除PDF
                      </Button>
                    </div>
                  )}

                  {/* PDF 预览区域 */}
                  <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <div className="flex flex-col">
                      {/* PDF 内容区域：固定高度 + 滚动条，连续渲染所有页面 */}
                      <div
                        ref={pdfContainerRef}
                        className="flex-1 min-h-[500px] max-h-[550px] overflow-y-auto overflow-x-hidden p-4"
                      >
                        <Document
                          file={attachments.pdf.url}
                          onLoadSuccess={onDocumentLoadSuccess}
                          onLoadError={onDocumentLoadError}
                          loading={
                            <div className="flex flex-col justify-center items-center h-full gap-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <div className="text-sm text-gray-500">正在加载PDF文档...</div>
                              <div className="text-xs text-gray-400">请稍候，这可能需要几秒钟</div>
                            </div>
                          }
                          error={
                            <div className="flex flex-col justify-center items-center h-full gap-4">
                              <div className="text-red-500">
                                <File className="h-12 w-12" />
                              </div>
                              <div className="text-sm text-red-500 text-center">PDF加载失败，请检查文件是否完整</div>
                              <div className="text-xs text-gray-400 text-center max-w-md">
                                可能的原因：文件损坏、网络问题或格式不支持
                              </div>
                            </div>
                          }
                          options={pdfOptions}
                        >
                          {numPages
                            ? Array.from({ length: numPages }, (_, index) => (
                                <div
                                  key={`page_${index + 1}`}
                                  className="mb-4 flex justify-center last:mb-0"
                                >
                                  <Page
                                    pageNumber={index + 1}
                                    width={pageWidth}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    canvasBackground="#ffffff"
                                    className="shadow-lg"
                                    error={
                                      <div className="flex justify-center items-center p-4 border border-red-200 rounded min-h-[200px]">
                                        <div className="text-sm text-red-500">第 {index + 1} 页渲染失败</div>
                                      </div>
                                    }
                                    loading={
                                      <div className="flex justify-center items-center p-4 min-h-[200px]">
                                        <div className="flex flex-col items-center gap-2">
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                          <div className="text-sm text-gray-500">渲染第 {index + 1} 页...</div>
                                        </div>
                                      </div>
                                    }
                                    onRenderSuccess={() => {
                                      console.log(`第 ${index + 1} 页渲染成功`);
                                    }}
                                    onRenderError={(error) => {
                                      console.error(`第 ${index + 1} 页渲染失败:`, error);
                                    }}
                                  />
                                </div>
                              ))
                            : null}
                        </Document>
                      </div>

                      {/* PDF 缩放控制（仅保留缩放 + 文案提示为"连续滚动阅读"） */}
                      <div className="border-t bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between p-2">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            连续滚动阅读
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleZoomChange(scale - 0.25)}
                              disabled={scale <= 0.5}
                              title="缩小"
                            >
                              -
                            </Button>
                            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                              {Math.round(scale * 100)}%
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleZoomChange(scale + 0.25)}
                              disabled={scale >= 3.0}
                              title="放大"
                            >
                              +
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleZoomChange(1.0)}
                              disabled={scale === 1.0}
                            >
                              重置
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PDF 信息 */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {formatFileSize(attachments.pdf.size)} •{' '}
                    {new Date(attachments.pdf.uploadedAt).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <File className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    尚未上传PDF文档
                  </p>
                  {(isPersonalOwner || isAdmin) ? (
                    <Button
                      disabled={isUploading}
                      onClick={() => {
                        const fileInput = document.getElementById(
                          'pdf-upload'
                        ) as HTMLInputElement | null;
                        fileInput?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? '上传中...' : '上传PDF'}
                    </Button>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      您没有上传权限
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Markdown Tab */}
            <TabsContent value="markdown" className="mt-6 space-y-4">
              {attachments.markdown ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            Markdown文档
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatFileSize(attachments.markdown.size)} •{' '}
                            {new Date(
                              attachments.markdown.uploadedAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(attachments.markdown!.url, '_blank')
                          }
                          className="h-8 w-8 p-0"
                          title="预览"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {(isPersonalOwner || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveMarkdown}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    尚未上传Markdown文档
                  </p>
                  {(isPersonalOwner || isAdmin) ? (
                    <Button
                      disabled={isUploading}
                      onClick={() => {
                        const fileInput = document.getElementById(
                          'markdown-upload'
                        ) as HTMLInputElement | null;
                        fileInput?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? '上传中...' : '上传Markdown'}
                    </Button>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      您没有上传权限
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
