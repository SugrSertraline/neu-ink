import { BlockContent, Reference, Section, InlineContent } from "@/app/types/paper";
import {
    Trash2, Plus, ChevronUp, ChevronDown, Copy, GripVertical,
    FileText, Heading, Calculator, Image,
    Table as TableIcon, Code, List, ListOrdered, Quote, Minus
} from "lucide-react";
import { useRef, useState } from "react";
import RichTextEditor from './RichTextEditor';
import { apiPost, apiDelete, toAbsoluteUrl } from '@/app/lib/api';
// 修改接口，添加新的 prop
interface EditableBlockProps {
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
    lang: 'en' | 'both';
    dragHandleProps?: any;
    onAddBlockAfter?: (type: BlockContent['type']) => void; // 🆕 新增
}

// 在组件内部添加状态
export default function EditableBlock({
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
    lang,
    dragHandleProps,
    onAddBlockAfter // 🆕
}: EditableBlockProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false); // 🆕 新增状态

    const config = getBlockTypeConfig(block.type);
    const Icon = config.icon;

    // 🆕 块类型列表
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
        { type: 'divider', label: '分隔线', icon: '—' }
    ];

    return (
        <div
            className={`relative border-2 rounded-lg transition-all duration-200 ${isHovered
                ? 'border-blue-400 shadow-lg bg-blue-50/30'
                : 'border-gray-300 bg-white'
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 顶部工具栏 */}
            <div className={`flex items-center justify-between px-3 py-2 border-b transition-colors ${isHovered ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}>
                {/* 左侧：类型标签 + ID */}
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium bg-${config.color}-100 text-${config.color}-700 flex items-center gap-1`}>
                        <Icon className="w-3 h-3" />
                        {config.label}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                        ID: {block.id}
                    </span>
                </div>

                {/* 右侧：操作按钮 */}
                <div className="flex items-center gap-1">
                    {/* 🆕 添加块按钮 */}
                    {onAddBlockAfter && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowAddMenu(!showAddMenu)}
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

                    {/* 拖拽手柄 */}
                    <button
                        type="button"
                        className="p-1 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing"
                        title="拖拽排序"
                        {...dragHandleProps}
                    >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                    </button>

                    {/* 上移 */}
                    <button
                        type="button"
                        onClick={onMoveUp}
                        disabled={!canMoveUp}
                        className={`p-1 rounded transition-colors ${canMoveUp
                            ? 'hover:bg-gray-200 text-gray-600'
                            : 'text-gray-300 cursor-not-allowed'
                            }`}
                        title="上移"
                    >
                        <ChevronUp className="w-4 h-4" />
                    </button>

                    {/* 下移 */}
                    <button
                        type="button"
                        onClick={onMoveDown}
                        disabled={!canMoveDown}
                        className={`p-1 rounded transition-colors ${canMoveDown
                            ? 'hover:bg-gray-200 text-gray-600'
                            : 'text-gray-300 cursor-not-allowed'
                            }`}
                        title="下移"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* 复制 */}
                    <button
                        type="button"
                        onClick={onDuplicate}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="复制块"
                    >
                        <Copy className="w-4 h-4" />
                    </button>

                    {/* 删除 */}
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                        title="删除块"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 内容编辑区 */}
            <div className="p-4">
                {renderEditor()}
            </div>
        </div>
    );



    function renderEditor() {
        switch (block.type) {
            case 'heading':
                return <HeadingEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'paragraph':
                return <ParagraphEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'math':
                return <MathEditor block={block} onChange={onChange} />; // MathEditor 不需要 lang

            case 'figure':
                return <FigureEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'table':
                return <TableEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'code':
                return <CodeEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'ordered-list':
                return <OrderedListEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'unordered-list':
                return <UnorderedListEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'quote':
                return <QuoteEditor block={block} onChange={onChange} references={references} allSections={allSections} lang={lang} />;

            case 'divider':
                return <div className="text-center text-gray-400 text-sm py-4">分隔线（无需编辑）</div>;

            default:
                return <div className="text-red-500">未知块类型: {(block as any).type}</div>;
        }
    }

}

function getBlockTypeConfig(type: string) {
    const blockTypeConfig: Record<string, { icon: any; label: string; color: string }> = {
        'heading': { icon: Heading, label: '标题', color: 'blue' },
        'paragraph': { icon: FileText, label: '段落', color: 'gray' },
        'math': { icon: Calculator, label: '公式', color: 'purple' },
        'figure': { icon: Image, label: '图片', color: 'green' },
        'table': { icon: TableIcon, label: '表格', color: 'orange' },
        'code': { icon: Code, label: '代码', color: 'red' },
        'ordered-list': { icon: ListOrdered, label: '有序列表', color: 'indigo' },
        'unordered-list': { icon: List, label: '无序列表', color: 'indigo' },
        'quote': { icon: Quote, label: '引用', color: 'amber' },
        'divider': { icon: Minus, label: '分隔线', color: 'gray' }
    };

    return blockTypeConfig[type] || blockTypeConfig['paragraph'];
}

// ==================== 各类型编辑器 ====================

// 1. 标题编辑器
function HeadingEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    return (
        <div className="space-y-4">
            {/* 级别选择 */}
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">级别:</label>
                <select
                    value={block.level}
                    onChange={(e) => onChange({ ...block, level: Number(e.target.value) as any })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                    {[1, 2, 3, 4, 5, 6].map(l => (
                        <option key={l} value={l}>H{l}</option>
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

            {/* 英文内容 - 始终显示 */}
            <RichTextEditor
                value={block.content?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    content: { ...block.content, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="English"
                placeholder="Enter heading in English..."
            />

            {/* 中文内容 - 仅在双语模式显示 */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.content?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        content: { ...block.content, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="中文"
                    placeholder="输入中文标题..."
                />
            )}
        </div>
    );
}

// 2. 段落编辑器
function ParagraphEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    return (
        <div className="space-y-4">
            {/* 对齐方式 */}
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">对齐:</label>
                <select
                    value={block.align || 'left'}
                    onChange={(e) => onChange({ ...block, align: e.target.value as any })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                    <option value="left">左对齐</option>
                    <option value="center">居中</option>
                    <option value="right">右对齐</option>
                    <option value="justify">两端对齐</option>
                </select>
            </div>

            {/* 英文内容 - 始终显示 */}
            <RichTextEditor
                value={block.content?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    content: { ...block.content, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="English"
                placeholder="Enter paragraph content in English..."
            />

            {/* 中文内容 - 仅在双语模式显示 */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.content?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        content: { ...block.content, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="中文"
                    placeholder="输入中文段落内容..."
                />
            )}
        </div>
    );
}

// 3. 数学公式编辑器（不需要 lang，保持不变）
function MathEditor({ block, onChange }: { block: any; onChange: (b: any) => void }) {
    const [preview, setPreview] = useState('');

    return (
        <div className="space-y-4">
            {/* 标签和编号 */}
            // ✅ 修改后的代码
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label (可选):</label>
                    <input
                        type="text"
                        value={block.label || ''}
                        onChange={(e) => onChange({ ...block, label: e.target.value })}
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

            {/* LaTeX 编辑器 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LaTeX:</label>
                    <textarea
                        value={block.latex || ''}
                        onChange={(e) => {
                            onChange({ ...block, latex: e.target.value });
                            setPreview(e.target.value);
                        }}
                        placeholder="E = mc^2"
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">预览:</label>
                    <div className="w-full h-32 px-3 py-2 border border-gray-300 rounded bg-gray-50 flex items-center justify-center overflow-auto">
                        {block.latex && (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: (() => {
                                        try {
                                            const katex = require('katex');
                                            return katex.renderToString(block.latex, { displayMode: true, throwOnError: false });
                                        } catch {
                                            return `<div class="text-red-500">渲染错误</div>`;
                                        }
                                    })()
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// 4. 图片编辑器
function FigureEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 从 URL 获取 paperId
    const getPaperId = () => {
        const pathname = window.location.pathname;
        const pathParts = pathname.split('/').filter(p => p); // 过滤空字符串

        // 修改：使用 'paper' 而不是 'papers'
        const paperIndex = pathParts.indexOf('paper');

        if (paperIndex === -1 || paperIndex >= pathParts.length - 1) {
            console.error('无法从路径中获取 paperId，当前路径:', pathname);
            throw new Error('无法获取页面 ID');
        }

        const paperId = pathParts[paperIndex + 1];
        return paperId;
    };


    // 处理文件选择和上传
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('只支持 JPEG, PNG, GIF, SVG, WebP 格式的图片');
            return;
        }

        // 验证文件大小 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('文件大小不能超过 10MB');
            return;
        }

        try {
            setUploading(true);
            setError(null);
            setUploadProgress(0);

            const paperId = getPaperId();
            const formData = new FormData();
            formData.append('image', file);

            const data = await apiPost<{
                url: string;
                filename: string;
                originalname: string;
                size: number;
            }>(`/api/uploads/${paperId}/images`, formData);

            if (block.uploadedFilename) {
                await deleteImage(block.uploadedFilename);
            }

            // 更新块数据
            onChange({
                ...block,
                src: toAbsoluteUrl(data.url),
                uploadedFilename: data.filename,
                alt: block.alt || data.originalname
            });

            setUploadProgress(100);
        } catch (err) {
            setError(err instanceof Error ? err.message : '上传失败');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // 删除图片
    const deleteImage = async (filename: string) => {
        const paperId = getPaperId();
        try {
            await apiDelete(`/api/uploads/images/${paperId}/${filename}`);

        } catch (err) {
            console.error('删除图片失败:', err);
        }
    };

    // 删除当前图片
    const handleDeleteImage = async () => {
        if (!block.uploadedFilename) return;

        if (!confirm('确定要删除这张图片吗?')) return;

        try {
            await deleteImage(block.uploadedFilename);
            onChange({
                ...block,
                src: '',
                uploadedFilename: undefined
            });
        } catch (err) {
            setError('删除失败');
        }
    };

    return (
        <div className="space-y-4">
            {/* 文件上传区域 */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id={`file-input-${block.id}`}
                />

                <div className="text-center">
                    {block.src ? (  // ✅ 只有在 src 有值时才渲染图片
                        <div className="space-y-3">
                            <div className="relative inline-block">
                                <img
                                    src={toAbsoluteUrl(block.src)}
                                    alt={block.alt || '预览'}
                                    className="max-h-48 rounded border border-gray-300"
                                    onError={(e) => {
                                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" fill="gray">图片加载失败</text></svg>';
                                    }}
                                />
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-2 justify-center">
                                <label
                                    htmlFor={`file-input-${block.id}`}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer inline-flex items-center gap-2"
                                >
                                    <Image className="w-4 h-4" />
                                    更换图片
                                </label>

                                {block.uploadedFilename && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteImage}
                                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 inline-flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        删除图片
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        // ✅ 没有图片时显示上传提示
                        <label
                            htmlFor={`file-input-${block.id}`}
                            className="cursor-pointer inline-flex flex-col items-center"
                        >
                            <Image className="w-12 h-12 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">点击选择图片上传</span>
                            <span className="text-xs text-gray-400 mt-1">
                                支持 JPEG, PNG, GIF, SVG, WebP，最大 10MB
                            </span>
                        </label>
                    )}
                </div>

                {/* 上传进度 */}
                {uploading && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="text-sm text-gray-600 mt-1 text-center">上传中...</p>
                    </div>
                )}

                {/* 错误提示 */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* 图片编号 */}
            {block.number && (
                <div className="flex gap-4 items-center">
                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-700 font-semibold">
                        Figure {block.number}
                    </div>
                    {block.uploadedFilename && (
                        <span className="text-xs text-gray-400 font-mono">
                            文件: {block.uploadedFilename}
                        </span>
                    )}
                </div>
            )}

            {/* 手动输入URL(备选) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    或手动输入图片路径:
                </label>
                <input
                    type="text"
                    value={block.src || ''}
                    onChange={(e) => onChange({ ...block, src: e.target.value })}
                    placeholder="/uploads/images/figure1.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    disabled={uploading}
                />
            </div>

            {/* Alt 文本 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt 文本:</label>
                <input
                    type="text"
                    value={block.alt || ''}
                    onChange={(e) => onChange({ ...block, alt: e.target.value })}
                    placeholder="图片描述"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                />
            </div>

            {/* 尺寸设置 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">宽度:</label>
                    <input
                        type="text"
                        value={block.width || ''}
                        onChange={(e) => onChange({ ...block, width: e.target.value })}
                        placeholder="auto 或 500px"
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">高度:</label>
                    <input
                        type="text"
                        value={block.height || ''}
                        onChange={(e) => onChange({ ...block, height: e.target.value })}
                        placeholder="auto 或 300px"
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                </div>
            </div>

            {/* Caption - English */}
            <RichTextEditor
                value={block.caption?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    caption: { ...block.caption, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="Caption (English)"
                placeholder="Figure caption..."
            />

            {/* Caption - Chinese */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.caption?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        caption: { ...block.caption, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="Caption (中文)"
                    placeholder="图片标题..."
                />
            )}

            {/* Description - English */}
            <RichTextEditor
                value={block.description?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    description: { ...block.description, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="Description (English, 可选)"
                placeholder="Additional description..."
            />

            {/* Description - Chinese */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.description?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        description: { ...block.description, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="Description (中文, 可选)"
                    placeholder="附加描述..."
                />
            )}
        </div>
    );
}

// 5. 表格编辑器
function TableEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    return (
        <div className="space-y-4">
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                表格编辑器（简化版）- 建议使用 JSON 直接编辑或导入 CSV
            </div>

            {/* 编号 */}
            {block.number && (
                <div className="mb-4">
                    <div className="inline-block px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-700 font-semibold">
                        Table {block.number}
                    </div>
                    <span className="text-xs text-gray-400 ml-2">(自动编号)</span>
                </div>
            )}

            {/* Caption - English - 始终显示 */}
            <RichTextEditor
                value={block.caption?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    caption: { ...block.caption, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="Caption (English)"
            />

            {/* Caption - Chinese - 仅在双语模式显示 */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.caption?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        caption: { ...block.caption, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="Caption (中文)"
                />
            )}

            {/* 表格数据的 JSON 编辑 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">表格数据 (JSON):</label>
                <textarea
                    value={JSON.stringify({
                        headers: block.headers,
                        rows: block.rows,
                        align: block.align
                    }, null, 2)}
                    onChange={(e) => {
                        try {
                            const data = JSON.parse(e.target.value);
                            onChange({ ...block, ...data });
                        } catch { }
                    }}
                    className="w-full h-48 px-3 py-2 border border-gray-300 rounded font-mono text-xs"
                />
            </div>
        </div>
    );
}

// 6. 代码块编辑器
function CodeEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    return (
        <div className="space-y-4">
            {/* 语言和行号 */}
            <div className="flex gap-4 items-center">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">编程语言:</label>
                    <input
                        type="text"
                        value={block.language || ''}
                        onChange={(e) => onChange({ ...block, language: e.target.value })}
                        placeholder="python, javascript, cpp..."
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                </div>
                <div className="flex items-center gap-2 pt-6">
                    <input
                        type="checkbox"
                        id="showLineNumbers"
                        checked={block.showLineNumbers || false}
                        onChange={(e) => onChange({ ...block, showLineNumbers: e.target.checked })}
                        className="w-4 h-4"
                    />
                    <label htmlFor="showLineNumbers" className="text-sm text-gray-700">显示行号</label>
                </div>
            </div>

            {/* 代码内容 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">代码:</label>
                <textarea
                    value={block.code || ''}
                    onChange={(e) => onChange({ ...block, code: e.target.value })}
                    placeholder="输入代码..."
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
                />
            </div>

            {/* Caption - English - 始终显示 */}
            <RichTextEditor
                value={block.caption?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    caption: { ...block.caption, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="Caption (English, 可选)"
                placeholder="Code caption..."
            />

            {/* Caption - Chinese - 仅在双语模式显示 */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.caption?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        caption: { ...block.caption, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="Caption (中文, 可选)"
                    placeholder="代码说明..."
                />
            )}
        </div>
    );
}

// 7. 有序列表编辑器
function OrderedListEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    const addItem = () => {
        const newItems = [...(block.items || []), { content: { en: [], zh: [] } }];
        onChange({ ...block, items: newItems });
    };

    const removeItem = (index: number) => {
        const newItems = block.items.filter((_: any, i: number) => i !== index);
        onChange({ ...block, items: newItems });
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...block.items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        onChange({ ...block, items: newItems });
    };

    const updateItem = (index: number, lang: 'en' | 'zh', content: InlineContent[]) => {
        const newItems = [...block.items];
        newItems[index] = {
            ...newItems[index],
            content: {
                ...newItems[index].content,
                [lang]: content
            }
        };
        onChange({ ...block, items: newItems });
    };

    return (
        <div className="space-y-4">
            {/* 起始编号 */}
            <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">起始编号:</label>
                <input
                    type="number"
                    value={block.start ?? 1}
                    onChange={(e) => onChange({ ...block, start: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                />
            </div>

            {/* 列表项 */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">列表项:</label>

                {(block.items || []).map((item: any, index: number) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        {/* 列表项工具栏 */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-600">
                                项目 {(block.start ?? 1) + index}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => moveItem(index, 'up')}
                                    disabled={index === 0}
                                    className={`p-1 rounded ${index === 0
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === block.items.length - 1}
                                    className={`p-1 rounded ${index === block.items.length - 1
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

                        {/* English - 始终显示 */}
                        <div className="mb-3">
                            <RichTextEditor
                                value={item.content?.en || []}
                                onChange={(content) => updateItem(index, 'en', content)}
                                references={references}
                                allSections={allSections}
                                label="English"
                                placeholder="List item content..."
                            />
                        </div>

                        {/* Chinese - 仅在双语模式显示 */}
                        {lang === 'both' && (
                            <div>
                                <RichTextEditor
                                    value={item.content?.zh || []}
                                    onChange={(content) => updateItem(index, 'zh', content)}
                                    references={references}
                                    allSections={allSections}
                                    label="中文"
                                    placeholder="列表项内容..."
                                />
                            </div>
                        )}
                    </div>
                ))}

                {/* 添加按钮 */}
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

// 8. 无序列表编辑器
function UnorderedListEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    const addItem = () => {
        const newItems = [...(block.items || []), { content: { en: [], zh: [] } }];
        onChange({ ...block, items: newItems });
    };

    const removeItem = (index: number) => {
        const newItems = block.items.filter((_: any, i: number) => i !== index);
        onChange({ ...block, items: newItems });
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...block.items];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        onChange({ ...block, items: newItems });
    };

    const updateItem = (index: number, lang: 'en' | 'zh', content: InlineContent[]) => {
        const newItems = [...block.items];
        newItems[index] = {
            ...newItems[index],
            content: {
                ...newItems[index].content,
                [lang]: content
            }
        };
        onChange({ ...block, items: newItems });
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">列表项:</label>

            {(block.items || []).map((item: any, index: number) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    {/* 列表项工具栏 */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">
                            • 项目 {index + 1}
                        </span>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => moveItem(index, 'up')}
                                disabled={index === 0}
                                className={`p-1 rounded ${index === 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveItem(index, 'down')}
                                disabled={index === block.items.length - 1}
                                className={`p-1 rounded ${index === block.items.length - 1
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

                    {/* English - 始终显示 */}
                    <div className="mb-3">
                        <RichTextEditor
                            value={item.content?.en || []}
                            onChange={(content) => updateItem(index, 'en', content)}
                            references={references}
                            allSections={allSections}
                            label="English"
                            placeholder="List item content..."
                        />
                    </div>

                    {/* Chinese - 仅在双语模式显示 */}
                    {lang === 'both' && (
                        <div>
                            <RichTextEditor
                                value={item.content?.zh || []}
                                onChange={(content) => updateItem(index, 'zh', content)}
                                references={references}
                                allSections={allSections}
                                label="中文"
                                placeholder="列表项内容..."
                            />
                        </div>
                    )}
                </div>
            ))}

            {/* 添加按钮 */}
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

// 9. 引用块编辑器
function QuoteEditor({
    block,
    onChange,
    references,
    allSections,
    lang
}: {
    block: any;
    onChange: (b: any) => void;
    references: Reference[];
    allSections: Section[];
    lang: 'en' | 'both';
}) {
    return (
        <div className="space-y-4">
            {/* 作者 */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">作者 (可选):</label>
                <input
                    type="text"
                    value={block.author || ''}
                    onChange={(e) => onChange({ ...block, author: e.target.value })}
                    placeholder="引用来源或作者名"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                />
            </div>

            {/* 引用内容 - English - 始终显示 */}
            <RichTextEditor
                value={block.content?.en || []}
                onChange={(newContent) => onChange({
                    ...block,
                    content: { ...block.content, en: newContent }
                })}
                references={references}
                allSections={allSections}
                label="Quote Content (English)"
                placeholder="Enter quote in English..."
            />

            {/* 引用内容 - Chinese - 仅在双语模式显示 */}
            {lang === 'both' && (
                <RichTextEditor
                    value={block.content?.zh || []}
                    onChange={(newContent) => onChange({
                        ...block,
                        content: { ...block.content, zh: newContent }
                    })}
                    references={references}
                    allSections={allSections}
                    label="Quote Content (中文)"
                    placeholder="输入中文引用内容..."
                />
            )}
        </div>
    );
}
// 在 EditableBlock 组件定义之前添加这个函数

