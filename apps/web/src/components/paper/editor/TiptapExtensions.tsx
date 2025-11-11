// TiptapExtensions.tsx
// ✅ 这个文件完全正确，无需修改！
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

// ============= 文献引用扩展 =============
export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      referenceIds: {
        default: [],
        parseHTML: element => element.getAttribute('data-reference-ids')?.split(',') || [],
        renderHTML: attributes => ({
          'data-reference-ids': attributes.referenceIds.join(','),
        }),
      },
      displayText: {
        default: '',
        parseHTML: element => element.getAttribute('data-display-text') || '',
        renderHTML: attributes => ({
          'data-display-text': attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="citation"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const displayText = node.attrs.displayText || `[${node.attrs.referenceIds.join(',')}]`;    
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-type': 'citation',
      class: 'inline-block px-1.5 py-0.5 mx-0.5 bg-green-100 text-green-800 rounded-md text-xs font-medium cursor-pointer hover:bg-green-200',
      contenteditable: 'false',
    }), displayText];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationComponent);
  },
});

function CitationComponent({ node }: any) {
  return (
    <NodeViewWrapper as="span" className="inline-block px-1.5 py-0.5 mx-0.5 bg-green-100 text-green-800 rounded-md text-xs font-medium cursor-pointer hover:bg-green-200">
      {node.attrs.displayText || `[${node.attrs.referenceIds.join(',')}]`}
    </NodeViewWrapper>
  );
}

// ============= 图片引用扩展 =============
export const FigureRef = Node.create({
  name: 'figureRef',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      figureId: { 
        default: '',
        parseHTML: element => element.getAttribute('data-figure-id') || '',
        renderHTML: attributes => ({
          'data-figure-id': attributes.figureId,
        }),
      },
      displayText: { 
        default: '',
        parseHTML: element => element.getAttribute('data-display-text') || '',
        renderHTML: attributes => ({
          'data-display-text': attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="figure-ref"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-type': 'figure-ref',
      class: 'inline-block px-1.5 py-0.5 mx-0.5 bg-purple-100 text-purple-800 rounded-md text-xs font-medium cursor-pointer hover:bg-purple-200',
      contenteditable: 'false',
    }), node.attrs.displayText || ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureRefComponent);
  },
});

function FigureRefComponent({ node }: any) {
  // 获取图片元素和编号
  const figureElement = node.attrs.figureId ? document.getElementById(node.attrs.figureId) : null;
  const figureNumber = figureElement?.querySelector('.text-gray-800')?.textContent?.replace('Figure ', '').replace('.', '') || '';
  const imgElement = figureElement?.querySelector('img') as HTMLImageElement | null;
  
  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex items-center gap-1 px-2 py-1 mx-0.5 bg-purple-50 border border-purple-200 rounded-md text-purple-700 text-xs font-medium cursor-pointer hover:bg-purple-100"
      title={`跳转到图：Figure ${figureNumber}`}
    >
      {imgElement && (
        <img
          src={imgElement.currentSrc || imgElement.src}
          alt="figure thumbnail"
          className="w-6 h-6 object-cover rounded border border-gray-200"
        />
      )}
      <span>
        {node.attrs.displayText || `Figure ${figureNumber}`}
      </span>
    </NodeViewWrapper>
  );
}

// ============= 表格引用扩展 =============
export const TableRef = Node.create({
  name: 'tableRef',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      tableId: { 
        default: '',
        parseHTML: element => element.getAttribute('data-table-id') || '',
        renderHTML: attributes => ({
          'data-table-id': attributes.tableId,
        }),
      },
      displayText: { 
        default: '',
        parseHTML: element => element.getAttribute('data-display-text') || '',
        renderHTML: attributes => ({
          'data-display-text': attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="table-ref"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-type': 'table-ref',
      class: 'inline-block px-1.5 py-0.5 mx-0.5 bg-orange-100 text-orange-800 rounded-md text-xs font-medium cursor-pointer hover:bg-orange-200',
      contenteditable: 'false',
    }), node.attrs.displayText || ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableRefComponent);
  },
});

function TableRefComponent({ node }: any) {
  return (
    <NodeViewWrapper as="span" className="inline-block px-1.5 py-0.5 mx-0.5 bg-orange-100 text-orange-800 rounded-md text-xs font-medium cursor-pointer hover:bg-orange-200">
      {node.attrs.displayText}
    </NodeViewWrapper>
  );
}

