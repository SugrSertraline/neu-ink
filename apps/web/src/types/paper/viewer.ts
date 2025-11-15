export type ViewerSource =
  | 'public-guest'
  | 'public-admin'
  | 'personal-owner';

export type ViewerCapabilities = {
  canAddNotes: boolean;
  canEditPublicPaper: boolean;
  canEditPersonalPaper: boolean;
  canToggleVisibility: boolean;
};
