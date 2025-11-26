import { useMemo } from 'react';
import type { ViewerSource, ViewerCapabilities } from '@/types/paper/viewer';

const capabilityMap: Record<ViewerSource, ViewerCapabilities> = {
  'public-guest': {
    canAddNotes: false,
    canEditPublicPaper: false,
    canEditPersonalPaper: false,
    canToggleVisibility: false,
  },
  'public-admin': {
    canAddNotes: false,
    canEditPublicPaper: true,
    canEditPersonalPaper: false,
    canToggleVisibility: true,
  },
  'personal-owner': {
    canAddNotes: true,
    canEditPublicPaper: false,
    canEditPersonalPaper: true,
    canToggleVisibility: false,
  },
};

const fallbackCapabilities = capabilityMap['public-guest'];

/**
 * 基础权限映射 Hook
 * @param source 权限源
 * @returns 基础权限配置
 */
export function useViewerCapabilities(source: ViewerSource): ViewerCapabilities {
  return useMemo(() => {
    return capabilityMap[source] ?? fallbackCapabilities;
  }, [source]);
}