'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  File,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Download,
} from 'lucide-react';
import AttachmentPreview from './AttachmentPreview';
import { PdfBlockHoverCard } from './PdfBlockHoverCard';
import { userPaperService, adminPaperService } from '@/lib/services/paper';
import type { PaperAttachments } from '@/types/paper/models';
import type { PdfContentBlock, PdfAllBlock } from '@/types/paper/pdfBlocks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ===================== pdf.js 单例 =====================
let pdfjsLibSingleton: any | null = null;

const initPdfJs = async () => {
  if (!pdfjsLibSingleton) {
    const pdfjsLib: any = await import('pdfjs-dist/webpack.mjs');
    pdfjsLibSingleton = pdfjsLib;
  }
  return pdfjsLibSingleton;
};

// ===================== 类型定义 =====================
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
  onSectionAdded?: () => void; // 新增：章节添加后的回调
  onAddBlockAsSection?: (sectionData: { id: string; title: string; titleZh: string; content: any[] }) => void;
  onAddHeadingToSection?: (sectionId: string, position: 'start' | 'end', headingBlock: any) => void;
  onAddParagraphToSection?: (sectionId: string, position: 'start' | 'end', paragraphBlock: any) => void;
  onAddOrderedListToSection?: (sectionId: string, position: 'start' | 'end', orderedListBlock: any) => void;
  onAddUnorderedListToSection?: (sectionId: string, position: 'start' | 'end', unorderedListBlock: any) => void;
  onAddMathToSection?: (sectionId: string, position: 'start' | 'end', mathBlock: any) => void;
  onAddFigureToSection?: (sectionId: string, position: 'start' | 'end', figureBlock: any) => void;
  onAddTableToSection?: (sectionId: string, position: 'start' | 'end', tableBlock: any) => void;
  sections?: any[]; // 新增：章节列表
}

// content_list.json 的内容块（使用新的 PDF 块类型）
type ContentBlock = PdfAllBlock; // 使用 PdfAllBlock 以支持所有类型

interface PdfViewerProps {
  url: string;
  isVisible: boolean; // 控制是否渲染 PDF 内容（组件本身不卸载）
  userPaperId?: string | null;
  isAdmin?: boolean;
  isPersonalOwner?: boolean;
  paperId?: string; // 添加 paperId 参数

  // 来自 content_list.json 的块
  contentList?: ContentBlock[];
  // 新增：章节添加后的回调
  onSectionAdded?: () => void;
  onAddBlockAsSection?: (sectionData: { id: string; title: string; titleZh: string; content: any[] }) => void;
  onAddHeadingToSection?: (sectionId: string, position: 'start' | 'end', headingBlock: any) => void;
  onAddParagraphToSection?: (sectionId: string, position: 'start' | 'end', paragraphBlock: any) => void;
  onAddOrderedListToSection?: (sectionId: string, position: 'start' | 'end', orderedListBlock: any) => void;
  onAddUnorderedListToSection?: (sectionId: string, position: 'start' | 'end', unorderedListBlock: any) => void;
  onAddMathToSection?: (sectionId: string, position: 'start' | 'end', mathBlock: any) => void;
  onAddFigureToSection?: (sectionId: string, position: 'start' | 'end', figureBlock: any) => void;
  onAddTableToSection?: (sectionId: string, position: 'start' | 'end', tableBlock: any) => void;
  sections?: any[]; // 新增：章节列表
}

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

