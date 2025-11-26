'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/store/ui/tabStore';
import { usePaperService } from '@/lib/services/papers';
import { isSuccess } from '@/lib/http';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import type {
  Author,
  Paper,
  PaperListData,
  PaperListItem,
  ParseStatus,
  ViewerSource,
} from '@/types/paper';

type ViewMode = 'card' | 'table' | 'compact';

type PublicLibraryFilters = {
  page?: number;
  pageSize?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  articleType?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  sciQuartile?: string;
  casQuartile?: string;
  ccfRank?: string;
  tag?: string;
  author?: string;
  publication?: string;
  doi?: string;
};

type AdminLibraryFilters = PublicLibraryFilters & {
  isPublic?: boolean;
  createdBy?: string;
};

const PARSE_STATUS_SET = new Set<ParseStatus['status']>([
  'pending',
  'parsing',
  'completed',
  'failed',
]);

function extractPaperListData(payload: unknown): PaperListData | null {
  if (!payload || typeof payload !== 'object') return null;

  // 格式1：直接匹配格式：{papers: [], pagination: {}}
  if (Array.isArray((payload as any).papers)) {
    return payload as PaperListData;
  }

  // 格式2：检查是否是业务响应格式：{code: 0, message: "...", data: {...}}
  const bizResponse = payload as { code?: number; message?: string; data?: any };
  if (bizResponse.code !== undefined && bizResponse.data !== undefined) {
    const data = bizResponse.data;
    if (data && typeof data === 'object' && Array.isArray((data as any).papers)) {
      return data as PaperListData;
    }
  }

  // 格式3：处理嵌套在 data 字段中的情况
  const nested = (payload as { data?: unknown }).data;
  if (nested && typeof nested === 'object' && Array.isArray((nested as any).papers)) {
    return nested as PaperListData;
  }

  return null;
}

function transformPaperToListItem(paper: Paper): PaperListItem {
  const metadata = paper.metadata ?? ({} as Paper['metadata']);

  return {
    id: paper.id,
    isPublic: paper.isPublic,
    createdBy: paper.createdBy,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
    parseStatus: paper.parseStatus,
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
    tags: metadata.tags ?? [],
  };
}

function matchesImpactPriority(impactFactor: number | undefined, level: string): boolean {
  if (!impactFactor || Number.isNaN(impactFactor)) return false;

  switch (level) {
    case 'high':
      return impactFactor >= 10;
    case 'medium':
      return impactFactor >= 5 && impactFactor < 10;
    case 'low':
      return impactFactor > 0 && impactFactor < 5;
    default:
      return true;
  }
}

