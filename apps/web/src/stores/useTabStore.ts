'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type TabType = 'dashboard' | 'library' | 'paper' | 'settings' | 'public-library';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  path: string;
  data?: any;
}

interface TabContextType {
  tabs: Tab[];
  activeTabId: string | null;
  loadingTabId: string | null;
  
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setLoading: (loading: boolean, tabId: string | null) => void;
  clearAllTabs: () => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

// ✅ 修改默认标签为公共论文库
const DEFAULT_TAB: Tab = {
  id: 'public-library',
  type: 'public-library',
  title: '论文库',
  path: '/',
};

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([DEFAULT_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>('public-library'); // ✅ 修改默认激活标签
  const [loadingTabId, setLoadingTabId] = useState<string | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs(currentTabs => {
      const existingTab = currentTabs.find(t => t.id === tab.id);
      if (existingTab) {
        return currentTabs;
      }
      return [...currentTabs, tab];
    });
  }, []);

  const removeTab = useCallback((tabId: string) => {
    // ✅ 公共论文库标签不可移除
    if (tabId === 'public-library') return;
    
    setTabs(currentTabs => {
      const newTabs = currentTabs.filter(tab => tab.id !== tabId);
      
      if (activeTabId === tabId) {
        const currentIndex = currentTabs.findIndex(tab => tab.id === tabId);
        let newActiveTabId: string;
        
        if (currentIndex > 0) {
          newActiveTabId = currentTabs[currentIndex - 1].id;
        } else if (newTabs.length > 0) {
          newActiveTabId = newTabs[0].id;
        } else {
          newActiveTabId = 'public-library'; // ✅ 默认返回公共论文库
        }
        
        setActiveTabId(newActiveTabId);
      }
      
      return newTabs;
    });
  }, [activeTabId]);

  const handleSetActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleSetLoading = useCallback((loading: boolean, tabId: string | null) => {
    setLoadingTabId(loading ? tabId : null);
  }, []);

  const clearAllTabs = useCallback(() => {
    setTabs([DEFAULT_TAB]);
    setActiveTabId('public-library');
    setLoadingTabId(null);
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(currentTabs =>
      currentTabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  }, []);

  const value: TabContextType = {
    tabs,
    activeTabId,
    loadingTabId,
    addTab,
    removeTab,
    setActiveTab: handleSetActiveTab,
    setLoading: handleSetLoading,
    clearAllTabs,
    updateTab,
  };

  return React.createElement(TabContext.Provider, { value }, children);
}

export function useTabStore() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabStore must be used within a TabProvider');
  }
  return context;
}

// ✅ 导出 getState 方法供外部使用
useTabStore.getState = () => {
  // 这是一个简化的实现，实际使用时可能需要更复杂的状态管理
  // 如果需要在组件外访问 store，建议使用 zustand 或其他状态管理库
  return {
    removeTab: (tabId: string) => {
      console.warn('removeTab called outside component context');
    }
  };
};
