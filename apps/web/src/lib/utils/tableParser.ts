import type { TableBlock, TableRow, TableCell } from '@/types/paper/content';

/**
 * HTML表格解析器，将HTML表格代码转换为TableBlock格式
 * 支持复杂的表格结构，包括rowspan和colspan
 * 优化处理同时跨行跨列的单元格
 */
export function parseHtmlTable(html: string): Partial<TableBlock> {
  // 创建一个临时的DOM元素来解析HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  
  if (!table) {
    throw new Error('无效的HTML表格代码');
  }

  const rows: TableRow[] = [];
  const headers: TableRow[] = [];
  
  // 获取所有行
  const allRows = Array.from(table.querySelectorAll('tr'));
  
  // 创建一个网格来跟踪单元格占用情况
  interface GridCell {
    cell?: TableCell;
    isOccupied: boolean;
    isOriginal: boolean; // 标记是否是原始单元格位置
  }
  
  // 先确定表格的最大行列数
  let maxCols = 0;
  let maxRows = allRows.length;
  
  allRows.forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll('td, th'));
    let colCount = 0;
    cells.forEach((cell) => {
      const colspan = parseInt(cell.getAttribute('colspan') || '1');
      colCount += colspan;
    });
    maxCols = Math.max(maxCols, colCount);
  });
  
  // 初始化网格
  const grid: GridCell[][] = Array(maxRows).fill(null).map(() =>
    Array(maxCols).fill(null).map(() => ({ isOccupied: false, isOriginal: false }))
  );
  
  // 检测表头行数：查找包含th标签的连续行
  const detectHeaderRows = (rows: HTMLTableRowElement[]): number => {
  let headerRowCount = 0;

  // 1. 优先规则：有 <th> 的连续行
  for (let i = 0; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('th, td'));
    const hasTh = cells.some(cell => cell.tagName.toLowerCase() === 'th');

    if (hasTh) {
      headerRowCount++;
    } else {
      break;
    }
  }

  if (headerRowCount > 0) {
    return headerRowCount;
  }

  // 2. 没有任何 <th>，尝试从第一行的 rowspan 推断
  if (rows.length > 0) {
    const firstRowCells = Array.from(rows[0].querySelectorAll('th, td'));
    if (firstRowCells.length > 0) {
      const maxRowSpan = Math.max(
        ...firstRowCells.map(cell => {
          const rs = parseInt(cell.getAttribute('rowspan') || '1', 10);
          return Number.isNaN(rs) ? 1 : rs;
        })
      );

      if (maxRowSpan > 1) {
        // 比如你的表：Model 的 rowspan=2 -> 前两行都是表头
        return maxRowSpan;
      }
    }

    // 3. 最保守的 fallback：当作第一行是表头
    return 1;
  }

  return 0;
};

  
  const headerRowCount = detectHeaderRows(allRows);
  
  // 处理每一行的单元格
  allRows.forEach((tr, rowIndex) => {
    const cells = Array.from(tr.querySelectorAll('td, th'));
    let colIndex = 0;
    
    cells.forEach((cell) => {
      // 跳过已被占用的单元格
      while (colIndex < maxCols && grid[rowIndex][colIndex].isOccupied) {
        colIndex++;
      }
      
      if (colIndex >= maxCols) return; // 防止越界
      
      const isHeader = cell.tagName.toLowerCase() === 'th';
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
      const colspan = parseInt(cell.getAttribute('colspan') || '1');
      
      // 获取单元格内容
      const cellContent = cell.innerHTML.trim();
      
      // 创建表格单元格对象
      const tableCell: TableCell = {
        content: cellContent,
        colspan: colspan > 1 ? colspan : undefined,
        rowspan: rowspan > 1 ? rowspan : undefined,
        isHeader,
      };
      
      // 在网格中标记这个单元格及其跨行跨列占用的位置
      for (let r = rowIndex; r < rowIndex + rowspan && r < maxRows; r++) {
        for (let c = colIndex; c < colIndex + colspan && c < maxCols; c++) {
          grid[r][c].isOccupied = true;
          
          // 只有原始位置标记为isOriginal=true并保存单元格引用
          if (r === rowIndex && c === colIndex) {
            grid[r][c].isOriginal = true;
            grid[r][c].cell = tableCell;
          }
        }
      }
      
      colIndex += colspan;
    });
  });
  
  // 从网格中提取行数据
  grid.forEach((gridRow, rowIndex) => {
    const currentRow: TableCell[] = [];
    
    // 只处理原始单元格位置
    gridRow.forEach((gridCell) => {
      if (gridCell.isOriginal && gridCell.cell) {
        currentRow.push(gridCell.cell);
      }
    });
    
    // 只添加非空行
    if (currentRow.length > 0) {
      // 使用表头检测逻辑：根据行索引和表头行数判断
      const isHeaderRow = rowIndex < headerRowCount;
      
      if (isHeaderRow) {
        headers.push({ cells: currentRow });
      } else {
        rows.push({ cells: currentRow });
      }
    }
  });
  
  // 如果没有明确的表头行，将第一行作为表头
  if (headers.length === 0 && rows.length > 0) {
    headers.push(rows.shift()!);
  }
  
  return {
    headers: headers.length > 0 ? headers : undefined,
    rows,
  };
}