export function usePublicLibraryController() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const { addTab, setActiveTab } = useTabStore();
  const { publicPaperService, adminPaperService, userPaperService, paperCache } = usePaperService();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  // 添加调试日志
  useEffect(() => {
    console.log('usePublicLibraryController - 认证状态:', { isAuthenticated, isAdmin });
  }, [isAuthenticated, isAdmin]);

  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterSciQuartile, setFilterSciQuartile] = useState('all');
  const [filterCasQuartile, setFilterCasQuartile] = useState('all');
  const [filterCcfRank, setFilterCcfRank] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [papersInLibrary, setPapersInLibrary] = useState<Set<string>>(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [showLoginHint, setShowLoginHint] = useState(false);
  const [openingPaperId, setOpeningPaperId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    filterPriority,
    filterType,
    filterSciQuartile,
    filterCasQuartile,
    filterCcfRank,
    filterYear,
  ]);

  function isPaperEntity(candidate: unknown): candidate is Paper {
    if (!candidate || typeof candidate !== 'object') return false;
    const paper = candidate as Paper;
    return (
      typeof paper.id === 'string' &&
      typeof paper.createdBy === 'string' &&
      typeof paper.metadata === 'object' &&
      Array.isArray(paper.sections)  // sections 可能是空数组，但应该是数组类型
    );
  }

  const applyClientSideFilters = useCallback(
    (items: PaperListItem[]): PaperListItem[] => {
      let result = items;

      if (filterPriority !== 'all') {
        result = result.filter(item => matchesImpactPriority(item.impactFactor, filterPriority));
      }

      return result;
    },
    [filterPriority],
  );

  const loadPapers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const parsedYear = Number(filterYear);
      const yearFilter =
        filterYear === 'all' || Number.isNaN(parsedYear) ? undefined : parsedYear;

      const baseFilters: PublicLibraryFilters = {
        page: currentPage,
        pageSize,
        sortBy: "createdAt",
        sortOrder: "desc",
        search: debouncedSearchTerm || undefined,
        articleType: filterType !== 'all' ? filterType : undefined,
        year: yearFilter,
        sciQuartile: filterSciQuartile !== 'all' ? filterSciQuartile : undefined,
        casQuartile: filterCasQuartile !== 'all' ? filterCasQuartile : undefined,
        ccfRank: filterCcfRank !== 'all' ? filterCcfRank : undefined,
      };

      const adminFilters: AdminLibraryFilters = {
        ...baseFilters,
      };

      const response = isAdmin
        ? await adminPaperService.getAdminPapers(adminFilters)
        : await publicPaperService.getPublicPapers(baseFilters);

      if (!isSuccess(response) || !response.data) {
        throw new Error(response.bizMessage || response.topMessage || '获取论文列表失败');
      }

      // response.data 已经是 normalize 处理后的数据，直接使用
      const payload = response.data as PaperListData;
      if (!payload || !Array.isArray(payload.papers)) {
        throw new Error('返回数据结构不符合预期');
      }

      const rawList = payload.papers;
      
      // 添加调试日志
      console.log('管理员论文列表原始数据:', rawList);
      console.log('论文数量:', rawList.length);
      
      const mappedList = rawList.map(transformPaperToListItem);
      const filteredList = applyClientSideFilters(mappedList);

      console.log('转换后的论文列表:', mappedList);
      console.log('过滤后的论文列表:', filteredList);

      setPapers(filteredList);
      setTotalCount(payload.pagination?.total ?? mappedList.length);

      const years = Array.from(
        new Set(
          mappedList
            .map(item => item.year)
            .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value)),
        ),
      ).sort((a: number, b: number) => b - a);
      setAvailableYears(years);
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      setError(message);
      setPapers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    adminPaperService,
    applyClientSideFilters,
    currentPage,
    debouncedSearchTerm,
    filterCasQuartile,
    filterCcfRank,
    filterSciQuartile,
    filterType,
    filterYear,
    isAdmin,
    pageSize,
    publicPaperService,
  ]);

  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  // 检查论文是否在个人库中
  const checkPapersInLibrary = useCallback(async () => {
    if (!isAuthenticated || papers.length === 0) return;
    
    try {
      const inLibrarySet = new Set<string>();
      
      // 批量检查所有论文是否在个人库中
      const checkPromises = papers.map(async (paper) => {
        try {
          const result = await userPaperService.checkPaperInLibrary(paper.id);
          if (result.data?.inLibrary) {
            inLibrarySet.add(paper.id);
          }
        } catch (error) {
          // 忽略单个论文的检查错误
          console.warn(`检查论文 ${paper.id} 是否在个人库中失败:`, error);
        }
      });
      
      await Promise.all(checkPromises);
      setPapersInLibrary(inLibrarySet);
    } catch (error) {
      console.error('批量检查论文是否在个人库中失败:', error);
    }
  }, [isAuthenticated, papers, userPaperService]);

  // 当论文列表加载完成且用户已登录时，检查论文是否在个人库中
  useEffect(() => {
    if (!loading && isAuthenticated && papers.length > 0) {
      void checkPapersInLibrary();
    }
  }, [loading, isAuthenticated, papers, checkPapersInLibrary]);

  const requestLogin = useCallback(() => setShowLoginHint(true), []);
  const dismissLoginHint = useCallback(() => setShowLoginHint(false), []);

  const navigateToLogin = useCallback(() => {
    setShowLoginHint(false);
    // 保存当前页面路径作为登录后的跳转目标
    const currentPath = window.location.pathname + window.location.search;
    console.log('navigateToLogin - 当前路径:', currentPath);
    router.push(`/login?from=${encodeURIComponent(currentPath)}`);
  }, [router]);

  const openPaper = useCallback(
    async (paper: PaperListItem) => {
      if (!isAuthenticated) {
        requestLogin();
        return;
      }

      // 设置加载状态
      setOpeningPaperId(paper.id);

      const viewerSource: ViewerSource = isAdmin ? 'public-admin' : 'public-guest';
      const tabId = `paper:${paper.id}`;
      const path = `/paper/${paper.id}?source=${viewerSource}`;

      try {
        const cached = paperCache.get(paper.id);
        let detail: Paper | null = cached && isPaperEntity(cached) ? cached : null;

        if (!detail) {
          const res = isAdmin
            ? await adminPaperService.getAdminPaperDetail(paper.id)
            : await publicPaperService.getPublicPaperDetail(paper.id);

          if (!isSuccess(res) || !res.data) {
            throw new Error(res.bizMessage || res.topMessage || '获取论文详情失败');
          }

          if (!isPaperEntity(res.data)) {
            throw new Error('返回的论文数据结构不符合预期');
          }

          detail = res.data;
          paperCache.set(paper.id, detail);
        }

        addTab({
          id: tabId,
          type: 'paper',
          title: paper.title,
          path,
          data: {
            paperId: paper.id,
            source: viewerSource,
            initialPaper: detail,
          },
        });

        setActiveTab(tabId);
        router.push(path);
      } catch (error) {
        const message = error instanceof Error ? error.message : '网络错误';
        toast.error(`获取论文详情失败：${message}`);
      } finally {
        // 清除加载状态
        setOpeningPaperId(null);
      }
    },
    [
      addTab,
      adminPaperService,
      isAdmin,
      isAuthenticated,
      paperCache,
      publicPaperService,
      requestLogin,
      router,
      setActiveTab,
    ],
  );


  const handleDeletePaper = useCallback(
    async (paperId: string) => {
      if (!isAdmin) return;

      const confirmed = await confirm({
        title: '删除论文',
        description: '确定要删除这篇论文吗？此操作不可撤销。',
        confirmText: '删除',
        cancelText: '取消',
        variant: 'destructive',
        onConfirm: () => Promise.resolve(),
      });
      
      if (!confirmed) return;

      try {
        const result = await adminPaperService.deletePaper(paperId);
        if (!isSuccess(result)) {
          throw new Error(result.bizMessage || result.topMessage || '删除失败');
        }
        await loadPapers();
      } catch (error) {
        const message = error instanceof Error ? error.message : '网络错误';
        toast.error(`删除失败：${message}`);
      }
    },
    [adminPaperService, isAdmin, loadPapers, confirm],
  );

  const handleAddToLibrary = useCallback(
    async (paperId: string) => {
      if (!isAuthenticated) {
        requestLogin();
        return;
      }

      try {
        const result = await userPaperService.addToLibrary({
          paperId,
          extra: {
            customTags: [],
            readingStatus: 'unread',
            priority: 'medium',
          },
        });

        if (isSuccess(result)) {
          toast.success('已成功添加到个人论文库');
          // 更新papersInLibrary状态
          setPapersInLibrary(prev => new Set([...prev, paperId]));
        } else {
          toast.error(result.bizMessage || result.topMessage || '添加失败');
        }
      } catch (error) {
        toast.error('添加失败，请稍后重试');
      }
    },
    [isAuthenticated, requestLogin, userPaperService],
  );

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterPriority('all');
    setFilterType('all');
    setFilterSciQuartile('all');
    setFilterCasQuartile('all');
    setFilterCcfRank('all');
    setFilterYear('all');
    setCurrentPage(1);
  }, []);

  const toggleAdvancedFilter = useCallback(
    () => setShowAdvancedFilter(current => !current),
    [],
  );

  return {
    // 基础能力
    isAdmin,
    isAuthenticated,

    // 展示视图
    viewMode,
    setViewMode,

    // 过滤器状态
    searchTerm,
    setSearchTerm,
    filterPriority,
    setFilterPriority,
    filterType,
    setFilterType,
    filterSciQuartile,
    setFilterSciQuartile,
    filterCasQuartile,
    setFilterCasQuartile,
    filterCcfRank,
    setFilterCcfRank,
    filterYear,
    setFilterYear,
    showAdvancedFilter,
    toggleAdvancedFilter,

    // 列表数据
    papers,
    loading,
    error,
    totalCount,
    availableYears,
    papersInLibrary,

    // 分页
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    // 登录提示
    showLoginHint,
    requestLogin,
    dismissLoginHint,
    navigateToLogin,

    // 操作
    openPaper,
    handleDeletePaper,
    handleAddToLibrary,
    resetFilters,
    reload: loadPapers,
    
    // 加载状态
    openingPaperId,
    
    // 确认对话框组件
    ConfirmDialog,
  };
}
