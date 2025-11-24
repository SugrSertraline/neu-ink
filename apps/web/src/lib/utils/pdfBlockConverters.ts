import type { PdfTextBlock, PdfListBlock, PdfEquationBlock, PdfImageBlock, PdfTableBlock } from '@/types/paper/pdfBlocks';
import type { HeadingBlock, ParagraphBlock, OrderedListBlock, UnorderedListBlock, MathBlock, FigureBlock, TableBlock, InlineContent } from '@/types/paper/content';
import { generateId } from './paperHelpers';
import { parseHtmlTable } from './tableParser';
import { buildImageUrl } from '@/config/imageConfig';

/**
 * 将PDF文本块转换为标题块
 * @param pdfBlock PDF文本块
 * @returns 转换后的标题块
 */
export function pdfTextBlockToHeadingBlock(pdfBlock: PdfTextBlock): HeadingBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'text' || !pdfBlock.text) {
    throw new Error('无效的PDF文本块');
  }

  // 映射PDF文本级别到标题级别
  // PDF中的text_level通常是1-6，对应Heading的1-6级别
  // 如果超出范围，则限制在1-6之间
  let headingLevel: 1 | 2 | 3 | 4 | 5 | 6 = 2; // 默认为2级标题
  if (pdfBlock.text_level && pdfBlock.text_level >= 1 && pdfBlock.text_level <= 6) {
    headingLevel = pdfBlock.text_level as 1 | 2 | 3 | 4 | 5 | 6;
  }

  // 创建内联内容
  const inlineContent: InlineContent[] = [
    {
      type: 'text',
      content: pdfBlock.text.trim()
    }
  ];

  // 构建标题块
  const headingBlock: HeadingBlock = {
    id: generateId('heading'),
    type: 'heading',
    level: headingLevel,
    content: {
      en: inlineContent
      // 注意：这里不添加zh内容，因为原始PDF文本通常是英文
      // 如果需要中文翻译，可以在后续通过翻译功能添加
    }
  };

  return headingBlock;
}

/**
 * 批量转换PDF文本块为标题块
 * @param pdfBlocks PDF文本块数组
 * @returns 转换后的标题块数组
 */
export function pdfTextBlocksToHeadingBlocks(pdfBlocks: PdfTextBlock[]): HeadingBlock[] {
  if (!Array.isArray(pdfBlocks)) {
    return [];
  }

  return pdfBlocks
    .filter(block => block.type === 'text' && block.text_level && block.text_level > 0 && block.text)
    .map(pdfTextBlockToHeadingBlock);
}

/**
 * 检查PDF文本块是否可以转换为标题块
 * @param pdfBlock PDF文本块
 * @returns 是否可以转换
 */
export function canConvertToHeading(pdfBlock: any): pdfBlock is PdfTextBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'text' &&
    pdfBlock.text_level !== undefined &&
    pdfBlock.text_level > 0 &&
    pdfBlock.text &&
    typeof pdfBlock.text === 'string' &&
    pdfBlock.text.trim().length > 0
  );
}

/**
 * 获取标题级别的显示文本
 * @param level 标题级别
 * @returns 显示文本
 */
export function getHeadingLevelText(level: number): string {
  switch (level) {
    case 1:
      return '一级标题';
    case 2:
      return '二级标题';
    case 3:
      return '三级标题';
    case 4:
      return '四级标题';
    case 5:
      return '五级标题';
    case 6:
      return '六级标题';
    default:
      return '标题';
  }
}

/**
 * 获取标题级别的样式类名
 * @param level 标题级别
 * @returns CSS类名
 */
export function getHeadingLevelClass(level: number): string {
  switch (level) {
    case 1:
      return 'text-2xl font-bold';
    case 2:
      return 'text-xl font-semibold';
    case 3:
      return 'text-lg font-semibold';
    case 4:
      return 'text-base font-medium';
    case 5:
      return 'text-sm font-medium';
    case 6:
      return 'text-xs font-medium';
    default:
      return 'text-base font-medium';
  }
}

/**
 * 将PDF文本块转换为段落块
 * @param pdfBlock PDF文本块
 * @returns 转换后的段落块
 */
export function pdfTextBlockToParagraphBlock(pdfBlock: PdfTextBlock): ParagraphBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'text' || !pdfBlock.text) {
    throw new Error('无效的PDF文本块');
  }

  // 解析markdown语法，提取行内公式
  const inlineContent = parseMarkdownToInlineContent(pdfBlock.text.trim());

  // 构建段落块
  const paragraphBlock: ParagraphBlock = {
    id: generateId('paragraph'),
    type: 'paragraph',
    content: {
      en: inlineContent
      // 注意：这里不添加zh内容，因为原始PDF文本通常是英文
      // 如果需要中文翻译，可以在后续通过翻译功能添加
    }
  };

  return paragraphBlock;
}

