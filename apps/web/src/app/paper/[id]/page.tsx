// app/(your-path)/PaperPage.tsx
'use client';

import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useTabStore } from '@/stores/useTabStore';
import { useEditingState } from '@/stores/useEditingState';
import { ViewerSource } from '@/types/paper/viewer';
import { usePaperLoader } from '@/lib/hooks/usePaperLoader';
import { usePaperEditPermissions } from '@/lib/hooks/usePaperEditPermissions';
import { PaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminPaperService } from '@/lib/services/paper';

import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import PaperContent from '@/components/paper/PaperContent';
import PaperReferences from '@/components/paper/PaperReferences';
import PersonalNotePanel from '@/components/paper/PersonalNotePanel';

import type {
  Paper,
  PaperContent as PaperContentModel,
  BlockContent,
  InlineContent,
  Reference,
} from '@/types/paper';
import { usePaperBlocks } from '@/lib/hooks/usePaperBlocks';
import { usePaperNotes } from '@/lib/hooks/usePaperNotes';
import { usePaperReferences } from '@/lib/hooks/usePaperReferences';
import { usePaperSections } from '@/lib/hooks/usePaperSections';
import { NOTES_PANEL_SHIFT, HEADER_HEIGHT, NOTES_PANEL_WIDTH, NOTES_PANEL_TOP, NOTES_PANEL_GAP } from '@/types/paper/constants';

type Lang = 'en' | 'both';

type ReferenceEditorOverlayProps = {
  mode: 'create' | 'edit';
  reference: Reference;
  onChange: (next: Reference) => void;
  onCancel: () => void;
  onSave: () => void;
};

