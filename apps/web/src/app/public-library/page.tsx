'use client';

import React from 'react';
import { Library, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTabStore } from '@/stores/useTabStore';
import { usePaperApi } from '@/lib/paperApi';
import { useRouter } from 'next/navigation'; // ✅ 添加 useRouter
import type { PaperListItem, PaperFilters } from '@/types/paper';

// 组件
import LibraryFilters from '@/components/library/LibraryFilters';
import PaperCard from '@/components/library/PaperCard';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import CreatePaperDialog from '@/components/library/CreatePaperDialog';

type ViewMode = 'card' | 'table' | 'compact';

export default function LibraryPage() {
  const router = useRouter(); // ✅ 添加 router
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

  // ✅ 添加登录提示状态
  const [showLoginHint, setShowLoginHint] = React.useState(false);

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

      
      
      // 检查响应是否为空或无效
      if (!response || typeof response !== 'object') {
        
        setError('服务器响应无效');
        return;
      }
      
      if (response.code === 200 && response.data && response.data.code === 0) {
        // 使用后端返回的实际数据
        const papersData = response.data.data.papers;
        const pagination = response.data.data.pagination;
        
        
        
        
        // 检查数据是否为数组
        if (!Array.isArray(papersData)) {
          
          setError('数据格式错误：论文列表不是数组');
          return;
        }
        
        // 转换为 PaperListItem 格式
        const papersList: PaperListItem[] = papersData.map((paper: any, index: number) => {
          
          
          // 确保 parseStatus 有默认值
          const parseStatus = paper.parseStatus || {
            status: 'completed',
            progress: 100,
            message: '论文已就绪'
          };
          
          // 确保 metadata 存在
          const metadata = paper.metadata || {};
          
          return {
            id: paper.id || `paper-${index}`,
            isPublic: paper.isPublic !== false, // 默认为 true
            createdBy: paper.createdBy || 'unknown',
            createdAt: paper.createdAt || new Date().toISOString(),
            updatedAt: paper.updatedAt || new Date().toISOString(),
            parseStatus: parseStatus,
            
            // 论文元数据
            title: metadata.title || '未知标题',
            titleZh: metadata.titleZh,
            shortTitle: metadata.shortTitle,
            authors: metadata.authors || [],
            publication: metadata.publication,
            year: metadata.year,
            date: metadata.date,
            doi: metadata.doi,
            articleType: metadata.articleType,
            sciQuartile: metadata.sciQuartile,
            casQuartile: metadata.casQuartile,
            ccfRank: metadata.ccfRank,
            impactFactor: metadata.impactFactor,
            tags: metadata.tags || [],
            
            // 用户个性化数据（暂时为空，后续从用户论文关联中获取）
            readingStatus: undefined,
            priority: undefined,
            remarks: undefined,
            readingPosition: undefined,
            totalReadingTime: undefined,
            lastReadTime: undefined,
          };
        });

        
        
        
        setPapers(papersList);
        setTotalCount(pagination?.total || papersList.length);
        
        // 提取年份
        const years = Array.from(new Set(papersList.map(p => p.year).filter(Boolean)))
          .sort((a, b) => (b || 0) - (a || 0));
        setAvailableYears(years);
      } else {
        
        setError(response?.data?.message || response?.message || '获取论文列表失败');
      }
    } catch (err: any) {
      
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearchTerm, filterStatus, filterPriority, filterType,
    filterSciQuartile, filterCasQuartile, filterCcfRank, filterYear,
    currentPage, pageSize, isAdmin, isAuthenticated, paperApi
  ]);

  React.useEffect(() => {
    loadPapers();
  }, [loadPapers]);

  // ✅ 优化后的打开论文函数
  const openPaper = async (paper: PaperListItem) => {
    // 检查是否已登录
    if (!isAuthenticated) {
      // ✅ 显示登录提示
      setShowLoginHint(true);

      // ✅ 3秒后自动跳转到登录页面
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    try {
      // ✅ 调用 paperApi.getPaper 获取论文详情
      const response = await paperApi.getPaper(paper.id);

      if (response.code === 200 && response.data) {
        // ✅ 获取成功，跳转到论文详情页面
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

        // ✅ 导航到论文详情页面
        router.push(path);
      } else {
        // ✅ 获取失败，显示错误提示
        
        alert(`获取论文详情失败: ${response.message || '未知错误'}`);
      }
    } catch (error: any) {
      // ✅ 处理网络错误或其他异常
      
      alert(`获取论文详情失败: ${error?.message || '网络错误'}`);
    }
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
        
        alert(`删除失败: ${error.message}`);
      }
    }
  };

  // 添加论文到个人库
  const handleAddToLibrary = async (paperId: string) => {
    // ✅ 检查是否已登录
    if (!isAuthenticated) {
      setShowLoginHint(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      return;
    }

    try {
      const response = await paperApi.addToUserLibrary(paperId);
      if (response.code === 200) {
        alert('已添加到个人库');
      } else {
        throw new Error(response.message || '添加失败');
      }
    } catch (error: any) {
      
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
      {/* ✅ 登录提示浮层 */}
      {showLoginHint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Library className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                需要登录
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                查看论文详情需要登录账号
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                即将跳转到登录页面...
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowLoginHint(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={() => router.push('/login')}
                >
                  立即登录
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {/* ✅ 未登录时显示提示 */}
              {!isAuthenticated && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  💡 登录后可查看论文详情和管理个人论文库
                </p>
              )}
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
                <Button onClick={() => setShowCreateDialog(true)}>
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
                      onAddToLibrary={(!isAdmin && isAuthenticated) ? () => handleAddToLibrary(paper.id) : undefined}
                      showLoginRequired={!isAuthenticated} // ✅ 传递未登录状态
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
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer group"
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
                        {/* ✅ 未登录时显示登录提示标签 */}
                        {!isAuthenticated && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            点击登录查看
                          </span>
                        )}
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

      {/* 创建论文对话框 */}
      {showCreateDialog && (
        <CreatePaperDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            loadPapers();
          }}
        />
      )}

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