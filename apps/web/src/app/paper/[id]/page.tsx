'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useTabStore } from '@/stores/useTabStore';
import { ViewerSource } from '@/types/paper/viewer';
import { usePaperLoader } from '@/lib/hooks/usePaperLoader';
import { useViewerCapabilities } from '@/lib/hooks/useViewerCapabilities';
import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import PaperContent from '@/components/paper/PaperContent';
import type { Paper, PaperContent as PaperContentModel } from '@/types/paper';
import EditingWorkspacePlaceholder from '@/components/paper/editor/EditingWorkspacePlaceholder';
import { useAuth } from '@/contexts/AuthContext';

type Lang = 'en' | 'both';

export default function PaperPage() {
  const params = useParams();
  const searchParams = useSearchParams();
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

  const sessionSource: ViewerSource = useMemo(() => {
    if (tabData.source) return tabData.source;
    if (urlSource) return urlSource;
    if (isAdmin) return 'public-admin';
    if (user) return 'personal-owner';
    return 'public-guest';
  }, [tabData.source, urlSource, isAdmin, user]);

  const source = tabData.source ?? urlSource ?? sessionSource;

  const { paper, isLoading, error } = usePaperLoader(
    paperId,
    source,
    tabData.initialPaper,
  );

  const capabilities = useViewerCapabilities(source);

  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);

  const canToggleEditMode =
    capabilities.canEditPersonalPaper || capabilities.canEditPublicPaper;

  useEffect(() => {
    if (!paper) {
      setEditableDraft(null);
      setIsEditing(false);
      return;
    }

    setEditableDraft({
      metadata: paper.metadata,
      abstract: paper.abstract,
      keywords: paper.keywords,
      sections: paper.sections,
      references: paper.references,
      attachments: paper.attachments,
    });
  }, [paper]);

  const handleToggleEditMode = () => {
    if (!canToggleEditMode || !paper) return;

    setIsEditing((prev) => !prev);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setHighlightedRefs([]);
    setActiveBlockId(null);
  };

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

  return (
    <div className="relative h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
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
              ...capabilities,
              canToggleEditMode,
              isEditing,
              onToggleEditMode: canToggleEditMode ? handleToggleEditMode : undefined,
              onAddNote: capabilities.canAddNotes
                ? () => {
                    /* TODO: 打开笔记面板 */
                  }
                : undefined,
              onEditPublicPaper: capabilities.canEditPublicPaper
                ? () => {
                    /* TODO: 跳转到编辑公共论文 */
                  }
                : undefined,
              onEditPersonalPaper: capabilities.canEditPersonalPaper
                ? () => {
                    /* TODO: 打开个人论文编辑弹窗 */
                  }
                : undefined,
              onToggleVisibility: capabilities.canToggleVisibility
                ? () => {
                    /* TODO: 调用后端切换显示状态 */
                  }
                : undefined,
            }}
          />
        </div>
      </div>

      <div className="h-full overflow-hidden">
        {isEditing && editableDraft ? (
          <EditingWorkspacePlaceholder
            content={editableDraft}
            lang={lang}
            onExit={handleToggleEditMode}
          />
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
