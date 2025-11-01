'use client';

import React, { useEffect, useMemo, useState, useReducer } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Palette, Highlighter, Link as LinkIcon, Calculator,
  FileText, Image, Table, Sigma, Hash, StickyNote, X, Search, Check
} from 'lucide-react';

// ✅ 修复：更新导入路径
import type { InlineContent, Reference, Section } from '@/types/paper';
import { inlineContentToTiptap, tiptapToInlineContent } from './TiptapConverters';
import { Citation, FigureRef, TableRef, EquationRef, SectionRef, Footnote, InlineMath } from './TiptapExtensions';

interface RichTextEditorProps {
  value: InlineContent[];
  onChange: (value: InlineContent[]) => void;
  references?: Reference[];
  allSections?: Section[];
  placeholder?: string;
  label?: string;
}

type ReferenceType = 'citation' | 'figure' | 'table' | 'equation' | 'section' | 'footnote';

interface ReferenceItem {
  id: string;
  type: ReferenceType;
  displayText: string;
  number?: number | string;
  data?: any;
}

export default function RichTextEditor({
  value,
  onChange,
  references = [],
  allSections = [],
  placeholder = '输入内容...',
  label
}: RichTextEditorProps) {
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [refPickerType, setRefPickerType] = useState<ReferenceType>('citation');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState<Set<string>>(new Set());
  const [updateCounter, forceUpdate] = useReducer((x: number) => x + 1, 0);

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

  const editor = useEditor({
    immediatelyRender: false, // ✅ 关键修复：避免 SSR 水合错误
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
        bulletList: false,
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
      Citation,
      FigureRef,
      TableRef,
      EquationRef,
      SectionRef,
      Footnote,
      InlineMath,
    ],
    content: inlineContentToTiptap(value),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const content = tiptapToInlineContent(json);
      onChange(content);
    },
    onSelectionUpdate: () => {
      forceUpdate();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[240px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentContent = tiptapToInlineContent(editor.getJSON());
      const newContent = JSON.stringify(value);
      const oldContent = JSON.stringify(currentContent);
      
      if (newContent !== oldContent) {
        editor.commands.setContent(inlineContentToTiptap(value));
      }
    }
  }, [value, editor]);

  const getCurrentTextColor = (): string => {
    if (!editor) return '';
    const color = editor.getAttributes('textStyle').color;
    return color || '';
  };

  const getCurrentBgColor = (): string => {
    if (!editor) return '';
    const highlight = editor.getAttributes('highlight').color;
    return highlight || '';
  };

  const availableReferences = useMemo(() => {
    const items: ReferenceItem[] = [];

    references.forEach(ref => {
      items.push({
        id: ref.id,
        type: 'citation',
        displayText: `[${ref.number || ref.id}] ${ref.authors[0]}${ref.authors.length > 1 ? ' et al.' : ''} (${ref.year || '?'})`,
        number: ref.number,
        data: ref
      });
    });

    const extractBlocks = (sections: Section[]) => {
      sections.forEach(section => {
        items.push({
          id: section.id,
          type: 'section',
          displayText: `${section.number ? section.number + ' ' : ''}${section.title.en || section.title.zh || section.id}`,
          number: section.number,
          data: section
        });

        section.content.forEach(block => {
          if (block.type === 'figure') {
            items.push({
              id: block.id,
              type: 'figure',
              displayText: `Figure ${block.number || '?'}`,
              number: block.number,
              data: block
            });
          } else if (block.type === 'table') {
            items.push({
              id: block.id,
              type: 'table',
              displayText: `Table ${block.number || '?'}`,
              number: block.number,
              data: block
            });
          } else if (block.type === 'math' && block.label) {
            items.push({
              id: block.id,
              type: 'equation',
              displayText: `Equation ${block.number || block.label}`,
              number: block.number,
              data: block
            });
          }
        });

        if (section.subsections) {
          extractBlocks(section.subsections);
        }
      });
    };

    extractBlocks(allSections);

    return items;
  }, [references, allSections]);

  const filteredReferences = useMemo(() => {
    return availableReferences
      .filter(item => item.type === refPickerType)
      .filter(item =>
        refSearchQuery === '' ||
        item.displayText.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(refSearchQuery.toLowerCase())
      );
  }, [availableReferences, refPickerType, refSearchQuery]);

  const insertLink = () => {
    if (!editor) return;
    const url = prompt('请输入链接地址：');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const insertInlineMath = () => {
    if (!editor) return;
    const latex = prompt('请输入 LaTeX 公式：');
    if (latex) {
      editor.chain().focus().insertContent({
        type: 'inlineMath',
        attrs: { latex },
      }).run();
    }
  };

  const toggleCitationSelection = (citationId: string) => {
    setSelectedCitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(citationId)) {
        newSet.delete(citationId);
      } else {
        newSet.add(citationId);
      }
      return newSet;
    });
  };

  const insertSelectedCitations = () => {
    if (!editor || selectedCitations.size === 0) return;

    const selectedRefs = Array.from(selectedCitations)
      .map(id => references.find(r => r.id === id))
      .filter(ref => ref !== undefined)
      .sort((a, b) => (a!.number || 0) - (b!.number || 0));

    const numbers = selectedRefs.map(ref => ref!.number).filter(num => num !== undefined);
    const displayText = numbers.length > 0 ? `[${numbers.join(',')}]` : '';
    const referenceIds = selectedRefs.map(ref => ref!.id);

    editor.chain().focus().insertContent({
      type: 'citation',
      attrs: {
        referenceIds: referenceIds,
        displayText: displayText,
      },
    }).run();

    setShowRefPicker(false);
    setSelectedCitations(new Set());
  };

  const insertSingleReference = (item: ReferenceItem) => {
    if (!editor) return;
    
    switch (item.type) {
      case 'figure':
        editor.chain().focus().insertContent({
          type: 'figureRef',
          attrs: {
            figureId: item.id,
            displayText: item.displayText,
          },
        }).run();
        break;
      case 'table':
        editor.chain().focus().insertContent({
          type: 'tableRef',
          attrs: {
            tableId: item.id,
            displayText: item.displayText,
          },
        }).run();
        break;
      case 'equation':
        editor.chain().focus().insertContent({
          type: 'equationRef',
          attrs: {
            equationId: item.id,
            displayText: item.displayText,
          },
        }).run();
        break;
      case 'section':
        editor.chain().focus().insertContent({
          type: 'sectionRef',
          attrs: {
            sectionId: item.id,
            displayText: item.displayText,
          },
        }).run();
        break;
    }
    setShowRefPicker(false);
  };

  const insertFootnote = () => {
    if (!editor) return;
    const content = prompt('输入脚注内容：');
    if (!content) return;
    const num = prompt('脚注序号（可选）：') || '1';
    
    editor.chain().focus().insertContent({
      type: 'footnote',
      attrs: {
        id: `fn_${Date.now()}`,
        content,
        displayText: num,
      },
    }).run();
  };

  const openRefPicker = (type: ReferenceType) => {
    setRefPickerType(type);
    setRefSearchQuery('');
    setSelectedCitations(new Set());
    setShowRefPicker(true);
  };

  const tools = useMemo(() => {
    if (!editor) return [];
    
    const currentTextColor = getCurrentTextColor();
    const currentBgColor = getCurrentBgColor();
    
    return [
      { icon: Bold, label: '粗体', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), shortcut: 'Ctrl+B' },
      { icon: Italic, label: '斜体', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), shortcut: 'Ctrl+I' },
      { icon: UnderlineIcon, label: '下划线', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), shortcut: 'Ctrl+U' },
      { icon: Strikethrough, label: '删除线', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
      { icon: Code, label: '行内代码', action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code') },
      { type: 'divider' },
      { 
        icon: Palette, 
        label: '文字颜色', 
        action: () => setShowColorPicker(!showColorPicker),
        active: currentTextColor !== '',
        currentColor: currentTextColor
      },
      { 
        icon: Highlighter, 
        label: '背景颜色', 
        action: () => setShowBgPicker(!showBgPicker),
        active: currentBgColor !== '',
        currentColor: currentBgColor
      },
      { type: 'divider' },
      { icon: LinkIcon, label: '链接', action: insertLink, active: editor.isActive('link') },
      { icon: Calculator, label: '行内公式', action: insertInlineMath },
      { type: 'divider' },
      { icon: FileText, label: '文献引用', action: () => openRefPicker('citation') },
      { icon: Image, label: '图片引用', action: () => openRefPicker('figure') },
      { icon: Table, label: '表格引用', action: () => openRefPicker('table') },
      { icon: Sigma, label: '公式引用', action: () => openRefPicker('equation') },
      { icon: Hash, label: '章节引用', action: () => openRefPicker('section') },
      { icon: StickyNote, label: '脚注', action: insertFootnote },
    ];
  }, [editor, showColorPicker, showBgPicker, updateCounter]);

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* 工具栏 */}
      <div className="flex items-center gap-1 p-2 bg-white border border-gray-300 rounded-t-lg flex-wrap relative shadow-sm top-0 z-10">
        {tools.map((tool, i) =>
          tool.type === 'divider' ? (
            <div key={i} className="w-px h-6 bg-gray-300 mx-1" />
          ) : (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={tool.action}
                className={`p-1.5 hover:bg-gray-100 rounded transition-colors relative ${
                  tool.active ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                }`}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              >
                {tool.icon && <tool.icon className="w-4 h-4" />}
                {tool.currentColor && (
                  <span 
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white"
                    style={{ backgroundColor: tool.currentColor }}
                  />
                )}
              </button>

              {/* 文字颜色选择器 */}
              {tool.label === '文字颜色' && showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-300 p-3 w-52 z-50">
                  <div className="text-xs text-gray-600 mb-2 font-semibold">文字颜色</div>
                  <div className="grid grid-cols-3 gap-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value || 'default'}
                        type="button"
                        onClick={() => {
                          if (color.value) {
                            editor.chain().focus().setColor(color.value).run();
                          } else {
                            editor.chain().focus().unsetColor().run();
                          }
                          setShowColorPicker(false);
                        }}
                        className={`h-9 rounded-md border-2 hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center text-sm font-semibold shadow-sm ${
                          getCurrentTextColor() === color.value ? 'border-blue-500 ring-2 ring-blue-400' : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: color.value || '#fff',
                          color: color.value ? '#fff' : '#374151'
                        }}
                        title={color.name}
                      >
                        {color.value ? 'A' : '默认'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 背景颜色选择器 */}
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
                        className={`h-9 rounded-md border-2 hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center text-sm font-semibold shadow-sm ${
                          getCurrentBgColor() === color.value ? 'border-blue-500 ring-2 ring-blue-400' : 'border-gray-300'
                        }`}
                        style={{
                          backgroundColor: color.value || '#fff',
                          color: '#374151'
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
          )
        )}
      </div>

      {/* 编辑器 */}
      <div className="border border-gray-300 rounded-b-lg bg-white shadow-sm">
        <EditorContent editor={editor} />
      </div>

      {/* 引用选择器模态框 */}
      {showRefPicker && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowRefPicker(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  选择{refPickerType === 'citation' ? '文献' :
                    refPickerType === 'figure' ? '图片' :
                      refPickerType === 'table' ? '表格' :
                        refPickerType === 'equation' ? '公式' : '章节'}
                </h3>
                {refPickerType === 'citation' && selectedCitations.size > 0 && (
                  <p className="text-sm text-blue-600 mt-1">
                    已选择 {selectedCitations.size} 篇文献
                  </p>
                )}
              </div>
              <button onClick={() => setShowRefPicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={refSearchQuery}
                  onChange={(e) => setRefSearchQuery(e.target.value)}
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
                  {filteredReferences.map(item => {
                    if (item.type === 'citation') {
                      const isSelected = selectedCitations.has(item.id);
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
                          <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all ${
                            isSelected 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-base mb-1">{item.displayText}</div>
                            {item.data?.title && (
                              <div className="text-sm text-gray-600 mt-1 italic truncate">"{item.data.title}"</div>
                            )}
                            <div className="text-xs text-gray-500 mt-2 font-mono">
                              ID: {item.id} {item.data?.number && `| Number: ${item.data.number}`}
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
                        <div className="font-semibold text-gray-900 text-base mb-1">{item.displayText}</div>
                        {item.data?.title && (
                          <div className="text-sm text-gray-600 mt-1 italic">"{item.data.title}"</div>
                        )}
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
                    <span>已选择 <span className="font-bold text-blue-600">{selectedCitations.size}</span> 篇文献</span>
                  ) : (
                    <span>请选择要引用的文献</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCitations(new Set())}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={selectedCitations.size === 0}
                  >
                    清空选择
                  </button>
                  <button
                    onClick={insertSelectedCitations}
                    disabled={selectedCitations.size === 0}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCitations.size > 0
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