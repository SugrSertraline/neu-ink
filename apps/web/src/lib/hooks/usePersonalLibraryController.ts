'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { usePaperService } from '@/lib/services/papers';
import { isSuccess } from '@/lib/http';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import type {
  Paper,
  PaperListItem,
  PaperMetadata,
  ParseStatus,
  ViewerSource,
  UserPaper,
} from '@/types/paper';
import { useTabStore } from '@/store/ui/tabStore';

type ViewMode = 'card' | 'table' | 'compact';

export type PersonalLibraryItem = {
  paper: PaperListItem;
  personalMeta: {
    userPaperId: string;
    readingStatus: UserPaper['readingStatus'];
    priority: UserPaper['priority'];
    customTags: string[];
    noteCount?: number;
    sourcePaperId: string | null;
    totalReadingTime: number;
    lastReadTime?: string | null;
  };
};

const PERSONAL_PARSE_STATUS: ParseStatus = {
  status: 'completed',
  progress: 100,
  message: '个人库论文就绪',
};

function mapUserPaperToListItem(userPaper: UserPaper): PersonalLibraryItem {
  // 适配新的扁平化结构，直接从UserPaper获取metadata
  const metadata: PaperMetadata = userPaper.metadata ?? {
    title: '未命名论文',
    authors: [],
    tags: [],
  };

  const paper: PaperListItem = {
    id: userPaper.id,
    isPublic: Boolean(userPaper.sourcePaperId),
    createdBy: userPaper.userId,
    createdAt: userPaper.addedAt,
    updatedAt: userPaper.updatedAt,
    parseStatus: PERSONAL_PARSE_STATUS,
    title: metadata.title ?? '未命名论文',
    titleZh: metadata.titleZh,
    authors: metadata.authors ?? [],
    publication: metadata.publication,
    year: metadata.year,
    date: metadata.date,
    doi: metadata.doi,
    articleType: metadata.articleType,
    sciQuartile: metadata.sciQuartile,
    casQuartile: metadata.casQuartile,
    ccfRank: metadata.ccfRank,
    impactFactor: metadata.impactFactor,
    tags: Array.from(new Set([...(metadata.tags ?? []), ...(userPaper.customTags ?? [])])),
  };

  return {
    paper,
    personalMeta: {
      userPaperId: userPaper.id,
      readingStatus: userPaper.readingStatus,
      priority: userPaper.priority,
      customTags: userPaper.customTags ?? [],
      // noteCount 现在不再在列表API中返回，设为undefined，前端会处理为0
      noteCount: undefined,
      sourcePaperId: userPaper.sourcePaperId,
      // 确保 totalReadingTime 有默认值
      totalReadingTime: userPaper.totalReadingTime ?? 0,
      lastReadTime: userPaper.lastReadTime,
    },
  };
}

function normalizeUserPaperToPaper(userPaper: UserPaper): Paper {
  return {
    id: userPaper.id,
    isPublic: Boolean(userPaper.sourcePaperId),
    createdBy: userPaper.userId,
    metadata: userPaper.metadata ?? { title: '未命名论文', authors: [], tags: [] },
    abstract: userPaper.abstract,
    keywords: userPaper.keywords ?? [],
    sections: userPaper.sections,  // 后端现在总是返回 sections
    references: userPaper.references ?? [],
    attachments: userPaper.attachments ?? {},
    parseStatus: PERSONAL_PARSE_STATUS,
    createdAt: userPaper.addedAt,
    updatedAt: userPaper.updatedAt,
  };
}

