'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiGetData, apiPut } from '../../lib/api';
import type { BlockContent, PaperContent as PaperContentType, Section } from '../../types/paper';
import PaperHeader from './components/PaperHeader';
import PaperMetadata from './components/PaperMetadata';
import PaperContentComponent from './components/PaperContent';
import EditablePaperContent from './components/editor/EditablePaperContent';
import UnifiedNotesPanel from './components/UnifiedNotesPanel';
import { X } from 'lucide-react';
import { ChecklistNode } from '@/app/types/checklist';
import { fetchPaperChecklists } from '@/app/lib/checklistApi';
import { calculateAllNumbers, stripAllNumbers } from './utils/autoNumbering';
import { fetchPapers } from '@/app/lib/paperApi';

type Lang = 'en' | 'both';
type NoteMode = 'block' | 'checklist' | null;


export default function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  // 原有状态
  const [content, setContent] = useState<PaperContentType | null>(null);
  const [numberedContent, setNumberedContent] = useState<PaperContentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');
  
  // 统一的笔记状态
  const [noteMode, setNoteMode] = useState<NoteMode>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [showHeader, setShowHeader] = useState(false);
  const [hasChineseContent, setHasChineseContent] = useState(false);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);

  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<PaperContentType | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  
  // 清单相关状态
  const [paperChecklists, setPaperChecklists] = useState<ChecklistNode[]>([]);

  const contentRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHeaderHoveredRef = useRef(false);
  const originalContentRef = useRef<PaperContentType | null>(null);

  const HOVER_LEAVE_DELAY = 200;
  const SCROLL_AUTO_HIDE_DELAY = 200;
  const TRIGGER_AREA_HEIGHT = 'h-12';

  // 检查是否有中文内容
  const checkChineseContent = (sections: Section[]): boolean => {
    const checkBlock = (block: any): boolean => {
      if (block.content?.zh) return true;
      if (block.caption?.zh) return true;
      if (block.description?.zh) return true;
      return false;
    };

    const checkSection = (section: Section): boolean => {
      if (section.title?.zh) return true;
      if (section.content.some(checkBlock)) return true;
      if (section.subsections?.some(checkSection)) return true;
      return false;
    };

    return sections.some(checkSection);
  };

  useEffect(() => {
    if (content) {
      const numbered = calculateAllNumbers(content);
      setNumberedContent(numbered);
    }
  }, [content]);

  // 加载清单
  useEffect(() => {
    const loadChecklists = async () => {
      try {
        const checklists = await fetchPaperChecklists(id);
        setPaperChecklists(checklists);
      } catch (error) {
        console.error('加载清单失败:', error);
      }
    };
    loadChecklists();
  }, [id]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startHideTimer = useCallback((delay: number) => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (!isHeaderHoveredRef.current) {
        setShowHeader(false);
      }
    }, delay);
  }, [clearHideTimer]);

  const handleMouseEnter = useCallback(() => {
    isHeaderHoveredRef.current = true;
    clearHideTimer();
    setShowHeader(true);
  }, [clearHideTimer]);

  const handleMouseLeave = useCallback(() => {
    isHeaderHoveredRef.current = false;
    if (!isHeaderPinned) {
      startHideTimer(HOVER_LEAVE_DELAY);
    }
  }, [startHideTimer, HOVER_LEAVE_DELAY, isHeaderPinned]);

  // 切换header固定状态
  const handleTogglePin = useCallback(() => {
    setIsHeaderPinned(prev => !prev);
    if (isHeaderPinned) {
      startHideTimer(HOVER_LEAVE_DELAY);
    } else {
      setShowHeader(true);
    }
  }, [isHeaderPinned, startHideTimer, HOVER_LEAVE_DELAY]);

  // 加载论文内容
  useEffect(() => {
    const fetchPaperContent = async () => {
      try {
        setLoading(true);
        const data = await apiGetData<PaperContentType>(`/api/papers/${id}/content`);
        setContent(data);
        originalContentRef.current = JSON.parse(JSON.stringify(data));
        setHasChineseContent(checkChineseContent(data.sections));
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchPaperContent();
  }, [id]);

  // 滚动效果
  useEffect(() => {
    const handleScroll = () => {
      if (isHeaderPinned) return;
      
      clearHideTimer();
      setShowHeader(true);
      startHideTimer(SCROLL_AUTO_HIDE_DELAY);
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => {
        contentElement.removeEventListener('scroll', handleScroll);
        clearHideTimer();
      };
    }
  }, [clearHideTimer, startHideTimer, SCROLL_AUTO_HIDE_DELAY, isHeaderPinned]);

  // 编辑模式
  const handleEnterEditMode = () => {
    if (!content) return;
    setEditedContent(JSON.parse(JSON.stringify(content)));
    setIsEditMode(true);
    setNoteMode(null);
    setHasUnsavedChanges(false);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要放弃吗？');
      if (!confirmed) return;
    }
    setIsEditMode(false);
    setEditedContent(null);
    setHasUnsavedChanges(false);
    setSaveError(null);
  };

  const handleSaveChanges = async () => {
    if (!editedContent) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // 🆕 保存前清理编号
      const contentToSave = stripAllNumbers(editedContent);
      
      const updatedContent = await apiPut<PaperContentType>(
        `/api/papers/${id}/content`,
        contentToSave
      );

      setContent(updatedContent);
      originalContentRef.current = JSON.parse(JSON.stringify(updatedContent));
      setIsEditMode(false);
      setEditedContent(null);
      setHasUnsavedChanges(false);

      alert('✓ 保存成功！');
    } catch (error: any) {
      const errorMessage = error.message || '保存失败';
      setSaveError(errorMessage);
      console.error('Save error:', error);
      alert(`❌ ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (newContent: PaperContentType) => {
    setEditedContent(newContent);
    setHasUnsavedChanges(true);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditMode && (e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, editedContent]);

  // 点击段落
  const handleBlockClick = (blockId: string) => {
    if (isEditMode) return;
    setActiveBlockId(blockId);
    setNoteMode('block');
  };

  // 更新内容
  const handleContentUpdate = async (updatedContent: PaperContentType) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // 🆕 保存前清理编号
      const contentToSave = stripAllNumbers(updatedContent);
      
      const savedContent = await apiPut<PaperContentType>(
        `/api/papers/${id}/content`,
        contentToSave
      );

      setContent(savedContent);
      originalContentRef.current = JSON.parse(JSON.stringify(savedContent));
      return true;
    } catch (error: any) {
      const errorMessage = error.message || '保存失败';
      setSaveError(errorMessage);
      console.error('Save error:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };
// 🆕 处理单个块的快速编辑更新
const handleBlockQuickEdit = async (updatedBlock: BlockContent, sectionId: string) => {
  if (!numberedContent) return;
  
  // 递归查找并更新块
  const updateBlockInSection = (section: Section): Section => {
    if (section.id === sectionId) {
      return {
        ...section,
        content: section.content.map(block => 
          block.id === updatedBlock.id ? updatedBlock : block
        )
      };
    }
    
    if (section.subsections) {
      return {
        ...section,
        subsections: section.subsections.map(updateBlockInSection)
      };
    }
    
    return section;
  };
  
  const updatedContent = {
    ...numberedContent,
    sections: numberedContent.sections.map(updateBlockInSection)
  };
  
  // 保存到服务器
  await handleContentUpdate(updatedContent);
};


  // 搜索导航
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    const targetBlockId = searchResults[newIndex];
    const targetElement = document.getElementById(targetBlockId);

    if (targetElement && contentRef.current) {
      const containerRect = contentRef.current.getBoundingClientRect();
      const elementRect = targetElement.getBoundingClientRect();
      const scrollTop = contentRef.current.scrollTop;
      const targetPosition = scrollTop + (elementRect.top - containerRect.top) - 100;

      contentRef.current.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-slate-400">加载论文中...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <X className="w-16 h-16 mx-auto mb-2" />
            <p className="text-lg font-semibold">加载失败</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!numberedContent) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <p className="text-gray-500 dark:text-slate-400">未找到论文内容</p>
      </div>
    );
  }

  const showChineseWarning = lang === 'both' && !hasChineseContent;

  return (
    <div className="h-full bg-gray-50 dark:bg-slate-900 overflow-hidden relative">
      {/* 顶部触发区域 */}
      <div
        className={`absolute top-0 left-0 right-0 ${TRIGGER_AREA_HEIGHT} z-40`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Header */}
      <div
        className={`${
          isHeaderPinned
            ? 'sticky top-0 left-0 right-0 z-50'
            : 'absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out'
        } ${
          !isHeaderPinned && (showHeader ? 'translate-y-0' : '-translate-y-full')
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <PaperHeader
          lang={lang}
          setLang={setLang}
          noteMode={noteMode}
          setNoteMode={setNoteMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          contentRef={contentRef}
          searchResultsCount={searchResults.length}
          currentSearchIndex={currentSearchIndex}
          onSearchNavigate={navigateSearch}
          isEditMode={isEditMode}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          saveError={saveError}
          onEnterEditMode={handleEnterEditMode}
          onCancelEdit={handleCancelEdit}
          onSaveChanges={handleSaveChanges}
          isHeaderPinned={isHeaderPinned}
          onTogglePin={handleTogglePin}
        />
      </div>

      {/* 中文警告 */}
      {showChineseWarning && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-40 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm">⚠️ 该论文未配置中文内容</p>
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`h-full ${isEditMode ? '' : 'flex overflow-hidden'}`}>
        {/* 阅读模式 */}
        {!isEditMode && (
          <>
            <div
              ref={contentRef}
              className={`flex-1 overflow-y-auto ${
                noteMode ? 'border-r border-gray-200 dark:border-slate-700' : ''
              }`}
            >
              <div className="max-w-6xl mx-auto px-8 py-6">
                <PaperMetadata content={numberedContent} />
                <PaperContentComponent
                  sections={numberedContent.sections}
                  references={numberedContent.references}
                  lang={lang}
                  searchQuery={searchQuery}
                  activeBlockId={activeBlockId}
                  setActiveBlockId={setActiveBlockId}
                  onBlockClick={handleBlockClick}
                  highlightedRefs={highlightedRefs}
                  setHighlightedRefs={setHighlightedRefs}
                  contentRef={contentRef}
                  blockNotes={numberedContent.blockNotes}
                  setSearchResults={setSearchResults}
                  setCurrentSearchIndex={setCurrentSearchIndex}
                  onBlockUpdate={handleBlockQuickEdit} 
                />
              </div>
            </div>

            {/* 统一笔记面板 */}
            {noteMode && (
              <UnifiedNotesPanel
                content={numberedContent}
                mode={noteMode}
                activeBlockId={activeBlockId}
                activeChecklistId={activeChecklistId}
                checklists={paperChecklists}
                onClose={() => setNoteMode(null)}
                onContentUpdate={handleContentUpdate}
                onChecklistChange={setActiveChecklistId}
                isSaving={isSaving}
              />
            )}
          </>
        )}

        {/* 编辑模式 */}
        {isEditMode && editedContent && (
          <EditablePaperContent
            content={editedContent}
            onChange={handleContentChange}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}

