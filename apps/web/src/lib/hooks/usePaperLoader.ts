// apps/web/src/lib/hooks/usePaperLoader.ts
import { useEffect, useMemo, useState } from 'react';
import { BusinessCode, ResponseCode } from '@/types/api';
import type { Paper, ParseStatus, UserPaper } from '@/types/paper';
import type { ViewerSource } from '@/types/paper/viewer';
import {
  adminPaperService,
  publicPaperService,
  userPaperService,
} from '../services/paper';
import { PaperAttachments } from '@/types/paper/models';

<<<<<<< HEAD
type UserPaperMeta = Omit<UserPaper, 'paperData'>;
=======
type UserPaperMeta = UserPaper;
>>>>>>> origin/main

const DEFAULT_PARSE_STATUS: ParseStatus = {
  status: 'completed',
  progress: 100,
  message: 'From personal library',
};

function ensureAttachments(attachments?: PaperAttachments): PaperAttachments {
  return attachments ?? {};
}

function pickSourcePaperId(userPaper: UserPaper): string | null {
  return userPaper.sourcePaperId;
}

<<<<<<< HEAD
function pickParseStatus(paperData: UserPaper['paperData']): ParseStatus {
  const rawStatus = (paperData as unknown as Record<string, unknown>).parseStatus;
  if (
    rawStatus &&
    typeof rawStatus === 'object' &&
    typeof (rawStatus as ParseStatus).status === 'string'
  ) {
    return rawStatus as ParseStatus;
  }
=======
function pickParseStatus(userPaper: UserPaper): ParseStatus {
  // 对于个人论文，使用默认解析状态
>>>>>>> origin/main
  return DEFAULT_PARSE_STATUS;
}

function normalizeUserPaper(userPaper: UserPaper): { paper: Paper; meta: UserPaperMeta } {
<<<<<<< HEAD
  const { paperData, ...meta } = userPaper;
  const sourcePaperId = pickSourcePaperId(userPaper);
  const parseStatus = pickParseStatus(paperData);
=======
  const { sections, ...meta } = userPaper;
  const sourcePaperId = pickSourcePaperId(userPaper);
  const parseStatus = pickParseStatus(userPaper);
>>>>>>> origin/main

  return {
    paper: {
      id: sourcePaperId ?? meta.id,
      isPublic: Boolean(sourcePaperId),
      createdBy: meta.userId,
<<<<<<< HEAD
      metadata: paperData.metadata,
      abstract: paperData.abstract,
      keywords: paperData.keywords ?? [],
      sections: paperData.sections,
      references: paperData.references,
      attachments: ensureAttachments(paperData.attachments),
=======
      metadata: userPaper.metadata,
      abstract: userPaper.abstract,
      keywords: userPaper.keywords ?? [],
      sections: sections || [],  // 直接使用根级别的 sections，如果为空则使用空数组
      references: userPaper.references,
      attachments: ensureAttachments(userPaper.attachments),
>>>>>>> origin/main
      parseStatus,
      createdAt: meta.addedAt,
      updatedAt: meta.updatedAt,
    },
    meta,
  };
}

function isSuccess(topCode: number, bizCode: number): boolean {
  return topCode === ResponseCode.SUCCESS && bizCode === BusinessCode.SUCCESS;
}

type ViewerSourceInput = ViewerSource | ViewerSource[];

export function usePaperLoader(
  paperId: string | undefined,
  viewerSources: ViewerSourceInput,
  initialData?: Paper,
) {
  const normalizedSources = useMemo<ViewerSource[]>(() => {
    const arr = Array.isArray(viewerSources)
      ? viewerSources
      : viewerSources
      ? [viewerSources]
      : [];
    const deduped = Array.from(new Set(arr)) as ViewerSource[];
    return deduped.length ? deduped : ['public-guest'];
  }, [viewerSources]);

  const [paper, setPaper] = useState<Paper | null>(initialData ?? null);
  const [userPaperMeta, setUserPaperMeta] = useState<UserPaperMeta | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<ViewerSource | null>(null);

  useEffect(() => {
    if (!paperId) {
      setPaper(null);
      setUserPaperMeta(null);
      setActiveSource(null);
      setLoading(false);
      setError('缺少论文编号');
      return;
    }

    if (!normalizedSources.length) {
      setPaper(null);
      setUserPaperMeta(null);
      setActiveSource(null);
      setLoading(false);
      setError('缺少论文来源');
      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(null);

    if (initialData) {
      setPaper(initialData);
      setUserPaperMeta(null);
      setActiveSource(normalizedSources[0] ?? null);
    } else {
      setPaper(null);
      setUserPaperMeta(null);
      setActiveSource(null);
    }

    async function load(id: string) {
      let lastError: string | null = null;

      for (const candidate of normalizedSources) {
        try {
          if (candidate === 'personal-owner') {
            const res = await userPaperService.getUserPaperDetail(id);

            if (!isSuccess(res.topCode, res.bizCode) || !res.data) {
              lastError = res.bizMessage || res.topMessage || '获取个人论文失败';
              continue;
            }

            if (!cancelled) {
              const { paper: normalizedPaper, meta } = normalizeUserPaper(res.data);
              setPaper(normalizedPaper);
              setUserPaperMeta(meta);
              setActiveSource(candidate);
              setError(null);
              setLoading(false);
            }
            return;
          }

          const res =
            candidate === 'public-admin'
              ? await adminPaperService.getAdminPaperDetail(id)
              : await publicPaperService.getPublicPaperDetail(id);

          if (!isSuccess(res.topCode, res.bizCode) || !res.data) {
            lastError = res.bizMessage || res.topMessage || '获取论文失败';
            continue;
          }

          if (!cancelled) {
            setPaper(res.data);
            setUserPaperMeta(null);
            setActiveSource(candidate);
            setError(null);
            setLoading(false);
          }
          return;
        } catch (err: any) {
          lastError = err?.message ?? '网络错误';
        }
      }

      if (!cancelled) {
        setPaper(null);
        setUserPaperMeta(null);
        setActiveSource(normalizedSources[normalizedSources.length - 1] ?? null);
        setError(lastError ?? '获取论文失败');
        setLoading(false);
      }
    }

    load(paperId);

    return () => {
      cancelled = true;
    };
  }, [paperId, normalizedSources, initialData]);

  return { paper, userPaperMeta, isLoading, error, activeSource };
}
