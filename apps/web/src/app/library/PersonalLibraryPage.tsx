'use client';

import React from 'react';
import { BookOpen, Tag, SlidersHorizontal, BookmarkMinus, Plus, Clock, Edit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import PaperCard from '@/components/library/PaperCard';
import CreatePaperDialog from '@/components/library/CreatePaperDialog';
import PersonalLibraryFilters from '@/components/library/PersonalLibraryFilters';
import EditPaperDialog from '@/components/library/EditPaperDialog';
import { usePersonalLibraryController, type PersonalLibraryItem } from '@/lib/hooks/usePersonalLibraryController';
import type { Author } from '@/types/paper';
import { userPaperService } from '@/lib';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  all: '全部状态',
  unread: '未开始',
  reading: '阅读中',
  finished: '已完成',
};

const PRIORITY_LABEL: Record<string, string> = {
  all: '全部优先级',
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const splitList = (v: string) =>
  v.split(/[,，;；、\s]+/).map(s => s.trim()).filter(Boolean);

const toNumber = (v: string) => (v?.trim() ? Number(v) : undefined);

/** 把 CreatePaperDialog 的 formData 直接就地转成后端要的结构（CreatePaperFromMetadataRequest） */
function buildCreatePayload(form: {
  title: string; titleZh: string; authors: string; publication: string;
  year: string; doi: string; articleType: any; sciQuartile: any;
  casQuartile: any; ccfRank: any; impactFactor: string; tags: string;
  abstract?: string; keywords?: string;
}) {
  return {
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
    // 后端通常接受作者名数组或 AuthorInput[]，此处传作者名数组最通用
    authors: splitList(form.authors),
    // 个人库：keywords 没有多语言，保持 string[]
    keywords: splitList(form.keywords || ''),
    // 个人库通常 abstract 为 string（若你的后端是多语言对象，可在此处改造）
    abstract: form.abstract?.trim() || undefined,
  } as any; // 若你有 CreatePaperFromMetadataRequest 类型，可把 any 替换为该类型
}

export default function PersonalLibraryPage() {
  const { user } = useAuth();
  const {
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
    handleRemove,
    handleOpen,
    resetFilters,
    reload,
    currentPage,
    setCurrentPage,
    openingPaperId,
    ConfirmDialog,
  } = usePersonalLibraryController();

  const displayName = user?.nickname || user?.username || '已登录用户';
  const hasActiveFilters =
    readingStatus !== 'all' || priority !== 'all' || customTag !== 'all';

  const filterSummary = [
    STATUS_LABEL[readingStatus],
    PRIORITY_LABEL[priority],
    customTag !== 'all' ? `#${customTag}` : null,
  ].filter(Boolean) as string[];

  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [editingPaper, setEditingPaper] = React.useState<PersonalLibraryItem | null>(null);

  const handleCreateSuccess = React.useCallback(() => {
    toast.success('论文创建成功');
    // 跳转到第一页并刷新数据，确保新创建的论文能立即显示
    setCurrentPage(1);
    reload();
    setShowCreateDialog(false);
  }, [setCurrentPage, reload]);

  const handleEditSuccess = React.useCallback(() => {
    toast.success('论文信息已更新');
    reload();
    setShowEditDialog(false);
    setEditingPaper(null);
  }, [reload]);

  const handleEditPaper = React.useCallback((item: PersonalLibraryItem) => {
    setEditingPaper(item);
    setShowEditDialog(true);
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_0%_0%,rgba(40,65,138,0.12),transparent),radial-gradient(45%_70%_at_100%_0%,rgba(247,194,66,0.1),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_120%,rgba(89,147,205,0.12),transparent)]" />

      <header className="relative flex-none border-b border-white/60 bg-white/70 px-6 py-5 shadow-[0_14px_34px_rgba(28,45,96,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-[#28418A] shadow backdrop-blur-lg">
              <BookOpen className="h-4 w-4" />
              个人论文库
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">我的论文库</h1>
              <p className="mt-1 text-sm text-slate-600">
                {displayName} · 收藏 {totalCount} 篇论文
              </p>
              <p className="mt-1 text-xs text-[#28418A]">
                在这里快速整理阅读状态、优先级与自定义标签，随时回顾笔记。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-2 py-1 shadow backdrop-blur-xl">
              <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-600 transition hover:border-white/60 hover:bg白/70 hover:text-slate-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              重置筛选
            </Button>
            {/* 新建论文按钮 */}
            <Button
              size="sm"
              className="flex items-center gap-2 rounded-xl bg-[#28418A] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#223672]"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4" />
              新建论文
            </Button>
          </div>
        </div>
      </header>

      <div className="relative flex-none border-b border-white/60 bg-white/75 px-6 py-4 shadow-[0_12px_32px_rgba(28,45,96,0.1)] backdrop-blur-xl">
        <div className="rounded-2xl border border-white/70 bg-white/78 px-5 py-4 shadow backdrop-blur-2xl">
          <PersonalLibraryFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterReadingStatus={readingStatus}
            onReadingStatusChange={(value) => setReadingStatus(value)}
            filterPriority={priority}
            onPriorityChange={(value) => setPriority(value)}
            filterCustomTag={customTag}
            onCustomTagChange={setCustomTag}
            personalTags={personalTags}
            onResetFilters={resetFilters}
          />
        </div>
      </div>

      <main className="relative flex-1 overflow-auto bg-white/72 px-6 py-6 backdrop-blur-xl">
        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center rounded-2xl border border-white/70 bg-white/78 py-12 text-sm text-slate-500 shadow backdrop-blur-2xl">
              正在加载个人论文库…
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200/65 bg-red-50/85 p-6 text-sm text-red-600 shadow backdrop-blur-2xl">
              加载失败：{error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/78 px-8 py-14 text-center shadow backdrop-blur-2xl">
              <Tag className="mb-4 h-12 w-12 text-slate-400" />
              <h3 className="mb-2 text-lg font-medium text-slate-900">暂无符合条件的论文</h3>
              <p className="mb-4 text-sm text-slate-600">
                可以调整筛选条件，或返回公共论文库继续收藏喜欢的论文。
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              {viewMode === 'card' && (
                <div className="flex flex-wrap gap-4">
                  {items.map(({ paper, personalMeta }) => (
                    <div
                      key={personalMeta.userPaperId}
                      className="w-[320px] shrink-0 rounded-2xl border border-white/70 bg-white/78 p-4 shadow backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_54px_rgba(28,45,96,0.2)]"
                    >
                      <PaperCard
                        paper={paper}
                        personalMeta={{
                          readingStatus: personalMeta.readingStatus,
                          priority: personalMeta.priority,
                          customTags: personalMeta.customTags,
                          noteCount: personalMeta.noteCount ?? 0,
                          totalReadingTime: personalMeta.totalReadingTime,
                          lastReadTime: personalMeta.lastReadTime,
                        }}
                        onClick={() => handleOpen({ paper, personalMeta })}
                        onRemoveFromLibrary={() => handleRemove(personalMeta.userPaperId)}
                        onEdit={() => handleEditPaper({ paper, personalMeta })}
                        isLoading={openingPaperId === personalMeta.userPaperId}
                      />
                    </div>
                  ))}
                </div>
              )}

              {viewMode === 'compact' && (
                <div className="space-y-3">
                  {items.map(({ paper, personalMeta }) => {
                    const authorNames =
                      (paper.authors || []).map((author: Author) => author.name).join('、') || '未知作者';
                    const tags = personalMeta.customTags || [];
                    const safeNoteCount = personalMeta.noteCount ?? 0;

                    return (
                      <div
                        key={personalMeta.userPaperId}
                        onClick={() => handleOpen({ paper, personalMeta })}
                        className={cn(
                          "group flex items-center justify-between rounded-2xl border border-white/70 bg-white/78 px-5 py-4 shadow backdrop-blur-2xl transition-all duration-300",
                          openingPaperId === personalMeta.userPaperId
                            ? "cursor-not-allowed opacity-70"
                            : "cursor-pointer hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(28,45,96,0.18)]"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium text-slate-900">{paper.title}</h3>
<<<<<<< HEAD
=======
                          {paper.titleZh && (
                            <h4 className="truncate text-xs font-medium text-slate-700/80 dark:text-slate-300/90">{paper.titleZh}</h4>
                          )}
>>>>>>> origin/main
                          <p className="truncate text-xs text-slate-600">
                            {authorNames} · {paper.year ?? '未知年份'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded-full bg-[#28418A0F] px-2 py-[3px] text-[#28418A]">
                              {STATUS_LABEL[personalMeta.readingStatus] ?? personalMeta.readingStatus}
                            </span>
                            <span className="rounded-full bg-amber-100/70 px-2 py-[3px] text-amber-700">
                              {PRIORITY_LABEL[personalMeta.priority] ?? personalMeta.priority}
                            </span>
                            {safeNoteCount > 0 && (
                              <span className="rounded-full border border-white/60 bg-white/75 px-2 py-[3px] text-slate-500">
                                笔记 {safeNoteCount}
                              </span>
                            )}
                            {typeof personalMeta.totalReadingTime === 'number' && (
                              <span className={`rounded-full border px-2 py-[3px] flex items-center gap-1 ${
                                personalMeta.totalReadingTime > 0
                                  ? 'border-white/60 bg-emerald-50/80 text-emerald-700'
                                  : 'border-white/40 bg-gray-50/60 text-gray-500'
                              }`}>
                                <Clock className="h-3 w-3" />
                                {personalMeta.totalReadingTime > 0
                                  ? personalMeta.totalReadingTime < 60
                                    ? `${personalMeta.totalReadingTime}秒`
                                    : personalMeta.totalReadingTime < 3600
                                    ? `${Math.floor(personalMeta.totalReadingTime / 60)}分钟`
                                    : `${Math.floor(personalMeta.totalReadingTime / 3600)}小时${Math.floor((personalMeta.totalReadingTime % 3600) / 60)}分钟`
                                  : '未阅读'
                                }
                              </span>
                            )}
                            {tags.map(tag => (
                              <span
                                key={tag}
                                className="rounded-full border border-white/60 bg-white/70 px-2 py-[3px] text-[#28418A]"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {openingPaperId === personalMeta.userPaperId && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-[#28418A]" />
                              <span className="text-xs text-[#28418A]">打开中...</span>
                            </div>
                          )}
                          {openingPaperId !== personalMeta.userPaperId && (
                            <>
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  handleEditPaper({ paper, personalMeta });
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white/80 text-[#28418A] shadow transition hover:border-[#28418A33] hover:bg-[#28418A12]"
                                aria-label="编辑论文"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  handleRemove(personalMeta.userPaperId);
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-white/80 text-[#28418A] shadow transition hover:border-[#28418A33] hover:bg-[#28418A12]"
                                aria-label="移除收藏"
                              >
                                <BookmarkMinus className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'table' && (
                <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/78 shadow backdrop-blur-2xl">
                  <div className="border-b border-white/60 px-6 py-4">
                    <h3 className="font-medium text-slate-900">表格视图开发中</h3>
                  </div>
                  <div className="p-6 text-center text-slate-500">
                    即将展示阅读进度、优先级与笔记数量等维度，敬请期待。
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 新建论文对话框 */}
      {showCreateDialog && (
        <>
          <div className="fixed inset-0 z-40 bg-white/10 backdrop-blur-md" />
          <CreatePaperDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={handleCreateSuccess}
            onSave={async (payload) => {
              try {
                if (payload.mode === 'manual') {
                  const data = buildCreatePayload(payload.data);
                  await userPaperService.createPaperFromMetadata({ metadata: data } as any);
                } else {
                  await userPaperService.createPaperFromText({ text: payload.text.trim() });
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
      
      {/* 编辑论文对话框 */}
      {showEditDialog && (
        <EditPaperDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          paper={editingPaper}
          onSuccess={handleEditSuccess}
        />
      )}
      
      <ConfirmDialog />
    </div>
  );
}
