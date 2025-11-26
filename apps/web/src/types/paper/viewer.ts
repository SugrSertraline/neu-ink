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

export type PaperEditPermissions = {
  source: ViewerSource;
  canEditPublicPaper: boolean;
  canEditPersonalPaper: boolean;
  canAddNotes: boolean;
  canToggleVisibility: boolean;
  canEditContent: boolean;
  canEditStructure: boolean;
  canAccessEditor: boolean;
};
