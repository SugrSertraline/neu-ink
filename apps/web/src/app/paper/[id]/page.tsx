'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

import { Loader2 } from 'lucide-react';
import PaperContent from '@/components/paper/PaperContent';
import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import { Paper } from '@/types/paper';
import { ApiResponse, BusinessResponse } from '@/types/api';

type Lang = 'en' | 'both';

export default function PaperPage() {
  const params = useParams();
  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  // Core state
  const [paperContent, setPaperContent] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // UI state
  const [lang, setLang] = useState<Lang>('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);

  // Search state
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);

  // Load paper content
  useEffect(() => {


   async function loadPaper() {
  try {
    setIsLoading(true);

    // ✅ 不要再断言成 ApiResponse<BusinessResponse<Paper>>
    const res = await paperApi.getPaper(paperId); // 推断为 ApiResponse<Paper>

    // 先看外层 HTTP 状态
    if (res.code === 200) {
      const payload = res.data as Paper | BusinessResponse<Paper> | null | undefined;

      // 再判断是否是内层业务包裹
      if (isBusinessResponse<Paper>(payload)) {
        if (isBizSuccess(payload.code) && payload.data) {
          setPaperContent(payload.data);
          setLoadError(null);
        } else {
          setLoadError(payload.message || '业务失败');
          setPaperContent(null);
        }
      } else if (payload) {
        // 单层：直接就是 Paper
        setPaperContent(payload as Paper);
        setLoadError(null);
      } else {
        setLoadError('返回空数据');
        setPaperContent(null);
      }
    } else {
      setLoadError(res.message || 'HTTP 请求失败');
      setPaperContent(null);
    }
  } catch (err: any) {
    console.error('加载论文失败:', err);
    setLoadError(err?.message || '网络错误');
    setPaperContent(null);
  } finally {
    setIsLoading(false);
  }
}

    if (paperId) loadPaper();
  }, [paperId]);

  // Search navigation
  const handleSearchNavigate = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    setCurrentSearchIndex(newIndex);

    const targetBlockId = searchResults[newIndex];
    const targetElement = document.getElementById(targetBlockId);

    if (targetElement && contentRef.current) {
      const containerRect = contentRef.current.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();
      const scrollTop = contentRef.current.scrollTop;
      const targetTop = scrollTop + (elementRect.top - containerRect.top) - 100;

      contentRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      setActiveBlockId(targetBlockId);
      window.setTimeout(() => setActiveBlockId(null), 2000);
    } else if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setActiveBlockId(targetBlockId);
      window.setTimeout(() => setActiveBlockId(null), 2000);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600">加载论文中...</p>
        </div>
      </div>
    );
  }

  // Error
  if (loadError || !paperContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-700">{loadError || '论文内容不存在'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回
          </button>
        </div>
      </div>
    );
  }
  // Main
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header - sticky */}
      <div className={isHeaderPinned ? 'sticky top-0 z-50' : ''}>
        <PaperHeader
          lang={lang}
          setLang={setLang}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResultsCount={searchResults.length}
          currentSearchIndex={currentSearchIndex}
          onSearchNavigate={handleSearchNavigate}
          isHeaderPinned={isHeaderPinned}
          onTogglePin={() => setIsHeaderPinned(!isHeaderPinned)}
        />
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-5xl mx-auto p-8">
            {/* Metadata */}

            <PaperMetadata metadata={paperContent.metadata} />

            {/* Sections */}
            <PaperContent
              sections={paperContent.sections}
              references={paperContent.references}
              lang={lang}
              searchQuery={searchQuery}
              activeBlockId={activeBlockId}
              setActiveBlockId={setActiveBlockId}
              onBlockClick={(id) => setActiveBlockId(id)}
              highlightedRefs={highlightedRefs}
              setHighlightedRefs={setHighlightedRefs}
              contentRef={contentRef}
              setSearchResults={setSearchResults}
              setCurrentSearchIndex={setCurrentSearchIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
