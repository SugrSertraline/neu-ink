import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * 创建持久化的 Zustand store
 * @param name Store 名称，用于持久化存储
 * @param initialState 初始状态
 * @param actions 操作函数
 * @returns Zustand hook
 */
export function createPersistedStore<T extends object>(
  name: string,
  initialState: T,
  actions: (set: (fn: (state: T) => void) => void, get: () => T) => Partial<T>
) {
  return create<T>()(
    devtools(
      persist(
        immer((set, get) => ({
          ...initialState,
          ...actions((fn: (state: T) => void) => {
            set((draft) => {
              fn(draft as T);
            });
          }, get),
        })),
        {
          name,
          partialize: (state) => {
            // 可以在这里选择需要持久化的字段
            return state;
          },
        }
      ),
      { name }
    )
  );
}