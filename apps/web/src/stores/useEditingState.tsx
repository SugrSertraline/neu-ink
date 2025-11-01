'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface EditingContextType {
  currentEditingId: string | null;
  setEditingId: (id: string | null) => void;
  isEditing: (id: string) => boolean;
  clearEditing: () => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  switchToEdit: (id: string, onConfirm?: () => void) => void;
}

const EditingContext = createContext<EditingContextType | undefined>(undefined);

interface EditingProviderProps {
  children: ReactNode;
}

export function EditingProvider({ children }: EditingProviderProps) {
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const setEditingId = (id: string | null) => {
    setCurrentEditingId(id);
    setHasUnsavedChanges(false);
  };

  const isEditing = (id: string) => {
    return currentEditingId === id;
  };

  const clearEditing = () => {
    setCurrentEditingId(null);
    setHasUnsavedChanges(false);
  };

  const switchToEdit = useCallback((id: string, onConfirm?: () => void) => {
    if (currentEditingId === id) return;
    
    if (currentEditingId && hasUnsavedChanges) {
      // 如果有未保存的更改，显示确认对话框
      const shouldSwitch = window.confirm('当前编辑的内容尚未保存，是否要放弃更改并编辑其他内容？');
      if (!shouldSwitch) return;
      
      // 如果用户确认切换，先调用确认回调
      if (onConfirm) onConfirm();
    }
    
    // 切换到新的编辑元素
    setCurrentEditingId(id);
    setHasUnsavedChanges(false);
  }, [currentEditingId, hasUnsavedChanges]);

  const value = {
    currentEditingId,
    setEditingId,
    isEditing,
    clearEditing,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    switchToEdit,
  };

  return (
    <EditingContext.Provider value={value}>
      {children}
    </EditingContext.Provider>
  );
}

export function useEditingState() {
  const context = useContext(EditingContext);
  if (context === undefined) {
    throw new Error('useEditingState must be used within an EditingProvider');
  }
  return context;
}