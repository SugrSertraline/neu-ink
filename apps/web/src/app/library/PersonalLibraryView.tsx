'use client';

import React from 'react';
import { BookOpen, Tag, SlidersHorizontal, BookmarkMinus } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import PaperCard from '@/components/library/PaperCard';
import { usePersonalLibraryController } from '@/lib/hooks/usePersonalLibraryController';
import type { Author } from '@/types/paper';

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

export default function PersonalLibraryView() {
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
  } = usePersonalLibraryController();

  const displayName = user?.nickname || user?.username || '已登录用户';
  const hasActiveFilters =
    readingStatus !== 'all' || priority !== 'all' || customTag !== 'all';

  const filterSummary = [
    STATUS_LABEL[readingStatus],
    PRIORITY_LABEL[priority],
    customTag !== 'all' ? `#${customTag}` : null,
  ].filter(Boolean) as string[];

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
              className="inline-flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-600 transition hover:border-white/60 hover:bg-white/70 hover:text-slate-900"
            >
              <SlidersHorizontal className="h-4 w-4" />
              重置筛选
            </Button>
          </div>
        </div>
      </header>

      <div className="relative flex-none border-b border-white/60 bg-white/75 px-6 py-4 shadow-[0_12px_32px_rgba(28,45,96,0.1)] backdrop-blur-xl">
        <div className="rounded-2xl border border-white/70 bg-white/78 px-5 py-4 shadow backdrop-blur-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="搜索论文标题、作者或期刊…"
                className="h-11 rounded-xl border border-white/70 bg-white/80 pl-12 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#4769b8]"
              />
              <BookOpen className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#28418A]" />
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto">
              <select
                value={readingStatus}
                onChange={event => setReadingStatus(event.target.value as typeof readingStatus)}
                className="h-11 rounded-xl border border-white/70 bg-white/80 px-3 text-sm text-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-[#4769b8]"
              >
                <option value="all">全部状态</option>
                <option value="unread">未开始</option>
                <option value="reading">阅读中</option>
                <option value="finished">已完成</option>
              </select>

              <select
                value={priority}
                onChange={event => setPriority(event.target.value as typeof priority)}
                className="h-11 rounded-xl border border-white/70 bg-white/80 px-3 text-sm text-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-[#4769b8]"
              >
                <option value="all">全部优先级</option>
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>

              <select
                value={customTag}
                onChange={event => setCustomTag(event.target.value)}
                className="h-11 rounded-xl border border-white/70 bg-white/80 px-3 text-sm text-slate-700 shadow focus:outline-none focus:ring-2 focus:ring-[#4769b8]"
              >
                <option value="all">全部标签</option>
                {personalTags.map(tag => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#28418A]">
              <span className="rounded-full border border-white/60 bg-white/70 px-3 py-[6px] text-[11px] font-medium shadow">
                当前筛选
              </span>
              {filterSummary.map(label => (
                <span
                  key={label}
                  className="rounded-full border border-[#28418A1A] bg-[#28418A0D] px-3 py-[6px] text-[11px] shadow"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {items.map(({ paper, personalMeta }) => (
                    <div
                      key={personalMeta.userPaperId}
                      className="rounded-2xl border border-white/70 bg-white/78 p-4 shadow backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_54px_rgba(28,45,96,0.2)]"
                    >
                      <PaperCard
                        paper={paper}
                        personalMeta={{
                          readingStatus: personalMeta.readingStatus,
                          priority: personalMeta.priority,
                          customTags: personalMeta.customTags,
                          noteCount: personalMeta.noteCount ?? 0,
                        }}
                        onClick={() => handleOpen({ paper, personalMeta })}
                        onRemoveFromLibrary={() => handleRemove(personalMeta.userPaperId)}
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
                        className="group flex cursor-pointer items-center justify-between rounded-2xl border border-white/70 bg-white/78 px-5 py-4 shadow backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(28,45,96,0.18)]"
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-medium text-slate-900">{paper.title}</h3>
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
    </div>
  );
}
