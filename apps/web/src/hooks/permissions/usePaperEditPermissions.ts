import { useMemo } from 'react';
import { useViewerCapabilities } from './useViewerCapabilities';
import type { ViewerSource, PaperEditPermissions } from '@/types/paper/viewer';

/**
 * 权限计算逻辑 Hook
 * @param source 权限源
 * @returns 扩展的编辑权限
 */
export function usePaperEditPermissions(source: ViewerSource): PaperEditPermissions {
  const capabilities = useViewerCapabilities(source);

  return useMemo(() => {
    const canEditAny = capabilities.canEditPublicPaper || capabilities.canEditPersonalPaper;

    const permissions: PaperEditPermissions = {
      source,
      ...capabilities,
      canEditContent: canEditAny,
      canEditStructure: canEditAny,
      canAccessEditor: canEditAny,
    };

    return permissions;
  }, [capabilities, source]);
}