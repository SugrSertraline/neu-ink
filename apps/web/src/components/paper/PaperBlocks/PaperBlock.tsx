import React, { Suspense } from 'react';
import type { BlockContent, Reference } from '@/types/paper';
import { BlockContextMenu } from '../PaperContext';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { useEditorStore } from '@/store/editor/editorStore';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import BlockRenderer from '../BlockRenderer';

// 将动态导入移到组件外部，避免每次渲染都重新创建
const BlockEditorComponent = React.lazy(() => import('../editor/BlockEditor'));

interface PaperBlockProps {
  block: BlockContent;
  sectionId: string;
  sectionTitle: string;
  blockIndex: number;
  totalBlocks: number;
  searchQuery: string;
  references: Reference[];
  canEditContent: boolean;
  isPersonalOwner?: boolean;
  paperId?: string;
  userPaperId?: string | null;
  activeBlockId: string | null;
  selectedBlockId: string | null;
  contentRef: React.RefObject<HTMLDivElement | null>;
  notesCount?: number;
  lang: 'en' | 'both'; // 添加 lang 属性
  
  // Callbacks
  setActiveBlockId: (id: string | null) => void;
  onBlockClick?: (blockId: string) => void;
  onBlockEditStart: (blockId: string) => void;
  onBlockUpdate: (blockId: string, block: BlockContent) => void;
  onBlockDuplicate: (blockId: string) => void;
  onBlockDelete: (blockId: string) => void;
  onBlockInsert: (blockId: string, position: 'above' | 'below') => void;
  onBlockMove: (blockId: string, direction: 'up' | 'down') => void;
  onBlockAddComponent: (blockId: string, type: BlockContent['type']) => void;
  onStartTextParse: (sectionId: string, blockId: string) => void;
  onAddSectionBelow: (sectionId: string) => void;
  onSaveToServer: (blockId: string, sectionId: string) => Promise<void>;
  onParseComplete: (result: any) => void;
  onParsePreview: (data: any) => void;
  onAddBlockAsSection?: (sectionData: {
    id: string;
    title: string;
    titleZh: string;
    content: any[];
  }) => void;
  onAddHeadingToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    headingBlock: any,
  ) => void;
  onAddParagraphToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    paragraphBlock: any,
  ) => void;
  onAddOrderedListToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    orderedListBlock: any,
  ) => void;
  onAddUnorderedListToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    unorderedListBlock: any,
  ) => void;
  onAddMathToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    mathBlock: any,
  ) => void;
  onAddFigureToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    figureBlock: any,
  ) => void;
  onAddTableToSection?: (
    sectionId: string,
    position: 'start' | 'end',
    tableBlock: any,
  ) => void;
  onCreateSectionWithHeading?: (
    title: string,
    titleZh: string,
    headingBlock: any,
  ) => void;
  allSections: any[];
  streamProgressData?: Record<string, any>;
}

