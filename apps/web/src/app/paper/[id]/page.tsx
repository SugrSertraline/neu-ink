'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type CSSProperties,
  Suspense,
  useState,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTabStore } from '@/store/ui/tabStore';
import { ViewerSource } from '@/types/paper/viewer';

import { usePaperLoader } from '@/lib/hooks/usePaperLoader';
import { usePaperEditPermissions } from '@/lib/hooks/usePaperEditPermissions';
import { PaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useAuthStore } from '@/store/auth';
import { useEditorStore } from '@/store/editor/editorStore';

import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import PaperContent from '@/components/paper/PaperContent';
import PaperReferences from '@/components/paper/PaperReferences';
import PaperTableOfContents from '@/components/paper/PaperTableOfContents';
import { PaperAttachmentsDrawer } from '@/components/paper/PaperAttachmentsDrawer';
import { PaperLoadingState } from '@/components/paper/PaperLoadingState';
import { PaperErrorState } from '@/components/paper/PaperErrorState';
import { PaperNotesPanel } from '@/components/paper/PaperNotesPanel';
import { PaperDialogs } from '@/components/paper/PaperDialogs';

import { usePaperPageState } from '@/lib/hooks/usePaperPageState';
import { usePaperPageInteractions } from '@/lib/hooks/usePaperPageInteractions';
import { usePaperNotes } from '@/lib/hooks/usePaperNotes';
import { usePaperReferences } from '@/lib/hooks/usePaperReferences';
import { usePaperSections } from '@/lib/hooks/usePaperSections';
import { usePaperBlocks } from '@/lib/hooks/usePaperBlocks';
import { useReadingProgress } from '@/lib/hooks/useReadingProgress';
import { useAutoHeaderHeight } from '@/lib/hooks/useAutoHeaderHeight';
import { useNotesPanelPosition } from '@/lib/hooks/useNotesPanelPosition';
import { usePaperSectionOperations } from '@/lib/hooks/usePaperSectionOperations';
import { MOTION, WRAPPER_MAX_W, CONTENT_SHIFT_X, handleTOCNavigate, handleSearchNavigate } from '@/lib/utils/paperPageUtils';

const HEADER_STICKY_OFFSET = 8;

// 性能优化的 Intersection Observer Hook
function useIntersectionObserver(
  ref: React.RefObject<Element | null>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, options, hasIntersected]);

  return { isIntersecting, hasIntersected };
}

