import { EditorStore } from './editorTypes';

// 编辑器状态选择器
export const editorSelectors = {
  // 获取当前编辑的论文ID
  getPaperId: (state: EditorStore) => state.paperId,
  
  // 获取编辑模式
  getMode: (state: EditorStore) => state.mode,
  
  // 获取当前编辑ID
  getCurrentEditingId: (state: EditorStore) => state.currentEditingId,
  
  // 获取当前章节ID
  getCurrentSectionId: (state: EditorStore) => state.currentSectionId,
  
  // 获取当前块ID
  getCurrentBlockId: (state: EditorStore) => state.currentBlockId,
  
  // 获取是否有未保存的更改
  getHasUnsavedChanges: (state: EditorStore) => state.hasUnsavedChanges,
  
  // 获取加载状态
  getLoading: (state: EditorStore) => state.loading,
  
  // 获取错误信息
  getError: (state: EditorStore) => state.error,
  
  // 获取保存函数
  getSaveFunction: (state: EditorStore) => state.saveFunction,
  
  // 检查是否在编辑模式
  isInEditMode: (state: EditorStore) => state.mode === 'edit',
  
  // 检查是否在查看模式
  isInViewMode: (state: EditorStore) => state.mode === 'view',
  
  // 检查是否有当前编辑目标
  hasCurrentEditingTarget: (state: EditorStore) => state.currentEditingId !== null,
  
  // 检查是否有错误
  hasError: (state: EditorStore) => state.error !== null,
  
  // 检查是否可以保存
  canSave: (state: EditorStore) => state.hasUnsavedChanges && !!state.saveFunction,
  
  // 检查是否可以切换编辑
  canSwitchEdit: (state: EditorStore) => state.mode === 'edit',
  
  // 获取当前编辑状态摘要
  getEditingSummary: (state: EditorStore) => ({
    paperId: state.paperId,
    mode: state.mode,
    currentEditingId: state.currentEditingId,
    currentSectionId: state.currentSectionId,
    currentBlockId: state.currentBlockId,
    hasUnsavedChanges: state.hasUnsavedChanges,
    loading: state.loading,
    error: state.error,
  }),
};