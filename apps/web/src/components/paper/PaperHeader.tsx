'use client';

import React from 'react';
import {
  Search,
  BookOpen,
  ChevronUp,
  ChevronDown,
  StickyNote,
  PencilLine,
  Eye,
  EyeOff,
} from 'lucide-react';

type Lang = 'en' | 'both';

interface PaperHeaderActions {
  canAddNotes?: boolean;
  canEditPublicPaper?: boolean;
  canEditPersonalPaper?: boolean;
  canToggleVisibility?: boolean;
  canToggleEditMode?: boolean;
  isPublicVisible?: boolean;
  isEditing?: boolean;
  onAddNote?: () => void;
  onEditPublicPaper?: () => void;
  onEditPersonalPaper?: () => void;
  onToggleVisibility?: () => void;
  onToggleEditMode?: () => void;
  extraActions?: React.ReactNode;
}

interface PaperHeaderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResultsCount?: number;
  currentSearchIndex?: number;
  onSearchNavigate?: (direction: 'next' | 'prev') => void;
  actions?: PaperHeaderActions;
}

export default function PaperHeader({
  lang,
  setLang,
  searchQuery,
  setSearchQuery,
  searchResultsCount = 0,
  currentSearchIndex = 0,
  onSearchNavigate,
  actions,
}: PaperHeaderProps) {
  const renderActionButton = (
    shouldRender: boolean | undefined,
    label: string,
    Icon: React.ElementType,
    handler?: () => void,
    disabled = false,
  ) => {
    if (!shouldRender) return null;
    return (
      <button
        type="button"
        onClick={handler}
        disabled={disabled || !handler}
        className="flex items-center gap-1 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1.5 text-sm text-gray-700 transition-all hover:bg-white/70 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-700/70 border border-white/20 dark:border-slate-600/20"
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="w-full px-6 py-3">
      <div className="mx-auto w-full bg-white/10 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl shadow-xl dark:border-slate-700/30">
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="搜索论文内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-32 py-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-gray-200/40 dark:border-slate-600/40 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white/70 dark:focus:bg-slate-800/70 outline-none text-sm dark:text-white transition-all shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && searchResultsCount > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-slate-400 bg-white/60 dark:bg-slate-700/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 dark:border-slate-600/20">
                    {currentSearchIndex + 1} / {searchResultsCount}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onSearchNavigate?.('prev')}
                      className="p-1 hover:bg-white/70 dark:hover:bg-slate-700/70 rounded-full transition-all backdrop-blur-md"
                      title="上一个"
                    >
                      <ChevronUp className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSearchNavigate?.('next')}
                      className="p-1 hover:bg-white/70 dark:hover:bg-slate-700/70 rounded-full transition-all backdrop-blur-md"
                      title="下一个"
                    >
                      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {actions && (
              <div className="flex items-center gap-2">
                {renderActionButton(
                  actions.canToggleEditMode,
                  actions.isEditing ? '退出编辑' : '进入编辑',
                  actions.isEditing ? BookOpen : PencilLine,
                  actions.onToggleEditMode,
                )}
                {renderActionButton(
                  actions.canAddNotes,
                  '添加笔记',
                  StickyNote,
                  actions.onAddNote,
                )}
                {renderActionButton(
                  actions.canEditPublicPaper,
                  '编辑公共论文',
                  PencilLine,
                  actions.onEditPublicPaper,
                )}
                {renderActionButton(
                  actions.canEditPersonalPaper,
                  '编辑个人论文',
                  PencilLine,
                  actions.onEditPersonalPaper,
                )}
                {renderActionButton(
                  actions.canToggleVisibility,
                  actions.isPublicVisible ? '设为私有' : '设为公开',
                  actions.isPublicVisible ? EyeOff : Eye,
                  actions.onToggleVisibility,
                )}
                {actions.extraActions}
              </div>
            )}

            <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full p-1 shadow-sm border border-white/20 dark:border-slate-600/20">
              {(
                [
                  { value: 'en' as Lang, label: 'EN' },
                  { value: 'both' as Lang, label: '双语' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    lang === value
                      ? 'bg-white/90 dark:bg-slate-700/90 text-blue-600 dark:text-blue-400 shadow-lg'
                      : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-white/30 dark:hover:bg-slate-700/30'
                  }`}
                  aria-pressed={lang === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
