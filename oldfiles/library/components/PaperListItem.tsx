// app/library/components/PaperListItem.tsx
'use client';

import React from 'react';
import { Star, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PaperMetadata } from '@/app/types/paper';
import { getStatusBadge, getQuartileColor } from '../utils/paperHelpers';
import { parseStatusInfo } from '../utils/parseStatusHelper';

interface PaperListItemProps {
  paper: PaperMetadata;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export default function PaperListItem({ 
  paper, 
  onClick, 
  onContextMenu,
}: PaperListItemProps) {
  // 解析状态信息
  const statusInfo = parseStatusInfo(paper.parseStatus, paper.remarks);
    
  
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="relative flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
    >

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-medium line-clamp-2 flex-1">{paper.title}</h4>
          {paper.rating && (
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{paper.rating}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span className="truncate">
            {paper.authors.length > 0 ? paper.authors.map(a => a.name).join(', ') : '未知作者'}
          </span>
          {paper.year && <span>· {paper.year}</span>}
          {paper.publication && (
            <>
              <span>·</span>
              <span className="truncate">{paper.publication}</span>
            </>
          )}
        </div>
        
        {/* 标签和分区 */}
        <div className="flex flex-wrap gap-2">
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
          {paper.tags && paper.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* 右侧状态 */}
      <div className="flex flex-col gap-2 shrink-0">
        {getStatusBadge(paper.readingStatus)}
        {paper.priority && paper.priority !== 'medium' && (
          <Badge className={cn(
            'text-xs',
            paper.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'
          )}>
            {paper.priority === 'high' ? '高优先级' : '低优先级'}
          </Badge>
        )}
      </div>
    </div>
  );
}