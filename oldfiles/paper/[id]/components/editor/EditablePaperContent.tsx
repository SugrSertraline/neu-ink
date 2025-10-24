// frontend/app/papers/[id]/components/editor/EditablePaperContent.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { PaperContent, Section, Reference, BlockContent } from '../../../../types/paper';
import EditableSection from './EditableSection';
import ReferenceManager from './ReferenceManager';
import AbstractEditor from './AbstractEditor';
import KeywordsEditor from './KeywordsEditor';
import PreviewPanel from './PreviewPanel';
import NavigationTree from './NavigationTree';
import { calculateAllNumbers } from '../../utils/autoNumbering';
import { Plus, FileText, BookOpen } from 'lucide-react';

interface EditablePaperContentProps {
  content: PaperContent;
  onChange: (content: PaperContent) => void;
  lang: 'en' | 'both';
}

export default function EditablePaperContent({
  content,
  onChange,
  lang 
}: EditablePaperContentProps) {
  const [numberedContent, setNumberedContent] = useState<PaperContent>(content);
  const [activeNavId, setActiveNavId] = useState<string>('');
  const [highlightedId, setHighlightedId] = useState<string>(''); // 新增高亮状态
  
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const numbered = calculateAllNumbers(content);
    setNumberedContent(numbered);
  }, [content]);

  // 导航跳转处理
  const handleNavigate = (elementId: string, type: 'section' | 'block') => {
    setActiveNavId(elementId);
    
    // 设置高亮，2秒后清除
    setHighlightedId(elementId);
    setTimeout(() => setHighlightedId(''), 2000);
    
    // 滚动编辑区
    const editorElement = document.getElementById(`editor-${elementId}`);
    if (editorElement && editorScrollRef.current) {
      const containerRect = editorScrollRef.current.getBoundingClientRect();
      const elementRect = editorElement.getBoundingClientRect();
      const scrollTop = editorScrollRef.current.scrollTop;
      const targetPosition = scrollTop + (elementRect.top - containerRect.top) - 80;
      
      editorScrollRef.current.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
    
    // 滚动预览区
    const previewElement = document.getElementById(elementId);
    if (previewElement && previewScrollRef.current) {
      const containerRect = previewScrollRef.current.getBoundingClientRect();
      const elementRect = previewElement.getBoundingClientRect();
      const scrollTop = previewScrollRef.current.scrollTop;
      const targetPosition = scrollTop + (elementRect.top - containerRect.top) - 80;
      
      previewScrollRef.current.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  };

  const updateAbstract = (abstract: { en?: string; zh?: string }) => {
    onChange({ ...content, abstract });
  };

  const updateKeywords = (keywords: string[]) => {
    onChange({ ...content, keywords });
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      title: { en: 'New Section', zh: '新章节' },
      content: [],
      subsections: []
    };
    onChange({ 
      ...content, 
      sections: [...content.sections, newSection] 
    });
  };

  // 🆕 在指定 section 后添加新 section
  const addSectionAfter = (afterIndex: number) => {
    const newSection: Section = {
      id: `section_${Date.now()}`,
      title: { en: 'New Section', zh: '新章节' },
      content: [],
      subsections: []
    };
    const newSections = [...content.sections];
    newSections.splice(afterIndex + 1, 0, newSection);
    onChange({ ...content, sections: newSections });
  };

  const updateSection = (index: number, section: Section) => {
    const newSections = [...content.sections];
    newSections[index] = section;
    onChange({ ...content, sections: newSections });
  };

  const deleteSection = (index: number) => {
    if (!confirm('确定删除这个章节及其所有内容吗？')) return;
    const newSections = content.sections.filter((_, i) => i !== index);
    onChange({ ...content, sections: newSections });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...content.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    onChange({ ...content, sections: newSections });
  };

  const updateReferences = (references: Reference[]) => {
    onChange({ ...content, references });
  };

  return (
    <div className="h-full flex overflow-hidden bg-gray-50">
      {/* ========== 左侧导航树 ========== */}
      <div className="w-64 flex-shrink-0">
        <NavigationTree
          sections={numberedContent.sections}
          onNavigate={handleNavigate}
          activeId={activeNavId}
        />
      </div>

      {/* ========== 中间编辑区 ========== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div 
          ref={editorScrollRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {/* 摘要编辑器 */}
            <div id="editor-abstract">
              <AbstractEditor
                value={content.abstract || {}}
                onChange={updateAbstract}
              />
            </div>

            {/* 关键词编辑器 */}
            <div id="editor-keywords">
              <KeywordsEditor
                value={content.keywords || []}
                onChange={updateKeywords}
              />
            </div>

            {/* 正文编辑器 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">正文内容</h3>
                  <span className="text-sm text-gray-500">({content.sections.length} 个章节)</span>
                </div>
              </div>

              <div className="space-y-6">
                {content.sections.map((section, index) => (
                  <div key={section.id} id={`editor-${section.id}`}>
                    <EditableSection
                      section={section}
                      onChange={(newSection) => updateSection(index, newSection)}
                      onDelete={() => deleteSection(index)}
                      onMoveUp={() => moveSection(index, 'up')}
                      onMoveDown={() => moveSection(index, 'down')}
                      canMoveUp={index > 0}
                      canMoveDown={index < content.sections.length - 1}
                      references={content.references}
                      allSections={numberedContent.sections}
                      level={0}
                      lang={lang}
                      highlightedId={highlightedId}
                      onAddSectionAfter={() => addSectionAfter(index)} // 🆕 添加
                    />
                  </div>
                ))}

                <button
                  onClick={addSection}
                  className="w-full py-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  添加新章节
                </button>

                {content.sections.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">还没有任何章节</p>
                    <p className="text-sm mt-2">点击上方按钮添加第一个章节</p>
                  </div>
                )}
              </div>
            </div>

            {/* 参考文献管理器 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">参考文献</h3>
                <span className="text-sm text-gray-500">({content.references.length} 篇)</span>
              </div>
              
              <ReferenceManager
                references={content.references}
                onChange={updateReferences}
              />
            </div>
          </div>
        </div>

        {/* 底部状态栏 */}
        <div className="bg-white border-t border-gray-200 px-6 py-2">
          <div className="max-w-4xl mx-auto text-xs text-gray-500">
            共 {content.sections.length} 个章节 • {content.references.length} 篇参考文献
            {content.keywords && content.keywords.length > 0 && ` • ${content.keywords.length} 个关键词`}
          </div>
        </div>
      </div>

      {/* ========== 右侧预览区 ========== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PreviewPanel
          content={numberedContent}
          lang={lang}
          scrollRef={previewScrollRef}
        />
      </div>
    </div>
  );
}