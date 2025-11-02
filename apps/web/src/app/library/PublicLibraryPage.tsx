'use client';

import React from 'react';
import { Library, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LibraryFilters from '@/components/library/LibraryFilters';
import PaperCard from '@/components/library/PaperCard';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import CreatePaperDialog from '@/components/library/CreatePaperDialog';
import {usePublicLibraryController} from '@/lib/hooks/usePublicLibraryController'
import type { Author } from '@/types/paper';

export default function PublicLibraryPage() {
  const {
    isAdmin,
    isAuthenticated,
    viewMode,
    setViewMode,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
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
    papers,
    loading,
    error,
    totalCount,
    availableYears,
    showLoginHint,
    dismissLoginHint,
    navigateToLogin,
    openPaper,
    handleDeletePaper,
    handleAddToLibrary,
    resetFilters,
    reload,
  } = usePublicLibraryController();

  const [showCreateDialog, setShowCreateDialog] = React.useState(false);

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
                  <Button variant="outline" onClick={dismissLoginHint}>
                    取消
                  </Button>
                  <Button onClick={navigateToLogin}>立即登录</Button>
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
            onToggleAdvancedFilter={toggleAdvancedFilter}
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
              void reload();
            }}
          />
        </>
      )}
    </div>
  );
}
