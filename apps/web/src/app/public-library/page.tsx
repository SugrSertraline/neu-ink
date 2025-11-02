// apps/web/src/app/library/PublicLibraryPage.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Library, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LibraryFilters from '@/components/library/LibraryFilters';
import PaperCard from '@/components/library/PaperCard';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import CreatePaperDialog from '@/components/library/CreatePaperDialog';

import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/stores/useTabStore';
import { usePaperService } from '@/lib/services/paper';
import { isSuccess } from '@/lib/http';
import { toast } from 'sonner';
import {
  ParseStatus,
  Paper,
  PaperListItem,
  type Author,
  type PaperListData,
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
  parseStatus?: ParseStatus['status'];
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

  if (Array.isArray((payload as PaperListData).papers)) {
    return payload as PaperListData;
  }

  const nested = (payload as { data?: unknown }).data;
  if (nested && typeof nested === 'object' && Array.isArray((nested as PaperListData).papers)) {
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
    shortTitle: metadata.shortTitle,
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

export default function PublicLibraryPage() {
  const router = useRouter();
  const { isAuthenticated, isAdmin } = useAuth();
  const { addTab, setActiveTab } = useTabStore();

  const { publicPaperService, adminPaperService, userPaperService, paperCache } = usePaperService();

  const [viewMode, setViewMode] = React.useState<ViewMode>('card');

  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');

  const [filterStatus, setFilterStatus] = React.useState('all');
  const [filterPriority, setFilterPriority] = React.useState('all');
  const [filterType, setFilterType] = React.useState('all');
  const [filterSciQuartile, setFilterSciQuartile] = React.useState('all');
  const [filterCasQuartile, setFilterCasQuartile] = React.useState('all');
  const [filterCcfRank, setFilterCcfRank] = React.useState('all');
  const [filterYear, setFilterYear] = React.useState('all');
  const [showAdvancedFilter, setShowAdvancedFilter] = React.useState(false);

  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

  const [papers, setPapers] = React.useState<PaperListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const [showLoginHint, setShowLoginHint] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    filterStatus,
    filterPriority,
    filterType,
    filterSciQuartile,
    filterCasQuartile,
    filterCcfRank,
    filterYear,
  ]);

  const parseStatusFilter = React.useMemo<ParseStatus['status'] | undefined>(() => {
    if (PARSE_STATUS_SET.has(filterStatus as ParseStatus['status'])) {
      return filterStatus as ParseStatus['status'];
    }
    return undefined;
  }, [filterStatus]);

  const applyClientSideFilters = React.useCallback(
    (items: PaperListItem[]): PaperListItem[] => {
      let result = items;

      if (parseStatusFilter) {
        result = result.filter(item => item.parseStatus?.status === parseStatusFilter);
      }

      if (filterPriority !== 'all') {
        result = result.filter(item => matchesImpactPriority(item.impactFactor, filterPriority));
      }

      return result;
    },
    [filterPriority, parseStatusFilter],
  );

  const loadPapers = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const parsedYear = Number(filterYear);
      const yearFilter =
        filterYear === 'all' || Number.isNaN(parsedYear) ? undefined : parsedYear;

      const baseFilters: PublicLibraryFilters = {
        page: currentPage,
        pageSize,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        articleType: filterType !== 'all' ? filterType : undefined,
        year: yearFilter,
        sciQuartile: filterSciQuartile !== 'all' ? filterSciQuartile : undefined,
        casQuartile: filterCasQuartile !== 'all' ? filterCasQuartile : undefined,
        ccfRank: filterCcfRank !== 'all' ? filterCcfRank : undefined,
      };

      const adminFilters: AdminLibraryFilters = {
        ...baseFilters,
        ...(parseStatusFilter ? { parseStatus: parseStatusFilter } : {}),
      };

      const response = isAdmin
        ? await adminPaperService.getAdminPapers(adminFilters)
        : await publicPaperService.getPublicPapers(baseFilters);

      if (!isSuccess(response) || !response.data) {
        throw new Error(response.bizMessage || response.topMessage || '获取论文列表失败');
      }

      const payload = extractPaperListData(response.data);
      if (!payload) {
        throw new Error('返回数据结构不符合预期');
      }

      const rawList = Array.isArray(payload.papers) ? payload.papers : [];
      const mappedList = rawList.map(transformPaperToListItem);
      const filteredList = applyClientSideFilters(mappedList);

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
    applyClientSideFilters,
    debouncedSearchTerm,
    filterType,
    filterSciQuartile,
    filterCasQuartile,
    filterCcfRank,
    filterYear,
    currentPage,
    pageSize,
    isAdmin,
    adminPaperService,
    publicPaperService,
    parseStatusFilter,
  ]);

  React.useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  const openPaper = async (paper: PaperListItem) => {
    if (!isAuthenticated) {
      setShowLoginHint(true);
      return;
    }

    try {
      let detail = paperCache.get(paper.id);
      if (!detail) {
        const res = await publicPaperService.getPublicPaperDetail(paper.id);
        if (!isSuccess(res)) {
          throw new Error(res.bizMessage || res.topMessage || '获取论文详情失败');
        }
        detail = res.data;
        paperCache.set(paper.id, detail);
      }

      const tabId = `paper:${paper.id}`;
      const path = `/paper/${paper.id}`;
      const viewerSource: ViewerSource = isAdmin ? 'public-admin' : 'public-guest';

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
      alert(`获取论文详情失败：${message}`);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!isAdmin) return;

    if (!window.confirm('确定要删除这篇论文吗？此操作不可撤销。')) return;

    try {
      const result = await adminPaperService.deletePaper(paperId);
      if (!isSuccess(result)) {
        throw new Error(result.bizMessage || result.topMessage || '删除失败');
      }
      await loadPapers();
    } catch (error) {
      const message = error instanceof Error ? error.message : '网络错误';
      alert(`删除失败：${message}`);
    }
  };


  const handleAddToLibrary = async (paperId: string) => {
    if (!isAuthenticated) {
      setShowLoginHint(true);
      return;
    }

    try {
      const result = await userPaperService.addToLibrary({
        paperId,
        extra: {
          customTags: [],
          readingStatus: 'unread',
          priority: 'medium'
        },
      });
      
      if (isSuccess(result)) {
        toast.success('已成功添加到个人论文库');
      } else {
        toast.error(result.bizMessage || result.topMessage || '添加失败');
      }
    } catch (error) {
      console.error('添加到个人论文库失败:', error);
      toast.error('添加失败，请稍后重试');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterType('all');
    setFilterSciQuartile('all');
    setFilterCasQuartile('all');
    setFilterCcfRank('all');
    setFilterYear('all');
    setCurrentPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      {showLoginHint && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="mx-4 max-w-md animate-in fade-in zoom-in rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Library className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  需要登录
                </h3>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                  查看论文详情或执行该操作前，请先登录账号
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setShowLoginHint(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={() => {
                      setShowLoginHint(false);
                      router.push('/login');
                    }}
                  >
                    立即登录
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex-none border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">论文库</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isAdmin
                  ? '管理和浏览所有论文'
                  : isAuthenticated
                  ? '浏览公共论文库'
                  : '浏览公共论文库（无需登录）'}{' '}
                • 共 {totalCount} 篇论文
              </p>
              {!isAuthenticated && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  💡 登录后可查看论文详情并管理个人论文库
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Button size="sm" className="gap-2" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4" />
                  新建论文
                </Button>
              )}
              <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <LibraryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onStatusChange={setFilterStatus}
            filterPriority={filterPriority}
            onPriorityChange={setFilterPriority}
            filterType={filterType}
            onTypeChange={setFilterType}
            showAdvancedFilter={showAdvancedFilter}
            onToggleAdvancedFilter={() => setShowAdvancedFilter(v => !v)}
            filterSciQuartile={filterSciQuartile}
            onSciQuartileChange={setFilterSciQuartile}
            filterCasQuartile={filterCasQuartile}
            onCasQuartileChange={setFilterCasQuartile}
            filterCcfRank={filterCcfRank}
            onCcfRankChange={setFilterCcfRank}
            filterYear={filterYear}
            onYearChange={setFilterYear}
            availableYears={availableYears}
            onResetFilters={resetFilters}
            canFilterStatus={isAdmin}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">加载中…</div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20">
              加载失败：{error}
            </div>
          )}

          {!loading && !error && papers.length === 0 && (
            <div className="py-12 text-center">
              <Library className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                暂无论文
              </h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {isAdmin ? '开始添加第一篇论文吧' : '暂时没有符合条件的论文'}
              </p>
              {!isAuthenticated && (
                <p className="mb-4 text-sm text-blue-600 dark:text-blue-400">
                  登录后可以查看论文详情并管理个人论文库
                </p>
              )}
              {isAdmin && (
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加论文
                </Button>
              )}
            </div>
          )}

          {!loading && !error && papers.length > 0 && (
            <>
              {viewMode === 'card' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {papers.map(paper => (
                    <PaperCard
                      key={paper.id}
                      paper={paper}
                      onClick={() => openPaper(paper)}
                      onDelete={isAdmin ? () => handleDeletePaper(paper.id) : undefined}
                      onAddToLibrary={
                        isAuthenticated ? () => handleAddToLibrary(paper.id) : undefined
                      }
                      showLoginRequired={!isAuthenticated}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="space-y-2">
                  {papers.map(paper => (
                    <div
                      key={paper.id}
                      onClick={() => openPaper(paper)}
                      className="group flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {paper.title}
                        </h3>
                        <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                          {paper.authors.map((author: Author) => author.name).join(', ')} •{' '}
                          {paper.year ?? '未知年份'}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {!isAuthenticated && (
                          <span className="opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              登录后查看详情
                            </span>
                          </span>
                        )}
                        {paper.sciQuartile && paper.sciQuartile !== '无' && (
                          <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                            {paper.sciQuartile}
                          </span>
                        )}
                        {paper.impactFactor && (
                          <span className="text-xs text-gray-500">IF: {paper.impactFactor}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      表格视图开发中
                    </h3>
                  </div>
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    表格视图功能即将推出
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateDialog && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-md transition-opacity" />
          <CreatePaperDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              setShowCreateDialog(false);
              void loadPapers();
            }}
          />
        </>
      )}
    </div>
  );
}
