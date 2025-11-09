import { useMemo } from 'react';
import { ViewerSource } from '@/types/paper/viewer';
import { useViewerCapabilities } from './useViewerCapabilities';

export interface PaperEditPermissions {
  source: ViewerSource;
  canEditPublicPaper: boolean;
  canEditPersonalPaper: boolean;
  canAddNotes: boolean;
  canToggleVisibility: boolean;
  canEditContent: boolean;
  canEditStructure: boolean;
  canAccessEditor: boolean;
}

export function usePaperEditPermissions(source: ViewerSource): PaperEditPermissions {
  const capabilities = useViewerCapabilities(source);

  return useMemo(() => {
    const canEditAny = capabilities.canEditPublicPaper || capabilities.canEditPersonalPaper;

    const permissions = {
      source,
      ...capabilities,
      canEditContent: canEditAny,
      canEditStructure: canEditAny,
      canAccessEditor: canEditAny,
    };

    return permissions;
  }, [capabilities, source]);
}
