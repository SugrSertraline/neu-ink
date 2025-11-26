import { TabState, Tab } from './tabTypes';

// 基础选择器函数
export const getTabs = (state: TabState) => state.tabs;

export const getActiveTabId = (state: TabState) => state.activeTabId;

export const getLoadingTabId = (state: TabState) => state.loadingTabId;

export const getActiveTab = (state: TabState) => 
  state.tabs.find(tab => tab.id === state.activeTabId) || state.tabs[0];

export const getTabById = (state: TabState, tabId: string) =>
  state.tabs.find(tab => tab.id === tabId);

export const getTabByPaperId = (state: TabState, paperId: string) =>
  state.tabs.find(tab => tab.type === 'paper' && tab.data?.paperId === paperId);

export const getPaperTabs = (state: TabState) =>
  state.tabs.filter(tab => tab.type === 'paper');

export const getNonPaperTabs = (state: TabState) =>
  state.tabs.filter(tab => tab.type !== 'paper');

export const getTabCount = (state: TabState) => state.tabs.length;

export const getPaperTabCount = (state: TabState) => 
  state.tabs.filter(tab => tab.type === 'paper').length;

export const isLoading = (state: TabState, tabId?: string) => {
  if (tabId) {
    return state.loadingTabId === tabId;
  }
  return state.loadingTabId !== null;
};

export const isActiveTab = (state: TabState, tabId: string) => 
  state.activeTabId === tabId;

export const canCloseTab = (state: TabState, tabId: string) => {
  const tab = getTabById(state, tabId);
  if (!tab) return false;
  
  // 默认标签页不能关闭
  if (tab.id === 'default') return false;
  
  // 如果只有一个标签页且是活动标签页，不能关闭
  if (state.tabs.length === 1 && state.activeTabId === tabId) return false;
  
  return true;
};

export const getNextTabId = (state: TabState, currentTabId: string) => {
  const currentIndex = state.tabs.findIndex(tab => tab.id === currentTabId);
  if (currentIndex === -1) return null;
  
  const nextIndex = currentIndex + 1;
  if (nextIndex >= state.tabs.length) return null;
  
  return state.tabs[nextIndex].id;
};

export const getPreviousTabId = (state: TabState, currentTabId: string) => {
  const currentIndex = state.tabs.findIndex(tab => tab.id === currentTabId);
  if (currentIndex <= 0) return null;
  
  const previousIndex = currentIndex - 1;
  return state.tabs[previousIndex].id;
};

export const getTabPosition = (state: TabState, tabId: string) => {
  return state.tabs.findIndex(tab => tab.id === tabId);
};

export const hasTab = (state: TabState, tabId: string) => {
  return state.tabs.some(tab => tab.id === tabId);
};

export const hasPaperTab = (state: TabState, paperId: string) => {
  return state.tabs.some(tab => 
    tab.type === 'paper' && tab.data?.paperId === paperId
  );
};

// 复合选择器函数
export const getTabInfo = (state: TabState, tabId: string) => {
  const tab = getTabById(state, tabId);
  if (!tab) return null;
  
  return {
    tab,
    isActive: isActiveTab(state, tabId),
    isLoading: isLoading(state, tabId),
    canClose: canCloseTab(state, tabId),
    position: getTabPosition(state, tabId),
  };
};

export const getActiveTabInfo = (state: TabState) => {
  const activeTab = getActiveTab(state);
  if (!activeTab) return null;
  
  return getTabInfo(state, activeTab.id);
};

export const getPaperTabInfo = (state: TabState, paperId: string) => {
  const tab = getTabByPaperId(state, paperId);
  if (!tab) return null;
  
  return getTabInfo(state, tab.id);
};

// 导出所有选择器
export const tabSelectors = {
  // 基础选择器
  getTabs,
  getActiveTabId,
  getLoadingTabId,
  getActiveTab,
  getTabById,
  getTabByPaperId,
  getPaperTabs,
  getNonPaperTabs,
  getTabCount,
  getPaperTabCount,
  
  // 状态选择器
  isLoading,
  isActiveTab,
  canCloseTab,
  
  // 导航选择器
  getNextTabId,
  getPreviousTabId,
  getTabPosition,
  
  // 存在性选择器
  hasTab,
  hasPaperTab,
  
  // 复合选择器
  getTabInfo,
  getActiveTabInfo,
  getPaperTabInfo,
};