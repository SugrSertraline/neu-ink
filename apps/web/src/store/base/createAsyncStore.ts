import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * 异步操作状态
 */
export interface AsyncState {
  loading: boolean;
  error: string | null;
}

/**
 * 异步操作结果
 */
export interface AsyncResult<T> {
  data?: T;
  success: boolean;
  message?: string;
}

/**
 * 创建异步操作的 Zustand store
 * @param name Store 名称
 * @param initialState 初始状态
 * @param asyncActions 异步操作函数
 * @returns Zustand hook
 */
export function createAsyncStore<T extends AsyncState>(
  name: string,
  initialState: T
) {
  return create<T & {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    reset: () => void;
  }>()(
    devtools(
      immer((set, get) => ({
        ...initialState,
        setLoading: (loading: boolean) => {
          set((state) => {
            state.loading = loading;
          });
        },
        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },
        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },
        reset: () => {
          set((state) => {
            state.loading = false;
            state.error = null;
          });
        },
      })),
      { name }
    )
  );
}

/**
 * 创建异步操作包装器
 * @param set Zustand set 函数
 * @param action 异步操作函数
 * @returns 包装后的异步操作函数
 */
export function createAsyncAction<T extends any[], R>(
  set: (fn: (state: any) => void) => void,
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    set((state: any) => {
      state.loading = true;
      state.error = null;
    });
    
    try {
      const result = await action(...args);
      return result;
    } catch (error) {
      set((state: any) => {
        state.error = error instanceof Error ? error.message : '操作失败';
      });
      throw error;
    } finally {
      set((state: any) => {
        state.loading = false;
      });
    }
  };
}