'use client';

import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useTabStore } from '@/stores/useTabStore';
import { useEditingState } from '@/stores/useEditingState';
import { ViewerSource } from '@/types/paper/viewer';
import { usePaperLoader } from '@/lib/hooks/usePaperLoader';
import { usePaperEditPermissions } from '@/lib/hooks/usePaperEditPermissions';
import { PaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminPaperService, userPaperService } from '@/lib/services/paper';

import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import PaperContent from '@/components/paper/PaperContent';
import PaperReferences from '@/components/paper/PaperReferences';
import PersonalNotePanel from '@/components/paper/PersonalNotePanel';

import type {
  Paper,
  PaperContent as PaperContentModel,
  PaperMetadata as PaperMetadataModel,
  InlineContent,
  Reference,
} from '@/types/paper';
import { usePaperBlocks } from '@/lib/hooks/usePaperBlocks';
import { usePaperNotes } from '@/lib/hooks/usePaperNotes';
import { usePaperReferences } from '@/lib/hooks/usePaperReferences';
import { usePaperSections } from '@/lib/hooks/usePaperSections';
import {
  NOTES_PANEL_WIDTH,
  NOTES_PANEL_GAP,
} from '@/types/paper/constants';
import MetadataEditorOverlay from './MetadataEditorOverlay';

type Lang = 'en' | 'both';
const HEADER_STICKY_OFFSET = 8;

// 与 Tailwind 的 max-w-5xl (64rem) 对齐，使 content+notes 整体居中时宽度可控
const CONTENT_MAX_W_REM = 64;

type ReferenceEditorOverlayProps = {
  mode: 'create' | 'edit';
  reference: Reference;
  onChange: (next: Reference) => void;
  onCancel: () => void;
  onSave: () => void;
  container?: HTMLElement | null;
};

function ReferenceEditorOverlay({
  mode,
  reference,
  onChange,
  onCancel,
  onSave,
  container,
}: ReferenceEditorOverlayProps) {
  const portalTarget = container ?? document.body;
  if (!portalTarget) return null;

  const authorsValue = (reference.authors ?? []).join('\n');
  const yearDisplay =
    reference.year && reference.year > 0 ? reference.year.toString() : '';

  const updateReference = useCallback(
    <K extends keyof Reference>(field: K, value: Reference[K]) => {
      onChange({ ...reference, [field]: value });
    },
    [reference, onChange],
  );

  const handleAuthorsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextAuthors = event.target.value
      .split('\n')
      .map(author => author.trim())
      .filter(Boolean);
    updateReference('authors', nextAuthors);
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('title', event.target.value);
  };

  const handlePublicationChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('publication', event.target.value);
  };

  const handleYearChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim();
    const parsed = Number.parseInt(raw, 10);
    updateReference('year', raw === '' || Number.isNaN(parsed) ? undefined : parsed);
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('volume', event.target.value);
  };

  const handleIssueChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('issue', event.target.value);
  };

  const handlePagesChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('pages', event.target.value);
  };

  const handleDoiChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('doi', event.target.value);
  };

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateReference('url', event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave();
  };

  return createPortal(
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
              placeholder={`作者一\n作者二`}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">出版物</span>
            <input
              value={reference.publication ?? ''}
              onChange={handlePublicationChange}
              placeholder="例如：NeurIPS"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">卷号</span>
              <input
                value={reference.volume ?? ''}
                onChange={handleVolumeChange}
                placeholder="例如：42"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">期号</span>
              <input
                value={reference.issue ?? ''}
                onChange={handleIssueChange}
                placeholder="例如：7"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-800 dark:text-slate-100">页码</span>
              <input
                value={reference.pages ?? ''}
                onChange={handlePagesChange}
                placeholder="例如：23-37"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">DOI</span>
            <input
              value={reference.doi ?? ''}
              onChange={handleDoiChange}
              placeholder="10.xxxx/xxxxxx"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">URL</span>
            <input
              type="url"
              value={reference.url ?? ''}
              onChange={handleUrlChange}
              placeholder="https://example.com"
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
    </div>,
    portalTarget,
  );
}

