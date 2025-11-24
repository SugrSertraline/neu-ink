import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MOTION, PANEL_DELAY_IN } from '@/lib/utils/paperPageUtils';
import PersonalNotePanel from '@/components/paper/PersonalNotePanel';

interface PaperNotesPanelProps {
  showNotesPanel: boolean;
  selectedBlockId: string | null;
  selectedBlockInfo: any;
  notesForSelectedBlock: any[];
  notesLoading: boolean;
  notesMutating: boolean;
  notesError: any;
  loadNotes: () => void;
  displayContent: any;
  highlightedRefs: string[];
  setHighlightedRefs: (refs: string[]) => void;
  contentRef: React.RefObject<HTMLDivElement>;
  notesFixedStyle: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  notesOpen: boolean;
  handleCreateNote: (blockId: string, content: any[]) => Promise<void>;
  handleUpdateNote: (blockId: string, noteId: string, content: any[]) => Promise<void>;
  handleDeleteNote: (blockId: string, noteId: string) => Promise<void>;
  handleCloseNotes: () => void;
}

export function PaperNotesPanel({
  showNotesPanel,
  selectedBlockId,
  selectedBlockInfo,
  notesForSelectedBlock,
  notesLoading,
  notesMutating,
  notesError,
  loadNotes,
  displayContent,
  highlightedRefs,
  setHighlightedRefs,
  contentRef,
  notesFixedStyle,
  notesOpen,
  handleCreateNote,
  handleUpdateNote,
  handleDeleteNote,
  handleCloseNotes,
}: PaperNotesPanelProps) {
  if (!showNotesPanel || !selectedBlockId) return null;

  return (
    <>
      {/* 移动端 notes：顺滑折叠展开 */}
      <AnimatePresence initial={false}>
        <motion.div
          key="notes-mobile"
          className="lg:hidden rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={MOTION}
        >
          <PersonalNotePanel
            blockId={selectedBlockId!}
            sectionId={selectedBlockInfo?.section?.id ?? ''}
            sectionLabel={String(selectedBlockInfo?.section?.title ?? 'Section')}
            blockLabel={`Block ${(selectedBlockInfo?.blockIndex ?? 0) + 1}`}
            notes={notesForSelectedBlock}
            onCreateNote={content => handleCreateNote(selectedBlockId!, content)}
            onUpdateNote={(noteId, content) =>
              handleUpdateNote(selectedBlockId!, noteId, content)
            }
            onDeleteNote={noteId => handleDeleteNote(selectedBlockId!, noteId)}
            references={displayContent.references ?? []}
            highlightedRefs={highlightedRefs}
            setHighlightedRefs={setHighlightedRefs}
            contentRef={contentRef}
            onClose={handleCloseNotes}
            isLoading={notesLoading}
            isMutating={notesMutating}
            error={notesError}
            onRetry={loadNotes}
          />
        </motion.div>
      </AnimatePresence>

      {/* 桌面端固定（fixed）笔记：Portal + 动画（先内容左移，后滑入） */}
      {createPortal(
        <AnimatePresence>
          {notesFixedStyle ? (
            <motion.div
              key="notes-desktop"
              className="hidden lg:block fixed z-50"
              style={{
                top: notesFixedStyle.top,
                left: notesFixedStyle.left,
                width: notesFixedStyle.width,
                height: notesFixedStyle.height,
              }}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ ...MOTION, delay: PANEL_DELAY_IN }}
            >
              <div
                className="
                  h-full
                  rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-lg
                  dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
                  overflow-y-auto
                "
              >
                <PersonalNotePanel
                  blockId={selectedBlockId!}
                  sectionId={selectedBlockInfo?.section?.id ?? ''}
                  sectionLabel={String(selectedBlockInfo?.section?.title ?? 'Section')}
                  blockLabel={`Block ${(selectedBlockInfo?.blockIndex ?? 0) + 1}`}
                  notes={notesForSelectedBlock}
                  onCreateNote={content => handleCreateNote(selectedBlockId!, content)}
                  onUpdateNote={(noteId, content) =>
                    handleUpdateNote(selectedBlockId!, noteId, content)
                  }
                  onDeleteNote={noteId => handleDeleteNote(selectedBlockId!, noteId)}
                  references={displayContent.references ?? []}
                  highlightedRefs={highlightedRefs}
                  setHighlightedRefs={setHighlightedRefs}
                  contentRef={contentRef}
                  onClose={handleCloseNotes}
                  isLoading={notesLoading}
                  isMutating={notesMutating}
                  error={notesError}
                  onRetry={loadNotes}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}