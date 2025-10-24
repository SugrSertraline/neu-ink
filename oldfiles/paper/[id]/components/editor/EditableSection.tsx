// frontend/app/papers/[id]/components/editor/EditableSection.tsx
'use client';
import { apiDelete } from '@/app/lib/api'; 
import React, { useState } from 'react';
import type { Section, BlockContent, Reference } from '../../../../types/paper';
import EditableBlock from './EditableBlock';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Edit3,
  GripVertical, ChevronUp, ChevronDown as MoveDown
} from 'lucide-react';

interface EditableSectionProps {
  section: Section;
  onChange: (section: Section) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  references?: Reference[];
  allSections?: Section[];
  level?: number;
  lang: 'en' | 'both';
  dragHandleProps?: any;
  highlightedId?: string; // 🆕 新增
  onAddSectionAfter?: () => void; // 🆕 新增
}

export default function EditableSection({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  references = [],
  allSections = [],
  level = 0,
  lang,
  dragHandleProps,
  highlightedId, // 🆕
  onAddSectionAfter // 🆕
}: EditableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // 🆕 添加新块（在指定位置后）
  const addBlockAfter = (afterIndex: number, type: BlockContent['type']) => {
    const newBlock = createEmptyBlock(type);
    const newContent = [...section.content];
    newContent.splice(afterIndex + 1, 0, newBlock);
    onChange({ ...section, content: newContent });
  };

  // 添加新块（末尾）
  const addBlock = (type: BlockContent['type']) => {
    const newBlock = createEmptyBlock(type);
    const newContent = [...section.content, newBlock];
    onChange({ ...section, content: newContent });
  };

  // 更新块
  const updateBlock = (index: number, block: BlockContent) => {
    const newContent = [...section.content];
    newContent[index] = block;
    onChange({ ...section, content: newContent });
  };

  // 删除块
  // 删除块
const deleteBlock = async (index: number) => {
  if (!confirm('确定删除这个块吗？')) return;
  
  const blockToDelete = section.content[index];
  
  // 如果是图片块且有上传的文件,先删除服务器文件
  if (blockToDelete.type === 'figure' && (blockToDelete as any).uploadedFilename) {
    try {
      const pathParts = window.location.pathname.split('/').filter(p => p);
      const paperId = pathParts[pathParts.indexOf('paper') + 1];
      await apiDelete(`/api/uploads/images/${paperId}/${(blockToDelete as any).uploadedFilename}`);

    } catch (err) {
      console.error('删除服务器文件失败:', err);
    }
  }
  
  const newContent = section.content.filter((_, i) => i !== index);
  onChange({ ...section, content: newContent });
};


  // 移动块
  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newContent = [...section.content];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newContent.length) return;

    [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
    onChange({ ...section, content: newContent });
  };

  // 复制块
  const duplicateBlock = (index: number) => {
    const block = section.content[index];
    const newBlock = { ...block, id: `${block.id}_copy_${Date.now()}` };
    const newContent = [...section.content];
    newContent.splice(index + 1, 0, newBlock);
    onChange({ ...section, content: newContent });
  };

  // 添加子章节
  const addSubsection = () => {
    const newSubsection: Section = {
      id: `section_${Date.now()}`,
      title: { en: 'New Subsection', zh: '新子章节' },
      content: [],
      subsections: []
    };
    const newSubsections = [...(section.subsections || []), newSubsection];
    onChange({ ...section, subsections: newSubsections });
  };

  // 🆕 在指定子章节后添加
  const addSubsectionAfter = (afterIndex: number) => {
    const newSubsection: Section = {
      id: `section_${Date.now()}`,
      title: { en: 'New Subsection', zh: '新子章节' },
      content: [],
      subsections: []
    };
    const newSubsections = [...(section.subsections || [])];
    newSubsections.splice(afterIndex + 1, 0, newSubsection);
    onChange({ ...section, subsections: newSubsections });
  };

  // 更新子章节
  const updateSubsection = (index: number, subsection: Section) => {
    const newSubsections = [...(section.subsections || [])];
    newSubsections[index] = subsection;
    onChange({ ...section, subsections: newSubsections });
  };

  // 删除子章节
  const deleteSubsection = async (index: number) => {
    if (!confirm('确定删除这个子章节及其所有内容吗？')) return;
    
    const subsection = (section.subsections || [])[index];
    
    // 递归查找并删除所有图片
    await cleanupSectionImages(subsection);
    
    const newSubsections = (section.subsections || []).filter((_, i) => i !== index);
    onChange({ ...section, subsections: newSubsections });
  };
  async function cleanupSectionImages(section: Section) {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    const paperId = pathParts[pathParts.indexOf('paper') + 1];    
    // 删除当前section的所有图片
    for (const block of section.content) {
      if (block.type === 'figure' && (block as any).uploadedFilename) {
        try {
          await apiDelete(`/api/uploads/images/${paperId}/${(block as any).uploadedFilename}`);
        } catch (err) {
          console.error('删除文件失败:', err);
        }
      }
    }
    
    // 递归处理子章节
    if (section.subsections) {
      for (const subsection of section.subsections) {
        await cleanupSectionImages(subsection);
      }
    }
  }  

  // 移动子章节
  const moveSubsection = (index: number, direction: 'up' | 'down') => {
    const newSubsections = [...(section.subsections || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSubsections.length) return;

    [newSubsections[index], newSubsections[targetIndex]] = [newSubsections[targetIndex], newSubsections[index]];
    onChange({ ...section, subsections: newSubsections });
  };

  const paddingLeft = `${level * 1.5}rem`;

  // 🆕 判断是否高亮
  const isHighlighted = highlightedId === section.id;

  return (
    <div
      id={`editor-${section.id}`} // 🆕 添加 ID
      data-sync-id={section.id}
      className={`border-l-4 mb-6 transition-all duration-300 ${
        isHighlighted 
          ? 'border-yellow-400 ring-2 ring-yellow-300 shadow-lg' 
          : 'border-blue-300'
      }`}
      style={{ marginLeft: paddingLeft }}
    >
      {/* 章节头部 */}
      <div className={`bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-lg shadow-sm transition-all ${
        isHighlighted ? 'bg-yellow-50 border-yellow-300' : ''
      }`}>
        <div className="flex items-center p-4 gap-3">
          {/* ... 前面的代码保持不变 ... */}
          <button
            type="button"
            className="p-1 hover:bg-blue-100 rounded cursor-grab active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-blue-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-blue-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-blue-600" />
            )}
          </button>

          {section.number && (
            <span className="px-2 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded">
              {section.number}
            </span>
          )}

          {isEditingTitle ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={section.title.en || ''}
                onChange={(e) => onChange({
                  ...section,
                  title: { ...section.title, en: e.target.value }
                })}
                className="flex-1 px-3 py-1 border border-blue-300 rounded"
                placeholder="English Title"
                autoFocus
              />
              {lang === 'both' && (
                <input
                  type="text"
                  value={section.title.zh || ''}
                  onChange={(e) => onChange({
                    ...section,
                    title: { ...section.title, zh: e.target.value }
                  })}
                  className="flex-1 px-3 py-1 border border-blue-300 rounded"
                  placeholder="中文标题"
                />
              )}
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                完成
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800">
                {section.title.en || section.title.zh || '未命名章节'}
              </h3>
              {lang === 'both' && section.title.zh && section.title.en !== section.title.zh && (
                <span className="text-sm text-gray-500">({section.title.zh})</span>
              )}
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="p-1 hover:bg-blue-100 rounded"
              >
                <Edit3 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}

          <div className="flex gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className={`p-1 rounded ${canMoveUp
                  ? 'hover:bg-blue-100 text-gray-600'
                  : 'text-gray-300 cursor-not-allowed'
                }`}
              title="上移章节"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className={`p-1 rounded ${canMoveDown
                  ? 'hover:bg-blue-100 text-gray-600'
                  : 'text-gray-300 cursor-not-allowed'
                }`}
              title="下移章节"
            >
              <MoveDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 hover:bg-red-100 rounded text-red-600"
              title="删除章节"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-2 text-xs text-gray-400 font-mono">
          ID: {section.id}
        </div>
      </div>

      {/* 章节内容（可展开） */}
      {isExpanded && (
        <div className="mt-4 space-y-4 pl-6">
          {/* 块列表 */}
          {section.content.map((block, index) => (
            <div 
              key={block.id} 
              id={`editor-${block.id}`} // 🆕 添加 ID
              data-sync-id={block.id}
              className={`transition-all duration-300 ${
                highlightedId === block.id 
                  ? 'ring-2 ring-yellow-400 rounded-lg shadow-lg' 
                  : ''
              }`}
            >
              <EditableBlock
                block={block}
                onChange={(newBlock) => updateBlock(index, newBlock)}
                onMoveUp={() => moveBlock(index, 'up')}
                onMoveDown={() => moveBlock(index, 'down')}
                onDelete={() => deleteBlock(index)}
                onDuplicate={() => duplicateBlock(index)}
                canMoveUp={index > 0}
                canMoveDown={index < section.content.length - 1}
                references={references}
                allSections={allSections}
                lang={lang}
                onAddBlockAfter={(type) => addBlockAfter(index, type)} // 🆕 传递函数
              />
            </div>
          ))}

          {/* 添加块按钮 */}
          <BlockTypeSelector onSelect={addBlock} />

          {/* 子章节 */}
          {(section.subsections || []).map((subsection, index) => (
            <EditableSection
              key={subsection.id}
              section={subsection}
              onChange={(newSubsection) => updateSubsection(index, newSubsection)}
              onDelete={() => deleteSubsection(index)}
              onMoveUp={() => moveSubsection(index, 'up')}
              onMoveDown={() => moveSubsection(index, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < (section.subsections || []).length - 1}
              references={references}
              allSections={allSections}
              level={level + 1}
              lang={lang}
              highlightedId={highlightedId}
              onAddSectionAfter={() => addSubsectionAfter(index)} // 🆕 传递
            />
          ))}

          {/* 添加子章节按钮 */}
          <button
            type="button"
            onClick={addSubsection}
            className="w-full py-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加子章节
          </button>

          {/* 🆕 在本章节后添加兄弟章节按钮 */}
          {onAddSectionAfter && (
            <button
              type="button"
              onClick={onAddSectionAfter}
              className="w-full py-2 border border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              在此章节后添加新章节
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 块类型选择器 - 保持不变
function BlockTypeSelector({ onSelect }: { onSelect: (type: BlockContent['type']) => void }) {
  // ... 代码保持不变
  const [isOpen, setIsOpen] = useState(false);

  const blockTypes: Array<{ type: BlockContent['type']; label: string; icon: string }> = [
    { type: 'paragraph', label: '段落', icon: '📝' },
    { type: 'heading', label: '标题', icon: '📌' },
    { type: 'math', label: '数学公式', icon: '∑' },
    { type: 'figure', label: '图片', icon: '🖼️' },
    { type: 'table', label: '表格', icon: '📊' },
    { type: 'code', label: '代码块', icon: '💻' },
    { type: 'ordered-list', label: '有序列表', icon: '🔢' },
    { type: 'unordered-list', label: '无序列表', icon: '•' },
    { type: 'quote', label: '引用', icon: '💬' },
    { type: 'divider', label: '分隔线', icon: '—' }
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加内容块
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 grid grid-cols-2 gap-2 p-3">
            {blockTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onSelect(type);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 创建空块的辅助函数 - 保持不变
function createEmptyBlock(type: BlockContent['type']): BlockContent {
  const baseId = `${type}_${Date.now()}`;

  const baseBlock = {
    id: baseId,
    type
  };

  switch (type) {
    case 'heading':
      return {
        ...baseBlock,
        type: 'heading',
        level: 2,
        content: { en: [], zh: [] }
      } as any;

    case 'paragraph':
      return {
        ...baseBlock,
        type: 'paragraph',
        content: { en: [], zh: [] }
      } as any;

    case 'math':
      return {
        ...baseBlock,
        type: 'math',
        latex: ''
      } as any;

    case 'figure':
      return {
        ...baseBlock,
        type: 'figure',
        caption: { en: [], zh: [] }
      } as any;

    case 'table':
      return {
        ...baseBlock,
        type: 'table',
        caption: { en: [], zh: [] },
        headers: [],
        rows: []
      } as any;

    case 'code':
      return {
        ...baseBlock,
        type: 'code',
        code: '',
        language: 'python'
      } as any;

    case 'ordered-list':
      return {
        ...baseBlock,
        type: 'ordered-list',
        items: []
      } as any;

    case 'unordered-list':
      return {
        ...baseBlock,
        type: 'unordered-list',
        items: []
      } as any;

    case 'quote':
      return {
        ...baseBlock,
        type: 'quote',
        content: { en: [], zh: [] }
      } as any;

    case 'divider':
      return {
        ...baseBlock,
        type: 'divider'
      } as any;

    default:
      return baseBlock as any;
  }
}