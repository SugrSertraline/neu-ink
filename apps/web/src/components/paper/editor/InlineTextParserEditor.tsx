// src/components/paper/editor/InlineTextParserEditor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, X, Check } from 'lucide-react';
import { useEditorStore } from '@/store/editor/editorStore';

interface InlineTextParserEditorProps {
  sectionId: string;
  sectionTitle: string;
  context?: 'section' | 'block';
  blockId?: string;
  onParseText: (
    text: string,
    afterBlockId?: string,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onCancel: () => void;
  paperId: string;
  userPaperId?: string | null;
  onParseComplete?: (blocks: any[], paperData?: any) => void;
  onProgressUpdate?: (progressData: { message: string; progress: number; sessionId?: string }) => void;
}

export default function InlineTextParserEditor({
  sectionId,
  sectionTitle,
  context = 'section',
  blockId,
  onParseText,
  onCancel,
  paperId,
  userPaperId,
  onParseComplete,
}: InlineTextParserEditorProps) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setHasUnsavedChanges } = useEditorStore();

  useEffect(() => {
    setHasUnsavedChanges(text.trim().length > 0);
  }, [text, setHasUnsavedChanges]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('请输入要解析的文本内容');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const afterBlockId = context === 'block' ? blockId : undefined;

      // 统一交给父组件提供的 onParseText 处理
      const result = await onParseText(text.trim(), afterBlockId);

      if (result.success) {
        // 清空文本并关闭编辑器
        setText('');
        setError(null);
        setHasUnsavedChanges(false);

        // 调用完成回调 - 传递空数组,因为实际blocks会通过手动查询获取
        if (onParseComplete) {
          onParseComplete([], null);
        }
        
      } else {
        setError(result.error || '解析失败,请重试');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setText('');
      setError(null);
      setHasUnsavedChanges(false);
      onCancel();
    }
  };

  const getContextInfo = () => {
    if (context === 'block') {
      return {
        title: '在内容块下方解析添加',
        description: `将在当前内容块下方添加解析内容到章节: ${sectionTitle}`,
      };
    }
    return {
      title: '在章节中解析添加',
      description: `将在章节 "${sectionTitle}" 中添加解析内容`,
    };
  };

  const contextInfo = getContextInfo();

  return (
    <div className="mt-4 rounded-lg border-2 border-blue-500 bg-blue-50/50 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
            文本解析编辑器
          </span>
          <span className="text-sm text-gray-600">
            {contextInfo.title}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50"
            title="取消"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {contextInfo.description}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            文本内容
          </label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="请输入要解析的文本内容...&#10;&#10;支持：&#10;• 自动识别标题、段落、列表等内容结构&#10;• 数学公式的LaTeX格式识别&#10;• 代码块的自动提取&#10;• 引用内容的智能处理"
            rows={12}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            支持：标题自动识别 • 数学公式解析 • 代码块提取 • 列表处理
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !text.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-20 justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  开始解析
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
