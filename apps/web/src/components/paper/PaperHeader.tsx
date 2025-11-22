'use client';

import React from 'react';
import {
  Search,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Paperclip,
  FileText,
  FileText as FilePDF,
} from 'lucide-react';
import { ViewerSource } from '@/types/paper/viewer';
import { toast } from 'sonner';

type Lang = 'en' | 'both';

interface PaperHeaderActions {
  canToggleVisibility?: boolean;
  isPublicVisible?: boolean;
  onToggleVisibility?: () => void;
  extraActionsHint?: string;
}

type ViewerSourceLabel = {
  label: string;
  description: string;
  tone: 'public' | 'admin' | 'personal';
};

const VIEWER_SOURCE_MAP: Record<ViewerSource, ViewerSourceLabel> = {
  'public-guest': {
    label: '公共库 · 访客',
    description: '只读视图，访客权限',
    tone: 'public',
  },
  'public-admin': {
    label: '公共库 · 管理员',
    description: '可管理公开论文的完整视图',
    tone: 'admin',
  },
  'personal-owner': {
    label: '个人库 · 我的收藏',
    description: '可编辑个人标注与阅读进度',
    tone: 'personal',
  },
};

const SOURCE_BADGES: Record<ViewerSourceLabel['tone'], string> = {
  admin: 'from-[#4f46e5]/85 via-[#4338ca]/80 to-[#312e81]/85 text-indigo-50',
  personal: 'from-[#10b981]/85 via-[#059669]/78 to-[#065f46]/85 text-emerald-50',
  public: 'from-[#38bdf8]/85 via-[#0ea5e9]/75 to-[#0369a1]/85 text-sky-50',
};

interface PaperHeaderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResultsCount?: number;
  currentSearchIndex?: number;
  onSearchNavigate?: (direction: 'next' | 'prev') => void;
  actions?: PaperHeaderActions;
  viewerSource?: ViewerSource;
  onOpenAttachments?: () => void;
  hasAttachments?: boolean;
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
  viewerSource,
  onOpenAttachments,
  hasAttachments = false,
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
        className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/40 px-4 py-1.5 text-sm text-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl transition hover:bg-white/65 hover:shadow-[0_16px_40px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:bg-slate-700/55"
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  };

  const sourceInfo = viewerSource ? VIEWER_SOURCE_MAP[viewerSource] : null;

  return (
    <div className="relative w-full px-6 py-4">
      <div
        className="mx-auto flex max-w-6xl items-center gap-4 rounded-2xl border border-white/45 bg-linear-to-tr from-white/30 via-white/15 to-white/35 px-6 py-4 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-[18px] dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/45 dark:to-slate-900/55 transition-all duration-200"
        style={{ willChange: 'transform' }}
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/45 bg-white/40 shadow-[0_16px_32px_rgba(37,99,235,0.25)] backdrop-blur-xl dark:border-slate-700/45 dark:bg-slate-800/50">
          <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </span>

        {sourceInfo && (
          <span
            className={`inline-flex min-w-44 flex-col rounded-2xl border border-white/35 bg-linear-to-r px-4 py-2 text-sm font-semibold shadow-[0_18px_42px_rgba(15,23,42,0.22)] ${SOURCE_BADGES[sourceInfo.tone]} backdrop-blur-lg dark:border-white/20`}
            title={sourceInfo.description}
          >
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-white/70">
              当前视图
            </span>
            <span className="truncate">{sourceInfo.label}</span>
          </span>
        )}

        {actions?.extraActionsHint && (
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {actions.extraActionsHint}
          </span>
        )}

        <div className="relative ml-auto flex min-w-[280px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500/70 dark:text-slate-400/70" />
          <input
            type="text"
            placeholder="搜索论文内容..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-full rounded-full border border-white/40 bg-white/45 py-3 pl-12 pr-36 text-sm text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)] outline-none transition placeholder:text-slate-400 focus:bg-white/70 focus:shadow-[0_26px_60px_rgba(15,23,42,0.2)] dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800/65"
          />
          {searchQuery && searchResultsCount > 0 && (
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full border border-white/40 bg-white/45 px-2 py-1 text-xs text-slate-600 shadow-[0_10px_22px_rgba(15,23,42,0.15)] backdrop-blur-lg dark:border-slate-700/40 dark:bg-slate-800/45 dark:text-slate-200">
              <span>
                {currentSearchIndex + 1} / {searchResultsCount}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onSearchNavigate?.('prev')}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-slate-600 shadow-sm transition hover:bg-white/80 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/70"
                  title="上一个"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSearchNavigate?.('next')}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-slate-600 shadow-sm transition hover:bg-white/80 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/70"
                  title="下一个"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {actions && (
            <>
              {renderActionButton(
                actions.canToggleVisibility,
                actions.isPublicVisible ? '设为私有' : '设为公开',
                actions.isPublicVisible ? EyeOff : Eye,
                actions.onToggleVisibility,
              )}
            </>
          )}
          
          {onOpenAttachments && (
            <button
              type="button"
              onClick={onOpenAttachments}
              className="inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/40 px-4 py-1.5 text-sm text-slate-800 shadow-[0_10px_28px_rgba(15,23,42,0.16)] backdrop-blur-xl transition hover:bg-white/65 hover:shadow-[0_16px_40px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-100 dark:hover:bg-slate-700/55"
              title="管理附件"
            >
              <Paperclip className="h-4 w-4" />
              附件
            </button>
          )}
          
          <div className="inline-flex rounded-full border border-white/40 bg-white/30 p-1 shadow-[0_14px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-800/40">
            {(
              [
                { value: 'en' as Lang, label: 'EN' },
                { value: 'both' as Lang, label: '双语' },
              ] as const
            ).map(({ value, label }) => {
              const isActive = lang === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  aria-pressed={isActive}
                  className={`px-3 py-1 text-sm font-medium transition ${
                    isActive
                      ? 'rounded-full bg-white/90 text-blue-600 shadow-[0_14px_34px_rgba(37,99,235,0.28)] dark:bg-slate-700/90 dark:text-blue-300'
                      : 'rounded-full text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/55 dark:hover:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}