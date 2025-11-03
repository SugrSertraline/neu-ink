'use client';

import React from 'react';
import { BookOpen, Tag, SlidersHorizontal } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ViewModeSwitcher from '@/components/library/ViewModeSwitcher';
import PaperCard from '@/components/library/PaperCard';
import {usePersonalLibraryController} from '@/lib/hooks/usePersonalLibraryController'


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

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">我的论文库</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {user?.nickname || user?.username || '已登录用户'} • 当前共 {totalCount} 篇论文
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              支持按照阅读状态、优先级和自定义标签筛选，并可从卡片直接打开或移除收藏。
            </p>
          </div>
          <ViewModeSwitcher value={viewMode} onChange={setViewMode} />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="relative flex-1">
            <Input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="搜索收藏的论文标题、作者或期刊…"
              className="pl-10"
            />
            <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          <div className="grid w-full gap-3 md:w-auto md:grid-cols-3">
            <select
              value={readingStatus}
              onChange={event => setReadingStatus(event.target.value as typeof readingStatus)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">全部状态</option>
              <option value="unread">未开始</option>
              <option value="reading">阅读中</option>
              <option value="finished">已完成</option>
            </select>

            <select
              value={priority}
              onChange={event => setPriority(event.target.value as typeof priority)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>

            <select
              value={customTag}
              onChange={event => setCustomTag(event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">全部标签</option>
              {personalTags.map(tag => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <SlidersHorizontal className="h-4 w-4" />
            重置
          </Button>
        </div>

        {(readingStatus !== 'all' || priority !== 'all' || customTag !== 'all') && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-600 dark:text-blue-400">
            <span>当前筛选：</span>
            <span>{STATUS_LABEL[readingStatus]}</span>
            <span>·</span>
            <span>{PRIORITY_LABEL[priority]}</span>
            {customTag !== 'all' && (
              <>
                <span>·</span>
                <span>#{customTag}</span>
              </>
            )}
          </div>
        )}
      </header>

      <section className="flex-1 overflow-auto px-6 py-6">
        {loading && (
          <div className="flex h-64 items-center justify-center text-gray-500 dark:text-gray-400">
            正在加载个人论文库…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 px-8 py-16 text-center dark:border-gray-700 dark:bg-gray-900/60">
            <Tag className="mb-4 h-10 w-10 text-indigo-500 dark:text-indigo-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">暂无符合条件的论文</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              可以尝试调整筛选条件，或返回公共论文库继续收藏。
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map(({ paper, personalMeta }) => (
                  <PaperCard
                    key={personalMeta.userPaperId}
                    paper={paper}
                    personalMeta={{
                      readingStatus: personalMeta.readingStatus,
                      priority: personalMeta.priority,
                      customTags: personalMeta.customTags,
                      noteCount: personalMeta.noteCount,
                    }}
                    onClick={() => handleOpen({ paper, personalMeta })}
                    onRemoveFromLibrary={() => handleRemove(personalMeta.userPaperId)}
                  />
                ))}
              </div>
            )}

            {viewMode === 'compact' && (
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-white/80 px-6 py-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
                紧凑视图正在迁移，敬请期待。
              </div>
            )}

            {viewMode === 'table' && (
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-white/80 px-6 py-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300">
                表格视图正在设计，会展示阅读状态、进度与笔记数量。
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