// ===================== 自定义 SidePanel（平替 Drawer，使用 portal） =====================
function SidePanel({ open, onClose, children, className }: SidePanelProps) {
  const [mounted, setMounted] = useState(false);

  // 只在浏览器环境渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 打开时锁定 body 滚动
  useEffect(() => {
    if (!mounted || !open) return;

    const body = document.body;
    const html = document.documentElement;

    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPaddingRight = body.style.paddingRight;

    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';

    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.paddingRight = prevBodyPaddingRight;
    };
  }, [open, mounted]);

  if (!mounted) return null;

  const panel = (
    <div
      className={cn(
        'fixed inset-0 z-999 flex justify-end',
        'transition-[visibility] duration-300',
        open ? 'visible' : 'invisible',
        !open && 'pointer-events-none',
      )}
    >
      {/* 背景遮罩 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 transition-opacity duration-300',
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* 右侧面板本体（已缩窄） */}
      <div
        className={cn(
          'relative h-full w-[56vw] max-w-[840px]',
          'bg-white/80 backdrop-blur-3xl border-l border-white/60',
          'shadow-[0_20px_54px_rgba(15,23,42,0.18)]',
          'transform transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
          'pointer-events-auto flex flex-col',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

// ===================== PdfViewer（增加 content_list caption 解析 & hover 高亮） =====================
function PdfViewer({
  url,
  isVisible,
  userPaperId,
  isAdmin = false,
  isPersonalOwner = false,
  contentList,
  paperId,
  onSectionAdded,
  onAddBlockAsSection,
  onAddHeadingToSection,
  onAddParagraphToSection,
  onAddOrderedListToSection,
  onAddUnorderedListToSection,
  onAddMathToSection,
  onAddFigureToSection,
  onAddTableToSection,
  sections = [],
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1); // 1 = fit width
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  const pdfDocRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // 每次完整重新渲染时，生成一批全新的 canvas，避免复用同一个 canvas
  const [renderKey, setRenderKey] = useState(0);

  // 管理所有 renderTask（用于 cancel）
  const renderTasksRef = useRef<any[]>([]);

  // 取消所有正在进行的渲染任务
  const cancelAllRenderTasks = useCallback(() => {
    renderTasksRef.current.forEach((task) => {
      try {
        task?.cancel?.();
      } catch {
        // ignore
      }
    });
    renderTasksRef.current = [];
  }, []);

  // 销毁当前 PDF 文档 / loadingTask
  const destroyPdf = useCallback(async () => {
    cancelAllRenderTasks();

    const loadingTask = loadingTaskRef.current;
    const pdfDoc = pdfDocRef.current;
    loadingTaskRef.current = null;
    pdfDocRef.current = null;
    setNumPages(0);

    try {
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        await loadingTask.destroy();
      } else if (pdfDoc && typeof pdfDoc.destroy === 'function') {
        await pdfDoc.destroy();
      }
    } catch {
      // 销毁过程异常忽略
    }
  }, [cancelAllRenderTasks]);

  // 组件总体生命周期
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelAllRenderTasks();
      destroyPdf().catch(() => { });
    };
  }, [cancelAllRenderTasks, destroyPdf]);

  // 加载 PDF 文档（url 变化时）
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      await destroyPdf();

      if (!url) {
        setIsLoading(false);
        setNumPages(0);
        return;
      }

      try {
        const pdfjsLib: any = await initPdfJs();

        // 检查是否是跨域URL，如果是则使用代理接口
        let pdfUrlToLoad = url;

        if (url.includes('image.neuwiki.top')) {
          // 这是跨域PDF，需要使用代理接口
          // 从URL中提取paperId（最后第二段路径）
          const urlParts = url.split('/');
          const paperIdFromUrl = urlParts[urlParts.length - 2];

          try {
            const { adminPaperService, userPaperService } = await import(
              '@/lib/services/paper'
            );
            let response;
            if (isPersonalOwner && userPaperId) {
              response =
                await userPaperService.getUserPaperPdfContent(userPaperId);
            } else {
              response =
                await adminPaperService.getAdminPaperPdfContent(paperIdFromUrl);
            }

            // 检查HTTP状态码
            if (response.topCode !== 200) {
              throw new Error(response.topMessage || '获取PDF内容失败');
            }

            const base64Data = (response.data as any)?.pdfContent;
            if (!base64Data) {
              throw new Error('PDF内容为空');
            }
            pdfUrlToLoad = `data:application/pdf;base64,${base64Data}`;
          } catch (proxyError: any) {
            console.error('代理获取PDF失败:', proxyError);
            throw new Error(
              `代理获取PDF失败: ${proxyError.message || proxyError}`,
            );
          }
        }

        const loadingTask = pdfjsLib.getDocument({ url: pdfUrlToLoad });
        loadingTaskRef.current = loadingTask;

        const pdfDoc = await loadingTask.promise;
        if (cancelled || !isMountedRef.current) {
          try {
            await loadingTask.destroy();
          } catch {
            // ignore
          }
          return;
        }

        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);

        // 新文档加载完成，触发一次全量重渲染（产生新的 canvas 批次）
        setRenderKey((k) => k + 1);
      } catch (e: any) {
        if (cancelled) return;
        console.error('加载 PDF 失败:', e);
        setError('PDF 加载失败，请稍后重试或下载查看');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, destroyPdf, isPersonalOwner, userPaperId, isAdmin]);

  // 渲染页面（注意：每次依赖 renderKey，会针对新一批 canvas 渲染）
  const renderPages = useCallback(async () => {
    if (!pdfDocRef.current || !containerRef.current || numPages === 0 || !isVisible)
      return;

    cancelAllRenderTasks();

    const pdfDoc = pdfDocRef.current;
    const containerWidth = containerRef.current.clientWidth || 800;

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      if (!isMountedRef.current || pdfDocRef.current !== pdfDoc) break;

      try {
        const page = await pdfDoc.getPage(pageNumber);

        // fit width
        const viewport = page.getViewport({ scale: 1 });
        const fitScale = containerWidth / viewport.width;

        // 结合 zoom
        const scale = fitScale * zoomRef.current;
        const scaledViewport = page.getViewport({ scale });

        const canvasId = `pdf-page-canvas-${renderKey}-${pageNumber}`;
        const canvas = document.getElementById(
          canvasId,
        ) as HTMLCanvasElement | null;

        if (!canvas) continue;
        const context = canvas.getContext('2d');
        if (!context) continue;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = scaledViewport.width * pixelRatio;
        canvas.height = scaledViewport.height * pixelRatio;
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;

        // 使用 setTransform 避免 transform 累积 / 反转
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, scaledViewport.width, scaledViewport.height);

        const renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        });

        renderTasksRef.current.push(renderTask);

        await renderTask.promise;
      } catch (e: any) {
        if (e?.name === 'RenderingCancelledException') {
          // 渲染被取消：正常情况（zoom 变化 / 销毁）
          return;
        }
        console.error(`渲染 PDF 页面失败（第 ${pageNumber} 页）:`, e);
      }
    }
  }, [numPages, isVisible, cancelAllRenderTasks, renderKey]);

  // zoom / numPages / isVisible 变化时触发一次新的“渲染批次”
  useEffect(() => {
    if (isVisible && numPages > 0) {
      setRenderKey((k) => k + 1);
    }
  }, [zoom, numPages, isVisible]);

  // 每次 renderKey 变更，针对这批 canvas 实际执行渲染
  useEffect(() => {
    if (isVisible && numPages > 0) {
      renderPages().catch((e) => console.error('渲染 PDF 页面失败:', e));
    }
  }, [renderPages, renderKey, isVisible, numPages]);

  // 容器宽度变化时，同样触发一次新的“渲染批次”
  useEffect(() => {
    if (!containerRef.current || !isVisible) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(() => {
      setRenderKey((k) => k + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isVisible]);

  const clampZoom = (z: number) => Math.min(3, Math.max(0.5, z));
  const zoomIn = () =>
    setZoom((z) => clampZoom(Number((z + 0.2).toFixed(2))));
  const zoomOut = () =>
    setZoom((z) => clampZoom(Number((z - 0.2).toFixed(2))));
  const zoomReset = () => setZoom(1);

  // ===== 新增：处理添加为section的功能 =====
  const handleAddAsSection = useCallback((sectionData: { id: string; title: string; titleZh: string; content: any[] }) => {
    if (!onAddBlockAsSection) {
      toast.error('添加章节功能不可用');
      return;
    }

    // 直接交给上层（page.tsx）处理：乐观更新 + 调后端
    onAddBlockAsSection(sectionData);
  }, [onAddBlockAsSection]);

  // ===== 新增：统一组装 caption / footnote / table_body 的 tooltip 文本 =====
  const getBlockTooltip = (block: ContentBlock): string => {
    const joinLines = (lines?: string[]) =>
      Array.isArray(lines) && lines.length ? lines.join(' ') : '';

    // 文字 / 公式：直接用 text
    if (block.type === 'text' || block.type === 'equation') {
      return (block.text || '').trim();
    }

    // 图片：caption + footnote
    if (block.type === 'image') {
      const caption = joinLines(block.image_caption);
      const footnote = joinLines(block.image_footnote);
      return [caption, footnote].filter(Boolean).join('\n');
    }

    // 表格：caption + footnote + table_body(转纯文本并截断)
    if (block.type === 'table') {
      const pieces: string[] = [];

      const caption = joinLines(block.table_caption);
      if (caption) pieces.push(caption);

      const footnote = joinLines(block.table_footnote);
      if (footnote) pieces.push(footnote);

      if (block.table_body) {
        // 粗暴把 HTML 表格转成一行文本，再截断
        const tableText = block.table_body
          .replace(/<\/tr>/gi, '\n') // 行结束换行
          .replace(/<br\s*\/?>/gi, '\n') // <br> 换行
          .replace(/<[^>]+>/g, ' ') // 去掉所有标签
          .replace(/\s+/g, ' ') // 合并空白
          .trim();

        if (tableText) {
          const maxLen = 200;
          pieces.push(
            tableText.length > maxLen
              ? tableText.slice(0, maxLen) + '…'
              : tableText,
          );
        }
      }

      return pieces.join('\n');
    }

    // 列表：处理 list 类型
    if (block.type === 'list') {
      const items = block.list_items || [];
      return items.join('\n');
    }

    return '';
  };

  // 不可见时保持挂载但不渲染内容
  if (!isVisible) {
    return <div className="hidden" />;
  }

  return (
    <div
      className="relative w-full h-full"
      style={{ height: '100%', maxHeight: '100%' }}
    >
      {/* Zoom 控制浮层 */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl bg-white/90 border border-slate-200 shadow-md px-1.5 py-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomOut}
          className="h-8 w-8"
          title="缩小"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="text-xs tabular-nums px-1 text-slate-700 w-[52px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomIn}
          className="h-8 w-8"
          title="放大"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomReset}
          className="h-8 w-8"
          title="重置/适配宽度"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'w-full h-full rounded-2xl border border-slate-100 bg-slate-50',
          'overflow-y-auto overflow-x-hidden shadow-[0_12px_30px_rgba(15,23,42,0.12)]',
          'px-3 py-3 pb-20 space-y-4',
          'scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100',
        )}
        style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxHeight: '100%',
        }}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500" />
              <span>正在加载 PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-sm text-slate-500 text-center">
            <p>{error}</p>
            <p className="mt-2">
              你可以
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline ml-1"
              >
                点击这里下载或在新标签页中打开
              </a>
              。
            </p>
          </div>
        )}

        {!isLoading && !error && numPages === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            未能读取到 PDF 内容
          </div>
        )}

        {/* 有 PDF 页时 + content_list hover 高亮 & caption 解析 */}
        {!isLoading &&
          !error &&
          numPages > 0 &&
          Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1; // pdf.js page = 1-based
            const pageIdx = pageNumber - 1; // content_list page_idx = 0-based
            const canvasId = `pdf-page-canvas-${renderKey}-${pageNumber}`;
            const key = `${renderKey}-${pageNumber}`;

            const pageBlocks: ContentBlock[] = (contentList ?? []).filter(
              (block) => block.page_idx === pageIdx,
            );

            return (
              <div
                key={key}
                className="relative bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 inline-block"
              >
                <canvas
                  id={canvasId}
                  className="block mx-auto"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />

                {/* overlay 容器：用百分比定位，随着 canvas 缩放 */}
                <div className="absolute inset-0 pointer-events-none">
                  {pageBlocks.map((block, i) => {
                    const [x0, y0, x1, y1] = block.bbox;
                    const left = (x0 / 1000) * 100;
                    const top = (y0 / 1000) * 100;
                    const width = ((x1 - x0) / 1000) * 100;
                    const height = ((y1 - y0) / 1000) * 100;

                    const isHeading =
                      (block as any).text_level !== undefined &&
                      typeof (block as any).text_level === 'number' &&
                      (block as any).text_level > 0;

                    const baseColor =
                      block.type === 'image'
                        ? 'bg-amber-300/25 border-amber-400/80 hover:bg-amber-400/30'
                        : block.type === 'table'
                          ? 'bg-emerald-300/25 border-emerald-400/80 hover:bg-emerald-400/30'
                          : block.type === 'equation'
                            ? 'bg-purple-300/25 border-purple-400/80 hover:bg-purple-400/30'
                            : block.type === 'list'
                              ? 'bg-orange-300/25 border-orange-400/80 hover:bg-orange-400/30'
                              : isHeading
                                ? 'bg-sky-300/25 border-sky-500/80 hover:bg-sky-400/30'
                                : 'bg-blue-300/15 border-blue-400/70 hover:bg-blue-400/25';

                    return (
                      <PdfBlockHoverCard
                        key={`${pageIdx}-${i}`}
                        block={block}
                        onAddAsSection={handleAddAsSection}
                        onAddHeadingToSection={onAddHeadingToSection}
                        onAddParagraphToSection={onAddParagraphToSection}
                        onAddOrderedListToSection={onAddOrderedListToSection}
                        onAddUnorderedListToSection={onAddUnorderedListToSection}
                        onAddMathToSection={onAddMathToSection}
                        onAddFigureToSection={onAddFigureToSection}
                        onAddTableToSection={onAddTableToSection}
                        paperId={paperId}
                        userPaperId={userPaperId}
                        isPersonalOwner={isPersonalOwner}
                        sections={sections}
                      >
                        <div
                          className={cn(
                            'absolute rounded-md border transition-colors duration-150',
                            'pointer-events-auto',
                            baseColor,
                          )}
                          style={{
                            left: `${left}%`,
                            top: `${top}%`,
                            width: `${width}%`,
                            height: `${height}%`,
                          }}
                        />
                      </PdfBlockHoverCard>
                    );

                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// 用 React.memo 包装，避免不必要重渲染
const MemoizedPdfViewer = React.memo(PdfViewer);

// ===================== 主组件：PaperAttachmentsDrawer =====================
export function PaperAttachmentsDrawer({
  isOpen,
  onClose,
  paperId,
  userPaperId,
  isPersonalOwner,
  isAdmin = false,
  attachments,
  onAttachmentsChange,
  onSectionAdded,
  onAddBlockAsSection,
  onAddHeadingToSection,
  onAddParagraphToSection,
  onAddOrderedListToSection,
  onAddUnorderedListToSection,
  onAddMathToSection,
  onAddFigureToSection,
  onAddTableToSection,
  sections = [],
}: PaperAttachmentsDrawerProps) {
  // 添加调试代码
  const [isUploading, setIsUploading] = useState(false);

  // PdfViewer 可见状态，与 Drawer 开关解耦（只要有 pdfUrl 就可见）
  const [pdfState, setPdfState] = useState({
    isVisible: false,
  });

  const pdfUrl = useMemo(
    () => attachments.pdf?.url || '',
    [attachments.pdf?.url],
  );

  useEffect(() => {
    setPdfState((prev) => ({ ...prev, isVisible: Boolean(pdfUrl) }));
  }, [pdfUrl]);

  // ====== content_list.json 状态：直接用 attachments.content_list.url ======
  const [contentList, setContentList] = useState<ContentBlock[] | null>(null);

  useEffect(() => {
    const fetchContentList = async () => {
      if (!paperId && !userPaperId) {
        setContentList(null);
        return;
      }

      let aborted = false;

      try {
        let response;
        if (isPersonalOwner && userPaperId) {
          // 使用用户论文API
          response = await userPaperService.getUserPaperContentList(userPaperId);
        } else if (paperId) {
          // 使用管理员论文API
          response = await adminPaperService.getAdminPaperContentList(paperId);
        } else {
          setContentList(null);
          return;
        }

        if (response.topCode !== 200) {
          console.warn('content_list.json 请求失败:', response.topMessage);
          if (!aborted) setContentList(null);
          return;
        }

        const data = (response.data as any)?.contentList as ContentBlock[];
        if (!aborted) {
          setContentList(data || []);
        }
      } catch (e) {
        console.error('加载 content_list.json 失败:', e);
        if (!aborted) {
          setContentList(null);
        }
      }

      return () => {
        aborted = true;
      };
    };

    fetchContentList();
  }, [paperId, userPaperId, isPersonalOwner]);

  // ===== PDF解析相关状态 =====
  const [isParsing, setIsParsing] = useState(false);
  const [parsingTaskId, setParsingTaskId] = useState<string | null>(null);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingMessage, setParsingMessage] = useState<string>('');

  const canEdit = isPersonalOwner || isAdmin;

  // ===== PDF解析进度检查函数 =====
  const handleCheckParsingProgress = async () => {
    // 由于后端已移除PDF解析接口，这里只显示提示信息
    toast.info('PDF解析功能已集成到上传流程中，上传PDF后会自动解析');
  };

  // 进入抽屉时不再检查进行中的解析任务
  // useEffect(() => {
  //   if (attachments.markdown || isParsing) return;

  //   const checkExistingTasks = async () => {
  //     try {
  //       let tasksResult;
  //       if (isPersonalOwner && userPaperId) {
  //         tasksResult = await userPaperService.getPdfParseTasks(userPaperId);
  //       } else {
  //         tasksResult = await adminPaperService.getPdfParseTasks(paperId);
  //       }

  //       if (tasksResult.bizCode === 0 && tasksResult.data.tasks) {
  //         const existingTask = tasksResult.data.tasks.find(
  //           (task: any) =>
  //             task.status === 'pending' || task.status === 'processing',
  //         );

  //         if (existingTask) {
  //           setParsingTaskId(existingTask.taskId);
  //           setParsingProgress(existingTask.progress || 0);
  //           setParsingMessage(
  //             existingTask.message || '检测到进行中的PDF解析任务',
  //           );
  //           setIsParsing(true);
  //           toast.success(
  //             '检测到进行中的PDF解析任务，可点击"查看解析进度"获取最新状态',
  //           );
  //         }
  //       }
  //     } catch (error) {
  //       console.error('检查现有解析任务失败:', error);
  //     }
  //   };

  //   checkExistingTasks();
  // }, [paperId, userPaperId, isPersonalOwner, attachments.markdown, isParsing]);

  // ===== 上传/删除 =====
  const handlePdfUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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

  const handleRemovePdf = async () => {
    setIsUploading(true);
    try {
      let result;
      if (isPersonalOwner && userPaperId) {
        result = await userPaperService.deleteUserPaperAttachment(
          userPaperId,
          'pdf',
        );
      } else {
        result = await adminPaperService.deletePaperAttachment(paperId, 'pdf');
      }

      if (result.bizCode === 0) {
        onAttachmentsChange({ ...attachments, pdf: undefined });
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pdfViewerHeight = useMemo(() => 'calc(100vh - 180px)', []);

  return (
    <SidePanel open={isOpen} onClose={onClose}>
      {/* 隐藏上传 input */}
      <input
        type="file"
        accept=".pdf"
        onChange={handlePdfUpload}
        disabled={isUploading}
        className="hidden"
        id="pdf-upload"
      />

      {/* Header */}
      <div className="pb-4 shrink-0 flex flex-row items-center justify-between px-6 border-b border-white/60 bg-white/70 backdrop-blur-3xl">
        <h2 className="text-base font-semibold text-[#1F2937] tracking-tight">
          论文附件
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full border border-white/65 bg-white/85 hover:bg-white/95 text-[#28418A] shadow-[0_10px_26px_rgba(15,23,42,0.22)] transition-all duration-200 hover:-translate-y-px"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 顶部功能区 */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-white/60 bg-white/60 backdrop-blur-2xl">
        <div className="grid grid-cols-2 gap-3">
          {/* PDF Card */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br from-[#28418A]/20 to-[#1F3469]/20 border border-[#28418A]/30">
                  <File className="h-4 w-4 text-[#28418A]" />
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  PDF 文档
                </div>
              </div>

              {attachments.pdf && (
                <div className="text-[11px] text-slate-500">
                  {formatFileSize(attachments.pdf.size)} ·{' '}
                  {new Date(
                    attachments.pdf.uploadedAt,
                  ).toLocaleDateString()}
                </div>
              )}
            </div>

            {attachments.pdf ? (
              <div className="flex flex-wrap gap-2">
                <AttachmentPreview
                  attachmentUrl={attachments.pdf.url}
                  attachmentType="pdf"
                  paperId={paperId}
                  userPaperId={userPaperId}
                  isAdmin={isAdmin}
                  isPersonalOwner={isPersonalOwner}
                >
                  <Button
                    asChild
                    size="sm"
                    className="rounded-xl"
                    variant="secondary"
                  >
                    <a
                      href={attachments.pdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      下载 PDF
                    </a>
                  </Button>
                </AttachmentPreview>

                {canEdit && (
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        (
                          document.getElementById(
                            'pdf-upload',
                          ) as HTMLInputElement | null
                        )?.click()
                      }
                      disabled={isUploading || isParsing}
                      className="rounded-xl bg-[#28418A] text-white hover:bg-[#1F3469]"
                      title={isParsing ? 'PDF正在解析中，请稍后再上传' : ''}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      重新上传
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRemovePdf}
                      disabled={isUploading || isParsing}
                      className="rounded-xl border border-[#FECACA] bg-[#FDF2F2]/90 text-[#B91C1C] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                      title={isParsing ? 'PDF正在解析中，无法删除' : ''}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {canEdit ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      (
                        document.getElementById(
                          'pdf-upload',
                        ) as HTMLInputElement | null
                      )?.click()
                    }
                    disabled={isUploading || isParsing}
                    className="rounded-xl bg-[#28418A] text-white hover:bg-[#1F3469]"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    上传 PDF
                  </Button>
                ) : (
                  <span className="text-xs text-slate-500">无上传权限</span>
                )}
              </div>
            )}
          </div>

          {/* Markdown Card - 只显示，不允许上传和删除 */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br from-[#3050A5]/20 to-[#1F3469]/20 border border-[#3050A5]/30">
                  <FileText className="h-4 w-4 text-[#3050A5]" />
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  Markdown 文档
                </div>
              </div>

              {attachments.markdown && (
                <div className="text-[11px] text-slate-500">
                  {formatFileSize(attachments.markdown.size)} ·{' '}
                  {new Date(
                    attachments.markdown.uploadedAt,
                  ).toLocaleDateString()}
                </div>
              )}
            </div>

            {attachments.markdown ? (
              <div className="flex flex-wrap gap-2">
                <AttachmentPreview
                  attachmentUrl={attachments.markdown.url}
                  attachmentType="markdown"
                  paperId={paperId}
                  userPaperId={userPaperId}
                  isAdmin={isAdmin}
                  isPersonalOwner={isPersonalOwner}
                >
                  <Button
                    asChild
                    size="sm"
                    className="rounded-xl"
                    variant="secondary"
                  >
                    <a
                      href={attachments.markdown.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      下载 Markdown
                    </a>
                  </Button>
                </AttachmentPreview>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">上传PDF后自动生成Markdown</span>
              </div>
            )}
          </div>
        </div>

        {/* 解析进度 */}
        {isParsing && parsingTaskId && (
          <div className="mt-3 p-4 bg-blue-50/90 border border-blue-200/80 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-center mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm text-blue-700 font-medium">
                PDF解析任务进行中
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${parsingProgress}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 mb-2">{parsingMessage}</p>
            <Button
              onClick={handleCheckParsingProgress}
              className="inline-flex items-center justify-center gap-2 w-full h-8 rounded-lg px-3 text-xs font-medium border border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 transition-all duration-200"
            >
              查看解析进度
            </Button>
          </div>
        )}

        {!isParsing && (
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleCheckParsingProgress}
              size="sm"
              className="inline-flex items-center justify-center gap-2 h-8 rounded-lg px-3 text-xs font-medium border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-all duration-200"
            >
              检查解析进度
            </Button>
          </div>
        )}
      </div>

      {/* 底部：PDF 渲染区 */}
      <div
        className="flex-1 overflow-hidden px-6 py-4 min-h-0"
        style={{ paddingBottom: '24px' }}
      >
        {pdfUrl ? (
          <div
            className="w-full h-full"
            style={{
              height: pdfViewerHeight,
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            <MemoizedPdfViewer
              url={pdfUrl}
              isVisible={pdfState.isVisible}
              userPaperId={userPaperId}
              isAdmin={isAdmin}
              isPersonalOwner={isPersonalOwner}
              paperId={paperId}
              contentList={contentList || undefined}
              onSectionAdded={onSectionAdded}
              onAddBlockAsSection={onAddBlockAsSection}
              onAddHeadingToSection={onAddHeadingToSection}
              onAddParagraphToSection={onAddParagraphToSection}
              onAddOrderedListToSection={onAddOrderedListToSection}
              onAddUnorderedListToSection={onAddUnorderedListToSection}
              onAddMathToSection={onAddMathToSection}
              onAddFigureToSection={onAddFigureToSection}
              onAddTableToSection={onAddTableToSection}
              sections={sections}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-sm text-slate-500">
            暂无 PDF，可在顶部上传
          </div>
        )}
      </div>
    </SidePanel>
  );
}
