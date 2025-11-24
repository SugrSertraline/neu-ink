import type { TableBlock } from '@/types/paper/content';

/**
 * HTML表格解析器，将HTML表格代码转换为TableBlock格式
 * 现在直接返回HTML字符串，不再解析为复杂的行列结构
 */
export function parseHtmlTable(html: string): Partial<TableBlock> {
  // 验证HTML表格代码
  const validation = validateHtmlTable(html);
  if (!validation.isValid) {
    throw new Error(validation.error || '无效的HTML表格代码');
  }
  
  // 直接返回HTML字符串作为content
  return {
    content: html.trim(),
  };
}

/**
 * 将TableBlock转换为HTML表格字符串
 * 现在直接返回存储的HTML内容
 */
export function tableBlockToHtml(tableBlock: TableBlock): string {
  return tableBlock.content || '<table><tr><td>空表格</td></tr></table>';
}

/**
 * 验证HTML表格代码是否有效
 */
export function validateHtmlTable(html: string): { isValid: boolean; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    
    if (!table) {
      return { isValid: false, error: '未找到table标签' };
    }
    
    const rows = table.querySelectorAll('tr');
    if (rows.length === 0) {
      return { isValid: false, error: '表格中没有行(tr)' };
    }
    
    let hasCells = false;
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length > 0) {
        hasCells = true;
      }
    });
    
    if (!hasCells) {
      return { isValid: false, error: '表格中没有单元格(td或th)' };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
}