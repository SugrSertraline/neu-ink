// 基础 UI 状态接口
export interface UiState {
  // 侧边栏状态
  sidebar: {
    isOpen: boolean;
    activePanel: 'toc' | 'notes' | 'attachments' | null;
    width: number;
    isCollapsed: boolean;
  };
  
  // 模态框状态
  modals: {
    metadataEditor: boolean;
    abstractEditor: boolean;
    referenceEditor: boolean;
    parseConfirm: boolean;
    deleteConfirm: boolean;
  };
  
  // 面板状态
  panels: {
    notesPanel: {
      isOpen: boolean;
      position: 'right' | 'bottom';
      width: number;
      height: number;
    };
    tocPanel: {
      isOpen: boolean;
      isSticky: boolean;
    };
    attachmentsPanel: {
      isOpen: boolean;
    };
  };
  
  // 工具栏状态
  toolbar: {
    isVisible: boolean;
    activeTools: string[];
  };
  
  // 通知状态
  notifications: {
    items: NotificationItem[];
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  
  // 加载状态
  loading: {
    global: boolean;
    components: Record<string, boolean>;
  };
  
  // 错误状态
  errors: {
    global: string | null;
    components: Record<string, string | null>;
  };
  
  // 主题状态
  theme: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
  };
  
  // 布局状态
  layout: {
    headerHeight: number;
    footerHeight: number;
    contentPadding: number;
  };
}

// 通知项接口
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
}

// UI 操作接口
export interface UiActions {
  // 侧边栏操作
  sidebar: {
    open: () => void;
    close: () => void;
    toggle: () => void;
    setActivePanel: (panel: 'toc' | 'notes' | 'attachments' | null) => void;
    setWidth: (width: number) => void;
    setCollapsed: (collapsed: boolean) => void;
  };
  
  // 模态框操作
  modals: {
    openMetadataEditor: () => void;
    closeMetadataEditor: () => void;
    openAbstractEditor: () => void;
    closeAbstractEditor: () => void;
    openReferenceEditor: () => void;
    closeReferenceEditor: () => void;
    openParseConfirm: () => void;
    closeParseConfirm: () => void;
    openDeleteConfirm: () => void;
    closeDeleteConfirm: () => void;
  };
  
  // 面板操作
  panels: {
    notesPanel: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      setPosition: (position: 'right' | 'bottom') => void;
      setWidth: (width: number) => void;
      setHeight: (height: number) => void;
    };
    tocPanel: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      setSticky: (sticky: boolean) => void;
    };
    attachmentsPanel: {
      open: () => void;
      close: () => void;
      toggle: () => void;
    };
  };
  
  // 工具栏操作
  toolbar: {
    show: () => void;
    hide: () => void;
    toggle: () => void;
    setActiveTools: (tools: string[]) => void;
    addTool: (tool: string) => void;
    removeTool: (tool: string) => void;
  };
  
  // 通知操作
  notifications: {
    add: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => string;
    remove: (id: string) => void;
    clear: () => void;
    setPosition: (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void;
  };
  
  // 加载操作
  loading: {
    setGlobal: (loading: boolean) => void;
    setComponent: (component: string, loading: boolean) => void;
    clearComponent: (component: string) => void;
    clearAll: () => void;
  };
  
  // 错误操作
  errors: {
    setGlobal: (error: string | null) => void;
    setComponent: (component: string, error: string | null) => void;
    clearComponent: (component: string) => void;
    clearAll: () => void;
  };
  
  // 主题操作
  theme: {
    setMode: (mode: 'light' | 'dark' | 'system') => void;
    setPrimaryColor: (color: string) => void;
  };
  
  // 布局操作
  layout: {
    setHeaderHeight: (height: number) => void;
    setFooterHeight: (height: number) => void;
    setContentPadding: (padding: number) => void;
  };
  
  // 重置操作
  reset: () => void;
}

// UI Store 类型
export type UiStore = UiState & UiActions;

// 默认状态
export const DEFAULT_UI_STATE: UiState = {
  sidebar: {
    isOpen: true,
    activePanel: 'toc',
    width: 280,
    isCollapsed: false,
  },
  modals: {
    metadataEditor: false,
    abstractEditor: false,
    referenceEditor: false,
    parseConfirm: false,
    deleteConfirm: false,
  },
  panels: {
    notesPanel: {
      isOpen: false,
      position: 'right',
      width: 320,
      height: 200,
    },
    tocPanel: {
      isOpen: true,
      isSticky: true,
    },
    attachmentsPanel: {
      isOpen: false,
    },
  },
  toolbar: {
    isVisible: true,
    activeTools: [],
  },
  notifications: {
    items: [],
    position: 'top-right',
  },
  loading: {
    global: false,
    components: {},
  },
  errors: {
    global: null,
    components: {},
  },
  theme: {
    mode: 'system',
    primaryColor: '#3b82f6',
  },
  layout: {
    headerHeight: 60,
    footerHeight: 40,
    contentPadding: 16,
  },
};

// 工具函数
export const createNotification = (
  notification: Omit<NotificationItem, 'id' | 'timestamp'>
): NotificationItem => ({
  ...notification,
  id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: Date.now(),
});

export const isNotificationExpired = (
  notification: NotificationItem,
  maxAge: number = 5000 // 5秒
): boolean => {
  return Date.now() - notification.timestamp > maxAge;
};

export const filterExpiredNotifications = (
  notifications: NotificationItem[],
  maxAge: number = 5000
): NotificationItem[] => {
  return notifications.filter(notification => !isNotificationExpired(notification, maxAge));
};