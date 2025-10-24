'use client';

import React from 'react';
import type { PaperMetadata } from '@/app/types/paper';
import { Calendar, Users, FileText, Award, Star } from 'lucide-react';
import { PaperContent } from '@/app/types/paper';

interface PaperMetadataProps {
  content: PaperContent;  
}
export default function PaperMetadata({ content }: PaperMetadataProps) {
  const { metadata, abstract, keywords } = content;  
  
  return (
    <div className="mb-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 标题区域 */}
      <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {metadata.title}
        </h1>
        
      </div>

      {abstract && (
        <div className="p-8 border-t border-gray-200">
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-3">
            Abstract
          </h2>
          <div className="prose prose-sm max-w-none">
            {abstract.en && (
              <p className="text-gray-700 leading-relaxed mb-4">
                {abstract.en}
              </p>
            )}
            {abstract.zh && (
              <p className="text-gray-600 leading-relaxed text-sm">
                {abstract.zh}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 关键词 - 🆕 改为从 content.keywords 获取 */}
      {keywords && keywords.length > 0 && (
        <div className="px-8 pb-6">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-gray-500 mr-2">Keywords:</span>
            {keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
