import { ViewerSource, ViewerCapabilities } from '@/types/paper/viewer';

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

export function useViewerCapabilities(source: ViewerSource): ViewerCapabilities {
  return capabilityMap[source] ?? fallbackCapabilities;
}
