'use client';

import { FileText, Tag, Globe } from 'lucide-react';
import type { Paper } from '@/types/paper';
import clsx from 'clsx';
import { AbstractAndKeywordsContextMenu } from './PaperContextMenus';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { Badge } from '@/components/ui/badge';

type DisplayLang = 'en' | 'both';

interface AbstractAndKeywordsProps {
  abstract?: Paper['abstract'];
  keywords?: Paper['keywords'];
  className?: string;
  lang?: DisplayLang;
  onEditRequest?: () => void;
  'data-abstract'?: string;
}

export default function AbstractAndKeywords({
  abstract,
  keywords,
  className,
  lang = 'both',
  onEditRequest,
  'data-abstract': dataAbstract,
}: AbstractAndKeywordsProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  const allowEdit = canEditContent && Boolean(onEditRequest);
  const hasEN = !!abstract?.en?.trim();
  const hasZH = !!abstract?.zh?.trim();
  const kwList = (keywords ?? []).filter(Boolean).map(String);
  const hasKeywords = kwList.length > 0;

  // 是否需要渲染摘要区：
  // - 双语：始终渲染（中文未配置要提示）
  // - 仅英文：只有英文存在才渲染
  const shouldRenderAbstract = lang === 'both' ? true : hasEN;

  // 如果仅英文模式且没有英文摘要，同时也没有关键词，则整体不渲染
  if (!shouldRenderAbstract && !hasKeywords) return null;

  return (
    <AbstractAndKeywordsContextMenu onEdit={allowEdit ? onEditRequest : undefined}>
      <section
        data-abstract={dataAbstract}
        className={clsx(
          'relative overflow-hidden rounded-2xl border border-white/45 bg-gradient-to-tr from-white/30 via-white/15 to-white/35 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-[18px] transition-all duration-300 hover:shadow-[0_40px_80px_rgba(15,23,42,0.25)] dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/45 dark:to-slate-900/55',
          className,
        )}
      >
        <div className="relative z-10">
          {/* Abstract */}
          {shouldRenderAbstract && (
            <div className={clsx(hasKeywords && 'mb-8')}>
              <div className="mb-4 flex items-center gap-3 border-b border-white/20 pb-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl border border-white/45 bg-white/40 shadow-[0_16px_32px_rgba(37,99,235,0.25)] backdrop-blur-xl dark:border-slate-700/45 dark:bg-slate-800/50">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  摘要 / Abstract
                </h3>
              </div>

              <div className="space-y-6">
                {/* English（仅在需要展示且有英文内容时渲染） */}
                {(lang === 'both' || lang === 'en') && hasEN && (
                  <article className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-lg transition-all duration-300 hover:bg-white/45 hover:shadow-[0_26px_60px_rgba(15,23,42,0.2)] dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:bg-slate-800/55">
                    <div className="relative z-10">
                      {lang === 'both' && (
                        <div className="mb-3 flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            English
                          </h4>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {abstract!.en}
                      </p>
                    </div>
                  </article>
                )}

                {/* 中文（仅在双语模式下渲染；未配置则提示"未配置中文"） */}
                {lang === 'both' && (
                  <article className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-lg transition-all duration-300 hover:bg-white/45 hover:shadow-[0_26px_60px_rgba(15,23,42,0.2)] dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:bg-slate-800/55">
                    <div className="relative z-10">
                      <div className="mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          中文
                        </h4>
                      </div>
                      {hasZH ? (
                        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                          {abstract!.zh}
                        </p>
                      ) : (
                        <p className="text-sm leading-relaxed text-gray-500 italic dark:text-gray-400">
                          未配置中文
                        </p>
                      )}
                    </div>
                  </article>
                )}
              </div>
            </div>
          )}

          {/* Keywords */}
          {hasKeywords && (
            <div>
              <div className="mb-4 flex items-center gap-3 border-b border-white/20 pb-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl border border-white/45 bg-white/40 shadow-[0_16px_32px_rgba(168,85,247,0.25)] backdrop-blur-xl dark:border-slate-700/45 dark:bg-slate-800/50">
                  <Tag className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  关键词 / Keywords
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {kwList.map((keyword, index) => (
                  <Badge
                    key={`keyword-${index}-${keyword}`}
                    variant="secondary"
                    className="relative overflow-hidden rounded-full border border-white/40 bg-white/30 px-3 py-1.5 text-xs font-medium text-gray-800 shadow-[0_10px_22px_rgba(15,23,42,0.15)] backdrop-blur-lg transition-all duration-300 hover:bg-white/45 hover:shadow-[0_14px_32px_rgba(15,23,42,0.18)] dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-gray-200 dark:hover:bg-slate-800/55"
                    title={keyword}
                  >
                    <span className="relative z-10 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {keyword}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </AbstractAndKeywordsContextMenu>
  );
}
