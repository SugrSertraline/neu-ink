'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { X, Plus, Pencil, Trash2, Save, XCircle, RefreshCw } from 'lucide-react';

import InlineRenderer from '@/components/paper/InlineRenderer';
import type { InlineContent, Reference } from '@/types/paper';
import InlineEditor from './editor/InlineEditor';

export interface PersonalNote {
    id: string;
    blockId: string;
    content: InlineContent[];
    createdAt: number;
    updatedAt: number;
}

export interface PersonalNotePanelProps {
    blockId: string;
    sectionId: string | null;
    sectionLabel: string | null;
    blockLabel: string | null;
    notes: PersonalNote[];
    onCreateNote: (content: InlineContent[]) => Promise<void>;
    onUpdateNote: (noteId: string, content: InlineContent[]) => Promise<void>;
    onDeleteNote: (noteId: string) => Promise<void>;
    references: Reference[];
    highlightedRefs: string[];
    setHighlightedRefs: (refs: string[]) => void;
    contentRef: React.RefObject<HTMLDivElement | null>;
    onClose: () => void;
    isLoading: boolean;
    isMutating: boolean;
    error: string | null;
    onRetry?: () => void;
}

type EditingState =
    | { mode: 'idle' }
    | { mode: 'creating'; draft: InlineContent[]; tempId?: string }
    | { mode: 'editing'; noteId: string; draft: InlineContent[] };

const hasContent = (nodes: InlineContent[]): boolean => {
    return nodes.some(node => {
        if (!node) return false;
        const data = node as any;
        if (data.type === 'text') {
            return typeof data.content === 'string' && data.content.trim().length > 0;
        }
        if (Array.isArray(data.children)) {
            return hasContent(data.children as InlineContent[]);
        }
        if (typeof data.content === 'string') {
            return data.content.trim().length > 0;
        }
        return false;
    });
};


export default function PersonalNotePanel({
    blockId,
    sectionId,
    sectionLabel,
    blockLabel,
    notes,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    references,
    highlightedRefs,
    setHighlightedRefs,
    contentRef,
    onClose,
    isLoading,
    isMutating,
    error,
    onRetry,
}: PersonalNotePanelProps) {
    const [state, setState] = useState<EditingState>({ mode: 'idle' });

    const sortedNotes = useMemo(
        () => [...notes].sort((a, b) => b.updatedAt - a.updatedAt),
        [notes],
    );

    const startCreate = useCallback(() => {
        setState({ mode: 'creating', draft: [] });
    }, []);

    const startEdit = useCallback((note: PersonalNote) => {
        setState({ mode: 'editing', noteId: note.id, draft: note.content });
    }, []);

    const cancelEditing = useCallback(() => {
        setState({ mode: 'idle' });
    }, []);

    const handleSave = useCallback(async () => {
        if (state.mode === 'creating') {
            if (!hasContent(state.draft)) return;
            try {
                await onCreateNote(state.draft);
                setState({ mode: 'idle' });
            } catch (error) {
                // 创建失败时不重置状态，让用户可以重试
                console.error('创建笔记失败:', error);
            }
            return;
        }

        if (state.mode === 'editing') {
            if (!hasContent(state.draft)) return;
            try {
                await onUpdateNote(state.noteId, state.draft);
                setState({ mode: 'idle' });
            } catch (error) {
                // 更新失败时不重置状态，让用户可以重试
                console.error('更新笔记失败:', error);
            }
        }
    }, [state, onCreateNote, onUpdateNote]);

  const activeDraft =
        state.mode === 'creating' || state.mode === 'editing' ? state.draft : null;
    const isDirty = activeDraft ? hasContent(activeDraft) : false;
    const renderNotesArea = () => {
        if (isLoading) {
            return (
                <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    正在加载笔记...
                </div>
            );
        }

        if (error) {
            return (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/50 dark:bg-red-900/20 dark:text-red-200">
                    <p className="mb-2 font-medium">笔记加载失败：{error}</p>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs text-red-600 shadow hover:bg-red-100 dark:bg-transparent dark:hover:bg-red-800/40"
                        >
                            <RefreshCw className="h-3 w-3" />
                            重试
                        </button>
                    )}
                </div>
            );
        }

        if (!sortedNotes.length) {
            return (
                <div className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    暂无笔记，点击下方「新增笔记」开始记录你的想法。
                </div>
            );
        }

        return sortedNotes.map(note => {
            const isTempNote = note.id.startsWith('temp-');
            
            return (
                <article
                    key={note.id}
                    className={`rounded-lg border p-3 shadow-sm dark:bg-slate-900 ${
                        isTempNote
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                            : 'border-slate-200 bg-white dark:border-slate-700'
                    }`}
                >
                    <header className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>
                            {isTempNote ? (
                                <span className="text-blue-600 dark:text-blue-400">保存中...</span>
                            ) : (
                                <>
                                    更新于{' '}
                                    {formatDistanceToNow(note.updatedAt, {
                                        addSuffix: true,
                                        locale: zhCN,
                                    })}
                                </>
                            )}
                        </span>
                        <div className="flex items-center gap-2">
                            {!isTempNote && (
                                <>
                                    <button
                                        type="button"
                                        disabled={isMutating}
                                        className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                                        onClick={() => startEdit(note)}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        编辑
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isMutating}
                                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-900/30"
                                        onClick={async () => {
                                            if (isMutating) return;
                                            await onDeleteNote(note.id);
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        删除
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    <InlineRenderer
                        nodes={note.content}
                        searchQuery=""
                        highlightedRefs={highlightedRefs}
                        setHighlightedRefs={setHighlightedRefs}
                        contentRef={contentRef}
                        references={references}
                    />
                </article>
            );
        });
    };
  
    return (
        <div className="space-y-4">
            <header className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-300">笔记面板</p>
                    {sectionLabel && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">章节：{sectionLabel}</p>
                    )}
                    {blockLabel && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">块：{blockLabel}</p>
                    )}
                    {!sectionLabel && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            当前块{' '}
                            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{blockId}</code>
                            {sectionId ? ` · 所属章节 ${sectionId}` : ''}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <X className="h-3.5 w-3.5" />
                    关闭
                </button>
            </header>

            <div className="space-y-3">
                {renderNotesArea()}
            </div>

            <footer className="space-y-2">
                {state.mode === 'idle' ? (
                    <button
                        type="button"
                        onClick={startCreate}
                        disabled={isMutating || isLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300 dark:hover:border-blue-500 dark:hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        新增笔记
                    </button>
                ) : (
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                            {state.mode === 'creating' ? '新增笔记' : '编辑笔记'}
                        </div>
                        <div className="p-3">
                            <InlineEditor
                                value={state.mode === 'creating' || state.mode === 'editing' ? state.draft : []}
                                onChange={draft =>
                                    setState(prev => {
                                        if (prev.mode === 'creating' || prev.mode === 'editing') {
                                            return { ...prev, draft };
                                        }
                                        return prev;
                                    })
                                }
                                references={references}
                                enableReferences={false}
                                enableFootnotes={false}
                                label={undefined}
                                placeholder="写下你的个人笔记（支持行内公式和基础格式）"
                                minHeight={140}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                            <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={isMutating}
                                className="inline-flex items-center gap-1 rounded border border-transparent px-3 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                            >
                                <XCircle className="h-4 w-4" />
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!isDirty || isMutating}
                                className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                            >
                                <Save className="h-4 w-4" />
                                保存
                            </button>
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
}
