'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// ✅ 添加 'public-library' 类型
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

const DEFAULT_TAB: Tab = {
  id: 'dashboard',
  type: 'dashboard',
  title: '首页',
  path: '/',
};

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([DEFAULT_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>('dashboard');
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
    if (tabId === 'dashboard') return;
    
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
          newActiveTabId = 'dashboard';
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
    setActiveTabId('dashboard');
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
