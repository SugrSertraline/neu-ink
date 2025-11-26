'use client';

import React, { useEffect, useMemo, useReducer, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import type { LucideIcon } from 'lucide-react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Palette,
  Highlighter,
  Link as LinkIcon,
  Calculator,
  FileText,
  Image,
  Table,
  Sigma,
  Hash,
  StickyNote,
  X,
  Search,
  Check,
} from 'lucide-react';
import type { InlineContent, Reference, Section } from '@/types/paper';
import { inlineContentToTiptap, tiptapToInlineContent } from './TiptapConverters';
import {
  Citation,
  FigureRef,
  TableRef,
  EquationRef,
  SectionRef,
  Footnote,
  InlineMath,
} from './TiptapExtensions';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type ReferenceType = 'citation' | 'figure' | 'table' | 'equation' | 'section';

interface ReferenceItem {
  id: string;
  type: ReferenceType;
  displayText: string;
  number?: number | string;
  data?: unknown;
}

interface InlineEditorProps {
  value: InlineContent[];
  onChange: (value: InlineContent[]) => void;
  references?: Reference[];
  allSections?: Section[];
  placeholder?: string;
  label?: string;
  enableReferences?: boolean;
  enableInlineMath?: boolean;
  enableFootnotes?: boolean;
  minHeight?: number;
}

type ToolbarItem =
  | { type: 'divider' }
  | {
      icon: LucideIcon;
      label: string;
      action: () => void;
      active?: boolean;
      shortcut?: string;
      currentColor?: string;
    };