/**
 * 检查PDF文本块是否可以转换为段落块
 * @param pdfBlock PDF文本块
 * @returns 是否可以转换
 */
export function canConvertToParagraph(pdfBlock: any): pdfBlock is PdfTextBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'text' &&
    (!pdfBlock.text_level || pdfBlock.text_level === 0) && // 没有level或level为0
    pdfBlock.text &&
    typeof pdfBlock.text === 'string' &&
    pdfBlock.text.trim().length > 0
  );
}

/**
 * 解析markdown语法，将文本转换为内联内容数组
 * @param text 原始文本
 * @returns 内联内容数组
 */
function parseMarkdownToInlineContent(text: string): InlineContent[] {
  const inlineContent: InlineContent[] = [];
  
  // 正则表达式匹配行内数学公式 $...$
  const inlineMathRegex = /\$([^$\n]+)\$/g;
  let lastIndex = 0;
  let match;
  
  while ((match = inlineMathRegex.exec(text)) !== null) {
    // 添加公式前的普通文本
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        inlineContent.push({
          type: 'text',
          content: textBefore
        });
      }
    }
    
    // 添加行内公式
    inlineContent.push({
      type: 'inline-math',
      latex: match[1].trim()
    });
    
    lastIndex = inlineMathRegex.lastIndex;
  }
  
  // 添加剩余的普通文本
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText.trim()) {
      inlineContent.push({
        type: 'text',
        content: remainingText
      });
    }
  }
  
  // 如果没有匹配到任何公式，则整个文本作为普通文本
  if (inlineContent.length === 0 && text.trim()) {
    inlineContent.push({
      type: 'text',
      content: text
    });
  }
  
  return inlineContent;
}

/**
 * 清理列表项文本，删除序号或符号前缀
 * @param item 列表项文本
 * @returns 清理后的文本
 */
function cleanListItemText(item: string): string {
  const trimmedItem = item.trim();
  
  // 移除有序列表前缀：1.、(1)、1) 等
  const orderedMatch = trimmedItem.match(/^(\d+\.|\(\d+\)|\d+\))\s*(.*)$/);
  if (orderedMatch) {
    return orderedMatch[2].trim();
  }
  
  // 移除无序列表前缀：•、-、*、·、◦、‣、⁃ 等
  const unorderedMatch = trimmedItem.match(/^[•\-\*\·\◦\‣\⁃]\s*(.*)$/);
  if (unorderedMatch) {
    return unorderedMatch[1].trim();
  }
  
  // 如果没有匹配到前缀，返回原始文本
  return trimmedItem;
}

/**
 * 将PDF列表块转换为有序列表块
 * @param pdfBlock PDF列表块
 * @returns 转换后的有序列表块
 */
export function pdfListBlockToOrderedListBlock(pdfBlock: PdfListBlock): OrderedListBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'list' || !pdfBlock.list_items || pdfBlock.list_items.length === 0) {
    throw new Error('无效的PDF列表块');
  }

  // 解析每个列表项，转换为内联内容
  const items = pdfBlock.list_items.map(item => {
    // 清理列表项文本，删除序号前缀
    const cleanedItem = cleanListItemText(item);
    const inlineContent = parseMarkdownToInlineContent(cleanedItem);
    return {
      content: {
        en: inlineContent
      }
    };
  });

  // 构建有序列表块
  const orderedListBlock: OrderedListBlock = {
    id: generateId('ordered-list'),
    type: 'ordered-list',
    items: items,
    start: 1 // 默认从1开始
  };

  return orderedListBlock;
}

/**
 * 将PDF列表块转换为无序列表块
 * @param pdfBlock PDF列表块
 * @returns 转换后的无序列表块
 */
export function pdfListBlockToUnorderedListBlock(pdfBlock: PdfListBlock): UnorderedListBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'list' || !pdfBlock.list_items || pdfBlock.list_items.length === 0) {
    throw new Error('无效的PDF列表块');
  }

  // 解析每个列表项，转换为内联内容
  const items = pdfBlock.list_items.map(item => {
    // 清理列表项文本，删除符号前缀
    const cleanedItem = cleanListItemText(item);
    const inlineContent = parseMarkdownToInlineContent(cleanedItem);
    return {
      content: {
        en: inlineContent
      }
    };
  });

  // 构建无序列表块
  const unorderedListBlock: UnorderedListBlock = {
    id: generateId('unordered-list'),
    type: 'unordered-list',
    items: items
  };

  return unorderedListBlock;
}

