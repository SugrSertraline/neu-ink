import React from 'react';
import type { Section, BlockContent } from '@/types/paper';
import { SectionContextMenu } from '../PaperContext';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditorStore } from '@/store/editor/editorStore';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

interface PaperSectionProps {
  section: Section;
  numberedSection: Section;
  sectionNumber: string;
  path: number[];
  siblings: Section[];
  index: number;
  parentSectionId: string | null;
  searchQuery: string;
  canEditContent: boolean;
  renamingSectionId: string | null;
  hoveredSectionId: string | null;
  isRenaming: boolean;
  isFirstSibling: boolean;
  isLastSibling: boolean;
  
  // Callbacks
  onSectionEditStart: (sectionId: string) => void;
  onSectionInsert: (targetSectionId: string | null, position: 'above' | 'below', parentSectionId: string | null) => void;
  onSectionMove: (sectionId: string, direction: 'up' | 'down', parentSectionId: string | null) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionAddBlock: (sectionId: string, type: BlockContent['type']) => void;
  onStartTextParse: (sectionId: string) => void;
  onQuickTranslate: (sectionId: string, title: string) => void;
  onSectionRenameConfirm: (sectionId: string, title: { en: string; zh: string }) => void;
  setRenamingSectionId: (id: string | null) => void;
  setHoveredSectionId: (id: string | null) => void;
  setTranslationResult: (result: { sectionId: string; translatedText: string } | null) => void;
  translationResult: { sectionId: string; translatedText: string } | null;
  lang: 'en' | 'both';
  
  // Children
  children: React.ReactNode;
  sectionTitleEditor?: React.ReactNode;
}

export function PaperSection({
  section,
  numberedSection,
  sectionNumber,
  path,
  siblings,
  index,
  parentSectionId,
  searchQuery,
  canEditContent,
  renamingSectionId,
  hoveredSectionId,
  isRenaming,
  isFirstSibling,
  isLastSibling,
  onSectionEditStart,
  onSectionInsert,
  onSectionMove,
  onSectionDelete,
  onSectionAddBlock,
  onStartTextParse,
  onQuickTranslate,
  onSectionRenameConfirm,
  setRenamingSectionId,
  setHoveredSectionId,
  setTranslationResult,
  translationResult,
  lang,
  children,
  sectionTitleEditor,
}: PaperSectionProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const hasZhTitle = !!numberedSection.titleZh?.trim();
  const normalizedZh = (numberedSection.titleZh ?? '').trim();
  const sectionMargin = Math.max(0, (path.length - 1) * 24);

  // 高亮文本函数
  const highlightText = (text: string, query: string): React.ReactNode => {
    const q = query.trim();
    if (!q) return text;
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return text.split(re).map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-white">
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  };

  return (
    <>
      {/* 确认对话框组件 */}
      <ConfirmDialog />
      
      <section
        key={numberedSection.id}
        id={numberedSection.id}
        className="relative overflow-hidden rounded-2xl border border-white/45 bg-linear-to-tr from-white/30 via-white/15 to-white/35 p-6 shadow-[0_30px_60px_rgba(15,23,42,0.18)] backdrop-blur-[18px] transition-all duration-300 dark:border-white/10 dark:from-slate-900/60 dark:via-slate-900/45 dark:to-slate-900/55 space-y-4"
        style={{ marginLeft: sectionMargin }}
      >
      <SectionContextMenu
        onRename={canEditContent ? () => onSectionEditStart(numberedSection.id) : undefined}
        onAddSectionBefore={
          canEditContent && onSectionInsert
            ? () => onSectionInsert(numberedSection.id, 'above', parentSectionId)
            : undefined
        }
        onAddSectionAfter={
          canEditContent && onSectionInsert
            ? () => onSectionInsert(numberedSection.id, 'below', parentSectionId)
            : undefined
        }
        onAddBlock={
          canEditContent && onSectionAddBlock
            ? (type: BlockContent['type']) => onSectionAddBlock(numberedSection.id, type)
            : undefined
        }
        onStartTextParse={canEditContent ? () => onStartTextParse(numberedSection.id) : undefined}
        onQuickTranslate={canEditContent ? () => onQuickTranslate(numberedSection.id, String(numberedSection.title)) : undefined}
        onMoveUp={
          canEditContent && !!onSectionMove && !isFirstSibling
            ? () => onSectionMove(numberedSection.id, 'up', parentSectionId)
            : undefined
        }
        onMoveDown={
          canEditContent && !!onSectionMove && !isLastSibling
            ? () => onSectionMove(numberedSection.id, 'down', parentSectionId)
            : undefined
        }
        onDelete={
          canEditContent
            ? async () => {
                console.log('【步骤1】开始删除章节流程:', numberedSection.id);
                console.log('【步骤1.1】canEditContent:', canEditContent);
                console.log('【步骤1.2】onSectionDelete函数:', typeof onSectionDelete);
                console.log('【步骤1.3】准备调用confirm函数');
                console.log('【步骤1.4】confirm函数对象:', confirm);
                console.log('【步骤1.5】confirm函数类型:', typeof confirm);
                
                const confirmed = await confirm({
                  title: '删除章节',
                  description: '确定删除该章节及其所有内容吗？此操作不可撤销。',
                  confirmText: '删除',
                  cancelText: '取消',
                  variant: 'destructive',
                  onConfirm: async () => {
                    console.log('【步骤2.1】用户点击确认删除章节, sectionId:', numberedSection.id);
                    // 注意：这里的逻辑会在confirm返回true之前执行
                    // 这是useConfirmDialog的工作方式
                  }
                });
                
                console.log('【步骤3】用户确认结果:', confirmed);
                
                // 只有在用户确认的情况下才执行删除操作
                if (confirmed) {
                  console.log('【步骤4】用户确认删除，现在执行删除操作');
                  onSectionDelete?.(numberedSection.id);
                  console.log('【步骤5】onSectionDelete函数已调用');
                  if (renamingSectionId === numberedSection.id) {
                    console.log('【步骤6】清除重命名状态');
                    setRenamingSectionId(null);
                  }
                } else {
                  console.log('【步骤7】用户取消删除');
                }
              }
            : undefined
        }
      >
        <div
          className={`flex items-baseline gap-3 flex-wrap cursor-context-menu rounded-md transition-colors ${hoveredSectionId === section.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
          onMouseEnter={() => setHoveredSectionId(section.id)}
          onMouseLeave={() => setHoveredSectionId(null)}
        >
          <span className="text-blue-600 dark:text-blue-400 text-2xl font-bold">{sectionNumber}.</span>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-baseline gap-3">
            <span>{highlightText(String(numberedSection.title ?? ''), searchQuery)}</span>
            <span className="text-gray-400 mx-1">/</span>
            {hasZhTitle ? (
              <span className="rounded px-1 bg-gray-50 text-gray-700">
                {highlightText(String(normalizedZh), searchQuery)}
              </span>
            ) : (
              <span className="rounded px-1 bg-gray-100 text-gray-500 italic">
                该标题组件未配置中文
              </span>
            )}
          </h2>
        </div>
      </SectionContextMenu>


      {isRenaming && sectionTitleEditor}

      <div className="space-y-4">
        {children}
      </div>
    </section>
    </>
  );
}