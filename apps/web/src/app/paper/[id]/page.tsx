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
  Suspense,
} from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
import PaperTableOfContents from '@/components/paper/PaperTableOfContents';
import { PaperFloatingViewer } from '@/components/paper/PaperFloatingViewer';
import dynamic from 'next/dynamic';
const PaperAttachmentsDrawer = dynamic(
  () => import('@/components/paper/PaperAttachmentsDrawer').then(mod => mod.PaperAttachmentsDrawer),
  {
    ssr: false,
    loading: () => null, // 或者写一个 Loading 占位
  },
);

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
import { useReadingProgress } from '@/lib/hooks/useReadingProgress';
import ParseReferencesDialog from '@/components/paper/ParseReferencesDialog';
import {
  NOTES_PANEL_WIDTH,
  NOTES_PANEL_GAP,
} from '@/types/paper/constants';
import MetadataEditorDialog from '@/components/paper/MetadataEditorDialog';
import AbstractAndKeywordsEditorDialog from '@/components/paper/AbstractAndKeywordsEditorDialog';
import ReferenceEditorDialog from '@/components/paper/ReferenceEditorDialog';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

type Lang = 'en' | 'both';
const HEADER_STICKY_OFFSET = 8;

// 与 Tailwind 的 max-w-5xl (64rem) 对齐，使 content+notes 整体居中时宽度可控
const CONTENT_MAX_W_REM = 64;

// 统一动画参数
const MOTION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
const PANEL_DELAY_IN = 0.12;

// NEW：固定 wrapper 的最大宽度（内容 + 间距 + 面板宽度）
const WRAPPER_MAX_W = `calc(${CONTENT_MAX_W_REM}rem + ${NOTES_PANEL_GAP}px + ${NOTES_PANEL_WIDTH}px)`;
// NEW：内容在“未显示面板”时右移半个(面板+间距)，看起来居中；显示面板时回到 0
const CONTENT_SHIFT_X = (NOTES_PANEL_WIDTH + NOTES_PANEL_GAP) / 2;

type ReferenceEditorOverlayProps = {
  mode: 'create' | 'edit';
  reference: Reference;
  onChange: (next: Reference) => void;
  onCancel: () => void;
  onSave: () => void;
  container?: HTMLElement | null;
  isOpen: boolean;
};

function ReferenceEditorOverlay({
  mode,
  reference,
  onChange,
  onCancel,
  onSave,
  container,
  isOpen,
}: ReferenceEditorOverlayProps) {
  const portalTarget = container ?? document.body;
  if (!portalTarget) return null;

  // 禁用页面滚动
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setVars = (h: number) => {
      const actual = Math.round(h);
      const total = actual + stickyOffset;
      const root = document.documentElement;

      // 使用更稳定的更新方式，减少布局抖动
      root.style.setProperty(varName, `${total}px`);
    };

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        // 使用防抖处理，减少频繁更新
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setVars(rect.height);
        }, 50);
      }
    };

    const ro = new ResizeObserver(handleResize);

    // 初始设置高度
    setVars(el.getBoundingClientRect().height);
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [varName, extraScrollPad, stickyOffset]);

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

function PaperPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { tabs } = useTabStore();
  const { user, isAdmin } = useAuth();

  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const pageContainerRef = useRef<HTMLDivElement>(null);
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
  const [isPublicVisible, setIsPublicVisible] = useState(paper?.isPublic ?? false);
  const isPersonalOwner = effectiveSource === 'personal-owner';

  useEffect(() => {
    if (paper) {
      setIsPublicVisible(paper.isPublic);
    }
  }, [paper]);

  const { setHasUnsavedChanges, switchToEdit, clearEditing, currentEditingId } = useEditingState();

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
  const [isAbstractKeywordsEditorOpen, setIsAbstractKeywordsEditorOpen] = useState(false);
  const [abstractKeywordsEditorInitial, setAbstractKeywordsEditorInitial] = useState<{
    abstract?: { en?: string; zh?: string };
    keywords?: string[];
  } | null>(null);
  const [abstractKeywordsEditorError, setAbstractKeywordsEditorError] = useState<string | null>(null);
  const [isAbstractKeywordsSubmitting, setIsAbstractKeywordsSubmitting] = useState(false);
  const [isHeaderAffixed, setIsHeaderAffixed] = useState(false);
  const [isParseReferencesOpen, setIsParseReferencesOpen] = useState(false);


  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // 外层居中壳
  const headerRef = useAutoHeaderHeight('--app-header-h', 24, HEADER_STICKY_OFFSET);

  // 固定面板位置状态
  const [notesFixedStyle, setNotesFixedStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const [notesOpen, setNotesOpen] = useState(false); // 标志位（不再用 CSS 过渡，动画由 framer 接管）

  const displayContent = editableDraft ?? paper ?? null;
  const metadata = displayContent?.metadata ?? null;
  const [attachments, setAttachments] = useState(displayContent?.attachments ?? {});
  const [isAttachmentsDrawerOpen, setIsAttachmentsDrawerOpen] = useState(false);
  const [isFloatingViewerOpen, setIsFloatingViewerOpen] = useState(false);
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

  const openParseDialog = useCallback(() => {
    setIsParseReferencesOpen(true);
  }, []);

  const closeParseDialog = useCallback(() => {
    setIsParseReferencesOpen(false);
  }, []);

  const handleReferencesAdded = useCallback((references: Reference[]) => {
    // 更新本地状态
    setEditableDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        references: [...(prev.references || []), ...references],
      };
    });
    setHasUnsavedChanges(true);
  }, [setEditableDraft, setHasUnsavedChanges]);

  const {
    handleSectionTitleUpdate,
    handleSectionInsert,
    handleSectionMove,
    handleSectionDelete,
    handleSectionAddBlock,
    updateSections,
    handleAddBlocksFromText,
  } = usePaperSections(setEditableDraft, setHasUnsavedChanges);

  const {
    handleBlockUpdate,
    handleBlockDuplicate,
    handleBlockDelete,
    handleBlockInsert,
    handleBlockMove,
    handleBlockAddComponent,
    handleBlockSaveToServer,
  } = usePaperBlocks(
    lang,
    paperId,
    isPersonalOwner ? resolvedUserPaperId : null,
    isPersonalOwner,
    updateSections,
    setActiveBlockId
  );

  // 添加阅读进度跟踪功能
  const { updatePosition, saveImmediately } = useReadingProgress({
    userPaperId: resolvedUserPaperId || '',
    enabled: Boolean(isPersonalOwner && resolvedUserPaperId),
    saveInterval: 30000, // 30秒自动保存一次
  });

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

  const handleAbstractKeywordsEditStart = useCallback(() => {
    if (!displayContent) return;
    const switched = switchToEdit('abstractKeywords', {
      beforeSwitch: () => {
        setAbstractKeywordsEditorError(null);
      },
      onRequestSave: () => { },
    });
    if (!switched) return;
    setAbstractKeywordsEditorInitial({
      abstract: displayContent.abstract,
      keywords: displayContent.keywords,
    });
    setAbstractKeywordsEditorError(null);
    setIsAbstractKeywordsEditorOpen(true);
  }, [displayContent, switchToEdit]);

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
    setAttachments(paper.attachments ?? {});
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

    // 缓存上次计算的值,避免不必要的状态更新
    let lastStyle: { top: number; left: number; width: number; height: number } | null = null;

    // 节流计时器引用
    let throttleTimer: NodeJS.Timeout | null = null;
    let rafId: number | null = null;

    const compute = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const headerVar = getComputedStyle(document.documentElement).getPropertyValue('--app-header-h').trim();
      const headerH = parseFloat(headerVar || '160');
      const gap = NOTES_PANEL_GAP;

      const top = headerH + gap;
      const left = rect.right - NOTES_PANEL_WIDTH;
      const height = Math.max(200, window.innerHeight - top - gap);

      // 只有当值真正改变时才更新状态(使用较小的阈值避免微小抖动)
      const hasChanged = !lastStyle ||
        Math.abs(lastStyle.top - top) > 1 ||
        Math.abs(lastStyle.left - left) > 1 ||
        Math.abs(lastStyle.height - height) > 5;

      if (hasChanged) {
        const newStyle = {
          top,
          left,
          width: NOTES_PANEL_WIDTH,
          height,
        };
        lastStyle = newStyle;
        setNotesFixedStyle(newStyle);
      }
    };

    // 使用 requestAnimationFrame 优化计算时机
    const scheduleCompute = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        compute();
        rafId = null;
      });
    };

    // 节流版本的 compute - 用于高频事件(滚动)
    const throttledCompute = () => {
      if (throttleTimer) return;

      throttleTimer = setTimeout(() => {
        scheduleCompute();
        throttleTimer = null;
      }, 100); // 100ms 节流间隔
    };

    // 防抖版本的 compute - 用于 resize 事件
    let debounceTimer: NodeJS.Timeout | null = null;
    const debouncedCompute = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        scheduleCompute();
        debounceTimer = null;
      }, 150); // 150ms 防抖延迟
    };

    // 初始计算
    scheduleCompute();

    // ResizeObserver 使用节流
    const roWrapper = new ResizeObserver(() => throttledCompute());
    const roHeader = new ResizeObserver(() => throttledCompute());

    if (wrapperRef.current) roWrapper.observe(wrapperRef.current);
    // @ts-ignore
    if (headerRef?.current) roHeader.observe(headerRef.current as Element);

    // 窗口 resize 使用防抖
    window.addEventListener('resize', debouncedCompute, { passive: true });
    // 滚动使用节流
    window.addEventListener('scroll', throttledCompute, { passive: true });

    // 打开标志（动画由 framer 执行）
    const openRaf = requestAnimationFrame(() => setNotesOpen(true));

    return () => {
      // 清理所有计时器和监听器
      roWrapper.disconnect();
      roHeader.disconnect();
      window.removeEventListener('resize', debouncedCompute);
      window.removeEventListener('scroll', throttledCompute);

      if (throttleTimer) clearTimeout(throttleTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (rafId) cancelAnimationFrame(rafId);
      cancelAnimationFrame(openRaf);
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
    if (scroller === window) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      const parent = scroller as HTMLElement;
      const parentRect = parent.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const targetCenter = parent.scrollTop + (rect.top - parentRect.top) + (rect.height / 2) - (parentRect.height / 2);
      parent.scrollTo({ top: targetCenter, behavior: 'smooth' });
    }
  };

  // 目录导航
  const handleTOCNavigate = useCallback((elementId: string) => {
    let targetElement: HTMLElement | null = null;

    switch (elementId) {
      case 'metadata':
        targetElement = document.querySelector('[data-metadata="true"]') as HTMLElement;
        break;
      case 'abstract':
        targetElement = document.querySelector('[data-abstract="true"]') as HTMLElement;
        break;
      case 'references':
        targetElement = document.querySelector('[data-references="true"]') as HTMLElement;
        break;
      default:
        targetElement = document.getElementById(elementId) as HTMLElement;
        break;
    }

    if (targetElement) {
      targetElement.classList.add('toc-highlighted');
      setTimeout(() => {
        targetElement.classList.remove('toc-highlighted');
      }, 3000);

      scrollToTarget(targetElement);
    }
  }, []);

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

        // 确保附件信息包含在payload中
        const payloadWithAttachments = {
          ...payload,
          attachments: attachments
        };

        const result = isPersonalOwner
          ? await userPaperService.updateUserPaper(id, payloadWithAttachments)
          : await adminPaperService.updatePaper(id, payloadWithAttachments);

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
    [editableDraft, paperId, resolvedUserPaperId, isPersonalOwner, setHasUnsavedChanges, attachments]
  );

  // 处理附件变更
  const handleAttachmentsChange = useCallback((newAttachments: typeof attachments) => {
    setAttachments(newAttachments);
    setHasUnsavedChanges(true);
  }, [setAttachments, setHasUnsavedChanges]);

  const handleMetadataOverlaySubmit = useCallback(
    async (next: PaperMetadataModel, abstract?: { en?: string; zh?: string }, keywords?: string[]) => {
      setIsMetadataSubmitting(true);
      setMetadataEditorError(null);
      try {
        const base = (editableDraft ?? paper)!;
        const nextDraft: PaperContentModel = {
          ...base,
          metadata: next,
          abstract: abstract ?? base.abstract,
          keywords: keywords ?? base.keywords,
        };

        setEditableDraft(nextDraft);
        await handleSaveToServer(nextDraft);

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

  const handleAbstractKeywordsOverlaySubmit = useCallback(
    async (abstract?: { en?: string; zh?: string }, keywords?: string[]) => {
      setIsAbstractKeywordsSubmitting(true);
      setAbstractKeywordsEditorError(null);
      try {
        const base = (editableDraft ?? paper)!;
        const nextDraft: PaperContentModel = {
          ...base,
          abstract: abstract ?? base.abstract,
          keywords: keywords ?? base.keywords,
        };

        setEditableDraft(nextDraft);
        await handleSaveToServer(nextDraft);

        setIsAbstractKeywordsEditorOpen(false);
        setAbstractKeywordsEditorInitial(null);
        clearEditing();
      } catch (err) {
        const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
        setAbstractKeywordsEditorError(message);
        toast.error('摘要和关键词保存失败', { description: message });
      } finally {
        setIsAbstractKeywordsSubmitting(false);
      }
    },
    [editableDraft, paper, handleSaveToServer, clearEditing]
  );

  const handleAbstractKeywordsOverlayCancel = useCallback(() => {
    setAbstractKeywordsEditorError(null);
    setIsAbstractKeywordsEditorOpen(false);
    setAbstractKeywordsEditorInitial(null);
    clearEditing();
  }, [clearEditing]);

  const handleBlockSelect = useCallback(
    (blockId: string) => {
      setActiveBlockId(blockId);
      // 更新阅读位置
      if (isPersonalOwner && resolvedUserPaperId) {
        updatePosition(blockId);
      }
      if (isPersonalOwner) {
        setSelectedBlockId(prev => (prev === blockId ? null : blockId));
      }
    },
    [isPersonalOwner, resolvedUserPaperId, updatePosition],
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

  const handleParseTextAdd = useCallback(
    async (sectionId: string, text: string, afterBlockId?: string) => {
      try {
        const id = isPersonalOwner ? resolvedUserPaperId : paperId;

        if (!id) {
          toast.error('无法确定论文标识');
          return { success: false, error: '无法确定论文标识' };
        }

        const result = await handleAddBlocksFromText(sectionId, text, paperId, resolvedUserPaperId, isPersonalOwner, afterBlockId);

        if (result.success) {
          // 现在返回的是 tempBlockId，而不是 addedBlocks
          return { success: true, tempBlockId: result.tempBlockId };
        } else {
          return { success: false, error: result.error };
        }
      } catch (err) {
        let message = err instanceof Error ? err.message : '添加过程中发生未知错误';

        if (err instanceof Error) {
          if (err.message.includes('timeout') || err.message.includes('Timeout')) {
            message = '请求超时，可能是文本内容过多或服务器响应较慢，请稍后重试';
          } else if (err.message.includes('Network') || err.message.includes('fetch')) {
            message = '网络连接错误，请检查网络连接后重试';
          }
        }

        toast.error('添加失败', { description: message });
        return { success: false, error: message };
      }
    },
    [isPersonalOwner, resolvedUserPaperId, paperId, handleAddBlocksFromText]
  );

  const handleToggleVisibility = useCallback(async () => {
    try {
      const newVisibility = !isPublicVisible;
      const result = await adminPaperService.updatePaperVisibility(paperId, {
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
        if (paper) {
          setEditableDraft(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              isPublic: newVisibility,
            };
          });
        }
        setIsPublicVisible(newVisibility);
        setHasUnsavedChanges(false);
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
  }, [isPublicVisible, paperId, paper, setEditableDraft, setHasUnsavedChanges]);

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

  // 页面卸载时保存阅读进度
  useEffect(() => {
    return () => {
      if (isPersonalOwner && resolvedUserPaperId) {
        saveImmediately();
      }
    };
  }, [isPersonalOwner, resolvedUserPaperId, saveImmediately]);

  // 监听块添加成功事件，清除未保存状态
  useEffect(() => {
    const handleBlockAdded = () => {
      setHasUnsavedChanges(false);
    };

    window.addEventListener('blockAddedSuccessfully', handleBlockAdded);
    return () => {
      window.removeEventListener('blockAddedSuccessfully', handleBlockAdded);
    };
  }, [setHasUnsavedChanges]);

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
    // 如果是500错误或论文不存在，自动跳转到默认页面
    if (error?.includes('500') || error?.includes('论文内容不存在')) {
      useEffect(() => {
        // 延迟跳转，让用户看到错误信息
        const timer = setTimeout(() => {
          window.location.href = '/library';
        }, 3000);

        return () => clearTimeout(timer);
      }, []);
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-700 dark:text-slate-300">{error || '论文内容不存在'}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">3秒后自动跳转到论文库...</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.href = '/library'}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
            >
              前往论文库
            </button>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-all dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              返回上页
            </button>
          </div>
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
          style={{
            top: HEADER_STICKY_OFFSET,
            willChange: 'transform'
          }}
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
            onOpenAttachments={() => setIsAttachmentsDrawerOpen(true)}
          />
        </div>
    
        <div ref={pageContainerRef} style={{ paddingBottom: 32 }}>
          <div
            ref={wrapperRef}
            className="mx-auto px-4 lg:px-8"
            // NEW：固定为“内容 + 间距 + 面板”的最大宽度
            style={{ maxWidth: WRAPPER_MAX_W }}
          >
            <div
              className="lg:flex lg:items-start lg:gap-(--notes-gap,0)"
              style={{ '--notes-gap': `${NOTES_PANEL_GAP}px` } as CSSProperties}
            >
              {/* 左侧 content：只做 X 轴动画，避免 Y 抖动 */}
              <motion.div
                ref={contentRef}
                className="max-w-5xl w-full p-8 mx-auto lg:mx-0 will-change-transform"
                initial={false}
                animate={{ x: showNotesPanel ? 0 : CONTENT_SHIFT_X }}
                transition={MOTION}
              >
                <div className="flex flex-col gap-8 pb-24">
                  <PaperMetadata
                    metadata={displayContent.metadata}
                    abstract={displayContent.abstract}
                    keywords={displayContent.keywords}
                    lang={lang}
                    onEditRequest={handleMetadataEditStart}
                    onAbstractKeywordsEditRequest={handleAbstractKeywordsEditStart}
                    data-metadata="true"
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
                    onSectionTitleUpdate={(sectionId, title) => {
                      const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                      return handleSectionTitleUpdate(sectionId, title, paperId, userPaperId, isPersonalOwner, handleSaveToServer);
                    }}
                    onSectionInsert={(targetSectionId, position, parentSectionId) => {
                      const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                      return handleSectionInsert(targetSectionId, position, parentSectionId, paperId, userPaperId, isPersonalOwner, handleSaveToServer);
                    }}
                    onSectionMove={handleSectionMove}
                    onSectionDelete={(sectionId) => {
                      const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                      return handleSectionDelete(sectionId, paperId, userPaperId, isPersonalOwner, handleSaveToServer);
                    }}
                    onSectionAddBlock={(sectionId, type) => {
                      return handleSectionAddBlock(sectionId, type, lang, paperId, resolvedUserPaperId, isPersonalOwner, handleSaveToServer);
                    }}
                    onBlockUpdate={(blockId, block) => {
                      const blockInfo = findBlockSection(blockId);
                      if (!blockInfo) return;

                      const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                      return handleBlockUpdate(blockId, block, blockInfo.section.id, paperId, userPaperId, isPersonalOwner);
                    }}
                    onBlockDuplicate={handleBlockDuplicate}
                    onBlockDelete={(blockId) => {
                      const blockInfo = findBlockSection(blockId);
                      if (!blockInfo) return;

                      const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                      return handleBlockDelete(blockId, blockInfo.section.id, paperId, userPaperId, isPersonalOwner, handleSaveToServer);
                    }}
                    onBlockInsert={handleBlockInsert}
                    onBlockMove={handleBlockMove}
                    onBlockAddComponent={handleBlockAddComponent}
                    onParseTextAdd={canEditContent ? handleParseTextAdd : undefined}
                    onParseTextComplete={canEditContent ? (sectionId, blocks, afterBlockId, paperData) => {
                      const isTempProgressBlock =
                        blocks?.length === 1 && (blocks[0] as any).type === 'parsing';

                      // ★ 关键修复：优先使用完整的 paperData
                      if (paperData && paperData.sections) {
                        // 更新整个论文数据
                        setEditableDraft(paperData);
                        setHasUnsavedChanges(false);

                        // 显示成功消息
                        toast.success('解析完成，论文内容已更新');
                        return;
                      }

                      // 如果没有完整的paperData，则回退到只处理blocks（兼容旧逻辑）
                      updateSections(sections => {
                        let touched = false;

                        const updatedSections = sections.map(section => {
                          if (section.id === sectionId) {
                            touched = true;
                            let currentBlocks = section.content || [];

                            // 先删除所有临时进度块(type='parsing')
                            currentBlocks = currentBlocks.filter(block =>
                              (block as any).type !== 'parsing'
                            );

                            let insertIndex = currentBlocks.length; // 默认在末尾

                            if (afterBlockId) {
                              for (let i = 0; i < currentBlocks.length; i++) {
                                if (currentBlocks[i].id === afterBlockId) {
                                  insertIndex = i + 1;
                                  break;
                                }
                              }
                            }

                            // 插入新的blocks
                            const newBlocks = [...currentBlocks];
                            newBlocks.splice(insertIndex, 0, ...blocks);

                            return {
                              ...section,
                              content: newBlocks
                            };
                          }
                          return section;
                        });

                        return { sections: touched ? updatedSections : sections, touched };
                      });

                      // 显示成功消息
                      if (!isTempProgressBlock && blocks && blocks.length > 0) {
                        toast.success(`成功解析并添加了${blocks.length}个段落`);
                      }
                    } : undefined}
                    onSaveToServer={async () => {
                      if (currentEditingId) {
                        const blockInfo = findBlockSection(currentEditingId);
                        if (blockInfo) {
                          const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                          await handleBlockSaveToServer(currentEditingId, blockInfo.section.id, paperId, userPaperId, isPersonalOwner, editableDraft || undefined);
                          return;
                        }
                      }
                      await handleSaveToServer();
                    }}
                    onParseComplete={(result) => {
                      // 处理解析完成的结果，可以更新 UI 或状态
                      // 这里可以添加额外的处理逻辑，比如更新状态或显示通知
                    }}
                    notesByBlock={notesByBlock}
                    isPersonalOwner={isPersonalOwner}
                    paperId={paperId}
                    userPaperId={resolvedUserPaperId}
                    updateSections={updateSections}
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
                    onParseReferences={canEditContent ? openParseDialog : undefined}
                    data-references="true"
                  />

                  {(displayReferences?.length ?? 0) === 0 && <div className="h-4" />}

                  {/* 移动端 notes：顺滑折叠展开 */}
                  <AnimatePresence initial={false}>
                    {showNotesPanel && (
                      <motion.div
                        key="notes-mobile"
                        className="lg:hidden rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={MOTION}
                      >
                        <PersonalNotePanel
                          blockId={selectedBlockId!}
                          sectionId={selectedBlockInfo?.section?.id ?? ''}
                          sectionLabel={String(selectedBlockInfo?.section?.title ?? 'Section')}
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* 桌面端固定（fixed）笔记：Portal + 动画（先内容左移，后滑入） */}
              {createPortal(
                <AnimatePresence>
                  {showNotesPanel && notesFixedStyle ? (
                    <motion.div
                      key="notes-desktop"
                      className="hidden lg:block fixed z-50"
                      style={{
                        top: notesFixedStyle.top,
                        left: notesFixedStyle.left,
                        width: notesFixedStyle.width,
                        height: notesFixedStyle.height,
                      }}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ ...MOTION, delay: PANEL_DELAY_IN }}
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
                          sectionLabel={String(selectedBlockInfo?.section?.title ?? 'Section')}
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
                    </motion.div>
                  ) : null}
                </AnimatePresence>,
                document.body
              )}
            </div>
          </div>
        </div>

        {canEditContent && editingReferenceId && referenceDraft && (
          <ReferenceEditorDialog
            open={Boolean(editingReferenceId && referenceDraft)}
            onOpenChange={(open) => {
              if (!open) {
                handleReferenceEditorCancel();
              }
            }}
            mode={referenceEditorMode}
            reference={referenceDraft}
            onChange={handleReferenceDraftChange}
            onSave={handleReferenceEditorSubmit}
          />
        )}

        {canEditContent && isMetadataEditorOpen && metadataEditorInitial && (
          <MetadataEditorDialog
            open={isMetadataEditorOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleMetadataOverlayCancel();
              }
            }}
            metadata={metadataEditorInitial}
            abstract={displayContent?.abstract}
            keywords={displayContent?.keywords}
            onSubmit={handleMetadataOverlaySubmit}
            isSubmitting={isMetadataSubmitting}
            externalError={metadataEditorError}
            userPaperId={resolvedUserPaperId ?? undefined}
            paperId={paperId}
          />
        )}

        {canEditContent && isAbstractKeywordsEditorOpen && abstractKeywordsEditorInitial && (
          <AbstractAndKeywordsEditorDialog
            open={isAbstractKeywordsEditorOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleAbstractKeywordsOverlayCancel();
              }
            }}
            abstract={abstractKeywordsEditorInitial.abstract}
            keywords={abstractKeywordsEditorInitial.keywords}
            onSubmit={handleAbstractKeywordsOverlaySubmit}
            isSubmitting={isAbstractKeywordsSubmitting}
            externalError={abstractKeywordsEditorError}
            userPaperId={resolvedUserPaperId ?? undefined}
            paperId={paperId}
          />
        )}

        {/* 悬浮目录 */}
        <PaperTableOfContents
          paperContent={displayContent}
          containerRef={pageContainerRef}
          onNavigate={handleTOCNavigate}
        />

        {/* 参考文献解析对话框 */}
        {canEditContent && (
          <ParseReferencesDialog
            open={isParseReferencesOpen}
            onOpenChange={(open) => {
              if (!open) {
                closeParseDialog();
              }
            }}
            paperId={paperId}
            userPaperId={resolvedUserPaperId}
            isPersonalOwner={isPersonalOwner}
            onReferencesAdded={handleReferencesAdded}
          />
        )}

        {/* 附件管理抽屉 */}
        <PaperAttachmentsDrawer
          isOpen={isAttachmentsDrawerOpen}
          onClose={() => setIsAttachmentsDrawerOpen(false)}
          paperId={paperId}
          userPaperId={resolvedUserPaperId}
          isPersonalOwner={isPersonalOwner}
          isAdmin={isAdmin}
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
          onSaveToServer={handleSaveToServer}
        />
        
        {/* 悬浮查看器 */}
        <PaperFloatingViewer
          attachments={attachments}
          isVisible={isFloatingViewerOpen}
          onClose={() => setIsFloatingViewerOpen(false)}
        />
      </div>
    </PaperEditPermissionsContext.Provider>
  );

}

export default function PaperPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 dark:text-slate-400">加载论文中...</p>
        </div>
      </div>
    }>
      <PaperPageContent />
    </Suspense>
  );
}
