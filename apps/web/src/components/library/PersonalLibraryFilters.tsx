// apps/web/src/components/library/PersonalLibraryFilters.tsx
'use client';

import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PersonalLibraryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterReadingStatus: 'all' | 'unread' | 'reading' | 'finished';
  onReadingStatusChange: (value: 'all' | 'unread' | 'reading' | 'finished') => void;
  filterPriority: 'all' | 'high' | 'medium' | 'low';
  onPriorityChange: (value: 'all' | 'high' | 'medium' | 'low') => void;
  filterCustomTag: string;
  onCustomTagChange: (value: string) => void;
  personalTags: string[];
  onResetFilters: () => void;
}

const READING_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'unread', label: '未开始' },
  { value: 'reading', label: '阅读中' },
  { value: 'finished', label: '已完成' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: 'high', label: '高优先级' },
  { value: 'medium', label: '中优先级' },
  { value: 'low', label: '低优先级' },
];

const glowTrigger =
  'rounded-xl border border-white/70 bg-white/78 px-3.5 h-10 text-sm text-slate-700 ' +
  'shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl transition-all ' +
  'hover:bg-white/90 hover:shadow-[0_16px_40px_rgba(40,65,138,0.24)] focus:ring-2 focus:ring-[#4769b8]/35 ' +
  'data-[state=open]:border-white data-[state=open]:shadow-[0_18px_46px_rgba(40,65,138,0.3)]';

const glowContent =
  'rounded-xl border border-white/70 bg-white/92 text-sm shadow-[0_18px_46px_rgba(28,45,96,0.2)] ' +
  'backdrop-blur-3xl overflow-hidden';

const glowButtonGhost =
  'rounded-xl border border-white/70 bg-white/78 text-[#28418A] shadow-[0_12px_30px_rgba(40,65,138,0.18)] ' +
  'backdrop-blur-xl hover:bg-white/90 hover:text-[#263b78]';

export default function PersonalLibraryFilters({
  searchTerm,
  onSearchChange,
  filterReadingStatus,
  onReadingStatusChange,
  filterPriority,
  onPriorityChange,
  filterCustomTag,
  onCustomTagChange,
  personalTags,
  onResetFilters,
}: PersonalLibraryFiltersProps) {
  const hasActiveFilters =
    searchTerm !== '' ||
    filterReadingStatus !== 'all' ||
    filterPriority !== 'all' ||
    filterCustomTag !== 'all';

  return (
    <div className="w-full space-y-4">
      <div className="flex w-full flex-col gap-4 md:flex-row">
        <div className="relative min-w-0 flex-1" data-glow="true">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6675a3]" />
          <Input
            placeholder="搜索论文标题、作者或期刊…"
            value={searchTerm}
            onChange={event => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/70 bg-white/80 pl-10 text-sm text-slate-700 shadow-[0_12px_34px_rgba(40,65,138,0.16)] transition-all focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
            data-glow="true"
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2" data-glow="true">
          <Select value={filterReadingStatus} onValueChange={onReadingStatusChange}>
            <SelectTrigger className={glowTrigger}>
              <SelectValue placeholder="选择阅读状态" />
            </SelectTrigger>
            <SelectContent className={glowContent} position="popper">
              {READING_STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={onPriorityChange}>
            <SelectTrigger className={glowTrigger}>
              <SelectValue placeholder="选择优先级" />
            </SelectTrigger>
            <SelectContent className={glowContent} position="popper">
              {PRIORITY_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCustomTag} onValueChange={onCustomTagChange}>
            <SelectTrigger className={glowTrigger}>
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent className={glowContent} position="popper">
              <SelectItem value="all">全部标签</SelectItem>
              {personalTags.map(tag => (
                <SelectItem key={tag} value={tag}>
                  #{tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              data-glow="true"
              variant="outline"
              onClick={onResetFilters}
              className={`${glowButtonGhost} h-10 gap-2 px-4 text-sm text-slate-600 hover:text-slate-900`}
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <GlowBadge onClear={() => onSearchChange('')}>搜索: {searchTerm}</GlowBadge>
          )}
          {filterReadingStatus !== 'all' && (
            <GlowBadge onClear={() => onReadingStatusChange('all')}>
              状态:{' '}
              {READING_STATUS_OPTIONS.find(item => item.value === filterReadingStatus)?.label ?? filterReadingStatus}
            </GlowBadge>
          )}
          {filterPriority !== 'all' && (
            <GlowBadge onClear={() => onPriorityChange('all')}>
              优先级:{' '}
              {PRIORITY_OPTIONS.find(item => item.value === filterPriority)?.label ?? filterPriority}
            </GlowBadge>
          )}
          {filterCustomTag !== 'all' && (
            <GlowBadge onClear={() => onCustomTagChange('all')}>
              标签: #{filterCustomTag}
            </GlowBadge>
          )}
        </div>
      )}
    </div>
  );
}

function GlowBadge({
  children,
  onClear,
}: {
  children: React.ReactNode;
  onClear: () => void;
}) {
  return (
    <Badge
      variant="outline"
      className="group inline-flex items-center gap-1 rounded-full border-white/70 bg-white/80 text-xs text-[#28418A] shadow-[0_10px_26px_rgba(40,65,138,0.18)] backdrop-blur-xl"
      data-glow="true"
    >
      {children}
      <X
        className="h-3.5 w-3.5 cursor-pointer text-[#7785b0] transition-colors group-hover:text-red-500"
        onClick={onClear}
      />
    </Badge>
  );
}