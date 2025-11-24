import ReferenceEditorDialog from '@/components/paper/ReferenceEditorDialog';
import MetadataEditorDialog from '@/components/paper/MetadataEditorDialog';
import AbstractAndKeywordsEditorDialog from '@/components/paper/AbstractAndKeywordsEditorDialog';
import ParseReferencesDialog from '@/components/paper/ParseReferencesDialog';

interface PaperDialogsProps {
  canEditContent: boolean;
  editingReferenceId: string | null;
  referenceDraft: any;
  referenceEditorMode: 'create' | 'edit';
  handleReferenceDraftChange: (reference: any) => void;
  handleReferenceEditorSubmit: () => void;
  handleReferenceEditorCancel: () => void;
  isMetadataEditorOpen: boolean;
  setIsMetadataEditorOpen: (open: boolean) => void;
  metadataEditorInitial: any;
  setMetadataEditorInitial: (initial: any) => void;
  metadataEditorError: string | null;
  setMetadataEditorError: (error: string | null) => void;
  isMetadataSubmitting: boolean;
  setIsMetadataSubmitting: (submitting: boolean) => void;
  handleMetadataOverlaySubmit: (next: any, abstract?: any, keywords?: any) => Promise<void>;
  handleMetadataOverlayCancel: () => void;
  isAbstractKeywordsEditorOpen: boolean;
  setIsAbstractKeywordsEditorOpen: (open: boolean) => void;
  abstractKeywordsEditorInitial: any;
  setAbstractKeywordsEditorInitial: (initial: any) => void;
  abstractKeywordsEditorError: string | null;
  setAbstractKeywordsEditorError: (error: string | null) => void;
  isAbstractKeywordsSubmitting: boolean;
  setIsAbstractKeywordsSubmitting: (submitting: boolean) => void;
  handleAbstractKeywordsOverlaySubmit: (
    setIsAbstractKeywordsEditorOpen: (open: boolean) => void,
    setAbstractKeywordsEditorInitial: (initial: any) => void,
    setAbstractKeywordsEditorError: (error: string | null) => void,
    setIsAbstractKeywordsSubmitting: (submitting: boolean) => void,
    abstract?: any,
    keywords?: any
  ) => Promise<void>;
  handleAbstractKeywordsOverlayCancel: () => void;
  isParseReferencesOpen: boolean;
  paperId: string;
  resolvedUserPaperId: string | null;
  isPersonalOwner: boolean;
  handleReferencesAdded: (references: any[]) => void;
  closeParseDialog: () => void;
}

export function PaperDialogs({
  canEditContent,
  editingReferenceId,
  referenceDraft,
  referenceEditorMode,
  handleReferenceDraftChange,
  handleReferenceEditorSubmit,
  handleReferenceEditorCancel,
  isMetadataEditorOpen,
  setIsMetadataEditorOpen,
  metadataEditorInitial,
  setMetadataEditorInitial,
  metadataEditorError,
  setMetadataEditorError,
  isMetadataSubmitting,
  setIsMetadataSubmitting,
  handleMetadataOverlaySubmit,
  handleMetadataOverlayCancel,
  isAbstractKeywordsEditorOpen,
  setIsAbstractKeywordsEditorOpen,
  abstractKeywordsEditorInitial,
  setAbstractKeywordsEditorInitial,
  abstractKeywordsEditorError,
  setAbstractKeywordsEditorError,
  isAbstractKeywordsSubmitting,
  setIsAbstractKeywordsSubmitting,
  handleAbstractKeywordsOverlaySubmit,
  handleAbstractKeywordsOverlayCancel,
  isParseReferencesOpen,
  paperId,
  resolvedUserPaperId,
  isPersonalOwner,
  handleReferencesAdded,
  closeParseDialog,
}: PaperDialogsProps) {
  return (
    <>
      {canEditContent && editingReferenceId && referenceDraft && (
        <ReferenceEditorDialog
          open={Boolean(editingReferenceId && referenceDraft)}
          onOpenChange={(open) => {
            if (!open) {
              handleReferenceEditorCancel();
            }
          }}
          mode={referenceEditorMode}
          reference={referenceDraft}
          onChange={handleReferenceDraftChange}
          onSave={handleReferenceEditorSubmit}
        />
      )}

      {canEditContent && isMetadataEditorOpen && metadataEditorInitial && (
        <MetadataEditorDialog
          open={isMetadataEditorOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleMetadataOverlayCancel();
            }
          }}
          metadata={metadataEditorInitial}
          abstract={metadataEditorInitial?.abstract}
          keywords={metadataEditorInitial?.keywords}
          onSubmit={handleMetadataOverlaySubmit}
          isSubmitting={isMetadataSubmitting}
          externalError={metadataEditorError}
          userPaperId={resolvedUserPaperId ?? undefined}
          paperId={paperId}
        />
      )}

      {canEditContent && isAbstractKeywordsEditorOpen && abstractKeywordsEditorInitial && (
        <AbstractAndKeywordsEditorDialog
          open={isAbstractKeywordsEditorOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleAbstractKeywordsOverlayCancel();
            }
          }}
          abstract={abstractKeywordsEditorInitial.abstract}
          keywords={abstractKeywordsEditorInitial.keywords}
          onSubmit={(abstract?: any, keywords?: any) =>
            handleAbstractKeywordsOverlaySubmit(
              setIsAbstractKeywordsEditorOpen,
              setAbstractKeywordsEditorInitial,
              setAbstractKeywordsEditorError,
              setIsAbstractKeywordsSubmitting,
              abstract,
              keywords
            )
          }
          isSubmitting={isAbstractKeywordsSubmitting}
          externalError={abstractKeywordsEditorError}
          userPaperId={resolvedUserPaperId ?? undefined}
          paperId={paperId}
        />
      )}

      {/* 参考文献解析对话框 */}
      {canEditContent && (
        <ParseReferencesDialog
          open={isParseReferencesOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeParseDialog();
            }
          }}
          paperId={paperId}
          userPaperId={resolvedUserPaperId}
          isPersonalOwner={isPersonalOwner}
          onReferencesAdded={handleReferencesAdded}
        />
      )}
    </>
  );
}