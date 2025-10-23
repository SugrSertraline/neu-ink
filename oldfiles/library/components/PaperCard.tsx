// app/library/components/PaperCard.tsx
'use client';

import React from 'react';
import { Star, Clock, FolderPlus, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PaperMetadata } from '@/app/types/paper';
import { getStatusBadge, getPriorityBadge, getQuartileColor } from '../utils/paperHelpers';
import { parseStatusInfo } from '../utils/parseStatusHelper';

interface PaperCardProps {
  paper: PaperMetadata;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onAddToChecklist?: () => void;
}

export default function PaperCard({ 
  paper, 
  onClick, 
  onContextMenu,
  onAddToChecklist,
}: PaperCardProps) {
  // 解析状态信息
  const statusInfo = parseStatusInfo(paper.parseStatus, paper.remarks);
    
  
  return (
    <div
      onContextMenu={onContextMenu}
      className={cn(
        "group relative rounded-xl border border-slate-200 dark:border-slate-800 p-5 transition-all duration-300 bg-white dark:bg-slate-900 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
      )}
    >

      {/* 快捷按钮 - 悬停时显示 */}
      {onAddToChecklist && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToChecklist();
                  }}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm"
                >
                  <FolderPlus className="w-4 h-4 text-emerald-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>添加到清单</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* 可点击区域 */}
      <div
        onClick={onClick}
        className="cursor-pointer"
      >
        {/* 头部：标题和评分 */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-lg line-clamp-2 transition-colors group-hover:text-blue-600">
            {paper.title}
          </h3>
          {paper.rating ? (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{paper.rating}</span>
            </div>
          ) : null}
        </div>

        {/* 作者和年份 */}
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          {paper.authors.length > 0 ? paper.authors.map(a => a.name).join(', ') : '未知作者'}
          {paper.year && ` · ${paper.year}`}
        </p>

        {/* 期刊/会议 */}
        {paper.publication && (
          <p className="text-xs text-slate-500 mb-2 truncate" title={paper.publication}>
            📄 {paper.publication}
          </p>
        )}

        {/* 分区和影响因子 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {paper.sciQuartile && paper.sciQuartile !== '无' && (
            <Badge className={cn('text-xs', getQuartileColor(paper.sciQuartile))}>
              SCI {paper.sciQuartile}
            </Badge>
          )}
          {paper.casQuartile && paper.casQuartile !== '无' && (
            <Badge className={cn('text-xs', getQuartileColor(paper.casQuartile))}>
              中科院 {paper.casQuartile}
            </Badge>
          )}
          {paper.ccfRank && paper.ccfRank !== '无' && (
            <Badge className="text-xs bg-purple-50 text-purple-700">
              CCF {paper.ccfRank}
            </Badge>
          )}
          {paper.impactFactor && (
            <Badge className="text-xs bg-indigo-50 text-indigo-700">
              IF {paper.impactFactor}
            </Badge>
          )}
        </div>

        {/* 标签 */}
        {paper.tags && paper.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {paper.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* 阅读进度 */}
        {paper.readingPosition !== undefined && paper.readingPosition > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>阅读进度</span>
              <span>{Math.round(paper.readingPosition * 100)}%</span>
            </div>
            <Progress value={paper.readingPosition * 100} className="h-1.5" />
          </div>
        )}

        {/* 底部：状态和优先级 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex gap-2">
            {getStatusBadge(paper.readingStatus)}
            {getPriorityBadge(paper.priority)}
          </div>
          {paper.totalReadingTime ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {Math.round(paper.totalReadingTime / 60)}min
                  </div>
                </TooltipTrigger>
                <TooltipContent>总阅读时长</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      </div>
    </div>
  );
}