import { createContext, useContext } from 'react';
import { PaperEditPermissions } from '@/lib/hooks/usePaperEditPermissions';
import { ViewerSource } from '@/types/paper/viewer';

const defaultPermissions: PaperEditPermissions = {
  source: 'public-guest' as ViewerSource,
  canEditPublicPaper: false,
  canEditPersonalPaper: false,
  canAddNotes: false,
  canToggleVisibility: false,
  canEditContent: false,
  canEditStructure: false,
  canAccessEditor: false,
};

export const PaperEditPermissionsContext =
  createContext<PaperEditPermissions>(defaultPermissions);

export function usePaperEditPermissionsContext() {
  return useContext(PaperEditPermissionsContext);
}
