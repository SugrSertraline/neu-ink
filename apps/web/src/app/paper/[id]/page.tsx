'use client';

import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useTabStore } from '@/stores/useTabStore';
import { useEditingState } from '@/stores/useEditingState';
import { ViewerSource } from '@/types/paper/viewer';
import { usePaperLoader } from '@/lib/hooks/usePaperLoader';
import PaperHeader from '@/components/paper/PaperHeader';
import PaperMetadata from '@/components/paper/PaperMetadata';
import PaperContent from '@/components/paper/PaperContent';
import PaperReferences from '@/components/paper/PaperReferences';
import type {
  Paper,
  PaperContent as PaperContentModel,
  Section,
  BlockContent,
  ParagraphBlock,
  InlineContent,
  Note,
  NoteListData,
  CreateNoteRequest,
  UpdateNoteRequest,
} from '@/types/paper';
import { useAuth } from '@/contexts/AuthContext';
import { usePaperEditPermissions } from '@/lib/hooks/usePaperEditPermissions';
import { PaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import { adminPaperService, noteService } from '@/lib/services/paper';
import PersonalNotePanel from '@/components/paper/PersonalNotePanel';
import type { UnifiedResult } from '@/types/api';

type Lang = 'en' | 'both';

const HEADER_HEIGHT = 112;
const NOTES_PANEL_WIDTH = 320;
const NOTES_PANEL_GAP = 32;
const NOTES_PANEL_SHIFT = (NOTES_PANEL_WIDTH + NOTES_PANEL_GAP) / 2;
const NOTES_PANEL_TOP = HEADER_HEIGHT + 24;

const generateId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const cloneBlock = (block: BlockContent): BlockContent => {
  if (!block || !block.type) {
    console.error('无效的块对象:', block);
    return {
      id: generateId('paragraph'),
      type: 'paragraph',
      align: 'left',
      content: {
        en: [{ type: 'text', content: 'New paragraph' }],
      },
    };
  }

  try {
    if (typeof structuredClone !== 'undefined') {
      return structuredClone(block);
    }
    return JSON.parse(
      JSON.stringify(block, (key, value) => (value === undefined ? null : value)),
    );
  } catch (error) {
    console.error('克隆块时出错:', error);
    const cloned = { ...block };
    cloned.id = generateId(block.type);
    return cloned;
  }
};

const createEmptySection = (): Section => ({
  id: generateId('section'),
  title: { en: 'Untitled Section', zh: '未命名章节' },
  content: [],
  subsections: [],
});

const createBlock = (type: BlockContent['type'], lang: Lang): BlockContent => {
  const id = generateId(type);

  switch (type) {
    case 'paragraph':
      return {
        id,
        type: 'paragraph',
        align: 'left',
        content: {
          en: [{ type: 'text', content: 'New paragraph' }],
          ...(lang === 'both' && { zh: [{ type: 'text', content: '新的段落' }] }),
        },
      };
    case 'heading':
      return {
        id,
        type: 'heading',
        level: 2,
        content: {
          en: [{ type: 'text', content: 'New Heading' }],
          ...(lang === 'both' && { zh: [{ type: 'text', content: '新标题' }] }),
        },
      };
    case 'math':
      return {
        id,
        type: 'math',
        latex: 'E = mc^2',
      };
    case 'figure':
      return {
        id,
        type: 'figure',
        src: '',
        caption: {
          en: [{ type: 'text', content: 'Figure caption' }],
          ...(lang === 'both' && { zh: [{ type: 'text', content: '图片标题' }] }),
        },
      };
    case 'table':
      return {
        id,
        type: 'table',
        headers: ['Column 1', 'Column 2'],
        rows: [
          ['Row 1 Col 1', 'Row 1 Col 2'],
          ['Row 2 Col 1', 'Row 2 Col 2'],
        ],
        caption: {
          en: [{ type: 'text', content: 'Table caption' }],
          ...(lang === 'both' && { zh: [{ type: 'text', content: '表格标题' }] }),
        },
      };
    case 'code':
      return {
        id,
        type: 'code',
        language: 'javascript',
        code: '// Your code here\nconsole.log("Hello, World!");',
        caption: {
          en: [{ type: 'text', content: 'Code example' }],
          ...(lang === 'both' && { zh: [{ type: 'text', content: '代码示例' }] }),
        },
      };
    case 'ordered-list':
      return {
        id,
        type: 'ordered-list',
        start: 1,
        items: [
          {
            content: {
              en: [{ type: 'text', content: 'First item' }],
              ...(lang === 'both' && { zh: [{ type: 'text', content: '第一项' }] }),
            },
          },
          {
            content: {
              en: [{ type: 'text', content: 'Second item' }],
              ...(lang === 'both' && { zh: [{ type: 'text', content: '第二项' }] }),
            },
          },
        ],
      };
    case 'unordered-list':
      return {
        id,
        type: 'unordered-list',
        items: [
          {
            content: {
              en: [{ type: 'text', content: 'First item' }],
              ...(lang === 'both' && { zh: [{ type: 'text', content: '第一项' }] }),
            },
          },
          {
            content: {
              en: [{ type: 'text', content: 'Second item' }],
              ...(lang === 'both' && { zh: [{ type: 'text', content: '第二项' }] }),
            },
          },
        ],
      };
    case 'quote':
      return {
        id,
        type: 'quote',
        author: 'Author',
        content: {
          en: [{ type: 'text', content: 'Quote text' }],
          ...(lang === 'both' && { zh: [{ type: 'text', content: '引用文本' }] }),
        },
      };
    case 'divider':
      return {
        id,
        type: 'divider',
      };
    default:
      return createBlock('paragraph', lang);
  }
};

type PersonalNoteItem = {
  id: string;
  blockId: string;
  content: InlineContent[];
  createdAt: number;
  updatedAt: number;
};

const toTimestamp = (value: unknown): number => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  const ts = new Date(value as string).getTime();
  return Number.isNaN(ts) ? Date.now() : ts;
};

