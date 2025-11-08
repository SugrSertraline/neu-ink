// src/components/paper/ParseTextDialog.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { BlockContent } from '@/types/paper';

interface ParseTextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (text: string) => Promise<{
    success: boolean;
    addedBlocks?: BlockContent[];
    error?: string;
  }>;
  sectionTitle: string;
}

export default function ParseTextDialog({
  isOpen,
  onClose,
  onConfirm,
  sectionTitle,
}: ParseTextDialogProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 禁用页面滚动
  useEffect(() => {
    if (isOpen) {
      // 禁用页面滚动
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      
      // 如果有滚动条，添加右边距防止抖动
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 恢复页面滚动
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入要解析的文本内容');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await onConfirm(text.trim());
      if (result.success) {
        onClose();
        setText('');
        setError(null);
        // 显示成功消息，包含添加的blocks数量
        if (result.addedBlocks && result.addedBlocks.length > 0) {
          console.log(`成功添加了 ${result.addedBlocks.length} 个段落`);
        }
      } else {
        setError(result.error || '解析失败，请重试');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setText('');
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-2xl rounded-lg bg-white dark:bg-slate-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            通过文本解析添加内容
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                在下方的文本框中输入内容，系统将自动解析并生成结构化的blocks添加到章节：<span className="font-semibold text-gray-900 dark:text-white">{sectionTitle}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                文本内容
              </label>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError(null); // Clear error when user starts typing
                }}
                placeholder="请输入要解析的文本内容...&#10;&#10;支持：&#10;• 自动识别标题、段落、列表等内容结构&#10;• 数学公式的LaTeX格式识别&#10;• 代码块的自动提取&#10;• 引用内容的智能处理"
                rows={12}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !text.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[80px] justify-center"
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                解析中...
              </>
            ) : (
              '确定'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}