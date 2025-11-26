// Store 类型定义模块导出

// 基础类型
export * from './base.js';

// 认证状态类型
export * from './auth.js';

// 编辑器状态类型
export * from './editor.js';

// UI 状态类型
export * from './ui.js';

// 重新导出常用类型
export type {
  BaseState,
  BaseActions,
  BaseStore,
  UserPreferences,
} from './base.js';

export type {
  AuthState,
  AuthActions,
  AuthStore,
  LoginCredentials,
  RegisterData,
  AuthConfig,
} from './auth.js';

export type {
  EditorState,
  EditorActions,
  EditorStore,
  EditorHistory,
  EditorConfig,
  EditorPlugin,
  EditorToolbar,
} from './editor.js';

export type {
  UiState,
  UiActions,
  UiStore,
  TabItem,
  NotificationItem,
  SidebarState,
  SidebarTab,
  TabState,
  ModalState,
  LayoutConfig,
  ViewportConfig,
} from './ui.js';