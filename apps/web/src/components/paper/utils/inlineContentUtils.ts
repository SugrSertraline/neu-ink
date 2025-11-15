// 文本样式应用工具函数（重写版）

import { TextNode, InlineContent } from "@/types/paper";

/**
 * 字符级别的数据结构
 */
interface CharInfo {
  char: string;
  style: TextNode['style'];
  nodeType: InlineContent['type'];
  nodeData?: any; // 保存非text节点的原始数据
}

/**
 * 将 InlineContent 数组展平为字符数组
 */
function flattenToChars(nodes: InlineContent[]): CharInfo[] {
  const chars: CharInfo[] = [];
  
  for (const node of nodes) {
    if (node.type === 'text') {
      const textNode = node as TextNode;
      for (const char of textNode.content) {
        chars.push({
          char,
          style: { ...textNode.style },
          nodeType: 'text'
        });
      }
    } else {
      // 非text节点，保留原样（如链接、公式等）
      // 这里简化处理，将整个节点作为一个"字符"
      const placeholder = getNodePlaceholder(node);
      chars.push({
        char: placeholder,
        style: {},
        nodeType: node.type,
        nodeData: node
      });
    }
  }
  
  return chars;
}

/**
 * 获取非text节点的占位符（用于匹配选中文本）
 */
function getNodePlaceholder(node: InlineContent): string {
  switch (node.type) {
    case 'link':
      return flattenToChars(node.children).map((c) => c.char).join('');
    case 'inline-math': {
      const latex = node.latex?.trim() ?? '';
      return latex ? `$${latex}$` : '';
    }
    case 'citation':
      return node.displayText ?? '';
    case 'figure-ref':
    case 'table-ref':
    case 'equation-ref':
    case 'section-ref':
    case 'footnote':
      return node.displayText ?? '';
    default:
      return '';
  }
}
/**
 * 将字符数组重新组合为 InlineContent 数组
 */
function charsToInline(chars: CharInfo[]): InlineContent[] {
  const result: InlineContent[] = [];
  let i = 0;
  
  while (i < chars.length) {
    const current = chars[i];
    
    // 非text节点，直接添加
    if (current.nodeType !== 'text') {
      result.push(current.nodeData);
      i++;
      continue;
    }
    
    // text节点，合并相同样式的连续字符
    let content = current.char;
    const style = current.style;
    i++;
    
    while (i < chars.length && chars[i].nodeType === 'text' && isSameStyle(chars[i].style, style)) {
      content += chars[i].char;
      i++;
    }
    
    result.push({
      type: 'text',
      content,
      style: Object.keys(style || {}).length > 0 ? style : undefined
    } as TextNode);
  }
  
  return result;
}

/**
 * 比较两个样式是否相同
 */
function isSameStyle(style1?: TextNode['style'], style2?: TextNode['style']): boolean {
  const s1 = style1 || {};
  const s2 = style2 || {};
  
  const keys1 = Object.keys(s1).sort();
  const keys2 = Object.keys(s2).sort();
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (s1[key as keyof typeof s1] !== s2[key as keyof typeof s2]) {
      return false;
    }
  }
  
  return true;
}

/**
 * 获取纯文本内容（用于匹配选中文本）
 */
function getPlainText(chars: CharInfo[]): string {
  return chars.map(c => c.char).join('');
}

/**
 * 在 InlineContent 数组中对指定范围的文本应用样式
 */
export function applyStyleToSelection(
  nodes: InlineContent[],
  selectionText: string,
  styleUpdate: Partial<TextNode['style']>
): InlineContent[] {
  if (!nodes || nodes.length === 0 || !selectionText) return nodes;
  
  // 1. 展平为字符数组
  const chars = flattenToChars(nodes);
  const plainText = getPlainText(chars);
  
  // 2. 查找选中文本的位置
  const startIndex = plainText.indexOf(selectionText);
  if (startIndex === -1) return nodes; // 未找到，返回原数组
  
  const endIndex = startIndex + selectionText.length;
  
  // 3. 应用样式到选中范围
  for (let i = startIndex; i < endIndex && i < chars.length; i++) {
    if (chars[i].nodeType === 'text') {
      chars[i].style = {
        ...chars[i].style,
        ...styleUpdate
      };
    }
  }
  
  // 4. 重新组合
  return charsToInline(chars);
}

