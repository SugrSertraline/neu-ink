'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

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
  switchToEdit: (id: string, options?: SwitchToEditOptions) => Promise<boolean>;
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
  const { confirm, ConfirmDialog } = useConfirmDialog();

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
    async (targetId: string, options: SwitchToEditOptions = {}) => {
      if (currentEditingId === targetId) {
        return true;
      }

      if (currentEditingId && hasUnsavedChanges) {
        if (options.onRequestSave) {
          options.onRequestSave({ currentId: currentEditingId, targetId });
          setHasUnsavedChanges(false);
        } else {
          const abandon = await confirm({
            title: '放弃更改',
            description: '当前编辑的内容尚未保存，确认要放弃更改并切换吗？',
            confirmText: '放弃更改',
            cancelText: '继续编辑',
            variant: 'default',
            onConfirm: () => Promise.resolve(),
          });
          if (!abandon) return false;
          setHasUnsavedChanges(false);
        }
      }

      options.beforeSwitch?.();
      setCurrentEditingId(targetId);
      setHasUnsavedChanges(false);
      return true;
    },
    [currentEditingId, hasUnsavedChanges, saveFunction, confirm],
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

  return (
    <>
      <EditingContext.Provider value={value}>{children}</EditingContext.Provider>
      <ConfirmDialog />
    </>
  );
}

export function useEditingState() {
  const context = useContext(EditingContext);
  if (context === undefined) {
    throw new Error('useEditingState must be used within an EditingProvider');
  }
  return context;
}
