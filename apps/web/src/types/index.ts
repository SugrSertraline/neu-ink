// 类型定义模块导出

// API 类型
export * from './api';

// Store 类型
export type {
  BaseState,
  BaseActions,
  BaseStore,
  AuthState,
  AuthActions,
  AuthStore,
  EditorState,
  EditorActions,
  EditorStore,
  UiState,
  UiActions,
  UiStore,
} from './store';

// 领域类型
export type {
  Role,
  UserStatus,
  User,
  LoginRequest,
  LoginResponse,
  CreateUserDto,
  UpdateUserDto,
  UserListResponse,
  UserListRequest,
  ChangeRoleRequest,
  ExtendedUser,
  UserSubscription,
  UserStats,
  UserPreferences,
  UserSession,
  UserActivity,
  UserPermission,
  UserRole,
  UserAuditLog,
} from './domain';

// UI 类型
export type {
  TabType,
  NavItem,
  NavigationState,
  NavigationActions,
  BreadcrumbItem,
  MenuConfig,
  TabConfig,
  RouteConfig,
  NavigationItemGroup,
  NavigationContext,
  NavigationEvent,
  NavigationAnalytics,
  NavigationPreferences,
} from './ui';



// 从现有 paper 类型导出
export * from './paper';

// 常用类型别名
export type ID = string;
export type Timestamp = string | Date;
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export interface JsonArray extends Array<JsonValue> {}

// 通用类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 函数类型
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;
export type Predicate<T = any> = (value: T) => boolean;
export type Transformer<T, U> = (value: T) => U;
export type AsyncTransformer<T, U> = (value: T) => Promise<U>;

// 配置类型
export interface Config {
  api: {
    baseURL: string;
    timeout: number;
    retries: number;
  };
  auth: {
    tokenStorage: 'localStorage' | 'sessionStorage' | 'memory';
    autoRefresh: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'zh' | 'en';
  };
}

// 状态类型
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface AsyncState<T> extends LoadingState {
  data: T | null;
}

export interface PaginatedState<T> extends AsyncState<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 表单类型
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea';
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface FormState<T = any> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// 主题类型
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// 组件类型
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface InputProps extends ComponentProps {
  type?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export interface SelectProps<T = any> extends ComponentProps {
  value?: T;
  options: Array<{ label: string; value: T; disabled?: boolean }>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  onChange?: (value: T) => void;
}

export interface DialogProps extends ComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdrop?: boolean;
}

// 路由类型
export interface Route {
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  protected?: boolean;
  roles?: string[];
  permissions?: string[];
  children?: Route[];
}

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
  children?: NavigationItem[];
}

// 工具类型
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type NonNullable<T> = T extends null | undefined ? never : T;

export type PickByValue<T, V> = Pick<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>;

export type OmitByValue<T, V> = Omit<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>;

export type KeysOfUnion<T> = T extends any ? keyof T : never;

export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T];

export type ValuesOf<T> = T[keyof T];

export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];

// 事件类型
export interface CustomEvent<T = any> {
  type: string;
  detail: T;
  bubbles?: boolean;
  cancelable?: boolean;
}

export interface KeyboardEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface MouseEvent {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  button: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

// 性能类型
export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  memory?: {
    used: number;
    total: number;
  };
  network?: {
    bytesTransferred: number;
    encodedBodySize: number;
    decodedBodySize: number;
  };
}

export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  initiatorType?: string;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
}