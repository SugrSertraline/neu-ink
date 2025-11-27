// apps/web/src/lib/hooks/usePaperLoader.ts
import { useEffect, useMemo, useState } from 'react';
import { BusinessCode, ResponseCode } from '@/types/api';
import type { Paper, ParseStatus, UserPaper, Section } from '@/types/paper';
import type { ViewerSource } from '@/types/paper/viewer';
import {
  adminPaperService,
  publicPaperService,
  userPaperService,
} from '../services/papers';
import { PaperAttachments } from '@/types/paper/models';

type UserPaperMeta = UserPaper;

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

function pickParseStatus(userPaper: UserPaper): ParseStatus {
  // 对于个人论文，使用默认解析状态
  return DEFAULT_PARSE_STATUS;
}

function normalizeUserPaper(userPaper: UserPaper): { paper: Paper; meta: UserPaperMeta } {
  const sourcePaperId = pickSourcePaperId(userPaper);
  const parseStatus = pickParseStatus(userPaper);

  // 后端现在总是返回 sections 数据
  const paperSections = userPaper.sections || [];

  const meta: UserPaperMeta = {
    id: userPaper.id,
    userId: userPaper.userId,
    sourcePaperId: userPaper.sourcePaperId,
    metadata: userPaper.metadata,
    abstract: userPaper.abstract,
    keywords: userPaper.keywords,
    sections: userPaper.sections,
    references: userPaper.references,
    attachments: userPaper.attachments,
    customTags: userPaper.customTags,
    readingStatus: userPaper.readingStatus,
    priority: userPaper.priority,
    readingPosition: userPaper.readingPosition,
    totalReadingTime: userPaper.totalReadingTime,
    lastReadTime: userPaper.lastReadTime,
    remarks: userPaper.remarks,
    addedAt: userPaper.addedAt,
    updatedAt: userPaper.updatedAt,
    noteCount: userPaper.noteCount,
  };

  return {
    paper: {
      id: sourcePaperId ?? meta.id,
      isPublic: Boolean(sourcePaperId),
      createdBy: meta.userId,
      metadata: userPaper.metadata,
      abstract: userPaper.abstract,
      keywords: userPaper.keywords ?? [],
      sections: paperSections,
      references: userPaper.references,
      attachments: ensureAttachments(userPaper.attachments),
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

          // 由于公开论文详情接口已删除，这里只保留管理员论文详情接口
          if (candidate === 'public-admin') {
            const res = await adminPaperService.getAdminPaperDetail(id);
            
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
          }
          
          // 跳过公开论文详情接口，因为已删除
          lastError = '公开论文详情接口已删除';
          continue;
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
