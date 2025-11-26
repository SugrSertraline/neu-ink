// 组件相关的自定义 Hooks
// 用于减少组件中的重复逻辑

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Section, BlockContent, PaperContent as PaperContentModel } from '@/types/paper';
import { calculateAllNumbers } from './autoNumbering';
import { extractBlockText, generateSectionNumber } from './textProcessing';

/**
 * 搜索相关的 Hook
 */
export function usePaperSearch(
  sections: Section[],
  references: any[],
  searchQuery: string,
  setSearchResults: (results: string[]) => void,
  setCurrentSearchIndex: (index: number) => void
) {
  // 应用自动编号的内容
  const contentWithNumbers = useMemo(() => {
    const paperContent: PaperContentModel = {
      sections,
      references,
      metadata: {
        title: '', // 必需的 title 属性
        authors: [], // 必需的 authors 属性
      },
    };
    return calculateAllNumbers(paperContent);
  }, [sections, references]);

  // 使用ref保存上次的搜索结果,避免空数组引起的无限循环
  const lastSearchResultsRef = useRef<string[]>([]);
  const lastSearchQueryRef = useRef<string>('');

  // 遍历章节的辅助函数
  const traverseSections = useCallback(
    (nodes: Section[], visitor: (section: Section, path: number[]) => void, path: number[] = []) => {
      nodes.forEach((section, index) => {
        const nextPath = [...path, index + 1];
        visitor(section, nextPath);
      });
    },
    [],
  );

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    
    // 如果查询没变,直接返回
    if (q === lastSearchQueryRef.current) {
      return;
    }
    
    lastSearchQueryRef.current = q;
    
    if (!q) {
      // 只有当之前有结果时才清空
      if (lastSearchResultsRef.current.length > 0) {
        lastSearchResultsRef.current = [];
        setSearchResults([]);
        setCurrentSearchIndex(0);
      }
      return;
    }

    const results: string[] = [];
    traverseSections(contentWithNumbers.sections, (section) => {
      section.content?.forEach((block) => {
        const text = extractBlockText(block).toLowerCase();
        if (text.includes(q)) results.push(block.id);
      });
    });

    // 只有结果真正变化时才更新
    const resultsChanged =
      results.length !== lastSearchResultsRef.current.length ||
      results.some((id, i) => id !== lastSearchResultsRef.current[i]);
    
    if (resultsChanged) {
      lastSearchResultsRef.current = results;
      setSearchResults(results);
      setCurrentSearchIndex(0);
    }
  }, [searchQuery, contentWithNumbers.sections, traverseSections, setSearchResults, setCurrentSearchIndex]);

  return { contentWithNumbers, generateSectionNumber };
}

/**
 * 编辑状态管理的 Hook
 */
export function useEditingStateManagement(
  canEditContent: boolean,
  switchToEdit: any,
  setActiveBlockId: (id: string | null) => void
) {
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [textParseSectionId, setTextParseSectionId] = useState<string | null>(null);
  const [textParseBlockId, setTextParseBlockId] = useState<string | null>(null);
  const [translationResult, setTranslationResult] = useState<{ sectionId: string; translatedText: string } | null>(null);

  // 清理编辑状态
  const clearEditingStates = useCallback(() => {
    setRenamingSectionId(null);
    setHoveredSectionId(null);
    setTextParseSectionId(null);
    setTextParseBlockId(null);
    setTranslationResult(null);
  }, []);

  useEffect(() => {
    if (!canEditContent) {
      clearEditingStates();
    }
  }, [canEditContent, clearEditingStates]);

  const handleBlockEditStart = useCallback(
    async (blockId: string) => {
      const switched = await switchToEdit(blockId, {
        beforeSwitch: () => {
          if (renamingSectionId && renamingSectionId !== blockId) {
            setRenamingSectionId(null);
          }
        },
        onRequestSave: () => {
          // TODO: auto-save pending block
        },
      });
      if (!switched) return;
      setActiveBlockId(blockId);
    },
    [switchToEdit, renamingSectionId, setActiveBlockId],
  );

  const handleSectionEditStart = useCallback(
    async (sectionId: string) => {
      const switched = await switchToEdit(sectionId, {
        beforeSwitch: () => {
          if (renamingSectionId && renamingSectionId !== sectionId) {
            setRenamingSectionId(null);
          }
        },
        onRequestSave: () => {
          // TODO: auto-save pending section
        },
      });
      if (!switched) return;
      setRenamingSectionId(sectionId);
    },
    [switchToEdit, renamingSectionId],
  );

  const handleStartTextParse = useCallback(
    (sectionId: string) => {
      if (textParseSectionId === sectionId) {
        setTextParseSectionId(null);
      } else {
        setTextParseSectionId(sectionId);
        setTextParseBlockId(null); // 清除block级别的编辑器
      }
    },
    [textParseSectionId],
  );

  const handleStartBlockTextParse = useCallback(
    (sectionId: string, blockId: string) => {
      if (textParseBlockId === blockId) {
        setTextParseBlockId(null);
      } else {
        setTextParseBlockId(blockId);
        setTextParseSectionId(null); // 清除section级别的编辑器
      }
    },
    [textParseBlockId],
  );

  const handleParseTextComplete = useCallback(() => {
    setTextParseSectionId(null);
    setTextParseBlockId(null);
  }, []);

  return {
    renamingSectionId,
    hoveredSectionId,
    textParseSectionId,
    textParseBlockId,
    translationResult,
    setRenamingSectionId,
    setHoveredSectionId,
    setTextParseSectionId,
    setTextParseBlockId,
    setTranslationResult,
    handleBlockEditStart,
    handleSectionEditStart,
    handleStartTextParse,
    handleStartBlockTextParse,
    handleParseTextComplete,
    clearEditingStates,
  };
}

/**
 * 翻译功能的 Hook
 */
export function useTranslationHandler(
  handleSectionEditStart: (sectionId: string) => Promise<void>
) {
  const handleQuickTranslate = useCallback(async (sectionId: string, title: string) => {
    if (!title || !title.trim()) {
      return { success: false, error: '章节标题为空，无法翻译' };
    }

    try {
      // 这里可以调用翻译服务
      // 暂时返回模拟结果
      const translatedText = `翻译结果: ${title}`;
      
      // 进入编辑状态
      await handleSectionEditStart(sectionId);
      
      return { success: true, data: { sectionId, translatedText } };
    } catch (error) {
      return { success: false, error: `翻译失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }, [handleSectionEditStart]);

  return { handleQuickTranslate };
}