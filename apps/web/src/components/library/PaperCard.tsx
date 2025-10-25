'use client';

import React from 'react';
import { Star, Clock, FolderPlus, Loader2, AlertCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PaperListItem } from '@/types/paper';
import { useAuth } from '@/contexts/AuthContext';

interface PaperCardProps {
  paper: PaperListItem;
  onClick: () => void | Promise<void>;
  onEdit?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onAddToLibrary?: () => void | Promise<void>;
  showLoginRequired?: boolean;
}

// 获取状态徽章
function getStatusBadge(status?: string) {
  switch (status) {
    case 'unread':
      return <Badge variant="outline" className="bg-gray-50 text-gray-600">未读</Badge>;
    case 'reading':
      return <Badge variant="outline" className="bg-blue-50 text-blue-600">阅读中</Badge>;
    case 'finished':
      return <Badge variant="outline" className="bg-green-50 text-green-600">已完成</Badge>;
    default:
      return null;
  }
}

// 获取优先级徽章
function getPriorityBadge(priority?: string) {
  switch (priority) {
    case 'high':
      return <Badge variant="outline" className="bg-red-50 text-red-600">高</Badge>;
    case 'medium':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-600">中</Badge>;
    case 'low':
      return <Badge variant="outline" className="bg-green-50 text-green-600">低</Badge>;
    default:
      return null;
  }
}

// 获取分区颜色
function getQuartileColor(quartile: string) {
  switch (quartile) {
    case 'Q1':
    case '1区':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Q2':
    case '2区':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Q3':
    case '3区':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Q4':
    case '4区':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default function PaperCard({
  paper,
  onClick,
  onEdit,
  onDelete,
  onAddToLibrary,
  showLoginRequired = false,
}: PaperCardProps) {
  const { isAdmin } = useAuth();
  const guard =
    (fn?: () => void | Promise<void>) =>
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (showLoginRequired) return; // 未登录时直接拦截
        await fn?.();
      };
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-gray-200 dark:border-gray-700 p-5 transition-all duration-300 bg-white dark:bg-gray-800 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* 快捷按钮 - 悬停时显示 */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        {onAddToLibrary && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={guard(onAddToLibrary)} // ✅ 使用 guard
                  className="h-8 w-8 p-0"
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showLoginRequired ? '请先登录后使用' : '添加到个人库'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {onEdit && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={guard(onEdit)} // ✅
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLoginRequired ? '请先登录后使用' : '编辑'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}


        {onDelete && isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={guard(onDelete)} // ✅
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showLoginRequired ? '请先登录后使用' : '删除'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* 头部：标题和状态 */}
      <div className="flex items-start justify-between gap-3 mb-3 pr-16">
        <h3 className="font-semibold text-lg line-clamp-2 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {paper.title}
        </h3>
        {paper.parseStatus && paper.parseStatus.status === 'parsing' && (
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 shrink-0" />
        )}
        {paper.parseStatus && paper.parseStatus.status === 'failed' && (
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        )}
      </div>

      {/* 作者和年份 */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {paper.authors && paper.authors.length > 0
          ? paper.authors.map(a => a.name).join(', ')
          : '未知作者'}
        {paper.year && ` · ${paper.year}`}
      </p>

      {/* 期刊/会议 */}
      {paper.publication && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-2 truncate" title={paper.publication}>
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
          <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200">
            CCF {paper.ccfRank}
          </Badge>
        )}
        {paper.impactFactor && (
          <Badge className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
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
          {paper.tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{paper.tags.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* 阅读进度（如果有个人数据） */}
      {paper.readingPosition !== undefined && paper.readingPosition > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>阅读进度</span>
            <span>{Math.round(paper.readingPosition * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${paper.readingPosition * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 底部：状态和优先级 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex gap-2">
          {getStatusBadge(paper.readingStatus)}
          {getPriorityBadge(paper.priority)}
        </div>
        {paper.totalReadingTime && paper.totalReadingTime > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  {Math.round(paper.totalReadingTime / 60)}min
                </div>
              </TooltipTrigger>
              <TooltipContent>总阅读时长</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}