'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useEditingState } from '@/stores/useEditingState';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { uploadImage, uploadPaperImage } from '@/lib/services/upload';
import { parseHtmlTable, validateHtmlTable } from '@/lib/utils/tableParser';
import type {
  BlockContent,
  Reference,
  Section,
  InlineContent,
  HeadingBlock,
  ParagraphBlock,
  MathBlock,
  FigureBlock,
  TableBlock,
  CodeBlock,
  OrderedListBlock,
  UnorderedListBlock,
  QuoteBlock,
  TableCell,
  TableRow,
} from '@/types/paper';
import InlineEditor from './InlineEditor';
import {
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Copy,
  GripVertical,
  FileText,
  Heading,
  Calculator,
  Image,
  Table as TableIcon,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import katex from 'katex';

interface BlockEditorProps {
  block: BlockContent;
  onChange: (block: BlockContent) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  references?: Reference[];
  allSections?: Section[];
  dragHandleProps?: Record<string, unknown>;
  onAddBlockAfter?: (type: BlockContent['type']) => void;
  lang?: 'en' | 'zh' | 'both';
  onSaveToServer?: () => Promise<void>;
}

const cloneBlock = <T extends BlockContent>(target: T): T =>
  JSON.parse(JSON.stringify(target));

export default function BlockEditor({
  block,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  canMoveUp = true,
  canMoveDown = true,
  references = [],
  allSections = [],
  dragHandleProps,
  onAddBlockAfter,
  lang = 'both',
  onSaveToServer,
}: BlockEditorProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { isEditing, clearEditing, setHasUnsavedChanges, switchToEdit } = useEditingState();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const originalBlockRef = useRef<BlockContent>(cloneBlock(block));
  const originalSerializedRef = useRef<string>(JSON.stringify(block));
  const wasEditingRef = useRef(false);

  const config = getBlockTypeConfig(block.type);
  const Icon = config.icon;

  const serializedBlock = useMemo(() => JSON.stringify(block), [block]);
  const isCurrentlyEditing = isEditing(block.id);

  useEffect(() => {
    if (isCurrentlyEditing && !wasEditingRef.current) {
      originalBlockRef.current = cloneBlock(block);
      originalSerializedRef.current = serializedBlock;
    }
    if (!isCurrentlyEditing && wasEditingRef.current) {
      setHasUnsavedChanges(false);
    }
    wasEditingRef.current = isCurrentlyEditing;
  }, [isCurrentlyEditing, block, serializedBlock, setHasUnsavedChanges]);

  useEffect(() => {
    if (!isCurrentlyEditing) return;
    setHasUnsavedChanges(serializedBlock !== originalSerializedRef.current);
  }, [isCurrentlyEditing, serializedBlock, setHasUnsavedChanges]);

  const handleCompleteEditing = useCallback(async () => {
    // 先保存到服务器
    if (onSaveToServer) {
      setIsSaving(true);
      try {
        toast.loading('正在保存内容...', { id: 'save-block' });
        await onSaveToServer();
        // 保存成功后，更新原始状态并退出编辑模式
        originalBlockRef.current = cloneBlock(block);
        originalSerializedRef.current = serializedBlock;
        setHasUnsavedChanges(false);
        clearEditing();
        toast.success('内容保存成功', { id: 'save-block' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
        toast.error('保存失败', {
          id: 'save-block',
          description: message
        });
        // 如果保存失败，不退出编辑模式
        return;
      } finally {
        setIsSaving(false);
      }
    } else {
      // 如果没有 onSaveToServer 函数，直接退出编辑模式
      originalBlockRef.current = cloneBlock(block);
      originalSerializedRef.current = serializedBlock;
      setHasUnsavedChanges(false);
      clearEditing();
      toast.success('内容已更新');
    }
  }, [block, serializedBlock, clearEditing, setHasUnsavedChanges, onSaveToServer]);

  const handleCancelEditing = useCallback(() => {
    if (serializedBlock !== originalSerializedRef.current) {
      onChange(cloneBlock(originalBlockRef.current));
      toast.info('已取消编辑，内容已恢复');
    }
    setHasUnsavedChanges(false);
    clearEditing();
  }, [serializedBlock, onChange, setHasUnsavedChanges, clearEditing]);

  const handleStartEditing = useCallback(async () => {
    if (isCurrentlyEditing) return;
    const switched = await switchToEdit(block.id, {
      onRequestSave: ({ currentId }) => {
        if (currentId === block.id) {
          handleCompleteEditing();
        }
      },
    });
    if (!switched) return;
  }, [isCurrentlyEditing, switchToEdit, block.id, handleCompleteEditing]);

  const blockTypes: Array<{ type: BlockContent['type']; label: string; icon: string }> = [
    { type: 'paragraph', label: '段落', icon: '📝' },
    { type: 'heading', label: '标题', icon: '📌' },
    { type: 'math', label: '数学公式', icon: '∑' },
    { type: 'figure', label: '图片', icon: '🖼️' },
    { type: 'table', label: '表格', icon: '📊' },
    { type: 'code', label: '代码块', icon: '💻' },
    { type: 'ordered-list', label: '有序列表', icon: '🔢' },
    { type: 'unordered-list', label: '无序列表', icon: '•' },
    { type: 'quote', label: '引用', icon: '💬' },
    { type: 'divider', label: '分隔线', icon: '—' },
  ];

  return (
    <div
      className={`relative border-2 rounded-lg transition-all duration-200 ${
        isCurrentlyEditing
          ? 'border-blue-500 shadow-xl bg-blue-50/50'
          : isHovered
          ? 'border-blue-400 shadow-lg bg-blue-50/30'
          : 'border-gray-300 bg-white'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleStartEditing}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b transition-colors ${
          isCurrentlyEditing
            ? 'border-blue-500 bg-blue-100'
            : isHovered
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium bg-${config.color}-100 text-${config.color}-700 flex items-center gap-1`}
          >
            <Icon className="w-3 h-3" />
            {isCurrentlyEditing ? '正在编辑: ' + config.label : config.label}
          </span>
          <span className="text-xs text-gray-400 font-mono">ID: {block.id}</span>
        </div>

        <div className="flex items-center gap-1">
          {onAddBlockAfter && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddMenu((prev) => !prev)}
                className="p-1 hover:bg-green-100 rounded text-green-600"
                title="在此后添加块"
              >
                <Plus className="w-4 h-4" />
              </button>

              {showAddMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAddMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 w-48 max-h-64 overflow-y-auto">
                    {blockTypes.map(({ type, label, icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onAddBlockAfter(type);
                          setShowAddMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left text-sm"
                      >
                        <span className="text-base">{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            className="p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing"
            title="拖拽排序"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className={`p-1 rounded transition-colors ${
              canMoveUp
                ? 'hover:bg-gray-200 text-gray-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="上移"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className={`p-1 rounded transition-colors ${
              canMoveDown
                ? 'hover:bg-gray-200 text-gray-600'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title="下移"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 hover:bg-gray-200 rounded text-gray-600"
            title="复制块"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={async () => {
              const confirmed = await confirm({
                title: '删除内容块',
                description: '确定删除该内容块吗？此操作不可撤销。',
                confirmText: '删除',
                cancelText: '取消',
                variant: 'destructive',
                onConfirm: () => Promise.resolve(),
              });
              if (confirmed) {
                onDelete?.();
              }
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="删除块"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {(() => {
          switch (block.type) {
            case 'heading':
              return (
                <HeadingEditor
                  block={block as HeadingBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                />
              );
            case 'paragraph':
              return (
                <ParagraphEditor
                  block={block as ParagraphBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                />
              );
            case 'math':
              return (
                <MathEditor
                  block={block as MathBlock}
                  onChange={(updated) => onChange(updated)}
                />
              );
            case 'figure':
              return (
                <FigureEditor
                  block={block as FigureBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                  paperId={typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : undefined}
                />
              );
            case 'table':
              return (
                <TableEditor
                  block={block as TableBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                  onSaveToServer={onSaveToServer}
                />
              );
            case 'code':
              return (
                <CodeEditor
                  block={block as CodeBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                />
              );
            case 'ordered-list':
              return (
                <OrderedListEditor
                  block={block as OrderedListBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                />
              );
            case 'unordered-list':
              return (
                <UnorderedListEditor
                  block={block as UnorderedListBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                />
              );
            case 'quote':
              return (
                <QuoteEditor
                  block={block as QuoteBlock}
                  onChange={(updated) => onChange(updated)}
                  references={references}
                  allSections={allSections}
                  lang={lang}
                />
              );
            case 'divider':
              return (
                <div className="text-center text-gray-400 text-sm py-4">
                  分隔线（无需编辑）
                </div>
              );
            default:
              return (
                <div className="text-red-500">
                  未知块类型: {(block as { type: string }).type}
                </div>
              );
          }
        })()}
      </div>

      {isCurrentlyEditing && (
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <button
            type="button"
            onClick={handleCancelEditing}
            disabled={isSaving}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleCompleteEditing}
            disabled={isSaving}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              '完成编辑'
            )}
          </button>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

function getBlockTypeConfig(type: BlockContent['type']) {
  const blockTypeConfig: Record<
    BlockContent['type'],
    { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
  > = {
    heading: { icon: Heading, label: '标题', color: 'blue' },
    paragraph: { icon: FileText, label: '段落', color: 'gray' },
    math: { icon: Calculator, label: '公式', color: 'purple' },
    figure: { icon: Image, label: '图片', color: 'green' },
    table: { icon: TableIcon, label: '表格', color: 'orange' },
    code: { icon: Code, label: '代码', color: 'red' },
    'ordered-list': { icon: ListOrdered, label: '有序列表', color: 'indigo' },
    'unordered-list': { icon: List, label: '无序列表', color: 'indigo' },
    quote: { icon: Quote, label: '引用', color: 'amber' },
    divider: { icon: Minus, label: '分隔线', color: 'gray' },
    loading: { icon: Loader2, label: '加载中', color: 'blue' },
    parsing: { icon: Loader2, label: '解析中', color: 'yellow' },
  };

  return blockTypeConfig[type] || blockTypeConfig.paragraph;
}

function HeadingEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
}: {
  block: HeadingBlock;
  onChange: (block: HeadingBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">级别:</label>
        <select
          value={block.level}
          onChange={(event) =>
            onChange({ ...block, level: Number(event.target.value) as HeadingBlock['level'] })
          }
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>
              H{level}
            </option>
          ))}
        </select>

        {block.number && (
          <div className="ml-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">编号:</label>
            <span className="px-2 py-1 text-sm font-semibold text-blue-600 bg-blue-50 rounded">
              {block.number}
            </span>
            <span className="text-xs text-gray-400">(自动编号)</span>
          </div>
        )}
      </div>

      <InlineEditor
        value={block.content?.en ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            content: { ...block.content, en: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="英文"
        placeholder="输入英文标题..."
      />

      <InlineEditor
        value={block.content?.zh ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            content: { ...block.content, zh: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="中文"
        placeholder="输入中文标题..."
      />
    </div>
  );
}

function ParagraphEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
}: {
  block: ParagraphBlock;
  onChange: (block: ParagraphBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">对齐:</label>
        <select
          value={block.align ?? 'left'}
          onChange={(event) =>
            onChange({ ...block, align: event.target.value as ParagraphBlock['align'] })
          }
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option value="left">左对齐</option>
          <option value="center">居中</option>
          <option value="right">右对齐</option>
          <option value="justify">两端对齐</option>
        </select>
      </div>

      <InlineEditor
        value={block.content?.en ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            content: { ...block.content, en: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="英文"
        placeholder="输入英文段落内容..."
      />

      <InlineEditor
        value={block.content?.zh ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            content: { ...block.content, zh: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="中文"
        placeholder="输入中文段落内容..."
      />
    </div>
  );
}

function MathEditor({
  block,
  onChange,
}: {
  block: MathBlock;
  onChange: (block: MathBlock) => void;
}) {
  const [preview, setPreview] = useState(block.latex ?? '');

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签 (可选):
          </label>
          <input
            type="text"
            value={block.label ?? ''}
            onChange={(event) => onChange({ ...block, label: event.target.value })}
            placeholder="eq:energy"
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        {block.number && (
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">编号:</label>
            <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-700 font-semibold text-center">
              ({block.number})
            </div>
            <span className="text-xs text-gray-400">自动编号</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LaTeX:</label>
          <textarea
            value={block.latex}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ ...block, latex: value });
              setPreview(value);
            }}
            placeholder="E = mc^2"
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">预览:</label>
          <div className="w-full h-32 px-3 py-2 border border-gray-300 rounded bg-gray-50 flex items-center justify-center overflow-auto">
            {preview ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    try {
                      return katex.renderToString(preview, {
                        displayMode: true,
                        throwOnError: false,
                      });
                    } catch {
                      return `<div class="text-red-500">渲染错误</div>`;
                    }
                  })(),
                }}
              />
            ) : (
              <span className="text-sm text-gray-400">输入公式以预览</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FigureEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
  paperId,
}: {
  block: FigureBlock;
  onChange: (block: FigureBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
  paperId?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 用于"乐观预览"的本地状态；与 block.src 双向同步
  const [localSrc, setLocalSrc] = useState(block.src ?? '');
  useEffect(() => {
    // 父级刷回来后，同步预览
    console.log('[DEBUG] block.src 变化:', block.src, 'block.id:', block.id);
    setLocalSrc(block.src ?? '');
  }, [block.src, block.id]);

  // 为 alt 文本添加本地状态，确保更改能立即反映在 UI 中
  const [localAlt, setLocalAlt] = useState(block.alt ?? '');
  useEffect(() => {
    // 父级刷回来后，同步 alt 文本
    setLocalAlt(block.alt ?? '');
  }, [block.alt]);

  // 为宽度和高度添加本地状态，确保更改能立即反映在 UI 中
  const [localWidth, setLocalWidth] = useState(block.width ?? '');
  const [localHeight, setLocalHeight] = useState(block.height ?? '');
  useEffect(() => {
    setLocalWidth(block.width ?? '');
    setLocalHeight(block.height ?? '');
  }, [block.width, block.height]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg','image/jpg','image/png','image/gif','image/svg+xml','image/webp'];
    if (!allowed.includes(file.type)) {
      setError('只支持 JPEG, PNG, GIF, SVG, WebP 格式的图片');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    // 1) 先用本地 ObjectURL 做乐观预览
    const objectUrl = URL.createObjectURL(file);
    setLocalSrc(objectUrl);
    onChange({ ...block, src: objectUrl, uploadedFilename: file.name });

    // 简单的进度模拟（可保留/可删）
    const tm = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 200);

    try {
      const res = paperId ? await uploadPaperImage(file, paperId) : await uploadImage(file);
      clearInterval(tm);
      setUploadProgress(100);

      // 2) 后端返回 URL 后，统一写入本地预览 + block
      const finalUrl = res.url;
      
      // 先更新本地状态，确保预览立即更新
      setLocalSrc(finalUrl);
      
      // 然后更新 block 状态，但不立即保存到服务器
      // 只更新本地状态，等待用户点击"完成编辑"时才保存
      onChange({ ...block, src: finalUrl, uploadedFilename: file.name });

      toast.success('图片上传成功');
    } catch (err) {
      clearInterval(tm);
      // 回退到旧的 block.src（如果有）
      setLocalSrc(block.src ?? '');
      const msg = err instanceof Error ? err.message : '上传失败，请稍后重试';
      setError(msg);
      toast.error('图片上传失败', { description: msg });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleRemoveImage = () => {
    setLocalSrc('');
    onChange({ ...block, src: '', uploadedFilename: undefined });
    toast.success('图片已移除');
  };

  const displaySrc = (localSrc ?? '').trim();

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          id={`file-input-${block.id}`}
          disabled={uploading}
        />

        <div className="text-center">
          {displaySrc ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                {/* 用 key 强制在 src 变化时重建节点，避免缓存/渲染残留 */}
                <img
                  key={`${displaySrc}-${block.id}`}
                  src={displaySrc}
                  alt={block.alt || '预览'}
                  className="max-h-48 rounded border border-gray-300"
                  onError={(e) => {
                    e.currentTarget.src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="160"><text x="50%" y="50%" text-anchor="middle" fill="gray" font-size="12">图片加载失败</text></svg>';
                  }}
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                    <div className="text-white text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <span className="text-sm">上传中... {uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                <label
                  htmlFor={`file-input-${block.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? '上传中...' : '更换图片'}
                </label>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  移除图片
                </button>
              </div>
            </div>
          ) : (
            <label htmlFor={`file-input-${block.id}`} className="cursor-pointer inline-flex flex-col items-center">
              {uploading ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-blue-500 mb-2 animate-spin" />
                  <span className="text-sm text-gray-600">上传中... {uploadProgress}%</span>
                  <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <>
                  <Image className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">点击选择图片上传</span>
                  <span className="text-xs text-gray-400 mt-1">
                    支持 JPEG, PNG, GIF, SVG, WebP，最大 10MB
                  </span>
                </>
              )}
            </label>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>

      {block.number && (
        <div className="flex gap-4 items-center">
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-700 font-semibold">
            Figure {block.number}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">或手动输入图片路径:</label>
        <input
          type="text"
          value={localSrc || ''}
          onChange={(e) => {
            const v = e.target.value;
            setLocalSrc(v);                 // 本地立刻生效
            onChange({ ...block, src: v }); // 同步给父级
          }}
          placeholder="/uploads/images/figure1.png"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Alt 文本:</label>
        <input
          type="text"
          value={localAlt}
          onChange={(e) => {
            const newAlt = e.target.value;
            setLocalAlt(newAlt); // 本地立刻生效
            onChange({ ...block, alt: newAlt }); // 同步给父级
          }}
          placeholder="图片描述"
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">宽度:</label>
          <input
            type="text"
            value={localWidth}
            onChange={(e) => {
              const newWidth = e.target.value;
              setLocalWidth(newWidth); // 本地立刻生效
              onChange({ ...block, width: newWidth }); // 同步给父级
            }}
            placeholder="auto 或 500px"
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">高度:</label>
          <input
            type="text"
            value={localHeight}
            onChange={(e) => {
              const newHeight = e.target.value;
              setLocalHeight(newHeight); // 本地立刻生效
              onChange({ ...block, height: newHeight }); // 同步给父级
            }}
            placeholder="auto 或 300px"
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图片标题 (英文):</label>
          <InlineEditor
            value={block.caption?.en ?? []}
            onChange={(newContent) =>
              onChange({
                ...block,
                caption: { ...block.caption, en: newContent },
              })
            }
            references={references}
            allSections={allSections}
            placeholder="输入英文图片标题..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图片标题 (中文):</label>
          <InlineEditor
            value={block.caption?.zh ?? []}
            onChange={(newContent) =>
              onChange({
                ...block,
                caption: { ...block.caption, zh: newContent },
              })
            }
            references={references}
            allSections={allSections}
            placeholder="输入中文图片标题..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图片描述 (英文):</label>
          <InlineEditor
            value={block.description?.en ?? []}
            onChange={(newContent) =>
              onChange({
                ...block,
                description: { ...block.description, en: newContent },
              })
            }
            references={references}
            allSections={allSections}
            placeholder="输入英文图片描述..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">图片描述 (中文):</label>
          <InlineEditor
            value={block.description?.zh ?? []}
            onChange={(newContent) =>
              onChange({
                ...block,
                description: { ...block.description, zh: newContent },
              })
            }
            references={references}
            allSections={allSections}
            placeholder="输入中文图片描述..."
          />
        </div>
      </div>
    </div>
  );
}


function TableEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
  onSaveToServer,
}: {
  block: TableBlock;
  onChange: (block: TableBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
  onSaveToServer?: () => Promise<void>;
}) {
  const [editMode, setEditMode] = useState<'json' | 'html'>('html');
  const [htmlInput, setHtmlInput] = useState('');
  const [htmlError, setHtmlError] = useState<string | null>(null);
  const { clearEditing } = useEditingState();


  const handleHtmlParse = async () => {
    if (!htmlInput.trim()) {
      setHtmlError('请输入HTML表格代码');
      return;
    }

    const validation = validateHtmlTable(htmlInput);
    if (!validation.isValid) {
      setHtmlError(validation.error || 'HTML表格代码无效');
      return;
    }

    try {
      const tableData = parseHtmlTable(htmlInput);
      onChange({
        ...block,
        headers: tableData.headers,
        rows: tableData.rows || []
      });
      setHtmlError(null);
      toast.success('HTML表格解析成功，正在自动保存...');
      
      // 自动保存并退出编辑状态
      if (onSaveToServer) {
        try {
          await onSaveToServer();
          toast.success('HTML表格解析并保存成功');
          // 保存成功后，触发完成编辑
          clearEditing();
        } catch (error) {
          const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
          toast.error('保存失败', { description: message });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '解析失败';
      setHtmlError(message);
      toast.error('HTML表格解析失败', { description: message });
    }
  };

  return (
    <div className="space-y-4">
      {block.number && (
        <div className="mb-4">
          <div className="inline-block px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-700 font-semibold">
            Table {block.number}
          </div>
          <span className="text-xs text-gray-400 ml-2">(自动编号)</span>
        </div>
      )}

      <InlineEditor
        value={block.caption?.en ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            caption: { ...block.caption, en: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="表格标题 (英文)"
      />

      <InlineEditor
        value={block.caption?.zh ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            caption: { ...block.caption, zh: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="表格标题 (中文)"
      />

      {/* 编辑模式选择 */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setEditMode('json')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            editMode === 'json'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          JSON 编辑
        </button>
        <button
          type="button"
          onClick={() => setEditMode('html')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            editMode === 'html'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          HTML 导入
        </button>
      </div>

      {/* JSON 编辑模式 */}
      {editMode === 'json' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            表格数据 (JSON):
          </label>
          <textarea
            value={JSON.stringify(
              {
                headers: block.headers,
                rows: block.rows,
                align: block.align,
              },
              null,
              2
            )}
            onChange={(event) => {
              try {
                const data = JSON.parse(event.target.value) as Pick<
                  TableBlock,
                  'headers' | 'rows' | 'align'
                >;
                onChange({ ...block, ...data });
              } catch {
                /** 静默忽略解析错误 */
              }
            }}
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded font-mono text-xs"
          />
        </div>
      )}

      {/* HTML 导入模式 */}
      {editMode === 'html' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              HTML 表格代码:
            </label>
            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder={'请输入表格的HTML代码...'}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
            />
          </div>

          {htmlError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {htmlError}
            </div>
          )}

          <button
            type="button"
            onClick={handleHtmlParse}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            解析 HTML 表格
          </button>

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <p className="font-medium mb-1">使用说明:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>支持标准HTML表格代码，包括table、tr、td、th标签</li>
              <li>支持colspan和rowspan属性创建复杂表格</li>
              <li>th标签会被识别为表头单元格</li>
              <li>解析后将替换当前表格数据</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
}: {
  block: CodeBlock;
  onChange: (block: CodeBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            编程语言:
          </label>
          <input
            type="text"
            value={block.language ?? ''}
            onChange={(event) => onChange({ ...block, language: event.target.value })}
            placeholder="python, javascript, cpp..."
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id={`showLineNumbers-${block.id}`}
            checked={block.showLineNumbers ?? false}
            onChange={(event) =>
              onChange({ ...block, showLineNumbers: event.target.checked })
            }
            className="w-4 h-4"
          />
          <label htmlFor={`showLineNumbers-${block.id}`} className="text-sm text-gray-700">
            显示行号
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">代码:</label>
        <textarea
          value={block.code}
          onChange={(event) => onChange({ ...block, code: event.target.value })}
          placeholder="输入代码..."
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
        />
      </div>

      <InlineEditor
        value={block.caption?.en ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            caption: { ...block.caption, en: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="代码标题 (英文, 可选)"
        placeholder="输入代码英文标题..."
      />

      <InlineEditor
        value={block.caption?.zh ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            caption: { ...block.caption, zh: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="代码标题 (中文, 可选)"
        placeholder="输入代码中文标题..."
      />
    </div>
  );
}

function OrderedListEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
}: {
  block: OrderedListBlock;
  onChange: (block: OrderedListBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
}) {
  const addItem = () => {
    const newItems = [...(block.items ?? []), { content: { en: [], zh: [] } }];
    onChange({ ...block, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = (block.items ?? []).filter((_, i) => i !== index);
    onChange({ ...block, items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const items = block.items ?? [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange({ ...block, items: newItems });
  };

  const updateItem = (index: number, langKey: 'en' | 'zh', content: InlineContent[]) => {
    const items = block.items ?? [];
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      content: {
        ...newItems[index].content,
        [langKey]: content,
      },
    };
    onChange({ ...block, items: newItems });
  };

  return (
    <div className="space-y-4">
      <div className="w-32">
        <label className="block text-sm font-medium text-gray-700 mb-1">起始编号:</label>
        <input
          type="number"
          value={block.start ?? 1}
          onChange={(event) => onChange({ ...block, start: Number(event.target.value) })}
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">列表项:</label>

        {(block.items ?? []).map((item, index) => (
          <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-600">
                项目 {(block.start ?? 1) + index}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className={`p-1 rounded ${
                    index === 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === (block.items?.length ?? 0) - 1}
                  className={`p-1 rounded ${
                    index === (block.items?.length ?? 0) - 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-3">
              <InlineEditor
                value={item.content?.en ?? []}
                onChange={(content) => updateItem(index, 'en', content)}
                references={references}
                allSections={allSections}
                label="英文"
                placeholder="输入列表项英文内容..."
              />
            </div>

            <InlineEditor
              value={item.content?.zh ?? []}
              onChange={(content) => updateItem(index, 'zh', content)}
              references={references}
              allSections={allSections}
              label="中文"
              placeholder="输入列表项中文内容..."
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加列表项
        </button>
      </div>
    </div>
  );
}

function UnorderedListEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
}: {
  block: UnorderedListBlock;
  onChange: (block: UnorderedListBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
}) {
  const addItem = () => {
    const newItems = [...(block.items ?? []), { content: { en: [], zh: [] } }];
    onChange({ ...block, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = (block.items ?? []).filter((_, i) => i !== index);
    onChange({ ...block, items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const items = block.items ?? [];
       const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange({ ...block, items: newItems });
  };

  const updateItem = (index: number, langKey: 'en' | 'zh', content: InlineContent[]) => {
    const items = block.items ?? [];
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      content: {
        ...newItems[index].content,
        [langKey]: content,
      },
    };
    onChange({ ...block, items: newItems });
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">列表项:</label>

      {(block.items ?? []).map((item, index) => (
        <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">• 项目 {index + 1}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
                className={`p-1 rounded ${
                  index === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 'down')}
                disabled={index === (block.items?.length ?? 0) - 1}
                className={`p-1 rounded ${
                  index === (block.items?.length ?? 0) - 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mb-3">
            <InlineEditor
              value={item.content?.en ?? []}
              onChange={(content) => updateItem(index, 'en', content)}
              references={references}
              allSections={allSections}
              label="英文"
              placeholder="输入列表项英文内容..."
            />
          </div>

          <InlineEditor
            value={item.content?.zh ?? []}
            onChange={(content) => updateItem(index, 'zh', content)}
            references={references}
            allSections={allSections}
            label="中文"
            placeholder="输入列表项中文内容..."
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加列表项
      </button>
    </div>
  );
}

function QuoteEditor({
  block,
  onChange,
  references,
  allSections,
  lang,
}: {
  block: QuoteBlock;
  onChange: (block: QuoteBlock) => void;
  references: Reference[];
  allSections: Section[];
  lang: 'en' | 'zh' | 'both';
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          作者 (可选):
        </label>
        <input
          type="text"
          value={block.author ?? ''}
          onChange={(event) => onChange({ ...block, author: event.target.value })}
          placeholder="引用来源或作者名"
          className="w-full px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      <InlineEditor
        value={block.content?.en ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            content: { ...block.content, en: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="引用内容 (英文)"
        placeholder="输入英文引用内容..."
      />

      <InlineEditor
        value={block.content?.zh ?? []}
        onChange={(newContent) =>
          onChange({
            ...block,
            content: { ...block.content, zh: newContent },
          })
        }
        references={references}
        allSections={allSections}
        label="引用内容 (中文)"
        placeholder="输入中文引用内容..."
      />
    </div>
  );
}

