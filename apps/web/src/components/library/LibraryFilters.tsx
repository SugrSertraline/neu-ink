// apps/web/src/components/library/LibraryFilters.tsx
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

interface LibraryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onStatusChange: (value: string) => void;
  filterPriority: string;
  onPriorityChange: (value: string) => void;
  filterType: string;
  onTypeChange: (value: string) => void;
  showAdvancedFilter: boolean;
  onToggleAdvancedFilter: () => void;
  filterSciQuartile: string;
  onSciQuartileChange: (value: string) => void;
  filterCasQuartile: string;
  onCasQuartileChange: (value: string) => void;
  filterCcfRank: string;
  onCcfRankChange: (value: string) => void;
  filterYear: string;
  onYearChange: (value: string) => void;
  availableYears: (number | undefined)[];
  onResetFilters: () => void;
  canFilterStatus?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待解析' },
  { value: 'parsing', label: '解析中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '解析失败' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: '全部优先级' },
  { value: 'high', label: '影响力高 (IF≥10)' },
  { value: 'medium', label: '影响力中 (5≤IF<10)' },
  { value: 'low', label: '影响力低 (0<IF<5)' },
];

const ARTICLE_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'journal', label: '期刊' },
  { value: 'conference', label: '会议' },
  { value: 'preprint', label: '预印本' },
  { value: 'book', label: '书籍' },
  { value: 'thesis', label: '学位论文' },
  { value: 'report', label: '技术报告' },
];

const glowTrigger =
  'rounded-xl border border-white/70 bg-white/78 px-3.5 h-10 text-sm text-slate-700 ' +
  'shadow-[0_12px_34px_rgba(40,65,138,0.16)] backdrop-blur-xl transition-all ' +
  'hover:bg-white/90 hover:shadow-[0_16px_40px_rgba(40,65,138,0.24)] focus:ring-2 focus:ring-[#4769b8]/35 ' +
  'data-[state=open]:border-white data-[state=open]:shadow-[0_18px_46px_rgba(40,65,138,0.3)]';

const glowContent =
  'rounded-xl border border-white/70 bg-white/92 text-sm shadow-[0_18px_46px_rgba(28,45,96,0.2)] ' +
  'backdrop-blur-3xl overflow-hidden';

const glowButtonFilled =
  'rounded-xl bg-gradient-to-r from-[#28418A]/92 via-[#28418A]/88 to-[#28418A]/92 ' +
  'shadow-[0_16px_38px_rgba(40,65,138,0.28)] hover:shadow-[0_20px_46px_rgba(40,65,138,0.35)] ' +
  'border border-white/70';

const glowButtonGhost =
  'rounded-xl border border-white/70 bg-white/78 text-[#28418A] shadow-[0_12px_30px_rgba(40,65,138,0.18)] ' +
  'backdrop-blur-xl hover:bg-white/90 hover:text-[#263b78]';