function useAutoHeaderHeight(varName = '--app-header-h', extraScrollPad = 24, stickyOffset = 0,) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setVars = (h: number) => {
      const actual = Math.round(h);
      const total = actual + stickyOffset;
      const root = document.documentElement;
      root.style.setProperty(varName, `${total}px`);
    };

    const ro = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setVars(rect.height);
    });

    setVars(el.getBoundingClientRect().height);
    ro.observe(el);
    return () => ro.disconnect();
  }, [varName, extraScrollPad]);

  return ref;
}

function useEnsureWindowScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.overflowY = 'auto';
    body.style.overflowY = 'auto';
  }, []);
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

  const { setHasUnsavedChanges, switchToEdit, clearEditing } = useEditingState();

  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);

  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [metadataEditorInitial, setMetadataEditorInitial] = useState<PaperMetadataModel | null>(
    null,
  );
  const [metadataEditorError, setMetadataEditorError] = useState<string | null>(null);
  const [isMetadataSubmitting, setIsMetadataSubmitting] = useState(false);
  const [isHeaderAffixed, setIsHeaderAffixed] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // 新增：外层居中壳
  const headerRef = useAutoHeaderHeight('--app-header-h', 24, HEADER_STICKY_OFFSET);

  // 固定面板位置状态 + 动画开关
  const [notesFixedStyle, setNotesFixedStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const displayContent = editableDraft ?? paper ?? null;
  const metadata = displayContent?.metadata ?? null;
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
    handleSectionAddBlock,
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

  const handleMetadataEditStart = useCallback(() => {
    if (!metadata) return;
    const switched = switchToEdit('metadata', {
      beforeSwitch: () => {
        setMetadataEditorError(null);
      },
      onRequestSave: () => { },
    });
    if (!switched) return;
    setMetadataEditorInitial(metadata);
    setMetadataEditorError(null);
    setIsMetadataEditorOpen(true);
  }, [metadata, switchToEdit]);

  const findBlockSection = useCallback(
    (blockId: string) => {
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
    },
    [displayContent?.sections],
  );

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

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderAffixed(window.scrollY > HEADER_STICKY_OFFSET / 2);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 计算固定笔记面板的位置与高度（贴紧 content，位于 header 下）
  useLayoutEffect(() => {
    if (!showNotesPanel) {
      setNotesOpen(false);
      setNotesFixedStyle(null);
      return;
    }

    const compute = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      // 读取 header 高度（useAutoHeaderHeight 会维护这个变量）
      const headerVar = getComputedStyle(document.documentElement).getPropertyValue('--app-header-h').trim();
      const headerH = parseFloat(headerVar || '160');
      const gap = NOTES_PANEL_GAP;

      const top = headerH + gap;
      const left = rect.right - NOTES_PANEL_WIDTH; // 紧贴 wrapper 右侧
      const height = Math.max(200, window.innerHeight - top - gap); // 兜底高度 160px

      setNotesFixedStyle({
        top,
        left,
        width: NOTES_PANEL_WIDTH,
        height,
      });
    };

    // 初算 + 监听 wrapper/ header 尺寸变化与窗口 resize/scroll
    compute();

    const roWrapper = new ResizeObserver(() => compute());
    const roHeader = new ResizeObserver(() => compute());
    if (wrapperRef.current) roWrapper.observe(wrapperRef.current);
    // headerRef 是一个 ref，指向 header 容器
    // @ts-ignore
    if (headerRef?.current) roHeader.observe(headerRef.current as Element);

    const onResize = () => compute();
    const onScroll = () => compute();

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // 打开动画
    const raf = requestAnimationFrame(() => setNotesOpen(true));

    return () => {
      roWrapper.disconnect();
      roHeader.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [showNotesPanel, headerRef]);

  const getScrollParent = (el: HTMLElement | null): HTMLElement | Window => {
    let node: HTMLElement | null = el?.parentElement ?? null;
    while (node) {
      const style = getComputedStyle(node);
      const oy = style.overflowY;
      if (/(auto|scroll|overlay)/.test(oy)) return node;
      node = node.parentElement;
    }
    return window; // 回退到窗口
  };

  const scrollToTarget = (target: HTMLElement) => {
    const scroller = getScrollParent(target);
    // 使用 block 的 scroll-margin-top 进行补偿，不再手算 header
    if (scroller === window) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // 只滚这个容器
      const parent = scroller as HTMLElement;
      const parentRect = parent.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const top = parent.scrollTop + (rect.top - parentRect.top);
      parent.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleSearchNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (!searchResults.length) return;
      const delta = direction === 'next' ? 1 : -1;
      const nextIndex =
        (currentSearchIndex + delta + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(nextIndex);

      const targetBlockId = searchResults[nextIndex];
      const el = document.getElementById(targetBlockId);
      if (el) {
        scrollToTarget(el as HTMLElement);
      }

      setActiveBlockId(targetBlockId);
      window.setTimeout(() => setActiveBlockId(null), 2000);
    },
    [searchResults, currentSearchIndex],
  );

  const handleMetadataUpdate = useCallback(
    async (next: PaperMetadataModel, abstract?: { en?: string; zh?: string }, keywords?: string[]) => {
      setEditableDraft(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          metadata: next,
          abstract: abstract || prev.abstract,
          keywords: keywords || prev.keywords,
        };
      });
      // 避免在setEditableDraft的回调中调用其他状态更新
      setHasUnsavedChanges(true);
    },
    [setHasUnsavedChanges],
  );
  // 保存到服务器的函数
