'use client';

import React, { useEffect, useMemo, useReducer, useState } from 'react';
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
  minHeight = 180,
}: InlineEditorProps) {
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [refPickerType, setRefPickerType] = useState<ReferenceType>('citation');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState<Set<string>>(new Set());
  const [selectionTicker, bumpSelectionTicker] = useReducer((tick: number) => tick + 1, 0);

  // 禁用页面滚动（当引用选择器打开时）
  useEffect(() => {
    if (showRefPicker) {
      // 禁用页面滚动
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // 如果有滚动条，添加右边距防止抖动
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 恢复页面滚动
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [showRefPicker]);

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

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: inlineContentToTiptap(value),
    onUpdate: ({ editor: ed }) => {
      // 只更新本地状态，不触发保存
      onChange(tiptapToInlineContent(ed.getJSON()));
    },
    onSelectionUpdate: () => bumpSelectionTicker(),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        style: `min-height: ${minHeight}px; padding: 0.75rem;`,
        placeholder,
      },
    },
  });

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

    references.forEach((ref) => {
      items.push({
        id: ref.id,
        type: 'citation',
        displayText: `[${ref.number ?? ref.id}] ${ref.authors[0]}${
          ref.authors.length > 1 ? ' et al.' : ''
        } (${ref.year ?? '?'})`,
        number: ref.number,
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

        if (section.subsections?.length) walkSections(section.subsections);
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

  if (!editor) return null;

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
        <EditorContent editor={editor} />
      </div>

      {enableReferences && showRefPicker && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowRefPicker(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5 border-b flex items-center justify-between bg-linear-to-r from-blue-50 to-purple-50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  选择
                  {{
                    citation: '文献',
                    figure: '图片',
                    table: '表格',
                    equation: '公式',
                    section: '章节',
                  }[refPickerType]}
                </h3>
                {refPickerType === 'citation' && selectedCitations.size > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    已选择 {selectedCitations.size} 篇文献
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowRefPicker(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={refSearchQuery}
                  onChange={(event) => setRefSearchQuery(event.target.value)}
                  placeholder="搜索..."
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
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
                              : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400'
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
                            <div className="font-semibold text-gray-900 text-base mb-1">
                              {item.displayText}
                            </div>
                            {ref?.title && (
                              <div className="text-sm text-gray-600 mt-1 italic truncate">
                                “{ref.title}”
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2 font-mono">
                              ID: {item.id}
                              {typeof ref?.number === 'number' && ` | Number: ${ref.number}`}
                            </div>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => insertSingleReference(item)}
                        className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
                      >
                        <div className="font-semibold text-gray-900 text-base mb-1">
                          {item.displayText}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 font-mono">ID: {item.id}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {refPickerType === 'citation' && (
              <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-600">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCitations(new Set())}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                    disabled={selectedCitations.size === 0}
                  >
                    清空选择
                  </button>
                  <button
                    onClick={insertSelectedCitations}
                    disabled={selectedCitations.size === 0}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCitations.size
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    插入引用
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