/**
 * 将TableBlock转换为HTML表格字符串
 * 支持处理复杂的表格结构，包括跨行跨列的单元格
 */
export function tableBlockToHtml(tableBlock: TableBlock): string {
  const { headers, rows } = tableBlock;
  
  let html = '<table>\n';
  
  // 渲染表头
  if (headers && headers.length > 0) {
    headers.forEach(headerRow => {
      html += '  <tr>\n';
      headerRow.cells.forEach(cell => {
        const tag = cell.isHeader ? 'th' : 'td';
        const colspan = cell.colspan ? ` colspan="${cell.colspan}"` : '';
        const rowspan = cell.rowspan ? ` rowspan="${cell.rowspan}"` : '';
        
        // 处理单元格内容，支持复杂内容类型
        let content = '';
        if (typeof cell.content === 'string') {
          content = cell.content;
        } else if (typeof cell.content === 'object' && cell.content !== null) {
          // 处理多语言内容
          if ('en' in cell.content) {
            content = String(cell.content.en || '');
          } else if ('zh' in cell.content) {
            content = String(cell.content.zh || '');
          } else {
            content = JSON.stringify(cell.content);
          }
        } else {
          content = String(cell.content || '');
        }
        
        html += `    <${tag}${colspan}${rowspan}>${content}</${tag}>\n`;
      });
      html += '  </tr>\n';
    });
  }
  
  // 渲染数据行
  if (rows && rows.length > 0) {
    rows.forEach(row => {
      html += '  <tr>\n';
      row.cells.forEach(cell => {
        const tag = cell.isHeader ? 'th' : 'td';
        const colspan = cell.colspan ? ` colspan="${cell.colspan}"` : '';
        const rowspan = cell.rowspan ? ` rowspan="${cell.rowspan}"` : '';
        
        // 处理单元格内容，支持复杂内容类型
        let content = '';
        if (typeof cell.content === 'string') {
          content = cell.content;
        } else if (typeof cell.content === 'object' && cell.content !== null) {
          // 处理多语言内容
          if ('en' in cell.content) {
            content = String(cell.content.en || '');
          } else if ('zh' in cell.content) {
            content = String(cell.content.zh || '');
          } else {
            content = JSON.stringify(cell.content);
          }
        } else {
          content = String(cell.content || '');
        }
        
        html += `    <${tag}${colspan}${rowspan}>${content}</${tag}>\n`;
      });
      html += '  </tr>\n';
    });
  }
  
  html += '</table>';
  
  return html;
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