const parseInlineContent = (raw: unknown): InlineContent[] => {
  if (Array.isArray(raw)) {
    return raw as InlineContent[];
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as InlineContent[]) : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    return Array.isArray((raw as { nodes?: unknown }).nodes)
      ? ((raw as { nodes: InlineContent[] }).nodes ?? [])
      : [];
  }
  return [];
};

const extractPlainText = (nodes: InlineContent[]): string => {
  const visit = (nodeList: InlineContent[]): string =>
    nodeList
      .map(node => {
        if (!node) return '';
        const data = node as any;
        switch (data.type) {
          case 'text':
            return data.content ?? '';
          case 'math':
            return data.content ?? data.latex ?? '';
          case 'link':
          case 'strong':
          case 'emphasis':
          case 'underline':
          case 'subscript':
          case 'superscript':
          case 'reference':
            return visit(Array.isArray(data.children) ? data.children : []);
          default:
            if (Array.isArray(data.children)) return visit(data.children);
            return '';
        }
      })
      .join('');
  return visit(nodes).trim();
};

const adaptNoteFromApi = (note: Note, fallbackBlockId?: string): PersonalNoteItem => {
  const blockId =
    (note as any).blockId ??
    (note as any).block_id ??
    fallbackBlockId ??
    '';
  return {
    id: note.id,
    blockId,
    content: parseInlineContent((note as any).content ?? (note as any).contentJson),
    createdAt: toTimestamp((note as any).createdAt ?? (note as any).created_at),
    updatedAt: toTimestamp((note as any).updatedAt ?? (note as any).updated_at),
  };
};

