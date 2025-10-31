'use client';

import React, { useMemo, useState } from 'react';

// Minimal shape from your model
type Title = { en?: string; zh?: string };
export type SectionLike = { id: string; title: Title; subsections?: SectionLike[] };

type Lang = 'en' | 'zh' | 'both';

function titleForLang(t: Title, lang: Lang): string {
  const en = (t?.en ?? '').trim();
  const zh = (t?.zh ?? '').trim();
  if (lang === 'both') return [en, zh].filter(Boolean).join(' / ') || 'Untitled';
  if (lang === 'zh') return zh || en || 'Untitled';
  return en || zh || 'Untitled';
}

export default function NavigationLite({
  sections,
  lang = 'en',
  activeId,
  onSelect,
}: {
  sections: SectionLike[];
  lang?: Lang;
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const nodes = useMemo(() => sections ?? [], [sections]);
  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const renderNode = (node: SectionLike, depth = 0) => {
    const hasChildren = !!(node.subsections && node.subsections.length);
    const isOpen = expanded[node.id] ?? true; // default open on first render
    const isActive = activeId === node.id;

    return (
      <div key={node.id}>
        <div
          className={[
            'group flex items-center gap-2 py-1.5 px-2 rounded-md',
            'hover:bg-slate-100 dark:hover:bg-slate-800',
            isActive ? 'bg-blue-50 dark:bg-slate-800/80' : '',
          ].join(' ')}
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="h-5 w-5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              title={isOpen ? '折叠' : '展开'}
            >
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="h-5 w-5" />
          )}

          <button
            type="button"
            onClick={() => onSelect?.(node.id)}
            className={[
              'flex-1 text-left text-sm truncate',
              isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200',
            ].join(' ')}
            title={titleForLang(node.title, lang)}
          >
            {titleForLang(node.title, lang)}
          </button>
        </div>

        {hasChildren && isOpen && (
          <div className="transition-all">
            {node.subsections!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {nodes.length ? nodes.map((n) => renderNode(n, 0)) : (
        <div className="text-sm text-slate-500 px-2 py-3">No sections</div>
      )}
    </div>
  );
}
