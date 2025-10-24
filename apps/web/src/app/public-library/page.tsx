'use client';

import React from 'react';
import { Library, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/stores/useTabStore';
import { usePaperApi } from '@/lib/paperApi';
import type { PaperListItem, PaperFilters } from '@/types/paper';

// 组件
import LibraryFilters from '@/components/library/LibraryFilters';
import PaperCard from '@/components/library/PaperCard';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import CreatePaperDialog from '@/components/library/CreatePaperDialog';

type ViewMode = 'card' | 'table' | 'compact';

export default function LibraryPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { addTab, setActiveTab } = useTabStore();
  const { paperApi, paperCache } = usePaperApi();

  // 视图状态
  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  
  // 筛选状态
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

  // 对话框状态
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [editingPaper, setEditingPaper] = React.useState<PaperListItem | null>(null);

  // 数据状态
  const [papers, setPapers] = React.useState<PaperListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalCount, setTotalCount] = React.useState(0);
  const [availableYears, setAvailableYears] = React.useState<(number | undefined)[]>([]);

  // 分页状态
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // 搜索防抖
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 筛选条件变化时重置页码
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filterStatus, filterPriority, filterType, filterSciQuartile, filterCasQuartile, filterCcfRank, filterYear]);

  // 加载论文数据
  const loadPapers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: PaperFilters = {
        search: debouncedSearchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        articleType: filterType !== 'all' ? filterType : undefined,
        year: filterYear !== 'all' ? filterYear : undefined,
        sciQuartile: filterSciQuartile !== 'all' ? filterSciQuartile : undefined,
        casQuartile: filterCasQuartile !== 'all' ? filterCasQuartile : undefined,
        ccfRank: filterCcfRank !== 'all' ? filterCcfRank : undefined,
        page: currentPage,
        pageSize: pageSize,
      };

      // 根据用户类型选择不同的API端点
      let response;
      if (isAdmin) {
        // 管理员使用 /papers/all 端点
        response = await paperApi.getAllPapers(filters);
      } else if (isAuthenticated) {
        // 已登录用户可以使用 /papers/user 端点获取个人论文
        // 或者使用 /papers 端点获取公开论文
        response = await paperApi.getPublicPapers(filters);
      } else {
        // 未登录用户使用 /papers 端点获取公开论文
        response = await paperApi.getPublicPapers(filters);
      }

      if (response.code === 200 && response.data.code === 0) {
        // 使用后端返回的实际数据
        const papersData = response.data.data.papers;
        const pagination = response.data.data.pagination;
        
        // 转换为 PaperListItem 格式
        const papersList: PaperListItem[] = papersData.map((paper: any) => ({
          id: paper.id,
          isPublic: paper.isPublic,
          createdBy: paper.createdBy,
          createdAt: paper.createdAt,
          updatedAt: paper.updatedAt,
          parseStatus: paper.parseStatus,
          
          // 论文元数据
          title: paper.metadata?.title || '未知标题',
          titleZh: paper.metadata?.titleZh,
          shortTitle: paper.metadata?.shortTitle,
          authors: paper.metadata?.authors || [],
          publication: paper.metadata?.publication,
          year: paper.metadata?.year,
          date: paper.metadata?.date,
          doi: paper.metadata?.doi,
          articleType: paper.metadata?.articleType,
          sciQuartile: paper.metadata?.sciQuartile,
          casQuartile: paper.metadata?.casQuartile,
          ccfRank: paper.metadata?.ccfRank,
          impactFactor: paper.metadata?.impactFactor,
          tags: paper.metadata?.tags || [],
          
          // 用户个性化数据（暂时为空，后续从用户论文关联中获取）
          readingStatus: undefined,
          priority: undefined,
          remarks: undefined,
          readingPosition: undefined,
          totalReadingTime: undefined,
          lastReadTime: undefined,
        }));

        setPapers(papersList);
        setTotalCount(pagination.total);
        
        // 提取年份
        const years = Array.from(new Set(papersList.map(p => p.year).filter(Boolean)))
          .sort((a, b) => (b || 0) - (a || 0));
        setAvailableYears(years);
      }
    } catch (err: any) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm, filterStatus, filterPriority, filterType,
    filterSciQuartile, filterCasQuartile, filterCcfRank, filterYear,
    currentPage, pageSize, isAdmin, paperApi
  ]);

  React.useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // 打开论文
  const openPaper = async (paper: PaperListItem) => {
    // 检查是否已登录
    if (!isAuthenticated) {
      // 未登录则跳转到登录页面
      window.location.href = '/login';
      return;
    }
    
    const id = `paper:${paper.id}`;
    const path = `/paper/${paper.id}`;
    
    addTab({
      id,
      type: 'paper',
      title: paper.title,
      path,
      data: { paperId: paper.id }
    });
    setActiveTab(id);
  };

  // 编辑论文
  const handleEditPaper = (paper: PaperListItem) => {
    setEditingPaper(paper);
    setShowEditDialog(true);
  };

  // 删除论文
  const handleDeletePaper = async (paperId: string) => {
    if (window.confirm('确定要删除这篇论文吗？此操作不可撤销。')) {
      try {
        const response = await paperApi.deletePaper(paperId);
        if (response.code === 200) {
          // 重新加载论文列表
          loadPapers();
        } else {
          throw new Error(response.message || '删除失败');
        }
      } catch (error: any) {
        console.error('删除失败:', error);
        alert(`删除失败: ${error.message}`);
      }
    }
  };

  // 添加论文到个人库
  const handleAddToLibrary = async (paperId: string) => {
    try {
      const response = await paperApi.addToUserLibrary(paperId);
      if (response.code === 200) {
        alert('已添加到个人库');
      } else {
        throw new Error(response.message || '添加失败');
      }
    } catch (error: any) {
      console.error('添加失败:', error);
      alert(`添加失败: ${error.message}`);
    }
  };

  // 重置筛选
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
    <div className="flex flex-col h-full">
      {/* 顶部固定区域 */}
      <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="p-6 pb-4 space-y-4">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                论文库
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isAdmin ? '管理和浏览所有论文' : isAuthenticated ? '浏览公共论文库' : '浏览公共论文库（无需登录）'} • 共 {totalCount} 篇论文
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <div className="relative">
                  <Button
                    className="gap-2"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                    新建论文
                  </Button>
                </div>
              )}
              <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* 筛选组件 */}
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
            filterYear={filterYear}
            onYearChange={setFilterYear}
            availableYears={availableYears}
            onResetFilters={resetFilters}
          />
        </div>
      </div>

      {/* 中间内容区域（可滚动） */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">加载中...</div>
            </div>
          )}

          {error && (
            <div className="p-6 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              加载失败：{error}
            </div>
          )}

          {!loading && !error && papers.length === 0 && (
            <div className="text-center py-12">
              <Library className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                暂无论文
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {isAdmin ? '开始添加第一篇论文吧' : '暂时没有符合条件的论文'}
              </p>
              {!isAuthenticated && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  登录后可以查看论文详情和管理个人论文库
                </p>
              )}
              {isAdmin && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  添加论文
                </Button>
              )}
            </div>
          )}

          {!loading && !error && papers.length > 0 && (
            <>
              {viewMode === 'card' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {papers.map((paper) => (
                    <PaperCard
                      key={paper.id}
                      paper={paper}
                      onClick={() => openPaper(paper)}
                      onEdit={isAdmin ? () => handleEditPaper(paper) : undefined}
                      onDelete={isAdmin ? () => handleDeletePaper(paper.id) : undefined}
                      onAddToLibrary={!isAdmin ? () => handleAddToLibrary(paper.id) : undefined}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="space-y-2">
                  {papers.map((paper) => (
                    <div
                      key={paper.id}
                      onClick={() => openPaper(paper)}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {paper.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {paper.authors.map(a => a.name).join(', ')} • {paper.year}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {paper.sciQuartile && paper.sciQuartile !== '无' && (
                          <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                            {paper.sciQuartile}
                          </span>
                        )}
                        {paper.impactFactor && (
                          <span className="text-xs text-gray-500">
                            IF: {paper.impactFactor}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">表格视图开发中</h3>
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

      {/* 编辑论文对话框 */}
      {showEditDialog && editingPaper && (
        <CreatePaperDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingPaper(null);
          }}
          onSuccess={() => {
            setShowEditDialog(false);
            setEditingPaper(null);
            loadPapers();
          }}
        />
      )}
    </div>
  );
}