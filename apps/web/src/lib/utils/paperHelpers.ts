import type {
    Reference,
    BlockContent,
    Section,
    InlineContent,
    ParagraphBlock,
  } from '@/types/paper';
  
  export const generateId = (prefix: string) => {
    // 生成 UUID v4 格式的 ID
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // 如果没有前缀，直接返回 UUID
    if (!prefix) {
      return generateUUID();
    }
    
    // 如果有前缀，返回 UUID（不再使用前缀，保持与后端一致的格式）
    return generateUUID();
  };
  
  export const createEmptyReference = (): Reference => ({
    id: generateId('ref'),
    authors: ['Unnamed author'],
    title: 'Untitled reference',
    publication: '',
    year: new Date().getFullYear(),
  });
  
  export const cloneReferenceEntry = (reference: Reference): Reference => ({
    ...reference,
    authors: Array.isArray(reference.authors) ? [...reference.authors] : [],
    title: reference.title ?? '',
    publication: reference.publication ?? '',
    year: reference.year ?? new Date().getFullYear(),
  });
  
  export const cloneBlock = (block: BlockContent): BlockContent => {
    if (!block || !block.type) {
      return {
        id: generateId('paragraph'),
        type: 'paragraph',
        align: 'left',
        content: {
          en: [{ type: 'text', content: 'New paragraph' }],
        },
      };
    }
  
    try {
      if (typeof structuredClone !== 'undefined') {
        return structuredClone(block);
      }
      return JSON.parse(
        JSON.stringify(block, (key, value) => (value === undefined ? null : value)),
      );
    } catch (error) {
      const cloned = { ...block };
      cloned.id = generateId(block.type);
      return cloned;
    }
  };
  
  export const createEmptySection = (): Section => ({
    id: generateId('section'),
    title: 'Untitled Section',
    titleZh: '未命名章节',
    content: [],
  });
  
  export const createBlock = (
    type: BlockContent['type'],
    lang: 'en' | 'both'
  ): BlockContent => {
    const id = generateId(type);
  
    switch (type) {
      case 'paragraph':
        return {
          id,
          type: 'paragraph',
          align: 'left',
          content: {
            en: [{ type: 'text', content: 'New paragraph' }],
            ...(lang === 'both' && { zh: [{ type: 'text', content: '新的段落' }] }),
          },
        };
      case 'heading':
        return {
          id,
          type: 'heading',
          level: 2,
          content: {
            en: [{ type: 'text', content: 'New Heading' }],
            ...(lang === 'both' && { zh: [{ type: 'text', content: '新标题' }] }),
          },
        };
      case 'math':
        return {
          id,
          type: 'math',
          latex: 'E = mc^2',
        };
      case 'figure':
        return {
          id,
          type: 'figure',
          src: '',
          caption: {
            en: [{ type: 'text', content: 'Figure caption' }],
            ...(lang === 'both' && { zh: [{ type: 'text', content: '图片标题' }] }),
          },
        };
      case 'table':
        return {
          id,
          type: 'table',
          headers: [
            {
              cells: [
                { content: 'Column 1', isHeader: true },
                { content: 'Column 2', isHeader: true }
              ]
            }
          ],
          rows: [
            {
              cells: [
                { content: 'Row 1 Col 1' },
                { content: 'Row 1 Col 2' }
              ]
            },
            {
              cells: [
                { content: 'Row 2 Col 1' },
                { content: 'Row 2 Col 2' }
              ]
            }
          ],
          caption: {
            en: [{ type: 'text', content: 'Table caption' }],
            ...(lang === 'both' && { zh: [{ type: 'text', content: '表格标题' }] }),
          },
        };
      case 'code':
        return {
          id,
          type: 'code',
          language: 'javascript',
          code: '// Your code here',
          caption: {
            en: [{ type: 'text', content: 'Code example' }],
            ...(lang === 'both' && { zh: [{ type: 'text', content: '代码示例' }] }),
          },
        };
      case 'ordered-list':
        return {
          id,
          type: 'ordered-list',
          start: 1,
          items: [
            {
              content: {
                en: [{ type: 'text', content: 'First item' }],
                ...(lang === 'both' && { zh: [{ type: 'text', content: '第一项' }] }),
              },
            },
            {
              content: {
                en: [{ type: 'text', content: 'Second item' }],
                ...(lang === 'both' && { zh: [{ type: 'text', content: '第二项' }] }),
              },
            },
          ],
        };
      case 'unordered-list':
        return {
          id,
          type: 'unordered-list',
          items: [
            {
              content: {
                en: [{ type: 'text', content: 'First item' }],
                ...(lang === 'both' && { zh: [{ type: 'text', content: '第一项' }] }),
              },
            },
            {
              content: {
                en: [{ type: 'text', content: 'Second item' }],
                ...(lang === 'both' && { zh: [{ type: 'text', content: '第二项' }] }),
              },
            },
          ],
        };
      case 'quote':
        return {
          id,
          type: 'quote',
          author: 'Author',
          content: {
            en: [{ type: 'text', content: 'Quote text' }],
            ...(lang === 'both' && { zh: [{ type: 'text', content: '引用文本' }] }),
          },
        };
      case 'divider':
        return {
          id,
          type: 'divider',
        };
      default:
        return createBlock('paragraph', lang);
    }
  };
  
  export const createPlaceholderParagraph = (lang: 'en' | 'both'): ParagraphBlock => {
    const content: ParagraphBlock['content'] = {
      en: [{ type: 'text', content: 'New paragraph' }],
    };
    if (lang === 'both') {
      content.zh = [{ type: 'text', content: '新的段落' }];
    }
    return {
      id: generateId('paragraph'),
      type: 'paragraph',
      align: 'left',
      content,
    };
  };
  
  export const extractPlainText = (nodes: InlineContent[]): string => {
    const visit = (nodeList: InlineContent[]): string =>
      nodeList
        .map(node => {
          if (!node) return '';
          const data = node as any;
          switch (data.type) {
            case 'text':
              return data.content ?? '';
            case 'math':
              return data.content ?? data.latex ?? '';
            case 'link':
            case 'strong':
            case 'emphasis':
            case 'underline':
            case 'subscript':
            case 'superscript':
            case 'reference':
              return visit(Array.isArray(data.children) ? data.children : []);
            default:
              if (Array.isArray(data.children)) return visit(data.children);
              return '';
          }
        })
        .join('');
    return visit(nodes).trim();
  };
  