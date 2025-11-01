'use client';

import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTabStore } from '@/stores/useTabStore';
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
} from '@/types/paper';
import { useAuth } from '@/contexts/AuthContext';
import { usePaperEditPermissions } from '@/lib/hooks/usePaperEditPermissions';
import { PaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';

type Lang = 'en' | 'both';

const HEADER_HEIGHT = 112;

const generateId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const cloneBlock = (block: BlockContent): BlockContent =>
  JSON.parse(JSON.stringify(block));

const createEmptySection = (): Section => ({
  id: generateId('section'),
  title: { en: 'Untitled Section', zh: '未命名章节' },
  content: [],
  subsections: [],
});

export default function PaperPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { tabs } = useTabStore();
  const { user, isAdmin } = useAuth();

  const paperId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const tabData = useMemo(() => {
    const tabKey = `paper:${paperId}`;
    const tab = tabs.find((t) => t.id === tabKey);
    return (tab?.data ?? {}) as {
      paperId?: string;
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

    if (urlSource) push(urlSource);

    if (user && isAdmin) {
      push('public-admin');
      push('personal-owner');
    } else if (user) {
      push('personal-owner');
    }

    push(tabData.source);
    if (tabData.initialPaper) {
      push(
        tabData.initialPaper.isPublic
          ? isAdmin
            ? 'public-admin'
            : 'public-guest'
          : 'personal-owner'
      );
    }

    push('public-guest');

    return Array.from(seen) as ViewerSource[];
  }, [tabData.source, tabData.initialPaper, urlSource, user, isAdmin]);

  const { paper, isLoading, error, activeSource } = usePaperLoader(
    paperId,
    sourceCandidates,
    tabData.initialPaper
  );

  const effectiveSource = activeSource ?? sourceCandidates[0] ?? 'public-guest';
  const permissions = usePaperEditPermissions(effectiveSource);

  const isPublicAdminView =
    effectiveSource === 'public-admin' && permissions.canEditPublicPaper;

  const isPersonalOwnerView =
    effectiveSource === 'personal-owner' && permissions.canEditPersonalPaper;

  const canEditContent = permissions.canEditContent;

  const [lang, setLang] = useState<Lang>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [highlightedRefs, setHighlightedRefs] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  const [editableDraft, setEditableDraft] = useState<PaperContentModel | null>(null);

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
  }, [paper]);

  const displayContent = editableDraft ?? paper ?? null;

  const blockToSectionMap = useMemo(() => {
    const map = new Map<string, string>();

    const walk = (sections: PaperContentModel['sections'] = []) => {
      sections.forEach((section) => {
        section.content?.forEach((block) => map.set(block.id, section.id));
        if (section.subsections?.length) walk(section.subsections);
      });
    };

    if (displayContent?.sections?.length) {
      walk(displayContent.sections);
    }

    return map;
  }, [displayContent?.sections]);

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
    [searchResults, currentSearchIndex]
  );

  const updateSections = useCallback(
    (
      updater: (sections: Section[]) => { sections: Section[]; touched: boolean }
    ) => {
      setEditableDraft((prev) => {
        if (!prev) return prev;
        const { sections, touched } = updater(prev.sections);
        return touched ? { ...prev, sections } : prev;
      });
    },
    []
  );

  const updateSectionTree = useCallback(
    (sectionId: string, apply: (section: Section) => Section) => {
      updateSections((sections) => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] => {
          return nodes.map((section) => {
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
        };

        const next = walk(sections);
        return { sections: touched ? next : sections, touched };
      });
    },
    [updateSections]
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
      updateSectionTree(sectionId, (section) => ({
        ...section,
        title: { ...section.title, ...nextTitle },
      }));
    },
    [updateSectionTree]
  );

  const handleSectionAddSubsection = useCallback(
    (sectionId: string) => {
      updateSectionTree(sectionId, (section) => ({
        ...section,
        subsections: [...(section.subsections ?? []), createEmptySection()],
      }));
    },
    [updateSectionTree]
  );

  const handleSectionDelete = useCallback(
    (sectionId: string) => {
      updateSections((sections) => {
        let touched = false;

        const prune = (nodes: Section[]): Section[] => {
          const nextNodes: Section[] = [];
          nodes.forEach((section) => {
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

  const updateBlockTree = useCallback(
    (
      blockId: string,
      apply: (section: Section, block: BlockContent) => {
        section?: Section;
        block?: BlockContent;
        remove?: boolean;
        insertAfter?: BlockContent;
      }
    ) => {
      updateSections((sections) => {
        let touched = false;

        const walkSections = (nodes: Section[]): Section[] => {
          return nodes.map((section) => {
            let nextSection = section;
            let contentChanged = false;

            const nextContent = section.content
              .map((block) => {
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

            const result = apply(section, section.content.find((b) => b.id === blockId)!);
            if (result.insertAfter) {
              const idx = nextContent.findIndex((b) => b.id === blockId);
              if (idx >= 0) {
                const withInsert = [...nextContent];
                withInsert.splice(idx + 1, 0, result.insertAfter);
                nextSection = { ...nextSection, content: withInsert };
              }
            }

            return nextSection;
          });
        };

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
      updateBlockTree(blockId, (_, block) => ({
        insertAfter: { ...cloneBlock(block), id: generateId(`${block.type}`) },
      }));
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

      updateSections((sections) => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map((section) => {
            const idx = section.content.findIndex((block) => block.id === blockId);
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
    [createPlaceholderParagraph, setActiveBlockId, updateSections]
  );

  const handleBlockMove = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      let didMove = false;

      updateSections((sections) => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map((section) => {
            const idx = section.content.findIndex((block) => block.id === blockId);
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
      updateSections((sections) => {
        let touched = false;

        const walk = (nodes: Section[]): Section[] =>
          nodes.map((section) => {
            let nextSection = section;

            if (section.content.some((block) => block.id === blockId)) {
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

  const handlePreviewBlockClick = useCallback((blockId: string) => {
    // 只设置活动块ID，不再触发编辑状态
    setActiveBlockId(blockId);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editableDraft) return;
    // TODO: 按需将 editableDraft 提交给后端
    console.log('准备保存草稿：', editableDraft);
  }, [editableDraft]);

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
              actions={{
                canToggleVisibility: permissions.canToggleVisibility,
                isPublicVisible: paper.isPublic,
                onToggleVisibility:
                  permissions.canToggleVisibility
                    ? () => {
                        // TODO: 切换可见性
                        console.log('切换可见性尚未实现');
                      }
                    : undefined,
                onSave: canEditContent ? handleSave : undefined,
                saveLabel: '保存草稿',
                extraActionsHint: isPublicAdminView || isPersonalOwnerView ? '管理员/作者视角' : undefined,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col h-full min-h-0">
          <div
            ref={contentRef}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            <div
              className="max-w-5xl mx-auto p-8"
              style={{ paddingTop: HEADER_HEIGHT }}
            >
              <PaperMetadata metadata={displayContent.metadata} />
              <PaperContent
                sections={displayContent.sections}
                lang={lang}
                searchQuery={searchQuery}
                activeBlockId={activeBlockId}
                setActiveBlockId={setActiveBlockId}
                contentRef={contentRef}
                setSearchResults={setSearchResults}
                setCurrentSearchIndex={setCurrentSearchIndex}
                onBlockClick={handlePreviewBlockClick}
                onSectionTitleUpdate={handleSectionTitleUpdate}
                onSectionAddSubsection={handleSectionAddSubsection}
                onSectionDelete={handleSectionDelete}
                onBlockUpdate={handleBlockUpdate}
                onBlockDuplicate={handleBlockDuplicate}
                onBlockDelete={handleBlockDelete}
                onBlockInsert={handleBlockInsert}
                onBlockMove={handleBlockMove}
                onBlockAppendSubsection={handleBlockAppendSubsection}
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
            </div>
          </div>
        </div>
      </div>
    </PaperEditPermissionsContext.Provider>
  );
}
