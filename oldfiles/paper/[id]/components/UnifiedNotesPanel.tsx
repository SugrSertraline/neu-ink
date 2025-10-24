// app/papers/[id]/components/UnifiedNotesPanel.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { X, Save, Plus, Trash2, Tag, Edit3, FileText, FolderOpen, AlertCircle, ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'easymde/dist/easymde.min.css';
import 'highlight.js/styles/github.css';
import type { BlockNote, ChecklistNote, PaperContent } from '../../../types/paper';
import type { ChecklistNode } from '@/app/types/checklist';

const SimpleMDE = dynamic(() => import('react-simplemde-editor'), {
  ssr: false,
});

type NoteMode = 'block' | 'checklist';

interface UnifiedNotesPanelProps {
  content: PaperContent;
  mode: NoteMode;
  activeBlockId: string | null;
  activeChecklistId: string | null;
  checklists: ChecklistNode[];
  onClose: () => void;
  onContentUpdate: (content: PaperContent) => Promise<boolean>;
  onChecklistChange?: (checklistId: string | null) => void;
  isSaving: boolean;
}

export default function UnifiedNotesPanel({
  content,
  mode,
  activeBlockId,
  activeChecklistId,
  checklists,
  onClose,
  onContentUpdate,
  onChecklistChange,
  isSaving,
}: UnifiedNotesPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [selectorOpen, setSelectorOpen] = useState(false);
  
  // 添加 ref 存储编辑器实例和初始值
  const mdeInstanceRef = useRef<any>(null);
  const initialContentRef = useRef<string>('');
  const [editorKey, setEditorKey] = useState(0);

  // 获取当前选中的清单信息
  const selectedChecklist = useMemo(() => {
    return checklists.find(c => c.id === activeChecklistId);
  }, [checklists, activeChecklistId]);

  // 获取当前的笔记列表（段落模式）
  const currentBlockNotes = useMemo(() => {
    if (mode === 'block' && activeBlockId) {
      return (content.blockNotes || []).filter(note => note.blockId === activeBlockId);
    }
    return [];
  }, [mode, content.blockNotes, activeBlockId]);

  // 获取单个清单笔记
  const currentChecklistNote = useMemo(() => {
    if (mode === 'checklist' && activeChecklistId) {
      return (content.checklistNotes || []).find(note => note.checklistId === activeChecklistId);
    }
    return null;
  }, [mode, content.checklistNotes, activeChecklistId]);

  // Markdown 编辑器配置
  const editorOptions = useMemo(() => {
    return {
      spellChecker: false,
      placeholder: '在此输入笔记内容（支持 Markdown）...',
      status: false,
      toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'image', 'code', 'table', '|',
        'preview', 'side-by-side', 'fullscreen',
      ] as any,
      autofocus: true,
      minHeight: mode === 'block' ? '200px' : '300px',
    } as any;
  }, [mode]);

  // 创建新笔记
  const handleCreateNote = () => {
    setIsEditing(true);
    setEditingNoteId(null);
    setEditContent('');
    setEditTags([]);
    initialContentRef.current = '';
    setEditorKey(prev => prev + 1);
  };

  // 编辑已有笔记
  const handleEditNote = (note: BlockNote | ChecklistNote) => {
    setIsEditing(true);
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditTags(note.tags || []);
    initialContentRef.current = note.content;
    setEditorKey(prev => prev + 1);
  };

  // 添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  // 保存笔记
  const handleSaveNote = async () => {
    // 从编辑器实例获取最新内容
    const currentContent = mdeInstanceRef.current?.value() || editContent;
    
    if (!currentContent.trim()) {
      alert('笔记内容不能为空');
      return;
    }

    let updatedContent: PaperContent;

    if (mode === 'block' && activeBlockId) {
      // 段落笔记
      let updatedBlockNotes: BlockNote[];

      if (editingNoteId) {
        updatedBlockNotes = (content.blockNotes || []).map(note =>
          note.id === editingNoteId
            ? { ...note, content: currentContent, tags: editTags, updatedAt: new Date().toISOString() }
            : note
        );
      } else {
        const newNote: BlockNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          blockId: activeBlockId,
          content: currentContent,
          tags: editTags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedBlockNotes = [...(content.blockNotes || []), newNote];
      }

      updatedContent = { ...content, blockNotes: updatedBlockNotes };
    } else if (mode === 'checklist' && activeChecklistId && selectedChecklist) {
      // 清单笔记
      let updatedChecklistNotes: ChecklistNote[];

      if (currentChecklistNote) {
        updatedChecklistNotes = (content.checklistNotes || []).map(note =>
          note.checklistId === activeChecklistId
            ? { ...note, content: currentContent, tags: editTags, updatedAt: new Date().toISOString() }
            : note
        );
      } else {
        const newNote: ChecklistNote = {
          id: `checklist-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          checklistId: activeChecklistId,
          checklistPath: selectedChecklist.fullPath,
          content: currentContent,
          tags: editTags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedChecklistNotes = [...(content.checklistNotes || []), newNote];
      }

      updatedContent = { ...content, checklistNotes: updatedChecklistNotes };
    } else {
      return;
    }

    const success = await onContentUpdate(updatedContent);

    if (success) {
      setIsEditing(false);
      setEditingNoteId(null);
      setEditContent('');
      initialContentRef.current = '';
      alert('✓ 笔记保存成功！');
    } else {
      alert('❌ 保存失败，请重试');
    }
  };

  // 删除笔记
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return;

    let updatedContent: PaperContent;

    if (mode === 'block') {
      const updatedBlockNotes = (content.blockNotes || []).filter(note => note.id !== noteId);
      updatedContent = { ...content, blockNotes: updatedBlockNotes };
    } else {
      const updatedChecklistNotes = (content.checklistNotes || []).filter(note => note.id !== noteId);
      updatedContent = { ...content, checklistNotes: updatedChecklistNotes };
    }

    const success = await onContentUpdate(updatedContent);

    if (success) {
      alert('✓ 笔记已删除！');
    } else {
      alert('❌ 删除失败，请重试');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    const currentContent = mdeInstanceRef.current?.value() || editContent;
    if (currentContent.trim() && !confirm('有未保存的更改，确定要放弃吗？')) {
      return;
    }
    setIsEditing(false);
    setEditingNoteId(null);
    setEditContent('');
    initialContentRef.current = '';
  };

  // 渲染清单选择器（使用原有 ChecklistSelector 风格）
  const renderChecklistSelector = () => {
    if (mode !== 'checklist') return null;

    return (
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
        <div className="relative">
          <button
            onClick={() => setSelectorOpen(!selectorOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FolderOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                {selectedChecklist ? selectedChecklist.fullPath : '选择清单...'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {selectorOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSelectorOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                {checklists.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">
                    该论文未添加到任何清单
                  </div>
                ) : (
                  <div className="py-2">
                    {checklists.map((checklist) => (
                      <button
                        key={checklist.id}
                        onClick={() => {
                          onChecklistChange?.(checklist.id);
                          setSelectorOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                          activeChecklistId === checklist.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {checklist.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 truncate">
                              {checklist.fullPath}
                            </div>
                          </div>
                          {activeChecklistId === checklist.id && (
                            <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // 渲染提示信息
  const renderEmptyState = () => {
    if (mode === 'block' && !activeBlockId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
          <p className="text-gray-700 dark:text-slate-300 font-medium mb-2">
            请先选择段落
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            点击论文中的任意段落来查看或添加笔记
          </p>
        </div>
      );
    }

    if (mode === 'checklist' && !activeChecklistId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <FolderOpen className="w-12 h-12 text-emerald-500 mb-4" />
          <p className="text-gray-700 dark:text-slate-300 font-medium mb-2">
            请选择清单
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            在上方下拉框中选择一个清单来查看或编辑笔记
          </p>
        </div>
      );
    }

    return null;
  };

  // 获取标题和图标
  const getHeaderInfo = () => {
    if (mode === 'block') {
      return {
        icon: <FileText className="w-5 h-5 text-blue-600" />,
        title: '段落笔记',
        color: 'blue',
      };
    } else {
      return {
        icon: <FolderOpen className="w-5 h-5 text-emerald-600" />,
        title: '清单笔记',
        subtitle: selectedChecklist?.fullPath || '',
        color: 'emerald',
      };
    }
  };

  const headerInfo = getHeaderInfo();
  const shouldShowContent = (mode === 'block' && activeBlockId) || (mode === 'checklist' && activeChecklistId);

  return (
    <div className="w-96 h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {headerInfo.icon}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {headerInfo.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 清单选择器（仅清单模式） */}
      {renderChecklistSelector()}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!shouldShowContent ? (
          renderEmptyState()
        ) : !isEditing ? (
          <>
            {/* 查看模式 */}
            {mode === 'block' && currentBlockNotes.length > 0 ? (
              // 段落笔记列表
              <div className="space-y-4">
                {currentBlockNotes.map(note => (
                  <div
                    key={note.id}
                    className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition"
                  >
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none mb-3 dark:prose-invert">
                      <ReactMarkdown rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                        {note.content}
                      </ReactMarkdown>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                      <span>
                        更新于 {new Date(note.updatedAt).toLocaleString('zh-CN')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditNote(note)}
                          disabled={isSaving}
                          className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={isSaving}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : mode === 'checklist' && currentChecklistNote ? (
              // 清单笔记（单条）
              <div>
                {currentChecklistNote.tags && currentChecklistNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentChecklistNote.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="prose prose-sm max-w-none mb-4 dark:prose-invert">
                  <ReactMarkdown rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                    {currentChecklistNote.content}
                  </ReactMarkdown>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                  更新于 {new Date(currentChecklistNote.updatedAt).toLocaleString('zh-CN')}
                </div>
                <button
                  onClick={() => handleEditNote(currentChecklistNote)}
                  disabled={isSaving}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  编辑笔记
                </button>
              </div>
            ) : (
              // 空状态
              <div className="text-center text-gray-500 dark:text-slate-400 py-12">
                <p className="mb-2">暂无笔记</p>
                <p className="text-sm">点击下方按钮添加第一条笔记</p>
              </div>
            )}

            {/* 添加笔记按钮 */}
            {((mode === 'block' ) || (mode === 'checklist' && !currentChecklistNote)) && (
              <button
                onClick={handleCreateNote}
                disabled={isSaving}
                className={`w-full mt-4 px-4 py-3 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                  mode === 'block'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                添加笔记
              </button>
            )}
          </>
        ) : (
          // 编辑模式
          <div className="space-y-4">
            {/* 标签编辑 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                标签
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editTags.map(tag => (
                  <span
                    key={tag}
                    className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 ${
                      mode === 'block'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                  placeholder="输入标签后按回车"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                >
                  <Tag className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Markdown 编辑器 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                笔记内容
              </label>
              <SimpleMDE
                key={`mde-${editorKey}`}
                value={initialContentRef.current}
                getMdeInstance={(mde) => {
                  mdeInstanceRef.current = mde;
                }}
                options={{
                  ...editorOptions,
                  autoDownloadFontAwesome: true,
                  renderingConfig: {
                    singleLineBreaks: false,
                    codeSyntaxHighlighting: true,
                  }
                }}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                disabled={isSaving}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                  mode === 'block'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}