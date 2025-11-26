// Store 基础类型定义

export interface BaseState {
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

export interface BaseActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type BaseStore<T extends BaseState = BaseState> = T & BaseActions;

// 用户偏好设置类型
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    paperUpdates: boolean;
    comments: boolean;
    mentions: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showAffiliation: boolean;
    allowDirectMessages: boolean;
  };
  editor: {
    autoSave: boolean;
    autoSaveInterval: number;
    spellCheck: boolean;
    wordWrap: boolean;
    tabSize: number;
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    fontFamily: string;
  };
}