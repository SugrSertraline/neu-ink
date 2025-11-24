"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import katex from "katex";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { userPaperService, adminPaperService } from "@/lib/services/paper";
import { generateId } from "@/lib/utils/paperHelpers";
import { Type, Plus, ChevronDown } from "lucide-react";

// markdown + math
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// 使用 PdfContentBlock 和 PdfAllBlock 类型，从 pdfBlocks.ts 导入
import type { PdfContentBlock, PdfAllBlock } from '@/types/paper/pdfBlocks';
import type { Section } from '@/types/paper';

// 导入转换函数
import {
  pdfTextBlockToHeadingBlock,
  canConvertToHeading,
  getHeadingLevelText,
  pdfTextBlockToParagraphBlock,
  canConvertToParagraph,
  pdfListBlockToOrderedListBlock,
  pdfListBlockToUnorderedListBlock,
  canConvertToOrderedList,
  canConvertToUnorderedList,
  canConvertToList,
  pdfListBlockToListBlock,
  pdfEquationBlockToMathBlock,
  canConvertToMathBlock,
  pdfImageBlockToFigureBlock,
  canConvertToFigureBlock,
  pdfTableBlockToTableBlock,
  canConvertToTableBlock
} from '@/lib/utils/pdfBlockConverters';

interface PdfBlockHoverCardProps {
  block: PdfAllBlock; // 使用 PdfAllBlock 以支持所有类型
  children: React.ReactNode;
  className?: string;
  // 新增：用于添加为section的回调函数
  onAddAsSection?: (sectionData: { id: string; title: string; titleZh: string; content: any[] }) => void;
  // 新增：用于添加标题到章节的回调函数
  onAddHeadingToSection?: (sectionId: string, position: 'start' | 'end', headingBlock: any) => void;
  // 新增：用于添加段落到章节的回调函数
  onAddParagraphToSection?: (sectionId: string, position: 'start' | 'end', paragraphBlock: any) => void;
  // 新增：用于添加有序列表到章节的回调函数
  onAddOrderedListToSection?: (sectionId: string, position: 'start' | 'end', orderedListBlock: any) => void;
  // 新增：用于添加无序列表到章节的回调函数
  onAddUnorderedListToSection?: (sectionId: string, position: 'start' | 'end', unorderedListBlock: any) => void;
  // 新增：用于添加公式到章节的回调函数
  onAddMathToSection?: (sectionId: string, position: 'start' | 'end', mathBlock: any) => void;
  // 新增：用于添加图片到章节的回调函数
  onAddFigureToSection?: (sectionId: string, position: 'start' | 'end', figureBlock: any) => void;
  // 新增：用于添加表格到章节的回调函数
  onAddTableToSection?: (sectionId: string, position: 'start' | 'end', tableBlock: any) => void;
  // 新增：论文相关参数
  paperId?: string;
  userPaperId?: string | null;
  isPersonalOwner?: boolean;
  // 新增：章节列表
  sections?: Section[];
}