/**
 * 切换加粗样式
 */
export function toggleBold(nodes: InlineContent[], selectionText: string): InlineContent[] {
  if (!nodes || nodes.length === 0 || !selectionText) return nodes;
  
  // 检查选中文本是否已经全部加粗
  const chars = flattenToChars(nodes);
  const plainText = getPlainText(chars);
  const startIndex = plainText.indexOf(selectionText);
  
  if (startIndex === -1) return nodes;
  
  const endIndex = startIndex + selectionText.length;
  let allBold = true;
  
  for (let i = startIndex; i < endIndex && i < chars.length; i++) {
    if (chars[i].nodeType === 'text' && !chars[i].style?.bold) {
      allBold = false;
      break;
    }
  }
  
  // 如果全部加粗，则取消加粗；否则加粗
  if (allBold) {
    return applyStyleToSelection(nodes, selectionText, { bold: undefined });
  } else {
    return applyStyleToSelection(nodes, selectionText, { bold: true });
  }
}

/**
 * 应用文字颜色
 */
export function applyTextColor(nodes: InlineContent[], selectionText: string, color: string): InlineContent[] {
  return applyStyleToSelection(nodes, selectionText, { color: color || undefined });
}

/**
 * 应用背景颜色
 */
export function applyBackgroundColor(nodes: InlineContent[], selectionText: string, backgroundColor: string): InlineContent[] {
  return applyStyleToSelection(nodes, selectionText, { backgroundColor: backgroundColor || undefined });
}

/**
 * 🆕 清除所有样式
 */
export function clearAllStyles(nodes: InlineContent[], selectionText: string): InlineContent[] {
  if (!nodes || nodes.length === 0 || !selectionText) return nodes;
  
  const chars = flattenToChars(nodes);
  const plainText = getPlainText(chars);
  const startIndex = plainText.indexOf(selectionText);
  
  if (startIndex === -1) return nodes;
  
  const endIndex = startIndex + selectionText.length;
  
  // 清除选中范围的所有样式
  for (let i = startIndex; i < endIndex && i < chars.length; i++) {
    if (chars[i].nodeType === 'text') {
      chars[i].style = {};
    }
  }
  
  return charsToInline(chars);
}

/**
 * 🆕 切换斜体样式
 */
export function toggleItalic(nodes: InlineContent[], selectionText: string): InlineContent[] {
  if (!nodes || nodes.length === 0 || !selectionText) return nodes;
  
  const chars = flattenToChars(nodes);
  const plainText = getPlainText(chars);
  const startIndex = plainText.indexOf(selectionText);
  
  if (startIndex === -1) return nodes;
  
  const endIndex = startIndex + selectionText.length;
  let allItalic = true;
  
  for (let i = startIndex; i < endIndex && i < chars.length; i++) {
    if (chars[i].nodeType === 'text' && !chars[i].style?.italic) {
      allItalic = false;
      break;
    }
  }
  
  if (allItalic) {
    return applyStyleToSelection(nodes, selectionText, { italic: undefined });
  } else {
    return applyStyleToSelection(nodes, selectionText, { italic: true });
  }
}

/**
 * 🆕 切换下划线样式
 */
export function toggleUnderline(nodes: InlineContent[], selectionText: string): InlineContent[] {
  if (!nodes || nodes.length === 0 || !selectionText) return nodes;
  
  const chars = flattenToChars(nodes);
  const plainText = getPlainText(chars);
  const startIndex = plainText.indexOf(selectionText);
  
  if (startIndex === -1) return nodes;
  
  const endIndex = startIndex + selectionText.length;
  let allUnderline = true;
  
  for (let i = startIndex; i < endIndex && i < chars.length; i++) {
    if (chars[i].nodeType === 'text' && !chars[i].style?.underline) {
      allUnderline = false;
      break;
    }
  }
  
  if (allUnderline) {
    return applyStyleToSelection(nodes, selectionText, { underline: undefined });
  } else {
    return applyStyleToSelection(nodes, selectionText, { underline: true });
  }
}