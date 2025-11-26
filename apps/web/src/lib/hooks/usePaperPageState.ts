'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTabStore } from '@/store/ui/tabStore';
import { useAuth } from '@/contexts/AuthContext';
import { ViewerSource } from '@/types/paper/viewer';
import type { Paper, PaperContent as PaperContentModel, PaperMetadata as PaperMetadataModel } from '@/types/paper';

type Lang = 'en' | 'both';

export function usePaperPageState(paper: Paper | null) {
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

  const resolvedUserPaperId = useMemo(() => {
    const isPersonalOwner = sourceCandidates[0] === 'personal-owner';
    if (!isPersonalOwner) return null;
    
    const urlUserPaperId = searchParams?.get('userPaperId');
    if (urlUserPaperId) return urlUserPaperId;
    if (tabData.userPaperId) return tabData.userPaperId;
    if (paper && (paper as any).userPaperId) return (paper as any).userPaperId as string;
    return null;
  }, [sourceCandidates, tabData.userPaperId, paper, searchParams]);

  // UI状态
  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);
  const [isPublicVisible, setIsPublicVisible] = useState(paper?.isPublic ?? false);
  const [isHeaderAffixed, setIsHeaderAffixed] = useState(false);
  const [attachments, setAttachments] = useState(paper?.attachments ?? {});
  const [isAttachmentsDrawerOpen, setIsAttachmentsDrawerOpen] = useState(false);

  // 编辑器状态
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [metadataEditorInitial, setMetadataEditorInitial] = useState<PaperMetadataModel | null>(null);
  const [metadataEditorError, setMetadataEditorError] = useState<string | null>(null);
  const [isMetadataSubmitting, setIsMetadataSubmitting] = useState(false);
  
  const [isAbstractKeywordsEditorOpen, setIsAbstractKeywordsEditorOpen] = useState(false);
  const [abstractKeywordsEditorInitial, setAbstractKeywordsEditorInitial] = useState<{
    abstract?: { en?: string; zh?: string };
    keywords?: string[];
  } | null>(null);
  const [abstractKeywordsEditorError, setAbstractKeywordsEditorError] = useState<string | null>(null);
  const [isAbstractKeywordsSubmitting, setIsAbstractKeywordsSubmitting] = useState(false);
  
  const [isParseReferencesOpen, setIsParseReferencesOpen] = useState(false);

  // 笔记面板状态
  const [notesFixedStyle, setNotesFixedStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const isPersonalOwner = sourceCandidates[0] === 'personal-owner';
  const showNotesPanel = isPersonalOwner && !!selectedBlockId && !!resolvedUserPaperId;
  const displayContent = editableDraft ?? paper ?? null;
  const metadata = displayContent?.metadata ?? null;

  const openParseDialog = useCallback(() => {
    setIsParseReferencesOpen(true);
  }, []);

  const closeParseDialog = useCallback(() => {
    setIsParseReferencesOpen(false);
  }, []);

  return {
    // 基础数据
    paperId,
    sourceCandidates,
    resolvedUserPaperId,
    isPersonalOwner,
    showNotesPanel,
    displayContent,
    metadata,
    
    // UI状态
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
    
    // 编辑器状态
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
    
    // 笔记面板状态
    notesFixedStyle,
    setNotesFixedStyle,
    notesOpen,
    setNotesOpen,
    
    // 方法
    openParseDialog,
    closeParseDialog,
  };
}