const sortNotesDesc = (notes: PersonalNoteItem[]) =>
  [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

const groupNotesByBlock = (notes: PersonalNoteItem[]): Record<string, PersonalNoteItem[]> => {
  const map: Record<string, PersonalNoteItem[]> = {};
  notes.forEach(note => {
    if (!note.blockId) return;
    if (!map[note.blockId]) {
      map[note.blockId] = [];
    }
    map[note.blockId].push(note);
  });
  Object.keys(map).forEach(key => {
    map[key] = sortNotesDesc(map[key]);
  });
  return map;
};

const ensureUnified = <T,>(result: UnifiedResult<T>): T => {
  if (result.bizCode === 0 && result.data) {
    return result.data;
  }
  throw new Error(result.bizMessage ?? '未知错误');
};

const pickNoteArray = (payload: NoteListData | null | undefined): Note[] => {
  if (!payload) return [];
  const anyPayload = payload as any;
  if (Array.isArray(anyPayload.notes)) return anyPayload.notes as Note[];
  if (Array.isArray(anyPayload.items)) return anyPayload.items as Note[];
  if (Array.isArray(anyPayload.list)) return anyPayload.list as Note[];
  return [];
};

export default function PaperPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { tabs } = useTabStore();
  const { user, isAdmin } = useAuth();

  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const tabData = useMemo(() => {
    const tabKey = `paper:${paperId}`;
    const tab = tabs.find(t => t.id === tabKey);
    return (tab?.data ?? {}) as {
      paperId?: string;
      userPaperId?: string;
      source?: ViewerSource;
      initialPaper?: Paper;
    };
  }, [tabs, paperId]);

  const urlSource = (searchParams?.get('source') ?? null) as ViewerSource | null;

  const sourceCandidates = useMemo<ViewerSource[]>(() => {
    const seen = new Set<ViewerSource>();
    const push = (s?: ViewerSource | null) => {
      if (s && !seen.has(s)) seen.add(s);
    };

    push(urlSource);
    push(tabData.source);

    if (tabData.initialPaper) {
      push(tabData.initialPaper.isPublic ? 'public-guest' : 'personal-owner');
    }

    if (user) {
      push(isAdmin ? 'public-admin' : 'personal-owner');
    }

    push(isAdmin ? 'public-admin' : 'public-guest');

    return Array.from(seen) as ViewerSource[];
  }, [tabData.source, tabData.initialPaper, urlSource, user, isAdmin]);

  const { paper, isLoading, error, activeSource } = usePaperLoader(
    paperId,
    sourceCandidates,
    tabData.initialPaper,
  );

  const effectiveSource = activeSource ?? sourceCandidates[0] ?? 'public-guest';
  const permissions = usePaperEditPermissions(effectiveSource);

  const canEditContent = permissions.canEditContent;
  const canToggleVisibility = permissions.canToggleVisibility;
  const isPublicVisible = paper?.isPublic ?? false;
  const isPersonalOwner = effectiveSource === 'personal-owner';

  const { setHasUnsavedChanges } = useEditingState();

  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);

  const [notesByBlock, setNotesByBlock] = useState<Record<string, PersonalNoteItem[]>>({});
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesMutating, setNotesMutating] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paper) {
      setEditableDraft(null);
      return;
    }

    setEditableDraft({
      metadata: paper.metadata,
      abstract: paper.abstract,
      keywords: paper.keywords,
      sections: paper.sections,
      references: paper.references,
      attachments: paper.attachments,
    });
    setHasUnsavedChanges(false);
  }, [paper, setHasUnsavedChanges]);

  useEffect(() => {
    if (!isPersonalOwner) {
      setSelectedBlockId(null);
    }
  }, [isPersonalOwner]);

  const displayContent = editableDraft ?? paper ?? null;
  const urlUserPaperId = searchParams?.get('userPaperId');

  const resolvedUserPaperId = useMemo(() => {
    if (!isPersonalOwner) return null;
    if (urlUserPaperId) return urlUserPaperId;
    if (tabData.userPaperId) return tabData.userPaperId;
    if (paper && (paper as any).userPaperId) return (paper as any).userPaperId as string;
    return null;
  }, [isPersonalOwner, urlUserPaperId, tabData.userPaperId, paper]);


  const blockContextMap = useMemo(() => {
    const map = new Map<
      string,
      {
        sectionId: string;
        sectionPath: number[];
        sectionTitle?: string;
        blockOrder: number;
        blockType: BlockContent['type'];
      }
    >();

    const walk = (sections: PaperContentModel['sections'] = [], path: number[] = []) => {
      sections.forEach((section, sectionIndex) => {
        const sectionPath = [...path, sectionIndex + 1];

        section.content?.forEach((block, blockIndex) => {
          map.set(block.id, {
            sectionId: section.id,
            sectionPath,
            sectionTitle: section.title?.zh || section.title?.en,
            blockOrder: blockIndex + 1,
            blockType: block.type,
          });
        });

        if (section.subsections?.length) {
          walk(section.subsections, sectionPath);
        }
      });
    };

    walk(displayContent?.sections);
    return map;
  }, [displayContent?.sections]);

  const loadNotes = useCallback(async () => {
    if (!isPersonalOwner || !resolvedUserPaperId) {
      setNotesByBlock({});
      setNotesError(null);
      return;
    }
    setNotesLoading(true);
    setNotesError(null);
    try {
      const response = await noteService.getNotesByPaper(resolvedUserPaperId);
      const data = ensureUnified(response);
      const notesRaw = pickNoteArray(data);
      const personalNotes = notesRaw.map(note => adaptNoteFromApi(note));
      setNotesByBlock(groupNotesByBlock(personalNotes));
    } catch (err) {
      console.error('加载笔记失败', err);
      setNotesError(err instanceof Error ? err.message : '加载笔记失败，请稍后重试');
      setNotesByBlock({});
    } finally {
      setNotesLoading(false);
    }
  }, [isPersonalOwner, resolvedUserPaperId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const buildCreatePayload = useCallback(
    (blockId: string, content: InlineContent[]): CreateNoteRequest => ({
      userPaperId: resolvedUserPaperId ?? '',
      blockId,
      content,
      plainText: extractPlainText(content),
    }) as CreateNoteRequest,
    [resolvedUserPaperId],
  );

  const buildUpdatePayload = useCallback(
    (content: InlineContent[]): UpdateNoteRequest => ({
      content,
      plainText: extractPlainText(content),
    }) as UpdateNoteRequest,
    [],
  );

  const handleSearchNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (!searchResults.length) return;
      const delta = direction === 'next' ? 1 : -1;
      const nextIndex =
        (currentSearchIndex + delta + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(nextIndex);

      const targetBlockId = searchResults[nextIndex];
      const targetElement = document.getElementById(targetBlockId);

      if (targetElement && contentRef.current) {
        const containerRect = contentRef.current.getBoundingClientRect();
        const elementRect = targetElement.getBoundingClientRect();
        const scrollTop = contentRef.current.scrollTop;
        const targetTop = scrollTop + (elementRect.top - containerRect.top) - 100;
        contentRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      } else if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setActiveBlockId(targetBlockId);
      window.setTimeout(() => setActiveBlockId(null), 2000);
    },
    [searchResults, currentSearchIndex],
  );

  const updateSections = useCallback(
    (updater: (sections: Section[]) => { sections: Section[]; touched: boolean }) => {
      setEditableDraft(prev => {
        if (!prev) return prev;
        const { sections, touched } = updater(prev.sections);
        if (touched) {
          setHasUnsavedChanges(true);
        }
        return touched ? { ...prev, sections } : prev;
      });
    },
    [setHasUnsavedChanges],
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
    [updateSections],
  );

  const createPlaceholderParagraph = useCallback((): ParagraphBlock => {
    const content: ParagraphBlock['content'] = {
      en: [{ type: 'text', content: 'New paragraph' }],
    };
    if (lang === 'both') {
      content.zh = [{ type: 'text', content: '新的段落' }];
    }
    return {
      id: generateId('paragraph'),
      type: 'paragraph',
      align: 'left',
      content,
    };
  }, [lang]);

  const handleSectionTitleUpdate = useCallback(
    (sectionId: string, nextTitle: Section['title']) => {
      updateSectionTree(sectionId, section => ({
        ...section,
        title: { ...section.title, ...nextTitle },
      }));
      setHasUnsavedChanges(true);
    },
    [updateSectionTree, setHasUnsavedChanges],
  );

  const handleMetadataUpdate = useCallback(
    (metadata: PaperContentModel['metadata']) => {
      setEditableDraft(prev => {
        if (!prev) return prev;
        setHasUnsavedChanges(true);
        return { ...prev, metadata };
      });
    },
    [setHasUnsavedChanges],
  );

  const handleSectionAddSubsection = useCallback(
    (sectionId: string) => {
      updateSectionTree(sectionId, section => ({
        ...section,
        subsections: [...(section.subsections ?? []), createEmptySection()],
      }));
    },
    [updateSectionTree],
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
    [updateSections],
  );

  const updateBlockTree = useCallback(
    (
      blockId: string,
      apply: (
        section: Section,
        block: BlockContent,
      ) => { section?: Section; block?: BlockContent; remove?: boolean; insertAfter?: BlockContent },
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
    [updateSections],
  );

  const handleBlockUpdate = useCallback(
    (blockId: string, nextBlock: BlockContent) => {
      updateBlockTree(blockId, () => ({ block: nextBlock }));
    },
    [updateBlockTree],
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
    [updateBlockTree],
  );

  const handleBlockDelete = useCallback(
    (blockId: string) => {
      updateBlockTree(blockId, () => ({ remove: true }));
    },
    [updateBlockTree],
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
              const newBlock = createPlaceholderParagraph();
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
    [createPlaceholderParagraph, setActiveBlockId, updateSections],
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
    [setActiveBlockId, updateSections],
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
    [updateSections],
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
    [lang, setActiveBlockId, updateSections],
  );

  const handlePreviewBlockClick = useCallback((blockId: string) => {
    setActiveBlockId(blockId);
  }, []);

  const handleBlockNoteToggle = useCallback((blockId: string) => {
    setSelectedBlockId(prev => (prev === blockId ? null : blockId));
  }, []);

  const handleBlockSelect = useCallback(
    (blockId: string) => {
      handlePreviewBlockClick(blockId);
      if (isPersonalOwner) {
        handleBlockNoteToggle(blockId);
      }
    },
    [handlePreviewBlockClick, handleBlockNoteToggle, isPersonalOwner],
  );

  const handleCloseNotes = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editableDraft) return;

    try {
      const result = await adminPaperService.updatePaper(paperId, editableDraft);

      if (result.bizCode === 0) {
        setHasUnsavedChanges(false);
      } else {
        alert(`保存失败：${result.bizMessage}`);
      }
    } catch (err) {
      console.error('保存过程中出错：', err);
      alert('保存过程中出错，请稍后重试');
    }
  }, [editableDraft, paperId, setHasUnsavedChanges]);

  const handleCreateNote = useCallback(
    async (blockId: string, content: InlineContent[]) => {
      if (!resolvedUserPaperId) {
        alert('未找到个人论文标识，无法创建笔记。');
        return;
      }
      setNotesMutating(true);
      try {
        const payload = buildCreatePayload(blockId, content);
        const response = await noteService.createNote(payload);
        const created = adaptNoteFromApi(ensureUnified(response), blockId);
        setNotesByBlock(prev => {
          const next = { ...prev };
          const bucket = next[created.blockId] ?? [];
          next[created.blockId] = sortNotesDesc([...bucket, created]);
          return next;
        });
      } catch (err) {
        console.error('创建笔记失败', err);
        alert(err instanceof Error ? err.message : '创建笔记失败，请稍后重试');
      } finally {
        setNotesMutating(false);
      }
    },
    [resolvedUserPaperId, buildCreatePayload],
  );

  const handleUpdateNote = useCallback(
    async (blockId: string, noteId: string, content: InlineContent[]) => {
      if (!resolvedUserPaperId) {
        alert('未找到个人论文标识，无法更新笔记。');
        return;
      }
      setNotesMutating(true);
      try {
        const payload = buildUpdatePayload(content);
        const response = await noteService.updateNote(noteId, payload);
        const updated = adaptNoteFromApi(ensureUnified(response), blockId);

        setNotesByBlock(prev => {
          const next = { ...prev };
          const originalBucket = next[blockId] ?? [];
          const stillInOriginal = originalBucket.some(note => note.id === noteId);
          if (stillInOriginal) {
            const cleaned = originalBucket.filter(note => note.id !== noteId);
            if (cleaned.length) next[blockId] = sortNotesDesc(cleaned);
            else delete next[blockId];
          }
          const targetBucket = next[updated.blockId] ?? [];
          next[updated.blockId] = sortNotesDesc([
            ...targetBucket.filter(note => note.id !== updated.id),
            updated,
          ]);
          return next;
        });
      } catch (err) {
        console.error('更新笔记失败', err);
        alert(err instanceof Error ? err.message : '更新笔记失败，请稍后重试');
      } finally {
        setNotesMutating(false);
      }
    },
    [resolvedUserPaperId, buildUpdatePayload],
  );

  const handleDeleteNote = useCallback(
    async (blockId: string, noteId: string) => {
      if (!resolvedUserPaperId) {
        alert('未找到个人论文标识，无法删除笔记。');
        return;
      }
      setNotesMutating(true);
      try {
        const response = await noteService.deleteNote(noteId);
        if (response.bizCode !== 0) {
          throw new Error(response.bizMessage ?? '删除笔记失败，请稍后重试');
        }
        setNotesByBlock(prev => {
          const next = { ...prev };
          const bucket = next[blockId] ?? [];
          const remaining = bucket.filter(note => note.id !== noteId);
          if (remaining.length) {
            next[blockId] = sortNotesDesc(remaining);
          } else {
            delete next[blockId];
          }
          return next;
        });
      } catch (err) {
        console.error('删除笔记失败', err);
        alert(err instanceof Error ? err.message : '删除笔记失败，请稍后重试');
      } finally {
        setNotesMutating(false);
      }
    },
    [resolvedUserPaperId],
  );

  const headerActions = useMemo(() => {
    const isPublicAdmin = effectiveSource === 'public-admin';

    return {
      canToggleVisibility: isPublicAdmin && canToggleVisibility,
      isPublicVisible,
      onToggleVisibility:
        isPublicAdmin && canToggleVisibility
          ? () => {
            console.log('TODO: 实现公开/私有切换');
          }
          : undefined,
      onSave:
        (isPublicAdmin || isPersonalOwner) && canEditContent
          ? handleSave
          : undefined,
      saveLabel: isPersonalOwner ? '保存我的修改' : '保存草稿',
      extraActionsHint: isPublicAdmin
        ? '公共库管理员视图，操作将对所有用户生效'
        : undefined,
    };
  }, [effectiveSource, canToggleVisibility, isPublicVisible, canEditContent, handleSave, isPersonalOwner]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 dark:text-slate-400">加载论文中...</p>
        </div>
      </div>
    );
  }

  if (error || !paper || !displayContent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-700 dark:text-slate-300">{error || '论文内容不存在'}</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const selectedContext = selectedBlockId ? blockContextMap.get(selectedBlockId) ?? null : null;
  const selectedSectionId = selectedContext?.sectionId ?? null;

  const sectionLabel = selectedContext
    ? `${selectedContext.sectionPath.join('.')} ${selectedContext.sectionTitle ?? ''}`.trim()
    : null;

  const blockTypeLabels: Record<BlockContent['type'], string> = {
    paragraph: '段落',
    heading: '标题',
    math: '公式',
    figure: '图示',
    table: '表格',
    code: '代码',
    'ordered-list': '有序列表',
    'unordered-list': '无序列表',
    quote: '引用',
    divider: '分隔线',
  };

  const blockLabel = selectedContext
    ? `${blockTypeLabels[selectedContext.blockType] ?? selectedContext.blockType} · #${selectedContext.blockOrder}`
    : null;

  const showNotesPanel = isPersonalOwner && !!selectedBlockId;
  const articleStyle: CSSProperties | undefined = showNotesPanel
    ? ({ '--notes-offset': `${NOTES_PANEL_SHIFT}px` } as CSSProperties)
    : undefined;

  const notesForSelectedBlock = selectedBlockId ? notesByBlock[selectedBlockId] ?? [] : [];

  return (
    <PaperEditPermissionsContext.Provider value={permissions}>
      <div className="relative h-full min-h-0 bg-gray-50 dark:bg-slate-950">
        <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="pointer-events-auto">
            <PaperHeader
              lang={lang}
              setLang={setLang}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResultsCount={searchResults.length}
              currentSearchIndex={currentSearchIndex}
              onSearchNavigate={handleSearchNavigate}
              actions={headerActions}
              viewerSource={effectiveSource}
            />
          </div>
        </div>

        <div className="flex flex-col h-full min-h-0">
          <div
            ref={contentRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{ paddingTop: HEADER_HEIGHT }}
          >
            <div
              className="
                max-w-5xl mx-auto p-8
                transition-[transform,margin] duration-300 ease-out
                transform-[translateX(0)]
                lg:transform-[translateX(calc(var(--notes-offset,0)*-1))]
              "
              style={articleStyle}
            >
              <div className="flex flex-col gap-8">
                <PaperMetadata
                  metadata={displayContent.metadata}
                  onMetadataUpdate={canEditContent ? handleMetadataUpdate : undefined}
                />
                <PaperContent
                  sections={displayContent.sections ?? []}
                  references={displayContent.references}
                  lang={lang}
                  searchQuery={searchQuery}
                  activeBlockId={activeBlockId}
                  selectedBlockId={selectedBlockId}
                  setActiveBlockId={setActiveBlockId}
                  contentRef={contentRef}
                  setSearchResults={setSearchResults}
                  setCurrentSearchIndex={setCurrentSearchIndex}
                  onBlockClick={handleBlockSelect}
                  onSectionTitleUpdate={handleSectionTitleUpdate}
                  onSectionAddSubsection={handleSectionAddSubsection}
                  onSectionDelete={handleSectionDelete}
                  onBlockUpdate={handleBlockUpdate}
                  onBlockDuplicate={handleBlockDuplicate}
                  onBlockDelete={handleBlockDelete}
                  onBlockInsert={handleBlockInsert}
                  onBlockMove={handleBlockMove}
                  onBlockAppendSubsection={handleBlockAppendSubsection}
                  onBlockAddComponent={handleBlockAddComponent}
                />
                <PaperReferences
                  references={displayContent.references}
                  title={
                    lang === 'both'
                      ? '参考文献 / References'
                      : lang === 'en'
                        ? 'References'
                        : '参考文献'
                  }
                  highlightedRefs={highlightedRefs}
                  onHighlightChange={setHighlightedRefs}
                />
                {showNotesPanel && (
                  <div className="lg:hidden rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <PersonalNotePanel
                      blockId={selectedBlockId!}
                      sectionId={selectedSectionId}
                      sectionLabel={sectionLabel}
                      blockLabel={blockLabel}
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
                )}
              </div>
            </div>
          </div>
        </div>

        {showNotesPanel && (
          <aside
            className="
              hidden lg:flex
              fixed z-40 flex-col gap-4
              rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-lg
              dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
            "
            style={{
              width: NOTES_PANEL_WIDTH,
              top: NOTES_PANEL_TOP,
              right: NOTES_PANEL_GAP,
            }}
          >
            <PersonalNotePanel
              blockId={selectedBlockId!}
              sectionId={selectedSectionId}
              sectionLabel={sectionLabel}
              blockLabel={blockLabel}
              notes={notesForSelectedBlock}
              onCreateNote={content => handleCreateNote(selectedBlockId!, content)}
              onUpdateNote={(noteId, content) => handleUpdateNote(selectedBlockId!, noteId, content)}
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
          </aside>
        )}
      </div>
    </PaperEditPermissionsContext.Provider>
  );
}
