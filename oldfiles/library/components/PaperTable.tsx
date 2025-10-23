// app/library/components/PaperTable.tsx
'use client';

import React from 'react';
import { Star, Clock, MoreVertical, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PaperMetadata } from '@/app/types/paper';
import {
  getStatusBadge,
  getPriorityBadge,
  getArticleTypeBadge,
  getQuartileColor,
  TABLE_COLUMNS
} from '../utils/paperHelpers';
import { parseStatusInfo } from '../utils/parseStatusHelper';
import ContextMenuWrapper from './ContextMenu';

interface PaperTableProps {
  papers: PaperMetadata[];
  visibleColumns: Set<string>;
  onPaperClick: (paper: PaperMetadata) => void;
  onEdit: (paper: PaperMetadata) => void;
  onDelete: (paper: PaperMetadata) => Promise<void>;
}

// 未填写提示组件
const EmptyField = ({ label }: { label: string }) => (
  <span className="text-slate-400 dark:text-slate-500 text-xs italic">
    {label}未填写
  </span>
);

export default function PaperTable({
  papers,
  visibleColumns,
  onPaperClick,
  onEdit,
  onDelete,
}: PaperTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* 表头 */}
          <thead className="bg-slate-50 dark:bg-slate-800 border-b sticky top-0 z-10">
            <tr>
              {TABLE_COLUMNS.filter(col => visibleColumns.has(col.key)).map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left p-3 text-sm font-semibold whitespace-nowrap',
                    col.width
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {papers.map((p) => {
              
              return (
                <ContextMenuWrapper
                  key={p.id}
                  paper={p}
                  onViewDetails={() => onPaperClick(p)}
                  onEdit={() => onEdit(p)}
                  onDelete={() => onDelete(p)}
                >
                  <tr
                    onClick={() => onPaperClick(p)}
                    className="relative transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                        {/* 标题列 */}
                        {visibleColumns.has('title') && (
                          <td className="p-3 max-w-md">
                            <div className="font-medium line-clamp-2">{p.title}</div>
                            {p.tags && p.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {p.tags.slice(0, 2).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                        )}

                        {/* 作者列 */}
                        {visibleColumns.has('authors') && (
                          <td className="p-3 max-w-xs">
                            {p.authors && p.authors.length > 0 ? (
                              <div className="truncate text-sm text-slate-600 dark:text-slate-400">
                                {p.authors.map(a => a.name).join(', ')}
                              </div>
                            ) : (
                              <EmptyField label="作者" />
                            )}
                          </td>
                        )}

                        {/* 年份列 */}
                        {visibleColumns.has('year') && (
                          <td className="p-3 text-sm">
                            {p.year ? p.year : <EmptyField label="年份" />}
                          </td>
                        )}

                        {/* 发表刊物列 */}
                        {visibleColumns.has('publication') && (
                          <td className="p-3 max-w-xs">
                            {p.publication ? (
                              <div className="truncate text-sm text-slate-600 dark:text-slate-400">
                                {p.publication}
                              </div>
                            ) : (
                              <EmptyField label="发表刊物" />
                            )}
                          </td>
                        )}

                        {/* 类型列 */}
                        {visibleColumns.has('articleType') && (
                          <td className="p-3">
                            {p.articleType ? (
                              getArticleTypeBadge(p.articleType)
                            ) : (
                              <EmptyField label="类型" />
                            )}
                          </td>
                        )}

                        {/* 分区/分级列 */}
                        {visibleColumns.has('quartile') && (
                          <td className="p-3">
                            {(p.sciQuartile || p.casQuartile || p.ccfRank) ? (
                              <div className="flex flex-col gap-1">
                                {p.sciQuartile && p.sciQuartile !== '无' && (
                                  <Badge className={cn('text-xs w-fit', getQuartileColor(p.sciQuartile))}>
                                    SCI {p.sciQuartile}
                                  </Badge>
                                )}
                                {p.casQuartile && p.casQuartile !== '无' && (
                                  <Badge className={cn('text-xs w-fit', getQuartileColor(p.casQuartile))}>
                                    中科院 {p.casQuartile}
                                  </Badge>
                                )}
                                {p.ccfRank && p.ccfRank !== '无' && (
                                  <Badge className="text-xs w-fit bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                    CCF {p.ccfRank}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <EmptyField label="分区" />
                            )}
                          </td>
                        )}

                        {/* 影响因子列 */}
                        {visibleColumns.has('impactFactor') && (
                          <td className="p-3 text-sm">
                            {p.impactFactor ? (
                              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                {p.impactFactor}
                              </span>
                            ) : (
                              <EmptyField label="影响因子" />
                            )}
                          </td>
                        )}

                        {/* 状态列 */}
                        {visibleColumns.has('status') && (
                          <td className="p-3">
                            {p.readingStatus ? (
                              getStatusBadge(p.readingStatus)
                            ) : (
                              <EmptyField label="状态" />
                            )}
                          </td>
                        )}

                        {/* 优先级列 */}
                        {visibleColumns.has('priority') && (
                          <td className="p-3">
                            {p.priority ? (
                              getPriorityBadge(p.priority)
                            ) : (
                              <EmptyField label="优先级" />
                            )}
                          </td>
                        )}

                        {/* 进度列 */}
                        {visibleColumns.has('progress') && (
                          <td className="p-3">
                            {p.readingPosition !== undefined && p.readingPosition > 0 ? (
                              <div className="w-20">
                                <Progress value={p.readingPosition * 100} className="h-2" />
                                <div className="text-xs text-slate-500 mt-0.5 text-center">
                                  {Math.round(p.readingPosition * 100)}%
                                </div>
                              </div>
                            ) : (
                              <EmptyField label="进度" />
                            )}
                          </td>
                        )}

                        {/* 评分列 */}
                        {visibleColumns.has('rating') && (
                          <td className="p-3">
                            {p.rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm">{p.rating}</span>
                              </div>
                            ) : (
                              <EmptyField label="评分" />
                            )}
                          </td>
                        )}

                        {/* 阅读时长列 */}
                        {visibleColumns.has('readingTime') && (
                          <td className="p-3">
                            {p.totalReadingTime && p.totalReadingTime > 0 ? (
                              <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {Math.round(p.totalReadingTime / 60)}min
                              </div>
                            ) : (
                              <EmptyField label="阅读时长" />
                            )}
                          </td>
                        )}

                        {/* 操作列 */}
                        {visibleColumns.has('actions') && (
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    </ContextMenuWrapper>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}