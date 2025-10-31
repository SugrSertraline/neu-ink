'use client';

import React, { JSX } from 'react';

type Title = { en?: string; zh?: string };
export type SectionLike = {
  id: string;
  title: Title;
  subsections?: SectionLike[];
};

type Lang = 'en' | 'zh' | 'both';

function titleForLang(t: Title, lang: Lang): string {
  const en = (t?.en ?? '').trim();
  const zh = (t?.zh ?? '').trim();
  if (lang === 'both') return [en, zh].filter(Boolean).join(' / ') || 'Untitled';
  if (lang === 'zh') return zh || en || 'Untitled';
  return en || zh || 'Untitled';
}

export default function CenterAnchors({
  sections,
  lang = 'en',
}: {
  sections: SectionLike[];
  lang?: Lang;
}) {
  return (
    <div className="max-w-5xl mx-auto p-8">
      {sections.map((sec) => (
        <SectionNode key={sec.id} node={sec} lang={lang} depth={0} />
      ))}
    </div>
  );
}

function SectionNode({ node, lang, depth }: { node: SectionLike; lang: Lang; depth: number }) {
  const isRoot = depth === 0;
  const HeadingTag = (isRoot ? 'h2' : 'h3') as keyof JSX.IntrinsicElements;

  return (
    <section data-center-anchor={node.id} className="mb-8 scroll-mt-24">
      <HeadingTag
        className={[
          isRoot ? 'text-xl font-semibold' : 'text-lg font-medium',
          'text-slate-800 dark:text-slate-100 mb-3',
        ].join(' ')}
      >
        {titleForLang(node.title, lang)}
      </HeadingTag>

      <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-slate-500">
        Section editor placeholder (id: {node.id})
      </div>

      {(node.subsections ?? []).map((sub) => (
        <div
          key={sub.id}
          data-center-anchor={sub.id}
          className="mt-6 ml-4 border-l pl-4 border-slate-200 dark:border-slate-700"
        >
          <h4 className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2">
            {titleForLang(sub.title, lang)}
          </h4>
          <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-700 p-4 text-slate-500">
            Subsection editor placeholder (id: {sub.id})
          </div>

          {/* 如果以后支持多层，再递归调用 SectionNode，这里先一层以免动面扩大 */}
          {(sub.subsections ?? []).length > 0 && (
            <div className="mt-4">
              {sub.subsections!.map((sub2) => (
                <SectionNode key={sub2.id} node={sub2} lang={lang} depth={depth + 2} />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