// ============= 公式引用扩展 =============
export const EquationRef = Node.create({
  name: 'equationRef',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      equationId: { 
        default: '',
        parseHTML: element => element.getAttribute('data-equation-id') || '',
        renderHTML: attributes => ({
          'data-equation-id': attributes.equationId,
        }),
      },
      displayText: { 
        default: '',
        parseHTML: element => element.getAttribute('data-display-text') || '',
        renderHTML: attributes => ({
          'data-display-text': attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="equation-ref"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-type': 'equation-ref',
      class: 'inline-block px-1.5 py-0.5 mx-0.5 bg-indigo-100 text-indigo-800 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-200',
      contenteditable: 'false',
    }), node.attrs.displayText || ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EquationRefComponent);
  },
});

function EquationRefComponent({ node }: any) {
  return (
    <NodeViewWrapper as="span" className="inline-block px-1.5 py-0.5 mx-0.5 bg-indigo-100 text-indigo-800 rounded-md text-xs font-medium cursor-pointer hover:bg-indigo-200">
      {node.attrs.displayText}
    </NodeViewWrapper>
  );
}

// ============= 章节引用扩展 =============
export const SectionRef = Node.create({
  name: 'sectionRef',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      sectionId: { 
        default: '',
        parseHTML: element => element.getAttribute('data-section-id') || '',
        renderHTML: attributes => ({
          'data-section-id': attributes.sectionId,
        }),
      },
      displayText: { 
        default: '',
        parseHTML: element => element.getAttribute('data-display-text') || '',
        renderHTML: attributes => ({
          'data-display-text': attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="section-ref"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-type': 'section-ref',
      class: 'inline-block px-1.5 py-0.5 mx-0.5 bg-teal-100 text-teal-800 rounded-md text-xs font-medium cursor-pointer hover:bg-teal-200',
      contenteditable: 'false',
    }), node.attrs.displayText || ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionRefComponent);
  },
});

function SectionRefComponent({ node }: any) {
  return (
    <NodeViewWrapper as="span" className="inline-block px-1.5 py-0.5 mx-0.5 bg-teal-100 text-teal-800 rounded-md text-xs font-medium cursor-pointer hover:bg-teal-200">
      {node.attrs.displayText}
    </NodeViewWrapper>
  );
}

// ============= 脚注扩展 =============
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { 
        default: '',
        parseHTML: element => element.getAttribute('data-id') || '',
        renderHTML: attributes => ({
          'data-id': attributes.id,
        }),
      },
      content: { 
        default: '',
        parseHTML: element => element.getAttribute('data-content') || '',
        renderHTML: attributes => ({
          'data-content': attributes.content,
        }),
      },
      displayText: { 
        default: '',
        parseHTML: element => element.getAttribute('data-display-text') || '',
        renderHTML: attributes => ({
          'data-display-text': attributes.displayText,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="footnote"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-type': 'footnote',
      class: 'inline-block px-1 py-0.5 mx-0.5 bg-gray-200 text-gray-800 rounded text-xs font-medium cursor-pointer hover:bg-gray-300',
      contenteditable: 'false',
    }), `[${node.attrs.displayText || ''}]`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FootnoteComponent);
  },
});

function FootnoteComponent({ node }: any) {
  return (
    <NodeViewWrapper 
      as="span" 
      className="inline-block px-1 py-0.5 mx-0.5 bg-gray-200 text-gray-800 rounded text-xs font-medium cursor-pointer hover:bg-gray-300"
      title={node.attrs.content}
    >
      [{node.attrs.displayText}]
    </NodeViewWrapper>
  );
}

// ============= 行内公式扩展 =============
export const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: { 
        default: '',
        parseHTML: element => element.getAttribute('data-latex') || '',
        renderHTML: attributes => ({
          'data-latex': attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="inline-math"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-type': 'inline-math',
      class: 'inline-block px-2 py-0.5 mx-0.5 bg-blue-50 text-blue-700 rounded font-mono text-sm border border-blue-200',
      contenteditable: 'false',
    }), `$${node.attrs.latex || ''}$`];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathComponent);
  },
});

function InlineMathComponent({ node }: any) {
  return (
    <NodeViewWrapper as="span" className="inline-block px-2 py-0.5 mx-0.5 bg-blue-50 text-blue-700 rounded font-mono text-sm border border-blue-200">
      ${node.attrs.latex}$
    </NodeViewWrapper>
  );
}