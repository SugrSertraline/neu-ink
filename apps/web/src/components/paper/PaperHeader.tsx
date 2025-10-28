'use client';

import React from 'react';
import { Search, BookOpen, ChevronUp, ChevronDown, Pin, PinOff } from 'lucide-react';
import type { PaperMetadata } from '@/types/paper';

type Lang = 'en' | 'both';

interface PaperHeaderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResultsCount?: number;
  currentSearchIndex?: number;
  onSearchNavigate?: (direction: 'next' | 'prev') => void;
  isHeaderPinned?: boolean;
  onTogglePin?: () => void;
}

export default function PaperHeader({
  lang,
  setLang,
  searchQuery,
  setSearchQuery,
  searchResultsCount = 0,
  currentSearchIndex = 0,
  onSearchNavigate,
  isHeaderPinned = false,
  onTogglePin,
}: PaperHeaderProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* 固钉按钮 */}
        <button
          onClick={onTogglePin}
          className={`p-2 rounded-lg transition-colors ${
            isHeaderPinned
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
          title={isHeaderPinned ? "取消固定" : "固定header"}
        >
          {isHeaderPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
        </button>

        {/* 左侧：Logo + 搜索 */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索论文内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-32 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm dark:bg-slate-800 dark:text-white"
            />
            {searchQuery && searchResultsCount > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-slate-400">
                  {currentSearchIndex + 1} / {searchResultsCount}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onSearchNavigate?.('prev')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="上一个"
                  >
                    <ChevronUp className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => onSearchNavigate?.('next')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                    title="下一个"
                  >
                    <ChevronDown className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧：语言切换 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
            {[
              { value: 'en' as Lang, label: 'EN' },
              { value: 'both' as Lang, label: '双语' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLang(value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  lang === value
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
