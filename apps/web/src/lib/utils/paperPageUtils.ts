import { NOTES_PANEL_WIDTH, NOTES_PANEL_GAP } from '@/types/paper/constants';

// 与 Tailwind 的 max-w-5xl (64rem) 对齐，使 content+notes 整体居中时宽度可控
export const CONTENT_MAX_W_REM = 64;

// 统一动画参数
export const MOTION = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
export const PANEL_DELAY_IN = 0.12;

// NEW：固定 wrapper 的最大宽度（内容 + 间距 + 面板宽度）
export const WRAPPER_MAX_W = `calc(${CONTENT_MAX_W_REM}rem + ${NOTES_PANEL_GAP}px + ${NOTES_PANEL_WIDTH}px)`;
// NEW：内容在"未显示面板"时右移半个(面板+间距)，看起来居中；显示面板时回到 0
export const CONTENT_SHIFT_X = (NOTES_PANEL_WIDTH + NOTES_PANEL_GAP) / 2;

// 获取滚动父元素
export const getScrollParent = (el: HTMLElement | null): HTMLElement | Window => {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    const oy = style.overflowY;
    if (/(auto|scroll|overlay)/.test(oy)) return node;
    node = node.parentElement;
  }
  return window; // 回退到窗口
};

// 滚动到目标元素
export const scrollToTarget = (target: HTMLElement) => {
  const scroller = getScrollParent(target);
  if (scroller === window) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    const parent = scroller as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const targetCenter = parent.scrollTop + (rect.top - parentRect.top) + (rect.height / 2) - (parentRect.height / 2);
    parent.scrollTo({ top: targetCenter, behavior: 'smooth' });
  }
};

// 目录导航
export const handleTOCNavigate = (elementId: string) => {
  let targetElement: HTMLElement | null = null;

  switch (elementId) {
    case 'metadata':
      targetElement = document.querySelector('[data-metadata="true"]') as HTMLElement;
      break;
    case 'abstract':
      targetElement = document.querySelector('[data-abstract="true"]') as HTMLElement;
      break;
    case 'references':
      targetElement = document.querySelector('[data-references="true"]') as HTMLElement;
      break;
    default:
      targetElement = document.getElementById(elementId) as HTMLElement;
      break;
  }

  if (targetElement) {
    targetElement.classList.add('toc-highlighted');
    setTimeout(() => {
      targetElement.classList.remove('toc-highlighted');
    }, 3000);

    scrollToTarget(targetElement);
  }
};

// 搜索导航
export const handleSearchNavigate = (
  direction: 'next' | 'prev',
  searchResults: string[],
  currentSearchIndex: number,
  setCurrentSearchIndex: (index: number) => void,
  setActiveBlockId: (id: string | null) => void
) => {
  if (!searchResults.length) return;
  const delta = direction === 'next' ? 1 : -1;
  const nextIndex =
    (currentSearchIndex + delta + searchResults.length) % searchResults.length;
  setCurrentSearchIndex(nextIndex);

  const targetBlockId = searchResults[nextIndex];
  const el = document.getElementById(targetBlockId);
  if (el) {
    scrollToTarget(el as HTMLElement);
  }

  setActiveBlockId(targetBlockId);
  window.setTimeout(() => setActiveBlockId(null), 2000);
};