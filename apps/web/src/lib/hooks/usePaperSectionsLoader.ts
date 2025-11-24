// apps/web/src/lib/hooks/usePaperSectionsLoader.ts
import { useEffect, useState } from 'react';
import { isSuccess } from '@/lib/http';
import type { Section } from '@/types/paper';
import { adminPaperService, userPaperService } from '../services/paper';

/**
 * 用于从 sectionIds 加载 sections 数据的 hook
 */
export function usePaperSectionsLoader(
  paperId: string,
  userPaperId: string | null,
  sectionIds: string[] | undefined,
  isPersonalOwner: boolean
) {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionIds || sectionIds.length === 0) {
      setSections([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const loadSections = async () => {
      try {
        // 根据论文类型调用不同的 API
        const response = isPersonalOwner && userPaperId
          ? await userPaperService.getUserPaperDetail(userPaperId)
          : await adminPaperService.getAdminPaperDetail(paperId);

        if (!isSuccess(response) || !response.data) {
          throw new Error(response.bizMessage || response.topMessage || '获取论文详情失败');
        }

        // 从响应中获取 sections
        const paperData = response.data;
        const loadedSections = paperData.sections || [];

        if (!cancelled) {
          setSections(loadedSections);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : '加载章节失败';
          setError(message);
          setSections([]);
          setIsLoading(false);
        }
      }
    };

    loadSections();

    return () => {
      cancelled = true;
    };
  }, [paperId, userPaperId, sectionIds, isPersonalOwner]);

  return { sections, isLoading, error };
}