// TiptapConverters.ts
import type { InlineContent, TextNode } from '@/types/paper'; // ✅ 修复：更新导入路径
import type { JSONContent } from '@tiptap/core';

/**
 * 将 InlineContent[] 转换为 Tiptap JSON 格式
 */
export function inlineContentToTiptap(nodes: InlineContent[]): JSONContent {
  const content: JSONContent[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        const marks: any[] = [];
        
        if (node.style?.bold) marks.push({ type: 'bold' });
        if (node.style?.italic) marks.push({ type: 'italic' });
        if (node.style?.underline) marks.push({ type: 'underline' });
        if (node.style?.strikethrough) marks.push({ type: 'strike' });
        if (node.style?.code) marks.push({ type: 'code' });
        if (node.style?.color) marks.push({ type: 'textStyle', attrs: { color: node.style.color } });
        if (node.style?.backgroundColor) marks.push({ type: 'highlight', attrs: { color: node.style.backgroundColor } });

        content.push({
          type: 'text',
          text: node.content,
          marks: marks.length > 0 ? marks : undefined,
        });
        break;
      }

      case 'link': {
        content.push({
          type: 'text',
          text: extractTextFromInline(node.children),
          marks: [{ type: 'link', attrs: { href: node.url } }],
        });
        break;
      }

      case 'inline-math': {
        content.push({
          type: 'inlineMath',
          attrs: { latex: node.latex },
        });
        break;
      }

      case 'citation': {
        content.push({
          type: 'citation',
          attrs: {
            referenceIds: node.referenceIds,
            displayText: node.displayText,
          },
        });
        break;
      }

      case 'figure-ref': {
        content.push({
          type: 'figureRef',
          attrs: {
            figureId: node.figureId,
            displayText: node.displayText,
          },
        });
        break;
      }

      case 'table-ref': {
        content.push({
          type: 'tableRef',
          attrs: {
            tableId: node.tableId,
            displayText: node.displayText,
          },
        });
        break;
      }

      case 'equation-ref': {
        content.push({
          type: 'equationRef',
          attrs: {
            equationId: node.equationId,
            displayText: node.displayText,
          },
        });
        break;
      }

      case 'section-ref': {
        content.push({
          type: 'sectionRef',
          attrs: {
            sectionId: node.sectionId,
            displayText: node.displayText,
          },
        });
        break;
      }

      case 'footnote': {
        content.push({
          type: 'footnote',
          attrs: {
            id: node.id,
            content: node.content,
            displayText: node.displayText,
          },
        });
        break;
      }
    }
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: content.length > 0 ? content : undefined,
      },
    ],
  };
}

/**
 * 将 Tiptap JSON 格式转换为 InlineContent[]
 */
export function tiptapToInlineContent(doc: JSONContent): InlineContent[] {
  const result: InlineContent[] = [];

  if (!doc.content) return result;

  // 遍历段落
  for (const block of doc.content) {
    if (block.type === 'paragraph' && block.content) {
      for (const node of block.content) {
        result.push(...convertTiptapNode(node));
      }
    }
  }

  return result;
}

/**
 * 转换单个 Tiptap 节点
 */
function convertTiptapNode(node: JSONContent): InlineContent[] {
  const result: InlineContent[] = [];

  switch (node.type) {
    case 'text': {
      const style: TextNode['style'] = {};
      
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              style.bold = true;
              break;
            case 'italic':
              style.italic = true;
              break;
            case 'underline':
              style.underline = true;
              break;
            case 'strike':
              style.strikethrough = true;
              break;
            case 'code':
              style.code = true;
              break;
            case 'textStyle':
              if (mark.attrs?.color) style.color = mark.attrs.color;
              break;
            case 'highlight':
              if (mark.attrs?.color) style.backgroundColor = mark.attrs.color;
              break;
            case 'link':
              // 链接作为单独的节点处理
              result.push({
                type: 'link',
                url: mark.attrs?.href || '',
                children: [{ type: 'text', content: node.text || '' }],
              });
              return result;
          }
        }
      }

      result.push({
        type: 'text',
        content: node.text || '',
        style: Object.keys(style).length > 0 ? style : undefined,
      });
      break;
    }

    case 'inlineMath': {
      result.push({
        type: 'inline-math',
        latex: node.attrs?.latex || '',
      });
      break;
    }

    case 'citation': {
      result.push({
        type: 'citation',
        referenceIds: node.attrs?.referenceIds || [],
        displayText: node.attrs?.displayText || '',
      });
      break;
    }

    case 'figureRef': {
      result.push({
        type: 'figure-ref',
        figureId: node.attrs?.figureId || '',
        displayText: node.attrs?.displayText || '',
      });
      break;
    }

    case 'tableRef': {
      result.push({
        type: 'table-ref',
        tableId: node.attrs?.tableId || '',
        displayText: node.attrs?.displayText || '',
      });
      break;
    }

    case 'equationRef': {
      result.push({
        type: 'equation-ref',
        equationId: node.attrs?.equationId || '',
        displayText: node.attrs?.displayText || '',
      });
      break;
    }

    case 'sectionRef': {
      result.push({
        type: 'section-ref',
        sectionId: node.attrs?.sectionId || '',
        displayText: node.attrs?.displayText || '',
      });
      break;
    }

    case 'footnote': {
      result.push({
        type: 'footnote',
        id: node.attrs?.id || '',
        content: node.attrs?.content || '',
        displayText: node.attrs?.displayText || '',
      });
      break;
    }
  }

  return result;
}

/**
 * 从 InlineContent[] 提取纯文本
 */
function extractTextFromInline(nodes: InlineContent[]): string {
  return nodes.map(node => {
    if (node.type === 'text') return node.content;
    if (node.type === 'link') return extractTextFromInline(node.children);
    return '';
  }).join('');
}