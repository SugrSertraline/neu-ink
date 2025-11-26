import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { TabState, TabActions, TabStore, DEFAULT_TAB, normalizeTabForPaper, mergeTab } from './tabTypes';

// 初始状态
const initialState: TabState = {
  tabs: [DEFAULT_TAB],
  activeTabId: DEFAULT_TAB.id,
  loadingTabId: null,
};

export const useTabStore = create<TabStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初始状态
        ...initialState,
        
        // 添加标签页
        addTab: (tab) => set((state) => {
          const normalized = normalizeTabForPaper(tab);
          const incoming = { ...normalized, data: normalized.data ?? {} };
          const index = state.tabs.findIndex(t => t.id === incoming.id);

          if (index >= 0) {
            const updated = mergeTab(state.tabs[index], incoming);
            return {
              tabs: state.tabs.map((t, i) => (i === index ? updated : t)),
            };
          }

          return {
            tabs: [...state.tabs, incoming],
          };
        }),
        
        // 移除标签页
        removeTab: (tabId) => set((state) => {
          if (tabId === DEFAULT_TAB.id) return state;

          const currentIndex = state.tabs.findIndex(tab => tab.id === tabId);
          if (currentIndex === -1) return state;

          const nextTabs = state.tabs.filter(tab => tab.id !== tabId);
          const sanitizedTabs = nextTabs.length > 0 ? nextTabs : [DEFAULT_TAB];

          return {
            tabs: sanitizedTabs,
            activeTabId: state.activeTabId === tabId 
              ? (sanitizedTabs.length > 0 ? sanitizedTabs[0].id : DEFAULT_TAB.id)
              : state.activeTabId,
            loadingTabId: state.loadingTabId === tabId ? null : state.loadingTabId,
          };
        }),
        
        // 设置活动标签页
        setActiveTab: (tabId) => set({ activeTabId: tabId }),
        
        // 设置加载状态
        setLoading: (loading, tabId) => set({ loadingTabId: loading ? tabId : null }),
        
        // 清除所有标签页
        clearAllTabs: () => set({ 
          tabs: [DEFAULT_TAB],
          activeTabId: DEFAULT_TAB.id,
          loadingTabId: null,
        }),
        
        // 更新标签页
        updateTab: (tabId, updates) => set((state) =>
          state.tabs.map(tab => {
            if (tab.id !== tabId) return tab;

            const merged = { ...tab, ...updates };
            const normalized = merged.type === 'paper' ? normalizeTabForPaper(merged) : merged;

            if (updates.data) {
              normalized.data = { ...(tab.data ?? {}), ...updates.data };
            }

            return normalized;
          }),
        ),
      })),
      {
        name: 'tab-store',
        partialize: (state) => ({
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          loadingTabId: state.loadingTabId,
        }),
      }
    ),
    {
      name: 'tab-store',
    }
  )
);
