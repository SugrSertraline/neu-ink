'use client';

import { FileText, Tag } from 'lucide-react';
import type { Paper } from '@/types/paper';
import clsx from 'clsx';

type DisplayLang = 'en' | 'both';

interface AbstractAndKeywordsProps {
  abstract?: Paper['abstract'];
  keywords?: Paper['keywords'];
  className?: string;
  lang?: DisplayLang;
}

export default function AbstractAndKeywords({
  abstract,
  keywords,
  className,
  lang = 'both',
}: AbstractAndKeywordsProps) {
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
    <section
      className={clsx(
        'rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      {/* Abstract */}
      {shouldRenderAbstract && (
        <div className={clsx(hasKeywords && 'mb-6')}>
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              摘要 / Abstract
            </h3>
          </div>

          <div
            className={clsx(
              'grid gap-4',
              'grid-cols-1',
            )}
          >
            {/* English（仅在需要展示且有英文内容时渲染） */}
            {(lang === 'both' || lang === 'en') && hasEN && (
              <article className="rounded-lg border border-transparent p-2">
                {lang === 'both' && (
                  <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    English
                  </h4>
                )}
                <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                  {abstract!.en}
                </p>
              </article>
            )}

            {/* 中文（仅在双语模式下渲染；未配置则提示“未配置中文”） */}
            {lang === 'both' && (
              <article className="rounded-lg border border-transparent p-2">
                <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                  中文
                </h4>
                {hasZH ? (
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                    {abstract!.zh}
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-400 italic dark:text-slate-500">
                    未配置中文
                  </p>
                )}
              </article>
            )}
          </div>
        </div>
      )}

      {/* Keywords */}
      {hasKeywords && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-5 w-5 shrink-0 text-gray-500 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              关键词 / Keywords
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {kwList.map((keyword, index) => (
              <span
                key={`keyword-${index}-${keyword}`}
                className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                title={keyword}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
