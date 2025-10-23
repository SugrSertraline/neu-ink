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
  const { isAdmin } = useAuth();
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
        limit: pageSize,
      };

      // 根据用户类型选择API
      const response = isAdmin
        ? await paperApi.getAllPapers(filters)
        : await paperApi.getPublicPapers(filters);

      if (response.code === 200) {
        // 这里需要转换数据格式，现在先使用模拟数据
        const mockPapers: PaperListItem[] = Array.from({ length: 12 }, (_, i) => ({
          id: `paper-${i + 1}`,
          isPublic: true,
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          parseStatus: {
            status: i === 0 ? 'parsing' : i === 1 ? 'failed' : 'completed',
            progress: i === 0 ? 75 : 100,
            message: i === 0 ? '正在解析章节内容' : i === 1 ? '解析失败' : '解析完成'
          },
          title: `深度学习在自然语言处理中的应用研究 ${i + 1}`,
          titleZh: `深度学习研究 ${i + 1}`,
          authors: [
            { name: '张三', affiliation: '清华大学' },
            { name: '李四', affiliation: '北京大学' },
            { name: '王五', affiliation: '中科院' }
          ],
          publication: 'IEEE Transactions on Neural Networks',
          year: 2024 - (i % 3),
          articleType: ['journal', 'conference', 'preprint'][i % 3] as any,
          sciQuartile: ['Q1', 'Q2', 'Q3'][i % 3] as any,
          casQuartile: ['1区', '2区', '3区'][i % 3] as any,
          ccfRank: ['A', 'B', 'C'][i % 3] as any,
          impactFactor: 4.532 - (i * 0.1),
          tags: ['机器学习', 'NLP', '深度学习'].slice(0, (i % 3) + 1),
          readingStatus: ['unread', 'reading', 'finished'][i % 3] as any,
          priority: ['high', 'medium', 'low'][i % 3] as any,
          readingPosition: i < 6 ? (i + 1) * 0.1 : undefined,
          totalReadingTime: i < 6 ? (i + 1) * 600 : undefined,
        }));

        setPapers(mockPapers);
        setTotalCount(mockPapers.length);
        
        // 提取年份
        const years = Array.from(new Set(mockPapers.map(p => p.year).filter(Boolean)))
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
                {isAdmin ? '管理和浏览所有论文' : '浏览公共论文库'} • 共 {totalCount} 篇论文
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
                      onEdit={isAdmin ? () => console.log('编辑', paper.id) : undefined}
                      onDelete={isAdmin ? () => console.log('删除', paper.id) : undefined}
                      onAddToLibrary={!isAdmin ? () => console.log('添加到个人库', paper.id) : undefined}
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
    </div>
  );
}