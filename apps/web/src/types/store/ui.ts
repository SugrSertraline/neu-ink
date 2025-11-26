// UI 状态管理类型
import { BaseState, BaseActions } from './base';

export interface UiState extends BaseState {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  sidebar: {
    open: boolean;
    width: number;
    collapsed: boolean;
    activeTab: string;
  };
  tabs: {
    items: TabItem[];
    activeId: string | null;
    order: string[];
  };
  modals: {
    [key: string]: {
      open: boolean;
      data?: any;
    };
  };
  notifications: NotificationItem[];
  layout: {
    headerHeight: number;
    sidebarWidth: number;
    contentPadding: number;
  };
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  };
}

export interface UiActions extends BaseActions {
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setLanguage: (language: 'zh' | 'en') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarActiveTab: (tab: string) => void;
  addTab: (tab: TabItem) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<TabItem>) => void;
  setActiveTab: (tabId: string | null) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId: string) => void;
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  updateLayout: (layout: Partial<UiState['layout']>) => void;
  updateViewport: (viewport: Partial<UiState['viewport']>) => void;
}

export type UiStore = UiState & UiActions;

export interface TabItem {
  id: string;
  title: string;
  type: 'paper' | 'library' | 'settings' | 'custom';
  closable: boolean;
  data?: any;
  icon?: string;
  badge?: string | number;
  path?: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: number;
  read: boolean;
}

export interface SidebarState {
  open: boolean;
  width: number;
  collapsed: boolean;
  activeTab: string;
  tabs: SidebarTab[];
}

export interface SidebarTab {
  id: string;
  label: string;
  icon: string;
  badge?: string | number;
  disabled?: boolean;
  path?: string;
}

export interface TabState {
  items: TabItem[];
  activeId: string | null;
  order: string[];
  maxTabs: number;
  showCloseButtons: boolean;
}

export interface ModalState {
  [key: string]: {
    open: boolean;
    data?: any;
    closable?: boolean;
    backdrop?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  };
}

export interface LayoutConfig {
  headerHeight: number;
  sidebarWidth: number;
  contentPadding: number;
  footerHeight: number;
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface ViewportConfig {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
}