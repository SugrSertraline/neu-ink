import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { EditorState, EditorActions, EditorStore, SwitchToEditOptions, SaveFunction } from './editorTypes';

// 初始状态
const initialState: EditorState = {
  paperId: null,
  mode: 'view',
  currentEditingId: null,
  currentSectionId: null,
  currentBlockId: null,
  hasUnsavedChanges: false,
  loading: false,
  error: null,
};

export const useEditorStore = create<EditorStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // 初始状态
        ...initialState,
        
        // 设置论文ID
        setPaperId: (paperId) => set({ paperId }),
        
        // 设置编辑模式
        setMode: (mode) => set({ mode }),
        
        // 设置当前编辑ID
        setCurrentEditingId: (currentEditingId) => set({ currentEditingId }),
        
        // 设置当前章节ID
        setCurrentSectionId: (currentSectionId) => set({ currentSectionId }),
        
        // 设置当前块ID
        setCurrentBlockId: (currentBlockId) => set({ currentBlockId }),
        
        // 设置是否有未保存的更改
        setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
        
        // 设置加载状态
        setLoading: (loading) => set({ loading }),
        
        // 设置错误信息
        setError: (error) => set({ error }),
        
        // 切换到编辑模式
        switchToEditMode: () => set({ mode: 'edit' }),
        
        // 切换到查看模式
        switchToViewMode: () => set({ mode: 'view' }),
        
        // 清除当前编辑
        clearCurrentEditing: () => set({ 
          currentEditingId: null,
          currentSectionId: null,
          currentBlockId: null,
          hasUnsavedChanges: false
        }),
        
        // 重置所有状态
        reset: () => set(initialState),
        
        // 保存更改
        saveChanges: async () => {
          const { saveFunction } = get();
          if (!saveFunction) {
            console.warn('No save function provided');
            return false;
          }
          
          try {
            set({ loading: true, error: null });
            const success = await saveFunction();
            if (success) {
              set({ hasUnsavedChanges: false });
            }
            return success;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '保存失败';
            set({ error: errorMessage });
            return false;
          } finally {
            set({ loading: false });
          }
        },
        
        // 切换编辑目标
        switchToEdit: async (targetId, options = {}) => {
          const { currentEditingId, hasUnsavedChanges, saveFunction } = get();
          
          // 如果已经是目标ID，直接返回
          if (currentEditingId === targetId) {
            return true;
          }
          
          // 如果有未保存的更改，先处理
          if (currentEditingId && hasUnsavedChanges) {
            if (options.onRequestSave) {
              options.onRequestSave({ currentId: currentEditingId, targetId });
              set({ hasUnsavedChanges: false });
            } else if (saveFunction) {
              try {
                const success = await saveFunction();
                if (!success) {
                  return false;
                }
              } catch (error) {
                console.error('Save failed:', error);
                return false;
              }
            } else {
              // 没有保存函数，无法处理未保存的更改
              console.warn('No save function available for unsaved changes');
              return false;
            }
          }
          
          // 执行切换前的回调
          options.beforeSwitch?.();
          
          return new Promise<boolean>((resolve) => {
            setTimeout(() => {
              // 切换到目标ID
              set({
                currentEditingId: targetId,
                hasUnsavedChanges: false
              });
              resolve(true);
            }, 0);
          });
        },
        
        // 设置保存函数
        setSaveFunction: (saveFunction) => set({ saveFunction }),
      })),
      {
        name: 'editor-store',
        partialize: (state) => ({
          paperId: state.paperId,
          mode: state.mode,
          currentEditingId: state.currentEditingId,
          currentSectionId: state.currentSectionId,
          currentBlockId: state.currentBlockId,
          hasUnsavedChanges: state.hasUnsavedChanges,
        }),
      }
    ),
    {
      name: 'editor-store',
    }
  )
);