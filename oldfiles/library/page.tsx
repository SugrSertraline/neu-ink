// app/library/page.tsx - 添加进度轮询功能

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { apiGetData, apiDelete } from '../lib/api';
import type { PaperMetadata, PaperRecord } from '@/app/types/paper';
import { useTabStore } from '../store/useTabStore';
import { TABLE_COLUMNS } from './utils/paperHelpers';
import { paperRecordsToMetadata } from '@/app/lib/paperConverters';

// 组件
import LibraryHeader from './components/LibraryHeader';
import LibraryFilters from './components/LibraryFilters';
import PaperCard from './components/PaperCard';
import PaperListItem from './components/PaperListItem';
import PaperTable from './components/PaperTable';
import ContextMenuWrapper from './components/ContextMenu';
import EmptyState from './components/EmptyState';
import PaperDialog from './components/PaperDialog';
import CreatePaperDialog from './components/CreatePaperDialog';
import MarkdownPaperDialog from './components/MarkdownPaperDialog';
import Pagination from './components/Pagination';
import ColumnConfigSheet from './components/ColumnConfigSheet';
import { SortRule } from './components/MultiSortControls';
import AddToChecklistDialog from './components/AddToChecklistDialog';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';

type ViewMode = 'card' | 'table' | 'compact';