export function PdfBlockHoverCard({
  block,
  children,
  className,
  onAddAsSection,
  onAddHeadingToSection,
  onAddParagraphToSection,
  paperId,
  userPaperId,
  isPersonalOwner,
  sections = [],
  onAddOrderedListToSection,
  onAddUnorderedListToSection,
  onAddMathToSection,
  onAddFigureToSection,
  onAddTableToSection,
}: PdfBlockHoverCardProps) {

  // 状态管理
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showParagraphSectionDropdown, setShowParagraphSectionDropdown] = useState(false);
  const [showOrderedListSectionDropdown, setShowOrderedListSectionDropdown] = useState(false);
  const [showUnorderedListSectionDropdown, setShowUnorderedListSectionDropdown] = useState(false);
  const [showMathSectionDropdown, setShowMathSectionDropdown] = useState(false);
  const [showFigureSectionDropdown, setShowFigureSectionDropdown] = useState(false);
  const [showTableSectionDropdown, setShowTableSectionDropdown] = useState(false);

  const handleAddAsSection = useCallback(async () => {
    if (!onAddAsSection) {
      toast.error('onAddAsSection 未传入');
      return;
    }
      
    if (!paperId && !userPaperId) {
      toast.error('缺少论文ID，无法添加章节');
      return;
    }
      
    if (block.type !== 'text' || !('text_level' in block) || !(block as any).text_level) {
      toast.error('只有标题文本可以添加为章节');
      return;
    }

    if (!('text' in block) || !(block as any).text || !(block as any).text.trim()) {
      toast.error('文本内容为空，无法添加为章节');
      return;
    }

    try {
      const tempSectionId = generateId('section');
      const sectionData = {
        id: tempSectionId,
        title: (block as any).text.trim(),
        titleZh: '',
        content: []
      };
      
      console.log('[PdfBlockHoverCard] call onAddAsSection with sectionData', {
        paperId,
        userPaperId,
        isPersonalOwner,
        sectionData,
      });

      await onAddAsSection(sectionData);
      
      toast.success('章节添加成功');
    } catch (error) {
      console.error('添加章节失败:', error);
      toast.error('添加章节失败，请重试');
    }
  }, [block, onAddAsSection, paperId, userPaperId, isPersonalOwner]);

  // 处理添加为标题
  const handleAddAsHeading = useCallback(() => {
    if (!canConvertToHeading(block)) {
      toast.error('只有标题级别的文本可以添加为标题');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节
  const handleSelectSection = useCallback((sectionId: string) => {
    try {
      const headingBlock = pdfTextBlockToHeadingBlock(block as any);
      
      if (onAddHeadingToSection) {
        // 默认添加到结尾
        onAddHeadingToSection(sectionId, 'end', headingBlock);
        toast.success('标题已添加到章节末尾');
      } else {
        toast.error('添加标题功能不可用');
      }
      setShowSectionDropdown(false);
    } catch (error) {
      console.error('添加标题失败:', error);
      toast.error('添加标题失败，请重试');
    }
  }, [block, onAddHeadingToSection]);

  // 处理添加为段落
  const handleAddAsParagraph = useCallback(() => {
    if (!canConvertToParagraph(block)) {
      toast.error('只有普通文本可以添加为段落');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowParagraphSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节添加段落
  const handleSelectSectionForParagraph = useCallback((sectionId: string) => {
    try {
      const paragraphBlock = pdfTextBlockToParagraphBlock(block as any);
      
      if (onAddParagraphToSection) {
        // 默认添加到结尾
        onAddParagraphToSection(sectionId, 'end', paragraphBlock);
        toast.success('段落已添加到章节末尾');
      } else {
        toast.error('添加段落功能不可用');
      }
      setShowParagraphSectionDropdown(false);
    } catch (error) {
      console.error('添加段落失败:', error);
      toast.error('添加段落失败，请重试');
    }
  }, [block, onAddParagraphToSection]);

  // 处理添加为有序列表
  const handleAddAsOrderedList = useCallback(() => {
    if (!canConvertToOrderedList(block)) {
      toast.error('只有有序列表可以添加为有序列表');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowOrderedListSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节添加有序列表
  const handleSelectSectionForOrderedList = useCallback((sectionId: string) => {
    try {
      const orderedListBlock = pdfListBlockToOrderedListBlock(block as any);
      
      if (onAddOrderedListToSection) {
        // 默认添加到结尾
        onAddOrderedListToSection(sectionId, 'end', orderedListBlock);
        toast.success('有序列表已添加到章节末尾');
      } else {
        toast.error('添加有序列表功能不可用');
      }
      setShowOrderedListSectionDropdown(false);
    } catch (error) {
      console.error('添加有序列表失败:', error);
      toast.error('添加有序列表失败，请重试');
    }
  }, [block, onAddOrderedListToSection]);

  // 处理添加为无序列表
  const handleAddAsUnorderedList = useCallback(() => {
    if (!canConvertToUnorderedList(block)) {
      toast.error('只有无序列表可以添加为无序列表');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowUnorderedListSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节添加无序列表
  const handleSelectSectionForUnorderedList = useCallback((sectionId: string) => {
    try {
      const unorderedListBlock = pdfListBlockToUnorderedListBlock(block as any);
      
      if (onAddUnorderedListToSection) {
        // 默认添加到结尾
        onAddUnorderedListToSection(sectionId, 'end', unorderedListBlock);
        toast.success('无序列表已添加到章节末尾');
      } else {
        toast.error('添加无序列表功能不可用');
      }
      setShowUnorderedListSectionDropdown(false);
    } catch (error) {
      console.error('添加无序列表失败:', error);
      toast.error('添加无序列表失败，请重试');
    }
  }, [block, onAddUnorderedListToSection]);

  // 处理添加为公式
  const handleAddAsMath = useCallback(() => {
    if (!canConvertToMathBlock(block)) {
      toast.error('只有公式可以添加为公式');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowMathSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节添加公式
  const handleSelectSectionForMath = useCallback((sectionId: string) => {
    try {
      const mathBlock = pdfEquationBlockToMathBlock(block as any);
      
      if (onAddMathToSection) {
        // 默认添加到结尾
        onAddMathToSection(sectionId, 'end', mathBlock);
        toast.success('公式已添加到章节末尾');
      } else {
        toast.error('添加公式功能不可用');
      }
      setShowMathSectionDropdown(false);
    } catch (error) {
      console.error('添加公式失败:', error);
      toast.error('添加公式失败，请重试');
    }
  }, [block, onAddMathToSection]);

  // 处理添加为图片
  const handleAddAsFigure = useCallback(() => {
    if (!canConvertToFigureBlock(block)) {
      toast.error('只有图片可以添加为图片');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowFigureSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节添加图片
  const handleSelectSectionForFigure = useCallback((sectionId: string) => {
    try {
      const figureBlock = pdfImageBlockToFigureBlock(block as any, paperId || userPaperId || undefined);
      
      if (onAddFigureToSection) {
        // 默认添加到结尾
        onAddFigureToSection(sectionId, 'end', figureBlock);
        toast.success('图片已添加到章节末尾');
      } else {
        toast.error('添加图片功能不可用');
      }
      setShowFigureSectionDropdown(false);
    } catch (error) {
      console.error('添加图片失败:', error);
      toast.error('添加图片失败，请重试');
    }
  }, [block, onAddFigureToSection, paperId, userPaperId]);

  // 处理添加为表格
  const handleAddAsTable = useCallback(() => {
    if (!canConvertToTableBlock(block)) {
      toast.error('只有表格可以添加为表格');
      return;
    }

    if (sections.length === 0) {
      toast.error('没有可用的章节，请先创建章节');
      return;
    }

    // 显示章节选择下拉菜单
    setShowTableSectionDropdown(true);
  }, [block, sections.length]);

  // 处理选择章节添加表格
  const handleSelectSectionForTable = useCallback((sectionId: string) => {
    try {
      const tableBlock = pdfTableBlockToTableBlock(block as any);
      
      if (onAddTableToSection) {
        // 默认添加到结尾
        onAddTableToSection(sectionId, 'end', tableBlock);
        toast.success('表格已添加到章节末尾');
      } else {
        toast.error('添加表格功能不可用');
      }
      setShowTableSectionDropdown(false);
    } catch (error) {
      console.error('添加表格失败:', error);
      toast.error('添加表格失败，请重试');
    }
  }, [block, onAddTableToSection]);

  // 判断是否显示"添加为section"选项
  const canAddAsSection = block.type === 'text' && 'text_level' in block && (block as any).text_level !== undefined && (block as any).text_level > 0;
  
  // 判断是否显示"添加为标题"选项
  const canAddAsHeading = canConvertToHeading(block);
  
  // 判断是否显示"添加为段落"选项
  const canAddAsParagraph = canConvertToParagraph(block);
  
  // 判断是否显示"添加为有序列表"选项
  const canAddAsOrderedList = canConvertToOrderedList(block);
  
  // 判断是否显示"添加为无序列表"选项
  const canAddAsUnorderedList = canConvertToUnorderedList(block);
  
  // 判断是否显示"添加为公式"选项
  const canAddAsMath = canConvertToMathBlock(block);
  
  // 判断是否显示"添加为图片"选项
  const canAddAsFigure = canConvertToFigureBlock(block);
  
  // 判断是否显示"添加为表格"选项
  const canAddAsTable = canConvertToTableBlock(block);

  // 获取块类型名称
  const getBlockTypeName = (type: string) => {
    switch (type) {
      case "text":
        return "文本";
      case "image":
        return "图片";
      case "table":
        return "表格";
      case "equation":
        return "行间公式";
      case "code":
        return "代码块";
      case "list":
        return "列表";
      case "header":
        return "页眉";
      case "footer":
        return "页脚";
      case "page_number":
        return "页码";
      case "aside_text":
        return "装订线旁注";
      case "page_footnote":
        return "页面脚注";
      default:
        return type;
    }
  };

  // 获取块类型颜色
  const getBlockTypeColor = (type: string) => {
    switch (type) {
      case "text":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "image":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "table":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "equation":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "code":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "list":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "header":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "footer":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "page_number":
        return "bg-lime-100 text-lime-800 border-lime-200";
      case "aside_text":
        return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200";
      case "page_footnote":
        return "bg-stone-100 text-stone-800 border-stone-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 增强子组件，不需要添加右键菜单功能
  const enhancedChildren = React.cloneElement(children as React.ReactElement, {} as any);

  return (
    <>
      <HoverCard delayOpen={300} delayClose={100} openDelay={300}>
        <HoverCardTrigger asChild>{enhancedChildren}</HoverCardTrigger>
        <AnimatePresence mode="wait">
          <HoverCardContent
            side="top"
            align="center"
            sideOffset={8}
            className={cn(
              "p-0 overflow-hidden z-1000",
              block.type === "equation" ? "w-[720px]" : "w-96",
              className
            )}
            asChild
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  mass: 0.8,
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: -10,
                transition: {
                  duration: 0.2,
                  ease: "easeInOut",
                },
              }}
              className={cn(
                // ✅ 这里加一个作用域类名，方便只在这个卡片里改 KaTeX 样式
                "katex-hover-card",
                "rounded-2xl border border-white/20 bg-white/95 backdrop-blur-2xl shadow-[0_14px_30px_rgba(40,65,138,0.16)] overflow-hidden z-1000"
              )}
            >
              <div className="bg-linear-to-br from-slate-50 to-white">
                {/* 块类型标题栏 */}
                <div
                  className={cn(
                    "px-4 py-2 border-b border-white/20 flex items-center justify-between backdrop-blur-sm",
                    getBlockTypeColor(block.type)
                  )}
                >
                  <span className="text-sm font-medium">
                    {getBlockTypeName(block.type)}
                  </span>
                  {'text_level' in block && (block as any).text_level && (
                    <span className="text-xs opacity-75">
                      级别 {(block as any).text_level}
                    </span>
                  )}
                </div>

                {/* 内容区域 */}
                <div className="p-4 max-h-80 overflow-y-auto">
                  {block.type === "text" && 'text' in block && (block as any).text && (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: (props) => (
                            <p
                              className="text-sm leading-relaxed whitespace-pre-wrap"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {(block as any).text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {block.type === "image" && (
                    <div className="space-y-2">
                      {'image_caption' in block && (block as any).image_caption &&
                        (block as any).image_caption.length > 0 && (
                          <div className="text-sm italic text-slate-600">
                            {(block as any).image_caption.join(" ")}
                          </div>
                        )}
                      {'image_footnote' in block && (block as any).image_footnote &&
                        (block as any).image_footnote.length > 0 && (
                          <div className="text-xs text-slate-500 border-t border-white/20 pt-2">
                            {(block as any).image_footnote.join(" ")}
                          </div>
                        )}
                    </div>
                  )}

                  {block.type === "table" && (
                    <div className="space-y-2">
                      {'table_caption' in block && (block as any).table_caption &&
                        (block as any).table_caption.length > 0 && (
                          <div className="text-sm font-medium text-slate-700">
                            {(block as any).table_caption.join(" ")}
                          </div>
                        )}
                      {'table_body' in block && (block as any).table_body && (
                        <div
                          className="text-xs overflow-x-auto border border-white/20 rounded bg-white/30 backdrop-blur-sm"
                          dangerouslySetInnerHTML={{
                            __html: (block as any).table_body,
                          }}
                        />
                      )}
                      {'table_footnote' in block && (block as any).table_footnote &&
                        (block as any).table_footnote.length > 0 && (
                          <div className="text-xs text-slate-500 border-t border-white/20 pt-2">
                            {(block as any).table_footnote.join(" ")}
                          </div>
                        )}
                    </div>
                  )}

                  {block.type === "equation" && 'text' in block && (block as any).text && (
                    <div className="py-2 overflow-x-auto">
                      <div className="flex justify-center min-w-max">
                        <EquationRenderer latex={(block as any).text} />
                      </div>
                    </div>
                  )}

                  {block.type === "code" && (
                    <div className="space-y-2">
                      {'sub_type' in block && (block as any).sub_type && (
                        <div className="text-xs text-slate-500 mb-2">
                          代码类型:{" "}
                          {(block as any).sub_type === "algorithm"
                            ? "算法"
                            : "代码"}
                        </div>
                      )}
                      {'code_caption' in block && (block as any).code_caption &&
                        (block as any).code_caption.length > 0 && (
                          <div className="text-sm font-medium text-slate-700">
                            {(block as any).code_caption.join(" ")}
                          </div>
                        )}
                      {'code_body' in block && (block as any).code_body && (
                        <div className="text-xs bg-slate-100 p-2 rounded font-mono whitespace-pre-wrap overflow-x-auto">
                          {(block as any).code_body}
                        </div>
                        )}
                    </div>
                  )}

                  {block.type === "list" && (
                    <div className="space-y-2">
                      {'sub_type' in block && (block as any).sub_type && (
                        <div className="text-xs text-slate-500 mb-2">
                          列表类型:{" "}
                          {(block as any).sub_type === "ref_text"
                            ? "参考文献列表"
                            : "文本列表"}
                        </div>
                      )}
                      {'list_items' in block && (block as any).list_items &&
                        (block as any).list_items.length > 0 && (
                          <div className="space-y-1">
                            {(block as any).list_items.map((item: any, index: number) => (
                              <div
                                key={index}
                                className="text-sm leading-relaxed"
                              >
                                {(block as any).sub_type === "ref_text"
                                  ? `[${index + 1}] `
                                  : ""}
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

                  {/* Discarded blocks */}
                  {(block.type === "header" ||
                    block.type === "footer" ||
                    block.type === "page_number" ||
                    block.type === "aside_text" ||
                    block.type === "page_footnote") && (
                    <div className="space-y-2">
                      {'text' in block && (block as any).text && (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {(block as any).text}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* 底部信息 */}
                <div className="px-4 py-2 bg-white/30 border-t border-white/20 backdrop-blur-sm">
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span>页码: {block.page_idx + 1}</span>
                    {'text_level' in block && (block as any).text_level && (
                      <span>级别: {(block as any).text_level}</span>
                    )}
                  </div>
                </div>

                {/* 操作按钮区域 */}
                <div className="px-4 py-2 bg-white/50 border-t border-white/20 backdrop-blur-sm space-y-2">
                  {canAddAsHeading && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:bg-indigo-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsHeading}
                      >
                        <Type className="w-4 h-4" />
                        添加为标题
                        {block.type === 'text' && 'text_level' in block && (
                          <span className="text-xs opacity-75">
                            ({getHeadingLevelText((block as any).text_level || 1)})
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSection(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                   
                  {canAddAsParagraph && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-green-700 bg-green-100 hover:bg-green-200 focus:bg-green-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsParagraph}
                      >
                        <Type className="w-4 h-4" />
                        添加为段落
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showParagraphSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSectionForParagraph(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                   
                  {canAddAsOrderedList && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-orange-700 bg-orange-100 hover:bg-orange-200 focus:bg-orange-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsOrderedList}
                      >
                        <Type className="w-4 h-4" />
                        添加为有序列表
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showOrderedListSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSectionForOrderedList(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                   
                  {canAddAsUnorderedList && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-teal-700 bg-teal-100 hover:bg-teal-200 focus:bg-teal-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsUnorderedList}
                      >
                        <Type className="w-4 h-4" />
                        添加为无序列表
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showUnorderedListSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSectionForUnorderedList(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                   
                  {canAddAsMath && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-purple-700 bg-purple-100 hover:bg-purple-200 focus:bg-purple-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsMath}
                      >
                        <Type className="w-4 h-4" />
                        添加为公式
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showMathSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSectionForMath(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {canAddAsFigure && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-amber-700 bg-amber-100 hover:bg-amber-200 focus:bg-amber-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsFigure}
                      >
                        <Type className="w-4 h-4" />
                        添加为图片
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showFigureSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSectionForFigure(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {canAddAsTable && (
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full rounded px-3 py-1.5 text-sm text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:bg-emerald-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                        onClick={handleAddAsTable}
                      >
                        <Type className="w-4 h-4" />
                        添加为表格
                        <ChevronDown className="w-4 h-4 ml-auto" />
                      </button>
                       
                      {/* 章节选择下拉菜单 */}
                      {showTableSectionDropdown && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {sections.length > 0 && sections.map((section) => (
                              <button
                                key={section.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={() => handleSelectSectionForTable(section.id)}
                              >
                                {section.title || section.titleZh || '未命名章节'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {canAddAsSection && (
                    <button
                      type="button"
                      className="w-full rounded px-3 py-1.5 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 focus:bg-blue-200 focus:outline-none transition-colors duration-200 flex items-center justify-center gap-2"
                      onClick={handleAddAsSection}
                    >
                      <Plus className="w-4 h-4" />
                      添加为章节
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </HoverCardContent>
        </AnimatePresence>
      </HoverCard>

      {/* ✅ 只作用于这个 hover 卡片里的 KaTeX tag，避免全局污染 */}
      <style jsx global>{`
        .katex-hover-card .katex-display > .katex > .katex-tag {
          position: static;
          margin-left: 0.75rem;
        }
      `}</style>
    </>
  );
}

// 公式渲染组件
function EquationRenderer({ latex }: { latex: string }) {
  const mathRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mathRef.current || !latex) return;

    mathRef.current.innerHTML = "";

    try {
      let raw = latex.trim();
      let math = raw;
      let displayMode = true;

      // 删除 LaTeX 行间公式编号相关代码
      // 移除 \tag 相关内容，处理可能包含空格和复杂内容的情况
      math = math.replace(/\\tag\s*\{[^}]*\}/g, '');
      
      if (raw.startsWith("$$") && raw.endsWith("$$")) {
        math = raw.slice(2, -2).trim();
        displayMode = true;
      } else if (raw.startsWith("\\[") && raw.endsWith("\\]")) {
        math = raw.slice(2, -2).trim();
        displayMode = true;
      } else {
        const inlineMatch = raw.match(/^\$([\s\S]*?)\$/);
        if (inlineMatch) {
          math = inlineMatch[1].trim();
          displayMode = false;
        } else {
          math = raw;
          displayMode = true;
        }
      }

      // 去除可能的多余换行符
      math = math.replace(/\n+/g, ' ').trim();

      katex.render(math, mathRef.current, {
        throwOnError: false,
        displayMode,
      });

      mathRef.current.className = "text-center my-2";
    } catch (err) {
      mathRef.current.innerHTML = `
        <code class="bg-red-100 text-red-600 px-2 py-1 rounded text-sm">
          ${latex}
        </code>
      `;
      mathRef.current.className = "text-center my-2";
    }
  }, [latex]);

  return <div ref={mathRef} className="text-center" />;
}