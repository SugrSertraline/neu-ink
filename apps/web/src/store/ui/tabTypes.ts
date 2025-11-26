// 标签页状态类型定义

export type TabType =
  | 'dashboard'
  | 'library'
  | 'paper'
  | 'settings'
  | 'public-library'
  | 'users';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  path: string;
  data?: Record<string, unknown>;
}

export interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  loadingTabId: string | null;
}

export interface TabActions {
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setLoading: (loading: boolean, tabId: string | null) => void;
  clearAllTabs: () => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
}

export type TabStore = TabState & TabActions;

// 默认标签页
export const DEFAULT_TAB: Tab = {
  id: 'public-library',
  type: 'public-library',
  title: '论文库',
  path: '/library?section=public',
};

// 标签页规范化函数
export function normalizeTabForPaper(tab: Tab): Tab {
  if (tab.type !== 'paper') return tab;

  const data = { ...(tab.data ?? {}) };

  if (!data.source) {
    const path = tab.path ?? '';
    if (/^\/admin\/papers?\//.test(path)) {
      data.source = 'public-admin';
    } else if (/^\/user\/papers?\//.test(path)) {
      data.source = 'personal-owner';
    } else if (/^\/papers?\//.test(path)) {
      data.source = 'public-guest';
    }
  }

  return { ...tab, data };
}

// 标签页合并函数
export function mergeTab(existing: Tab, incoming: Tab): Tab {
  return {
    ...existing,
    ...incoming,
    data: { ...(existing.data ?? {}), ...(incoming.data ?? {}) },
  };
}