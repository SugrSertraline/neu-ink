// frontend/app/papers/[id]/components/editor/PreviewPanel.tsx
'use client';

import React from 'react';
import type { PaperContent } from '@/app/types/paper';
import PaperMetadata from '../PaperMetadata';
import PaperContentComponent from '../PaperContent';
import { Eye } from 'lucide-react';

interface PreviewPanelProps {
  content: PaperContent;
  lang: 'en' | 'both';
  scrollRef?: React.RefObject<HTMLDivElement | null>; // 修改这里
}

export default function PreviewPanel({ 
  content, 
  lang,
  scrollRef
}: PreviewPanelProps) {

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      {/* 预览标题栏 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200">
        <Eye className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">实时预览</span>
        <span className="text-xs text-gray-500">
          ({lang === 'both' ? '双语模式' : '英文模式'})
        </span>
      </div>

      {/* 预览内容区 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* 元数据预览 */}
          <PaperMetadata content={content} />

          {/* 内容预览 */}
          <PaperContentComponent
            sections={content.sections}
            references={content.references}
            lang={lang}
            searchQuery=""
            activeBlockId={null}
            setActiveBlockId={() => {}}
            onBlockClick={() => {}}
            highlightedRefs={[]}
            setHighlightedRefs={() => {}}
            contentRef={scrollRef || { current: null }} // 修改这里：提供默认值
            blockNotes={content.blockNotes}
          />
        </div>
      </div>
    </div>
  );
}