function ReferenceEditorOverlay({
  mode,
  reference,
  onChange,
  onCancel,
  onSave,
}: ReferenceEditorOverlayProps) {
  const authorsValue = (reference.authors ?? []).join('\n');
  const yearDisplay = reference.year && reference.year > 0 ? reference.year.toString() : '';

  const handleAuthorsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextAuthors = event.target.value
      .split('\n')
      .map(author => author.trim())
      .filter(Boolean);
    onChange({ ...reference, authors: nextAuthors });
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...reference, title: event.target.value });
  };

  const handlePublicationChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...reference, publication: event.target.value });
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const parsed = parseInt(raw, 10);
    onChange({ ...reference, year: Number.isNaN(parsed) ? 0 : parsed });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={event => event.stopPropagation()}
      >
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {mode === 'create' ? '新增参考文献' : '编辑参考文献'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                提交后将自动保存到当前列表。
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-transparent px-3 py-1 text-sm text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              关闭
            </button>
          </header>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">标题</span>
            <input
              value={reference.title}
              onChange={handleTitleChange}
              placeholder="例如：Attention Is All You Need"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">
              作者（每行一位）
            </span>
            <textarea
              value={authorsValue}
              onChange={handleAuthorsChange}
              rows={4}
              placeholder="作者一&#10;作者二"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">出版信息</span>
            <input
              value={reference.publication}
              onChange={handlePublicationChange}
              placeholder="例如：NeurIPS"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">年份</span>
            <input
              type="number"
              value={yearDisplay}
              onChange={handleYearChange}
              placeholder={`${new Date().getFullYear()}`}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <footer className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800"
            >
              保存
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default function PaperPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { tabs } = useTabStore();
  const { user, isAdmin } = useAuth();

  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const tabData = useMemo(() => {
    const tabKey = `paper:${paperId}`;
    const tab = tabs.find(t => t.id === tabKey);
    return (tab?.data ?? {}) as {
      paperId?: string;
      userPaperId?: string;
      source?: ViewerSource;
      initialPaper?: Paper;
    };
  }, [tabs, paperId]);

  const urlSource = (searchParams?.get('source') ?? null) as ViewerSource | null;
  
  const sourceCandidates = useMemo<ViewerSource[]>(() => {
    const seen = new Set<ViewerSource>();
    const push = (s?: ViewerSource | null) => {
      if (s && !seen.has(s)) seen.add(s);
    };

    push(urlSource);
    push(tabData.source);

    if (tabData.initialPaper) {
      push(tabData.initialPaper.isPublic ? 'public-guest' : 'personal-owner');
    }

    if (user) {
      push(isAdmin ? 'public-admin' : 'personal-owner');
    }

    push(isAdmin ? 'public-admin' : 'public-guest');

    return Array.from(seen) as ViewerSource[];
  }, [tabData.source, tabData.initialPaper, urlSource, user, isAdmin]);

  const { paper, isLoading, error, activeSource } = usePaperLoader(
    paperId,
    sourceCandidates,
    tabData.initialPaper,
  );

  const effectiveSource = activeSource ?? sourceCandidates[0] ?? 'public-guest';
  const permissions = usePaperEditPermissions(effectiveSource);

  const canEditContent = permissions.canEditContent;
  const canToggleVisibility = permissions.canToggleVisibility;
  const isPublicVisible = paper?.isPublic ?? false;
  const isPersonalOwner = effectiveSource === 'personal-owner';

  const { setHasUnsavedChanges } = useEditingState();

  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const displayContent = editableDraft ?? paper ?? null;
  const urlUserPaperId = searchParams?.get('userPaperId');

  const resolvedUserPaperId = useMemo(() => {
    if (!isPersonalOwner) return null;
    if (urlUserPaperId) return urlUserPaperId;
    if (tabData.userPaperId) return tabData.userPaperId;
    if (paper && (paper as any).userPaperId) return (paper as any).userPaperId as string;
    return null;
  }, [isPersonalOwner, urlUserPaperId, tabData.userPaperId, paper]);

  const showNotesPanel = isPersonalOwner && !!selectedBlockId && !!resolvedUserPaperId;

  const {
    notesByBlock,
    isLoading: notesLoading,
    error: notesError,
    isMutating: notesMutating,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
  } = usePaperNotes(resolvedUserPaperId, isPersonalOwner);

  const {
    displayReferences,
    editingReferenceId,
    referenceEditorMode,
    referenceDraft,
    handleReferenceDraftChange,
    handleReferenceEditorSubmit,
    handleReferenceEditorCancel,
    handleReferenceAdd,
    handleReferenceDuplicate,
    handleReferenceInsertBelow,
    handleReferenceDelete,
    handleReferenceEdit,
    handleReferenceMoveUp,
    handleReferenceMoveDown,
  } = usePaperReferences(editableDraft, setEditableDraft, setHasUnsavedChanges);

  const {
    handleSectionTitleUpdate,
    handleSectionAddSubsection,
    handleSectionInsert,
    handleSectionMove,
    handleSectionDelete,
    updateSections,
  } = usePaperSections(setEditableDraft, setHasUnsavedChanges);

  const {
    handleBlockUpdate,
    handleBlockDuplicate,
    handleBlockDelete,
    handleBlockInsert,
    handleBlockMove,
    handleBlockAppendSubsection,
    handleBlockAddComponent,
  } = usePaperBlocks(lang, updateSections, setActiveBlockId);

  // 查找 block 所属的 section 信息
  const findBlockSection = useCallback((blockId: string) => {
    if (!displayContent?.sections) return null;
    
    for (let sectionIndex = 0; sectionIndex < displayContent.sections.length; sectionIndex++) {
      const section = displayContent.sections[sectionIndex];
      const blocks = section.content ?? [];
      
      for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        if (blocks[blockIndex].id === blockId) {
          return {
            section,
            sectionIndex,
            blockIndex,
          };
        }
      }
    }
    return null;
  }, [displayContent?.sections]);

  const selectedBlockInfo = useMemo(() => {
    if (!selectedBlockId) return null;
    return findBlockSection(selectedBlockId);
  }, [selectedBlockId, findBlockSection]);

  useEffect(() => {
    if (!paper) {
      setEditableDraft(null);
      return;
    }
    setEditableDraft(paper);
    setHasUnsavedChanges(false);
  }, [paper, setHasUnsavedChanges]);

  useEffect(() => {
    if (!isPersonalOwner) {
      setSelectedBlockId(null);
    }
  }, [isPersonalOwner]);

  useEffect(() => {
    if (isPersonalOwner && resolvedUserPaperId) {
      loadNotes();
    }
  }, [isPersonalOwner, resolvedUserPaperId, loadNotes]);

  const handleSearchNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (!searchResults.length) return;
      const delta = direction === 'next' ? 1 : -1;
      const nextIndex =
        (currentSearchIndex + delta + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(nextIndex);

      const targetBlockId = searchResults[nextIndex];
      const targetElement = document.getElementById(targetBlockId);

      if (targetElement && contentRef.current) {
        const containerRect = contentRef.current.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const scrollTop = contentRef.current.scrollTop;
        const targetTop = scrollTop + (elementRect.top - containerRect.top) - 100;
        contentRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      } else if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setActiveBlockId(targetBlockId);
      window.setTimeout(() => setActiveBlockId(null), 2000);
    },
    [searchResults, currentSearchIndex],
  );

  const handleMetadataUpdate = useCallback(
    async (next: any) => {
      setEditableDraft(prev => {
        if (!prev) return prev;
        setHasUnsavedChanges(true);
        return { ...prev, metadata: next };
      });
      return Promise.resolve();
    },
    [setHasUnsavedChanges],
  );

  const handleBlockSelect = useCallback(
    (blockId: string) => {
      setActiveBlockId(blockId);
      if (isPersonalOwner) {
        setSelectedBlockId(prev => (prev === blockId ? null : blockId));
      }
    },
    [isPersonalOwner],
  );

  const handleCloseNotes = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editableDraft) return;

    try {
      const result = await adminPaperService.updatePaper(paperId, editableDraft);

      if (result.bizCode === 0) {
        setHasUnsavedChanges(false);
      } else {
        alert(`保存失败：${result.bizMessage}`);
      }
    } catch (err) {
      console.error('保存过程中出错：', err);
      alert('保存过程中出错，请稍后重试');
    }
  }, [editableDraft, paperId, setHasUnsavedChanges]);

  const handleCreateNote = useCallback(
    async (blockId: string, content: InlineContent[]) => {
      if (!resolvedUserPaperId) {
        alert('未找到个人论文标识，无法创建笔记。');
        return;
      }
      await createNote(blockId, content);
    },
    [resolvedUserPaperId, createNote],
  );

  const handleUpdateNote = useCallback(
    async (blockId: string, noteId: string, content: InlineContent[]) => {
      if (!resolvedUserPaperId) {
        alert('未找到个人论文标识，无法更新笔记。');
        return;
      }
      await updateNote(blockId, noteId, content);
    },
    [resolvedUserPaperId, updateNote],
  );

  const handleDeleteNote = useCallback(
    async (blockId: string, noteId: string) => {
      if (!resolvedUserPaperId) {
        alert('未找到个人论文标识，无法删除笔记。');
        return;
      }
      await deleteNote(blockId, noteId);
    },
    [resolvedUserPaperId, deleteNote],
  );

  const headerActions = useMemo(() => {
    const isPublicAdmin = effectiveSource === 'public-admin';

    return {
      canToggleVisibility: isPublicAdmin && canToggleVisibility,
      isPublicVisible,
      onToggleVisibility:
        isPublicAdmin && canToggleVisibility
          ? () => {
              console.log('TODO: 实现公开/私有切换');
            }
          : undefined,
      onSave:
        (isPublicAdmin || isPersonalOwner) && canEditContent ? handleSave : undefined,
      saveLabel: isPersonalOwner ? '保存我的修改' : '保存草稿',
      extraActionsHint: isPublicAdmin
        ? '公共库管理员视图，操作将对所有用户生效'
        : undefined,
    };
  }, [
    effectiveSource,
    canToggleVisibility,
    isPublicVisible,
    canEditContent,
    handleSave,
    isPersonalOwner,
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 dark:text-slate-400">加载论文中...</p>
        </div>
      </div>
    );
  }

  if (error || !paper || !displayContent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-700 dark:text-slate-300">{error || '论文内容不存在'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const notesForSelectedBlock = selectedBlockId ? notesByBlock[selectedBlockId] ?? [] : [];

  const articleStyle: CSSProperties | undefined = showNotesPanel
    ? ({ '--notes-offset': `${NOTES_PANEL_SHIFT}px` } as CSSProperties)
    : undefined;

  return (
    <PaperEditPermissionsContext.Provider value={permissions}>
      <div className="relative h-screen bg-gray-50 dark:bg-slate-950">
        <div className="fixed top-0 left-0 right-0 z-50 bg-gray-50 dark:bg-slate-950">
          <PaperHeader
            lang={lang}
            setLang={setLang}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResultsCount={searchResults.length}
            currentSearchIndex={currentSearchIndex}
            onSearchNavigate={handleSearchNavigate}
            actions={headerActions}
            viewerSource={effectiveSource}
          />
        </div>

        <div className="flex flex-col h-screen">
          <div className="flex flex-col flex-1 min-h-0 relative">
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto"
              style={{
                paddingTop: HEADER_HEIGHT,
                paddingBottom: 32,
              }}
            >
              <div
                className="
                  max-w-5xl mx-auto p-8
                  transition-[transform,margin] duration-300 ease-out
                  lg:transform-[translateX(calc(var(--notes-offset,0)*-1))]
                "
                style={articleStyle}
              >
                <div className="flex flex-col gap-8 pb-24">
                  <PaperMetadata
                    metadata={displayContent.metadata}
                    onMetadataUpdate={handleMetadataUpdate}
                  />

                  <PaperContent
                    sections={displayContent.sections ?? []}
                    references={displayContent.references}
                    lang={lang}
                    searchQuery={searchQuery}
                    activeBlockId={activeBlockId}
                    selectedBlockId={selectedBlockId}
                    setActiveBlockId={setActiveBlockId}
                    contentRef={contentRef}
                    setSearchResults={setSearchResults}
                    setCurrentSearchIndex={setCurrentSearchIndex}
                    onBlockClick={handleBlockSelect}
                    onSectionTitleUpdate={handleSectionTitleUpdate}
                    onSectionAddSubsection={handleSectionAddSubsection}
                    onSectionInsert={handleSectionInsert}
                    onSectionMove={handleSectionMove}
                    onSectionDelete={handleSectionDelete}
                    onBlockUpdate={handleBlockUpdate}
                    onBlockDuplicate={handleBlockDuplicate}
                    onBlockDelete={handleBlockDelete}
                    onBlockInsert={handleBlockInsert}
                    onBlockMove={handleBlockMove}
                    onBlockAppendSubsection={handleBlockAppendSubsection}
                    onBlockAddComponent={handleBlockAddComponent}
                  />

                  <PaperReferences
                    references={displayReferences}
                    title={
                      lang === 'both'
                        ? '参考文献 / References'
                        : lang === 'en'
                        ? 'References'
                        : '参考文献'
                    }
                    highlightedRefs={highlightedRefs}
                    onHighlightChange={setHighlightedRefs}
                    onReferenceEdit={canEditContent ? handleReferenceEdit : undefined}
                    onReferenceDuplicate={canEditContent ? handleReferenceDuplicate : undefined}
                    onReferenceInsertBelow={
                      canEditContent ? handleReferenceInsertBelow : undefined
                    }
                    onReferenceDelete={canEditContent ? handleReferenceDelete : undefined}
                    onReferenceMoveUp={canEditContent ? handleReferenceMoveUp : undefined}
                    onReferenceMoveDown={canEditContent ? handleReferenceMoveDown : undefined}
                    onReferenceAdd={canEditContent ? handleReferenceAdd : undefined}
                  />

                  {(displayReferences?.length ?? 0) === 0 && <div className="h-4" />}

                  {showNotesPanel && (
                    <div className="lg:hidden rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <PersonalNotePanel
                        blockId={selectedBlockId!}
                        sectionId={selectedBlockInfo?.section?.id ?? ''}
                        sectionLabel={selectedBlockInfo?.section?.title?.en ?? 'Section'}
                        blockLabel={`Block ${(selectedBlockInfo?.blockIndex ?? 0) + 1}`}
                        notes={notesForSelectedBlock}
                        onCreateNote={content => handleCreateNote(selectedBlockId!, content)}
                        onUpdateNote={(noteId, content) =>
                          handleUpdateNote(selectedBlockId!, noteId, content)
                        }
                        onDeleteNote={noteId => handleDeleteNote(selectedBlockId!, noteId)}
                        references={displayContent.references ?? []}
                        highlightedRefs={highlightedRefs}
                        setHighlightedRefs={setHighlightedRefs}
                        contentRef={contentRef}
                        onClose={handleCloseNotes}
                        isLoading={notesLoading}
                        isMutating={notesMutating}
                        error={notesError}
                        onRetry={loadNotes}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showNotesPanel && (
            <aside
              className="
                hidden lg:flex
                fixed z-40 flex-col gap-4
                rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-lg
                dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
              "
              style={{
                width: NOTES_PANEL_WIDTH,
                top: NOTES_PANEL_TOP,
                right: NOTES_PANEL_GAP,
              }}
            >
              <PersonalNotePanel
                blockId={selectedBlockId!}
                sectionId={selectedBlockInfo?.section?.id ?? ''}
                sectionLabel={selectedBlockInfo?.section?.title?.en ?? 'Section'}
                blockLabel={`Block ${(selectedBlockInfo?.blockIndex ?? 0) + 1}`}
                notes={notesForSelectedBlock}
                onCreateNote={content => handleCreateNote(selectedBlockId!, content)}
                onUpdateNote={(noteId, content) =>
                  handleUpdateNote(selectedBlockId!, noteId, content)
                }
                onDeleteNote={noteId => handleDeleteNote(selectedBlockId!, noteId)}
                references={displayContent.references ?? []}
                highlightedRefs={highlightedRefs}
                setHighlightedRefs={setHighlightedRefs}
                contentRef={contentRef}
                onClose={handleCloseNotes}
                isLoading={notesLoading}
                isMutating={notesMutating}
                error={notesError}
                onRetry={loadNotes}
              />
            </aside>
          )}
        </div>

        {canEditContent && editingReferenceId && referenceDraft && (
          <ReferenceEditorOverlay
            mode={referenceEditorMode}
            reference={referenceDraft}
            onChange={handleReferenceDraftChange}
            onCancel={handleReferenceEditorCancel}
            onSave={handleReferenceEditorSubmit}
          />
        )}
      </div>
    </PaperEditPermissionsContext.Provider>
  );
}
