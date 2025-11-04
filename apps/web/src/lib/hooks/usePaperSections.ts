// hooks/usePaperSections.ts
import { useCallback } from 'react';
import type { Section, PaperContent as PaperContentModel } from '@/types/paper';
import { createEmptySection } from '../utils/paperHelpers';

export function usePaperSections(
  setEditableDraft: React.Dispatch<React.SetStateAction<PaperContentModel | null>>,
  setHasUnsavedChanges: (value: boolean) => void
) {
  const updateSections = useCallback(
  (updater: (sections: Section[]) => { sections: Section[]; touched: boolean }) => {
    let didTouch = false;

    setEditableDraft(prev => {
      if (!prev) return prev;
      const { sections, touched } = updater(prev.sections);
      if (touched) {
        didTouch = true;
        return { ...prev, sections };
      }
      return prev;
    });

    if (didTouch) {
      setHasUnsavedChanges(true);
    }
  },
  [setEditableDraft, setHasUnsavedChanges]
);


  const updateSectionTree = useCallback(
    (sectionId: string, apply: (section: Section) => Section) => {
      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            let nextSection = section;
            if (section.id === sectionId) {
              touched = true;
              nextSection = apply(section);
            }
            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
              }
            }
            return nextSection;
          });

        const next = walk(sections);
        return { sections: touched ? next : sections, touched };
      });
    },
    [updateSections]
  );

 const handleSectionTitleUpdate = useCallback(
  (sectionId: string, nextTitle: Section['title']) => {
    updateSectionTree(sectionId, section => ({
      ...section,
      title: { ...section.title, ...nextTitle },
    }));
  },
  [updateSectionTree]
);


  const handleSectionAddSubsection = useCallback(
    (sectionId: string) => {
      updateSectionTree(sectionId, section => ({
        ...section,
        subsections: [...(section.subsections ?? []), createEmptySection()],
      }));
    },
    [updateSectionTree]
  );

  const handleSectionInsert = useCallback(
    (
      targetSectionId: string | null,
      position: 'above' | 'below',
      parentSectionId: string | null
    ) => {
      updateSections(sections => {
        const newSection = createEmptySection();
        let touched = false;
        let inserted = false;

        const insertIntoList = (list: Section[]): Section[] => {
          if (inserted) return list;
          const nextList = [...list];
          if (targetSectionId) {
            const targetIdx = nextList.findIndex(section => section.id === targetSectionId);
            if (targetIdx !== -1) {
              const insertIdx = position === 'above' ? targetIdx : targetIdx + 1;
              nextList.splice(insertIdx, 0, newSection);
              touched = true;
              inserted = true;
              return nextList;
            }
          }
          nextList.push(newSection);
          touched = true;
          inserted = true;
          return nextList;
        };

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            if (inserted) return section;
            if (section.id === parentSectionId) {
              const current = section.subsections ?? [];
              const nextSubsections = insertIntoList(current);
              if (nextSubsections !== current) {
                return { ...section, subsections: nextSubsections };
              }
              return section;
            }
            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                return { ...section, subsections: nextSubsections };
              }
            }
            return section;
          });

        let nextSections = sections;
        if (parentSectionId === null) {
          nextSections = insertIntoList(sections);
        } else {
          nextSections = walk(sections);
        }

        if (!inserted) {
          nextSections = insertIntoList(nextSections);
        }

        return { sections: touched ? nextSections : sections, touched };
      });
    },
    [updateSections]
  );

  const handleSectionMove = useCallback(
    (sectionId: string, direction: 'up' | 'down', parentSectionId: string | null) => {
      updateSections(sections => {
        let touched = false;
        let moved = false;

        const reorder = (list: Section[]): Section[] => {
          const idx = list.findIndex(section => section.id === sectionId);
          if (idx === -1) return list;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= list.length) return list;
          const nextList = [...list];
          const [item] = nextList.splice(idx, 1);
          nextList.splice(targetIdx, 0, item);
          touched = true;
          moved = true;
          return nextList;
        };

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            if (moved) return section;
            if (section.id === parentSectionId) {
              const current = section.subsections ?? [];
              const nextSubsections = reorder(current);
              if (nextSubsections !== current) {
                return { ...section, subsections: nextSubsections };
              }
              return section;
            }
            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                return { ...section, subsections: nextSubsections };
              }
            }
            return section;
          });

        let nextSections = sections;
        if (parentSectionId === null) {
          nextSections = reorder(sections);
        } else {
          nextSections = walk(sections);
          if (!moved) {
            const fallback = reorder(sections);
            if (moved) {
              nextSections = fallback;
            }
          }
        }

        return { sections: touched ? nextSections : sections, touched };
      });
    },
    [updateSections]
  );

  const handleSectionDelete = useCallback(
    (sectionId: string) => {
      updateSections(sections => {
        let touched = false;

        const prune = (nodes: Section[]): Section[] => {
          const nextNodes: Section[] = [];
          nodes.forEach(section => {
            if (section.id === sectionId) {
              touched = true;
              return;
            }
            let nextSection = section;
            if (section.subsections?.length) {
              const nextSubsections = prune(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
              }
            }
            nextNodes.push(nextSection);
          });
          return nextNodes;
        };

        const next = prune(sections);
        return { sections: touched ? next : sections, touched };
      });
    },
    [updateSections]
  );

  return {
    updateSections,
    updateSectionTree,
    handleSectionTitleUpdate,
    handleSectionAddSubsection,
    handleSectionInsert,
    handleSectionMove,
    handleSectionDelete,
  };
}
