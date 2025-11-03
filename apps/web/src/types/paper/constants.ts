export const HEADER_HEIGHT = 112;
export const NOTES_PANEL_WIDTH = 320;
export const NOTES_PANEL_GAP = 32;
export const NOTES_PANEL_SHIFT = (NOTES_PANEL_WIDTH + NOTES_PANEL_GAP) / 2;
export const NOTES_PANEL_TOP = HEADER_HEIGHT + 24;

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  paragraph: '段落',
  heading: '标题',
  math: '公式',
  figure: '图示',
  table: '表格',
  code: '代码',
  'ordered-list': '有序列表',
  'unordered-list': '无序列表',
  quote: '引用',
  divider: '分隔线',
};