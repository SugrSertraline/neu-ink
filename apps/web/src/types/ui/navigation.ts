// 导航相关类型定义
import { LucideIcon } from 'lucide-react';
import { User } from '../domain/user';

export type TabType = 'library' | 'paper' | 'settings' | 'public-library' | 'users';

export interface NavItem {
  id: string;
  type: TabType;
  label: string;
  icon: LucideIcon;
  path: string;
  requiresAuth?: boolean;
  badge?: string | ((user: User | null, isAdmin: boolean) => string | undefined);
  activeColor?: 'blue' | 'indigo' | 'cyan' | 'slate' | 'purple';
  closable?: boolean;
  showInSidebar?: boolean;
  isPermanentTab?: boolean;
  disabled?: boolean;
}

export interface NavigationState {
  items: NavItem[];
  activeItem?: string;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

export interface NavigationActions {
  addItem: (item: NavItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<NavItem>) => void;
  setActiveItem: (id: string | undefined) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  clickable?: boolean;
}

export interface MenuConfig {
  showLabels: boolean;
  showIcons: boolean;
  showBadges: boolean;
  collapsible: boolean;
  persistent: boolean;
}

export interface TabConfig {
  maxTabs: number;
  showCloseButtons: boolean;
  allowDragReorder: boolean;
  persistTabs: boolean;
  defaultTabs: NavItem[];
}

export interface RouteConfig {
  basePath: string;
  requireAuth: boolean;
  roles?: string[];
  permissions?: string[];
  redirectTo?: string;
  fallback?: string;
}

export interface NavigationItemGroup {
  id: string;
  label: string;
  icon?: LucideIcon;
  items: NavItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface NavigationContext {
  navigation: NavigationState;
  actions: NavigationActions;
  config: MenuConfig;
  tabConfig: TabConfig;
  breadcrumbs: BreadcrumbItem[];
  currentRoute?: string;
  user?: User | null;
  isAdmin: boolean;
}

export interface NavigationEvent {
  type: 'item_click' | 'item_add' | 'item_remove' | 'item_update' | 'sidebar_toggle' | 'tab_change' | 'route_change';
  payload?: any;
  timestamp: number;
}

export interface NavigationAnalytics {
  itemClicks: Array<{
    itemId: string;
    timestamp: number;
    userId?: string;
    sessionId: string;
  }>;
  sidebarToggles: Array<{
    timestamp: number;
    userId?: string;
    sessionId: string;
  }>;
  tabChanges: Array<{
    fromTab?: string;
    toTab?: string;
    timestamp: number;
    userId?: string;
    sessionId: string;
  }>;
  routeChanges: Array<{
    fromRoute?: string;
    toRoute: string;
    timestamp: number;
    userId?: string;
    sessionId: string;
  }>;
}

export interface NavigationPreferences {
  sidebar: {
    defaultOpen: boolean;
    defaultCollapsed: boolean;
    rememberState: boolean;
    width: number;
    collapsedWidth: number;
  };
  tabs: {
    maxTabs: number;
    showCloseButtons: boolean;
    allowDragReorder: boolean;
    persistTabs: boolean;
    closeInactiveOnStartup: boolean;
  };
  breadcrumbs: {
    show: boolean;
    maxItems: number;
    showHome: boolean;
    homeLabel: string;
  };
}