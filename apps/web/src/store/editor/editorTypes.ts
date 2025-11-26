// 编辑器状态类型定义

export interface EditorState {
  // 当前编辑的论文ID
  paperId: string | null;
  
  // 编辑模式
  mode: 'view' | 'edit';
  
  // 当前编辑的元素ID
  currentEditingId: string | null;
  
  // 当前章节ID
  currentSectionId: string | null;
  
  // 当前块ID
  currentBlockId: string | null;
  
  // 是否有未保存的更改
  hasUnsavedChanges: boolean;
  
  // 是否正在加载
  loading: boolean;
  
  // 错误信息
  error: string | null;
  
  // 最后更新时间
  lastUpdated?: Date;
  
  // 保存函数
  saveFunction?: SaveFunction;
}

export interface EditorActions {
  // 设置论文ID
  setPaperId: (paperId: string | null) => void;
  
  // 设置编辑模式
  setMode: (mode: 'view' | 'edit') => void;
  
  // 设置当前编辑ID
  setCurrentEditingId: (id: string | null) => void;
  
  // 设置当前章节ID
  setCurrentSectionId: (id: string | null) => void;
  
  // 设置当前块ID
  setCurrentBlockId: (id: string | null) => void;
  
  // 设置是否有未保存的更改
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  // 设置加载状态
  setLoading: (loading: boolean) => void;
  
  // 设置错误信息
  setError: (error: string | null) => void;
  
  // 切换到编辑模式
  switchToEditMode: () => void;
  
  // 切换到查看模式
  switchToViewMode: () => void;
  
  // 清除当前编辑
  clearCurrentEditing: () => void;
  
  // 重置所有状态
  reset: () => void;
  
  // 保存更改
  saveChanges: () => Promise<boolean>;
  
  // 切换编辑目标
  switchToEdit: (targetId: string, options?: SwitchToEditOptions) => Promise<boolean>;
  
  // 设置保存函数
  setSaveFunction: (saveFunction: SaveFunction | undefined) => void;
}

export interface SwitchToEditOptions {
  beforeSwitch?: () => void;
  onRequestSave?: (context: { currentId: string; targetId: string }) => void;
}

export type EditorStore = EditorState & EditorActions;

// 保存函数类型
export type SaveFunction = () => Promise<boolean>;