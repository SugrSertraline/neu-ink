import { useEffect, useState } from 'react';
import { BusinessCode, ResponseCode } from '@/types/api';
import type { Paper, ParseStatus, UserPaper } from '@/types/paper';
import type { ViewerSource } from '@/types/paper/viewer';
import {
  adminPaperService,
  publicPaperService,
  userPaperService,
} from '../services/paper';
import { PaperAttachments } from '@/types/paper/models';

type UserPaperMeta = Omit<UserPaper, 'paperData'>;

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

function pickParseStatus(paperData: UserPaper['paperData']): ParseStatus {
  const rawStatus = (paperData as unknown as Record<string, unknown>).parseStatus;
  if (
    rawStatus &&
    typeof rawStatus === 'object' &&
    typeof (rawStatus as ParseStatus).status === 'string'
  ) {
    return rawStatus as ParseStatus;
  }
  return DEFAULT_PARSE_STATUS;
}

function normalizeUserPaper(userPaper: UserPaper): { paper: Paper; meta: UserPaperMeta } {
  const { paperData, ...meta } = userPaper;
  const sourcePaperId = pickSourcePaperId(userPaper);
  const parseStatus = pickParseStatus(paperData);

  return {
    paper: {
      id: sourcePaperId ?? meta.id,
      isPublic: Boolean(sourcePaperId),
      createdBy: meta.userId,
      metadata: paperData.metadata,
      abstract: paperData.abstract,
      keywords: paperData.keywords ?? [],
      sections: paperData.sections,
      references: paperData.references,
      attachments: ensureAttachments(paperData.attachments),
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

export function usePaperLoader(
  paperId: string | undefined,
  source: ViewerSource,
  initialData?: Paper,
) {
  const [paper, setPaper] = useState<Paper | null>(initialData ?? null);
  const [userPaperMeta, setUserPaperMeta] = useState<UserPaperMeta | null>(null);
  const [isLoading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paperId) {
      setPaper(null);
      setUserPaperMeta(null);
      setLoading(false);
      setError('缺少论文编号');
      return;
    }

    if (initialData) {
      setPaper(initialData);
      setUserPaperMeta(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load(id: string) {
      setLoading(true);
      setError(null);

      try {
        if (source === 'personal-owner') {
          const res = await userPaperService.getUserPaperDetail(id);

          if (!isSuccess(res.topCode, res.bizCode) || !res.data) {
            if (!cancelled) {
              setPaper(null);
              setUserPaperMeta(null);
              setError(res.bizMessage || res.topMessage || '获取个人论文失败');
            }
            return;
          }

          if (!cancelled) {
            const { paper: normalizedPaper, meta } = normalizeUserPaper(res.data);
            setPaper(normalizedPaper);
            setUserPaperMeta(meta);
            setError(null);
          }
          return;
        }

        const res =
          source === 'public-admin'
            ? await adminPaperService.getAdminPaperDetail(id)
            : await publicPaperService.getPublicPaperDetail(id);

        if (!isSuccess(res.topCode, res.bizCode) || !res.data) {
          if (!cancelled) {
            setPaper(null);
            setUserPaperMeta(null);
            setError(res.bizMessage || res.topMessage || '获取论文失败');
          }
          return;
        }

        if (!cancelled) {
          setPaper(res.data);
          setUserPaperMeta(null);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setPaper(null);
          setUserPaperMeta(null);
          setError(err?.message ?? '网络错误');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load(paperId);

    return () => {
      cancelled = true;
    };
  }, [paperId, source, initialData]);

  return { paper, userPaperMeta, isLoading, error };
}
