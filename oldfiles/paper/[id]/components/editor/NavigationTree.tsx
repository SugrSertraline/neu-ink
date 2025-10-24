// frontend/app/papers/[id]/components/editor/NavigationTree.tsx
'use client';

import React, { useState } from 'react';
import type { Section, BlockContent } from '@/app/types/paper';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Image, 
  Table, 
  Code, 
  List,
  Quote,
  Calculator,
  Hash
} from 'lucide-react';

interface NavigationTreeProps {
  sections: Section[];
  onNavigate: (elementId: string, type: 'section' | 'block') => void;
  activeId?: string;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'section' | 'block';
  blockType?: string;
  level: number;
  children?: TreeNode[];
}

export default function NavigationTree({ 
  sections, 
  onNavigate,
  activeId 
}: NavigationTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const getBlockIcon = (blockType: string) => {
    switch (blockType) {
      case 'paragraph': return <FileText className="w-3.5 h-3.5" />;
      case 'figure': return <Image className="w-3.5 h-3.5" />;
      case 'table': return <Table className="w-3.5 h-3.5" />;
      case 'code': return <Code className="w-3.5 h-3.5" />;
      case 'math': return <Calculator className="w-3.5 h-3.5" />;
      case 'ordered-list':
      case 'unordered-list': return <List className="w-3.5 h-3.5" />;
      case 'quote': return <Quote className="w-3.5 h-3.5" />;
      default: return <Hash className="w-3.5 h-3.5" />;
    }
  };

  const getBlockTypeLabel = (blockType: string): string => {
    const typeMap: { [key: string]: string } = {
      'paragraph': 'Para',
      'figure': 'Fig',
      'table': 'Table',
      'math': 'Eq',
      'code': 'Code',
      'ordered-list': 'List',
      'unordered-list': 'List',
      'quote': 'Quote',
      'heading': 'Head'
    };
    return typeMap[blockType] || blockType;
  };

  const getBlockDescription = (block: BlockContent): string => {
    const truncate = (text: string, maxLen: number = 20) => {
      return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    };

    try {
      switch (block.type) {
        case 'paragraph':
          const paraContent = block.content?.en?.[0];
          if (paraContent && typeof paraContent === 'object' && 'content' in paraContent) {
            return truncate(paraContent.content);
          }
          return 'Paragraph';
        
        case 'figure':
          if (block.caption?.en?.[0] && typeof block.caption.en[0] === 'object' && 'content' in block.caption.en[0]) {
            return truncate(block.caption.en[0].content);
          }
          return block.number ? `Figure ${block.number}` : 'Figure';
        
        case 'table':
          if (block.caption?.en?.[0] && typeof block.caption.en[0] === 'object' && 'content' in block.caption.en[0]) {
            return truncate(block.caption.en[0].content);
          }
          return block.number ? `Table ${block.number}` : 'Table';
        
        case 'math':
          return block.label || (block.number ? `Eq ${block.number}` : 'Equation');
        
        case 'code':
          return block.language || 'Code';
        
        case 'ordered-list':
        case 'unordered-list':
          // 列表类型块使用items属性而不是content属性
          if (block.items && Array.isArray(block.items)) {
            // 尝试获取第一个列表项的内容作为描述
            if (block.items.length > 0 && block.items[0].content?.en && block.items[0].content.en.length > 0) {
              const firstItem = block.items[0].content.en[0];
              if (typeof firstItem === 'object' && 'content' in firstItem) {
                return truncate(firstItem.content);
              }
            }
            return `${block.items.length} items`;
          }
          return 'List';
        
        case 'quote':
          const quoteContent = block.content?.en?.[0];
          if (quoteContent && typeof quoteContent === 'object' && 'content' in quoteContent) {
            return truncate(quoteContent.content);
          }
          return 'Quote';
        
        default:
          return block.type;
      }
    } catch (error) {
      console.error('Error getting block description:', error, block);
      return block.type || 'Unknown';
    }
  };

  const buildTree = (sections: Section[], level: number = 0): TreeNode[] => {
    return sections.map(section => {
      const children: TreeNode[] = [];
      
      // 添加块级元素
      section.content.forEach(block => {
        try {
          const typeLabel = getBlockTypeLabel(block.type);
          const description = getBlockDescription(block);
          
          children.push({
            id: block.id,
            label: `${typeLabel}: ${description}`,
            type: 'block',
            blockType: block.type,
            level: level + 1
          });
        } catch (error) {
          console.error('Error building tree node for block:', error, block);
        }
      });
      
      // 递归添加子章节
      if (section.subsections && section.subsections.length > 0) {
        children.push(...buildTree(section.subsections, level + 1));
      }
      
      // 构建section标签
      const sectionLabel = section.number 
        ? `${section.number} ${section.title?.en || 'Untitled'}`
        : section.title?.en || 'Untitled Section';
      
      return {
        id: section.id,
        label: sectionLabel,
        type: 'section',
        level,
        children: children.length > 0 ? children : undefined
      };
    });
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderNode = (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isActive = activeId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-all ${
            isActive 
              ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          style={{ paddingLeft: `${node.level * 12 + 8}px` }}
          onClick={() => {
            onNavigate(node.id, node.type);
            if (hasChildren && node.type === 'section') {
              toggleNode(node.id);
            }
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          <div className={`flex-shrink-0 ${node.type === 'section' ? 'text-blue-600' : 'text-gray-500'}`}>
            {node.type === 'section' ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              getBlockIcon(node.blockType || '')
            )}
          </div>

          <span className={`text-xs truncate ${
            node.type === 'section' ? 'font-semibold' : 'font-normal text-gray-600'
          }`}>
            {node.label}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const treeData = buildTree(sections);

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-700 uppercase">
          目录导航
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {treeData.length > 0 ? (
          treeData.map(node => renderNode(node))
        ) : (
          <div className="text-center py-8 text-gray-400 text-xs">
            暂无内容
          </div>
        )}
      </div>
    </div>
  );
}