export default function LibraryPage() {
  const router = useRouter();
  const { addTab, setActiveTab, tabs, setLoading } = useTabStore();

  // 视图与UI
  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [showAdvancedFilter, setShowAdvancedFilter] = React.useState(false);
  const [showColumnConfig, setShowColumnConfig] = React.useState(false);
  const [showPaperDialog, setShowPaperDialog] = React.useState(false);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showMarkdownDialog, setShowMarkdownDialog] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'create' | 'edit'>('create');
  const [selectedPaper, setSelectedPaper] = React.useState<PaperMetadata | null>(null);
  
  // 添加到清单对话框状态
  const [showAddToChecklistDialog, setShowAddToChecklistDialog] = React.useState(false);
  const [selectedPaperForChecklist, setSelectedPaperForChecklist] = React.useState<PaperMetadata | null>(null);

  // 统一的筛选状态
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [filterPriority, setFilterPriority] = React.useState<string>('all');
  const [filterType, setFilterType] = React.useState<string>('all');
  const [filterSciQuartile, setFilterSciQuartile] = React.useState<string>('all');
  const [filterCasQuartile, setFilterCasQuartile] = React.useState<string>('all');
  const [filterCcfRank, setFilterCcfRank] = React.useState<string>('all');
  const [filterRating, setFilterRating] = React.useState<string>('all');
  const [filterYear, setFilterYear] = React.useState<string>('all');

  // 统一的排序状态
  const [sortRules, setSortRules] = React.useState<SortRule[]>([
    { field: 'createdAt', order: 'desc' }
  ]);

  // 表格列配置
  const [visibleColumns, setVisibleColumns] = React.useState<Set<string>>(
    new Set(TABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key))
  );

  // 年份下拉
  const [availableYears, setAvailableYears] = React.useState<(number | undefined)[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [totalItems, setTotalItems] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 外部触发刷新
  const [refreshKey, setRefreshKey] = React.useState(0);

  // 切换视图时重置分页
  React.useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  const openPaper = async (paper: PaperMetadata) => {
    const id = `paper:${paper.id}`;
    const path = `/paper/${paper.id}`;
    
    if (!tabs.find((t) => t.id === id)) {
      addTab({ id, type: 'paper', title: paper.title, path, data: { paperId: paper.id } });
    }
    
    // 设置加载状态
    setLoading(true, id);
    setActiveTab(id);
    
    try {
      await router.push(path);
      // 给路由一些时间完成，然后清除loading状态
      setTimeout(() => {
        setLoading(false, null);
      }, 300);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false, null);
    }
  };

  const handlePaperDialogSuccess = async () => {
    setRefreshKey(k => k + 1);
  };

  const handleAddToChecklist = (paper: PaperMetadata) => {
    setSelectedPaperForChecklist(paper);
    setShowAddToChecklistDialog(true);
  };

  const handleCreatePaper = () => {
    setShowCreateDialog(true);
  };

  const handleCreateFromMarkdown = () => {
    setShowMarkdownDialog(true);
  };

  const toggleColumn = (key: string) => {
    const next = new Set(visibleColumns);
    next.has(key) ? next.delete(key) : next.add(key);
    setVisibleColumns(next);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterType('all');
    setFilterSciQuartile('all');
    setFilterCasQuartile('all');
    setFilterCcfRank('all');
    setFilterRating('all');
    setFilterYear('all');
    setSortRules([{ field: 'createdAt', order: 'desc' }]);
    setCurrentPage(1);
  };

  const resetAdvancedFilters = () => {
    setFilterSciQuartile('all');
    setFilterCasQuartile('all');
    setFilterCcfRank('all');
    setFilterRating('all');
    setFilterYear('all');
  };

  const filtersObj = React.useMemo(() => ({
    search: debouncedSearchTerm,
    status: filterStatus,
    priority: filterPriority,
    articleType: filterType,
    year: filterYear,
    sciQuartile: filterSciQuartile,
    casQuartile: filterCasQuartile,
    ccfRank: filterCcfRank,
    rating: filterRating,
  }), [
    debouncedSearchTerm,
    filterStatus,
    filterPriority,
    filterType,
    filterYear,
    filterSciQuartile,
    filterCasQuartile,
    filterCcfRank,
    filterRating,
  ]);

  return (
    // 使用 h-full 而不是 h-screen，因为已经在 MainLayout 的 main 内
    <div className="flex flex-col h-full">
      {/* ========== 顶部固定区域 ========== */}
      <div className="flex-none bg-white dark:bg-slate-900 border-b">
        <div className="p-6 pb-4 space-y-4">
          {/* 头部 */}
          <LibraryHeader
            totalCount={totalItems}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCreatePaper={handleCreatePaper}
            onCreateFromMarkdown={handleCreateFromMarkdown}
            showColumnConfig={showColumnConfig}
            onToggleColumnConfig={() => setShowColumnConfig(!showColumnConfig)}
            sortRules={sortRules}
            onSortRulesChange={setSortRules}
          />

          {/* 统一的筛选组件 */}
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
            onToggleAdvancedFilter={() => setShowAdvancedFilter(!showAdvancedFilter)}
            filterSciQuartile={filterSciQuartile}
            onSciQuartileChange={setFilterSciQuartile}
            filterCasQuartile={filterCasQuartile}
            onCasQuartileChange={setFilterCasQuartile}
            filterCcfRank={filterCcfRank}
            onCcfRankChange={setFilterCcfRank}
            filterRating={filterRating}
            onRatingChange={setFilterRating}
            filterYear={filterYear}
            onYearChange={setFilterYear}
            availableYears={availableYears}
            onResetAdvancedFilters={resetAdvancedFilters}
            showColumnConfig={false}
            onToggleColumnConfig={() => {}}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
          />
        </div>
      </div>

      {/* ========== 中间内容区域（可滚动） ========== */}
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        <div className="p-6 pb-2">
          <PapersSection
            key={`${viewMode}-${refreshKey}`}
            viewMode={viewMode}
            visibleColumns={visibleColumns}
            sortRules={sortRules}
            filters={filtersObj}
            currentPage={currentPage}
            pageSize={pageSize}
            onDataLoaded={(data) => {
              setTotalItems(data.total);
              setTotalPages(data.totalPages);
            }}
            onYearsUpdate={setAvailableYears}
            onOpenPaper={openPaper}
            onEditRequested={(p) => {
              setDialogMode('edit');
              setSelectedPaper(p);
              setShowPaperDialog(true);
            }}
            onAddToChecklist={handleAddToChecklist}
          />
        </div>
      </div>

      {/* ========== 底部分页区域（固定） ========== */}
      {totalItems > 0 && (
        <div className="flex-none bg-white dark:bg-slate-900 border-t">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* 创建论文对话框 */}
      <CreatePaperDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handlePaperDialogSuccess}
      />

      {/* Markdown 创建论文对话框 */}
      <MarkdownPaperDialog
        open={showMarkdownDialog}
        onClose={() => setShowMarkdownDialog(false)}
        onSuccess={handlePaperDialogSuccess}
      />

      {/* 编辑论文对话框 */}
      <PaperDialog
        open={showPaperDialog}
        mode={dialogMode}
        paper={selectedPaper}
        onClose={() => {
          setShowPaperDialog(false);
          setSelectedPaper(null);
        }}
        onSuccess={handlePaperDialogSuccess}
      />

      {/* 列设置侧边栏 */}
      <ColumnConfigSheet
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onReset={() => {
          const defaultVisible = new Set(
            TABLE_COLUMNS.filter(col => col.defaultVisible).map(col => col.key)
          );
          setVisibleColumns(defaultVisible);
        }}
      />

      {/* 添加到清单对话框 */}
      {showAddToChecklistDialog && selectedPaperForChecklist && (
        <AddToChecklistDialog
          open={showAddToChecklistDialog}
          paperId={selectedPaperForChecklist.id}
          paperTitle={selectedPaperForChecklist.title}
          onClose={() => {
            setShowAddToChecklistDialog(false);
            setSelectedPaperForChecklist(null);
          }}
          onSuccess={() => {
            setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}

/** ===================== 列表区域 ===================== */
function PapersSection(props: {
  viewMode: ViewMode;
  visibleColumns: Set<string>;
  sortRules: SortRule[];
  filters: Record<string, string>;
  currentPage: number;
  pageSize: number;
  onDataLoaded: (data: { total: number; totalPages: number }) => void;
  onYearsUpdate: (years: (number | undefined)[]) => void;
  onOpenPaper: (p: PaperMetadata) => void;
  onEditRequested: (p: PaperMetadata) => void;
  onAddToChecklist: (p: PaperMetadata) => void;
}) {
  const {
    viewMode,
    visibleColumns,
    sortRules,
    filters,
    currentPage,
    pageSize,
    onDataLoaded,
    onYearsUpdate,
    onOpenPaper,
    onEditRequested,
    onAddToChecklist,
  } = props;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [papers, setPapers] = React.useState<PaperMetadata[]>([]);


  const loadPapers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const sortParam = sortRules.length > 0
        ? sortRules.map(r => `${r.field}:${r.order}`).join(',')
        : 'createdAt:desc';

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        sort: sortParam,
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await apiGetData<{
        papers: PaperRecord[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>(`/api/papers?${params.toString()}`);

      const metadataList = paperRecordsToMetadata(response.papers);
      setPapers(metadataList);
      
      onDataLoaded({
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });

      const years = Array.from(
        new Set(metadataList.map(p => p.year).filter(Boolean))
      ).sort((a, b) => (Number(b) || 0) - (Number(a) || 0));
      onYearsUpdate(years as (number | undefined)[]);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [sortRules, filters, currentPage, pageSize]);

  React.useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  const handleDelete = async (paper: PaperMetadata) => {
    if (confirm(`确定要删除论文「${paper.title}」吗？`)) {
      try {
        await apiDelete(`/api/papers/${paper.id}`);
        await loadPapers();
      } catch (err: any) {
        alert(`删除失败: ${err.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        加载失败：{error}
      </div>
    );
  }

  if (papers.length === 0) {
    return <EmptyState onClearFilters={() => {}} />;
  }

  return (
    <>
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {papers.map((paper) => {
            
            return (
              <ContextMenuWrapper
                key={paper.id}
                paper={paper}
                onViewDetails={() => onOpenPaper(paper)}
                onEdit={() => onEditRequested(paper)}
                onDelete={() => handleDelete(paper)}
                onAddToChecklist={() => onAddToChecklist(paper)}
              >
                <PaperCard
                  paper={paper}
                  onClick={() => onOpenPaper(paper)}
                  onContextMenu={() => {}}
                  onAddToChecklist={() => onAddToChecklist(paper)}
                />
              </ContextMenuWrapper>
            );
          })}
        </div>
      )}

      {viewMode === 'compact' && (
        <div className="space-y-2">
          {papers.map((paper) => {
            
            return (
              <ContextMenuWrapper
                key={paper.id}
                paper={paper}
                onViewDetails={() => onOpenPaper(paper)}
                onEdit={() => onEditRequested(paper)}
                onDelete={() => handleDelete(paper)}
                onAddToChecklist={() => onAddToChecklist(paper)}
              >
                <PaperListItem
                  paper={paper}
                  onClick={() => onOpenPaper(paper)}
                  onContextMenu={() => {}}
                />
              </ContextMenuWrapper>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <PaperTable
          papers={papers}
          visibleColumns={visibleColumns}
          onPaperClick={onOpenPaper}
          onEdit={onEditRequested}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}