const TEXT_COLORS = [
  { name: '默认', value: '' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '黄色', value: '#eab308' },
  { name: '绿色', value: '#22c55e' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#a855f7' },
  { name: '粉色', value: '#ec4899' },
  { name: '灰色', value: '#6b7280' },
];

const BG_COLORS = [
  { name: '无背景', value: '' },
  { name: '红色', value: '#fee2e2' },
  { name: '橙色', value: '#ffedd5' },
  { name: '黄色', value: '#fef3c7' },
  { name: '绿色', value: '#dcfce7' },
  { name: '蓝色', value: '#dbeafe' },
  { name: '紫色', value: '#f3e8ff' },
  { name: '粉色', value: '#fce7f3' },
  { name: '灰色', value: '#f3f4f6' },
];

export default function InlineEditor({
  value,
  onChange,
  references = [],
  allSections = [],
  placeholder = '输入内容...',
  label,
  enableReferences = true,
  enableInlineMath = true,
  enableFootnotes = true,
  minHeight = 72, // 约3行的高度 (24px per line)
}: InlineEditorProps) {
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [refPickerType, setRefPickerType] = useState<ReferenceType>('citation');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState<Set<string>>(new Set());
  const [selectionTicker, bumpSelectionTicker] = useReducer((tick: number) => tick + 1, 0);

  const extensions = useMemo(() => {
    const ext: AnyExtension[] = [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline cursor-pointer',
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ];

    if (enableInlineMath) ext.push(InlineMath);
    if (enableReferences) ext.push(Citation, FigureRef, TableRef, EquationRef, SectionRef);
    if (enableFootnotes) ext.push(Footnote);

    return ext;
  }, [enableInlineMath, enableReferences, enableFootnotes]);

  const editorRef = useRef<HTMLDivElement>(null);

  const updateEditorHeight = () => {
    if (editorRef.current) {
      const editorElement = editorRef.current.querySelector('.ProseMirror') as HTMLElement;
      if (editorElement) {
        // 重置高度以获取正确的 scrollHeight
        editorElement.style.height = 'auto';
        const scrollHeight = editorElement.scrollHeight;
        // 设置最小高度为 minHeight，最大高度为 500px 防止过高
        const newHeight = Math.max(minHeight, Math.min(scrollHeight, 500));
        editorElement.style.height = `${newHeight}px`;
      }
    }
  };

  const editor = useEditor({
    immediatelyRender: true, // 启用立即渲染，减少初始延迟
    extensions,
    content: inlineContentToTiptap(value),
    onUpdate: ({ editor: ed }) => {
      // 只更新本地状态，不触发保存
      onChange(tiptapToInlineContent(ed.getJSON()));
      // 内容更新后调整高度，使用 requestAnimationFrame 优化性能
      requestAnimationFrame(updateEditorHeight);
    },
    onSelectionUpdate: () => bumpSelectionTicker(),
    onCreate: ({ editor: ed }) => {
      // 编辑器创建后立即调整高度，不使用延迟
      updateEditorHeight();
      // 立即聚焦编辑器，提供更好的用户体验
      ed.commands.focus();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}px; padding: 0.75rem; overflow-y: auto;`,
        placeholder,
      },
    },
  });

  // 当外部值变化时更新高度
  useEffect(() => {
    if (editor) {
      // 使用 requestAnimationFrame 优化性能，减少延迟
      requestAnimationFrame(updateEditorHeight);
    }
  }, [value, editor]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = tiptapToInlineContent(editor.getJSON());
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(inlineContentToTiptap(value), { emitUpdate: false });
    }
  }, [value, editor]);

  const getCurrentTextColor = () => editor?.getAttributes('textStyle')?.color ?? '';
  const getCurrentBgColor = () => editor?.getAttributes('highlight')?.color ?? '';

  const availableReferences = useMemo(() => {
    if (!enableReferences) return [];
    const items: ReferenceItem[] = [];

    references.forEach((ref, index) => {
      // 如果参考文献没有 number 字段，使用索引+1作为序号
      const refNumber = ref.number ?? (index + 1);
      items.push({
        id: ref.id,
        type: 'citation',
        displayText: `[${refNumber}] ${ref.authors[0]}${
          ref.authors.length > 1 ? ' et al.' : ''
        } (${ref.year ?? '?'})`,
        number: refNumber,
        data: ref,
      });
    });

    const walkSections = (sections: Section[]) => {
      sections.forEach((section) => {
        items.push({
          id: section.id,
          type: 'section',
          displayText: `${section.number ? `${section.number} ` : ''}${
            section.title ?? section.id
          }`,
          number: section.number,
          data: section,
        });

        section.content.forEach((block: any) => {
          if (block.type === 'figure') {
            items.push({
              id: block.id,
              type: 'figure',
              displayText: `Figure ${block.number ?? '?'}`,
              number: block.number,
              data: block,
            });
          }
          if (block.type === 'table') {
            items.push({
              id: block.id,
              type: 'table',
              displayText: `Table ${block.number ?? '?'}`,
              number: block.number,
              data: block,
            });
          }
          if (block.type === 'math' && block.label) {
            items.push({
              id: block.id,
              type: 'equation',
              displayText: `Equation ${block.number ?? block.label}`,
              number: block.number ?? block.label,
              data: block,
            });
          }
        });
      });
    };

    walkSections(allSections);

    return items;
  }, [references, allSections, enableReferences]);

  const filteredReferences = useMemo(() => {
    if (!enableReferences) return [];
    const query = refSearchQuery.trim().toLowerCase();
    return availableReferences
      .filter((item) => item.type === refPickerType)
      .filter((item) => {
        if (!query) return true;
        return (
          item.displayText.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      });
  }, [availableReferences, refPickerType, refSearchQuery, enableReferences]);

  const insertLink = () => {
    if (!editor) return;
    const url = window.prompt('请输入链接地址：');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const insertInlineMath = () => {
    if (!editor || !enableInlineMath) return;
    const latex = window.prompt('请输入 LaTeX 公式：');
    if (latex) {
      editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { latex } }).run();
    }
  };

  const toggleCitationSelection = (citationId: string) => {
    setSelectedCitations((prev) => {
      const next = new Set(prev);
      if (next.has(citationId)) next.delete(citationId);
      else next.add(citationId);
      return next;
    });
  };

  const insertSelectedCitations = () => {
    if (!editor || selectedCitations.size === 0) return;

    const selectedRefs = Array.from(selectedCitations)
      .map((id) => references.find((ref) => ref.id === id))
      .filter((ref): ref is Reference => Boolean(ref))
      .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

    const numbers = selectedRefs
      .map((ref) => ref.number)
      .filter((n): n is number => typeof n === 'number');

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'citation',
        attrs: {
          referenceIds: selectedRefs.map((ref) => ref.id),
          displayText: numbers.length ? `[${numbers.join(',')}]` : '',
        },
      })
      .run();

    setShowRefPicker(false);
    setSelectedCitations(new Set());
  };

  const insertSingleReference = (item: ReferenceItem) => {
    if (!editor || item.type === 'citation') return;

    const attrMap: Record<Exclude<ReferenceType, 'citation'>, string> = {
      figure: 'figureId',
      table: 'tableId',
      equation: 'equationId',
      section: 'sectionId',
    };

    const attrKey = attrMap[item.type];
    editor
      .chain()
      .focus()
      .insertContent({
        type: `${item.type}Ref`,
        attrs: {
          [attrKey]: item.id,
          displayText: item.displayText,
        },
      })
      .run();

    setShowRefPicker(false);
  };

  const insertFootnote = () => {
    if (!editor || !enableFootnotes) return;
    const content = window.prompt('输入脚注内容：');
    if (!content) return;
    const displayText = window.prompt('脚注序号（可选）：') ?? '1';

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'footnote',
        attrs: {
          id: `fn_${Date.now()}`,
          content,
          displayText,
        },
      })
      .run();
  };

  const openRefPicker = (type: ReferenceType) => {
    if (!enableReferences) return;
    setRefPickerType(type);
    setRefSearchQuery('');
    setSelectedCitations(new Set());
    setShowRefPicker(true);
  };

  const tools: ToolbarItem[] = useMemo(() => {
    if (!editor) return [];

    const base: ToolbarItem[] = [
      {
        icon: Bold,
        label: '粗体',
        action: () => editor.chain().focus().toggleBold().run(),
        active: editor.isActive('bold'),
        shortcut: 'Ctrl+B',
      },
      {
        icon: Italic,
        label: '斜体',
        action: () => editor.chain().focus().toggleItalic().run(),
        active: editor.isActive('italic'),
        shortcut: 'Ctrl+I',
      },
      {
        icon: UnderlineIcon,
        label: '下划线',
        action: () => editor.chain().focus().toggleUnderline().run(),
        active: editor.isActive('underline'),
        shortcut: 'Ctrl+U',
      },
      {
        icon: Strikethrough,
        label: '删除线',
        action: () => editor.chain().focus().toggleStrike().run(),
        active: editor.isActive('strike'),
      },
      {
        icon: Code,
        label: '行内代码',
        action: () => editor.chain().focus().toggleCode().run(),
        active: editor.isActive('code'),
      },
      { type: 'divider' },
      {
        icon: Palette,
        label: '文字颜色',
        action: () => setShowColorPicker((v) => !v),
        active: Boolean(getCurrentTextColor()),
        currentColor: getCurrentTextColor(),
      },
      {
        icon: Highlighter,
        label: '背景颜色',
        action: () => setShowBgPicker((v) => !v),
        active: Boolean(getCurrentBgColor()),
        currentColor: getCurrentBgColor(),
      },
      { type: 'divider' },
      {
        icon: LinkIcon,
        label: '链接',
        action: insertLink,
        active: editor.isActive('link'),
      },
    ];

    if (enableInlineMath) {
      base.push({
        icon: Calculator,
        label: '行内公式',
        action: insertInlineMath,
      });
    }

    if (enableReferences) {
      base.push(
        { type: 'divider' },
        {
          icon: FileText,
          label: '文献引用',
          action: () => openRefPicker('citation'),
        },
        {
          icon: Image,
          label: '图片引用',
          action: () => openRefPicker('figure'),
        },
        {
          icon: Table,
          label: '表格引用',
          action: () => openRefPicker('table'),
        },
        {
          icon: Sigma,
          label: '公式引用',
          action: () => openRefPicker('equation'),
        },
        {
          icon: Hash,
          label: '章节引用',
          action: () => openRefPicker('section'),
        },
      );
    }

    if (enableFootnotes) {
      base.push({
        icon: StickyNote,
        label: '脚注',
        action: insertFootnote,
      });
    }

    return base;
  }, [
    editor,
    enableInlineMath,
    enableReferences,
    enableFootnotes,
    selectionTicker,
  ]);

  // 添加加载状态指示器，但确保编辑器能够快速显示
  if (!editor) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <div className="flex items-center gap-1 p-2 bg-white border border-gray-300 rounded-t-lg flex-wrap relative shadow-sm z-10">
          <div className="text-xs text-gray-400">正在加载编辑器...</div>
        </div>
        <div className="border border-gray-300 rounded-b-lg bg-white shadow-sm">
          <div
            className="prose prose-sm max-w-none focus:outline-none p-3"
            style={{ minHeight: `${minHeight}px` }}
            dangerouslySetInnerHTML={{
              __html: value.map(item => {
                if (item.type === 'text') return item.content;
                if (item.type === 'link') return item.children?.map(child => child.type === 'text' ? child.content : '').join('') || '';
                if (item.type === 'citation') return item.displayText;
                if (item.type === 'inline-math') return `$${item.latex}$`;
                if (item.type === 'figure-ref') return item.displayText;
                if (item.type === 'table-ref') return item.displayText;
                if (item.type === 'section-ref') return item.displayText;
                if (item.type === 'equation-ref') return item.displayText;
                if (item.type === 'footnote') return item.displayText;
                return '';
              }).join('') || placeholder
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="flex items-center gap-1 p-2 bg-white border border-gray-300 rounded-t-lg flex-wrap relative shadow-sm z-10">
        {tools.map((tool, idx) => {
          if ('type' in tool) {
            return <div key={`divider-${idx}`} className="w-px h-6 bg-gray-300 mx-1" />;
          }

          const title = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;

          return (
            <div key={tool.label} className="relative">
              <button
                type="button"
                onClick={tool.action}
                className={`p-1.5 hover:bg-gray-100 rounded transition-colors relative ${
                  tool.active ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                }`}
                title={title}
              >
                <tool.icon className="w-4 h-4" />
                {tool.currentColor && (
                  <span
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white"
                    style={{ backgroundColor: tool.currentColor }}
                  />
                )}
              </button>

              {tool.label === '文字颜色' && showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-300 p-3 w-52 z-50">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">文字颜色</div>
                  <div className="grid grid-cols-3 gap-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value || 'default'}
                        type="button"
                        onClick={() => {
                          if (color.value) editor.chain().focus().setColor(color.value).run();
                          else editor.chain().focus().unsetColor().run();
                          setShowColorPicker(false);
                        }}
                        className={`h-9 rounded-md border-2 hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center text-sm font-semibold shadow-sm ${
                          getCurrentTextColor() === color.value
                            ? 'border-blue-500 ring-2 ring-blue-400'
                            : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: color.value || '#fff',
                          color: color.value ? '#fff' : '#374151',
                        }}
                        title={color.name}
                      >
                        {color.value ? 'A' : '默认'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tool.label === '背景颜色' && showBgPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-300 p-3 w-52 z-50">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">背景颜色</div>
                  <div className="grid grid-cols-3 gap-2">
                    {BG_COLORS.map((color) => (
                      <button
                        key={color.value || 'none'}
                        type="button"
                        onClick={() => {
                          if (color.value) {
                            editor.chain().focus().setHighlight({ color: color.value }).run();
                          } else {
                            editor.chain().focus().unsetHighlight().run();
                          }
                          setShowBgPicker(false);
                        }}
                        className={`h-9 rounded-md border-2 hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify中心 text-sm font-semibold shadow-sm ${
                          getCurrentBgColor() === color.value
                            ? 'border-blue-500 ring-2 ring-blue-400'
                            : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: color.value || '#fff',
                          color: '#374151',
                        }}
                        title={color.name}
                      >
                        {color.value ? 'Aa' : '无'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border border-gray-300 rounded-b-lg bg-white shadow-sm">
        <div ref={editorRef}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {enableReferences && (
        <Dialog open={showRefPicker} onOpenChange={setShowRefPicker}>
          <DialogContent className="w-[92vw] sm:max-w-[960px] border-none bg-transparent p-0 shadow-none max-h-[80vh]">
            <DialogTitle className="sr-only">选择引用</DialogTitle>
            <DialogDescription className="sr-only">
              选择要插入的引用内容
            </DialogDescription>
            
            <div className="relative overflow-hidden rounded-2xl">
              {/* 柔和白色光晕（不拦截事件） */}
              <div className="pointer-events-none absolute -inset-20 -z-10 bg-white/40 blur-3xl" />
              
              {/* 面板：固定高度、列布局，中间滚动，底部固定 */}
              <div className="relative rounded-2xl border border-white/70 bg-white/82 shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl h-[80vh] flex flex-col min-h-0">
                {/* 顶部：固定 */}
                <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-white/60 relative z-10">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/70 bg-white/80 shadow-[0_12px_30px_rgba(40,65,138,0.18)] backdrop-blur-xl">
                    <FileText className="h-5 w-5 text-[#28418A]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-800">
                      选择{{
                        citation: '文献',
                        figure: '图片',
                        table: '表格',
                        equation: '公式',
                        section: '章节',
                      }[refPickerType]}引用
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {refPickerType === 'citation' && selectedCitations.size > 0
                        ? `已选择 ${selectedCitations.size} 篇文献`
                        : '搜索并选择要插入的引用内容'
                      }
                    </p>
                  </div>
                </div>

                {/* 搜索框 */}
                <div className="px-6 py-4 border-b border-white/60 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={refSearchQuery}
                      onChange={(event) => setRefSearchQuery(event.target.value)}
                      placeholder="搜索..."
                      className="w-full pl-11 pr-4 py-2.5 border border-white/70 bg-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4769b8]/35 text-base shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl"
                      autoFocus
                    />
                  </div>
                </div>

                {/* 内容：可滚动 */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                  {filteredReferences.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <div className="text-5xl mb-3">📭</div>
                      <div className="text-lg">没有找到可引用的内容</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredReferences.map((item) => {
                        if (item.type === 'citation') {
                          const isSelected = selectedCitations.has(item.id);
                          const ref = item.data as Reference | undefined;

                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleCitationSelection(item.id)}
                              className={`w-full text-left p-4 border-2 rounded-xl transition-all shadow-sm hover:shadow-md flex items-start gap-3 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-white/70 hover:bg-blue-50 hover:border-blue-400 bg-white/80'
                              }`}
                            >
                              <div
                                className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all ${
                                  isSelected
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-700">
                                  {typeof ref?.number === 'number' ? `[${ref.number}] ` : '[?] '}
                                  {ref?.originalText || item.displayText}
                                </div>
                              </div>
                            </button>
                          );
                        }

                        // 获取元素信息用于显示缩略图
                        const getElementInfo = () => {
                          const element = document.getElementById(item.id);
                          if (!element) return null;
                          
                          if (item.type === 'figure') {
                            const imgElement = element.querySelector('img') as HTMLImageElement | null;
                            const numberElement = element.querySelector('.text-gray-800');
                            return {
                              img: imgElement,
                              number: numberElement?.textContent?.replace('Figure ', '').replace('.', '') || item.number || '?'
                            };
                          }
                          
                          if (item.type === 'table') {
                            const numberElement = element.querySelector('.text-gray-800');
                            return {
                              number: numberElement?.textContent?.replace('Table ', '').replace('.', '') || item.number || '?'
                            };
                          }
                          
                          if (item.type === 'equation') {
                            const numberElement = element.querySelector('.text-gray-500');
                            return {
                              number: numberElement?.textContent?.replace(/[()]/g, '') || item.number || '?'
                            };
                          }
                          
                          return { number: item.number };
                        };
                        
                        const elementInfo = getElementInfo();
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => insertSingleReference(item)}
                            className="w-full text-left p-4 border-2 border-white/70 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm hover:shadow-md bg-white/80"
                          >
                            <div className="flex items-start gap-3">
                              {/* 缩略图区域 */}
                              {item.type === 'figure' && elementInfo?.img && (
                                <div className="shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                  <img
                                    src={elementInfo.img.currentSrc || elementInfo.img.src}
                                    alt="figure thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              
                              {item.type === 'table' && (
                                <div className="shrink-0 w-16 h-16 bg-orange-50 rounded-md border border-orange-200 flex items-center justify-center">
                                  <Table className="w-8 h-8 text-orange-600" />
                                </div>
                              )}
                              
                              {item.type === 'equation' && (
                                <div className="shrink-0 w-16 h-16 bg-indigo-50 rounded-md border border-indigo-200 flex items-center justify-center">
                                  <Sigma className="w-8 h-8 text-indigo-600" />
                                </div>
                              )}
                              
                              {/* 文本信息区域 */}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-base mb-1">
                                  {item.type === 'figure' && `Figure ${elementInfo?.number || '?'}`}
                                  {item.type === 'table' && `Table ${elementInfo?.number || '?'}`}
                                  {item.type === 'equation' && `Equation ${elementInfo?.number || '?'}`}
                                  {item.type === 'section' && `Section ${elementInfo?.number || ''}`}
                                </div>
                                
                                {/* 额外描述信息 */}
                                {item.type === 'figure' && (item.data as any)?.caption?.en && (
                                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {(item.data as any).caption.en.map((node: any) => node.content).join(' ')}
                                  </div>
                                )}
                                
                                {item.type === 'table' && (item.data as any)?.caption?.en && (
                                  <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {(item.data as any).caption.en.map((node: any) => node.content).join(' ')}
                                  </div>
                                )}
                                
                                {item.type === 'equation' && (item.data as any)?.latex && (
                                  <div className="text-xs text-gray-500 mt-1 font-mono line-clamp-1">
                                    ${(item.data as any).latex}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 底部：固定（按钮始终靠右） */}
                {refPickerType === 'citation' && (
                  <div className="px-6 py-4 border-t border-white/60 bg-white/82 backdrop-blur-2xl relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-slate-600">
                        {selectedCitations.size > 0 ? (
                          <>
                            已选择{' '}
                            <span className="font-bold text-blue-600">
                              {selectedCitations.size}
                            </span>{' '}
                            篇文献
                          </>
                        ) : (
                          '请选择要引用的文献'
                        )}
                      </div>
                      
                      <div className="ml-auto flex items-center gap-3">
                        <button
                          onClick={() => setSelectedCitations(new Set())}
                          className="rounded-xl border border-white/70 bg-white/80 px-4 py-2 text-sm text-[#28418A] shadow-[0_8px_20px_rgba(40,65,138,0.12)] hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={selectedCitations.size === 0}
                        >
                          清空选择
                        </button>
                        <button
                          onClick={insertSelectedCitations}
                          disabled={selectedCitations.size === 0}
                          className={`rounded-xl bg-linear-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.35)] border border-white/70 text-white px-6 py-2 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                            selectedCitations.size ? '' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          插入引用
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
