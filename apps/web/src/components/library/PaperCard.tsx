import React from 'react';
import { FileText, Trash2, Plus, Calendar, BookOpen, Award } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PaperListItem, type Author } from '@/types/paper';

interface PaperCardProps {
  paper: PaperListItem;
  onClick: () => void;
  onDelete?: () => void;
  onAddToLibrary?: () => void;
  showLoginRequired?: boolean;
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

export default function PaperCard({
  paper,
  onClick,
  onDelete,
  onAddToLibrary,
  showLoginRequired = false,
}: PaperCardProps) {
  const authors = paper.authors.slice(0, 3).map((author: Author) => author.name).join(', ');
  const hasMoreAuthors = paper.authors.length > 3;
  const authorsDisplay = hasMoreAuthors ? `${authors} 等` : authors;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div
          onClick={onClick}
          className="group relative cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
        >
          {/* 状态标签 */}
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

          {/* 标题 */}
          <h3 className="mb-2 line-clamp-2 pr-20 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {paper.title}
          </h3>

          {/* 作者和年份 */}
          <p className="mb-3 line-clamp-1 text-xs text-gray-600 dark:text-gray-400">
            {authorsDisplay || '未知作者'}
            {paper.year && <span> • {paper.year}</span>}
          </p>

          {/* 标签区域 */}
          <div className="flex flex-wrap gap-1.5">
            {paper.sciQuartile && paper.sciQuartile !== '无' && (
              <Badge variant="outline" className="text-xs font-medium text-red-600 dark:text-red-400">
                SCI {paper.sciQuartile}
              </Badge>
            )}
            {paper.casQuartile && paper.casQuartile !== '无' && (
              <Badge variant="outline" className="text-xs font-medium text-orange-600 dark:text-orange-400">
                CAS {paper.casQuartile}
              </Badge>
            )}
            {paper.ccfRank && paper.ccfRank !== '无' && (
              <Badge variant="outline" className="text-xs font-medium text-purple-600 dark:text-purple-400">
                CCF {paper.ccfRank}
              </Badge>
            )}
            {paper.impactFactor && (
              <Badge variant="outline" className="text-xs font-medium text-blue-600 dark:text-blue-400">
                IF {paper.impactFactor.toFixed(2)}
              </Badge>
            )}
          </div>

          {/* 操作按钮 */}
          {(onDelete || onAddToLibrary || showLoginRequired) && (
            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
              {showLoginRequired && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  登录后查看详情
                </span>
              )}
              {onAddToLibrary && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  删除
                </Button>
              )}
            </div>
          )}
        </div>
      </HoverCardTrigger>

      <HoverCardContent className="w-96" side="top" align="start">
        <div className="space-y-3">
          {/* 完整标题 */}
          <div>
            <h4 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
              {paper.title}
            </h4>
            {paper.titleZh && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{paper.titleZh}</p>
            )}
          </div>

          {/* 作者列表 */}
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

          {/* 发表信息 */}
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

          {/* 评级信息 */}
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

          {/* 文章类型 */}
          {paper.articleType && (
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">文章类型</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{paper.articleType}</p>
              </div>
            </div>
          )}

          {/* DOI */}
          {paper.doi && (
            <div className="rounded-md bg-gray-50 p-2 dark:bg-gray-800">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">DOI</p>
              <p className="break-all text-xs text-gray-600 dark:text-gray-400">{paper.doi}</p>
            </div>
          )}

          {/* 标签 */}
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