// 懒加载包装器组件
function LazyWrapper({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded-lg h-32" />,
  rootMargin = "100px"
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [forceRender, setForceRender] = useState(false);
  
  // 检查子组件是否使用了 createPortal
  const isPortalChild = useMemo(() => {
    // 更全面的检查：检查组件类型、函数名称以及子组件结构
    const childType = children as any;
    
    // 检查函数名称
    if (childType && typeof childType === 'function') {
      const functionName = childType.name || '';
      // 检查常见的 Portal 组件模式
      if (functionName.includes('Paper') ||
          functionName.includes('Dialog') ||
          functionName.includes('Drawer') ||
          functionName.includes('Menu') ||
          functionName.includes('Toolbar') ||
          functionName.includes('Panel') ||
          functionName.includes('SidePanel') ||
          functionName.includes('Attachments')) {
        return true;
      }
    }
    
    // 检查组件的 displayName
    if (childType && childType.type && typeof childType.type === 'function') {
      const displayName = childType.type.displayName || childType.type.name || '';
      if (displayName.includes('Paper') ||
          displayName.includes('Dialog') ||
          displayName.includes('Drawer') ||
          displayName.includes('Menu') ||
          displayName.includes('Toolbar') ||
          displayName.includes('Panel') ||
          displayName.includes('SidePanel') ||
          displayName.includes('Attachments')) {
        return true;
      }
    }
    
    // 检查是否是 PaperAttachmentsDrawer 组件
    if (childType && childType.type && childType.type.name === 'PaperAttachmentsDrawer') {
      return true;
    }
    
    // 检查子组件的 props 是否包含 isOpen 属性（常见的抽屉/对话框属性）
    if (childType && childType.props && 'isOpen' in childType.props) {
      return true;
    }
    
    return false;
  }, [children]);

  const { hasIntersected } = useIntersectionObserver(ref, {
    rootMargin: isPortalChild ? "0px" : rootMargin // 对于 Portal 组件，使用 0px 边距
  });

  // 对于 Portal 组件，添加一个强制渲染的机制
  useEffect(() => {
    if (isPortalChild && !hasIntersected) {
      // 延迟一小段时间后强制渲染 Portal 组件
      const timer = setTimeout(() => {
        setForceRender(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isPortalChild, hasIntersected]);

  return (
    <div ref={ref}>
      {(hasIntersected || (isPortalChild && forceRender)) ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}


function PaperPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuthStore();
  const { tabs } = useTabStore();
  
  // 添加本地状态来控制附件抽屉
  const [localIsAttachmentsDrawerOpen, setLocalIsAttachmentsDrawerOpen] = useState(false);
  
  // 监听本地状态变化
  useEffect(() => {
    console.log('localIsAttachmentsDrawerOpen 状态变化:', localIsAttachmentsDrawerOpen);
  }, [localIsAttachmentsDrawerOpen]);
  
  // 获取论文ID
  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  
  // 获取标签页数据
  const tabData = useMemo(() => {
    const tabKey = `paper:${paperId}`;
    const tab = tabs.find(t => t.id === tabKey);
    return (tab?.data ?? {}) as {
      paperId?: string;
      userPaperId?: string;
      source?: any;
      initialPaper?: any;
    };
  }, [tabs, paperId]);

  const urlSource = (searchParams?.get('source') ?? null) as any;

  const sourceCandidates = useMemo<ViewerSource[]>(() => {
    const seen = new Set<ViewerSource>();
    const push = (s?: ViewerSource | null) => {
      if (s && !seen.has(s)) seen.add(s);
    };

    push(urlSource as ViewerSource);
    push(tabData.source as ViewerSource);

    if (tabData.initialPaper) {
      push(tabData.initialPaper.isPublic ? 'public-guest' : 'personal-owner');
    }

    if (user) {
      push(isAdmin() ? 'public-admin' : 'personal-owner');
    }

    push(isAdmin() ? 'public-admin' : 'public-guest');

    return Array.from(seen) as ViewerSource[];
  }, [tabData.source, tabData.initialPaper, urlSource, user, isAdmin]);
  
  // 使用编辑状态
  const { setHasUnsavedChanges, switchToEdit, clearCurrentEditing, currentEditingId } = useEditorStore();
  
  // 使用自定义Hook管理状态
  const { paper, isLoading, error, activeSource } = usePaperLoader(
    paperId,
    sourceCandidates,
    tabData.initialPaper
  );
  const effectiveSource = activeSource ?? 'public-guest';
  const permissions = usePaperEditPermissions(effectiveSource);
  
  const pageState = usePaperPageState(paper);
  const {
    resolvedUserPaperId,
    isPersonalOwner,
    showNotesPanel,
    displayContent,
    metadata,
    lang,
    setLang,
    searchQuery,
    setSearchQuery,
    activeBlockId,
    setActiveBlockId,
    selectedBlockId,
    setSelectedBlockId,
    highlightedRefs,
    setHighlightedRefs,
    searchResults,
    setSearchResults,
    currentSearchIndex,
    setCurrentSearchIndex,
    editableDraft,
    setEditableDraft,
    isPublicVisible,
    setIsPublicVisible,
    isHeaderAffixed,
    setIsHeaderAffixed,
    attachments,
    setAttachments,
    isAttachmentsDrawerOpen,
    setIsAttachmentsDrawerOpen,
    isMetadataEditorOpen,
    setIsMetadataEditorOpen,
    metadataEditorInitial,
    setMetadataEditorInitial,
    metadataEditorError,
    setMetadataEditorError,
    isMetadataSubmitting,
    setIsMetadataSubmitting,
    isAbstractKeywordsEditorOpen,
    setIsAbstractKeywordsEditorOpen,
    abstractKeywordsEditorInitial,
    setAbstractKeywordsEditorInitial,
    abstractKeywordsEditorError,
    setAbstractKeywordsEditorError,
    isAbstractKeywordsSubmitting,
    setIsAbstractKeywordsSubmitting,
    isParseReferencesOpen,
    setIsParseReferencesOpen,
    openParseDialog,
    closeParseDialog,
  } = pageState;

  // 监听全局状态变化
  useEffect(() => {
    console.log('isAttachmentsDrawerOpen 状态变化:', isAttachmentsDrawerOpen);
  }, [isAttachmentsDrawerOpen]);

  // 使用自定义Hook管理交互
  const interactions = usePaperPageInteractions({
    paperId,
    resolvedUserPaperId,
    isPersonalOwner,
    editableDraft,
    paper,
    displayContent,
    setEditableDraft,
    setHasUnsavedChanges,
    setAttachments,
    setIsPublicVisible,
    setActiveBlockId,
    setSelectedBlockId,
  });

  const {
    handleMetadataEditStart,
    handleAbstractKeywordsEditStart,
    findBlockSection,
    handleMetadataUpdate,
    handleSaveToServer,
    handleAttachmentsChange,
    handleMetadataOverlaySubmit,
    handleAbstractKeywordsOverlaySubmit,
    handleBlockSelect,
    handleCloseNotes,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleParseTextAdd,
    handleToggleVisibility,
    handleReferencesAdded,
  } = interactions;

  // 使用其他Hook
  const {
    notesByBlock,
    isLoading: notesLoading,
    error: notesError,
    isMutating: notesMutating,
    loadNotes,
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
    saveReferencesToServer,
  } = usePaperReferences(editableDraft, setEditableDraft, () => {}, resolvedUserPaperId);

  const {
    handleSectionTitleUpdate,
    handleSectionInsert,
    handleSectionMove,
    handleSectionDelete,
    handleSectionAddBlock,
    updateSections,
    handleAddBlocksFromText,
  } = usePaperSections(setEditableDraft, () => {});

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

  const { updatePosition, saveImmediately } = useReadingProgress({
    userPaperId: resolvedUserPaperId || '',
    enabled: Boolean(isPersonalOwner && resolvedUserPaperId),
    saveInterval: 30000,
  });

  const { handleAddBlockAsSection, handleAddHeadingToSection, handleAddParagraphToSection, handleAddOrderedListToSection, handleAddUnorderedListToSection, handleAddMathToSection, handleAddFigureToSection, handleAddTableToSection } = usePaperSectionOperations({
    paperId,
    resolvedUserPaperId,
    isPersonalOwner,
    updateSections,
  });

  // Refs
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const headerRef = useAutoHeaderHeight('--app-header-h', 24, HEADER_STICKY_OFFSET);

  // 使用笔记面板位置Hook
  const { notesFixedStyle, notesOpen } = useNotesPanelPosition({
    showNotesPanel,
    wrapperRef: wrapperRef as any,
    headerRef: headerRef as any,
  });

  // 计算选中块信息
  const selectedBlockInfo = useMemo(() => {
    if (!selectedBlockId) return null;
    return findBlockSection(selectedBlockId, displayContent);
  }, [selectedBlockId, findBlockSection, displayContent]);

  // 计算笔记
  const notesForSelectedBlock = selectedBlockId ? notesByBlock[selectedBlockId] ?? [] : [];

  // 处理搜索导航
  const handleSearchNavigateCallback = useCallback(
    (direction: 'next' | 'prev') => {
      handleSearchNavigate(direction, searchResults, currentSearchIndex, setCurrentSearchIndex, setActiveBlockId);
    },
    [searchResults, currentSearchIndex, setCurrentSearchIndex, setActiveBlockId],
  );

  // 处理目录导航
  const handleTOCNavigateCallback = useCallback((elementId: string) => {
    handleTOCNavigate(elementId);
  }, []);

  // 处理滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderAffixed(window.scrollY > HEADER_STICKY_OFFSET / 2);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setIsHeaderAffixed]);

  // 处理论文变化
  useEffect(() => {
    if (!paper) {
      setEditableDraft(null);
      return;
    }
    setEditableDraft(paper);
    setAttachments(paper.attachments ?? {});
  }, [paper, setEditableDraft, setAttachments]);

  // 处理个人所有者状态变化
  useEffect(() => {
    if (!isPersonalOwner) {
      setSelectedBlockId(null);
    }
  }, [isPersonalOwner, setSelectedBlockId]);

  // 加载笔记
  useEffect(() => {
    if (isPersonalOwner && resolvedUserPaperId) {
      loadNotes();
    }
  }, [isPersonalOwner, resolvedUserPaperId, loadNotes]);

  // 计算头部操作
  const headerActions = useMemo(() => {
    const isPublicAdmin = effectiveSource === 'public-admin';

    return {
      canToggleVisibility: isPublicAdmin && permissions.canToggleVisibility,
      isPublicVisible,
      onToggleVisibility:
        isPublicAdmin && permissions.canToggleVisibility ? handleToggleVisibility : undefined,
      extraActionsHint: isPublicAdmin
        ? '公共库管理员视图，操作将对所有用户生效'
        : undefined,
    };
  }, [
    effectiveSource,
    permissions.canToggleVisibility,
    isPublicVisible,
    handleToggleVisibility,
  ]);

  // 处理解析文本完成
  const handleParseTextComplete = useCallback((sectionId: string, blocks: any[], afterBlockId: string | undefined, paperData: any) => {
    const isTempProgressBlock = blocks?.length === 1 && blocks[0].type === 'parsing';

    // 优先使用完整的 paperData
    if (paperData && paperData.sections) {
      // 更新整个论文数据
      setEditableDraft(paperData);
      return;
    }

    // 如果没有完整的paperData，则回退到只处理blocks
    updateSections(sections => {
      let touched = false;

      const updatedSections = sections.map(section => {
        if (section.id === sectionId) {
          touched = true;
          let currentBlocks = section.content || [];

          // 先删除所有临时进度块(type='parsing')
          currentBlocks = currentBlocks.filter(block => block.type !== 'parsing');

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
  }, [setEditableDraft, updateSections]);

  // 处理保存到服务器
  const handleSaveToServerCallback = useCallback(async (blockId?: string, sectionId?: string) => {
    if (blockId && sectionId) {
      // 如果提供了 blockId 和 sectionId，则只保存特定的 block
      const result = await handleBlockSaveToServer(blockId, sectionId, paperId, resolvedUserPaperId, isPersonalOwner, editableDraft || undefined);
      if (!result.success) {
        throw new Error(result.error || '保存失败');
      }
    } else {
      // 否则保存整个论文
      await handleSaveToServer();
    }
  }, [handleSaveToServer, handleBlockSaveToServer, paperId, resolvedUserPaperId, isPersonalOwner, editableDraft]);

  // 处理解析完成
  const handleParseCompleteCallback = useCallback((result: any) => {
    // 处理解析完成的结果，可以更新 UI 或状态
  }, []);

  // 处理章节添加
  const handleSectionAddedCallback = useCallback(() => {
    // 章节添加后不需要刷新页面，因为我们已经实现了乐观更新
  }, []);

  // 加载状态
  if (isLoading) {
    return <PaperLoadingState />;
  }

  // 错误状态
  if (error || !paper || !displayContent) {
    return <PaperErrorState error={error || undefined} />;
  }

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
          <LazyWrapper>
            <PaperHeader
              lang={lang}
              setLang={setLang}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResultsCount={searchResults.length}
              currentSearchIndex={currentSearchIndex}
              onSearchNavigate={handleSearchNavigateCallback}
              actions={headerActions as any}
              viewerSource={effectiveSource}
              onOpenAttachments={() => {
                console.log('onOpenAttachments 被调用');
                console.log('设置 localIsAttachmentsDrawerOpen 为 true');
                setLocalIsAttachmentsDrawerOpen(true);
                console.log('设置 isAttachmentsDrawerOpen 为 true');
                setIsAttachmentsDrawerOpen(true);
                console.log('状态更新完成');
              }}
              hasAttachments={Boolean(attachments && (attachments.pdf || attachments.markdown))}
            />
          </LazyWrapper>
        </div>

        <div ref={pageContainerRef} style={{ paddingBottom: 32 }}>
          <div
            ref={wrapperRef}
            className="mx-auto px-4 lg:px-8"
            style={{ maxWidth: WRAPPER_MAX_W }}
          >
            <div
              className="lg:items-start lg:gap-(--notes-gap,0) lg:flex"
              style={{ '--notes-gap': '0px' } as CSSProperties}
            >
              {/* 左侧内容区域：元数据、内容、参考文献 */}
              <motion.div
                ref={contentRef}
                className="max-w-5xl w-full p-8 mx-auto lg:mx-0 will-change-transform"
                initial={false}
                animate={{
                  x: showNotesPanel ? 0 : CONTENT_SHIFT_X,
                  width: 'auto'
                }}
                transition={MOTION}
              >
                <div className="flex flex-col gap-8 pb-24">
                  <LazyWrapper>
                    <PaperMetadata
                      metadata={displayContent.metadata}
                      abstract={displayContent.abstract}
                      keywords={displayContent.keywords}
                      lang={lang}
                      onEditRequest={() => metadata && handleMetadataEditStart(metadata, setIsMetadataEditorOpen, setMetadataEditorInitial, setMetadataEditorError)}
                      onAbstractKeywordsEditRequest={() => handleAbstractKeywordsEditStart(displayContent, setIsAbstractKeywordsEditorOpen, setAbstractKeywordsEditorInitial, setAbstractKeywordsEditorError)}
                      data-metadata="true"
                    />
                  </LazyWrapper>

                  <PaperContent
                  sections={editableDraft?.sections ?? []}
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
                    return handleSectionTitleUpdate(sectionId, title, paperId, userPaperId, isPersonalOwner, handleSaveToServerCallback);
                  }}
                  onSectionInsert={(targetSectionId, position, parentSectionId) => {
                    const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                    return handleSectionInsert(targetSectionId, position, parentSectionId, paperId, userPaperId, isPersonalOwner, handleSaveToServerCallback);
                  }}
                  onSectionMove={handleSectionMove}
                  onSectionDelete={async (sectionId) => {
                    console.log('page.tsx - onSectionDelete 被调用:', { sectionId, paperId, resolvedUserPaperId, isPersonalOwner });
                    const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                    try {
                      const result = await handleSectionDelete(sectionId, paperId, userPaperId, isPersonalOwner, handleSaveToServerCallback);
                      console.log('page.tsx - handleSectionDelete 返回结果:', result);
                      return result;
                    } catch (error) {
                      console.error('page.tsx - handleSectionDelete 出错:', error);
                      throw error;
                    }
                  }}
                  onSectionAddBlock={(sectionId, type) => {
                    return handleSectionAddBlock(sectionId, type, lang, paperId, resolvedUserPaperId, isPersonalOwner, handleSaveToServerCallback);
                  }}
                  onBlockUpdate={(blockId, block) => {
                    const blockInfo = findBlockSection(blockId, displayContent);
                    if (!blockInfo) return;

                    const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                    return handleBlockUpdate(blockId, block, blockInfo.section.id, paperId, userPaperId, isPersonalOwner);
                  }}
                  onBlockDuplicate={handleBlockDuplicate}
                  onBlockDelete={(blockId) => {
                    const blockInfo = findBlockSection(blockId, displayContent);
                    if (!blockInfo) return;

                    const userPaperId = isPersonalOwner ? resolvedUserPaperId : null;
                    return handleBlockDelete(blockId, blockInfo.section.id, paperId, userPaperId, isPersonalOwner, handleSaveToServerCallback);
                  }}
                  onBlockInsert={handleBlockInsert}
                  onBlockMove={handleBlockMove}
                  onBlockAddComponent={handleBlockAddComponent}
                  onParseTextAdd={permissions.canEditContent ? handleParseTextAdd : undefined}
                  onParseTextComplete={permissions.canEditContent ? (sectionId: string, blocks: any[], afterBlockId: string | undefined, paperData?: any) => handleParseTextComplete(sectionId, blocks, afterBlockId || '', paperData) : undefined}
                  onSaveToServer={handleSaveToServerCallback}
                  onParseComplete={handleParseCompleteCallback}
                  notesByBlock={notesByBlock}
                  isPersonalOwner={isPersonalOwner}
                  paperId={paperId}
                  userPaperId={resolvedUserPaperId}
                  updateSections={updateSections}
                  onAddBlockAsSection={permissions.canEditContent ? handleAddBlockAsSection : undefined}
                  onAddHeadingToSection={permissions.canEditContent ? handleAddHeadingToSection : undefined}
                  onAddParagraphToSection={permissions.canEditContent ? handleAddParagraphToSection : undefined}
                  onAddOrderedListToSection={permissions.canEditContent ? handleAddOrderedListToSection : undefined}
                  onAddUnorderedListToSection={permissions.canEditContent ? handleAddUnorderedListToSection : undefined}
                  onAddMathToSection={permissions.canEditContent ? handleAddMathToSection : undefined}
                  onAddFigureToSection={permissions.canEditContent ? handleAddFigureToSection : undefined}
                  onAddTableToSection={permissions.canEditContent ? handleAddTableToSection : undefined}
                  />

                  <LazyWrapper>
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
                    onReferenceEdit={permissions.canEditContent ? handleReferenceEdit : undefined}
                    onReferenceDuplicate={permissions.canEditContent ? handleReferenceDuplicate : undefined}
                    onReferenceInsertBelow={
                      permissions.canEditContent ? handleReferenceInsertBelow : undefined
                    }
                    onReferenceDelete={permissions.canEditContent ? handleReferenceDelete : undefined}
                    onReferenceMoveUp={permissions.canEditContent ? handleReferenceMoveUp : undefined}
                    onReferenceMoveDown={permissions.canEditContent ? handleReferenceMoveDown : undefined}
                    onReferenceAdd={permissions.canEditContent ? handleReferenceAdd : undefined}
                    onParseReferences={permissions.canEditContent ? openParseDialog : undefined}
                    data-references="true"
                  />
                  </LazyWrapper>

                  {(displayReferences?.length ?? 0) === 0 && <div className="h-4" />}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* 笔记面板 */}
        <LazyWrapper>
          <PaperNotesPanel
          showNotesPanel={showNotesPanel}
          selectedBlockId={selectedBlockId}
          selectedBlockInfo={selectedBlockInfo}
          notesForSelectedBlock={notesForSelectedBlock}
          notesLoading={notesLoading}
          notesMutating={notesMutating}
          notesError={notesError}
          loadNotes={loadNotes}
          displayContent={displayContent}
          highlightedRefs={highlightedRefs}
          setHighlightedRefs={setHighlightedRefs}
          contentRef={contentRef as any}
          notesFixedStyle={notesFixedStyle}
          notesOpen={notesOpen}
          handleCreateNote={handleCreateNote}
          handleUpdateNote={handleUpdateNote}
          handleDeleteNote={handleDeleteNote}
          handleCloseNotes={handleCloseNotes}
          />
        </LazyWrapper>

        {/* 对话框 */}
        <LazyWrapper>
          <PaperDialogs
          canEditContent={permissions.canEditContent}
          editingReferenceId={editingReferenceId}
          referenceDraft={referenceDraft}
          referenceEditorMode={referenceEditorMode}
          handleReferenceDraftChange={handleReferenceDraftChange}
          handleReferenceEditorSubmit={handleReferenceEditorSubmit}
          handleReferenceEditorCancel={handleReferenceEditorCancel}
          isMetadataEditorOpen={isMetadataEditorOpen}
          setIsMetadataEditorOpen={setIsMetadataEditorOpen}
          metadataEditorInitial={metadataEditorInitial}
          setMetadataEditorInitial={setMetadataEditorInitial}
          metadataEditorError={metadataEditorError}
          setMetadataEditorError={setMetadataEditorError}
          isMetadataSubmitting={isMetadataSubmitting}
          setIsMetadataSubmitting={setIsMetadataSubmitting}
          handleMetadataOverlaySubmit={async (next: any, abstract: any, keywords: any) => {
            setIsMetadataSubmitting(true);
            setMetadataEditorError(null);
            try {
              await handleMetadataOverlaySubmit(next, abstract, keywords);
              setIsMetadataEditorOpen(false);
              setMetadataEditorInitial(null);
            } catch (err) {
              const message = err instanceof Error ? err.message : '保存失败，请稍后重试';
              setMetadataEditorError(message);
            } finally {
              setIsMetadataSubmitting(false);
            }
          }}
          handleMetadataOverlayCancel={() => {
            setMetadataEditorError(null);
            setIsMetadataEditorOpen(false);
            setMetadataEditorInitial(null);
            clearCurrentEditing();
          }}
          isAbstractKeywordsEditorOpen={isAbstractKeywordsEditorOpen}
          setIsAbstractKeywordsEditorOpen={setIsAbstractKeywordsEditorOpen}
          abstractKeywordsEditorInitial={abstractKeywordsEditorInitial}
          setAbstractKeywordsEditorInitial={setAbstractKeywordsEditorInitial}
          abstractKeywordsEditorError={abstractKeywordsEditorError}
          setAbstractKeywordsEditorError={setAbstractKeywordsEditorError}
          isAbstractKeywordsSubmitting={isAbstractKeywordsSubmitting}
          setIsAbstractKeywordsSubmitting={setIsAbstractKeywordsSubmitting}
          handleAbstractKeywordsOverlaySubmit={(abstract: any, keywords: any) =>
            handleAbstractKeywordsOverlaySubmit(setIsAbstractKeywordsEditorOpen, setAbstractKeywordsEditorInitial, setAbstractKeywordsEditorError, setIsAbstractKeywordsSubmitting, abstract, keywords)
          }
          handleAbstractKeywordsOverlayCancel={() => {
            setAbstractKeywordsEditorError(null);
            setIsAbstractKeywordsEditorOpen(false);
            setAbstractKeywordsEditorInitial(null);
            clearCurrentEditing();
          }}
          isParseReferencesOpen={isParseReferencesOpen}
          paperId={paperId}
          resolvedUserPaperId={resolvedUserPaperId}
          isPersonalOwner={isPersonalOwner}
          handleReferencesAdded={handleReferencesAdded}
          closeParseDialog={closeParseDialog}
          />
        </LazyWrapper>

        {/* 悬浮目录 */}
        <LazyWrapper>
          <PaperTableOfContents
          paperContent={displayContent}
          containerRef={pageContainerRef}
          onNavigate={handleTOCNavigateCallback}
          />
        </LazyWrapper>

        {/* 附件管理抽屉 */}
        <PaperAttachmentsDrawer
          isOpen={localIsAttachmentsDrawerOpen}
          onClose={() => {
            console.log('PaperAttachmentsDrawer onClose 被调用');
            console.log('设置 localIsAttachmentsDrawerOpen 为 false');
            setLocalIsAttachmentsDrawerOpen(false);
            console.log('设置 isAttachmentsDrawerOpen 为 false');
            setIsAttachmentsDrawerOpen(false);
            console.log('关闭状态更新完成');
          }}
          paperId={paperId}
          userPaperId={resolvedUserPaperId}
          isPersonalOwner={isPersonalOwner}
          isAdmin={isAdmin()}
          attachments={attachments}
          onAttachmentsChange={handleAttachmentsChange}
          onSaveToServer={handleSaveToServerCallback}
          onSectionAdded={handleSectionAddedCallback}
          onAddBlockAsSection={permissions.canEditContent ? handleAddBlockAsSection : undefined}
          onAddHeadingToSection={permissions.canEditContent ? handleAddHeadingToSection : undefined}
          onAddParagraphToSection={permissions.canEditContent ? handleAddParagraphToSection : undefined}
          onAddOrderedListToSection={permissions.canEditContent ? handleAddOrderedListToSection : undefined}
          onAddUnorderedListToSection={permissions.canEditContent ? handleAddUnorderedListToSection : undefined}
          onAddMathToSection={permissions.canEditContent ? handleAddMathToSection : undefined}
          onAddFigureToSection={permissions.canEditContent ? handleAddFigureToSection : undefined}
          onAddTableToSection={permissions.canEditContent ? handleAddTableToSection : undefined}
          sections={editableDraft?.sections || []}
        />
      </div>
    </PaperEditPermissionsContext.Provider>
  );
}

export default function PaperPage() {
  return (
    <Suspense fallback={<PaperLoadingState />}>
      <PaperPageContent />
    </Suspense>
  );
}