/**
 * 检查PDF列表块是否可以转换为有序列表块
 * @param pdfBlock PDF列表块
 * @returns 是否可以转换
 */
export function canConvertToOrderedList(pdfBlock: any): pdfBlock is PdfListBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'list' &&
    pdfBlock.sub_type === 'text' && // 只处理 text 类型的列表
    pdfBlock.list_items &&
    Array.isArray(pdfBlock.list_items) &&
    pdfBlock.list_items.length > 0 &&
    // 检查是否是有序列表（以数字开头，如 "1."、"(1)"等）
    pdfBlock.list_items.some((item: string) => {
      const trimmedItem = item.trim();
      return /^\d+\./.test(trimmedItem) || // 1. 格式
             /^\(\d+\)/.test(trimmedItem) || // (1) 格式
             /^\d+\)/.test(trimmedItem); // 1) 格式
    })
  );
}

/**
 * 检查PDF列表块是否可以转换为无序列表块
 * @param pdfBlock PDF列表块
 * @returns 是否可以转换
 */
export function canConvertToUnorderedList(pdfBlock: any): pdfBlock is PdfListBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'list' &&
    pdfBlock.sub_type === 'text' && // 只处理 text 类型的列表
    pdfBlock.list_items &&
    Array.isArray(pdfBlock.list_items) &&
    pdfBlock.list_items.length > 0 &&
    // 检查是否是无序列表（以符号开头，如 •、-、* 等）
    pdfBlock.list_items.some((item: string) => {
      const trimmedItem = item.trim();
      return /^[•\-\*\·\◦\‣\⁃]\s/.test(trimmedItem); // 明确以无序列表符号开头
    })
  );
}

/**
 * 检查PDF列表块是否可以转换为列表块（有序或无序）
 * @param pdfBlock PDF列表块
 * @returns 是否可以转换
 */
export function canConvertToList(pdfBlock: any): pdfBlock is PdfListBlock {
  return canConvertToOrderedList(pdfBlock) || canConvertToUnorderedList(pdfBlock);
}

/**
 * 自动检测列表类型并转换为相应的列表块
 * @param pdfBlock PDF列表块
 * @returns 转换后的列表块（有序或无序）
 */
export function pdfListBlockToListBlock(pdfBlock: PdfListBlock): OrderedListBlock | UnorderedListBlock {
  if (canConvertToOrderedList(pdfBlock)) {
    return pdfListBlockToOrderedListBlock(pdfBlock);
  } else if (canConvertToUnorderedList(pdfBlock)) {
    return pdfListBlockToUnorderedListBlock(pdfBlock);
  } else {
    // 默认转换为无序列表
    return pdfListBlockToUnorderedListBlock(pdfBlock);
  }
}

/**
 * 将PDF公式块转换为数学公式块
 * @param pdfBlock PDF公式块
 * @returns 转换后的数学公式块
 */
export function pdfEquationBlockToMathBlock(pdfBlock: PdfEquationBlock): MathBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'equation' || !pdfBlock.text) {
    throw new Error('无效的PDF公式块');
  }

  // 处理公式文本，去除两侧的 $$ 符号和 \tag
  let processedLatex = pdfBlock.text.trim();
  
  // 去除两侧的 $$ 符号
  if (processedLatex.startsWith('$$') && processedLatex.endsWith('$$')) {
    processedLatex = processedLatex.slice(2, -2).trim();
  } else if (processedLatex.startsWith('\\[') && processedLatex.endsWith('\\]')) {
    processedLatex = processedLatex.slice(2, -2).trim();
  }
  
  // 去除 \tag{...} 部分，处理可能包含空格和复杂内容的情况
  processedLatex = processedLatex.replace(/\\tag\s*\{[^}]*\}/g, '').trim();
  
  // 去除可能的多余换行符
  processedLatex = processedLatex.replace(/\n+/g, ' ').trim();

  // 构建数学公式块
  const mathBlock: MathBlock = {
    id: generateId('math'),
    type: 'math',
    latex: processedLatex
  };

  return mathBlock;
}

/**
 * 检查PDF公式块是否可以转换为数学公式块
 * @param pdfBlock PDF公式块
 * @returns 是否可以转换
 */
