'use client';

import { FileText, Tag, Globe } from 'lucide-react';
import type { Paper } from '@/types/paper';
import clsx from 'clsx';
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

/** ====== White glow styles (aligned with Dialog/Editor) ====== */
const glowPanel =
  'relative rounded-2xl border border-white/70 bg-white/82 p-6 ' +
  'shadow-[0_18px_42px_rgba(28,45,96,0.14)] backdrop-blur-2xl';

const headerChip =
  'flex items-center justify-center w-11 h-11 rounded-2xl border border-white/70 ' +
  'bg-white/80 shadow-[0_12px_30px_rgba(40,65,138,0.18)] backdrop-blur-xl';

const subCard =
  'relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-5 ' +
  'shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl ' +
  'transition-all duration-300 hover:bg-white/90 hover:shadow-[0_26px_60px_rgba(15,23,42,0.2)]';

const divider = 'border-b border-white/70';
const chipBase = 'rounded-full px-2 py-1 text-xs border border-white/70 bg-white/80 text-[#28418A]';

const editButton =
  'cursor-pointer rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-blue-700';

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

  // 简洁的摘要检查，直接假设 abstract.en 和 abstract.zh 是字符串
  const hasEN = !!abstract?.en?.trim();
  const hasZH = !!abstract?.zh?.trim();
  const kwList = (keywords ?? []).filter(Boolean).map(String);
  const hasKeywords = kwList.length > 0;

  // 是否需要渲染摘要区
  const shouldRenderAbstract = lang === 'both' ? true : hasEN;

  // 仅英文模式且没有英文摘要，同时也没有关键词 -> 不渲染
  if (!shouldRenderAbstract && !hasKeywords) return null;

  return (
    <section
      data-abstract={dataAbstract}
      className={clsx(
        'relative overflow-hidden group',
        glowPanel,
        // 背景柔光层
        'before:content-[""] before:pointer-events-none before:absolute before:-inset-24 before:-z-10 before:bg-white/40 before:blur-3xl',
        className,
      )}
    >
        {/* 头部 */}
        <div className={clsx('mb-5 flex items-center gap-3 pb-4', divider)}>
          <div className={headerChip}>
            <FileText className="h-5 w-5 text-[#28418A]" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">摘要 / Abstract</h3>
        </div>

        {/* 内容 */}
        <div className="relative z-10">
          {/* Abstract */}
          {shouldRenderAbstract && (
            <div className={clsx(hasKeywords && 'mb-8', 'space-y-6')}>
              {/* English */}
              {(lang === 'both' || lang === 'en') && hasEN && (
                <article className={subCard}>
                  {lang === 'both' && (
                    <div className="mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-[#28418A]" />
                      <h4 className="text-sm font-semibold text-slate-700">English</h4>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-slate-800">{String(abstract!.en || '')}</p>
                </article>
              )}

              {/* 中文（仅双语模式；未配置时提示） */}
              {lang === 'both' && (
                <article className={subCard}>
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#28418A]" />
                    <h4 className="text-sm font-semibold text-slate-700">中文</h4>
                  </div>
                  {hasZH ? (
                    <p className="text-sm leading-relaxed text-slate-800">{String(abstract!.zh || '')}</p>
                  ) : (
                    <p className="text-sm leading-relaxed italic text-slate-500">未配置中文</p>
                  )}
                </article>
              )}
            </div>
          )}

          {/* Keywords */}
          {hasKeywords && (
            <>
              <div className={clsx('mb-4 flex items-center gap-3 pb-3', divider)}>
                <div className={headerChip}>
                  <Tag className="h-5 w-5 text-[#28418A]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">关键词 / Keywords</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {kwList.map((keyword, index) => (
                  <Badge
                    key={`keyword-${index}-${keyword}`}
                    variant="outline"
                    className={clsx(
                      chipBase,
                      'shadow-[0_10px_22px_rgba(15,23,42,0.15)] hover:bg-white/90 transition',
                      'flex items-center gap-1 pr-3',
                    )}
                    title={keyword}
                  >
                    <Tag className="h-3 w-3" />
                    {keyword}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 右上角编辑按钮（悬浮显示） */}
        <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 z-10">
          {allowEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEditRequest?.();
              }}
              className={editButton}
              aria-label="编辑摘要与关键词"
            >
              编辑
            </button>
          )}
        </div>
      </section>
  );
}