export function PaperBlock({
  block,
  sectionId,
  sectionTitle,
  blockIndex,
  totalBlocks,
  searchQuery,
  references,
  canEditContent,
  isPersonalOwner = false,
  paperId,
  userPaperId,
  activeBlockId,
  selectedBlockId,
  contentRef,
  notesCount = 0,
  lang, // 添加 lang 参数
  setActiveBlockId,
  onBlockClick,
  onBlockEditStart,
  onBlockUpdate,
  onBlockDuplicate,
  onBlockDelete,
  onBlockInsert,
  onBlockMove,
  onBlockAddComponent,
  onStartTextParse,
  onAddSectionBelow,
  onSaveToServer,
  onParseComplete,
  onParsePreview,
  onAddBlockAsSection,
  onAddHeadingToSection,
  onAddParagraphToSection,
  onAddOrderedListToSection,
  onAddUnorderedListToSection,
  onAddMathToSection,
  onAddFigureToSection,
  onAddTableToSection,
  onCreateSectionWithHeading,
  allSections,
  streamProgressData,
}: PaperBlockProps) {
  const { currentEditingId, clearCurrentEditing } = useEditorStore();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const isEditingBlock = currentEditingId === block.id;
  const isSelected = selectedBlockId === block.id;
  const isActive = isSelected || activeBlockId === block.id;

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

  const handleBlockEditStart = async (blockId: string) => {
    if (onBlockEditStart) {
      onBlockEditStart(blockId);
    }
  };

  const handleBlockDelete = async (blockId: string) => {
    const confirmed = await confirm({
      title: '删除内容块',
      description: '确定删除该内容块吗？此操作不可撤销。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
      onConfirm: () => Promise.resolve(),
    });
    if (confirmed) {
      onBlockDelete?.(blockId);
      if (isEditingBlock) clearCurrentEditing();
    }
  };

  // BlockEditorComponent 已移到组件外部

  const blockContent = isEditingBlock ? (
    <React.Suspense fallback={null}>
      <BlockEditorComponent
        block={block}
        onChange={updatedBlock => onBlockUpdate?.(block.id, updatedBlock)}
        onMoveUp={() => onBlockMove?.(block.id, 'up')}
        onMoveDown={() => onBlockMove?.(block.id, 'down')}
        onDelete={() => onBlockDelete?.(block.id)}
        onDuplicate={() => onBlockDuplicate?.(block.id)}
        canMoveUp={blockIndex > 0}
        canMoveDown={blockIndex < totalBlocks - 1}
        references={references}
        allSections={allSections}
        onSaveToServer={async (blockId, sectionId) => {
          if (onSaveToServer) {
            await onSaveToServer(blockId, sectionId);
          }
        }}
      />
    </React.Suspense>
  ) : (
    <Suspense fallback={null}>
      <BlockRenderer
        block={block}
        lang={lang}
        searchQuery={searchQuery}
        isActive={isActive}
        onMouseEnter={() => {
          if (!isEditingBlock) {
            setActiveBlockId(block.id);
          }
        }}
        onMouseLeave={() => {
          if (!isSelected && !isEditingBlock) {
            setActiveBlockId(null);
          }
        }}
        contentRef={contentRef}
        references={references}
        onBlockUpdate={(updatedBlock: BlockContent) => onBlockUpdate?.(block.id, updatedBlock)}
        onSaveToServer={async (blockId: string, sectionId: string) => {
          if (onSaveToServer) {
            await onSaveToServer(blockId, sectionId);
          }
        }}
        notesCount={notesCount}
        isPersonalOwner={isPersonalOwner}
        paperId={paperId}
        sectionId={sectionId}
        onParseComplete={onParseComplete}
        onParsePreview={onParsePreview}
        userPaperId={userPaperId}
        streamProgressData={streamProgressData}
        onAddBlockAsSection={onAddBlockAsSection}
        onAddHeadingToSection={onAddHeadingToSection}
        onAddParagraphToSection={onAddParagraphToSection}
        onAddOrderedListToSection={onAddOrderedListToSection}
        onAddUnorderedListToSection={onAddUnorderedListToSection}
        onAddMathToSection={onAddMathToSection}
        onAddFigureToSection={onAddFigureToSection}
        onAddTableToSection={onAddTableToSection}
        onCreateSectionWithHeading={onCreateSectionWithHeading}
        allSections={allSections}
      />
    </Suspense>
  );

  const blockShell = (
    <div
      id={block.id}
      data-block-id={block.id}
      className={`rounded-md transition-colors ${isActive ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
      style={{
        // 让 scrollIntoView 对齐到"头部下方 16px"
        scrollMarginTop: 'calc(var(--app-header-h, 0px) + 16px)',
      }}
      onClick={
        !isEditingBlock && onBlockClick
          ? (e) => {
              const selection = window.getSelection();
              // 如果有文本选择，不触发块点击事件，避免干扰文本选择
              if (selection && selection.toString().trim()) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              onBlockClick(block.id);
            }
          : undefined
      }
      onMouseDown={(e) => {
        // 在鼠标按下时检查是否有文本选择
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
          // 如果有文本选择，阻止默认行为，防止清除选择
          e.preventDefault();
        }
      }}
    >
      {blockContent}
    </div>
  );

  return (
    <>
      <BlockContextMenu
        sectionId={sectionId}
        sectionTitle={sectionTitle}
        block={block}
        paperId={paperId}
        userPaperId={userPaperId}
        isUserPaper={isPersonalOwner}
        onEdit={
          canEditContent
            ? () => {
                handleBlockEditStart(block.id);
              }
            : undefined
        }
        onInsertAbove={canEditContent ? () => onBlockInsert?.(block.id, 'above') : undefined}
        onInsertBelow={canEditContent ? () => onBlockInsert?.(block.id, 'below') : undefined}
        onMoveUp={canEditContent ? () => onBlockMove?.(block.id, 'up') : undefined}
        onMoveDown={canEditContent ? () => onBlockMove?.(block.id, 'down') : undefined}
        onDuplicate={canEditContent ? () => onBlockDuplicate?.(block.id) : undefined}
        onAddComponentAfter={
          canEditContent ? type => onBlockAddComponent?.(block.id, type) : undefined
        }
        onStartTextParse={canEditContent ? () => onStartTextParse(sectionId, block.id) : undefined}
        onQuickTranslate={canEditContent ? () => {
          // 快速翻译逻辑现在在 BlockContextMenu 中处理
          console.log('快速翻译被点击，逻辑在 BlockContextMenu 中处理');
        } : undefined}
        onAddSectionBelow={
          canEditContent && onAddSectionBelow
            ? () => onAddSectionBelow(sectionId)
            : undefined
        }
        onBlockUpdate={canEditContent ? (updatedBlock) => onBlockUpdate?.(block.id, updatedBlock) : undefined}
        onDelete={
          canEditContent
            ? () => handleBlockDelete(block.id)
            : undefined
        }
      >
        {blockShell}
      </BlockContextMenu>
      <ConfirmDialog />
    </>
  );
}