const handleSaveToServer = useCallback(
  async (data?: PaperContentModel) => {
    const payload = data ?? editableDraft;
    if (!payload) return;

    try {
      const service = isPersonalOwner ? userPaperService : adminPaperService;
      const id = isPersonalOwner ? resolvedUserPaperId : paperId;

      if (!id) {
        toast.error('保存失败', { description: '无法确定要保存的论文标识' });
        return;
      }

      const result = isPersonalOwner
        ? await userPaperService.updateUserPaper(id, { paperData: payload })
        : await adminPaperService.updatePaper(id, payload);

      if (result.bizCode === 0) {
        setHasUnsavedChanges(false);
        toast.success('保存成功', { description: '最新变更已同步到服务器。' });
      } else {
        toast.error('保存失败', {
          description: result.bizMessage ?? '服务器未返回详细信息，请稍后重试。',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存过程中发生未知错误，请稍后再试。';
      toast.error('保存出错', { description: message });
    }
  },
  [editableDraft, paperId, resolvedUserPaperId, isPersonalOwner, setHasUnsavedChanges]
);
  const handleMetadataOverlaySubmit = useCallback(
  async (next: PaperMetadataModel, abstract?: { en?: string; zh?: string }, keywords?: string[]) => {
    setIsMetadataSubmitting(true);
    setMetadataEditorError(null);
    try {
      const base = (editableDraft ?? paper)!; // paper 已加载时不为空
      const nextDraft: PaperContentModel = {
        ...base,
        metadata: next,
        abstract: abstract ?? base.abstract,
        keywords: keywords ?? base.keywords,
      };

      // 先更新本地 UI
      setEditableDraft(nextDraft);

      // 直接用 nextDraft 保存到后端（不会用到闭包里的旧值）
      await handleSaveToServer(nextDraft);

      // 成功后关闭弹层 & 收尾
      setIsMetadataEditorOpen(false);
      setMetadataEditorInitial(null);
      clearEditing();
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
      setMetadataEditorError(message);
      toast.error('元数据保存失败', { description: message });
    } finally {
      setIsMetadataSubmitting(false);
    }
  },
  [editableDraft, paper, handleSaveToServer, clearEditing]
);
  const handleMetadataOverlayCancel = useCallback(() => {
    setMetadataEditorError(null);
    setIsMetadataEditorOpen(false);
    setMetadataEditorInitial(null);
    clearEditing();
  }, [clearEditing]);

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

  const handleToggleVisibility = useCallback(async () => {
    try {
      const newVisibility = !isPublicVisible;
      const result = await adminPaperService.updatePaper(paperId, {
        isPublic: newVisibility,
      });

      if (result.bizCode === 0) {
        toast.success(
          newVisibility ? '论文已设为公开' : '论文已设为私有',
          {
            description: newVisibility
              ? '所有用户现在可以访问此论文'
              : '论文已从公共库中隐藏',
          }
        );
        // 重新加载页面数据以反映更改
        window.location.reload();
      } else {
        toast.error('切换可见性失败', {
          description: result.bizMessage ?? '请稍后重试',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '切换可见性时发生未知错误';
      toast.error('切换可见性出错', {
        description: message,
      });
    }
  }, [isPublicVisible, paperId]);

  const headerActions = useMemo(() => {
    const isPublicAdmin = effectiveSource === 'public-admin';

    return {
      canToggleVisibility: isPublicAdmin && canToggleVisibility,
      isPublicVisible,
      onToggleVisibility:
        isPublicAdmin && canToggleVisibility ? handleToggleVisibility : undefined,
      extraActionsHint: isPublicAdmin
        ? '公共库管理员视图，操作将对所有用户生效'
        : undefined,
    };
  }, [
    effectiveSource,
    canToggleVisibility,
    isPublicVisible,
    handleToggleVisibility,
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

  return (
    <PaperEditPermissionsContext.Provider value={permissions}>
      <div className="relative isolate min-h-screen bg-gray-50 dark:bg-slate-950">
        <div
          ref={headerRef}
          className="sticky z-50 px-4 transition-all duration-200 ease-out"
            style={{ top: HEADER_STICKY_OFFSET }}
        >
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

        <div style={{ paddingBottom: 32 }}>
          {/* 外层壳：根据是否显示 notes 调整最大宽度，整体 mx-auto 居中 */}
          <div
            ref={wrapperRef}
            className="mx-auto px-4 lg:px-8"
            style={{
              maxWidth: showNotesPanel
                ? `calc(${CONTENT_MAX_W_REM}rem + ${NOTES_PANEL_GAP}px + ${NOTES_PANEL_WIDTH}px)`
                : `${CONTENT_MAX_W_REM}rem`,
            }}
          >
            <div
              className="lg:flex lg:items-start lg:gap-[var(--notes-gap,0)]"
              style={{ '--notes-gap': `${NOTES_PANEL_GAP}px` } as CSSProperties}
            >
              {/* 左侧 content：保持原来的 max-w-5xl，自动占满剩余 */}
              <div
                ref={contentRef}
                className="max-w-5xl w-full p-8 mx-auto lg:mx-0"
              >
                <div className="flex flex-col gap-8 pb-24">
                  <PaperMetadata
                    metadata={displayContent.metadata}
                    abstract={displayContent.abstract}
                    keywords={displayContent.keywords}
                    lang={lang}
                    onEditRequest={handleMetadataEditStart}
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
                    onSectionAddBlock={(sectionId, type) => handleSectionAddBlock(sectionId, type, lang)}
                    onBlockUpdate={handleBlockUpdate}
                    onBlockDuplicate={handleBlockDuplicate}
                    onBlockDelete={handleBlockDelete}
                    onBlockInsert={handleBlockInsert}
                    onBlockMove={handleBlockMove}
                    onBlockAppendSubsection={handleBlockAppendSubsection}
                    onBlockAddComponent={handleBlockAddComponent}
                    onSaveToServer={handleSaveToServer}
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

                  {/* 移动端 notes：紧随 content，桌面端隐藏 */}
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

              {/* 桌面端固定（fixed）笔记：通过 Portal 挂在 body 上，不随 content 滚动 */}
              {showNotesPanel && notesFixedStyle &&
                createPortal(
                  <div
                    className={`hidden lg:block fixed z-50 transition-all duration-300 ease-out
                                ${notesOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                    style={{
                      top: notesFixedStyle.top,
                      left: notesFixedStyle.left,
                      width: notesFixedStyle.width,
                      height: notesFixedStyle.height,
                    }}
                  >
                    <div
                      className="
                        h-full
                        rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-lg
                        dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
                        overflow-y-auto
                      "
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
                    </div>
                  </div>,
                  document.body
                )
              }
            </div>
          </div>
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

       {canEditContent && isMetadataEditorOpen && metadataEditorInitial && (
  <MetadataEditorOverlay
    metadata={metadataEditorInitial}
    abstract={displayContent?.abstract}
    keywords={displayContent?.keywords}
    onCancel={handleMetadataOverlayCancel}
    onSubmit={handleMetadataOverlaySubmit}     
    isSubmitting={isMetadataSubmitting}
    externalError={metadataEditorError}
    userPaperId={resolvedUserPaperId ?? undefined}
    paperId={paperId}

  />
)}
      </div>
    </PaperEditPermissionsContext.Provider>
  );
}