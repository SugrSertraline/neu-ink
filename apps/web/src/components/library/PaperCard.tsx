import React from 'react';
import {
  FileText,
  Trash2,
  Plus,
  Calendar,
  BookOpen,
  Award,
  NotebookPen,
  Bookmark,
} from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
  import { Button } from '@/components/ui/button';
import { type PaperListItem, type Author } from '@/types/paper';

interface PersonalMeta {
  readingStatus?: 'unread' | 'reading' | 'finished';
  priority?: 'high' | 'medium' | 'low';
  customTags?: string[];
  noteCount?: number;
}

interface PaperCardProps {
  paper: PaperListItem;
  onClick: () => void;
  onDelete?: () => void;
  onAddToLibrary?: () => void;
  onRemoveFromLibrary?: () => void;
  showLoginRequired?: boolean;
  personalMeta?: PersonalMeta;
  isAdmin?: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'parsing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'parsing':
      return '解析中';
    case 'pending':
      return '等待中';
    case 'failed':
      return '失败';
    default:
      return '未知';
  }
}

const READ_STATUS_LABEL: Record<'unread' | 'reading' | 'finished', string> = {
  unread: '未开始',
  reading: '阅读中',
  finished: '已完成',
};

const PRIORITY_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

const PRIORITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

export default function PaperCard({
  paper,
  onClick,
  onDelete,
  onAddToLibrary,
  onRemoveFromLibrary,
  showLoginRequired = false,
  personalMeta,
  isAdmin = false,
}: PaperCardProps) {
  const authors = paper.authors
    .slice(0, 3)
    .map((author: Author) => author.name)
    .join(', ');
  const hasMoreAuthors = paper.authors.length > 3;
  const authorsDisplay = hasMoreAuthors ? `${authors} 等` : authors;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          onClick={onClick}
          className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
        >
          {paper.parseStatus && (
            <div className="absolute right-3 top-3">
              <Badge
                variant="secondary"
                className={`text-xs ${getStatusColor(paper.parseStatus.status)}`}
              >
                {getStatusText(paper.parseStatus.status)}
              </Badge>
            </div>
          )}

          <h3 className="mb-2 line-clamp-2 pr-20 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {paper.title}
          </h3>

          <p className="mb-3 line-clamp-1 text-xs text-gray-600 dark:text-gray-400">
            {authorsDisplay || '未知作者'}
            {paper.year && <span> • {paper.year}</span>}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {isAdmin && (
              <Badge
                variant="outline"
                className={`text-xs font-medium ${
                  paper.isPublic
                    ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800/40 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {paper.isPublic ? '对外展示' : '暂不展示'}
              </Badge>
            )}
            {paper.sciQuartile && paper.sciQuartile !== '无' && (
              <Badge
                variant="outline"
                className="text-xs font-medium text-red-600 dark:text-red-400"
              >
                SCI {paper.sciQuartile}
              </Badge>
            )}
            {paper.casQuartile && paper.casQuartile !== '无' && (
              <Badge
                variant="outline"
                className="text-xs font-medium text-orange-600 dark:text-orange-400"
              >
                CAS {paper.casQuartile}
              </Badge>
            )}
            {paper.ccfRank && paper.ccfRank !== '无' && (
              <Badge
                variant="outline"
                className="text-xs font-medium text-purple-600 dark:text-purple-400"
              >
                CCF {paper.ccfRank}
              </Badge>
            )}
            {paper.impactFactor && (
              <Badge
                variant="outline"
                className="text-xs font-medium text-blue-600 dark:text-blue-400"
              >
                IF {paper.impactFactor.toFixed(2)}
              </Badge>
            )}
          </div>

          {personalMeta && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {personalMeta.readingStatus && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <Bookmark className="h-3 w-3" />
                  {READ_STATUS_LABEL[personalMeta.readingStatus]}
                </span>
              )}
              {personalMeta.priority && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLOR[personalMeta.priority]}`}
                >
                  {PRIORITY_LABEL[personalMeta.priority]}
                </span>
              )}
              {typeof personalMeta.noteCount === 'number' && personalMeta.noteCount >= 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  <NotebookPen className="h-3 w-3" />
                  笔记 {personalMeta.noteCount}
                </span>
              )}
              {personalMeta.customTags && personalMeta.customTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {personalMeta.customTags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    >
                      #{tag}
                    </span>
                  ))}
                  {personalMeta.customTags.length > 3 && (
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      +{personalMeta.customTags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {(onDelete || onAddToLibrary || onRemoveFromLibrary || showLoginRequired) && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
              {showLoginRequired && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  登录后查看详情
                </span>
              )}
              {onAddToLibrary && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={event => {
                    event.stopPropagation();
                    onAddToLibrary();
                  }}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  添加到我的论文库
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={event => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  删除
                </Button>
              )}
              {onRemoveFromLibrary && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={event => {
                    event.stopPropagation();
                    onRemoveFromLibrary();
                  }}
                  className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/20"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  从个人库删除
                </Button>
              )}
            </div>
          )}
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-96" side="top" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
              {paper.title}
            </h4>
            {paper.titleZh && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{paper.titleZh}</p>
            )}
          </div>

          {paper.authors.length > 0 && (
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">作者</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {paper.authors.map((author: Author) => author.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {(paper.publication || paper.date) && (
            <div className="flex items-start gap-2">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">发表信息</p>
                {paper.publication && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{paper.publication}</p>
                )}
                {paper.date && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">{paper.date}</p>
                )}
              </div>
            </div>
          )}

          {(paper.sciQuartile || paper.casQuartile || paper.ccfRank || paper.impactFactor) && (
            <div className="flex items-start gap-2">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <div className="flex-1">
                <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">评级信息</p>
                <div className="flex flex-wrap gap-1.5">
                  {paper.sciQuartile && paper.sciQuartile !== '无' && (
                    <Badge variant="secondary" className="text-xs">
                      SCI {paper.sciQuartile}
                    </Badge>
                  )}
                  {paper.casQuartile && paper.casQuartile !== '无' && (
                    <Badge variant="secondary" className="text-xs">
                      CAS {paper.casQuartile}
                    </Badge>
                  )}
                  {paper.ccfRank && paper.ccfRank !== '无' && (
                    <Badge variant="secondary" className="text-xs">
                      CCF {paper.ccfRank}
                    </Badge>
                  )}
                  {paper.impactFactor && (
                    <Badge variant="secondary" className="text-xs">
                      影响因子: {paper.impactFactor.toFixed(3)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-start gap-2">
              <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">展示状态</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {paper.isPublic ? '当前对所有访客可见' : '仅管理员可见，尚未公开'}
                </p>
              </div>
            </div>
          )}

          {paper.articleType && (
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">文章类型</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{paper.articleType}</p>
              </div>
            </div>
          )}

          {paper.doi && (
            <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">DOI</p>
              <p className="break-all text-xs text-gray-600 dark:text-gray-400">{paper.doi}</p>
            </div>
          )}

          {paper.tags && paper.tags.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">标签</p>
              <div className="flex flex-wrap gap-1">
                {paper.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
