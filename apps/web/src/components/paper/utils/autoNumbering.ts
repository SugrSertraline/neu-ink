// frontend/app/papers/[id]/utils/autoNumbering.ts

import { PaperContent, Section, BlockContent, Reference } from "@/types/paper";


/**
 * 自动计算所有编号
 */
export function calculateAllNumbers(content: PaperContent): PaperContent {
  const newContent = JSON.parse(JSON.stringify(content)) as PaperContent;
  
  // 1. 计算章节编号
  calculateSectionNumbers(newContent.sections);
  
  // 2. 收集所有块元素并编号
  const allBlocks = collectAllBlocks(newContent.sections);
  calculateFigureNumbers(allBlocks);
  calculateTableNumbers(allBlocks);
  calculateMathNumbers(allBlocks);
  
  // 3. 计算参考文献编号
  calculateReferenceNumbers(newContent.references);
  
  return newContent;
}

/**
 * 递归计算章节编号（1, 1.1, 1.1.1 格式）
 */
function calculateSectionNumbers(sections: Section[], prefix: string = ''): void {
  sections.forEach((section, index) => {
    const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
    section.number = number;
    
    if (section.subsections && section.subsections.length > 0) {
      calculateSectionNumbers(section.subsections, number);
    }
  });
}

/**
 * 收集所有块元素（递归遍历 sections）
 */
function collectAllBlocks(sections: Section[]): BlockContent[] {
  const blocks: BlockContent[] = [];
  
  function traverse(secs: Section[]) {
    secs.forEach(section => {
      blocks.push(...section.content);
      if (section.subsections) {
        traverse(section.subsections);
      }
    });
  }
  
  traverse(sections);
  return blocks;
}

/**
 * 计算图片编号（全局连续）
 */
function calculateFigureNumbers(blocks: BlockContent[]): void {
  let figureCount = 0;
  blocks.forEach(block => {
    if (block.type === 'figure') {
      figureCount++;
      block.number = figureCount;
    }
  });
}

/**
 * 计算表格编号（全局连续）
 */
function calculateTableNumbers(blocks: BlockContent[]): void {
  let tableCount = 0;
  blocks.forEach(block => {
    if (block.type === 'table') {
      tableCount++;
      block.number = tableCount;
    }
  });
}

/**
 * 计算公式编号（所有公式都编号）
 */
function calculateMathNumbers(blocks: BlockContent[]): void {
  let mathCount = 0;
  blocks.forEach(block => {
    if (block.type === 'math') {
      mathCount++;
      block.number = mathCount;
    }
  });
}

/**
 * 计算参考文献编号
 */
function calculateReferenceNumbers(references: Reference[]): void {
  references.forEach((ref, index) => {
    ref.number = index + 1;
  });
}

/**
 * 在保存前清理所有编号（让后端或下次渲染重新计算）
 */
export function stripAllNumbers(content: PaperContent): PaperContent {
  const newContent = JSON.parse(JSON.stringify(content)) as PaperContent;
  
  function stripSection(section: Section) {
    delete section.number;
    section.content.forEach(block => {
      if ('number' in block) {
        delete (block as any).number;
      }
    });
    if (section.subsections) {
      section.subsections.forEach(stripSection);
    }
  }
  
  newContent.sections.forEach(stripSection);
  newContent.references.forEach(ref => {
    delete ref.number;
  });
  
  return newContent;
}