// apps/web/src/components/library/PublicLibraryPage.tsx
'use client';

import React from 'react';
import { Library, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import LibraryFilters from '@/components/library/LibraryFilters';
import PaperCard from '@/components/library/PaperCard';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import CreatePaperDialog from '@/components/library/CreatePaperDialog';
import { usePublicLibraryController } from '@/lib/hooks/usePublicLibraryController';
import type { Author } from '@/types/paper';
import { toast } from 'sonner';
import { adminPaperService } from '@/lib/services/paper';

const splitList = (v: string) =>
  v.split(/[,，;；、\s]+/).map(s => s.trim()).filter(Boolean);

const toNumber = (v: string) => (v?.trim() ? Number(v) : undefined);

// 👇 新增：把单字符串映射为多语言对象
const toBilingualText:any = (v?: string): { en?: string; zh?: string } | undefined => {
  const t = v?.trim();
  if (!t) return undefined;
  const hasCJK = /[\u4e00-\u9fff]/.test(t); // 粗略判断是否中文
  return hasCJK ? { zh: t } : { en: t };
};

/** 把 CreatePaperDialog 的 formData 直接就地转成后端要的结构 */
function buildCreatePayload(form: {
  title: string; titleZh: string; authors: string; publication: string;
  year: string; doi: string; articleType: any; sciQuartile: any;
  casQuartile: any; ccfRank: any; impactFactor: string; tags: string;
  abstract?: string; keywords?: string;
}) {
  // 构建 metadata 对象
  const metadata = {
    title: form.title.trim(),
    titleZh: form.titleZh.trim() || undefined,
    publication: form.publication.trim() || undefined,
    year: toNumber(form.year),
    doi: form.doi.trim() || undefined,
    articleType: form.articleType,
    sciQuartile: form.sciQuartile === '无' ? undefined : form.sciQuartile,
    casQuartile: form.casQuartile === '无' ? undefined : form.casQuartile,
    ccfRank: form.ccfRank === '无' ? undefined : form.ccfRank,
    impactFactor: toNumber(form.impactFactor),
    tags: splitList(form.tags),
    authors: splitList(form.authors).map(name => ({ name })),
    // 👇 关键修复：把字符串 abstract 映射为多语言对象
    abstract: toBilingualText(form.abstract),
    keywords: splitList(form.keywords || ''),
  };

  // 返回后端期望的数据结构，包含 metadata 字段
  return {
    metadata,
    isPublic: true, // 管理员创建的论文默认为公开
  };
}



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

  const handleCreateButtonClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget;
      button.classList.remove('animate-glow-press');
      void button.offsetWidth;
      button.classList.add('animate-glow-press');
      setShowCreateDialog(true);
    },
    [setShowCreateDialog],
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_0%_0%,rgba(40,65,138,0.14),transparent),radial-gradient(45%_70%_at_100%_0%,rgba(247,194,66,0.12),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_120%,rgba(89,147,205,0.14),transparent)]" />

      {showLoginHint && (
        <>
          <div className="fixed inset-0 z-40  backdrop-blur-lg" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/60 p-8 text-center shadow-xl backdrop-blur-lg">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full  shadow">
                <Library className="h-7 w-7 text-[#28418A]" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">需要登录</h3>
              <p className="mb-6 text-sm leading-6 text-slate-600">查看论文详情或执行该操作前，请先登录账号。</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={dismissLoginHint} className="rounded-xl">
                  取消
                </Button>
                <Button onClick={navigateToLogin} className="rounded-xl bg-[#28418A] text-white hover:bg-[#223672]">
                  立即登录
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <header className="relative flex-none border-b border-white/60 bg-white/70 px-6 py-5 shadow-[0_14px_34px_rgba(28,45,96,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-[#28418A] shadow backdrop-blur-lg">
              <Library className="h-4 w-4" />
              公共论文库
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">论文库</h1>
              <p className="mt-1 text-sm text-slate-600">
                {isAdmin
                  ? '管理与浏览所有论文'
                  : isAuthenticated
                    ? '浏览公共论文库'
                    : '浏览公共论文库（无需登录）'}{' '}
                · 共 {totalCount} 篇论文
              </p>
              {!isAuthenticated && (
                <p className="mt-1 text-xs text-[#28418A]">💡 登录后可查看论文详情并管理个人论文库</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Button
                size="sm"
                className="flex items-center gap-2 rounded-xl bg-[#28418A] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#223672] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4769b8]"
                onClick={handleCreateButtonClick}
                onAnimationEnd={event => event.currentTarget.classList.remove('animate-glow-press')}
              >
                <Plus className="h-4 w-4" />
                新建论文
              </Button>
            )}
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-2 py-1 shadow backdrop-blur-xl">
              <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </div>
      </header>

      <div className="relative flex-none border-b border-white/60 bg-white/75 px-6 py-4 shadow-[0_12px_32px_rgba(28,45,96,0.1)] backdrop-blur-xl">
        <div className="rounded-2xl border border-white/70 bg-white/78 px-5 py-4 shadow backdrop-blur-2xl">
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

      <main className="relative flex-1 overflow-auto bg-white/72 px-6 py-6 backdrop-blur-xl">
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center rounded-2xl border border-white/70 bg-white/78 py-12 text-sm text-slate-500 shadow backdrop-blur-2xl">
              加载中…
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200/65 bg-red-50/85 p-6 text-sm text-red-600 shadow backdrop-blur-2xl">
              加载失败：{error}
            </div>
          )}

          {!loading && !error && papers.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/78 px-8 py-14 text-center shadow backdrop-blur-2xl">
              <Library className="mb-4 h-12 w-12 text-slate-400" />
              <h3 className="mb-2 text-lg font-medium text-slate-900">暂无论文</h3>
              <p className="mb-4 text-sm text-slate-600">
                {isAdmin ? '开始添加第一篇论文吧' : '暂时没有符合条件的论文'}
              </p>
              {!isAuthenticated && (
                <p className="mb-4 text-sm text-[#28418A]">登录后可以查看论文详情并管理个人论文库</p>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleCreateButtonClick}
                  onAnimationEnd={event => event.currentTarget.classList.remove('animate-glow-press')}
                  className="flex items-center gap-2 rounded-xl bg-[#28418A] px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-[#223672] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4769b8]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  添加论文
                </Button>
              )}
            </div>
          )}

          {!loading && !error && papers.length > 0 && (
            <>
              {viewMode === 'card' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {papers.map(paper => (
                    <div
                      key={paper.id}
                      className="rounded-2xl border border-white/70 bg-white/78 p-4 shadow backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_54px_rgba(28,45,96,0.2)]"
                    >
                      <PaperCard
                        paper={paper}
                        onClick={() => openPaper(paper)}
                        onDelete={isAdmin ? () => handleDeletePaper(paper.id) : undefined}
                        onAddToLibrary={isAuthenticated ? () => handleAddToLibrary(paper.id) : undefined}
                        showLoginRequired={!isAuthenticated}
                        isAdmin={isAdmin}
                      />
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="space-y-3">
                  {papers.map(paper => (
                    <div
                      key={paper.id}
                      onClick={() => openPaper(paper)}
                      className="group flex cursor-pointer items-center justify-between rounded-2xl border border-white/70 bg-white/78 px-5 py-3 shadow backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(28,45,96,0.18)]"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-slate-900">{paper.title}</h3>
                        <p className="truncate text-xs text-slate-600">
                          {paper.authors.map((author: Author) => author.name).join(', ')} ·{' '}
                          {paper.year ?? '未知年份'}
                        </p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {!isAuthenticated && (
                          <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <span className="rounded-full border border-white/70 bg-white/75 px-2 py-[5px] text-[11px] text-[#28418A] shadow backdrop-blur-xl">
                              登录后查看详情
                            </span>
                          </span>
                        )}
                        {paper.sciQuartile && paper.sciQuartile !== '无' && (
                          <span className="rounded-full bg-red-50/85 px-2 py-1 text-xs text-red-600 shadow backdrop-blur-xl">
                            {paper.sciQuartile}
                          </span>
                        )}
                        {paper.impactFactor && (
                          <span className="text-xs text-slate-500">IF: {paper.impactFactor}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'table' && (
                <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/78 shadow backdrop-blur-2xl">
                  <div className="border-b border-white/60 px-6 py-4">
                    <h3 className="font-medium text-slate-900">表格视图开发中</h3>
                  </div>
                  <div className="p-6 text-center text-slate-500">表格视图功能即将推出</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showCreateDialog && (
        <>
          <div className="fixed inset-0 z-40 bg-white/10 backdrop-blur-md" />
          <CreatePaperDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={() => {
              toast.success('创建成功');
              reload();
              setShowCreateDialog(false);
            }}
            onSave={async (payload) => {
              try {
                if (payload.mode === 'manual') {
                  const data = buildCreatePayload(payload.data);
                  await adminPaperService.createPaper(data);
                } else {
                  await adminPaperService.createPaperFromText({ text: payload.text.trim() });
                }
              } catch (e: any) {
                const errorMessage = e?.message || '创建失败';
                if (errorMessage.includes('文本解析失败')) {
                  toast.error('文本解析失败，建议使用手动输入模式或检查文本格式');
                } else {
                  toast.error(`创建失败：${errorMessage}`);
                }
                throw e;
              }
            }}
          />
        </>
      )}
    </div>
  );
}
