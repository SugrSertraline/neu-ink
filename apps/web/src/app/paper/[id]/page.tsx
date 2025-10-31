'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import NavigationLite, { SectionLike as NavSection } from '@/components/paper/editor/NavigationLite';

import { useTabStore } from '@/stores/useTabStore';
import { ViewerSource } from '@/types/paper/viewer';
import { usePaperLoader } from '@/lib/hooks/usePaperLoader';
import { useViewerCapabilities } from '@/lib/hooks/useViewerCapabilities';
import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import PaperContent from '@/components/paper/PaperContent';
import type { Paper, PaperContent as PaperContentModel } from '@/types/paper';
import { useAuth } from '@/contexts/AuthContext';
import EditorShell from '@/components/paper/editor/EditorShell';
import CenterAnchors from '@/components/paper/editor/CenterAnchors';

type Lang = 'en' | 'both';

export default function PaperPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { tabs } = useTabStore();
  const { user, isAdmin } = useAuth();

  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const tabData = useMemo(() => {
    const tabKey = `paper:${paperId}`;
    const tab = tabs.find((t) => t.id === tabKey);
    return (tab?.data ?? {}) as {
      paperId?: string;
      source?: ViewerSource;
      initialPaper?: Paper;
    };
  }, [tabs, paperId]);

  const urlSource = (searchParams?.get('source') ?? null) as ViewerSource | null;

  // 高权限优先：管理员优先 public-admin
  const sourceCandidates = useMemo<ViewerSource[]>(() => {
    const seen = new Set<ViewerSource>();
    const push = (s?: ViewerSource | null) => {
      if (s && !seen.has(s)) seen.add(s);
    };

    // 1) URL 显式指定（如果不希望覆盖，可移到最后）
    if (urlSource) push(urlSource);

    // 2) 登录态优先级
    if (user && isAdmin) {
      push('public-admin');
      push('personal-owner');
    } else if (user) {
      push('personal-owner');
    }

    // 3) Tab 提示与预加载提示
    push(tabData.source);
    if (tabData.initialPaper) {
      push(
        tabData.initialPaper.isPublic
          ? (isAdmin ? 'public-admin' : 'public-guest')
          : 'personal-owner',
      );
    }

    // 4) 兜底
    push('public-guest');

    return Array.from(seen) as ViewerSource[];
  }, [tabData.source, tabData.initialPaper, urlSource, user, isAdmin]);

  const { paper, userPaperMeta, isLoading, error, activeSource } =
    usePaperLoader(paperId, sourceCandidates, tabData.initialPaper);

  const effectiveSource = activeSource ?? sourceCandidates[0] ?? 'public-guest';
  const capabilities = useViewerCapabilities(effectiveSource);

  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // 编辑态相关状态
  const [isEditing, setIsEditing] = useState(false);
  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);

  // 滚动容器
  const contentRef = useRef<HTMLDivElement>(null);      // 右侧预览滚动容器（沿用）
  const centerPaneRef = useRef<HTMLDivElement>(null);   // 中间编辑滚动容器（新增）

  // 左侧导航当前高亮的章节
  const [activeNavId, setActiveNavId] = useState<string | null>(null);

  // 当前来源判断
  const isPublicAdminView =
    effectiveSource === 'public-admin' && capabilities.canEditPublicPaper;

  const isPersonalOwnerView =
    effectiveSource === 'personal-owner' && capabilities.canEditPersonalPaper;

  // 允许管理员与个人拥有者进行内联编辑；若切到无权限来源则退出编辑
  useEffect(() => {
    const inlineEditAllowed = isPublicAdminView || isPersonalOwnerView;
    if (isEditing && !inlineEditAllowed) {
      setIsEditing(false);
    }
  }, [isPublicAdminView, isPersonalOwnerView, isEditing]);

  useEffect(() => {
    if (!paper) {
      setEditableDraft(null);
      setIsEditing(false);
      return;
    }

    // 用当前论文内容初始化草稿
    setEditableDraft({
      metadata: paper.metadata,
      abstract: paper.abstract,
      keywords: paper.keywords,
      sections: paper.sections,
      references: paper.references,
      attachments: paper.attachments,
    });
  }, [paper]);

  // 右侧搜索跳转（保留原逻辑）
  const handleSearchNavigate = (direction: 'next' | 'prev') => {
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
  };

  // 左侧导航树数据
  const navSections: NavSection[] = useMemo(() => {
    const map = (s: any): NavSection => ({
      id: s.id,
      title: s.title,
      subsections: (s.subsections ?? []).map(map),
    });
    return (editableDraft?.sections ?? []).map(map);
  }, [editableDraft?.sections]);

  // 构建锚点映射：每个节取第一个 block.id 作为右侧锚点
  type SectionForAnchors = {
    id: string;
    title: { en?: string; zh?: string };
    content?: { id: string }[];
    subsections?: SectionForAnchors[];
  };

  const anchorSpecs = useMemo(() => {
    const res: { sectionId: string; rightBlockId?: string | null }[] = [];
    const walk = (s: SectionForAnchors) => {
      const firstBlockId = s?.content?.[0]?.id ?? null;
      res.push({ sectionId: s.id, rightBlockId: firstBlockId });
      (s.subsections ?? []).forEach(walk);
    };
    (editableDraft?.sections as unknown as SectionForAnchors[] | undefined)?.forEach(walk);
    return res;
  }, [editableDraft?.sections]);

  // 启用中↔右双向滚动同步，并联动左侧导航高亮
  useBidirectionalScrollSync({
    centerRef: centerPaneRef,
    rightRef: contentRef,
    anchors: anchorSpecs,
    onActiveChange: (id) => setActiveNavId(id),
    topMargin: 16,
  });

  // 左侧点击 → 只滚动中间（右侧会自动跟随）
  const scrollCenterTo = (id: string) => {
    const container = centerPaneRef.current;
    if (!container) return;
    const el = container.querySelector(
      `[data-center-anchor="${cssEscapeSafe(id)}"]`,
    ) as HTMLElement | null;
    if (!el) return;

    const cRect = container.getBoundingClientRect();
    const tRect = el.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + (tRect.top - cRect.top) - 16,
      behavior: 'smooth',
    });
  };

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

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-700 dark:text-slate-300">
            {error || '论文内容不存在'}
          </p>
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

  // 统一“编辑”按钮：点击切换编辑/退出编辑
  const handleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="relative h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <PaperHeader
            lang={lang}
            setLang={setLang}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResultsCount={searchResults.length}
            currentSearchIndex={currentSearchIndex}
            onSearchNavigate={handleSearchNavigate}
            actions={{
              // 管理员或个人拥有者可编辑
              editEnabled: isPublicAdminView || isPersonalOwnerView,
              editLabel: '编辑',
              isEditing,
              onEdit: handleEdit,

              // 可见性切换（通常管理员）
              canToggleVisibility: capabilities.canToggleVisibility,
              isPublicVisible: paper.isPublic,
              onToggleVisibility: capabilities.canToggleVisibility
                ? () => {
                    // TODO: 切换可见性后刷新当前 paper
                    // await toggleVisibility(paper.id, !paper.isPublic)
                  }
                : undefined,
            }}
          />
        </div>
      </div>

      {/* 内容区域：编辑态优先 */}
      <div className="h-full overflow-hidden">
        {isEditing && editableDraft ? (
          // === 用 EditorShell 作为三栏骨架；右侧复用阅读态，数据源改为 editableDraft ===
          <EditorShell
            topOffset={112}
            persistKey={`editor-shell-layout:${paperId}`}
            centerScrollRef={centerPaneRef}
            rightScrollRef={contentRef}
            left={
              <NavigationLite
                sections={navSections}
                lang={lang as any}
                activeId={activeNavId}
                onSelect={scrollCenterTo}
              />
            }
            right={
              <div className="max-w-5xl mx-auto p-8">
                <PaperMetadata metadata={editableDraft.metadata} />
                <PaperContent
                  sections={editableDraft.sections}
                  references={editableDraft.references}
                  lang={lang}
                  searchQuery={searchQuery}
                  activeBlockId={activeBlockId}
                  setActiveBlockId={setActiveBlockId}
                  highlightedRefs={highlightedRefs}
                  setHighlightedRefs={setHighlightedRefs}
                  contentRef={contentRef}
                  setSearchResults={setSearchResults}
                  setCurrentSearchIndex={setCurrentSearchIndex}
                />
              </div>
            }
          >
            {/* 中间：章节锚点占位（后续逐步替换为真实编辑器） */}
            <div data-editor-center-container>
              <CenterAnchors sections={editableDraft.sections as any} lang={lang as any} />
            </div>
          </EditorShell>
        ) : (
          <div ref={contentRef} className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto p-8 pt-28">
              <PaperMetadata metadata={paper.metadata} />
              <PaperContent
                sections={paper.sections}
                references={paper.references}
                lang={lang}
                searchQuery={searchQuery}
                activeBlockId={activeBlockId}
                setActiveBlockId={setActiveBlockId}
                highlightedRefs={highlightedRefs}
                setHighlightedRefs={setHighlightedRefs}
                contentRef={contentRef}
                setSearchResults={setSearchResults}
                setCurrentSearchIndex={setCurrentSearchIndex}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   辅助：滚动同步工具与 Hook
   ========================= */

// 安全处理选择器转义
function cssEscapeSafe(v: string) {
  // @ts-ignore
  const esc = (window as any).CSS?.escape;
  return typeof esc === 'function' ? esc(v) : v;
}

// 在容器内选择“离顶部参考线最近的元素”
function pickActiveByTop(container: HTMLElement, elements: HTMLElement[], topMargin = 16) {
  if (!elements.length) return null;
  const topLine = container.getBoundingClientRect().top + topMargin;
  let bestEl: HTMLElement | null = null;
  let bestDist = Infinity;

  for (const el of elements) {
    const dist = Math.abs(el.getBoundingClientRect().top - topLine);
    if (dist < bestDist) {
      bestDist = dist;
      bestEl = el;
    }
  }
  return bestEl;
}

// 只滚动“指定容器”，避免影响 window
function smoothScrollContainerTo(container: HTMLElement, targetEl: HTMLElement, topMargin = 16) {
  const cRect = container.getBoundingClientRect();
  const tRect = targetEl.getBoundingClientRect();
  const delta = tRect.top - cRect.top;
  container.scrollTo({
    top: container.scrollTop + delta - topMargin,
    behavior: 'smooth',
  });
}

function useBidirectionalScrollSync(opts: {
  centerRef: React.RefObject<HTMLDivElement | null>;
  rightRef: React.RefObject<HTMLDivElement | null>;
  anchors: { sectionId: string; rightBlockId?: string | null }[];
  onActiveChange?: (sectionId: string) => void;
  topMargin?: number;
}) {
  const { centerRef, rightRef, anchors, onActiveChange, topMargin = 16 } = opts;

  // 预处理两侧锚点（中：data-center-anchor；右：block id）
  const pairs = useMemo(() => {
    const center = centerRef.current;
    const right = rightRef.current;
    if (!center || !right)
      return [] as { sectionId: string; centerEl: HTMLElement; rightEl: HTMLElement }[];

    const res: { sectionId: string; centerEl: HTMLElement; rightEl: HTMLElement }[] = [];
    for (const a of anchors) {
      const c = center.querySelector(
        `[data-center-anchor="${cssEscapeSafe(a.sectionId)}"]`,
      ) as HTMLElement | null;
      if (!c) continue;

      let r: HTMLElement | null = null;
      if (a.rightBlockId) {
        r = right.querySelector(`#${cssEscapeSafe(a.rightBlockId)}`) as HTMLElement | null;
      }
      if (!r) continue;

      res.push({ sectionId: a.sectionId, centerEl: c, rightEl: r });
    }
    return res;
  }, [centerRef.current, rightRef.current, anchors]);

  // 锁，防止循环滚动；raf 控制节流
  const lockRef = useRef<'center' | 'right' | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const center = centerRef.current;
    const right = rightRef.current;
    if (!center || !right) return;
    if (!pairs.length) return;

    const centerEls = pairs.map((p) => p.centerEl);
    const rightEls = pairs.map((p) => p.rightEl);

    const findSectionByEl = (el: HTMLElement, side: 'center' | 'right') => {
      const idx = (side === 'center' ? centerEls : rightEls).indexOf(el);
      return idx >= 0 ? pairs[idx].sectionId : null;
    };

    const cancelRaf = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const schedule = (cb: () => void) => {
      cancelRaf();
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        cb();
      });
    };

    const onCenterScroll = () => {
      if (lockRef.current === 'right') return;
      schedule(() => {
        const activeEl = pickActiveByTop(center, centerEls, topMargin);
        if (!activeEl) return;

        const sectionId = findSectionByEl(activeEl, 'center');
        if (!sectionId) return;
        onActiveChange?.(sectionId);

        const pair = pairs.find((p) => p.sectionId === sectionId);
        if (!pair) return;

        lockRef.current = 'center';
        smoothScrollContainerTo(right, pair.rightEl, topMargin);
        window.setTimeout(() => (lockRef.current = null), 220);
      });
    };

    const onRightScroll = () => {
      if (lockRef.current === 'center') return;
      schedule(() => {
        const activeEl = pickActiveByTop(right, rightEls, topMargin);
        if (!activeEl) return;

        const sectionId = findSectionByEl(activeEl, 'right');
        if (!sectionId) return;
        onActiveChange?.(sectionId);

        const pair = pairs.find((p) => p.sectionId === sectionId);
        if (!pair) return;

        lockRef.current = 'right';
        smoothScrollContainerTo(center, pair.centerEl, topMargin);
        window.setTimeout(() => (lockRef.current = null), 220);
      });
    };

    center.addEventListener('scroll', onCenterScroll, { passive: true });
    right.addEventListener('scroll', onRightScroll, { passive: true });

    return () => {
      cancelRaf();
      center.removeEventListener('scroll', onCenterScroll);
      right.removeEventListener('scroll', onRightScroll);
    };
  }, [centerRef.current, rightRef.current, pairs, onActiveChange, topMargin]);
}
