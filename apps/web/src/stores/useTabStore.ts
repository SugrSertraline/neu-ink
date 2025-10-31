'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

export type TabType =
  | 'dashboard'
  | 'library'
  | 'paper'
  | 'settings'
  | 'public-library';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  path: string;
  data?: Record<string, unknown>;
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
  id: 'public-library',
  type: 'public-library',
  title: '论文库',
  path: '/',
};

function mergeTab(existing: Tab, incoming: Tab): Tab {
  return {
    ...existing,
    ...incoming,
    data: { ...(existing.data ?? {}), ...(incoming.data ?? {}) },
  };
}

function normalizeTabForPaper(tab: Tab): Tab {
  if (tab.type !== 'paper') return tab;

  const data = { ...(tab.data ?? {}) };

  if (!data.source) {
    const path = tab.path ?? '';
    if (/^\/admin\/papers\//.test(path)) {
      data.source = 'public-admin';
    } else if (/^\/user\/papers\//.test(path)) {
      data.source = 'personal-owner';
    } else if (/^\/papers\//.test(path)) {
      data.source = 'public-guest';
    }
  }

  return { ...tab, data };
}

let currentStoreSnapshot: TabContextType | null = null;

export function TabProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([DEFAULT_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(DEFAULT_TAB.id);
  const [loadingTabId, setLoadingTabId] = useState<string | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs((currentTabs) => {
      const normalized = normalizeTabForPaper(tab);
      const incoming = { ...normalized, data: normalized.data ?? {} };
      const index = currentTabs.findIndex((t) => t.id === incoming.id);

      if (index >= 0) {
        const updated = mergeTab(currentTabs[index], incoming);
        return currentTabs.map((t, i) => (i === index ? updated : t));
      }

      return [...currentTabs, incoming];
    });

    setActiveTabId(tab.id);
  }, []);

  const removeTab = useCallback(
    (tabId: string) => {
      if (tabId === DEFAULT_TAB.id) return;

      setTabs((currentTabs) => {
        if (currentTabs.length <= 1) return currentTabs;

        const currentIndex = currentTabs.findIndex((tab) => tab.id === tabId);
        if (currentIndex === -1) return currentTabs;

        const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);

        if (activeTabId === tabId) {
          const fallback =
            currentIndex > 0
              ? currentTabs[currentIndex - 1].id
              : nextTabs[0]?.id ?? DEFAULT_TAB.id;
          setActiveTabId(fallback);
        }

        return nextTabs;
      });
    },
    [activeTabId],
  );

  const handleSetActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleSetLoading = useCallback((loading: boolean, tabId: string | null) => {
    setLoadingTabId(loading ? tabId : null);
  }, []);

  const clearAllTabs = useCallback(() => {
    setTabs([DEFAULT_TAB]);
    setActiveTabId(DEFAULT_TAB.id);
    setLoadingTabId(null);
  }, []);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs((currentTabs) =>
      currentTabs.map((tab) => {
        if (tab.id !== tabId) return tab;

        const merged = { ...tab, ...updates };
        const normalized =
          merged.type === 'paper' ? normalizeTabForPaper(merged) : merged;

        if (updates.data) {
          normalized.data = { ...(tab.data ?? {}), ...updates.data };
        }

        return normalized;
      }),
    );
  }, []);

  const value = useMemo<TabContextType>(
    () => ({
      tabs,
      activeTabId,
      loadingTabId,
      addTab,
      removeTab,
      setActiveTab: handleSetActiveTab,
      setLoading: handleSetLoading,
      clearAllTabs,
      updateTab,
    }),
    [
      tabs,
      activeTabId,
      loadingTabId,
      addTab,
      removeTab,
      handleSetActiveTab,
      handleSetLoading,
      clearAllTabs,
      updateTab,
    ],
  );

  currentStoreSnapshot = value;

  return React.createElement(TabContext.Provider, { value }, children);
}

export function useTabStore() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabStore must be used within a TabProvider');
  }
  return context;
}

useTabStore.getState = () => {
  if (!currentStoreSnapshot) {
    throw new Error('Tab store is not ready yet');
  }
  return currentStoreSnapshot;
};
