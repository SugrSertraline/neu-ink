'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type SwitchToEditOptions = {
  beforeSwitch?: () => void;
  onRequestSave?: (context: { currentId: string; targetId: string }) => void;
};

type SaveFunction = () => Promise<boolean>;

interface EditingContextType {
  currentEditingId: string | null;
  setEditingId: (id: string | null) => void;
  isEditing: (id: string) => boolean;
  clearEditing: () => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  switchToEdit: (id: string, options?: SwitchToEditOptions) => boolean;
  saveFunction?: SaveFunction;
  setSaveFunction?: (fn: SaveFunction) => void;
}

const EditingContext = createContext<EditingContextType | undefined>(undefined);

interface EditingProviderProps {
  children: ReactNode;
}

export function EditingProvider({ children }: EditingProviderProps) {
  const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveFunction, setSaveFunction] = useState<SaveFunction | undefined>(undefined);

  const setEditingId = useCallback((id: string | null) => {
    setCurrentEditingId(id);
    setHasUnsavedChanges(false);
  }, []);

  const isEditing = useCallback(
    (id: string) => currentEditingId === id,
    [currentEditingId],
  );

  const clearEditing = useCallback(() => {
    setCurrentEditingId(null);
    setHasUnsavedChanges(false);
  }, []);

  const switchToEdit = useCallback(
    (targetId: string, options: SwitchToEditOptions = {}) => {
      if (currentEditingId === targetId) {
        return true;
      }

      if (currentEditingId && hasUnsavedChanges) {
        if (options.onRequestSave) {
          options.onRequestSave({ currentId: currentEditingId, targetId });
          setHasUnsavedChanges(false);
        } else {
          const abandon = window.confirm('当前编辑的内容尚未保存，确认要放弃更改并切换吗？');
          if (!abandon) return false;
          setHasUnsavedChanges(false);
        }
      }

      options.beforeSwitch?.();
      setCurrentEditingId(targetId);
      setHasUnsavedChanges(false);
      return true;
    },
    [currentEditingId, hasUnsavedChanges, saveFunction],
  );

  const value: EditingContextType = {
    currentEditingId,
    setEditingId,
    isEditing,
    clearEditing,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    switchToEdit,
    saveFunction,
    setSaveFunction,
  };

  return <EditingContext.Provider value={value}>{children}</EditingContext.Provider>;
}

export function useEditingState() {
  const context = useContext(EditingContext);
  if (context === undefined) {
    throw new Error('useEditingState must be used within an EditingProvider');
  }
  return context;
}