export default function LibraryFilters({
  searchTerm,
  onSearchChange,
  filterStatus,
  onStatusChange,
  filterPriority,
  onPriorityChange,
  filterType,
  onTypeChange,
  showAdvancedFilter,
  onToggleAdvancedFilter,
  filterSciQuartile,
  onSciQuartileChange,
  filterCasQuartile,
  onCasQuartileChange,
  filterCcfRank,
  onCcfRankChange,
  filterYear,
  onYearChange,
  availableYears,
  onResetFilters,
  canFilterStatus = false,
}: LibraryFiltersProps) {
  const hasActiveAdvancedFilters =
    filterSciQuartile !== 'all' ||
    filterCasQuartile !== 'all' ||
    filterCcfRank !== 'all' ||
    filterYear !== 'all';

  const hasActiveFilters =
    searchTerm !== '' ||
    (canFilterStatus && filterStatus !== 'all') ||
    filterPriority !== 'all' ||
    filterType !== 'all' ||
    hasActiveAdvancedFilters;

  const effectiveYears = availableYears.filter(
    (year): year is number => typeof year === 'number' && !Number.isNaN(year),
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex w-full flex-col gap-4 md:flex-row">
        <div className="relative min-w-0 flex-1" data-glow="true">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6675a3]" />
          <Input
            placeholder="搜索标题、作者、期刊..."
            value={searchTerm}
            onChange={event => onSearchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/70 bg-white/80 pl-10 text-sm text-slate-700 shadow-[0_12px_34px_rgba(40,65,138,0.16)] transition-all focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-white"
            data-glow="true"
          />
        </div>

        <div className="flex min-w-0 flex-wrap gap-2" data-glow="true">
          {canFilterStatus && (
            <Select value={filterStatus} onValueChange={onStatusChange}>
              <SelectTrigger className={glowTrigger}>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent className={glowContent} position="popper">
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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

          <Select value={filterType} onValueChange={onTypeChange}>
            <SelectTrigger className={glowTrigger}>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent className={glowContent} position="popper">
              {ARTICLE_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            data-glow="true"
            onClick={onToggleAdvancedFilter}
            className={cn(
              'h-10 gap-2 px-4 text-sm transition-all',
              hasActiveAdvancedFilters ? glowButtonFilled : glowButtonGhost,
            )}
          >
            <Filter className="h-4 w-4" />
            高级
            {hasActiveAdvancedFilters && <span className="ml-1 h-2 w-2 rounded-full bg-white" />}
          </Button>

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

      {showAdvancedFilter && (
        <div
          className="rounded-2xl border border-white/70 bg-white/82 p-5 shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl"
          data-glow="true"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-800">高级筛选</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvancedFilter}
              className="h-8 w-8 rounded-xl border border-white/70 bg-white/80 shadow-[0_12px_28px_rgba(40,65,138,0.12)] hover:bg-white/90"
              data-glow="true"
            >
              <X className="h-4 w-4 text-[#28418A]" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdvancedSelect
              label="SCI分区"
              value={filterSciQuartile}
              onValueChange={onSciQuartileChange}
            >
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </AdvancedSelect>

            <AdvancedSelect
              label="中科院分区"
              value={filterCasQuartile}
              onValueChange={onCasQuartileChange}
            >
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="1区">1区</SelectItem>
              <SelectItem value="2区">2区</SelectItem>
              <SelectItem value="3区">3区</SelectItem>
              <SelectItem value="4区">4区</SelectItem>
            </AdvancedSelect>

            <AdvancedSelect label="CCF分级" value={filterCcfRank} onValueChange={onCcfRankChange}>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="A">A类</SelectItem>
              <SelectItem value="B">B类</SelectItem>
              <SelectItem value="C">C类</SelectItem>
            </AdvancedSelect>

            <AdvancedSelect label="年份" value={filterYear} onValueChange={onYearChange}>
              <SelectItem value="all">全部年份</SelectItem>
              {effectiveYears.map(year => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </AdvancedSelect>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <GlowBadge onClear={() => onSearchChange('')}>搜索: {searchTerm}</GlowBadge>
          )}
          {canFilterStatus && filterStatus !== 'all' && (
            <GlowBadge onClear={() => onStatusChange('all')}>
              状态:{' '}
              {STATUS_OPTIONS.find(item => item.value === filterStatus)?.label ?? filterStatus}
            </GlowBadge>
          )}
          {filterPriority !== 'all' && (
            <GlowBadge onClear={() => onPriorityChange('all')}>
              优先级:{' '}
              {PRIORITY_OPTIONS.find(item => item.value === filterPriority)?.label ?? filterPriority}
            </GlowBadge>
          )}
          {filterType !== 'all' && (
            <GlowBadge onClear={() => onTypeChange('all')}>
              类型:{' '}
              {ARTICLE_TYPE_OPTIONS.find(item => item.value === filterType)?.label ?? filterType}
            </GlowBadge>
          )}
          {filterSciQuartile !== 'all' && (
            <GlowBadge onClear={() => onSciQuartileChange('all')}>SCI: {filterSciQuartile}</GlowBadge>
          )}
          {filterCasQuartile !== 'all' && (
            <GlowBadge onClear={() => onCasQuartileChange('all')}>
              中科院: {filterCasQuartile}
            </GlowBadge>
          )}
          {filterCcfRank !== 'all' && (
            <GlowBadge onClear={() => onCcfRankChange('all')}>CCF: {filterCcfRank}</GlowBadge>
          )}
          {filterYear !== 'all' && (
            <GlowBadge onClear={() => onYearChange('all')}>年份: {filterYear}</GlowBadge>
          )}
        </div>
      )}
    </div>
  );
}

function AdvancedSelect({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2" data-glow="true">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={`${glowTrigger} h-11`}>
          <SelectValue placeholder={`选择${label}`} />
        </SelectTrigger>
        <SelectContent className={glowContent} position="popper">
          {children}
        </SelectContent>
      </Select>
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
