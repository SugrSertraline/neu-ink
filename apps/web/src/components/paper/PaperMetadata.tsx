'use client';

import React from 'react';
import { Calendar, Users, FileText, Award, Tag, BookOpen } from 'lucide-react';
import type { PaperMetadata } from '@/types/paper';

interface PaperMetadataProps {
  metadata: PaperMetadata;
}

export default function PaperMetadata({ metadata }: PaperMetadataProps) {

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 mb-6 border border-gray-200 dark:border-slate-700">
      {/* 标题 */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {metadata.title}
      </h1>
      {metadata.titleZh && (
        <h2 className="text-xl text-gray-700 dark:text-slate-300 mb-2">
          {metadata.titleZh}
        </h2>
      )}
      {metadata.shortTitle && (
        <h3 className="text-lg text-gray-600 dark:text-slate-400 mb-4">
          {metadata.shortTitle}
        </h3>
      )}

      {/* 作者信息 */}
      {metadata.authors && metadata.authors.length > 0 && (
        <div className="flex items-start gap-2 mb-3">
          <Users className="w-5 h-5 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {metadata.authors.map((author, idx) => (
              <span
                key={idx}
                className="text-gray-700 dark:text-slate-300 text-sm"
              >
                {author.name}
                {idx < metadata.authors.length - 1 && ','}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 发表信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {metadata.publication && (
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-slate-300">
              {metadata.publication}
            </span>
          </div>
        )}

        {(metadata.year || metadata.date) && (
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-slate-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-slate-300">
              {metadata.date || metadata.year}
            </span>
          </div>
        )}

        {metadata.articleType && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gray-500 dark:text-slate-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-slate-300 capitalize">
              {metadata.articleType}
            </span>
          </div>
        )}
      </div>

      {/* 分区和影响因子 */}
      {(metadata.sciQuartile || metadata.casQuartile || metadata.ccfRank || metadata.impactFactor) && (
        <div className="flex items-start gap-2 mb-4">
          <Award className="w-5 h-5 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {metadata.sciQuartile && metadata.sciQuartile !== '无' && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                SCI {metadata.sciQuartile}
              </span>
            )}
            {metadata.casQuartile && metadata.casQuartile !== '无' && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                CAS {metadata.casQuartile}
              </span>
            )}
            {metadata.ccfRank && metadata.ccfRank !== '无' && (
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-medium">
                CCF {metadata.ccfRank}
              </span>
            )}
            {metadata.impactFactor && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                IF: {metadata.impactFactor}
              </span>
            )}
          </div>
        </div>
      )}

      {/* DOI */}
      {metadata.doi && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600 dark:text-slate-400">DOI:</span>
          <a
            href={`https://doi.org/${metadata.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {metadata.doi}
          </a>
        </div>
      )}

      {/* 标签 */}
      {metadata.tags && metadata.tags.length > 0 && (
        <div className="flex items-start gap-2 mb-4">
          <Tag className="w-5 h-5 text-gray-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
