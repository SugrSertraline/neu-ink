// hooks/usePaperBlocks.ts
import { useCallback } from 'react';
import type { BlockContent, Section, PaperContent as PaperContentModel } from '@/types/paper';
import { cloneBlock, createBlock, createPlaceholderParagraph, generateId } from '../utils/paperHelpers';

export function usePaperBlocks(
  lang: 'en' | 'both',
  updateSections: (
    updater: (sections: Section[]) => { sections: Section[]; touched: boolean }
  ) => void,
  setActiveBlockId: (id: string | null) => void
) {
  const updateBlockTree = useCallback(
    (
      blockId: string,
      apply: (
        section: Section,
        block: BlockContent
      ) => { section?: Section; block?: BlockContent; remove?: boolean; insertAfter?: BlockContent }
    ) => {
      updateSections(sections => {
        let touched = false;

        const walkSections = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            let nextSection = section;
            let contentChanged = false;

            const nextContent = section.content
              .map(block => {
                if (block.id !== blockId) return block;
                touched = true;
                contentChanged = true;
                const result = apply(section, block);
                if (result.remove) return null;
                if (result.block) return result.block;
                return block;
              })
              .filter(Boolean) as BlockContent[];

            if (contentChanged) {
              nextSection = { ...nextSection, content: nextContent };
            }

            if (section.subsections?.length) {
              const nextSubsections = walkSections(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
              }
            }

            const foundBlock = section.content.find(b => b.id === blockId);
            const result = foundBlock ? apply(section, foundBlock) : {};
            if (result.insertAfter) {
              const idx = nextContent.findIndex(b => b.id === blockId);
              if (idx >= 0) {
                const withInsert = [...nextContent];
                withInsert.splice(idx + 1, 0, result.insertAfter);
                nextSection = { ...nextSection, content: withInsert };
              }
            }

            return nextSection;
          });

        const next = walkSections(sections);
        return { sections: touched ? next : sections, touched };
      });
    },
    [updateSections]
  );

  const handleBlockUpdate = useCallback(
    (blockId: string, nextBlock: BlockContent) => {
      updateBlockTree(blockId, () => ({ block: nextBlock }));
    },
    [updateBlockTree]
  );

  const handleBlockDuplicate = useCallback(
    (blockId: string) => {
      updateBlockTree(blockId, (_, block) => {
        if (!block) return {};
        return {
          insertAfter: { ...cloneBlock(block), id: generateId(`${block.type}`) },
        };
      });
    },
    [updateBlockTree]
  );

  const handleBlockDelete = useCallback(
    (blockId: string) => {
      updateBlockTree(blockId, () => ({ remove: true }));
    },
    [updateBlockTree]
  );

  const handleBlockInsert = useCallback(
    (blockId: string, position: 'above' | 'below') => {
      let newBlockId: string | null = null;

      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            let nextSection = section;

            if (idx !== -1) {
              const newBlock = createPlaceholderParagraph(lang);
              newBlockId = newBlock.id;
              const nextContent = [...section.content];
              const insertIndex = position === 'above' ? idx : idx + 1;
              nextContent.splice(insertIndex, 0, newBlock);
              nextSection = { ...section, content: nextContent };
              touched = true;
            }

            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...section, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      if (newBlockId) {
        setActiveBlockId(newBlockId);
      }
    },
    [lang, setActiveBlockId, updateSections]
  );

  const handleBlockMove = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      let didMove = false;

      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            let nextSection = section;

            if (idx !== -1) {
              const targetIndex = direction === 'up' ? idx - 1 : idx + 1;
              if (targetIndex < 0 || targetIndex >= section.content.length) {
                return section;
              }
              const nextContent = [...section.content];
              const [moving] = nextContent.splice(idx, 1);
              nextContent.splice(targetIndex, 0, moving);
              nextSection = { ...section, content: nextContent };
              touched = true;
              didMove = true;
            }

            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      if (didMove) {
        setActiveBlockId(blockId);
      }
    },
    [setActiveBlockId, updateSections]
  );

  const handleBlockAppendSubsection = useCallback(
    (blockId: string) => {
      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            let nextSection = section;

            if (section.content.some(block => block.id === blockId)) {
              const nextSubsections = [...(section.subsections ?? []), createEmptySection()];
              nextSection = { ...section, subsections: nextSubsections };
              touched = true;
            } else if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });
    },
    [updateSections]
  );

  const handleBlockAddComponent = useCallback(
    (blockId: string, type: BlockContent['type']) => {
      let newBlockId: string | null = null;

      updateSections(sections => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map(section => {
            const idx = section.content.findIndex(block => block.id === blockId);
            let nextSection = section;

            if (idx !== -1) {
              const newBlock = createBlock(type, lang);
              newBlockId = newBlock.id;
              const nextContent = [...section.content];
              nextContent.splice(idx + 1, 0, newBlock);
              nextSection = { ...section, content: nextContent };
              touched = true;
            }

            if (section.subsections?.length) {
              const nextSubsections = walk(section.subsections);
              if (nextSubsections !== section.subsections) {
                nextSection = { ...nextSection, subsections: nextSubsections };
                touched = true;
              }
            }

            return nextSection;
          });

        const nextSections = walk(sections);
        return { sections: touched ? nextSections : sections, touched };
      });

      if (newBlockId) {
        setActiveBlockId(newBlockId);
      }
    },
    [lang, setActiveBlockId, updateSections]
  );

  return {
    handleBlockUpdate,
    handleBlockDuplicate,
    handleBlockDelete,
    handleBlockInsert,
    handleBlockMove,
    handleBlockAppendSubsection,
    handleBlockAddComponent,
  };
}

function createEmptySection(): Section {
  return {
    id: generateId('section'),
    title: { en: 'Untitled Section', zh: '未命名章节' },
    content: [],
    subsections: [],
  };
}