export function canConvertToMathBlock(pdfBlock: any): pdfBlock is PdfEquationBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'equation' &&
    pdfBlock.text &&
    typeof pdfBlock.text === 'string' &&
    pdfBlock.text.trim().length > 0
  );
}

/**
 * 将PDF图片块转换为图片块
 * @param pdfBlock PDF图片块
 * @returns 转换后的图片块
 */
export function pdfImageBlockToFigureBlock(pdfBlock: PdfImageBlock, paperId?: string): FigureBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'image') {
    throw new Error('无效的PDF图片块');
  }

  // 处理图片标题
  let captionContent: { en?: InlineContent[] } = {};
  if (pdfBlock.image_caption && pdfBlock.image_caption.length > 0) {
    const captionText = pdfBlock.image_caption.join(' ').trim();
    if (captionText) {
      captionContent.en = [{
        type: 'text',
        content: captionText
      }];
    }
  }

  // 处理图片脚注
  let descriptionContent: { en?: InlineContent[] } = {};
  if (pdfBlock.image_footnote && pdfBlock.image_footnote.length > 0) {
    const footnoteText = pdfBlock.image_footnote.join(' ').trim();
    if (footnoteText) {
      descriptionContent.en = [{
        type: 'text',
        content: footnoteText
      }];
    }
  }

  // 处理图片URL，确保完整路径
  let imageSrc = '';
  if (pdfBlock.img_path) {
    // 如果已经是完整URL（以http开头），直接使用
    if (pdfBlock.img_path.startsWith('http')) {
      imageSrc = pdfBlock.img_path;
    }
    // 如果是相对路径（以images/开头），需要拼接完整URL
    else if (pdfBlock.img_path.startsWith('images/')) {
      if (paperId) {
        // 使用配置的图片域名和论文ID拼接URL
        imageSrc = buildImageUrl(paperId, pdfBlock.img_path);
      } else {
        // 如果没有提供paperId，尝试从路径中提取或使用默认格式
        const imageDomain = 'https://image.neuwiki.top';
        imageSrc = `${imageDomain}/neuink/${pdfBlock.img_path}`;
      }
    }
    // 其他情况，直接使用原始路径
    else {
      imageSrc = pdfBlock.img_path;
    }
  }

  // 构建图片块
  const figureBlock: FigureBlock = {
    id: generateId('figure'),
    type: 'figure',
    src: imageSrc,
    alt: pdfBlock.image_caption ? pdfBlock.image_caption.join(' ') : undefined, // 使用标题作为alt文本
    caption: captionContent,
    description: descriptionContent
  };

  return figureBlock;
}

/**
 * 检查PDF图片块是否可以转换为图片块
 * @param pdfBlock PDF图片块
 * @returns 是否可以转换
 */
export function canConvertToFigureBlock(pdfBlock: any): pdfBlock is PdfImageBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'image'
  );
}

/**
 * 将PDF表格块转换为表格块
 * @param pdfBlock PDF表格块
 * @returns 转换后的表格块
 */
export function pdfTableBlockToTableBlock(pdfBlock: PdfTableBlock): TableBlock {
  // 验证输入
  if (!pdfBlock || pdfBlock.type !== 'table') {
    throw new Error('无效的PDF表格块');
  }

  // 处理表格标题，确保包含中英文版本
  let captionContent: { en?: InlineContent[]; zh?: InlineContent[] } = {};
  if (pdfBlock.table_caption && pdfBlock.table_caption.length > 0) {
    const captionText = pdfBlock.table_caption.join(' ').trim();
    if (captionText) {
      captionContent.en = [{
        type: 'text',
        content: captionText
      }];
      // 暂时将英文标题复制到中文字段，后续可以通过翻译功能更新
      captionContent.zh = [{
        type: 'text',
        content: captionText
      }];
    }
  }

  // 直接使用 table_body 作为 HTML 内容
  let htmlContent = '<table><tr><td>空表格</td></tr></table>';
  
  if (pdfBlock.table_body && pdfBlock.table_body.trim()) {
    htmlContent = pdfBlock.table_body.trim();
  }

  // 构建表格块
  const tableBlock: TableBlock = {
    id: generateId('table'),
    type: 'table',
    caption: captionContent,
    content: htmlContent
  };

  return tableBlock;
}

/**
 * 检查PDF表格块是否可以转换为表格块
 * @param pdfBlock PDF表格块
 * @returns 是否可以转换
 */
export function canConvertToTableBlock(pdfBlock: any): pdfBlock is PdfTableBlock {
  return (
    pdfBlock &&
    pdfBlock.type === 'table'
  );
}