export function usePersonalLibraryController() {
  const { userPaperService, paperCache } = usePaperService();
  const { addTab, setActiveTab } = useTabStore();
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [items, setItems] = useState<PersonalLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [readingStatus, setReadingStatus] = useState<'all' | UserPaper['readingStatus']>('all');
  const [priority, setPriority] = useState<'all' | UserPaper['priority']>('all');
  const [customTag, setCustomTag] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [openingPaperId, setOpeningPaperId] = useState<string | null>(null);

  useEffect(() => {
    const handler = window.setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => window.clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, readingStatus, priority, customTag]);

  const loadPapers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await userPaperService.getUserPapers({
        page: currentPage,
        pageSize,
        search: debouncedSearch || undefined,
        readingStatus: readingStatus !== 'all' ? readingStatus : undefined,
        priority: priority !== 'all' ? priority : undefined,
        customTag: customTag !== 'all' ? customTag : undefined,
      });

      if (!isSuccess(response) || !response.data) {
        throw new Error(response.bizMessage || response.topMessage || '获取个人论文库失败');
      }

      const list = Array.isArray(response.data.papers) ? response.data.papers : [];
      setItems(list.map(mapUserPaperToListItem));
      setTotalCount(response.data.pagination?.total ?? list.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      setError(message);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    pageSize,
    readingStatus,
    priority,
    customTag,
    userPaperService,
  ]);

  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  const handleRemove = useCallback(
    async (userPaperId: string) => {
      const confirmed = await confirm({
        title: '移除论文',
        description: '确定要从个人库移除该论文吗？',
        confirmText: '移除',
        cancelText: '取消',
        variant: 'destructive',
        onConfirm: () => Promise.resolve(),
      });
      
      if (!confirmed) return;
      
      try {
        const result = await userPaperService.deleteUserPaper(userPaperId);
        if (!isSuccess(result)) {
          throw new Error(result.bizMessage || result.topMessage || '移除失败');
        }
        toast.success('已从个人论文库移除');
        await loadPapers();
      } catch (err) {
        const message = err instanceof Error ? err.message : '网络错误';
        toast.error(`移除失败：${message}`);
      }
    },
    [loadPapers, userPaperService, confirm],
  );

    const handleOpen = useCallback(
      async (item: PersonalLibraryItem) => {
        const { personalMeta, paper } = item;
        const routePaperId = personalMeta.userPaperId;
        
        // 设置加载状态
        setOpeningPaperId(routePaperId);
        
        const tabId = `paper:${routePaperId}`;
        const path = `/paper/${routePaperId}?source=personal-owner`;
        const viewerSource: ViewerSource = 'personal-owner';
  
        try {
          // 如果当前阅读状态不是"reading"，则自动切换为"reading"
          if (personalMeta.readingStatus !== 'reading') {
            const updateResult = await userPaperService.updateReadingProgress(routePaperId, {
              readingPosition: personalMeta.userPaperId, // 使用当前论文ID作为阅读位置
              readingTime: 0, // 不增加阅读时间，只更新状态
            });
           
            if (!isSuccess(updateResult)) {
              // 静默失败，不影响用户体验
            } else {
              // 更新本地状态
              setItems(prevItems =>
                prevItems.map(prevItem =>
                  prevItem.personalMeta.userPaperId === routePaperId
                    ? {
                        ...prevItem,
                        personalMeta: {
                          ...prevItem.personalMeta,
                          readingStatus: 'reading',
                        },
                      }
                    : prevItem
                )
              );
            }
          }
  
          const cachedEntry = paperCache.get(routePaperId);
          let userPaperDetail: UserPaper | null = cachedEntry as UserPaper | null;
  
          if (!userPaperDetail) {
            const res = await userPaperService.getUserPaperDetail(routePaperId);
            if (!isSuccess(res) || !res.data) {
              throw new Error(res.bizMessage || res.topMessage || '获取个人论文详情失败');
            }
            userPaperDetail = res.data;
            paperCache.set(routePaperId, userPaperDetail);
          }
  
          const normalizedPaper = normalizeUserPaperToPaper(userPaperDetail);
  
          addTab({
            id: tabId,
            type: 'paper',
            title: paper.title,
            path,
            data: {
              source: viewerSource,
              paperId: normalizedPaper.id,
              userPaperId: personalMeta.userPaperId,
              initialPaper: normalizedPaper,
            },
          });
          setActiveTab(tabId);
          router.push(path);
        } catch (err) {
          const message = err instanceof Error ? err.message : '网络错误';
          toast.error(`打开论文失败：${message}`);
        } finally {
          // 清除加载状态
          setOpeningPaperId(null);
        }
      },
      [addTab, paperCache, router, setActiveTab, userPaperService, setItems],
    );


  const personalTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(item => {
      item.personalMeta.customTags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, [items]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearch('');
    setReadingStatus('all');
    setPriority('all');
    setCustomTag('all');
    setCurrentPage(1);
  }, []);

  return {
    items,
    loading,
    error,
    totalCount,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    readingStatus,
    setReadingStatus,
    priority,
    setPriority,
    customTag,
    setCustomTag,
    personalTags,
    currentPage,
    setCurrentPage,
    pageSize,
    reload: loadPapers,
    handleRemove,
    handleOpen,
    resetFilters,
    
    // 加载状态
    openingPaperId,
    
    // 确认对话框组件
    ConfirmDialog,
  };
}
